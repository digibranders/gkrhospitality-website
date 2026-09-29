/**
 * Monthly care report: data model, validation and HTML rendering.
 *
 * Pure functions only. File and Chrome access live in build.ts, so everything
 * here is covered by report.test.ts without touching the disk or a browser.
 */
import { monthRange, nextPeriod, previousPeriod } from "./periods.ts";
import { barList, dailyColumns, fillDays } from "./charts.ts";
import { attentionFromHealth, registrarName } from "./health.ts";
import type { DayStats, DeviceStats, Indexing, PageStats, QueryStats, Totals } from "./search-console.ts";
import type { AnalyticsTotals, Ranked, VisitorDetail } from "./analytics.ts";
import type { AttentionItem, HealthReport } from "./health.ts";

export interface CareArea {
  name: string;
  checks: string[];
}

export interface ReportConfig {
  client: { name: string; domain: string; logo: string; heroImage: string };
  agency: { name: string; domain: string; wordmark: string; serviceName: string };
  searchConsole: {
    /** "sc-domain:example.com" for a Domain property, or "https://www.example.com/" for a URL-prefix one. */
    property: string;
    /** The live sitemap; every page in it is checked with URL Inspection each month. */
    sitemapUrl: string;
    /** Readable names for site paths in the top pages list, like "/services": "Services". */
    pageNames: Record<string, string>;
  };
  analytics: {
    /** The numeric GA4 property ID, shown in GA4 under Admin > Property details. */
    propertyId: string;
  };
  careAreas: CareArea[];
}

/** Visitors for one range, from GA4. */
export interface VisitorFigures extends AnalyticsTotals {
  /** Sessions in GA4's Organic Search channel. */
  searchVisits: number;
}

/** Written by fetch-analytics.ts to months/YYYY-MM.analytics.json. */
export interface AnalyticsReport {
  source: string;
  propertyId: string;
  period: string;
  fetchedAt: string;
  /** First day covered: the 1st, or the day tracking began if that was later. */
  startDate: string;
  /** Last day covered: the month's last day once final, or the latest complete day while it runs. */
  throughDate: string;
  /** Set when GA4 has no earlier data, so there is nothing to compare against. */
  trackingStarted: string | null;
  current: VisitorFigures;
  /** Null when GA4 has no data for the previous month. */
  previous: VisitorFigures | null;
  /** Sources, landing pages, devices, countries, engagement and visits per day, for page 2. */
  detail: VisitorDetail;
}

/** Impressions, clicks and the ranked lists for one month. */
export interface SearchPerformance {
  /** Last day covered: the month's last day, or the latest finalised day when fetched with --partial. */
  throughDate: string;
  totals: Totals;
  /** Null when Search Console has no data for the previous month. */
  previousTotals: Totals | null;
  daily: DayStats[];
  /** Queries by clicks then impressions, including those seen but not clicked. */
  queries: QueryStats[];
  pages: PageStats[];
  devices: DeviceStats[];
}

/** Written by fetch-search.ts to months/YYYY-MM.search.json. */
export interface SearchReport {
  source: string;
  property: string;
  period: string;
  fetchedAt: string;
  /**
   * Null while Search Console has not released the month (it settles about
   * three days after the month ends) or is still loading a new property.
   * The report then says so instead of showing numbers.
   */
  performance: SearchPerformance | null;
  /** Live URL Inspection results for every page in the sitemap. */
  indexing: Indexing;
}

export interface Figure {
  value: string;
  unit?: string;
  /** One or two lines, rendered with a line break between them. */
  label: string[];
}

export interface Improvement {
  /** Must match one of ReportConfig.careAreas[].name. */
  area: string;
  title: string;
  body: string;
}

export interface MonthlyReport {
  /** Reporting month as YYYY-MM. */
  period: string;
  /** Issue date as YYYY-MM-DD. */
  issued: string;
  /** Next report date as YYYY-MM-DD. */
  nextReport: string;
  headline: string;
  /** A word or phrase inside the headline, set in the accent colour. */
  headlineEmphasis: string;
  summary: string;
  figures: Figure[];
  improvementsNote: string;
  improvements: Improvement[];
  /** Figures only Vercel knows; entered by hand from the Vercel dashboard. */
  operations: {
    deployments: { succeeded: number; total: number };
    runtimeErrors: { count: number; days: number };
  };
  /** Extra items for "Needs your attention", on top of those the health check raises. */
  attention: AttentionItem[];
  /** What is planned for next month, one line each. */
  nextMonth: string[];
  /** Optional per-month masthead photo; falls back to config.client.heroImage. */
  heroImage?: string;
}

export class ReportValidationError extends Error {
  readonly problems: string[];

  constructor(source: string, problems: string[]) {
    super(`${source} has ${problems.length} problem(s):\n  - ${problems.join("\n  - ")}`);
    this.name = "ReportValidationError";
    this.problems = problems;
  }
}

/*
 * Layout limits. The report must stay on one Letter page, so copy lengths are
 * capped at roughly what each slot holds. build.ts also checks the page count
 * of the finished PDF, which is the final guard.
 */
const FIGURE_COUNT = 4;
const MAX_IMPROVEMENTS = 4;
const MAX_TABLE_ROWS = 5;
const MAX_ATTENTION = 3;
const MAX_NEXT_MONTH = 5;
const CARE_AREA_COUNT = 6;
const LIMITS = {
  headline: 46, // two lines at 37px
  headlineEmphasis: 24,
  summary: 140, // usually two lines; the layout probe makes the exact call
  figureValue: 5,
  figureUnit: 3,
  figureLabelLine: 20,
  improvementsNote: 110,
  improvementArea: 24,
  improvementTitle: 36, // one line
  improvementBody: 84, // two lines
  careCheck: 28,
  attentionTitle: 60,
  attentionDetail: 140,
  nextMonthItem: 72, // one line at 11.5px across the content column
  short: 60,
} as const;

const ASSET_PATH = /^assets\/[A-Za-z0-9._-]+$/;
const SEARCH_PROPERTY = /^(sc-domain:[a-z0-9.-]+\.[a-z]{2,}|https?:\/\/[^\s/]+\/)$/;
const DASHES = /[\u2013\u2014]/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_MONTH = /^(\d{4})-(\d{2})$/;

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

type Json = Record<string, unknown>;

class Checker {
  readonly problems: string[] = [];

  fail(path: string, message: string): void {
    this.problems.push(`${path}: ${message}`);
  }

  record(value: unknown, path: string): Json | undefined {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) return value as Json;
    this.fail(path, "must be an object");
    return undefined;
  }

  array(value: unknown, path: string): unknown[] | undefined {
    if (Array.isArray(value)) return value;
    this.fail(path, "must be a list");
    return undefined;
  }

  /** Non-empty, trimmed, dash-free text within a length limit. */
  text(value: unknown, path: string, max: number): string {
    if (typeof value !== "string") {
      this.fail(path, "must be text");
      return "";
    }
    if (value.trim() === "") this.fail(path, "must not be empty");
    else if (value !== value.trim()) this.fail(path, "must not start or end with spaces");
    if (value.length > max) {
      this.fail(path, `is ${value.length} characters; the layout holds at most ${max}`);
    }
    if (DASHES.test(value)) {
      this.fail(path, "contains an em-dash or en-dash; use a comma, colon or full stop instead");
    }
    return value;
  }

  asset(value: unknown, path: string): string {
    const text = this.text(value, path, LIMITS.short);
    if (text && !ASSET_PATH.test(text)) {
      this.fail(path, `must be a file directly inside assets/, like "assets/photo.jpg" (got "${text}")`);
    }
    return text;
  }

  date(value: unknown, path: string): string {
    const text = this.text(value, path, 10);
    if (text && parseIsoDate(text) === undefined) {
      this.fail(path, `must be a real date written as YYYY-MM-DD (got "${text}")`);
    }
    return text;
  }

  count(value: unknown, path: string): number {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
      this.fail(path, `must be a whole number of 0 or more (got ${JSON.stringify(value)})`);
      return 0;
    }
    return value;
  }

  throwIfAny(source: string): void {
    if (this.problems.length > 0) throw new ReportValidationError(source, this.problems);
  }
}

