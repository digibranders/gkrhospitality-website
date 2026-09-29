import { describe, expect, it } from "vitest";
import {
  SearchConsoleError,
  indexingFromInspections,
  lastDataDate,
  searchAnalyticsEndpoint,
  dailyStatsFromRows,
  deviceStatsFromRows,
  pageStatsFromRows,
  queryStatsFromRows,
  sitemapPaths,
  totalsFromResponse,
} from "./search-console.ts";

describe("Search Console responses", () => {
  it("encodes Domain properties in the endpoint URL", () => {
    expect(searchAnalyticsEndpoint("sc-domain:gkrhospitality.com")).toBe(
      "https://searchconsole.googleapis.com/webmasters/v3/sites/sc-domain%3Agkrhospitality.com/searchAnalytics/query",
    );
  });

  it("reads totals with average position, and reports no data as null rather than zero", () => {
    expect(totalsFromResponse({ rows: [{ clicks: 24, impressions: 117, ctr: 0.2, position: 13.811 }] })).toEqual({
      clicks: 24,
      impressions: 117,
      position: 13.8,
    });
    expect(totalsFromResponse({})).toBeNull();
    expect(totalsFromResponse({ rows: [] })).toBeNull();
  });

  it("merges www and non-www URLs, weights position by impressions, and keeps pages seen but not clicked", () => {
    const rows = [
      { keys: ["https://www.gkrhospitality.com/"], clicks: 10, impressions: 30, position: 10 },
      { keys: ["https://gkrhospitality.com/"], clicks: 1, impressions: 10, position: 2 },
      { keys: ["https://www.gkrhospitality.com/about/"], clicks: 13, impressions: 64, position: 3.1 },
      { keys: ["https://www.gkrhospitality.com/contact?ref=x"], clicks: 0, impressions: 36, position: 25.3 },
      { keys: ["https://www.gkrhospitality.com/work"], clicks: 0, impressions: 0, position: 0 },
    ];
    expect(pageStatsFromRows(rows, 5)).toEqual([
      { path: "/about", clicks: 13, impressions: 64, position: 3.1 },
      { path: "/", clicks: 11, impressions: 40, position: 8 },
      { path: "/contact", clicks: 0, impressions: 36, position: 25.3 },
    ]);
    expect(pageStatsFromRows(rows, 1)).toHaveLength(1);
  });

  it("keeps queries seen without clicks, ranked by clicks then impressions", () => {
    const rows = [
      { keys: ["gkr resort"], clicks: 0, impressions: 1, position: 9 },
      { keys: ["garrett ronan"], clicks: 4, impressions: 6, position: 1 },
      { keys: ["albany ny restaurant consultant"], clicks: 0, impressions: 3, position: 78 },
    ];
    expect(queryStatsFromRows(rows, 5).map((q) => q.query)).toEqual([
      "garrett ronan",
      "albany ny restaurant consultant",
      "gkr resort",
    ]);
  });

  it("orders daily stats by date and names devices", () => {
    expect(
      dailyStatsFromRows([
        { keys: ["2026-09-03"], clicks: 0, impressions: 6, position: 27 },
        { keys: ["2026-09-02"], clicks: 1, impressions: 7, position: 9 },
      ]).map((d) => d.date),
    ).toEqual(["2026-09-02", "2026-09-03"]);
    expect(
      deviceStatsFromRows([
        { keys: ["MOBILE"], clicks: 7, impressions: 37, position: 4.8 },
        { keys: ["DESKTOP"], clicks: 17, impressions: 80, position: 18 },
      ]),
    ).toEqual([
      { device: "Desktop", clicks: 17, impressions: 80 },
      { device: "Mobile", clicks: 7, impressions: 37 },
    ]);
  });

  it("rejects responses that are not shaped like Search Console rows", () => {
    expect(() => queryStatsFromRows([{ keys: "gkr", clicks: 1 }], 5)).toThrow(SearchConsoleError);
  });
});

describe("indexing", () => {
  it("reads page paths from the live sitemap, skipping other hosts", () => {
    const xml = `<?xml version="1.0"?><urlset>
      <url><loc>https://www.gkrhospitality.com</loc></url>
      <url><loc>https://www.gkrhospitality.com/about</loc></url>
      <url><loc>https://www.gkrhospitality.com/work/</loc></url>
      <url><loc>https://evil.example.com/x</loc></url>
    </urlset>`;
    expect(sitemapPaths(xml, "www.gkrhospitality.com")).toEqual(["/", "/about", "/work"]);
  });

  it("counts pages Google reports as indexed and names the ones it does not", () => {
    const result = indexingFromInspections(
      [
        { path: "/", response: { inspectionResult: { indexStatusResult: { verdict: "PASS", lastCrawlTime: "2026-09-26T16:34:11Z" } } } },
        { path: "/about", response: { inspectionResult: { indexStatusResult: { verdict: "PASS" } } } },
        { path: "/gallery", response: { inspectionResult: { indexStatusResult: { verdict: "NEUTRAL", coverageState: "Discovered - currently not indexed" } } } },
      ],
      "2026-09-29T10:00:00.000Z",
    );
    expect(result).toEqual({ checkedAt: "2026-09-29T10:00:00.000Z", pagesChecked: 3, pagesIndexed: 2, notIndexed: ["/gallery"] });
  });

  it("rejects an inspection response without a verdict", () => {
    expect(() => indexingFromInspections([{ path: "/", response: { error: { message: "quota" } } }], "2026-09-29T10:00:00.000Z")).toThrow(
      /no indexing verdict for \//,
    );
  });
});

describe("lastDataDate", () => {
  it("finds the latest day that has data, from a date-dimension response", () => {
    const rows = [
      { keys: ["2026-09-24"], clicks: 1, impressions: 5 },
      { keys: ["2026-09-26"], clicks: 0, impressions: 3 },
      { keys: ["2026-09-25"], clicks: 2, impressions: 4 },
    ];
    expect(lastDataDate(rows)).toBe("2026-09-26");
    expect(lastDataDate({})).toBeNull();
  });
});
