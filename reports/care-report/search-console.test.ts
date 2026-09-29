import { createPublicKey, createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  SearchConsoleError,
  createServiceAccountJwt,
  indexingFromInspections,
  isMonthComplete,
  sitemapPaths,
  monthRange,
  parseServiceAccountKey,
  previousPeriod,
  searchAnalyticsEndpoint,
  topPagesFromRows,
  topQueriesFromRows,
  totalsFromResponse,
} from "./search-console.ts";

const base64UrlDecode = (text: string): string => Buffer.from(text, "base64url").toString("utf8");

describe("reporting dates", () => {
  it("covers the whole calendar month", () => {
    expect(monthRange("2026-08")).toEqual({ startDate: "2026-08-01", endDate: "2026-08-31" });
    expect(monthRange("2028-02")).toEqual({ startDate: "2028-02-01", endDate: "2028-02-29" });
  });

  it("finds the previous month across a year boundary", () => {
    expect(previousPeriod("2026-08")).toBe("2026-07");
    expect(previousPeriod("2027-01")).toBe("2026-12");
  });

  it("treats a month as complete three days after it ends, when Search Console data is final", () => {
    expect(isMonthComplete("2026-08", new Date("2026-09-02T12:00:00Z"))).toBe(false);
    expect(isMonthComplete("2026-08", new Date("2026-09-03T12:00:00Z"))).toBe(true);
  });
});

describe("service account", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const key = parseServiceAccountKey({
    type: "service_account",
    client_email: "gkr-care-report@fynix-care-reports.iam.gserviceaccount.com",
    private_key: pem,
  });

  it("rejects files that are not service account keys", () => {
    expect(() => parseServiceAccountKey({ type: "authorized_user" })).toThrow(SearchConsoleError);
    expect(() => parseServiceAccountKey("not json")).toThrow(/service account key/);
  });

  it("signs a read-only token request that Google can verify", () => {
    const jwt = createServiceAccountJwt(key, 1_790_000_000);
    const [header, claims, signature] = jwt.split(".");

    expect(JSON.parse(base64UrlDecode(header))).toEqual({ alg: "RS256", typ: "JWT" });
    expect(JSON.parse(base64UrlDecode(claims))).toEqual({
      iss: key.clientEmail,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: 1_790_000_000,
      exp: 1_790_003_600,
    });

    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${header}.${claims}`);
    expect(verifier.verify(createPublicKey(publicKey.export({ type: "spki", format: "pem" })), Buffer.from(signature, "base64url"))).toBe(true);
  });
});

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
