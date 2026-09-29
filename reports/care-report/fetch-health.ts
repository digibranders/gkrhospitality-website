/**
 * Checks the live site and the code, and saves the readings to months/<period>.health.json.
 *
 *   npm run report:health -- 2026-09
 *
 * Live site: the HTTPS certificate, the domain registration (RDAP, the public
 * registry record), every page in the sitemap and the security headers.
 * Code: pnpm audit and the Next.js and React versions in package.json, which
 * describe what is in the repository and may be ahead of what is deployed.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { connect } from "node:tls";
import { fileURLToPath } from "node:url";
import {
  HealthError,
  auditCounts,
  certificateDate,
  headerFindings,
  rdapDomain,
  summarisePages,
} from "./health.ts";
import type { HealthReport } from "./health.ts";
import { parseConfig } from "./report.ts";
import { sitemapPaths } from "./search-console.ts";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const REPO = join(ROOT, "..", "..");
const PERIOD = /^\d{4}-\d{2}$/;
const TIMEOUT_MS = 20_000;

function certificate(host: string): Promise<HealthReport["tls"]> {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port: 443, servername: host, timeout: TIMEOUT_MS }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      const issuer = cert.issuer?.O ?? cert.issuer?.CN ?? "Unknown issuer";
      try {
        resolve({ validTo: certificateDate(cert.valid_to), issuer: Array.isArray(issuer) ? issuer.join(", ") : issuer });
      } catch (error) {
        reject(error);
      }
    });
    socket.on("timeout", () => socket.destroy(new HealthError(`Timed out reading the certificate for ${host}.`)));
    socket.on("error", reject);
  });
}

async function checkPage(origin: string, path: string): Promise<{ path: string; status: number; ms: number }> {
  const started = performance.now();
  const response = await fetch(path === "/" ? origin : `${origin}${path}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "user-agent": "FynixCareReport/1.0 (+https://fynix.digital)" },
  });
  await response.arrayBuffer();
  return { path, status: response.status, ms: Math.round(performance.now() - started) };
}

/**
 * The domain's registry record over RDAP. IANA publishes which registry serves
 * each top-level domain (Verisign for .com), so the lookup goes straight there.
 */
async function registryRecord(domain: string): Promise<unknown> {
  const tld = domain.slice(domain.lastIndexOf(".") + 1).toLowerCase();
  const bootstrap = (await (await fetch("https://data.iana.org/rdap/dns.json", { signal: AbortSignal.timeout(TIMEOUT_MS) })).json()) as {
    services?: [string[], string[]][];
  };
  const base = bootstrap.services?.find(([tlds]) => tlds.includes(tld))?.[1][0];
  if (!base) throw new HealthError(`No registry lookup service is published for .${tld} domains.`);
  const response = await fetch(`${base.replace(/\/?$/, "/")}domain/${domain}`, {
    headers: { accept: "application/rdap+json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new HealthError(`The registry lookup for ${domain} failed (${response.status}).`);
  return response.json();
}

/** pnpm audit exits non-zero when it finds anything, so the JSON comes from stdout either way. */
function audit(): HealthReport["audit"] {
  let stdout: string;
  try {
    stdout = execFileSync("pnpm", ["audit", "--json"], { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch (error) {
    stdout = String((error as { stdout?: unknown }).stdout ?? "");
  }
  if (!stdout.trim()) throw new HealthError("pnpm audit produced no output. Is pnpm installed?");
  return auditCounts(JSON.parse(stdout));
}

function versions(): HealthReport["versions"] {
  const pkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8")) as { dependencies?: Record<string, string> };
  const clean = (range: string | undefined): string => (range ?? "unknown").replace(/^[\^~]/, "");
  return { next: clean(pkg.dependencies?.next), react: clean(pkg.dependencies?.react) };
}

async function fetchHealth(period: string): Promise<void> {
  if (!PERIOD.test(period)) {
    throw new HealthError(`Pass the month as YYYY-MM, for example: npm run report:health -- 2026-09 (got "${period}")`);
  }
  const config = parseConfig(JSON.parse(readFileSync(join(ROOT, "config.json"), "utf8")));
  const sitemapUrl = new URL(config.searchConsole.sitemapUrl);
  const origin = sitemapUrl.origin;

  const sitemap = await fetch(sitemapUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!sitemap.ok) throw new HealthError(`Could not load the sitemap ${sitemapUrl} (${sitemap.status}).`);
  const paths = sitemapPaths(await sitemap.text(), sitemapUrl.host);

  const rdap = await registryRecord(config.client.domain);

  const home = await fetch(origin, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  const headers: Record<string, string> = {};
  home.headers.forEach((value, key) => (headers[key] = value));

  const pages: { path: string; status: number; ms: number }[] = [];
  for (const path of paths) pages.push(await checkPage(origin, path)); // one at a time, so timings are not skewed

  const report: HealthReport = {
    checkedAt: new Date().toISOString(),
    site: origin,
    tls: await certificate(sitemapUrl.host),
    domain: rdapDomain(rdap, config.client.domain),
    pages: summarisePages(pages),
    headers: headerFindings(headers),
    audit: audit(),
    versions: versions(),
  };

  const outPath = join(ROOT, "months", `${period}.health.json`);
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  const { tls, domain, pages: p, headers: h, audit: a, versions: v } = report;
  console.log(`Saved ${relative(process.cwd(), outPath)}`);
  console.log(`  Certificate valid until ${tls.validTo} (${tls.issuer})`);
  console.log(`  ${domain.name} registered until ${domain.expires} with ${domain.registrar}`);
  console.log(`  ${p.ok} of ${p.checked} pages loading, average ${p.averageMs} ms`);
  console.log(`  Security headers: ${h.present.length} present${h.missing.length ? `, missing ${h.missing.join(", ")}` : ""}`);
  console.log(`  Code: ${a.critical} critical, ${a.high} high, ${a.moderate} moderate, ${a.low} low alerts; Next.js ${v.next}, React ${v.react}`);
}

fetchHealth(process.argv.slice(2).find((arg) => !arg.startsWith("--")) ?? "").catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
