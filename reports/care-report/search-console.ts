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
  /** Average position in Google results, 1 being the top. One decimal. */
  position: number;
}

export interface PageStats {
  /** Path only, like "/services". Host and query string are dropped so www and non-www merge. */
  path: string;
  clicks: number;
  impressions: number;
  position: number;
}

export interface QueryStats {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
}

export interface DayStats {
  /** YYYY-MM-DD */
  date: string;
  clicks: number;
  impressions: number;
}

export interface DeviceStats {
  device: string;
  clicks: number;
  impressions: number;
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
  position: number;
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
    const numberOrZero = (value: unknown): number | undefined =>
      value === undefined ? 0 : typeof value === "number" && Number.isFinite(value) ? value : undefined;
    const impressions = numberOrZero(row.impressions);
    const position = numberOrZero(row.position);
    if (
      !Array.isArray(keys) ||
      !keys.every((k) => typeof k === "string") ||
      typeof row.clicks !== "number" ||
      impressions === undefined ||
      position === undefined
    ) {
      throw new SearchConsoleError(`Search Console row ${i} is not in the expected format: ${JSON.stringify(raw)}`);
    }
    return { keys: keys as string[], clicks: row.clicks, impressions, position };
  });
}

const oneDecimal = (value: number): number => Math.round(value * 10) / 10;

/** Totals from a query with no dimensions. Null when Search Console has no data for the range. */
export function totalsFromResponse(response: unknown): Totals | null {
  const rows = readRows(response);
  if (rows.length === 0) return null;
  const [row] = rows;
  return { clicks: row.clicks, impressions: row.impressions, position: oneDecimal(row.position) };
}

/** Most clicks first, then most impressions, then alphabetical so ties are stable. */
const byClicksThenImpressions = <T extends { clicks: number; impressions: number }>(name: (item: T) => string) =>
  (a: T, b: T): number => b.clicks - a.clicks || b.impressions - a.impressions || name(a).localeCompare(name(b));

function normalizePath(url: string): string {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    path = url.split(/[?#]/)[0];
  }
  return path.length > 1 ? path.replace(/\/+$/, "") : "/";
}

/**
 * Pages with their clicks, impressions and average position. URLs for the same
 * path (www and non-www, trailing slash or not) are merged, with the position
 * weighted by impressions as Search Console does.
 */
export function pageStatsFromRows(response: unknown, limit: number): PageStats[] {
  const merged: Record<string, { clicks: number; impressions: number; weighted: number }> = {};
  for (const row of readRows(response)) {
    const path = normalizePath(row.keys[0] ?? "");
    const entry = (merged[path] ??= { clicks: 0, impressions: 0, weighted: 0 });
    entry.clicks += row.clicks;
    entry.impressions += row.impressions;
    entry.weighted += row.position * row.impressions;
  }
  return Object.keys(merged)
    .map((path) => {
      const { clicks, impressions, weighted } = merged[path];
      return { path, clicks, impressions, position: impressions > 0 ? oneDecimal(weighted / impressions) : 0 };
    })
    .filter((page) => page.impressions > 0)
    .sort(byClicksThenImpressions<PageStats>((page) => page.path))
    .slice(0, limit);
}

/**
 * Queries with their clicks, impressions and average position, including
 * those that were seen but not clicked. Search Console leaves out rare queries
 * for privacy, so this list can be short.
 */
export function queryStatsFromRows(response: unknown, limit: number): QueryStats[] {
  return readRows(response)
    .map((row) => ({ query: row.keys[0] ?? "", clicks: row.clicks, impressions: row.impressions, position: oneDecimal(row.position) }))
    .filter((item) => item.query !== "" && item.impressions > 0)
    .sort(byClicksThenImpressions<QueryStats>((item) => item.query))
    .slice(0, limit);
}

/** Clicks and impressions per day, in date order. Days Search Console omits are absent, not zero. */
export function dailyStatsFromRows(response: unknown): DayStats[] {
  return readRows(response)
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.keys[0] ?? ""))
    .map((row) => ({ date: row.keys[0], clicks: row.clicks, impressions: row.impressions }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

const DEVICE_NAMES: Record<string, string> = { DESKTOP: "Desktop", MOBILE: "Mobile", TABLET: "Tablet" };

/** Clicks and impressions by device, most impressions first. */
export function deviceStatsFromRows(response: unknown): DeviceStats[] {
  return readRows(response)
    .map((row) => ({ device: DEVICE_NAMES[row.keys[0] ?? ""] ?? row.keys[0] ?? "Other", clicks: row.clicks, impressions: row.impressions }))
    .filter((item) => item.impressions > 0)
    .sort((a, b) => b.impressions - a.impressions || a.device.localeCompare(b.device));
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
