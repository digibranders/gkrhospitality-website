/**
 * Pulls one month of Google Search data into months/<period>.search.json.
 *
 *   npm run report:search -- 2026-08                   full month, from the 3rd of the next month
 *   npm run report:search -- 2026-09 --indexing-only   indexing now, search numbers marked pending
 *
 * Signs in as a read-only service account (key in .secrets/, see README.md).
 * Every run checks each page in the live sitemap with URL Inspection. A full
 * run also asks Search Console for the month's impressions and clicks, the
 * previous month's totals, and the top pages and queries by clicks. The month
 * file you write by hand is never touched.
 *
 * Set GSC_KEY_FILE to use a key stored somewhere else.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseConfig, parseSearch } from "./report.ts";
import type { SearchPerformance, SearchReport } from "./report.ts";
import {
  SearchConsoleError,
  TOKEN_URL,
  URL_INSPECTION_ENDPOINT,
  createServiceAccountJwt,
  indexingFromInspections,
  isMonthComplete,
  monthRange,
  parseServiceAccountKey,
  previousPeriod,
  searchAnalyticsEndpoint,
  sitemapPaths,
  tokenRequestBody,
  topPagesFromRows,
  topQueriesFromRows,
  totalsFromResponse,
} from "./search-console.ts";
import type { Indexing } from "./search-console.ts";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const KEY_FILE = process.env.GSC_KEY_FILE ?? join(ROOT, ".secrets", "search-console-key.json");
const PERIOD = /^\d{4}-\d{2}$/;
const TOP_N = 5;
/** Fetch more rows than we show: www and non-www URLs are merged, and zero-click rows are dropped. */
const PAGE_ROWS = 50;
const QUERY_ROWS = 25;

type Dimension = "page" | "query";

function display(path: string): string {
  return relative(process.cwd(), path);
}

async function accessToken(): Promise<string> {
  if (!existsSync(KEY_FILE)) {
    throw new SearchConsoleError(
      `No service account key at ${display(KEY_FILE)}. See "Search Console access" in reports/care-report/README.md.`,
    );
  }
  const key = parseServiceAccountKey(JSON.parse(readFileSync(KEY_FILE, "utf8")));
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: tokenRequestBody(createServiceAccountJwt(key, Math.floor(Date.now() / 1000))),
  });
  const body = (await response.json()) as { access_token?: string; error_description?: string; error?: string };
  if (!response.ok || !body.access_token) {
    throw new SearchConsoleError(
      `Google refused the service account sign-in (${response.status}): ${body.error_description ?? body.error ?? "no details"}. ` +
        "If the key was deleted in Google Cloud, create a new one.",
    );
  }
  return body.access_token;
}

async function query(
  token: string,
  property: string,
  range: { startDate: string; endDate: string },
  dimension?: Dimension,
  rowLimit?: number,
): Promise<unknown> {
  const response = await fetch(searchAnalyticsEndpoint(property), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      ...range,
      type: "web",
      dataState: "final",
      ...(dimension ? { dimensions: [dimension], rowLimit } : {}),
    }),
  });
  return readJsonResponse(response, `search analytics ${range.startDate} to ${range.endDate}`);
}

async function readJsonResponse(response: Response, what: string): Promise<unknown> {
  const body = (await response.json()) as { error?: { message?: string } };
  if (response.status === 403) {
    throw new SearchConsoleError(
      `The service account cannot read this property (${what}). In Search Console > Settings > Users and permissions, ` +
        "add the service account's email as a Restricted user.",
    );
  }
  if (!response.ok) {
    throw new SearchConsoleError(`Search Console returned ${response.status} for ${what}: ${body.error?.message ?? "no details"}`);
  }
  return body;
}

