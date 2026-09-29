/**
 * Pulls one month of Google Search data into months/<period>.search.json.
 *
 *   npm run report:search -- 2026-08                   full month, from the 3rd of the next month
 *   npm run report:search -- 2026-09 --partial         the month so far, up to Google's latest final day
 *   npm run report:search -- 2026-09 --indexing-only   indexing now, search numbers marked pending
 *
 * Signs in as a read-only service account (key in .secrets/, see README.md).
 * Every run checks each page in the live sitemap with URL Inspection. A full
 * run also asks Search Console for the month's impressions and clicks, the
 * previous month's totals, and the top pages and queries by clicks. The month
 * file you write by hand is never touched.
 *
 * The service account key is read by google-client.ts.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseConfig, parseSearch } from "./report.ts";
import type { SearchPerformance, SearchReport } from "./report.ts";
import { SCOPES } from "./google-auth.ts";
import { accessToken } from "./google-client.ts";
import { isMonthComplete, monthRange, previousPeriod, yesterday } from "./periods.ts";
import {
  FINAL_DATA_LAG_DAYS,
  SearchConsoleError,
  URL_INSPECTION_ENDPOINT,
  indexingFromInspections,
  lastDataDate,
  searchAnalyticsEndpoint,
  sitemapPaths,
  topPagesFromRows,
  topQueriesFromRows,
  totalsFromResponse,
} from "./search-console.ts";
import type { Indexing } from "./search-console.ts";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PERIOD = /^\d{4}-\d{2}$/;
const TOP_N = 5;
/** Fetch more rows than we show: www and non-www URLs are merged, and zero-click rows are dropped. */
const PAGE_ROWS = 50;
const QUERY_ROWS = 25;

type Dimension = "page" | "query" | "date";

function display(path: string): string {
  return relative(process.cwd(), path);
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

async function fetchPerformance(
  token: string,
  property: string,
  period: string,
  partial: boolean,
): Promise<SearchPerformance> {
  const month = monthRange(period);
  const complete = isMonthComplete(period, new Date(), FINAL_DATA_LAG_DAYS);
  if (!complete && !partial) {
    throw new SearchConsoleError(
      `${period} is not final yet. Search Console data settles about three days after the month ends (${month.endDate}). ` +
        "Try again after that, or run with --partial for the month so far.",
    );
  }
  // A running month asks up to yesterday; Google only returns days it has finalised.
  const range = complete ? month : { startDate: month.startDate, endDate: yesterday(new Date()) };
  if (range.endDate < range.startDate) throw new SearchConsoleError(`${period} has no complete days yet.`);
  const [current, previous, pages, queries, days] = await Promise.all([
    query(token, property, range),
    query(token, property, monthRange(previousPeriod(period))),
    query(token, property, range, "page", PAGE_ROWS),
    query(token, property, range, "query", QUERY_ROWS),
    query(token, property, range, "date", 40),
  ]);
  const totals = totalsFromResponse(current);
  if (!totals) {
    throw new SearchConsoleError(
      `Search Console has no data for ${property} in ${period}. A newly added property can take a few days to load ` +
        "its history. Run with --indexing-only to record indexing now and mark the search numbers as pending.",
    );
  }
  return {
    throughDate: complete ? month.endDate : (lastDataDate(days) ?? range.endDate),
    totals,
    previousTotals: totalsFromResponse(previous),
    topPages: topPagesFromRows(pages, TOP_N),
    topQueries: topQueriesFromRows(queries, TOP_N),
  };
}

async function fetchSearch(period: string, indexingOnly: boolean, partial: boolean): Promise<void> {
  if (!PERIOD.test(period)) {
    throw new SearchConsoleError(`Pass the month as YYYY-MM, for example: npm run report:search -- 2026-08 (got "${period}")`);
  }

  const config = parseConfig(JSON.parse(readFileSync(join(ROOT, "config.json"), "utf8")));
  const { property, sitemapUrl } = config.searchConsole;
  const token = await accessToken(SCOPES.searchConsole);

  const [performance, indexing] = await Promise.all([
    indexingOnly ? Promise.resolve(null) : fetchPerformance(token, property, period, partial),
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
    console.log(`  1 to ${performance.throughDate}: ${totals.impressions} impressions, ${totals.clicks} clicks${change}`);
    console.log(`  ${performance.topPages.length} top pages, ${performance.topQueries.length} top queries`);
  } else {
    console.log("  Impressions and clicks: pending. Run again without --indexing-only once Google releases the month.");
  }
}

const args = process.argv.slice(2);
fetchSearch(
  args.find((arg) => !arg.startsWith("--")) ?? "",
  args.includes("--indexing-only"),
  args.includes("--partial"),
).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
