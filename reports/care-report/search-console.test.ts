import { describe, expect, it } from "vitest";
import {
  SearchConsoleError,
  indexingFromInspections,
  lastDataDate,
  searchAnalyticsEndpoint,
  sitemapPaths,
  topPagesFromRows,
  topQueriesFromRows,
  totalsFromResponse,
} from "./search-console.ts";

describe("Search Console responses", () => {
  it("encodes Domain properties in the endpoint URL", () => {
    expect(searchAnalyticsEndpoint("sc-domain:gkrhospitality.com")).toBe(
      "https://searchconsole.googleapis.com/webmasters/v3/sites/sc-domain%3Agkrhospitality.com/searchAnalytics/query",
    );
  });

  it("reads totals, and reports no data as null rather than zero", () => {
    expect(totalsFromResponse({ rows: [{ clicks: 41, impressions: 3912, ctr: 0.01, position: 18.2 }] })).toEqual({
      clicks: 41,
      impressions: 3912,
    });
    expect(totalsFromResponse({})).toBeNull();
    expect(totalsFromResponse({ rows: [] })).toBeNull();
  });

  it("merges www and non-www URLs for the same page, drops pages without clicks, and ranks by clicks", () => {
    const rows = [
      { keys: ["https://www.gkrhospitality.com/"], clicks: 20, impressions: 900 },
      { keys: ["https://www.gkrhospitality.com/services"], clicks: 9, impressions: 300 },
      { keys: ["https://gkrhospitality.com/"], clicks: 4, impressions: 80 },
      { keys: ["https://www.gkrhospitality.com/work/"], clicks: 9, impressions: 120 },
      { keys: ["https://www.gkrhospitality.com/contact?ref=x"], clicks: 2, impressions: 40 },
      { keys: ["https://www.gkrhospitality.com/privacy-policy"], clicks: 0, impressions: 60 },
    ];
    expect(topPagesFromRows(rows, 5)).toEqual([
      { path: "/", clicks: 24 },
      { path: "/services", clicks: 9 },
      { path: "/work", clicks: 9 },
      { path: "/contact", clicks: 2 },
    ]);
    expect(topPagesFromRows(rows, 2)).toHaveLength(2);
  });

  it("keeps the top queries that brought clicks", () => {
    const rows = [
      { keys: ["gkr hospitality"], clicks: 14, impressions: 60 },
      { keys: ["hospitality consulting new york"], clicks: 3, impressions: 410 },
      { keys: ["hotel operator consultant"], clicks: 0, impressions: 95 },
    ];
    expect(topQueriesFromRows(rows, 5)).toEqual([
      { query: "gkr hospitality", clicks: 14 },
      { query: "hospitality consulting new york", clicks: 3 },
    ]);
  });

  it("rejects responses that are not shaped like Search Console rows", () => {
    expect(() => topQueriesFromRows([{ keys: "gkr", clicks: 1 }], 5)).toThrow(SearchConsoleError);
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
