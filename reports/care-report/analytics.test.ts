import { describe, expect, it } from "vitest";
import {
  AnalyticsError,
  channelSessions,
  channelsFromReport,
  dailyVisitsFromReport,
  engagementFromReport,
  landingPagesFromReport,
  rankedFromReport,
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

describe("GA4 detail", () => {
  it("groups channels into plain names, largest first, Other last", () => {
    const channels = report([
      { dims: ["Direct"], metrics: ["134"] },
      { dims: ["Organic Search"], metrics: ["47"] },
      { dims: ["Unassigned"], metrics: ["6"] },
      { dims: ["Cross-network"], metrics: ["3"] },
      { dims: ["Referral"], metrics: ["3"] },
      { dims: ["Organic Social"], metrics: ["1"] },
    ]);
    expect(channelsFromReport(channels)).toEqual([
      { name: "Direct", visits: 134 },
      { name: "Search engines", visits: 47 },
      { name: "Other websites", visits: 3 },
      { name: "Social media", visits: 1 },
      { name: "Other", visits: 9 },
    ]);
  });

  it("keeps only real pages as landing pages", () => {
    const landing = report([
      { dims: ["/"], metrics: ["142"] },
      { dims: ["/about"], metrics: ["23"] },
      { dims: ["(not set)"], metrics: ["9"] },
      { dims: [""], metrics: ["5"] },
      { dims: ["/sitemap.xml"], metrics: ["2"] },
      { dims: ["/contact?ref=x"], metrics: ["8"] },
    ]);
    expect(landingPagesFromReport(landing, 5)).toEqual([
      { name: "/", visits: 142 },
      { name: "/about", visits: 23 },
      { name: "/contact", visits: 8 },
    ]);
  });

  it("capitalises devices and folds (not set) into Other", () => {
    const devices = report([
      { dims: ["desktop"], metrics: ["161"] },
      { dims: ["mobile"], metrics: ["28"] },
      { dims: ["(not set)"], metrics: ["1"] },
    ]);
    expect(rankedFromReport(devices, 5)).toEqual([
      { name: "Desktop", visits: 161 },
      { name: "Mobile", visits: 28 },
      { name: "Other", visits: 1 },
    ]);
  });

  it("reads engagement and daily visits", () => {
    expect(engagementFromReport(report([{ metrics: ["261", "0.470899", "72.35"] }]))).toEqual({
      pageViews: 261,
      engagementRate: 0.471,
      averageVisitSeconds: 72,
    });
    expect(dailyVisitsFromReport(report([{ dims: ["20260904"], metrics: ["10"] }, { dims: ["20260903"], metrics: ["26"] }]))).toEqual([
      { date: "2026-09-03", visits: 26 },
      { date: "2026-09-04", visits: 10 },
    ]);
  });
});
