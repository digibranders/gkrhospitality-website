import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ReportValidationError,
  countPdfPages,
  describeChange,
  formatDate,
  formatPeriod,
  formatStatNumber,
  inlineAssets,
  layoutProblems,
  middleEllipsis,
  parseAnalytics,
  parseConfig,
  parseHealth,
  parseLayoutProbe,
  parseMonth,
  parseSearch,
  renderReport,
  reportFileStem,
  withLayoutProbe,
} from "./report.ts";
import type { AnalyticsReport, LayoutMeasurements, SearchReport } from "./report.ts";
import type { HealthReport } from "./health.ts";

const here = (file: string): string => fileURLToPath(new URL(file, import.meta.url));
const readJson = (file: string): unknown => JSON.parse(readFileSync(here(file), "utf8"));

const rawConfig = readJson("./config.json");
const template = readFileSync(here("./template.html"), "utf8");
const config = parseConfig(rawConfig);

/*
 * Test data only. The August 2026 month file predates the two-page report, so
 * the fields added since (operations, attention, nextMonth) are supplied here.
 * Real months get their numbers from the fetch commands.
 */
const month = (): Record<string, unknown> => ({
  ...(JSON.parse(JSON.stringify(readJson("./months/2026-08.json"))) as Record<string, unknown>),
  tracked: true,
  healthRecords: [],
  operations: { deployments: { succeeded: 4, total: 4 }, runtimeErrors: { count: 0, days: 7 } },
  attention: [],
  nextMonth: ["Add a content security policy", "Count contact form enquiries in Google Analytics"],
});

const testSearch = (): SearchReport => ({
  source: "Google Search Console",
  property: "https://www.gkrhospitality.com/",
  period: "2026-08",
  fetchedAt: "2026-09-29T10:00:00.000Z",
  performance: {
    throughDate: "2026-08-31",
    totals: { clicks: 57, impressions: 4210, position: 13.8 },
    previousTotals: { clicks: 48, impressions: 4380, position: 15.1 },
    daily: [
      { date: "2026-08-02", clicks: 3, impressions: 150 },
      { date: "2026-08-20", clicks: 9, impressions: 310 },
    ],
    queries: [
      { query: "gkr hospitality", clicks: 22, impressions: 60, position: 1 },
      { query: "hospitality consulting firm ny", clicks: 0, impressions: 12, position: 45 },
      { query: "hospitality consulting new york", clicks: 0, impressions: 9, position: 39 },
      { query: "<b>gkr</b> hotels", clicks: 6, impressions: 30, position: 8.2 },
    ],
    pages: [
      { path: "/", clicks: 31, impressions: 900, position: 10.2 },
      { path: "/work/boston-harbor", clicks: 4, impressions: 120, position: 6.5 },
    ],
    devices: [
      { device: "Desktop", clicks: 40, impressions: 3000 },
      { device: "Mobile", clicks: 17, impressions: 1210 },
    ],
  },
  indexing: { checkedAt: "2026-09-29T10:00:00.000Z", pagesChecked: 10, pagesIndexed: 10, notIndexed: [] },
});

const testAnalytics = (): AnalyticsReport => ({
  source: "Google Analytics 4",
  propertyId: "552679084",
  period: "2026-08",
  fetchedAt: "2026-09-29T10:00:00.000Z",
  startDate: "2026-08-01",
  throughDate: "2026-08-31",
  trackingStarted: null,
  current: { visitors: 165, visits: 189, searchVisits: 47 },
  previous: { visitors: 150, visits: 170, searchVisits: 40 },
  detail: {
    pageViews: 261,
    engagementRate: 0.471,
    averageVisitSeconds: 72,
    channels: [
      { name: "Direct", visits: 134 },
      { name: "Search engines", visits: 47 },
    ],
    landingPages: [
      { name: "/", visits: 142 },
      { name: "/about", visits: 23 },
    ],
    devices: [
      { name: "Desktop", visits: 161 },
      { name: "Mobile", visits: 28 },
    ],
    countries: [
      { name: "United States", visits: 142 },
      { name: "India", visits: 20 },
    ],
    daily: [
      { date: "2026-08-03", visits: 26 },
      { date: "2026-08-04", visits: 10 },
    ],
  },
});

