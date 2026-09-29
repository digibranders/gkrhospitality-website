/**
 * Google Search Console: response shaping for search analytics and URL
 * Inspection. No network access here; fetch-search.ts does the HTTP calls.
 * Covered by search-console.test.ts.
 */

export class SearchConsoleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchConsoleError";
  }
}

export interface Totals {
  clicks: number;
  impressions: number;
}

export interface PageClicks {
  /** Path only, like "/services". Host and query string are dropped so www and non-www merge. */
  path: string;
  clicks: number;
}

export interface QueryClicks {
  query: string;
  clicks: number;
}

/** Search Console data is final roughly two to three days after the day it describes. */
export const FINAL_DATA_LAG_DAYS = 3;

/* ------------------------------------------------------------------ */
/* Search Analytics responses                                          */
/* ------------------------------------------------------------------ */

export function searchAnalyticsEndpoint(property: string): string {
  return `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`;
}

interface Row {
  keys: string[];
  clicks: number;
  impressions: number;
}

function readRows(input: unknown): Row[] {
  const rows = Array.isArray(input)
    ? input
    : typeof input === "object" && input !== null
      ? ((input as { rows?: unknown }).rows ?? [])
      : input;
  if (!Array.isArray(rows)) throw new SearchConsoleError("Search Console returned rows in an unexpected format.");
  return rows.map((raw, i) => {
    const row = raw as Record<string, unknown>;
    const keys = row.keys ?? [];
    if (
      !Array.isArray(keys) ||
      !keys.every((k) => typeof k === "string") ||
      typeof row.clicks !== "number" ||
      (row.impressions !== undefined && typeof row.impressions !== "number")
    ) {
      throw new SearchConsoleError(`Search Console row ${i} is not in the expected format: ${JSON.stringify(raw)}`);
    }
    return { keys: keys as string[], clicks: row.clicks, impressions: (row.impressions as number | undefined) ?? 0 };
  });
}

/** Totals from a query with no dimensions. Null when Search Console has no data for the range. */
export function totalsFromResponse(response: unknown): Totals | null {
  const rows = readRows(response);
  if (rows.length === 0) return null;
  return { clicks: rows[0].clicks, impressions: rows[0].impressions };
}

const byClicksThenName = <T extends { clicks: number }>(name: (item: T) => string) =>
  (a: T, b: T): number => b.clicks - a.clicks || name(a).localeCompare(name(b));

function normalizePath(url: string): string {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    path = url.split(/[?#]/)[0];
  }
  return path.length > 1 ? path.replace(/\/+$/, "") : "/";
}

/** Pages ranked by clicks. URLs for the same path (www and non-www, with or without a trailing slash) are merged. */
export function topPagesFromRows(response: unknown, limit: number): PageClicks[] {
  const totals: Record<string, number> = {};
  for (const row of readRows(response)) {
    const path = normalizePath(row.keys[0] ?? "");
    totals[path] = (totals[path] ?? 0) + row.clicks;
  }
  return Object.keys(totals)
    .map((path) => ({ path, clicks: totals[path] }))
    .filter((page) => page.clicks > 0)
    .sort(byClicksThenName<PageClicks>((page) => page.path))
    .slice(0, limit);
}

/** Queries ranked by clicks. Search Console leaves out rare queries for privacy, so this list can be short. */
export function topQueriesFromRows(response: unknown, limit: number): QueryClicks[] {
  return readRows(response)
    .map((row) => ({ query: row.keys[0] ?? "", clicks: row.clicks }))
    .filter((item) => item.clicks > 0 && item.query !== "")
    .sort(byClicksThenName<QueryClicks>((item) => item.query))
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Indexing (URL Inspection)                                           */
/* ------------------------------------------------------------------ */

export const URL_INSPECTION_ENDPOINT = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";

export interface Indexing {
  checkedAt: string;
  pagesChecked: number;
  pagesIndexed: number;
  /** Paths Google did not report as indexed. */
  notIndexed: string[];
}

/** Paths listed in a sitemap for the given host, like ["/", "/about"]. Other hosts are ignored. */
export function sitemapPaths(xml: string, host: string): string[] {
  const paths: string[] = [];
  const locations = xml.match(/<loc>\s*([^<\s]+)\s*<\/loc>/g) ?? [];
  for (const tag of locations) {
    const raw = tag.replace(/<\/?loc>/g, "").trim();
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      continue;
    }
    if (url.host !== host) continue;
    const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : "/";
    if (!paths.includes(path)) paths.push(path);
  }
  return paths;
}

/**
 * Summarises URL Inspection results. A page counts as indexed when Google's
 * verdict is PASS, which is what Search Console shows as "URL is on Google".
 */
export function indexingFromInspections(
  results: { path: string; response: unknown }[],
  checkedAt: string,
): Indexing {
  const notIndexed: string[] = [];
  for (const { path, response } of results) {
    const verdict = (response as { inspectionResult?: { indexStatusResult?: { verdict?: unknown } } })?.inspectionResult
      ?.indexStatusResult?.verdict;
    if (typeof verdict !== "string") {
      throw new SearchConsoleError(`Search Console returned no indexing verdict for ${path}: ${JSON.stringify(response)}`);
    }
    if (verdict !== "PASS") notIndexed.push(path);
  }
  return { checkedAt, pagesChecked: results.length, pagesIndexed: results.length - notIndexed.length, notIndexed };
}

/** The latest day with any data, from a query with the date dimension. Null when there is none. */
export function lastDataDate(response: unknown): string | null {
  const days = readRows(response)
    .map((row) => row.keys[0] ?? "")
    .filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day))
    .sort();
  return days.length > 0 ? days[days.length - 1] : null;
}
