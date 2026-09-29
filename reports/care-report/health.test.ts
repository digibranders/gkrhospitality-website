import { describe, expect, it } from "vitest";
import {
  HealthError,
  attentionFromHealth,
  auditCounts,
  certificateDate,
  headerFindings,
  rdapDomain,
  registrarName,
  summarisePages,
} from "./health.ts";
import type { HealthReport } from "./health.ts";

const healthy = (): HealthReport => ({
  checkedAt: "2026-09-29T10:00:00.000Z",
  site: "https://www.gkrhospitality.com",
  tls: { validTo: "2026-12-19", issuer: "Let's Encrypt" },
  domain: { name: "gkrhospitality.com", expires: "2027-09-05", registrar: "GoDaddy.com, LLC" },
  pages: { checked: 10, ok: 10, averageMs: 350, slowest: { path: "/about", ms: 448 }, failing: [] },
  headers: { present: ["HSTS", "Frame protection"], missing: [] },
  audit: { critical: 0, high: 0, moderate: 0, low: 1 },
  versions: { next: "16.3.6", react: "19.3.0" },
});

describe("health readings", () => {
  it("reads the expiry date and registrar from an RDAP record", () => {
    const rdap = {
      events: [
        { eventAction: "registration", eventDate: "2020-12-05T18:36:37Z" },
        { eventAction: "expiration", eventDate: "2026-12-05T18:36:37Z" },
      ],
      entities: [{ roles: ["registrar"], vcardArray: ["vcard", [["version", {}, "text", "4.0"], ["fn", {}, "text", "GoDaddy.com, LLC"]]] }],
    };
    expect(rdapDomain(rdap, "gkrhospitality.com")).toEqual({
      name: "gkrhospitality.com",
      expires: "2026-12-05",
      registrar: "GoDaddy.com, LLC",
    });
    expect(() => rdapDomain({ events: [] }, "gkrhospitality.com")).toThrow(HealthError);
  });

  it("gives registrars their everyday name", () => {
    expect(registrarName("GoDaddy.com, LLC")).toBe("GoDaddy");
    expect(registrarName("Namecheap, Inc.")).toBe("Namecheap");
    expect(registrarName("Gandi SAS")).toBe("Gandi SAS");
  });

  it("turns a certificate expiry string into a date", () => {
    expect(certificateDate("Dec 19 14:48:53 2026 GMT")).toBe("2026-12-19");
    expect(() => certificateDate("not a date")).toThrow(HealthError);
  });

  it("names the security headers that are present and missing", () => {
    const findings = headerFindings({
      "strict-transport-security": "max-age=63072000",
      "x-frame-options": "SAMEORIGIN",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "permissions-policy": "camera=()",
    });
    expect(findings.missing).toEqual(["Content security policy"]);
    expect(findings.present).toHaveLength(5);
  });

  it("summarises page checks, including failures and the slowest page", () => {
    expect(
      summarisePages([
        { path: "/", status: 200, ms: 118 },
        { path: "/about", status: 200, ms: 448 },
        { path: "/old", status: 404, ms: 90 },
      ]),
    ).toEqual({ checked: 3, ok: 2, averageMs: 283, slowest: { path: "/about", ms: 448 }, failing: [{ path: "/old", status: 404 }] });
  });

  it("reads severity counts from pnpm audit output", () => {
    expect(auditCounts({ metadata: { vulnerabilities: { info: 0, low: 1, moderate: 0, high: 0, critical: 0 } } })).toEqual({
      critical: 0,
      high: 0,
      moderate: 0,
      low: 1,
    });
    expect(() => auditCounts({})).toThrow(HealthError);
  });
});

describe("attentionFromHealth", () => {
  const now = new Date("2026-09-29T10:00:00Z");

  it("raises nothing when everything is healthy", () => {
    expect(attentionFromHealth(healthy(), now)).toEqual([]);
  });

  it("flags a domain renewal within 90 days, a certificate within 14, failing pages and serious alerts", () => {
    const report = healthy();
    report.domain.expires = "2026-12-05";
    report.tls.validTo = "2026-10-06";
    report.pages.failing = [{ path: "/work", status: 500 }];
    report.audit.high = 2;
    const titles = attentionFromHealth(report, now).map((item) => item.title);
    expect(titles).toEqual([
      "Domain renews on 5 December 2026",
      "Security certificate expires on 6 October 2026",
      "1 page is not loading",
      "2 serious security alerts in the code",
    ]);
  });
});
