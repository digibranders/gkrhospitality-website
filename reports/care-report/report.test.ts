import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ReportValidationError,
  countPdfPages,
  describeChange,
  formatDate,
  formatStatNumber,
  formatPeriod,
  inlineAssets,
  layoutProblems,
  parseConfig,
  parseLayoutProbe,
  parseAnalytics,
  parseMonth,
  parseSearch,
  renderReport,
  reportFileStem,
  withLayoutProbe,
} from "./report.ts";
import type { AnalyticsReport, LayoutMeasurements, SearchReport } from "./report.ts";

const here = (file: string): string => fileURLToPath(new URL(file, import.meta.url));
const readJson = (file: string): unknown => JSON.parse(readFileSync(here(file), "utf8"));

const rawConfig = readJson("./config.json");
const rawAugust = readJson("./months/2026-08.json");
const template = readFileSync(here("./template.html"), "utf8");

/** Deep clone of the real August data, so each test can break one field. */
const august = (): Record<string, unknown> =>
  JSON.parse(JSON.stringify(rawAugust)) as Record<string, unknown>;

/** Test data only. Real months get their numbers from npm run report:search. */
const testSearch = (): SearchReport => ({
  source: "Google Search Console",
  property: "sc-domain:gkrhospitality.com",
  period: "2026-08",
  fetchedAt: "2026-09-29T10:00:00.000Z",
  performance: {
    throughDate: "2026-08-31",
    totals: { clicks: 57, impressions: 4210 },
    previousTotals: { clicks: 48, impressions: 4380 },
    topPages: [
      { path: "/", clicks: 31 },
      { path: "/services", clicks: 12 },
      { path: "/work/boston-harbor", clicks: 4 },
    ],
    topQueries: [
      { query: "gkr hospitality", clicks: 22 },
      { query: "<b>hospitality</b> consultant nyc", clicks: 6 },
    ],
  },
  indexing: { checkedAt: "2026-09-29T10:00:00.000Z", pagesChecked: 10, pagesIndexed: 10, notIndexed: [] },
});

/** Test data only. Real months get their numbers from npm run report:analytics. */
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

describe("parseConfig", () => {
  it("accepts the committed config", () => {
    const config = parseConfig(rawConfig);
    expect(config.client.name).toBe("GKR Hospitality");
    expect(config.careAreas).toHaveLength(6);
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
    expect(parseConfig(withProperty("https://www.gkrhospitality.com/")).searchConsole.property).toBe(
      "https://www.gkrhospitality.com/",
    );
    expect(problemsOf(() => parseConfig(withProperty("gkrhospitality.com"))).join("\n")).toMatch(
      /searchConsole\.property/,
    );
  });
});