function parseIsoDate(text: string): Date | undefined {
  const match = ISO_DATE.exec(text);
  if (!match) return undefined;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const roundTrips =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return roundTrips ? date : undefined;
}

function parsePeriod(text: string): Date | undefined {
  const match = ISO_MONTH.exec(text);
  if (!match) return undefined;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return undefined;
  return new Date(Date.UTC(Number(match[1]), month - 1, 1));
}

/** Validates config.json and returns it typed. Throws ReportValidationError listing every problem. */
export function parseConfig(input: unknown): ReportConfig {
  const c = new Checker();
  const root = c.record(input, "config") ?? {};
  const client = c.record(root.client, "client") ?? {};
  const agency = c.record(root.agency, "agency") ?? {};
  const search = c.record(root.searchConsole, "searchConsole") ?? {};
  const analytics = c.record(root.analytics, "analytics") ?? {};
  if (typeof analytics.propertyId === "string" && !/^\d+$/.test(analytics.propertyId)) {
    c.fail("analytics.propertyId", `must be the numeric GA4 property ID (got "${analytics.propertyId}")`);
  }
  const rawPageNames = c.record(search.pageNames, "searchConsole.pageNames") ?? {};
  const pageNames: Record<string, string> = {};
  for (const path of Object.keys(rawPageNames)) {
    if (!path.startsWith("/")) c.fail(`searchConsole.pageNames["${path}"]`, "must be a site path starting with /");
    pageNames[path] = c.text(rawPageNames[path], `searchConsole.pageNames["${path}"]`, LIMITS.short);
  }
  const property = c.text(search.property, "searchConsole.property", LIMITS.short);
  const sitemapUrl = c.text(search.sitemapUrl, "searchConsole.sitemapUrl", 200);
  if (sitemapUrl && !/^https:\/\/[^\s/]+\/\S*sitemap\S*\.xml$/.test(sitemapUrl)) {
    c.fail("searchConsole.sitemapUrl", `must be an https URL to an XML sitemap (got "${sitemapUrl}")`);
  }
  if (property && !SEARCH_PROPERTY.test(property)) {
    c.fail(
      "searchConsole.property",
      `must be "sc-domain:example.com" or a URL ending in / like "https://www.example.com/" (got "${property}")`,
    );
  }

  const config: ReportConfig = {
    client: {
      name: c.text(client.name, "client.name", LIMITS.short),
      domain: c.text(client.domain, "client.domain", LIMITS.short),
      logo: c.asset(client.logo, "client.logo"),
      heroImage: c.asset(client.heroImage, "client.heroImage"),
    },
    agency: {
      name: c.text(agency.name, "agency.name", LIMITS.short),
      domain: c.text(agency.domain, "agency.domain", LIMITS.short),
      wordmark: c.asset(agency.wordmark, "agency.wordmark"),
      serviceName: c.text(agency.serviceName, "agency.serviceName", LIMITS.short),
    },
    searchConsole: { property, sitemapUrl, pageNames },
    analytics: { propertyId: c.text(analytics.propertyId, "analytics.propertyId", 20) },
    careAreas: [],
  };

  const areas = c.array(root.careAreas, "careAreas") ?? [];
  if (areas.length !== CARE_AREA_COUNT) {
    c.fail("careAreas", `must list exactly ${CARE_AREA_COUNT} areas for the 3 x 2 grid (found ${areas.length})`);
  }
  areas.forEach((raw, i) => {
    const area = c.record(raw, `careAreas[${i}]`) ?? {};
    const checks = c.array(area.checks, `careAreas[${i}].checks`) ?? [];
    if (checks.length < 1 || checks.length > 3) {
      c.fail(`careAreas[${i}].checks`, `must list 1 to 3 checks (found ${checks.length})`);
    }
    config.careAreas.push({
      name: c.text(area.name, `careAreas[${i}].name`, LIMITS.improvementArea),
      checks: checks.map((check, j) => c.text(check, `careAreas[${i}].checks[${j}]`, LIMITS.careCheck)),
    });
  });

  const names = config.careAreas.map((area) => area.name);
  names.forEach((name, i) => {
    if (names.indexOf(name) !== i) c.fail(`careAreas[${i}].name`, `"${name}" is listed twice`);
  });

  c.throwIfAny("config.json");
  return config;
}

function operations(c: Checker, raw: unknown): MonthlyReport["operations"] {
  const ops = c.record(raw, "operations") ?? {};
  const deployments = c.record(ops.deployments, "operations.deployments") ?? {};
  const errors = c.record(ops.runtimeErrors, "operations.runtimeErrors") ?? {};
  const parsed = {
    deployments: {
      succeeded: c.count(deployments.succeeded, "operations.deployments.succeeded"),
      total: c.count(deployments.total, "operations.deployments.total"),
    },
    runtimeErrors: {
      count: c.count(errors.count, "operations.runtimeErrors.count"),
      days: c.count(errors.days, "operations.runtimeErrors.days"),
    },
  };
  if (parsed.deployments.succeeded > parsed.deployments.total) {
    c.fail("operations.deployments", "has more successful deployments than deployments");
  }
  if (parsed.runtimeErrors.days < 1) c.fail("operations.runtimeErrors.days", "must be at least 1");
  return parsed;
}

