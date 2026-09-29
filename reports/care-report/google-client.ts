/**
 * HTTP side of the Google APIs: reads the service account key and exchanges
 * it for an access token. Shared by fetch-search.ts and fetch-analytics.ts.
 *
 * The key lives in .secrets/service-account.json (gitignored). Set
 * GOOGLE_KEY_FILE to keep it elsewhere.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GoogleAuthError,
  TOKEN_URL,
  createServiceAccountJwt,
  parseServiceAccountKey,
  tokenRequestBody,
} from "./google-auth.ts";
import type { Scope } from "./google-auth.ts";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
export const KEY_FILE = process.env.GOOGLE_KEY_FILE ?? join(ROOT, ".secrets", "service-account.json");

export async function accessToken(scope: Scope): Promise<string> {
  if (!existsSync(KEY_FILE)) {
    throw new GoogleAuthError(
      `No service account key at ${relative(process.cwd(), KEY_FILE)}. See "Google access" in reports/care-report/README.md.`,
    );
  }
  const key = parseServiceAccountKey(JSON.parse(readFileSync(KEY_FILE, "utf8")));
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: tokenRequestBody(createServiceAccountJwt(key, Math.floor(Date.now() / 1000), scope)),
  });
  const body = (await response.json()) as { access_token?: string; error_description?: string; error?: string };
  if (!response.ok || !body.access_token) {
    throw new GoogleAuthError(
      `Google refused the service account sign-in (${response.status}): ${body.error_description ?? body.error ?? "no details"}. ` +
        "If the key was deleted in Google Cloud, create a new one.",
    );
  }
  return body.access_token;
}