const testHealth = (): HealthReport => ({
  checkedAt: "2026-09-29T10:00:00.000Z",
  site: "https://www.gkrhospitality.com",
  tls: { validTo: "2026-12-19", issuer: "Let's Encrypt" },
  domain: { name: "gkrhospitality.com", expires: "2026-12-05", registrar: "GoDaddy.com, LLC" },
  pages: { checked: 10, ok: 10, averageMs: 24, slowest: { path: "/about", ms: 40 }, failing: [] },
  headers: {
    present: ["HTTPS enforced (HSTS)", "Frame protection", "File type protection", "Referrer policy", "Permissions policy"],
    missing: ["Content security policy"],
  },
  audit: { critical: 0, high: 0, moderate: 0, low: 1 },
  versions: { next: "16.3.6", react: "19.3.0" },
});

const problemsOf = (fn: () => unknown): string[] => {
  try {
    fn();
  } catch (error) {
    if (error instanceof ReportValidationError) return error.problems;
    throw error;
  }
  throw new Error("Expected a ReportValidationError, but validation passed.");
};

const render = (
  overrides: { search?: SearchReport; analytics?: AnalyticsReport; health?: HealthReport; monthData?: unknown } = {},
): string =>
  renderReport(
    template,
    config,
    parseMonth(overrides.monthData ?? month(), config),
    overrides.search ?? testSearch(),
    overrides.analytics ?? testAnalytics(),
    overrides.health ?? testHealth(),
  );

describe("parseConfig", () => {
  it("accepts the committed config", () => {
    expect(config.client.name).toBe("GKR Hospitality");
    expect(config.careAreas).toHaveLength(6);
    expect(config.analytics.propertyId).toBe("552679084");
  });

  it("rejects asset paths that leave the assets folder", () => {
    const bad = JSON.parse(JSON.stringify(rawConfig)) as { client: { logo: string } };
    bad.client.logo = "../../.env.local";
    expect(problemsOf(() => parseConfig(bad)).join("\n")).toMatch(/client\.logo/);
  });

  it("accepts Domain and URL-prefix Search Console properties and rejects anything else", () => {
    const withProperty = (property: string): unknown => {
      const copy = JSON.parse(JSON.stringify(rawConfig)) as { searchConsole: { property: string } };
      copy.searchConsole.property = property;
      return copy;
    };
    expect(parseConfig(withProperty("sc-domain:gkrhospitality.com")).searchConsole.property).toBe("sc-domain:gkrhospitality.com");
    expect(problemsOf(() => parseConfig(withProperty("gkrhospitality.com"))).join("\n")).toMatch(/searchConsole\.property/);
  });
});

describe("parseMonth", () => {
  it("accepts a two-page month and the committed September 2026 month", () => {
    expect(parseMonth(month(), config).improvements).toHaveLength(4);
    const september = parseMonth(readJson("./months/2026-09.json"), config);
    expect(september.improvements).toHaveLength(4);
    expect(september.operations?.deployments).toEqual({ succeeded: 6, total: 6 });
  });

  it("rejects em-dashes and en-dashes anywhere in the copy", () => {
    const data = month();
    data.summary = "Monitoring is live — errors are captured.";
    (data.improvements as { body: string }[])[0].body = "Pages 1–3 reviewed.";
    const problems = problemsOf(() => parseMonth(data, config)).join("\n");
    expect(problems).toMatch(/summary.*dash/);
    expect(problems).toMatch(/improvements\[0\]\.body.*dash/);
  });

  it("requires exactly four figures, because the panel and its shadow are sized for four", () => {
    const data = month();
    (data.figures as unknown[]).pop();
    expect(problemsOf(() => parseMonth(data, config)).join("\n")).toMatch(/figures.*exactly 4/);
  });

  it("requires every improvement to name one of the configured care areas", () => {
    const data = month();
    (data.improvements as { area: string }[])[1].area = "Design";
    expect(problemsOf(() => parseMonth(data, config)).join("\n")).toMatch(/improvements\[1\]\.area.*"Design"/);
  });

  it("allows between one and four improvements", () => {
    const none = month();
    none.improvements = [];
    expect(problemsOf(() => parseMonth(none, config)).join("\n")).toMatch(/improvements.*1 to 4/);
    const five = month();
    const item = (five.improvements as unknown[])[0];
    five.improvements = Array.from({ length: 5 }, () => item);
    expect(problemsOf(() => parseMonth(five, config)).join("\n")).toMatch(/improvements.*1 to 4/);
  });

  it("requires next month's plan and sane Vercel figures", () => {
    const data = month();
    data.nextMonth = [];
    data.operations = { deployments: { succeeded: 5, total: 4 }, runtimeErrors: { count: 0, days: 0 } };
    const problems = problemsOf(() => parseMonth(data, config)).join("\n");
    expect(problems).toMatch(/nextMonth.*1 to 5/);
    expect(problems).toMatch(/more successful deployments than deployments/);
    expect(problems).toMatch(/runtimeErrors\.days/);
  });

  it("requires the emphasised word to appear in the headline", () => {
    const data = month();
    data.headlineEmphasis = "secure";
    expect(problemsOf(() => parseMonth(data, config)).join("\n")).toMatch(/headlineEmphasis/);
  });

  it("rejects impossible dates and a next report that is not after the issue date", () => {
    const data = month();
    data.issued = "2026-02-30";
    expect(problemsOf(() => parseMonth(data, config)).join("\n")).toMatch(/issued.*real date/);
    const order = month();
    order.nextReport = "2026-08-20";
    expect(problemsOf(() => parseMonth(order, config)).join("\n")).toMatch(/nextReport.*after/);
  });

  it("reports every problem at once instead of stopping at the first", () => {
    const data = month();
    data.summary = "";
    data.headline = 42;
    data.period = "August";
    expect(problemsOf(() => parseMonth(data, config)).length).toBeGreaterThanOrEqual(3);
  });
});

