/**
 * Google Search Console: dates, service-account auth and response shaping.
 *
 * No network access here. fetch-search.ts does the HTTP calls; everything in
 * this file is covered by search-console.test.ts.
 */
import { createSign } from "node:crypto";

export class SearchConsoleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchConsoleError";
  }
}

export interface ServiceAccountKey {
  clientEmail: string;
  privateKey: string;
}

export interface Totals {
  clicks: number;
  impressions: number;
}

export interface PageClicks {
  /** Path only, like "/services". Host and query string are dropped so www and non-www merge. */
  path: string;
  clicks: number;
}

export interface QueryClicks {
  query: string;
  clicks: number;
}

export const TOKEN_URL = "https://oauth2.googleapis.com/token";
const READONLY_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const TOKEN_LIFETIME_S = 3600;
/** Search Console data is final roughly two to three days after the day it describes. */
const FINAL_DATA_LAG_DAYS = 3;

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

const PERIOD = /^(\d{4})-(\d{2})$/;

function periodParts(period: string): { year: number; month: number } {
  const match = PERIOD.exec(period);
  const month = match ? Number(match[2]) : 0;
  if (!match || month < 1 || month > 12) {
    throw new SearchConsoleError(`Expected a month as YYYY-MM, got "${period}"`);
  }
  return { year: Number(match[1]), month };
}

const pad = (n: number): string => String(n).padStart(2, "0");

/** First and last day of the month, as Search Console expects them. */
export function monthRange(period: string): { startDate: string; endDate: string } {
  const { year, month } = periodParts(period);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { startDate: `${year}-${pad(month)}-01`, endDate: `${year}-${pad(month)}-${pad(lastDay)}` };
}

export function previousPeriod(period: string): string {
  const { year, month } = periodParts(period);
  return month === 1 ? `${year - 1}-12` : `${year}-${pad(month - 1)}`;
}

/** True once every day of the month has final Search Console data. */
export function isMonthComplete(period: string, now: Date): boolean {
  const { year, month } = periodParts(period);
  const finalFrom = Date.UTC(year, month, FINAL_DATA_LAG_DAYS); // day 0 of next month is the last day
  return now.getTime() >= finalFrom;
}

/* ------------------------------------------------------------------ */
/* Service account auth                                                */
/* ------------------------------------------------------------------ */

/** Validates the JSON key file downloaded from Google Cloud. */
export function parseServiceAccountKey(input: unknown): ServiceAccountKey {
  const hint =
    "Expected a service account key: the JSON file from Google Cloud > IAM & Admin > Service Accounts > Keys.";
  if (typeof input !== "object" || input === null) throw new SearchConsoleError(hint);
  const key = input as Record<string, unknown>;
  if (key.type !== "service_account") {
    throw new SearchConsoleError(`${hint} This file has "type": ${JSON.stringify(key.type)}.`);
  }
  if (typeof key.client_email !== "string" || typeof key.private_key !== "string") {
    throw new SearchConsoleError(`${hint} It is missing client_email or private_key.`);
  }
  return { clientEmail: key.client_email, privateKey: key.private_key };
}

const base64Url = (text: string): string => Buffer.from(text, "utf8").toString("base64url");

/** A signed JWT that Google exchanges for a read-only Search Console access token. */
export function createServiceAccountJwt(key: ServiceAccountKey, nowSeconds: number): string {
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(
    JSON.stringify({
      iss: key.clientEmail,
      scope: READONLY_SCOPE,
      aud: TOKEN_URL,
      iat: nowSeconds,
      exp: nowSeconds + TOKEN_LIFETIME_S,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  return `${header}.${claims}.${signer.sign(key.privateKey).toString("base64url")}`;
}

export function tokenRequestBody(jwt: string): string {
  return new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }).toString();
}


/* ------------------------------------------------------------------ */
/* Search Analytics responses                                          */
/* ------------------------------------------------------------------ */

export function searchAnalyticsEndpoint(property: string): string {
  return `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`;
}

interface Row {
  keys: string[];
  clicks: number;
  impressions: number;
}

function readRows(input: unknown): Row[] {
  const rows = Array.isArray(input)
    ? input
    : typeof input === "object" && input !== null
      ? ((input as { rows?: unknown }).rows ?? [])
      : input;
  if (!Array.isArray(rows)) throw new SearchConsoleError("Search Console returned rows in an unexpected format.");
  return rows.map((raw, i) => {
    const row = raw as Record<string, unknown>;
    const keys = row.keys ?? [];
    if (
      !Array.isArray(keys) ||
      !keys.every((k) => typeof k === "string") ||
      typeof row.clicks !== "number" ||
      (row.impressions !== undefined && typeof row.impressions !== "number")
    ) {
      throw new SearchConsoleError(`Search Console row ${i} is not in the expected format: ${JSON.stringify(raw)}`);
    }
    return { keys: keys as string[], clicks: row.clicks, impressions: (row.impressions as number | undefined) ?? 0 };
  });
}

/** Totals from a query with no dimensions. Null when Search Console has no data for the range. */
export function totalsFromResponse(response: unknown): Totals | null {
  const rows = readRows(response);
  if (rows.length === 0) return null;
  return { clicks: rows[0].clicks, impressions: rows[0].impressions };
}

const byClicksThenName = <T extends { clicks: number }>(name: (item: T) => string) =>
  (a: T, b: T): number => b.clicks - a.clicks || name(a).localeCompare(name(b));

function normalizePath(url: string): string {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    path = url.split(/[?#]/)[0];
  }
  return path.length > 1 ? path.replace(/\/+$/, "") : "/";
}

/** Pages ranked by clicks. URLs for the same path (www and non-www, with or without a trailing slash) are merged. */
export function topPagesFromRows(response: unknown, limit: number): PageClicks[] {
  const totals: Record<string, number> = {};
  for (const row of readRows(response)) {
    const path = normalizePath(row.keys[0] ?? "");
    totals[path] = (totals[path] ?? 0) + row.clicks;
  }
  return Object.keys(totals)
    .map((path) => ({ path, clicks: totals[path] }))
    .filter((page) => page.clicks > 0)
    .sort(byClicksThenName<PageClicks>((page) => page.path))
    .slice(0, limit);
}

/** Queries ranked by clicks. Search Console leaves out rare queries for privacy, so this list can be short. */
export function topQueriesFromRows(response: unknown, limit: number): QueryClicks[] {
  return readRows(response)
    .map((row) => ({ query: row.keys[0] ?? "", clicks: row.clicks }))
    .filter((item) => item.clicks > 0 && item.query !== "")
    .sort(byClicksThenName<QueryClicks>((item) => item.query))
    .slice(0, limit);
}
