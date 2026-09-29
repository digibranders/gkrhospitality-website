/**
 * Site health: readings for page 2 and the "Needs your attention" rules.
 * Pure functions, covered by health.test.ts; fetch-health.ts takes the readings.
 */

export class HealthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HealthError";
  }
}

export interface PageSummary {
  checked: number;
  ok: number;
  averageMs: number;
  slowest: { path: string; ms: number } | null;
  failing: { path: string; status: number }[];
}

export interface AuditCounts {
  critical: number;
  high: number;
  moderate: number;
  low: number;
}

/** Written by fetch-health.ts to months/YYYY-MM.health.json. */
export interface HealthReport {
  checkedAt: string;
  site: string;
  tls: { validTo: string; issuer: string };
  domain: { name: string; expires: string; registrar: string };
  pages: PageSummary;
  headers: { present: string[]; missing: string[] };
  /** From pnpm audit on the code, which may be ahead of what is live. */
  audit: AuditCounts;
  versions: { next: string; react: string };
}

export interface AttentionItem {
  title: string;
  detail: string;
}

/* Thresholds for the attention box. Vercel renews certificates itself, so only a near expiry is worth raising. */
const DOMAIN_WARNING_DAYS = 90;
const CERTIFICATE_WARNING_DAYS = 14;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function longDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

function daysUntil(iso: string, now: Date): number {
  return Math.floor((Date.parse(`${iso}T00:00:00Z`) - now.getTime()) / 86_400_000);
}

/** The expiry date and registrar from an RDAP domain record. */
export function rdapDomain(record: unknown, name: string): HealthReport["domain"] {
  const r = (record ?? {}) as { events?: { eventAction?: string; eventDate?: string }[]; entities?: unknown[] };
  const expiry = (r.events ?? []).find((event) => event.eventAction === "expiration")?.eventDate;
  if (!expiry || !/^\d{4}-\d{2}-\d{2}/.test(expiry)) {
    throw new HealthError(`The registry record for ${name} has no expiration date.`);
  }
  let registrar = "Unknown registrar";
  for (const entity of r.entities ?? []) {
    const e = entity as { roles?: string[]; vcardArray?: [string, [string, unknown, string, string][]] };
    if (!e.roles?.includes("registrar")) continue;
    const fn = e.vcardArray?.[1]?.find((field) => field[0] === "fn");
    if (fn && typeof fn[3] === "string") registrar = fn[3];
  }
  return { name, expires: expiry.slice(0, 10), registrar };
}

/** "Dec 19 14:48:53 2026 GMT", as Node reports a certificate's valid_to, to "2026-12-19". */
export function certificateDate(validTo: string): string {
  const time = Date.parse(validTo);
  if (Number.isNaN(time)) throw new HealthError(`Could not read the certificate expiry "${validTo}".`);
  return new Date(time).toISOString().slice(0, 10);
}

/** Security headers worth having on a marketing site, by the name a client would recognise. */
const SECURITY_HEADERS: [header: string, name: string][] = [
  ["strict-transport-security", "HTTPS enforced (HSTS)"],
  ["content-security-policy", "Content security policy"],
  ["x-frame-options", "Frame protection"],
  ["x-content-type-options", "File type protection"],
  ["referrer-policy", "Referrer policy"],
  ["permissions-policy", "Permissions policy"],
];

export function headerFindings(headers: Record<string, string>): HealthReport["headers"] {
  const lower = new Set(Object.keys(headers).map((h) => h.toLowerCase()));
  const present: string[] = [];
  const missing: string[] = [];
  for (const [header, name] of SECURITY_HEADERS) (lower.has(header) ? present : missing).push(name);
  return { present, missing };
}

export function summarisePages(results: { path: string; status: number; ms: number }[]): PageSummary {
  const ok = results.filter((r) => r.status === 200);
  const slowest = ok.reduce<{ path: string; ms: number } | null>((max, r) => (!max || r.ms > max.ms ? { path: r.path, ms: r.ms } : max), null);
  return {
    checked: results.length,
    ok: ok.length,
    averageMs: ok.length ? Math.round(ok.reduce((sum, r) => sum + r.ms, 0) / ok.length) : 0,
    slowest,
    failing: results.filter((r) => r.status !== 200).map((r) => ({ path: r.path, status: r.status })),
  };
}

export function auditCounts(output: unknown): AuditCounts {
  const v = (output as { metadata?: { vulnerabilities?: Record<string, unknown> } })?.metadata?.vulnerabilities;
  if (!v) throw new HealthError("pnpm audit returned no vulnerability summary.");
  const count = (key: string): number => (typeof v[key] === "number" ? (v[key] as number) : 0);
  return { critical: count("critical"), high: count("high"), moderate: count("moderate"), low: count("low") };
}

/** Items for the client's "Needs your attention" box. Empty when nothing needs action. */
export function attentionFromHealth(health: HealthReport, now: Date): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (daysUntil(health.domain.expires, now) <= DOMAIN_WARNING_DAYS) {
    items.push({
      title: `Domain renews on ${longDate(health.domain.expires)}`,
      detail: `Confirm auto-renew is on for ${health.domain.name} with ${health.domain.registrar}, or the site goes offline on that date.`,
    });
  }
  if (daysUntil(health.tls.validTo, now) <= CERTIFICATE_WARNING_DAYS) {
    items.push({
      title: `Security certificate expires on ${longDate(health.tls.validTo)}`,
      detail: "It normally renews itself. We are checking why it has not.",
    });
  }
  if (health.pages.failing.length > 0) {
    const n = health.pages.failing.length;
    items.push({
      title: `${n} page${n === 1 ? " is" : "s are"} not loading`,
      detail: `${health.pages.failing.map((p) => `${p.path} (${p.status})`).join(", ")}. We are fixing ${n === 1 ? "it" : "them"}.`,
    });
  }
  const serious = health.audit.critical + health.audit.high;
  if (serious > 0) {
    items.push({
      title: `${serious} serious security alert${serious === 1 ? "" : "s"} in the code`,
      detail: "Updates are planned for next month's release.",
    });
  }
  return items;
}