/** Validates a months/YYYY-MM.json file against the config. Throws ReportValidationError listing every problem. */
export function parseMonth(input: unknown, config: ReportConfig, source = "month file"): MonthlyReport {
  const c = new Checker();
  const root = c.record(input, "month") ?? {};

  const period = c.text(root.period, "period", 7);
  const periodStart = period ? parsePeriod(period) : undefined;
  if (period && !periodStart) c.fail("period", `must be a month written as YYYY-MM (got "${period}")`);

  const issued = c.date(root.issued, "issued");
  const nextReport = c.date(root.nextReport, "nextReport");
  const issuedDate = parseIsoDate(issued);
  const nextDate = parseIsoDate(nextReport);
  if (issuedDate && periodStart && issuedDate < periodStart) {
    c.fail("issued", `must not be before the reporting month ${period}`);
  }
  if (issuedDate && nextDate && nextDate <= issuedDate) {
    c.fail("nextReport", `must be after the issue date ${issued}`);
  }

  const headline = c.text(root.headline, "headline", LIMITS.headline);
  const headlineEmphasis = c.text(root.headlineEmphasis, "headlineEmphasis", LIMITS.headlineEmphasis);
  if (headline && headlineEmphasis && !headline.includes(headlineEmphasis)) {
    c.fail("headlineEmphasis", `"${headlineEmphasis}" does not appear in the headline`);
  }

  const figures = c.array(root.figures, "figures") ?? [];
  if (figures.length !== FIGURE_COUNT) {
    c.fail("figures", `must have exactly ${FIGURE_COUNT} entries; the panel and its shadow are sized for ${FIGURE_COUNT} (found ${figures.length})`);
  }

  const improvements = c.array(root.improvements, "improvements") ?? [];
  if (improvements.length < 1 || improvements.length > MAX_IMPROVEMENTS) {
    c.fail("improvements", `must have 1 to ${MAX_IMPROVEMENTS} entries to fit the page (found ${improvements.length})`);
  }
  const areaNames = config.careAreas.map((area) => area.name);

  const month: MonthlyReport = {
    period,
    issued,
    nextReport,
    headline,
    headlineEmphasis,
    summary: c.text(root.summary, "summary", LIMITS.summary),
    figures: figures.map((raw, i) => {
      const figure = c.record(raw, `figures[${i}]`) ?? {};
      const lines = c.array(figure.label, `figures[${i}].label`) ?? [];
      if (lines.length < 1 || lines.length > 2) {
        c.fail(`figures[${i}].label`, `must be 1 or 2 lines (found ${lines.length})`);
      }
      const parsed: Figure = {
        value: c.text(figure.value, `figures[${i}].value`, LIMITS.figureValue),
        label: lines.map((line, j) => c.text(line, `figures[${i}].label[${j}]`, LIMITS.figureLabelLine)),
      };
      if (figure.unit !== undefined) parsed.unit = c.text(figure.unit, `figures[${i}].unit`, LIMITS.figureUnit);
      return parsed;
    }),
    improvementsNote: c.text(root.improvementsNote, "improvementsNote", LIMITS.improvementsNote),
    improvements: improvements.map((raw, i) => {
      const item = c.record(raw, `improvements[${i}]`) ?? {};
      const area = c.text(item.area, `improvements[${i}].area`, LIMITS.improvementArea);
      if (area && !areaNames.includes(area)) {
        c.fail(`improvements[${i}].area`, `"${area}" is not a care area; use one of: ${areaNames.join(", ")}`);
      }
      return {
        area,
        title: c.text(item.title, `improvements[${i}].title`, LIMITS.improvementTitle),
        body: c.text(item.body, `improvements[${i}].body`, LIMITS.improvementBody),
      };
    }),
    operations: operations(c, root.operations),
    attention: (c.array(root.attention ?? [], "attention") ?? []).map((raw, i) => {
      const item = c.record(raw, `attention[${i}]`) ?? {};
      return {
        title: c.text(item.title, `attention[${i}].title`, LIMITS.attentionTitle),
        detail: c.text(item.detail, `attention[${i}].detail`, LIMITS.attentionDetail),
      };
    }),
    nextMonth: (c.array(root.nextMonth, "nextMonth") ?? []).map((line, i) =>
      c.text(line, `nextMonth[${i}]`, LIMITS.nextMonthItem),
    ),
  };
  if (month.attention.length > MAX_ATTENTION) {
    c.fail("attention", `must have at most ${MAX_ATTENTION} items to fit the box (found ${month.attention.length})`);
  }
  if (month.nextMonth.length < 1 || month.nextMonth.length > MAX_NEXT_MONTH) {
    c.fail("nextMonth", `must have 1 to ${MAX_NEXT_MONTH} items (found ${month.nextMonth.length})`);
  }
  if (root.heroImage !== undefined) month.heroImage = c.asset(root.heroImage, "heroImage");

  c.throwIfAny(source);
  return month;
}

/** Validates months/YYYY-MM.search.json, the file fetch-search.ts writes. */
export function parseSearch(input: unknown, period: string, source = "search file"): SearchReport {
  const c = new Checker();
  const root = c.record(input, "search") ?? {};
  const totals = (raw: unknown, path: string): Omit<Totals, "position"> => {
    const t = c.record(raw, path) ?? {};
    const parsed = { clicks: c.count(t.clicks, `${path}.clicks`), impressions: c.count(t.impressions, `${path}.impressions`) };
    if (parsed.clicks > parsed.impressions) c.fail(path, "has more clicks than impressions");
    return parsed;
  };
  const ranked = (raw: unknown, path: string): unknown[] => {
    const list = c.array(raw, path) ?? [];
    if (list.length > MAX_TABLE_ROWS) c.fail(path, `must have at most ${MAX_TABLE_ROWS} entries (found ${list.length})`);
    return list;
  };

  const performance = (raw: unknown): SearchPerformance | null => {
    if (raw === null) return null;
    const perf = c.record(raw, "performance") ?? {};
    const throughDate = c.date(perf.throughDate, "performance.throughDate");
    if (throughDate && period && !throughDate.startsWith(period)) {
      c.fail("performance.throughDate", `must fall in ${period}`);
    }
    const position = (value: unknown, path: string): number => {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        c.fail(path, `must be an average position of 0 or more (got ${JSON.stringify(value)})`);
        return 0;
      }
      return value;
    };
    const stats = (item: Json, path: string) => ({
      clicks: c.count(item.clicks, `${path}.clicks`),
      impressions: c.count(item.impressions, `${path}.impressions`),
    });
    return {
      throughDate,
      totals: { ...totals(perf.totals, "performance.totals"), position: position((c.record(perf.totals, "performance.totals") ?? {}).position, "performance.totals.position") },
      previousTotals:
        perf.previousTotals === null
          ? null
          : {
              ...totals(perf.previousTotals, "performance.previousTotals"),
              position: position((c.record(perf.previousTotals, "performance.previousTotals") ?? {}).position, "performance.previousTotals.position"),
            },
      daily: (c.array(perf.daily, "performance.daily") ?? []).map((raw, i) => {
        const day = c.record(raw, `performance.daily[${i}]`) ?? {};
        return { date: c.date(day.date, `performance.daily[${i}].date`), ...stats(day, `performance.daily[${i}]`) };
      }),
      queries: ranked(perf.queries, "performance.queries").map((raw, i) => {
        const q = c.record(raw, `performance.queries[${i}]`) ?? {};
        return {
          query: c.text(q.query, `performance.queries[${i}].query`, 200),
          ...stats(q, `performance.queries[${i}]`),
          position: position(q.position, `performance.queries[${i}].position`),
        };
      }),
      pages: ranked(perf.pages, "performance.pages").map((raw, i) => {
        const p = c.record(raw, `performance.pages[${i}]`) ?? {};
        const path = c.text(p.path, `performance.pages[${i}].path`, 200);
        if (path && !path.startsWith("/")) c.fail(`performance.pages[${i}].path`, "must start with /");
        return { path, ...stats(p, `performance.pages[${i}]`), position: position(p.position, `performance.pages[${i}].position`) };
      }),
      devices: (c.array(perf.devices, "performance.devices") ?? []).map((raw, i) => {
        const d = c.record(raw, `performance.devices[${i}]`) ?? {};
        return { device: c.text(d.device, `performance.devices[${i}].device`, 30), ...stats(d, `performance.devices[${i}]`) };
      }),
    };
  };
  const indexing = (raw: unknown): Indexing => {
    const idx = c.record(raw, "indexing") ?? {};
    const notIndexed = c.array(idx.notIndexed, "indexing.notIndexed") ?? [];
    const parsed: Indexing = {
      checkedAt: c.text(idx.checkedAt, "indexing.checkedAt", 40),
      pagesChecked: c.count(idx.pagesChecked, "indexing.pagesChecked"),
      pagesIndexed: c.count(idx.pagesIndexed, "indexing.pagesIndexed"),
      notIndexed: notIndexed.map((path, i) => c.text(path, `indexing.notIndexed[${i}]`, 200)),
    };
    if (parsed.pagesChecked === 0) c.fail("indexing.pagesChecked", "must be at least 1");
    if (parsed.pagesIndexed + parsed.notIndexed.length !== parsed.pagesChecked) {
      c.fail("indexing", "pagesIndexed plus notIndexed must equal pagesChecked");
    }
    return parsed;
  };

  const report: SearchReport = {
    source: c.text(root.source, "source", LIMITS.short),
    property: c.text(root.property, "property", LIMITS.short),
    period: c.text(root.period, "period", 7),
    fetchedAt: c.text(root.fetchedAt, "fetchedAt", 40),
    performance: performance(root.performance),
    indexing: indexing(root.indexing),
  };
  if (report.period && report.period !== period) {
    c.fail("period", `is "${report.period}" but this is the ${period} report; fetch the search data again`);
  }
  if (report.fetchedAt && Number.isNaN(Date.parse(report.fetchedAt))) c.fail("fetchedAt", "must be a date and time");
  if (report.indexing.checkedAt && Number.isNaN(Date.parse(report.indexing.checkedAt))) {
    c.fail("indexing.checkedAt", "must be a date and time");
  }

  c.throwIfAny(source);
  return report;
}

