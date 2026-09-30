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
    expect(september.operations.deployments).toEqual({ succeeded: 6, total: 6 });
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
    expect(parseHealth(testHealth()).domain.expires).toBe("2026-12-05");
  });

  it("accept the committed September 2026 data files", () => {
    expect(parseSearch(readJson("./months/2026-09.search.json"), "2026-09").property).toBe("https://www.gkrhospitality.com/");
    expect(parseAnalytics(readJson("./months/2026-09.analytics.json"), "2026-09").trackingStarted).toBe("2026-09-03");
    expect(parseHealth(readJson("./months/2026-09.health.json")).pages.checked).toBe(10);
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
    expect(problemsOf(() => parseHealth(data)).join("\n")).toMatch(/tls\.validTo/);
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
    expect(html).toContain("Shown: impressions, the times the site appeared in Google results.");
    expect(html).toContain("the searches listed cover 28 of 57 clicks.");
  });

  it("shows visitor detail: sources, landing pages, and devices and country as a sentence", () => {
    const html = render();
    expect(html).toContain("Where visits came from");
    expect(html).toContain('<span class="barlist__label">Search engines</span>');
    expect(html).toContain("Visits were 85% on desktop and 15% on mobile, and 75% came from the United States.");
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
    expect(html).not.toContain('<div class="stat__label">Impressions</div>');
    expect(html).not.toContain('class="dtable__name"');
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
