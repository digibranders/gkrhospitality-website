/**
 * Security headers sent with every page.
 *
 * The Content Security Policy lists every outside origin the site uses:
 * Google Tag Manager and GA4 (analytics), Cloudflare Turnstile (the contact
 * form's spam check), Sentry (error reports) and Vercel's preview toolbar.
 *
 * Scripts allow 'unsafe-inline' because Next.js streams inline scripts to
 * hydrate each page, and the GTM loader is inline too. The alternative, a
 * per-request nonce, would stop Next.js from prerendering and caching the
 * pages. The policy still blocks scripts from any origin not listed here,
 * plugins, framing by other sites and form posts to other sites.
 *
 * A new third-party service (a chat widget, a booking embed, a new GTM tag
 * that loads from another domain) must be added here, or the browser will
 * block it.
 */

const GOOGLE_TAG_MANAGER = "https://www.googletagmanager.com";
const GOOGLE_ANALYTICS = ["https://*.google-analytics.com", "https://*.analytics.google.com"];
const TURNSTILE = "https://challenges.cloudflare.com";
const SENTRY = ["https://*.ingest.sentry.io", "https://*.ingest.us.sentry.io", "https://*.ingest.de.sentry.io"];
const VERCEL_TOOLBAR = "https://vercel.live";

export const CONTENT_SECURITY_POLICY_DIRECTIVES: Readonly<Record<string, readonly string[]>> = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'", GOOGLE_TAG_MANAGER, TURNSTILE, VERCEL_TOOLBAR],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:", GOOGLE_TAG_MANAGER, ...GOOGLE_ANALYTICS],
  "font-src": ["'self'", "data:"],
  "connect-src": ["'self'", GOOGLE_TAG_MANAGER, ...GOOGLE_ANALYTICS, ...SENTRY, VERCEL_TOOLBAR],
  "frame-src": [TURNSTILE, GOOGLE_TAG_MANAGER, VERCEL_TOOLBAR],
  "worker-src": ["'self'", "blob:"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'self'"],
};

/** The directives as one header value: `default-src 'self'; script-src ...`. */
export function serializeContentSecurityPolicy(directives: Readonly<Record<string, readonly string[]>>): string {
  return Object.entries(directives)
    .map(([directive, sources]) => [directive, ...sources].join(" "))
    .join("; ");
}

export const SECURITY_HEADERS: readonly { key: string; value: string }[] = [
  { key: "Content-Security-Policy", value: serializeContentSecurityPolicy(CONTENT_SECURITY_POLICY_DIRECTIVES) },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];