describe("parseSearch, parseAnalytics and parseHealth", () => {
  it("accept data shaped like the fetch commands write", () => {
    expect(parseSearch(testSearch(), "2026-08").performance?.queries).toHaveLength(4);
    expect(parseSearch({ ...testSearch(), performance: null }, "2026-08").performance).toBeNull();
    expect(parseAnalytics(testAnalytics(), "2026-08").detail.channels[0].name).toBe("Direct");
    expect(parseHealth(testHealth(), "2026-08").domain.expires).toBe("2026-12-05");
  });

  it("accept the committed September 2026 data files", () => {
    expect(parseSearch(readJson("./months/2026-09.search.json"), "2026-09").property).toBe("https://www.gkrhospitality.com/");
    expect(parseAnalytics(readJson("./months/2026-09.analytics.json"), "2026-09").trackingStarted).toBe("2026-09-03");
    expect(parseHealth(readJson("./months/2026-09.health.json"), "2026-09").pages.checked).toBe(10);
  });

  it("reject search data from a different month, impossible numbers and too many rows", () => {
    const base = testSearch();
    const six = Array.from({ length: 6 }, (_, i) => ({ query: `query ${i}`, clicks: 0, impressions: 1, position: 3 }));
    const data = {
      ...base,
      period: "2026-07",
      performance: { ...base.performance, totals: { clicks: 90, impressions: 12, position: 3 }, queries: six },
      indexing: { ...base.indexing, pagesIndexed: 11 },
    };
    const problems = problemsOf(() => parseSearch(data, "2026-08")).join("\n");
    expect(problems).toMatch(/period.*2026-07/);
    expect(problems).toMatch(/more clicks than impressions/);
    expect(problems).toMatch(/performance\.queries.*at most 5/);
    expect(problems).toMatch(/pagesIndexed plus notIndexed must equal pagesChecked/);
  });

  it("reject analytics outside the month and an engagement rate above 1", () => {
    const base = testAnalytics();
    const data = {
      ...base,
      throughDate: "2026-09-02",
      current: { visitors: 5, visits: 10, searchVisits: 12 },
      detail: { ...base.detail, engagementRate: 1.4 },
    };
    const problems = problemsOf(() => parseAnalytics(data, "2026-08")).join("\n");
    expect(problems).toMatch(/throughDate.*2026-08/);
    expect(problems).toMatch(/more search visits than visits/);
    expect(problems).toMatch(/engagementRate/);
  });

  it("reject health readings with impossible dates", () => {
    const data = { ...testHealth(), tls: { validTo: "2026-13-40", issuer: "x" } };
    expect(problemsOf(() => parseHealth(data, "2026-08")).join("\n")).toMatch(/tls\.validTo/);
  });

  it("reject a health check that is unreadable or from before the month, and allow one after it ends", () => {
    const at = (checkedAt: string): HealthReport => ({ ...testHealth(), checkedAt });
    expect(problemsOf(() => parseHealth(at("yesterday"), "2026-09")).join("\n")).toMatch(/checkedAt.*date and time/);
    expect(problemsOf(() => parseHealth(at("2026-08-31T10:00:00.000Z"), "2026-09")).join("\n")).toMatch(/checkedAt.*before 2026-09/);
    // Still 31 August in New York, the date the report would print.
    expect(problemsOf(() => parseHealth(at("2026-09-01T02:00:00.000Z"), "2026-09")).join("\n")).toMatch(/checkedAt.*before 2026-09/);
    expect(parseHealth(at("2026-09-01T10:00:00.000Z"), "2026-09").pages.ok).toBe(10);
    expect(parseHealth(at("2026-10-02T10:00:00.000Z"), "2026-09").pages.ok).toBe(10);
  });

  it("reject page counts that do not add up", () => {
    const base = testHealth();
    const data = { ...base, pages: { ...base.pages, ok: 9 } };
    expect(problemsOf(() => parseHealth(data, "2026-08")).join("\n")).toMatch(/pages.*ok plus failing must equal checked/);
  });
});

