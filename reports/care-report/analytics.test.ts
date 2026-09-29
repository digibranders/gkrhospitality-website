import { describe, expect, it } from "vitest";
import {
  AnalyticsError,
  channelSessions,
  firstDataDate,
  runReportEndpoint,
  totalsFromReport,
} from "./analytics.ts";

const report = (rows: { dims?: string[]; metrics: string[] }[]) => ({
  rows: rows.map((row) => ({
    dimensionValues: (row.dims ?? []).map((value) => ({ value })),
    metricValues: row.metrics.map((value) => ({ value })),
  })),
});

describe("GA4 reports", () => {
  it("builds the runReport endpoint for a property", () => {
    expect(runReportEndpoint("552679084")).toBe(
      "https://analyticsdata.googleapis.com/v1beta/properties/552679084:runReport",
    );
  });

  it("reads visitors and visits from a totals report, and returns null when there is no data", () => {
    expect(totalsFromReport(report([{ metrics: ["165", "189"] }]))).toEqual({ visitors: 165, visits: 189 });
    expect(totalsFromReport({})).toBeNull();
    expect(totalsFromReport(report([{ metrics: ["0", "0"] }]))).toBeNull();
  });

  it("finds sessions for one channel, or 0 when the channel is absent", () => {
    const channels = report([
      { dims: ["Direct"], metrics: ["134"] },
      { dims: ["Organic Search"], metrics: ["47"] },
    ]);
    expect(channelSessions(channels, "Organic Search")).toBe(47);
    expect(channelSessions(channels, "Paid Search")).toBe(0);
  });

  it("finds the first day with sessions, as YYYY-MM-DD", () => {
    const days = report([
      { dims: ["20260903"], metrics: ["6"] },
      { dims: ["20260902"], metrics: ["4"] },
      { dims: ["20260901"], metrics: ["0"] },
    ]);
    expect(firstDataDate(days)).toBe("2026-09-02");
    expect(firstDataDate({})).toBeNull();
  });

  it("rejects responses that are not GA4 report rows", () => {
    expect(() => totalsFromReport({ rows: [{ metricValues: [{ value: "abc" }, { value: "1" }] }] })).toThrow(
      AnalyticsError,
    );
    expect(() => channelSessions({ rows: "nope" }, "Direct")).toThrow(AnalyticsError);
  });
});
