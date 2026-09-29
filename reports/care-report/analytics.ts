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
