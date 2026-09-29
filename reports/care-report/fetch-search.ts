/**
 * Pulls one month of Google Search numbers into months/<period>.search.json.
 *
 *   npm run report:search -- 2026-08
 *
 * Signs in as a read-only service account (key in .secrets/, see README.md),
 * asks Search Console for the month's impressions and clicks, the previous
 * month's totals, and the top pages and queries by clicks, then writes them for
 * build.ts. The month file you write by hand is never touched.
 *
 * Set GSC_KEY_FILE to use a key stored somewhere else.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseConfig, parseSearch } from "./report.ts";
import type { SearchReport } from "./report.ts";
import {
  SearchConsoleError,
  TOKEN_URL,
  createServiceAccountJwt,
  isMonthComplete,
  monthRange,
  parseServiceAccountKey,
  previousPeriod,
  searchAnalyticsEndpoint,
  tokenRequestBody,
  topPagesFromRows,
  topQueriesFromRows,
  totalsFromResponse,
} from "./search-console.ts";

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
  const body = (await response.json()) as { error?: { message?: string } };
  if (response.status === 403) {
    throw new SearchConsoleError(
      `The service account cannot read ${property}. In Search Console > Settings > Users and permissions, ` +
        "add the service account's email as a Restricted user.",
    );
  }
  if (!response.ok) {
    throw new SearchConsoleError(`Search Console returned ${response.status}: ${body.error?.message ?? "no details"}`);
  }
  return body;
}

async function fetchSearch(period: string): Promise<void> {
  if (!PERIOD.test(period)) {
    throw new SearchConsoleError(`Pass the month as YYYY-MM, for example: npm run report:search -- 2026-08 (got "${period}")`);
  }
  if (!isMonthComplete(period, new Date())) {
    const { endDate } = monthRange(period);
    throw new SearchConsoleError(
      `${period} is not final yet. Search Console data settles about three days after the month ends (${endDate}); try again after that.`,
    );
  }

  const config = parseConfig(JSON.parse(readFileSync(join(ROOT, "config.json"), "utf8")));
  const property = config.searchConsole.property;
  const token = await accessToken();
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
      `Search Console has no data for ${property} in ${period}. A newly added property can take a day or two ` +
        "to load its history; if it has been longer, check the Performance report in Search Console.",
    );
  }

  const report: SearchReport = {
    source: "Google Search Console",
    property,
    period,
    fetchedAt: new Date().toISOString(),
    totals,
    previousTotals: totalsFromResponse(previous),
    topPages: topPagesFromRows(pages, TOP_N),
    topQueries: topQueriesFromRows(queries, TOP_N),
  };

  // Validate with the same rules build.ts uses, so a bad fetch fails here rather than at build time.
  parseSearch(report, period, "fetched search data");

  const outPath = join(ROOT, "months", `${period}.search.json`);
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

  const change = report.previousTotals ? ` (previous month: ${report.previousTotals.impressions} and ${report.previousTotals.clicks})` : "";
  console.log(`Saved ${display(outPath)}`);
  console.log(`  ${totals.impressions} impressions, ${totals.clicks} clicks${change}`);
  console.log(`  ${report.topPages.length} top pages, ${report.topQueries.length} top queries`);
}

fetchSearch(process.argv[2] ?? "").catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
