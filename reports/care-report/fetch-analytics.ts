/**
 * Pulls one month of Google Analytics 4 numbers into months/<period>.analytics.json.
 *
 *   npm run report:analytics -- 2026-09             full month, from the 2nd of the next month
 *   npm run report:analytics -- 2026-09 --partial   the month so far, up to yesterday
 *
 * Signs in as the read-only service account (Viewer on the GA4 property) and
 * records visitors, visits and search visits for the month and the month
 * before. When GA4 has no earlier data, it records the day tracking began so
 * the report can say so instead of comparing with an empty month.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AnalyticsError,
  FINAL_DATA_LAG_DAYS,
  SEARCH_CHANNEL,
  channelSessions,
  firstDataDate,
  runReportEndpoint,
  totalsFromReport,
} from "./analytics.ts";
import { SCOPES } from "./google-auth.ts";
import { accessToken } from "./google-client.ts";
import { isMonthComplete, monthRange, previousPeriod, yesterday } from "./periods.ts";
import { parseAnalytics, parseConfig } from "./report.ts";
import type { AnalyticsReport, VisitorFigures } from "./report.ts";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PERIOD = /^\d{4}-\d{2}$/;

type Range = { startDate: string; endDate: string };

async function runReport(token: string, propertyId: string, body: object): Promise<unknown> {
  const response = await fetch(runReportEndpoint(propertyId), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as { error?: { message?: string } };
  if (response.status === 403) {
    throw new AnalyticsError(
      `The service account cannot read GA4 property ${propertyId}. In GA4 > Admin > Property access management, ` +
        "add the service account's email as a Viewer.",
    );
  }
  if (!response.ok) {
    throw new AnalyticsError(`GA4 returned ${response.status}: ${result.error?.message ?? "no details"}`);
  }
  return result;
}

async function figuresFor(token: string, propertyId: string, range: Range): Promise<VisitorFigures | null> {
  const [totals, channels] = await Promise.all([
    runReport(token, propertyId, { dateRanges: [range], metrics: [{ name: "activeUsers" }, { name: "sessions" }] }),
    runReport(token, propertyId, {
      dateRanges: [range],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }],
    }),
  ]);
  const base = totalsFromReport(totals);
  return base ? { ...base, searchVisits: channelSessions(channels, SEARCH_CHANNEL) } : null;
}

async function fetchAnalytics(period: string, partial: boolean): Promise<void> {
  if (!PERIOD.test(period)) {
    throw new AnalyticsError(`Pass the month as YYYY-MM, for example: npm run report:analytics -- 2026-09 (got "${period}")`);
  }
  const now = new Date();
  const month = monthRange(period);
  const complete = isMonthComplete(period, now, FINAL_DATA_LAG_DAYS);
  if (!complete && !partial) {
    throw new AnalyticsError(
      `${period} is not final yet. GA4 finishes processing about two days after the month ends (${month.endDate}). ` +
        "Try again after that, or run with --partial for the month so far.",
    );
  }
  const throughDate = complete ? month.endDate : yesterday(now);
  if (throughDate < month.startDate) throw new AnalyticsError(`${period} has no complete days yet.`);

  const config = parseConfig(JSON.parse(readFileSync(join(ROOT, "config.json"), "utf8")));
  const { propertyId } = config.analytics;
  const token = await accessToken(SCOPES.analytics);

  const current: Range = { startDate: month.startDate, endDate: throughDate };
  const [currentFigures, previousFigures, days] = await Promise.all([
    figuresFor(token, propertyId, current),
    figuresFor(token, propertyId, monthRange(previousPeriod(period))),
    runReport(token, propertyId, { dateRanges: [current], dimensions: [{ name: "date" }], metrics: [{ name: "sessions" }] }),
  ]);
  if (!currentFigures) {
    throw new AnalyticsError(`GA4 property ${propertyId} has no visits between ${current.startDate} and ${current.endDate}.`);
  }
  // With nothing in the previous month, record when tracking began so the report does not compare with an empty month.
  const trackingStarted = previousFigures ? null : firstDataDate(days);

  const report: AnalyticsReport = {
    source: "Google Analytics 4",
    propertyId,
    period,
    fetchedAt: now.toISOString(),
    startDate: trackingStarted ?? month.startDate,
    throughDate,
    trackingStarted,
    current: currentFigures,
    previous: previousFigures,
  };
  parseAnalytics(report, period, "fetched analytics data");

  const outPath = join(ROOT, "months", `${period}.analytics.json`);
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  const { visitors, visits, searchVisits } = currentFigures;
  console.log(`Saved ${relative(process.cwd(), outPath)}`);
  console.log(`  ${report.startDate} to ${throughDate}${complete ? "" : " (partial month)"}`);
  console.log(`  ${visitors} visitors, ${visits} visits, ${searchVisits} from search`);
  console.log(trackingStarted ? `  Tracking began ${trackingStarted}; no earlier month to compare` : "  Compared with the previous month");
}

const args = process.argv.slice(2);
fetchAnalytics(args.find((arg) => !arg.startsWith("--")) ?? "", args.includes("--partial")).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