describe("parseMonth", () => {
  const config = parseConfig(rawConfig);

  it("accepts the committed August 2026 report", () => {
    const month = parseMonth(rawAugust, config);
    expect(month.figures).toHaveLength(4);
    expect(month.improvements).toHaveLength(4);
  });

  it("rejects em-dashes and en-dashes anywhere in the copy", () => {
    const data = august();
    data.summary = "Monitoring is live \u2014 errors are captured.";
    (data.improvements as { body: string }[])[0].body = "Pages 1\u20133 reviewed.";
    const problems = problemsOf(() => parseMonth(data, config));
    expect(problems.join("\n")).toMatch(/summary.*dash/);
    expect(problems.join("\n")).toMatch(/improvements\[0\]\.body.*dash/);
  });

  it("requires exactly four figures, because the panel and its shadow are sized for four", () => {
    const data = august();
    (data.figures as unknown[]).pop();
    expect(problemsOf(() => parseMonth(data, config)).join("\n")).toMatch(/figures.*exactly 4/);
  });

  it("requires every improvement to name one of the configured care areas", () => {
    const data = august();
    (data.improvements as { area: string }[])[1].area = "Design";
    expect(problemsOf(() => parseMonth(data, config)).join("\n")).toMatch(
      /improvements\[1\]\.area.*"Design"/,
    );
  });

  it("allows between one and four improvements", () => {
    const none = august();
    none.improvements = [];
    expect(problemsOf(() => parseMonth(none, config)).join("\n")).toMatch(/improvements.*1 to 4/);

    const one = august();
    one.improvements = (one.improvements as unknown[]).slice(0, 1);
    expect(parseMonth(one, config).improvements).toHaveLength(1);
  });

  it("requires the emphasised word to appear in the headline", () => {
    const data = august();
    data.headlineEmphasis = "secure";
    expect(problemsOf(() => parseMonth(data, config)).join("\n")).toMatch(/headlineEmphasis/);
  });

  it("rejects impossible dates and a next report that is not after the issue date", () => {
    const data = august();
    data.issued = "2026-02-30";
    data.nextReport = "2026-08-01";
    const problems = problemsOf(() => parseMonth(data, config)).join("\n");
    expect(problems).toMatch(/issued.*real date/);

    const order = august();
    order.nextReport = "2026-08-20";
    expect(problemsOf(() => parseMonth(order, config)).join("\n")).toMatch(/nextReport.*after/);
  });

  it("reports every problem at once instead of stopping at the first", () => {
    const data = august();
    data.summary = "";
    data.headline = 42;
    data.period = "August";
    expect(problemsOf(() => parseMonth(data, config)).length).toBeGreaterThanOrEqual(3);
  });
});

describe("formatting", () => {
  it("formats dates as day, month name, year", () => {
    expect(formatDate("2026-08-28")).toBe("28 August 2026");
    expect(formatDate("2026-01-01")).toBe("1 January 2026");
  });

  it("formats the reporting period", () => {
    expect(formatPeriod("2026-08")).toEqual({ label: "August 2026", monthName: "August" });
  });

  it("builds a stable file name from client and period", () => {
    const config = parseConfig(rawConfig);
    const month = parseMonth(rawAugust, config);
    expect(reportFileStem(config, month)).toBe("GKR-Hospitality-Website-Care-Report-August-2026");
  });
});

