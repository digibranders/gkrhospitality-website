/**
 * Monthly care report: data model, validation and HTML rendering.
 *
 * Pure functions only. File and Chrome access live in build.ts, so everything
 * here is covered by report.test.ts without touching the disk or a browser.
 */
import { monthRange, previousPeriod } from "./search-console.ts";
import type { Indexing, PageClicks, QueryClicks, Totals } from "./search-console.ts";

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
  careAreas: CareArea[];
}

/** Impressions, clicks and the ranked lists for one month. */
export interface SearchPerformance {
  totals: Totals;
  /** Null when Search Console has no data for the previous month. */
  previousTotals: Totals | null;
  topPages: PageClicks[];
  topQueries: QueryClicks[];
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
const MAX_RANKED = 5;
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
  };
  if (root.heroImage !== undefined) month.heroImage = c.asset(root.heroImage, "heroImage");

  c.throwIfAny(source);
  return month;
}

/** Validates months/YYYY-MM.search.json, the file fetch-search.ts writes. */
export function parseSearch(input: unknown, period: string, source = "search file"): SearchReport {
  const c = new Checker();
  const root = c.record(input, "search") ?? {};
  const totals = (raw: unknown, path: string): Totals => {
    const t = c.record(raw, path) ?? {};
    const parsed = { clicks: c.count(t.clicks, `${path}.clicks`), impressions: c.count(t.impressions, `${path}.impressions`) };
    if (parsed.clicks > parsed.impressions) c.fail(path, "has more clicks than impressions");
    return parsed;
  };
  const ranked = (raw: unknown, path: string): unknown[] => {
    const list = c.array(raw, path) ?? [];
    if (list.length > MAX_RANKED) c.fail(path, `must have at most ${MAX_RANKED} entries (found ${list.length})`);
    return list;
  };

  const performance = (raw: unknown): SearchPerformance | null => {
    if (raw === null) return null;
    const perf = c.record(raw, "performance") ?? {};
    return {
      totals: totals(perf.totals, "performance.totals"),
      previousTotals: perf.previousTotals === null ? null : totals(perf.previousTotals, "performance.previousTotals"),
      topPages: ranked(perf.topPages, "performance.topPages").map((item, i) => {
        const page = c.record(item, `performance.topPages[${i}]`) ?? {};
        const path = c.text(page.path, `performance.topPages[${i}].path`, 200);
        if (path && !path.startsWith("/")) c.fail(`performance.topPages[${i}].path`, "must start with /");
        return { path, clicks: c.count(page.clicks, `performance.topPages[${i}].clicks`) };
      }),
      topQueries: ranked(perf.topQueries, "performance.topQueries").map((item, i) => {
        const query = c.record(item, `performance.topQueries[${i}]`) ?? {};
        if (typeof query.query !== "string" || query.query.trim() === "") {
          c.fail(`performance.topQueries[${i}].query`, "must be text");
        }
        return {
          query: typeof query.query === "string" ? query.query : "",
          clicks: c.count(query.clicks, `performance.topQueries[${i}].clicks`),
        };
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

function renderRanking(rows: { name: string; clicks: number }[], emptyText: string): string {
  if (rows.length === 0) return `          <p class="ranking__empty">${escapeHtml(emptyText)}</p>`;
  const items = rows.map(
    (row) =>
      `            <li><span class="ranking__name">${escapeHtml(row.name)}</span><span class="ranking__clicks">${numberFormat.format(row.clicks)}</span></li>`,
  );
  return ["          <ol>", ...items, "          </ol>"].join("\n");
}

/** Readable page name from config, falling back to the path itself. */
export function pageName(path: string, pageNames: Record<string, string>): string {
  return pageNames[path] ?? path;
}

function renderStat(value: number, label: string, change: string): string {
  return [
    '        <div class="stat">',
    `          <div class="stat__value">${numberFormat.format(value)}</div>`,
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

/**
 * Impressions and clicks with the ranked lists, or a plain statement that
 * Google has not released the month yet. Never shows placeholder numbers.
 */
function renderSearchBody(
  search: SearchReport,
  config: ReportConfig,
  monthName: string,
  previousMonthName: string,
): string {
  const perf = search.performance;
  if (!perf) {
    return [
      '        <p class="search__pending">',
      `          ${escapeHtml(
        `Impressions, clicks, top pages and top queries for ${monthName} are not available yet. ` +
          "Google Search Console is still loading this property's data; they will be added to this report once Google releases them.",
      )}`,
      "        </p>",
    ].join("\n");
  }
  const previous = perf.previousTotals;
  return [
    renderStat(perf.totals.impressions, "Impressions", renderChange(perf.totals.impressions, previous ? previous.impressions : null, previousMonthName)),
    renderStat(perf.totals.clicks, "Clicks", renderChange(perf.totals.clicks, previous ? previous.clicks : null, previousMonthName)),
    '        <div class="ranking">',
    "          <h3>Pages with the most clicks</h3>",
    renderRanking(
      perf.topPages.map((page) => ({ name: pageName(page.path, config.searchConsole.pageNames), clicks: page.clicks })),
      `No page earned a click from search in ${monthName}.`,
    ),
    "        </div>",
    '        <div class="ranking">',
    "          <h3>Queries that brought clicks</h3>",
    renderRanking(
      perf.topQueries.map((item) => ({ name: item.query, clicks: item.clicks })),
      `No query brought a click in ${monthName}. Google hides rare queries for privacy.`,
    ),
    "        </div>",
  ].join("\n");
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
): string {
  const period = formatPeriod(month.period);
  const previousMonth = formatPeriod(previousPeriod(month.period)).monthName;
  const values: Record<string, string> = {
    pageTitle: escapeHtml(`${config.client.name}, Website Care Report, ${period.label}`),
    heroImage: escapeHtml(month.heroImage ?? config.client.heroImage),
    clientLogo: escapeHtml(config.client.logo),
    clientName: escapeHtml(config.client.name),
    clientDomain: escapeHtml(config.client.domain),
    issuedDate: escapeHtml(formatDate(month.issued)),
    periodLabel: escapeHtml(period.label),
    monthName: escapeHtml(period.monthName),
    headline: renderHeadline(month),
    summary: escapeHtml(month.summary),
    figures: renderFigures(month.figures),
    improvementsNote: escapeHtml(month.improvementsNote),
    improvements: renderImprovements(month.improvements),
    searchSource: escapeHtml(`Google Search, 1 to ${Number(monthRange(month.period).endDate.slice(8))} ${period.monthName}.`),
    searchIndexing: escapeHtml(describeIndexing(search.indexing)),
    searchBody: renderSearchBody(search, config, period.monthName, previousMonth),
    careAreas: renderCareAreas(config.careAreas),
    agencyWordmark: escapeHtml(config.agency.wordmark),
    agencyName: escapeHtml(config.agency.name),
    agencyDomain: escapeHtml(config.agency.domain),
    serviceName: escapeHtml(config.agency.serviceName),
    nextReportDate: escapeHtml(formatDate(month.nextReport)),
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
  var page = q(".page"), h1 = q(".verdict h1"), summary = q(".verdict__summary");
  var figures = q(".figures"), signoff = q(".signoff");
  var measurements = {
    pageOverflowPx: Math.max(0, page.scrollHeight - page.clientHeight),
    horizontalOverflowPx: Math.max(0, page.scrollWidth - page.clientWidth),
    headlineLines: Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight)),
    summaryToFiguresGapPx: Math.round(figures.getBoundingClientRect().top - summary.getBoundingClientRect().bottom),
    footerBottomGapPx: Math.round(page.getBoundingClientRect().bottom - signoff.getBoundingClientRect().bottom)
  };
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
  if (m.pageOverflowPx > 0) {
    problems.push(
      `Content runs ${m.pageOverflowPx}px past the bottom of the page. Shorten the improvement titles, bodies or "improvementsNote".`,
    );
  }
  if (m.horizontalOverflowPx > 0) {
    problems.push(`Content runs ${m.horizontalOverflowPx}px past the right edge of the page. Check template.html column sizing.`);
  }
  if (m.footerBottomGapPx < 0) {
    problems.push("The footer is cut off at the bottom of the page.");
  }
  return problems;
}

/** Counts page objects in a PDF read as a latin1 string. "/Type /Pages" (the page tree root) is not counted. */
export function countPdfPages(pdf: string): number {
  return (pdf.match(/\/Type\s*\/Page(?!s)\b/g) ?? []).length;
}
