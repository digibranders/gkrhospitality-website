/**
 * Google Analytics 4 (Data API): response shaping for the monthly report.
 * No network access here; fetch-analytics.ts does the HTTP calls. Covered by
 * analytics.test.ts.
 */

export class AnalyticsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyticsError";
  }
}

export interface AnalyticsTotals {
  /** GA4 "Active users": the Users figure on GA4's home and reports. */
  visitors: number;
  /** Sessions. */
  visits: number;
}

/** GA4 finishes processing a day about two days later. */
export const FINAL_DATA_LAG_DAYS = 2;

/** The default channel group GA4 uses for unpaid search engine traffic. */
export const SEARCH_CHANNEL = "Organic Search";

export function runReportEndpoint(propertyId: string): string {
  return `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`;
}

interface Row {
  dimensions: string[];
  metrics: number[];
}

function readRows(response: unknown): Row[] {
  const rows =
    typeof response === "object" && response !== null ? ((response as { rows?: unknown }).rows ?? []) : response;
  if (!Array.isArray(rows)) throw new AnalyticsError("GA4 returned rows in an unexpected format.");
  return rows.map((raw, i) => {
    const row = raw as { dimensionValues?: unknown; metricValues?: unknown };
    const dims = row.dimensionValues ?? [];
    const metrics = row.metricValues ?? [];
    if (!Array.isArray(dims) || !Array.isArray(metrics)) {
      throw new AnalyticsError(`GA4 row ${i} is not in the expected format: ${JSON.stringify(raw)}`);
    }
    return {
      dimensions: dims.map((d) => String((d as { value?: unknown }).value ?? "")),
      metrics: metrics.map((m) => {
        const value = Number((m as { value?: unknown }).value);
        if (!Number.isFinite(value)) throw new AnalyticsError(`GA4 row ${i} has a non-numeric metric: ${JSON.stringify(raw)}`);
        return value;
      }),
    };
  });
}

/**
 * Visitors and visits from a report with metrics [activeUsers, sessions] and
 * no dimensions. Null when GA4 has no sessions for the range.
 */
export function totalsFromReport(response: unknown): AnalyticsTotals | null {
  const [row] = readRows(response);
  if (!row || row.metrics.length < 2) return null;
  const [visitors, visits] = row.metrics;
  return visits > 0 ? { visitors, visits } : null;
}

/** Sessions for one default channel group, from a report with that dimension and a sessions metric. */
export function channelSessions(response: unknown, channel: string): number {
  const row = readRows(response).find((r) => r.dimensions[0] === channel);
  return row ? row.metrics[0] : 0;
}

/** The first day with sessions, as YYYY-MM-DD, from a report with a date dimension (YYYYMMDD). */
export function firstDataDate(response: unknown): string | null {
  const days = readRows(response)
    .filter((r) => r.metrics[0] > 0 && /^\d{8}$/.test(r.dimensions[0]))
    .map((r) => r.dimensions[0])
    .sort();
  const first = days[0];
  return first ? `${first.slice(0, 4)}-${first.slice(4, 6)}-${first.slice(6, 8)}` : null;
}

/* ------------------------------------------------------------------ */
/* Detail for page 2                                                   */
/* ------------------------------------------------------------------ */

export interface Ranked {
  name: string;
  visits: number;
}

export interface VisitorDetail {
  pageViews: number;
  /** Share of visits GA4 counts as engaged, 0 to 1, three decimals. */
  engagementRate: number;
  averageVisitSeconds: number;
  channels: Ranked[];
  landingPages: Ranked[];
  devices: Ranked[];
  countries: Ranked[];
  /** Visits per day, YYYY-MM-DD, in date order. */
  daily: { date: string; visits: number }[];
}

/** pageViews, engagementRate and averageSessionDuration, from a report with those three metrics. */
export function engagementFromReport(response: unknown): Pick<VisitorDetail, "pageViews" | "engagementRate" | "averageVisitSeconds"> {
  const [row] = readRows(response);
  const [pageViews = 0, rate = 0, seconds = 0] = row ? row.metrics : [];
  return { pageViews, engagementRate: Math.round(rate * 1000) / 1000, averageVisitSeconds: Math.round(seconds) };
}

/** GA4's default channel groups, in plain words for a client report. */
const CHANNEL_NAMES: Record<string, string> = {
  Direct: "Direct",
  "Organic Search": "Search engines",
  "Paid Search": "Search ads",
  Referral: "Other websites",
  "Organic Social": "Social media",
  "Paid Social": "Social media",
  Email: "Email",
};

/** Visits by channel, merged into plain-language groups, largest first, with anything unnamed as "Other". */
export function channelsFromReport(response: unknown): Ranked[] {
  const totals: Record<string, number> = {};
  for (const row of readRows(response)) {
    const name = CHANNEL_NAMES[row.dimensions[0]] ?? "Other";
    totals[name] = (totals[name] ?? 0) + row.metrics[0];
  }
  return rankedFrom(totals, Number.POSITIVE_INFINITY);
}

/**
 * Landing pages that are real pages. GA4 also records the sitemap, "(not set)"
 * and empty paths when a bot or a broken session lands; those are left out.
 */
export function landingPagesFromReport(response: unknown, limit: number): Ranked[] {
  const totals: Record<string, number> = {};
  for (const row of readRows(response)) {
    const raw = row.dimensions[0] ?? "";
    const path = raw.split(/[?#]/)[0];
    if (!path.startsWith("/") || /\.[a-z0-9]+$/i.test(path)) continue;
    const clean = path.length > 1 ? path.replace(/\/+$/, "") : "/";
    totals[clean] = (totals[clean] ?? 0) + row.metrics[0];
  }
  return rankedFrom(totals, limit);
}

/** Visits for a plain dimension (device, country), largest first; "(not set)" folds into "Other". */
export function rankedFromReport(response: unknown, limit: number): Ranked[] {
  const totals: Record<string, number> = {};
  for (const row of readRows(response)) {
    const raw = row.dimensions[0] ?? "";
    const name = raw === "" || raw === "(not set)" ? "Other" : raw.charAt(0).toUpperCase() + raw.slice(1);
    totals[name] = (totals[name] ?? 0) + row.metrics[0];
  }
  return rankedFrom(totals, limit);
}

/** Visits per day from a report with the date dimension (YYYYMMDD). */
export function dailyVisitsFromReport(response: unknown): { date: string; visits: number }[] {
  return readRows(response)
    .filter((row) => /^\d{8}$/.test(row.dimensions[0]))
    .map((row) => {
      const d = row.dimensions[0];
      return { date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, visits: row.metrics[0] };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Largest first, alphabetical on ties, "Other" always last; zero rows dropped. */
function rankedFrom(totals: Record<string, number>, limit: number): Ranked[] {
  const ranked = Object.keys(totals)
    .filter((name) => totals[name] > 0)
    .map((name) => ({ name, visits: totals[name] }))
    .sort((a, b) => Number(a.name === "Other") - Number(b.name === "Other") || b.visits - a.visits || a.name.localeCompare(b.name));
  return ranked.slice(0, limit);
}