describe("renderReport", () => {
  const config = parseConfig(rawConfig);

  it("fills every placeholder in the template", () => {
    const html = renderReport(template, config, parseMonth(rawAugust, config), testSearch(), testAnalytics());
    expect(html).not.toMatch(/\{\{/);
    expect(html).toContain("<h1>Your website is <em>healthy</em> and fully cared for.</h1>");
    expect(html).toContain("Issued 28 August 2026");
    expect(html).toContain("What we improved in August");
    expect(html).toContain("<strong>26 September 2026</strong>");
    expect(html).toContain('<div class="figure__value">100<small>%</small></div>');
    expect(html).toContain('<div class="figure__label">Deployments<br>succeeded</div>');
    expect(html).toContain("<h3>Backups &amp; history</h3>");
    expect(html).toContain("<p>Live error tracking, uptime checks, weekly log review</p>");
    expect(html).toContain("<p>Contact form tested, key pages reviewed, SSL, domain &amp; DNS checks</p>");
  });

  it("renders the search section with readable page names and month-on-month change", () => {
    const html = renderReport(template, config, parseMonth(rawAugust, config), testSearch(), testAnalytics());
    expect(html).toContain("Visitors and search in August");
    expect(html).toContain("Google Analytics and Google Search, 1 to 31 August.");
    expect(html).toContain('<div class="stat__value">165</div>');
    expect(html).toContain('<div class="stat__change stat__change--up">Up 10% on July</div>');
    expect(html).toContain('<div class="stat__value">4,210</div>');
    expect(html).toContain('<div class="stat__change">Down 4% on July</div>');
    expect(html).toContain('<div class="stat__change stat__change--up">Up 19% on July</div>');
    expect(html).toContain('<span class="ranking__name">Home</span><span class="ranking__clicks">31</span>');
    expect(html).toContain('<span class="ranking__name">/work/boston-harbor</span>');
    expect(html).toContain("All 10 pages indexed by Google.");
    expect(html).toContain("Google keeps rare searches private, so these cover 28 of 57 clicks.");
    expect(html).toContain("&lt;b&gt;hospitality&lt;/b&gt; consultant nyc");
  });

  it("says so plainly when no page or query earned a click", () => {
    const base = testSearch();
    const search: SearchReport = {
      ...base,
      performance: { throughDate: "2026-08-31", totals: { clicks: 0, impressions: 90 }, previousTotals: null, topPages: [], topQueries: [] },
    };
    const html = renderReport(template, config, parseMonth(rawAugust, config), search, testAnalytics());
    expect(html).toContain("No page earned a click from search in August.");
    expect(html).toContain("No query brought a click in August.");
    expect(html).toContain("No July data to compare");
  });

  it("states plainly when Google has not released the month, with no placeholder numbers", () => {
    const search: SearchReport = {
      ...testSearch(),
      performance: null,
      indexing: { checkedAt: "2026-09-29T10:00:00.000Z", pagesChecked: 10, pagesIndexed: 9, notIndexed: ["/gallery"] },
    };
    const html = renderReport(template, config, parseMonth(rawAugust, config), search, testAnalytics());
    expect(html).toContain("Impressions, clicks, top pages and top queries for August are not available yet.");
    expect(html).toContain("9 of 10 pages indexed by Google.");
    // Visitors still show (GA4 has them); only the search numbers wait.
    expect(html).toContain('<div class="stat__label">Visitors</div>');
    expect(html).not.toContain('<div class="stat__label">Impressions</div>');
    expect(html).not.toContain('class="ranking__name"');
  });

  it("escapes HTML in every piece of copy", () => {
    const data = august();
    data.summary = 'Blocked <script>alert("x")</script> & more.';
    const html = renderReport(template, config, parseMonth(data, config), testSearch(), testAnalytics());
    expect(html).not.toContain("<script>");
    expect(html).toContain("Blocked &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; more.");
  });

  it("fails loudly when the template asks for a value that does not exist", () => {
    expect(() =>
      renderReport(`${template}{{unknownToken}}`, config, parseMonth(rawAugust, config), testSearch(), testAnalytics()),
    ).toThrow(/unknownToken/);
  });
});

describe("parseSearch", () => {
  it("accepts data shaped like fetch-search.ts output", () => {
    expect(parseSearch(testSearch(), "2026-08").performance?.totals.clicks).toBe(57);
    expect(parseSearch({ ...testSearch(), performance: null }, "2026-08").performance).toBeNull();
  });

  it("rejects search data from a different month, and impossible numbers", () => {
    const base = testSearch();
    const data = {
      ...base,
      period: "2026-07",
      performance: { ...base.performance, totals: { clicks: 90, impressions: 12 } },
      indexing: { ...base.indexing, pagesIndexed: 11 },
    };
    const problems = problemsOf(() => parseSearch(data, "2026-08")).join("\n");
    expect(problems).toMatch(/period.*2026-07/);
    expect(problems).toMatch(/more clicks than impressions/);
    expect(problems).toMatch(/pagesIndexed plus notIndexed must equal pagesChecked/);
  });

  it("caps each ranked list at five rows", () => {
    const six = Array.from({ length: 6 }, (_, i) => ({ query: `query ${i}`, clicks: 6 - i }));
    const base = testSearch();
    const data = { ...base, performance: { ...base.performance, topQueries: six } };
    expect(problemsOf(() => parseSearch(data, "2026-08")).join("\n")).toMatch(/performance\.topQueries.*at most 5/);
  });
});

describe("parseAnalytics", () => {
  it("accepts data shaped like fetch-analytics.ts output", () => {
    expect(parseAnalytics(testAnalytics(), "2026-08").current.visitors).toBe(165);
  });

  it("rejects the wrong month, dates outside it and impossible numbers", () => {
    const data = {
      ...testAnalytics(),
      throughDate: "2026-09-02",
      current: { visitors: 5, visits: 10, searchVisits: 12 },
    };
    const problems = problemsOf(() => parseAnalytics(data, "2026-08")).join("\n");
    expect(problems).toMatch(/throughDate.*2026-08/);
    expect(problems).toMatch(/more search visits than visits/);
    expect(problemsOf(() => parseAnalytics(testAnalytics(), "2026-09")).join("\n")).toMatch(/period/);
  });

  it("says when tracking began instead of comparing with a month that has no data", () => {
    const config = parseConfig(rawConfig);
    const analytics: AnalyticsReport = {
      ...testAnalytics(),
      startDate: "2026-08-02",
      throughDate: "2026-08-28",
      trackingStarted: "2026-08-02",
      previous: null,
    };
    const search: SearchReport = { ...testSearch(), performance: null };
    const html = renderReport(template, config, parseMonth(rawAugust, config), search, analytics);
    expect(html).toContain("Tracking began 2 August");
    expect(html).toContain("25% of all visits");
    expect(html).toContain("Google Analytics, 2 to 28 August.");
    expect(html).not.toContain("No July data");
  });
});

describe("formatStatNumber", () => {
  it("groups thousands, and shortens from 100,000 so the number fits its column", () => {
    expect(formatStatNumber(47)).toBe("47");
    expect(formatStatNumber(4210)).toBe("4,210");
    expect(formatStatNumber(99_999)).toBe("99,999");
    expect(formatStatNumber(128_450)).toBe("128.5K");
    expect(formatStatNumber(1_284_300)).toBe("1.3M");
  });
});

describe("describeChange", () => {
  it("describes the change against last month in plain words", () => {
    expect(describeChange(57, 48, "July")).toEqual({ text: "Up 19% on July", direction: "up" });
    expect(describeChange(4210, 4380, "July")).toEqual({ text: "Down 4% on July", direction: "down" });
    expect(describeChange(100, 100, "July")).toEqual({ text: "Level with July", direction: "level" });
    expect(describeChange(3, 0, "July")).toEqual({ text: "Up from 0 in July", direction: "up" });
    expect(describeChange(3, null, "July")).toEqual({ text: "No July data to compare", direction: "none" });
    expect(describeChange(2500, 1000, "July").text).toBe("Up 150% on July");
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
    headlineLines: 2,
    summaryToFiguresGapPx: 18,
    footerBottomGapPx: 30,
  };

  it("passes the approved August layout measurements", () => {
    expect(layoutProblems(fits)).toEqual([]);
  });

  it("names each way the page can break", () => {
    const problems = layoutProblems({
      pageOverflowPx: 64,
      horizontalOverflowPx: 90,
      headlineLines: 3,
      summaryToFiguresGapPx: -20,
      footerBottomGapPx: -40,
    }).join("\n");
    expect(problems).toMatch(/headline.*3 lines/);
    expect(problems).toMatch(/summary.*figures panel/);
    expect(problems).toMatch(/64px/);
    expect(problems).toMatch(/footer/);
    expect(problems).toMatch(/90px past the right edge/);
  });

  it("reads the measurements Chrome writes into the page", () => {
    const dom = `<html><body><main></main><script type="application/json" id="layout-probe">${JSON.stringify(fits)}</script></body></html>`;
    expect(parseLayoutProbe(dom)).toEqual(fits);
  });

  it("fails clearly when the probe did not run", () => {
    expect(() => parseLayoutProbe("<html><body></body></html>")).toThrow(/layout probe/);
  });

  it("injects the probe script before </body> without touching the rest of the page", () => {
    const page = "<html><body><main>x</main></body></html>";
    const probed = withLayoutProbe(page);
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