function visitorDetail(c: Checker, raw: unknown): VisitorDetail {
  const d = c.record(raw, "detail") ?? {};
  const list = (value: unknown, path: string): Ranked[] =>
    (c.array(value, path) ?? []).map((item, i) => {
      const r = c.record(item, `${path}[${i}]`) ?? {};
      return { name: c.text(r.name, `${path}[${i}].name`, 100), visits: c.count(r.visits, `${path}[${i}].visits`) };
    });
  const rate = d.engagementRate;
  if (typeof rate !== "number" || rate < 0 || rate > 1) c.fail("detail.engagementRate", "must be between 0 and 1");
  return {
    pageViews: c.count(d.pageViews, "detail.pageViews"),
    engagementRate: typeof rate === "number" ? rate : 0,
    averageVisitSeconds: c.count(d.averageVisitSeconds, "detail.averageVisitSeconds"),
    channels: list(d.channels, "detail.channels"),
    landingPages: list(d.landingPages, "detail.landingPages"),
    devices: list(d.devices, "detail.devices"),
    countries: list(d.countries, "detail.countries"),
    daily: (c.array(d.daily, "detail.daily") ?? []).map((item, i) => {
      const day = c.record(item, `detail.daily[${i}]`) ?? {};
      return { date: c.date(day.date, `detail.daily[${i}].date`), visits: c.count(day.visits, `detail.daily[${i}].visits`) };
    }),
  };
}

/** Validates months/YYYY-MM.health.json, the file fetch-health.ts writes. */
export function parseHealth(input: unknown, source = "health file"): HealthReport {
  const c = new Checker();
  const root = c.record(input, "health") ?? {};
  const tls = c.record(root.tls, "tls") ?? {};
  const domain = c.record(root.domain, "domain") ?? {};
  const pages = c.record(root.pages, "pages") ?? {};
  const headers = c.record(root.headers, "headers") ?? {};
  const audit = c.record(root.audit, "audit") ?? {};
  const versions = c.record(root.versions, "versions") ?? {};
  const slowest = pages.slowest === null ? null : c.record(pages.slowest, "pages.slowest");
  const names = (value: unknown, path: string): string[] =>
    (c.array(value, path) ?? []).map((name, i) => c.text(name, `${path}[${i}]`, 60));
  const report: HealthReport = {
    checkedAt: c.text(root.checkedAt, "checkedAt", 40),
    site: c.text(root.site, "site", 100),
    tls: { validTo: c.date(tls.validTo, "tls.validTo"), issuer: c.text(tls.issuer, "tls.issuer", 100) },
    domain: {
      name: c.text(domain.name, "domain.name", 100),
      expires: c.date(domain.expires, "domain.expires"),
      registrar: c.text(domain.registrar, "domain.registrar", 100),
    },
    pages: {
      checked: c.count(pages.checked, "pages.checked"),
      ok: c.count(pages.ok, "pages.ok"),
      averageMs: c.count(pages.averageMs, "pages.averageMs"),
      slowest: slowest ? { path: c.text(slowest.path, "pages.slowest.path", 200), ms: c.count(slowest.ms, "pages.slowest.ms") } : null,
      failing: (c.array(pages.failing, "pages.failing") ?? []).map((raw, i) => {
        const f = c.record(raw, `pages.failing[${i}]`) ?? {};
        return { path: c.text(f.path, `pages.failing[${i}].path`, 200), status: c.count(f.status, `pages.failing[${i}].status`) };
      }),
    },
    headers: { present: names(headers.present, "headers.present"), missing: names(headers.missing, "headers.missing") },
    audit: {
      critical: c.count(audit.critical, "audit.critical"),
      high: c.count(audit.high, "audit.high"),
      moderate: c.count(audit.moderate, "audit.moderate"),
      low: c.count(audit.low, "audit.low"),
    },
    versions: { next: c.text(versions.next, "versions.next", 20), react: c.text(versions.react, "versions.react", 20) },
  };
  if (report.checkedAt && Number.isNaN(Date.parse(report.checkedAt))) c.fail("checkedAt", "must be a date and time");
  c.throwIfAny(source);
  return report;
}

