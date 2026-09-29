import { describe, expect, it } from "vitest";
import {
  CONTENT_SECURITY_POLICY_DIRECTIVES,
  SECURITY_HEADERS,
  serializeContentSecurityPolicy,
} from "./security-headers";

const policy = (): string => {
  const header = SECURITY_HEADERS.find((h) => h.key === "Content-Security-Policy");
  if (!header) throw new Error("No Content-Security-Policy header");
  return header.value;
};

const directive = (name: string): string[] => {
  const match = policy()
    .split("; ")
    .find((part) => part.startsWith(`${name} `));
  return match ? match.split(" ").slice(1) : [];
};

describe("security headers", () => {
  it("serialises directives in order, separated by semicolons", () => {
    expect(serializeContentSecurityPolicy({ "default-src": ["'self'"], "object-src": ["'none'"] })).toBe(
      "default-src 'self'; object-src 'none'",
    );
  });

  it("sends a Content Security Policy alongside the other security headers", () => {
    expect(SECURITY_HEADERS.map((h) => h.key)).toEqual([
      "Content-Security-Policy",
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ]);
    expect(policy()).not.toMatch(/[\n;]\s*;|;\s*$/);
  });

  it("allows the services the site loads: GTM, GA4, Turnstile and Sentry", () => {
    expect(directive("script-src")).toEqual(
      expect.arrayContaining(["'self'", "https://www.googletagmanager.com", "https://challenges.cloudflare.com"]),
    );
    expect(directive("connect-src")).toEqual(
      expect.arrayContaining(["https://*.google-analytics.com", "https://*.ingest.us.sentry.io"]),
    );
    expect(directive("frame-src")).toContain("https://challenges.cloudflare.com");
    expect(directive("worker-src")).toContain("blob:");
  });

  it("blocks plugins, framing by other sites, base tag changes and posting forms elsewhere", () => {
    expect(directive("object-src")).toEqual(["'none'"]);
    expect(directive("frame-ancestors")).toEqual(["'self'"]);
    expect(directive("base-uri")).toEqual(["'self'"]);
    expect(directive("form-action")).toEqual(["'self'"]);
  });

  it("never allows eval or any origin wildcard", () => {
    for (const sources of Object.values(CONTENT_SECURITY_POLICY_DIRECTIVES)) {
      expect(sources).not.toContain("'unsafe-eval'");
      expect(sources).not.toContain("*");
      expect(sources).not.toContain("https:");
    }
  });
});