describe("formatting", () => {
  it("formats dates, periods and file names", () => {
    expect(formatDate("2026-08-28")).toBe("28 August 2026");
    expect(formatPeriod("2026-08")).toEqual({ label: "August 2026", monthName: "August" });
    expect(reportFileStem(config, parseMonth(month(), config))).toBe("GKR-Hospitality-Website-Care-Report-August-2026");
  });

  it("groups thousands, and shortens from 100,000 so a number fits its column", () => {
    expect(formatStatNumber(47)).toBe("47");
    expect(formatStatNumber(4210)).toBe("4,210");
    expect(formatStatNumber(128_450)).toBe("128.5K");
    expect(formatStatNumber(1_284_300)).toBe("1.3M");
  });

  it("describes the change against last month in plain words", () => {
    expect(describeChange(57, 48, "July")).toEqual({ text: "Up 19% on July", direction: "up" });
    expect(describeChange(4210, 4380, "July")).toEqual({ text: "Down 4% on July", direction: "down" });
    expect(describeChange(100, 100, "July")).toEqual({ text: "Level with July", direction: "level" });
    expect(describeChange(3, 0, "July")).toEqual({ text: "Up from 0 in July", direction: "up" });
    expect(describeChange(3, null, "July")).toEqual({ text: "No July data to compare", direction: "none" });
  });

  it("only says down 100% when nothing is left", () => {
    expect(describeChange(1, 1000, "July")).toEqual({ text: "Down 99% on July", direction: "down" });
    expect(describeChange(0, 1000, "July")).toEqual({ text: "Down 100% on July", direction: "down" });
  });

  it("shortens long names from the middle so similar queries stay distinguishable", () => {
    expect(middleEllipsis("gkr resort")).toBe("gkr resort");
    const a = middleEllipsis("hospitality consulting firm ny");
    const b = middleEllipsis("hospitality consulting new york");
    expect(a).not.toBe(b);
    expect(a).toHaveLength(20);
    expect(a).toContain("…");
  });
});