/** URL Inspection for every page in the live sitemap. */
async function checkIndexing(token: string, property: string, sitemapUrl: string): Promise<Indexing> {
  const sitemap = await fetch(sitemapUrl);
  if (!sitemap.ok) throw new SearchConsoleError(`Could not load the sitemap ${sitemapUrl} (${sitemap.status}).`);
  const origin = new URL(sitemapUrl).origin;
  const paths = sitemapPaths(await sitemap.text(), new URL(sitemapUrl).host);
  if (paths.length === 0) throw new SearchConsoleError(`The sitemap ${sitemapUrl} lists no pages on ${origin}.`);

  const results: { path: string; response: unknown }[] = [];
  for (const path of paths) {
    // Sequential on purpose: URL Inspection is rate limited per property.
    const response = await fetch(URL_INSPECTION_ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ inspectionUrl: path === "/" ? origin : `${origin}${path}`, siteUrl: property }),
    });
    results.push({ path, response: await readJsonResponse(response, `URL Inspection of ${path}`) });
  }
  return indexingFromInspections(results, new Date().toISOString());
}

async function fetchPerformance(token: string, property: string, period: string): Promise<SearchPerformance> {
  if (!isMonthComplete(period, new Date())) {
    const { endDate } = monthRange(period);
    throw new SearchConsoleError(
      `${period} is not final yet. Search Console data settles about three days after the month ends (${endDate}). ` +
        `Try again after that, or run with --indexing-only to record indexing now and mark the search numbers as pending.`,
    );
  }
  const range = monthRange(period);
  const [current, previous, pages, queries] = await Promise.all([
    query(token, property, range),
    query(token, property, monthRange(previousPeriod(period))),
    query(token, property, range, "page", PAGE_ROWS),
    query(token, property, range, "query", QUERY_ROWS),
  ]);
  const totals = totalsFromResponse(current);
  if (!totals) {
    throw new SearchConsoleError(
      `Search Console has no data for ${property} in ${period}. A newly added property can take a few days to load ` +
        "its history. Run with --indexing-only to record indexing now and mark the search numbers as pending.",
    );
  }
  return {
    totals,
    previousTotals: totalsFromResponse(previous),
    topPages: topPagesFromRows(pages, TOP_N),
    topQueries: topQueriesFromRows(queries, TOP_N),
  };
}

async function fetchSearch(period: string, indexingOnly: boolean): Promise<void> {
  if (!PERIOD.test(period)) {
    throw new SearchConsoleError(`Pass the month as YYYY-MM, for example: npm run report:search -- 2026-08 (got "${period}")`);
  }

  const config = parseConfig(JSON.parse(readFileSync(join(ROOT, "config.json"), "utf8")));
  const { property, sitemapUrl } = config.searchConsole;
  const token = await accessToken();

  const [performance, indexing] = await Promise.all([
    indexingOnly ? Promise.resolve(null) : fetchPerformance(token, property, period),
    checkIndexing(token, property, sitemapUrl),
  ]);

  const report: SearchReport = {
    source: "Google Search Console",
    property,
    period,
    fetchedAt: new Date().toISOString(),
    performance,
    indexing,
  };

  // Validate with the same rules build.ts uses, so a bad fetch fails here rather than at build time.
  parseSearch(report, period, "fetched search data");

  const outPath = join(ROOT, "months", `${period}.search.json`);
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Saved ${display(outPath)}`);
  console.log(`  Indexing: ${indexing.pagesIndexed} of ${indexing.pagesChecked} pages on Google`);
  if (indexing.notIndexed.length > 0) console.log(`  Not indexed: ${indexing.notIndexed.join(", ")}`);
  if (performance) {
    const { totals, previousTotals } = performance;
    const change = previousTotals ? ` (previous month: ${previousTotals.impressions} and ${previousTotals.clicks})` : "";
    console.log(`  ${totals.impressions} impressions, ${totals.clicks} clicks${change}`);
    console.log(`  ${performance.topPages.length} top pages, ${performance.topQueries.length} top queries`);
  } else {
    console.log("  Impressions and clicks: pending. Run again without --indexing-only once Google releases the month.");
  }
}

const args = process.argv.slice(2);
fetchSearch(args.find((arg) => !arg.startsWith("--")) ?? "", args.includes("--indexing-only")).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