/** Validates months/YYYY-MM.analytics.json, the file fetch-analytics.ts writes. */
export function parseAnalytics(input: unknown, period: string, source = "analytics file"): AnalyticsReport {
  const c = new Checker();
  const root = c.record(input, "analytics") ?? {};
  const figures = (raw: unknown, path: string): VisitorFigures => {
    const f = c.record(raw, path) ?? {};
    const parsed = {
      visitors: c.count(f.visitors, `${path}.visitors`),
      visits: c.count(f.visits, `${path}.visits`),
      searchVisits: c.count(f.searchVisits, `${path}.searchVisits`),
    };
    if (parsed.searchVisits > parsed.visits) c.fail(path, "has more search visits than visits");
    return parsed;
  };
  const report: AnalyticsReport = {
    source: c.text(root.source, "source", LIMITS.short),
    propertyId: c.text(root.propertyId, "propertyId", 20),
    period: c.text(root.period, "period", 7),
    fetchedAt: c.text(root.fetchedAt, "fetchedAt", 40),
    startDate: c.date(root.startDate, "startDate"),
    throughDate: c.date(root.throughDate, "throughDate"),
    trackingStarted: root.trackingStarted === null ? null : c.date(root.trackingStarted, "trackingStarted"),
    current: figures(root.current, "current"),
    previous: root.previous === null ? null : figures(root.previous, "previous"),
    detail: visitorDetail(c, root.detail),
  };
  if (report.period && report.period !== period) {
    c.fail("period", `is "${report.period}" but this is the ${period} report; fetch the analytics data again`);
  }
  if (report.startDate && report.throughDate && report.throughDate < report.startDate) {
    c.fail("throughDate", "is before startDate");
  }
  if (report.period && report.startDate && !report.startDate.startsWith(report.period)) {
    c.fail("startDate", `must fall in ${report.period}`);
  }
  if (report.period && report.throughDate && !report.throughDate.startsWith(report.period)) {
    c.fail("throughDate", `must fall in ${report.period}`);
  }
  c.throwIfAny(source);
  return report;
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-08-28" becomes "28 August 2026". Expects a date already checked by parseMonth. */
export function formatDate(iso: string): string {
  const date = parseIsoDate(iso);
  if (!date) throw new RangeError(`formatDate expects YYYY-MM-DD, got "${iso}"`);
  return `${date.getUTCDate()} ${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** "2026-08" becomes { label: "August 2026", monthName: "August" }. */
export function formatPeriod(period: string): { label: string; monthName: string } {
  const start = parsePeriod(period);
  if (!start) throw new RangeError(`formatPeriod expects YYYY-MM, got "${period}"`);
  const monthName = MONTH_NAMES[start.getUTCMonth()];
  return { label: `${monthName} ${start.getUTCFullYear()}`, monthName };
}

/** "GKR-Hospitality-Website-Care-Report-August-2026" */
export function reportFileStem(config: ReportConfig, month: MonthlyReport): string {
  const slug = (text: string): string =>
    text.replace(/&/g, "and").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${slug(config.client.name)}-Website-Care-Report-${slug(formatPeriod(month.period).label)}`;
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

function renderHeadline(month: MonthlyReport): string {
  const at = month.headline.indexOf(month.headlineEmphasis);
  const before = month.headline.slice(0, at);
  const after = month.headline.slice(at + month.headlineEmphasis.length);
  return `${escapeHtml(before)}<em>${escapeHtml(month.headlineEmphasis)}</em>${escapeHtml(after)}`;
}

function renderFigures(figures: Figure[]): string {
  return figures
    .map((figure) => {
      const unit = figure.unit ? `<small>${escapeHtml(figure.unit)}</small>` : "";
      const label = figure.label.map(escapeHtml).join("<br>");
      return [
        '      <div class="figure">',
        `        <div class="figure__value">${escapeHtml(figure.value)}${unit}</div>`,
        `        <div class="figure__label">${label}</div>`,
        "      </div>",
      ].join("\n");
    })
    .join("\n");
}

function renderImprovements(improvements: Improvement[]): string {
  return improvements
    .map((item) =>
      [
        '        <li class="change">',
        `          <div class="change__area">${escapeHtml(item.area)}</div>`,
        `          <h3>${escapeHtml(item.title)}</h3>`,
        `          <p>${escapeHtml(item.body)}</p>`,
        "        </li>",
      ].join("\n"),
    )
    .join("\n");
}

/** "Uptime checks" becomes "uptime checks" mid-sentence; "SSL, domain & DNS checks" keeps its capitals. */
function lowerFirstWord(text: string): string {
  return /^[A-Z][a-z]/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

function renderCareAreas(areas: CareArea[]): string {
  return areas
    .map((area) => {
      const sentence = area.checks.map((check, i) => (i === 0 ? check : lowerFirstWord(check))).join(", ");
      return [
        '        <li class="area">',
        `          <h3>${escapeHtml(area.name)}</h3>`,
        `          <p>${escapeHtml(sentence)}</p>`,
        "        </li>",
      ].join("\n");
    })
    .join("\n");
}

const numberFormat = new Intl.NumberFormat("en-US");
const compactFormat = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/**
 * Big numbers for the stat row. Each stat column is about 100px wide, which
 * holds six digits with separators; from 100,000 up the short form is used
 * ("128.5K", "1.3M") so a value can never spill into the next column.
 */
export function formatStatNumber(value: number): string {
  return value < 100_000 ? numberFormat.format(value) : compactFormat.format(value);
}

/** Plain-language change against the previous month, like "Up 18% on July". */
export function describeChange(
  current: number,
  previous: number | null,
  previousMonthName: string,
): { text: string; direction: "up" | "down" | "level" | "none" } {
  if (previous === null) return { text: `No ${previousMonthName} data to compare`, direction: "none" };
  if (previous === 0) {
    return current === 0
      ? { text: `Level with ${previousMonthName}`, direction: "level" }
      : { text: `Up from 0 in ${previousMonthName}`, direction: "up" };
  }
  const percent = Math.round(((current - previous) / previous) * 100);
  if (percent > 0) return { text: `Up ${numberFormat.format(percent)}% on ${previousMonthName}`, direction: "up" };
  if (percent < 0) return { text: `Down ${numberFormat.format(-percent)}% on ${previousMonthName}`, direction: "down" };
  return { text: `Level with ${previousMonthName}`, direction: "level" };
}

function renderChange(current: number, previous: number | null, previousMonthName: string): string {
  const change = describeChange(current, previous, previousMonthName);
  const modifier = change.direction === "up" ? " stat__change--up" : "";
  return `<div class="stat__change${modifier}">${escapeHtml(change.text)}</div>`;
}

/** Readable page name from config, falling back to the path itself. */
export function pageName(path: string, pageNames: Record<string, string>): string {
  return pageNames[path] ?? path;
}

/** "2026-09-02" to "2026-09-28" becomes "2 to 28 September". Both dates are in the same month. */
function describeRange(startDate: string, endDate: string): string {
  const start = formatDate(startDate).split(" ");
  const end = formatDate(endDate).split(" ");
  return `${start[0]} to ${end[0]} ${end[1]}`;
}

/** Where the page 1 numbers come from, and the days they cover. */
function describeSources(analytics: AnalyticsReport, search: SearchReport, period: string): string {
  const month = monthRange(period);
  const analyticsRange = describeRange(analytics.startDate, analytics.throughDate);
  if (!search.performance) return `Google Analytics, ${analyticsRange}.`;
  const searchRange = describeRange(month.startDate, search.performance.throughDate);
  return analyticsRange === searchRange
    ? `Google Analytics and Google Search, ${searchRange}.`
    : `Google Analytics, ${analyticsRange}. Google Search, ${searchRange}.`;
}

function renderStat(value: number, label: string, change: string): string {
  return [
    '        <div class="stat">',
    `          <div class="stat__value">${formatStatNumber(value)}</div>`,
    `          <div class="stat__label">${escapeHtml(label)}</div>`,
    `          ${change}`,
    "        </div>",
  ].join("\n");
}

/** "10 of 10 pages indexed by Google." */
export function describeIndexing(indexing: Indexing): string {
  const all = indexing.pagesIndexed === indexing.pagesChecked;
  return all
    ? `All ${indexing.pagesChecked} pages indexed by Google.`
    : `${indexing.pagesIndexed} of ${indexing.pagesChecked} pages indexed by Google.`;
}

const PENDING_SEARCH = (monthName: string): string =>
  `Search Console has not released ${monthName}'s impressions and clicks yet. They will be added once Google does.`;

/* ---------- Page 1 ---------- */

/** Visitors, search visits, impressions and clicks, with the change against last month. */
function renderGlance(search: SearchReport, analytics: AnalyticsReport, monthName: string, previousMonthName: string): string {
  const visitors = analytics.current;
  const before = analytics.previous;
  const visitorChange = (current: number, previous: number | null): string =>
    previous === null && analytics.trackingStarted
      ? `<div class="stat__change">${escapeHtml(`Tracking began ${formatDate(analytics.trackingStarted).split(" ").slice(0, 2).join(" ")}`)}</div>`
      : renderChange(current, previous, previousMonthName);
  // With no month to compare against, search visits show their share of all visits instead.
  const searchShare = visitors.visits > 0 ? Math.round((visitors.searchVisits / visitors.visits) * 100) : 0;
  const stats = [
    renderStat(visitors.visitors, "Visitors", visitorChange(visitors.visitors, before ? before.visitors : null)),
    renderStat(
      visitors.searchVisits,
      "Search visits",
      before
        ? renderChange(visitors.searchVisits, before.searchVisits, previousMonthName)
        : `<div class="stat__change">${escapeHtml(`${searchShare}% of all visits`)}</div>`,
    ),
  ];
  const perf = search.performance;
  if (perf) {
    const previous = perf.previousTotals;
    // With no month to compare against, show what the month itself says instead of "no data" twice.
    const note = (text: string): string => `<div class="stat__change">${escapeHtml(text)}</div>`;
    const clickRate = perf.totals.impressions > 0 ? Math.round((perf.totals.clicks / perf.totals.impressions) * 100) : 0;
    stats.push(
      renderStat(
        perf.totals.impressions,
        "Impressions",
        previous
          ? renderChange(perf.totals.impressions, previous.impressions, previousMonthName)
          : note(`Average position ${perf.totals.position.toFixed(1)}`),
      ),
      renderStat(
        perf.totals.clicks,
        "Clicks",
        previous ? renderChange(perf.totals.clicks, previous.clicks, previousMonthName) : note(`${clickRate}% of impressions`),
      ),
    );
  } else {
    stats.push(`        <p class="search__pending">${escapeHtml(PENDING_SEARCH(monthName))}</p>`);
  }
  const days = fillDays(
    analytics.detail.daily.map((d) => ({ date: d.date, value: d.visits })),
    analytics.startDate,
    analytics.throughDate,
  );
  return [
    ...stats,
    '        <figure class="glance__chart">',
    "          <figcaption>Visits per day</figcaption>",
    `          ${dailyColumns(days, { width: 508, height: 62, title: "Visits per day" })}`,
    "        </figure>",
  ].join("\n");
}

/** The client's action list: health-check findings first, then anything added by hand. Empty when there is nothing. */
function renderAttention(items: AttentionItem[]): string {
  if (items.length === 0) return "";
  const rows = items.map(
    // The title runs into the detail, so it ends with a full stop unless it already has one.
    (item) => `        <li><strong>${escapeHtml(/[.!?]$/.test(item.title) ? item.title : `${item.title}.`)}</strong> ${escapeHtml(item.detail)}</li>`,
  );
  return [
    '    <aside class="attention" aria-labelledby="attention-title">',
    '      <h2 id="attention-title">Needs your attention</h2>',
    "      <ul>",
    ...rows,
    "      </ul>",
    "    </aside>",
  ].join("\n");
}

/* ---------- Page 2 ---------- */

const percentFormat = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 0 });

function facts(items: [label: string, value: string][]): string {
  return [
    '        <dl class="facts">',
    ...items.map(([label, value]) => `          <div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`),
    "        </dl>",
  ].join("\n");
}

/**
 * Shortens long table names from the middle, so queries that share a start
 * ("hospitality consulting firm ny", "hospitality consulting new york") stay
 * distinguishable. The column holds about 20 characters.
 */
export function middleEllipsis(text: string, max = 20): string {
  if (text.length <= max) return text;
  const tail = Math.floor((max - 1) / 2);
  const head = max - 1 - tail;
  return `${text.slice(0, head).trimEnd()}\u2026${text.slice(text.length - tail).trimStart()}`;
}

function detailTable(
  caption: string,
  firstColumn: string,
  rows: { name: string; impressions: number; clicks: number; position: number }[],
): string {
  const body = rows.map(
    (row) =>
      `            <tr><td class="dtable__name">${escapeHtml(middleEllipsis(row.name))}</td><td>${numberFormat.format(row.impressions)}</td><td>${numberFormat.format(row.clicks)}</td><td>${row.position.toFixed(1)}</td></tr>`,
  );
  return [
    '        <table class="dtable">',
    `          <caption>${escapeHtml(caption)}</caption>`,
    `          <thead><tr><th scope="col">${escapeHtml(firstColumn)}</th><th scope="col">Shown</th><th scope="col">Clicks</th><th scope="col">Position</th></tr></thead>`,
    "          <tbody>",
    ...body,
    "          </tbody>",
    "        </table>",
  ].join("\n");
}

function renderSearchDetail(search: SearchReport, config: ReportConfig, period: string, monthName: string): string {
  const perf = search.performance;
  const rail = (sourceLine: string, extra: string): string =>
    [
      '      <div class="section__title">',
      '        <h2 id="search-detail-title">Search in detail</h2>',
      `        <p>${escapeHtml(sourceLine)}</p>`,
      extra,
      "      </div>",
    ].join("\n");
  if (!perf) {
    return [
      rail(describeIndexing(search.indexing), ""),
      '      <div class="detail__body">',
      `        <p class="search__pending">${escapeHtml(PENDING_SEARCH(monthName))}</p>`,
      "      </div>",
    ].join("\n");
  }
  const range = monthRange(period);
  const ctr = perf.totals.impressions > 0 ? perf.totals.clicks / perf.totals.impressions : 0;
  const railFacts = facts([
    ["Click rate", percentFormat.format(ctr)],
    ["Average position", perf.totals.position.toFixed(1)],
    ...perf.devices.slice(0, 2).map((d): [string, string] => [`Shown on ${d.device.toLowerCase()}`, numberFormat.format(d.impressions)]),
  ]);
  const key = '        <p class="detail__key">Shown: impressions, the times the site appeared in Google results. Position: its average place in them, 1 being the top.</p>';
  const days = (value: (d: DayStats) => number) =>
    fillDays(perf.daily.map((d) => ({ date: d.date, value: value(d) })), range.startDate, perf.throughDate);
  const listedClicks = perf.queries.reduce((sum, q) => sum + q.clicks, 0);
  const coverage =
    perf.queries.length > 0 && listedClicks < perf.totals.clicks
      ? `        <p class="detail__note">${escapeHtml(`Google keeps rare searches private, so the searches listed cover ${numberFormat.format(listedClicks)} of ${numberFormat.format(perf.totals.clicks)} clicks.`)}</p>`
      : "";
  return [
    rail(`Google Search, ${describeRange(range.startDate, perf.throughDate)}.`, `${railFacts}\n${key}`),
    '      <div class="detail__body">',
    '        <div class="detail__charts">',
    "          <figure><figcaption>Times shown per day</figcaption>",
    `            ${dailyColumns(days((d) => d.impressions), { width: 238, height: 56, title: "Times shown in Google per day" })}`,
    "          </figure>",
    "          <figure><figcaption>Clicks per day</figcaption>",
    `            ${dailyColumns(days((d) => d.clicks), { width: 238, height: 56, title: "Clicks from Google per day" })}`,
    "          </figure>",
    "        </div>",
    '        <div class="detail__tables">',
    detailTable("What people searched", "Search", perf.queries.map((q) => ({ name: q.query, ...q }))),
    detailTable(
      "Pages Google showed",
      "Page",
      perf.pages.map((p) => ({ name: pageName(p.path, config.searchConsole.pageNames), ...p })),
    ),
    "        </div>",
    coverage,
    "      </div>",
  ].join("\n");
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}m ${String(rest).padStart(2, "0")}s` : `${rest}s`;
}

/**
 * Devices and the top country as one sentence: two or three shares read
 * better as words than as a chart, and take one line instead of two lists.
 */
function audienceNote(d: VisitorDetail, totalVisits: number): string {
  // Capped at 100%: GA4's per-device session counts can add up to slightly more than the month's total.
  const share = (part: number): string => percentFormat.format(totalVisits > 0 ? Math.min(1, part / totalVisits) : 0);
  const devices = d.devices
    .filter((item) => item.name !== "Other")
    .slice(0, 2)
    .map((item) => `${share(item.visits)} on ${item.name.toLowerCase()}`);
  const country = d.countries.find((item) => item.name !== "Other");
  const parts = [
    devices.length ? `Visits were ${devices.join(" and ")}` : "",
    country ? `${share(country.visits)} came from ${country.name === "United States" ? "the United States" : country.name}` : "",
  ].filter(Boolean);
  return parts.length ? `        <p class="detail__note detail__note--wide">${escapeHtml(`${parts.join(", and ")}.`)}</p>` : "";
}

function renderVisitorDetail(analytics: AnalyticsReport, config: ReportConfig): string {
  const d = analytics.detail;
  // Shares are of all visits. The country list holds only the top few, so summing it would overstate the leader.
  const totalVisits = analytics.current.visits;
  const block = (title: string, list: string): string =>
    ['          <div class="detail__block">', `            <h3>${escapeHtml(title)}</h3>`, `            ${list}`, "          </div>"].join("\n");
  const count = (n: number): string => numberFormat.format(n);
  return [
    '      <div class="section__title">',
    '        <h2 id="visitor-detail-title">Visitors in detail</h2>',
    `        <p>${escapeHtml(`Google Analytics, ${describeRange(analytics.startDate, analytics.throughDate)}.`)}</p>`,
    facts([
      ["Page views", count(d.pageViews)],
      ["Engaged visits", percentFormat.format(d.engagementRate)],
      ["Average visit", formatDuration(d.averageVisitSeconds)],
    ]),
    "      </div>",
    '      <div class="detail__body detail__grid">',
    block("Where visits came from", barList(d.channels.map((c) => ({ label: c.name, value: c.visits })), count)),
    block(
      "Pages visitors arrived on",
      barList(d.landingPages.map((p) => ({ label: pageName(p.name, config.searchConsole.pageNames), value: p.visits })), count),
    ),
    audienceNote(d, totalVisits),
    "      </div>",
  ].join("\n");
}

interface HealthTile {
  label: string;
  value: string;
  note: string;
  /** Needs a look: shown with a copper rule instead of navy. */
  flag: boolean;
}

function healthTiles(health: HealthReport, month: MonthlyReport, indexing: Indexing, now: Date): HealthTile[] {
  const daysUntil = (iso: string): number => Math.floor((Date.parse(`${iso}T00:00:00Z`) - now.getTime()) / 86_400_000);
  // "2026-12-05" becomes "5 Dec 2026", short enough for a quarter-width tile.
  const shortDay = (iso: string): string => {
    const [day, monthName, year] = formatDate(iso).split(" ");
    return `${day} ${monthName.slice(0, 3)} ${year}`;
  };
  const { deployments, runtimeErrors } = month.operations;
  const alerts = health.audit;
  const alertCount = alerts.critical + alerts.high + alerts.moderate + alerts.low;
  const worst = alerts.critical ? "critical" : alerts.high ? "high" : alerts.moderate ? "moderate" : alerts.low ? "low" : "";
  return [
    {
      label: "Security certificate",
      value: "Valid",
      note: `Until ${shortDay(health.tls.validTo)}`,
      flag: daysUntil(health.tls.validTo) <= 14,
    },
    {
      label: "Domain renews",
      value: shortDay(health.domain.expires),
      note: `With ${registrarName(health.domain.registrar)}`,
      flag: daysUntil(health.domain.expires) <= 90,
    },
    {
      label: "Pages responding",
      value: `${health.pages.ok} of ${health.pages.checked}`,
      note: health.pages.failing.length ? `Not loading: ${health.pages.failing.map((p) => p.path).join(", ")}` : "Every page checked",
      flag: health.pages.failing.length > 0,
    },
    {
      label: "Indexed by Google",
      value: `${indexing.pagesIndexed} of ${indexing.pagesChecked}`,
      note: indexing.notIndexed.length ? `Missing: ${indexing.notIndexed.join(", ")}` : "Every page checked",
      flag: indexing.notIndexed.length > 0,
    },
    {
      label: "Deployments",
      value: `${deployments.succeeded} of ${deployments.total}`,
      note: "Succeeded this month",
      flag: deployments.succeeded < deployments.total,
    },
    {
      label: "Site errors",
      value: numberFormat.format(runtimeErrors.count),
      note: `In the last ${runtimeErrors.days} days`,
      flag: runtimeErrors.count > 0,
    },
    {
      label: "Security headers",
      value: `${health.headers.present.length} of ${health.headers.present.length + health.headers.missing.length}`,
      note: health.headers.missing.length ? `To add: ${lowerFirstWord(health.headers.missing.join(", "))}` : "All in place",
      flag: false,
    },
    {
      label: "Security alerts in code",
      value: alertCount === 0 ? "None" : `${alertCount} ${worst}`,
      note: `Next.js ${health.versions.next}, React ${health.versions.react}`,
      flag: alerts.critical + alerts.high > 0,
    },
  ];
}

function renderHealthTiles(tiles: HealthTile[]): string {
  return tiles
    .map((tile) =>
      [
        `        <li class="tile${tile.flag ? " tile--flag" : ""}">`,
        `          <span class="tile__label">${escapeHtml(tile.label)}</span>`,
        `          <span class="tile__value">${escapeHtml(tile.value)}</span>`,
        `          <span class="tile__note">${escapeHtml(tile.note)}</span>`,
        "        </li>",
      ].join("\n"),
    )
    .join("\n");
}

function renderNextMonth(items: string[]): string {
  return items.map((item) => `        <li>${escapeHtml(item)}</li>`).join("\n");
}

/**
 * Fills {{token}} placeholders in template.html. Every token in the template
 * must have a value and every value must be used, so the template and this
 * function cannot silently drift apart.
 */
export function renderReport(
  template: string,
  config: ReportConfig,
  month: MonthlyReport,
  search: SearchReport,
  analytics: AnalyticsReport,
  health: HealthReport,
): string {
  const period = formatPeriod(month.period);
  const previousMonth = formatPeriod(previousPeriod(month.period)).monthName;
  const nextMonthName = formatPeriod(nextPeriod(month.period)).monthName;
  // Dates in the report are judged against when the site was checked, so a rebuild gives the same PDF.
  const checkedAt = new Date(health.checkedAt);
  const attention = [...attentionFromHealth(health, checkedAt), ...month.attention];
  const values: Record<string, string> = {
    pageTitle: escapeHtml(`${config.client.name}, Website Care Report, ${period.label}`),
    heroImage: escapeHtml(month.heroImage ?? config.client.heroImage),
    clientLogo: escapeHtml(config.client.logo),
    clientName: escapeHtml(config.client.name),
    clientDomain: escapeHtml(config.client.domain),
    issuedDate: escapeHtml(formatDate(month.issued)),
    periodLabel: escapeHtml(period.label),
    monthName: escapeHtml(period.monthName),
    nextMonthName: escapeHtml(nextMonthName),
    headline: renderHeadline(month),
    summary: escapeHtml(month.summary),
    figures: renderFigures(month.figures),
    improvementsNote: escapeHtml(month.improvementsNote),
    improvements: renderImprovements(month.improvements),
    dataSources: escapeHtml(describeSources(analytics, search, month.period)),
    searchIndexing: escapeHtml(describeIndexing(search.indexing)),
    glance: renderGlance(search, analytics, period.monthName, previousMonth),
    attention: renderAttention(attention),
    searchDetail: renderSearchDetail(search, config, month.period, period.monthName),
    visitorDetail: renderVisitorDetail(analytics, config),
    healthChecked: escapeHtml(`Checked ${formatDate(health.checkedAt.slice(0, 10))}.`),
    healthTiles: renderHealthTiles(healthTiles(health, month, search.indexing, checkedAt)),
    nextMonth: renderNextMonth(month.nextMonth),
    careAreas: renderCareAreas(config.careAreas),
    agencyWordmark: escapeHtml(config.agency.wordmark),
    agencyName: escapeHtml(config.agency.name),
    agencyDomain: escapeHtml(config.agency.domain),
    serviceName: escapeHtml(config.agency.serviceName),
  };

  const used: string[] = [];
  const html = template.replace(/\{\{(\w+)\}\}/g, (_match, token: string) => {
    if (!Object.prototype.hasOwnProperty.call(values, token)) {
      throw new Error(`template.html uses {{${token}}}, which renderReport does not provide`);
    }
    used.push(token);
    return values[token];
  });

  const unused = Object.keys(values).filter((token) => !used.includes(token));
  if (unused.length > 0) {
    throw new Error(`template.html no longer uses: ${unused.map((t) => `{{${t}}}`).join(", ")}`);
  }
  return html;
}

/* ------------------------------------------------------------------ */
/* Output helpers                                                      */
/* ------------------------------------------------------------------ */

const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  woff2: "font/woff2",
};

/**
 * Replaces every quoted "assets/<file>" reference with a base64 data URI, so
 * the rendered HTML is a single portable file. readBase64 receives the
 * relative path and returns the file contents as base64.
 */
export function inlineAssets(html: string, readBase64: (assetPath: string) => string): string {
  return html.replace(/"(assets\/[A-Za-z0-9._-]+)"/g, (_match, assetPath: string) => {
    const extension = assetPath.slice(assetPath.lastIndexOf(".") + 1).toLowerCase();
    const mime = MIME_TYPES[extension];
    if (!mime) {
      throw new Error(`Cannot inline ${assetPath}: .${extension} is not one of ${Object.keys(MIME_TYPES).join(", ")}`);
    }
    return `"data:${mime};base64,${readBase64(assetPath)}"`;
  });
}

/* ------------------------------------------------------------------ */
/* Layout probe                                                        */
/* ------------------------------------------------------------------ */

/*
 * The page is a fixed 8.5 x 11in box with overflow hidden, so copy that is too
 * long never makes a second PDF page: it is silently clipped, or slides under
 * the figures panel. Length limits in parseMonth catch the obvious cases; this
 * probe measures the real layout in Chrome before the PDF is printed.
 */

export interface LayoutMeasurements {
  /** How far content runs past the bottom of the page. 0 when it fits. */
  pageOverflowPx: number;
  /** How far content runs past the right edge, for example an unbroken long query. 0 when it fits. */
  horizontalOverflowPx: number;
  /** The page (1-based) with the worst overflow; 0 when every page fits. */
  overflowPage: number;
  headlineLines: number;
  /** Space between the summary's last line and the top of the figures panel. */
  summaryToFiguresGapPx: number;
  /** Space between the footer and the bottom edge of the page. */
  footerBottomGapPx: number;
}

const MAX_HEADLINE_LINES = 2;
const MIN_SUMMARY_GAP_PX = 12;
const PROBE_ID = "layout-probe";

/** Measures the rendered page once fonts are ready and appends the numbers as JSON. */
const LAYOUT_PROBE_SCRIPT = `
document.fonts.ready.then(function () {
  var q = function (selector) { return document.querySelector(selector); };
  var h1 = q(".verdict h1"), summary = q(".verdict__summary"), figures = q(".figures");
  var measurements = {
    pageOverflowPx: 0,
    horizontalOverflowPx: 0,
    overflowPage: 0,
    headlineLines: Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight)),
    summaryToFiguresGapPx: Math.round(figures.getBoundingClientRect().top - summary.getBoundingClientRect().bottom),
    footerBottomGapPx: Infinity
  };
  document.querySelectorAll(".page").forEach(function (page, i) {
    var down = Math.max(0, page.scrollHeight - page.clientHeight);
    var across = Math.max(0, page.scrollWidth - page.clientWidth);
    if (down + across > measurements.pageOverflowPx + measurements.horizontalOverflowPx) measurements.overflowPage = i + 1;
    measurements.pageOverflowPx = Math.max(measurements.pageOverflowPx, down);
    measurements.horizontalOverflowPx = Math.max(measurements.horizontalOverflowPx, across);
    var signoff = page.querySelector(".signoff");
    var gap = signoff ? Math.round(page.getBoundingClientRect().bottom - signoff.getBoundingClientRect().bottom) : -1;
    measurements.footerBottomGapPx = Math.min(measurements.footerBottomGapPx, gap);
  });
  var out = document.createElement("script");
  out.type = "application/json";
  out.id = "${PROBE_ID}";
  out.textContent = JSON.stringify(measurements);
  document.body.appendChild(out);
});`;

/** Returns the page with the layout probe script added just before </body>. */
export function withLayoutProbe(html: string): string {
  const at = html.lastIndexOf("</body>");
  if (at === -1) throw new Error("Cannot add the layout probe: the page has no </body> tag.");
  return `${html.slice(0, at)}<script>${LAYOUT_PROBE_SCRIPT}</script>${html.slice(at)}`;
}

/** Reads the probe's JSON out of the DOM that Chrome dumps after running the page. */
export function parseLayoutProbe(dom: string): LayoutMeasurements {
  const match = new RegExp(`<script type="application/json" id="${PROBE_ID}">([^<]*)</script>`).exec(dom);
  if (!match) {
    throw new Error("The layout probe did not report back. Chrome may have failed to load the page or its fonts.");
  }
  const raw = JSON.parse(match[1]) as Record<string, unknown>;
  const keys: (keyof LayoutMeasurements)[] = [
    "pageOverflowPx",
    "horizontalOverflowPx",
    "overflowPage",
    "headlineLines",
    "summaryToFiguresGapPx",
    "footerBottomGapPx",
  ];
  const measurements = {} as LayoutMeasurements;
  for (const key of keys) {
    const value = raw[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`The layout probe returned an invalid ${key}: ${JSON.stringify(value)}`);
    }
    measurements[key] = value;
  }
  return measurements;
}

/** Turns measurements into plain-language problems. An empty list means the page fits. */
export function layoutProblems(m: LayoutMeasurements): string[] {
  const problems: string[] = [];
  if (m.headlineLines > MAX_HEADLINE_LINES) {
    problems.push(`The headline runs to ${m.headlineLines} lines; it must fit on ${MAX_HEADLINE_LINES}. Shorten "headline".`);
  }
  if (m.summaryToFiguresGapPx < MIN_SUMMARY_GAP_PX) {
    problems.push(
      `The summary runs into the figures panel (gap ${m.summaryToFiguresGapPx}px, needs ${MIN_SUMMARY_GAP_PX}px). Shorten "summary" or "headline".`,
    );
  }
  const onPage = m.overflowPage > 0 ? ` on page ${m.overflowPage}` : "";
  if (m.pageOverflowPx > 0) {
    problems.push(
      m.overflowPage === 2
        ? `Content runs ${m.pageOverflowPx}px past the bottom of page 2. Shorten "nextMonth" or the care areas.`
        : `Content runs ${m.pageOverflowPx}px past the bottom${onPage}. Use fewer improvements, shorten their bodies, or shorten the attention items.`,
    );
  }
  if (m.horizontalOverflowPx > 0) {
    problems.push(`Content runs ${m.horizontalOverflowPx}px past the right edge${onPage}. Check template.html column sizing.`);
  }
  if (m.footerBottomGapPx < 0) {
    problems.push("A footer is cut off at the bottom of its page.");
  }
  return problems;
}

/** Counts page objects in a PDF read as a latin1 string. "/Type /Pages" (the page tree root) is not counted. */
export function countPdfPages(pdf: string): number {
  return (pdf.match(/\/Type\s*\/Page(?!s)\b/g) ?? []).length;
}