describe("renderReport: page 1", () => {
  it("fills every placeholder and renders two pages", () => {
    const html = render();
    expect(html).not.toMatch(/\{\{/);
    expect(html.match(/class="page[ "]/g)).toHaveLength(2);
    expect(html).toContain("<h1>Your website is <em>healthy</em> and fully cared for.</h1>");
    expect(html).toContain("What we improved in August");
    expect(html).toContain("Page 1 of 2");
    expect(html).toContain("Page 2 of 2");
    expect(html).not.toContain("Issued");
  });

  it("shows visitors and search at a glance, with a visits-per-day chart", () => {
    const html = render();
    expect(html).toContain("Visitors and search in August");
    expect(html).toContain("Google Analytics and Google Search, 1 to 31 August.");
    expect(html).toContain('<div class="stat__value">165</div>');
    expect(html).toContain('<div class="stat__change stat__change--up">Up 10% on July</div>');
    expect(html).toContain('<div class="stat__change">Down 4% on July</div>');
    expect(html).toContain('aria-label="Visits per day. 31 days, highest 26 on 3 Aug."');
  });

  it("raises the domain renewal from the health check in the attention box", () => {
    const html = render();
    expect(html).toContain("Needs your attention");
    expect(html).toContain("<strong>Domain renews on 5 December 2026.</strong> Please confirm auto-renew is on at GoDaddy.");
  });

  it("shows click rate and position instead of repeating that last month has no search data", () => {
    const perf = testSearch().performance;
    if (!perf) throw new Error("fixture has performance");
    const html = render({ search: { ...testSearch(), performance: { ...perf, previousTotals: null } } });
    expect(html).toContain('<div class="stat__change">Average position 13.8</div>');
    expect(html).toContain('<div class="stat__change">1% of impressions</div>');
    expect(html).not.toContain("No July data");
  });

  it("leaves the attention box out when nothing needs action", () => {
    const health = { ...testHealth(), domain: { ...testHealth().domain, expires: "2027-12-05" } };
    expect(render({ health })).not.toContain("Needs your attention");
  });

  it("says when tracking began instead of comparing with a month that has no data", () => {
    const analytics: AnalyticsReport = {
      ...testAnalytics(),
      startDate: "2026-08-02",
      throughDate: "2026-08-28",
      trackingStarted: "2026-08-02",
      previous: null,
    };
    const html = render({ analytics, search: { ...testSearch(), performance: null } });
    expect(html).toContain("Tracking began 2 August");
    expect(html).toContain("25% of all visits");
    expect(html).toContain("Google Analytics, 2 to 28 August.");
    expect(html).not.toContain("No July data");
  });

  it("never rounds a share of search visits or clicks to 0% or 100%", () => {
    const perf = testSearch().performance;
    if (!perf) throw new Error("fixture has performance");
    const withShares = (searchVisits: number, clicks: number): string =>
      render({
        analytics: { ...testAnalytics(), previous: null, current: { visitors: 900, visits: 1000, searchVisits } },
        search: { ...testSearch(), performance: { ...perf, previousTotals: null, totals: { clicks, impressions: 1000, position: 3 } } },
      });
    const small = withShares(1, 2);
    expect(small).toContain('<div class="stat__change">Under 1% of all visits</div>');
    expect(small).toContain('<div class="stat__change">Under 1% of impressions</div>');
    const large = withShares(999, 998);
    expect(large).toContain('<div class="stat__change">Over 99% of all visits</div>');
    expect(large).toContain('<div class="stat__change">Over 99% of impressions</div>');
    const none = withShares(0, 0);
    expect(none).toContain('<div class="stat__change">0% of all visits</div>');
    expect(none).toContain('<div class="stat__change">0% of impressions</div>');
  });

  it("refuses more attention items than the box holds, counting the health check's own", () => {
    const health = { ...testHealth(), audit: { critical: 0, high: 1, moderate: 0, low: 0 } };
    health.tls = { ...health.tls, validTo: "2026-10-01" };
    health.pages = { ...health.pages, ok: 9, failing: [{ path: "/work", status: 500 }] };
    const item = { title: "Please send the new photos", detail: "We need them for the gallery." };
    expect(render({ health })).toContain("Needs your attention");
    expect(() => render({ health, monthData: { ...month(), attention: [item] } })).toThrow(
      /5 attention items \(4 from the health check, 1 written by hand\).*at most 4/,
    );
  });

  it("still allows three hand-written items and no more", () => {
    const item = { title: "Please send the new photos", detail: "We need them for the gallery." };
    expect(render({ monthData: { ...month(), attention: [item, item, item] } })).toContain("Please send the new photos");
    expect(problemsOf(() => parseMonth({ ...month(), attention: [item, item, item, item] }, config)).join("\n")).toMatch(/attention.*at most 3/);
  });
});

describe("renderReport: page 2", () => {
  it("shows search detail: both tables, the key and the privacy note, without daily charts", () => {
    const html = render();
    expect(html).toContain("Search in detail");
    expect(html).not.toContain("Times shown per day");
    expect(html).toContain('<td class="dtable__name">hospitalit…g firm ny</td>');
    expect(html).toContain('<td class="dtable__name">hospitalit…new york</td>');
    expect(html).toContain("&lt;b&gt;gkr&lt;/b&gt; hotels");
    expect(html).toContain('<td class="dtable__name">Home</td><td>900</td><td>31</td><td>10.2</td>');
    expect(html).toContain("Seen: how many times the site appeared in Google results. Position: its average place, 1 being the top.");
    expect(html).toContain("the searches listed cover 28 of 57 clicks.");
  });

  it("shows visitor detail: sources, landing pages, and devices and country as a sentence", () => {
    const html = render();
    expect(html).toContain("Where visits came from");
    expect(html).toContain('<span class="barlist__label">Search engines</span>');
    expect(html).toContain("Visits were 85% on desktop and 15% on mobile, and 75% came from the United States.");
  });

  it("never rounds a device, country or click rate share to 0% or 100%", () => {
    const base = testAnalytics();
    const analytics: AnalyticsReport = {
      ...base,
      current: { visitors: 900, visits: 1000, searchVisits: 47 },
      detail: {
        ...base.detail,
        devices: [
          { name: "Desktop", visits: 998 },
          { name: "Mobile", visits: 2 },
        ],
        countries: [{ name: "India", visits: 3 }],
      },
    };
    const perf = testSearch().performance;
    if (!perf) throw new Error("fixture has performance");
    const html = render({ analytics, search: { ...testSearch(), performance: { ...perf, totals: { clicks: 1, impressions: 1000, position: 3 } } } });
    expect(html).toContain("Visits were over 99% on desktop and under 1% on mobile, and under 1% came from India.");
    expect(html).toContain("<dt>Click rate</dt><dd>Under 1%</dd>");
  });

  it("starts the audience note with a capital when a small country share comes first", () => {
    const base = testAnalytics();
    const analytics: AnalyticsReport = {
      ...base,
      current: { visitors: 900, visits: 1000, searchVisits: 47 },
      detail: { ...base.detail, devices: [], countries: [{ name: "India", visits: 3 }] },
    };
    expect(render({ analytics })).toContain("Under 1% came from India.");
  });

  it("prints the check date as it was in New York", () => {
    const html = render({ health: { ...testHealth(), checkedAt: "2026-09-30T02:00:00.000Z" } });
    expect(html).toContain("Checked 29 September 2026.");
    const sample = render({ monthData: { ...month(), sample: true }, health: { ...testHealth(), checkedAt: "2026-09-30T02:00:00.000Z" } });
    expect(sample).toContain("Illustrative readings, 29 September 2026.");
  });

  it("shows site health with real values, flagging the domain renewal", () => {
    const html = render();
    expect(html).toContain("Checked 29 September 2026.");
    expect(html).toMatch(/<li class="tile tile--flag">[\s\S]*?Domain renews[\s\S]*?With GoDaddy/);
    expect(html).toContain("To add: content security policy");
    expect(html).toContain("Next.js 16.3.6");
  });

  it("lists next month's plan and the monthly checks", () => {
    const html = render();
    expect(html).toContain("Coming in September");
    expect(html).toContain("<li>Add a content security policy</li>");
    expect(html).toContain("<p>Live error tracking, uptime checks, weekly log review</p>");
  });

  it("states plainly when Google has not released the month, with no placeholder numbers", () => {
    const html = render({ search: { ...testSearch(), performance: null } });
    expect(html).toContain("Search Console has not released August&#39;s impressions and clicks yet.");
    expect(html).toContain('<div class="stat__label">Visitors</div>');
    expect(html).not.toContain('<div class="stat__label">Seen in Google</div>');
    expect(html).not.toContain('class="dtable__name"');
  });
});

describe("renderReport: sample reports", () => {
  it("labels an illustrative report and names no data source", () => {
    const html = render({ monthData: { ...month(), sample: true } });
    expect(html).toContain('<span class="issue__label">Sample website care report, August 2026</span>');
    expect(html).toContain("<span>Sample website care report, August 2026</span>");
    expect(html).toContain("Illustrative figures, 1 to 31 August.");
    expect(html).toContain("Illustrative readings, 29 September 2026.");
    expect(html).not.toContain("Google Analytics,");
    expect(html).not.toContain("Google Search,");
    expect(reportFileStem(config, parseMonth({ ...month(), sample: true }, config))).toBe(
      "GKR-Hospitality-Website-Care-Report-August-2026-Sample",
    );
  });

  it("reads as a normal report when sample is left out, and rejects a non-boolean", () => {
    expect(render()).toContain('<span class="issue__label">Website care report, August 2026</span>');
    expect(problemsOf(() => parseMonth({ ...month(), sample: "yes" }, config)).join("\n")).toMatch(/sample/);
  });
});

describe("renderReport: months before tracking began", () => {
  const untracked = (): string =>
    renderReport(template, config, parseMonth({ ...month(), tracked: false }, config), null, null, testHealth());

  it("renders one page with health and next month's plan, and no visitor or search numbers", () => {
    const html = untracked();
    expect(html).toContain('<body class="report--single">');
    expect(html).not.toContain("Page 1 of 2");
    expect(html).not.toContain('class="stat__value"');
    expect(html).not.toContain('class="dtable__name"');
    expect(html).toContain("Average load time");
    expect(html).toContain("Slowest: About");
    expect(html).not.toContain("Indexed by Google");
    expect(html).toContain("<h2>Coming in September</h2>");
  });

  it("shows the monthly checks instead of a health section when the month has no health readings", () => {
    const html = renderReport(template, config, parseMonth({ ...month(), tracked: false }, config), null, null, null);
    expect(html).not.toContain("Site health");
    expect(html).toContain("<h2>Checked every month</h2>");
    expect(html).toContain("<h2>Coming in September</h2>");
  });

  it("shows recorded health facts in three columns when nobody ran the health check", () => {
    const records = [
      { label: "Security certificate", value: "Valid", note: "Until 17 Oct 2026" },
      { label: "Domain renews", value: "5 Dec 2026", note: "With GoDaddy" },
      { label: "Deployments", value: "1 of 1", note: "Live on 26 August" },
    ];
    const html = renderReport(template, config, parseMonth({ ...month(), tracked: false, healthRecords: records }, config), null, null, null);
    expect(html).toContain('<ul class="tiles tiles--three">');
    expect(html).toContain("From the August records: certificate logs, the domain registry, Vercel and the code.");
    expect(html).not.toContain("<h2>Checked every month</h2>");
    expect(problemsOf(() => parseMonth({ ...month(), healthRecords: records.slice(0, 2) }, config)).join("\n")).toMatch(/healthRecords/);
  });

  it("refuses data that does not match the month's tracking", () => {
    expect(() => renderReport(template, config, parseMonth(month(), config), null, null, testHealth())).toThrow(/needs both/);
    expect(() =>
      renderReport(template, config, parseMonth({ ...month(), tracked: false }, config), testSearch(), testAnalytics(), testHealth()),
    ).toThrow(/must not be given/);
  });
});

describe("renderReport: health tiles", () => {
  const tile = (html: string, label: string): string | undefined =>
    new RegExp(`<li class="tile[^"]*">\\s*<span class="tile__label">${label}</span>[\\s\\S]*?</li>`).exec(html)?.[0];

  it("shows a certificate as expired once its date has passed, and valid on its last day", () => {
    const expired = tile(render({ health: { ...testHealth(), tls: { ...testHealth().tls, validTo: "2026-09-28" } } }), "Security certificate");
    expect(expired).toContain('class="tile tile--flag"');
    expect(expired).toContain('<span class="tile__value">Expired</span>');
    expect(expired).toContain("On 28 Sep 2026");
    const lastDay = tile(render({ health: { ...testHealth(), tls: { ...testHealth().tls, validTo: "2026-09-29" } } }), "Security certificate");
    expect(lastDay).toContain('<span class="tile__value">Valid</span>');
    expect(lastDay).toContain("Until 29 Sep 2026");
  });

  it("says so plainly when the month had no deployments", () => {
    const operations = { deployments: { succeeded: 0, total: 0 }, runtimeErrors: { count: 0, days: 7 } };
    const none = tile(render({ monthData: { ...month(), operations } }), "Deployments");
    expect(none).toContain('<span class="tile__value">None</span>');
    expect(none).toContain("No site changes this month");
    expect(none).not.toContain("tile--flag");
    expect(tile(render(), "Deployments")).toContain('<span class="tile__value">4 of 4</span>');
  });

  it("finds a page's name when the sitemap lists it with a trailing slash or a query string", () => {
    const withSlowest = (path: string): string =>
      renderReport(
        template,
        config,
        parseMonth({ ...month(), tracked: false }, config),
        null,
        null,
        { ...testHealth(), pages: { ...testHealth().pages, slowest: { path, ms: 40 } } },
      );
    expect(withSlowest("/about/")).toContain("Slowest: About");
    expect(withSlowest("/about?ref=x")).toContain("Slowest: About");
    expect(withSlowest("/unnamed/")).toContain("Slowest: /unnamed/");
  });

  it("counts long lists instead of naming every item", () => {
    const health = { ...testHealth(), headers: { present: ["HTTPS enforced (HSTS)"], missing: ["A", "B", "C", "D", "E"] } };
    const search = { ...testSearch(), indexing: { ...testSearch().indexing, pagesIndexed: 2, notIndexed: ["/a", "/b", "/c", "/d", "/e", "/f", "/g", "/h"] } };
    const html = render({ health, search });
    expect(html).toContain("5 still to add");
    expect(html).toContain("8 pages not indexed");
  });

  it("counts serious alerts on their own instead of naming a total after the worst one", () => {
    const tileValue = (audit: HealthReport["audit"]): string | undefined =>
      /Security alerts in code<\/span>\s*<span class="tile__value">([^<]+)</.exec(render({ health: { ...testHealth(), audit } }))?.[1];
    expect(tileValue({ critical: 1, high: 9, moderate: 38, low: 25 })).toBe("10 serious");
    expect(tileValue({ critical: 0, high: 0, moderate: 12, low: 8 })).toBe("20 minor");
    expect(tileValue({ critical: 0, high: 0, moderate: 0, low: 0 })).toBe("None");
  });
});

describe("renderReport: safety", () => {
  it("escapes HTML in every piece of copy", () => {
    const data = month();
    data.summary = 'Blocked <script>alert("x")</script> & more.';
    const html = render({ monthData: data });
    expect(html).not.toContain("<script>");
    expect(html).toContain("Blocked &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; more.");
  });

  it("fails loudly when the template asks for a value that does not exist", () => {
    expect(() =>
      renderReport(`${template}{{unknownToken}}`, config, parseMonth(month(), config), testSearch(), testAnalytics(), testHealth()),
    ).toThrow(/unknownToken/);
  });
});

describe("inlineAssets", () => {
  it("replaces quoted asset paths with data URIs by file type", () => {
    const html = '<img src="assets/a.png"><style>x{src:url("assets/f.woff2")}</style>';
    const out = inlineAssets(html, (path) => (path === "assets/a.png" ? "UE5H" : "d09GMg=="));
    expect(out).toBe(
      '<img src="data:image/png;base64,UE5H"><style>x{src:url("data:font/woff2;base64,d09GMg==")}</style>',
    );
  });

  it("rejects asset types it cannot label", () => {
    expect(() => inlineAssets('<img src="assets/a.gif">', () => "")).toThrow(/\.gif/);
  });
});

describe("layout probe", () => {
  const fits: LayoutMeasurements = {
    pageOverflowPx: 0,
    horizontalOverflowPx: 0,
    overflowPage: 0,
    headlineLines: 2,
    summaryToFiguresGapPx: 18,
    footerBottomGapPx: 0,
  };

  it("passes measurements from pages that fit", () => {
    expect(layoutProblems(fits)).toEqual([]);
  });

  it("names each way the pages can break, and which page", () => {
    const problems = layoutProblems({
      pageOverflowPx: 64,
      horizontalOverflowPx: 90,
      overflowPage: 2,
      headlineLines: 3,
      summaryToFiguresGapPx: -20,
      footerBottomGapPx: -40,
    }).join("\n");
    expect(problems).toMatch(/headline.*3 lines/);
    expect(problems).toMatch(/summary.*figures panel/);
    expect(problems).toMatch(/64px past the bottom of page 2/);
    expect(problems).toMatch(/90px past the right edge on page 2/);
    expect(problems).toMatch(/footer/);
  });

  it("reads the measurements Chrome writes into the page", () => {
    const dom = `<html><body><main></main><script type="application/json" id="layout-probe">${JSON.stringify(fits)}</script></body></html>`;
    expect(parseLayoutProbe(dom)).toEqual(fits);
  });

  it("fails clearly when the probe did not run", () => {
    expect(() => parseLayoutProbe("<html><body></body></html>")).toThrow(/layout probe/);
  });

  it("injects the probe script before </body> without touching the rest of the page", () => {
    const probed = withLayoutProbe("<html><body><main>x</main></body></html>");
    expect(probed.startsWith("<html><body><main>x</main><script>")).toBe(true);
    expect(probed.endsWith("</script></body></html>")).toBe(true);
  });
});

describe("countPdfPages", () => {
  it("counts page objects and ignores the page tree root", () => {
    const pdf = "1 0 obj <</Type /Pages /Count 2>> 2 0 obj <</Type /Page /Parent 1 0 R>> 3 0 obj <</Type/Page>>";
    expect(countPdfPages(pdf)).toBe(2);
  });
});
