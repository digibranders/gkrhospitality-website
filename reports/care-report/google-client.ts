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

const KEY_FILE = process.env.GOOGLE_KEY_FILE ?? join(fileURLToPath(new URL(".", import.meta.url)), ".secrets", "service-account.json");
const REQUEST_TIMEOUT_MS = 30_000;

/** A request that gives up rather than hanging the run. */
export function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

/** The body as JSON, or null when it is not JSON, such as an HTML error page from a gateway. */
async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Reads a Google API response: the status first, then the body, so an HTML
 * error page gives a message naming the API rather than a bare SyntaxError.
 */
export async function readApiJson(response: Response, api: string, fail: (message: string) => Error): Promise<unknown> {
  const body = await readBody(response);
  if (!response.ok) {
    const details = (body as { error?: { message?: string } } | null)?.error?.message;
    throw fail(`${api} returned ${response.status}: ${details ?? "no details"}`);
  }
  if (body === null) throw fail(`${api} returned a response that is not JSON (${response.status}).`);
  return body;
}

function readKeyFile(): unknown {
  const text = readFileSync(KEY_FILE, "utf8");
  try {
    return JSON.parse(text);
  } catch {
    // Never pass on the parser's message: Node echoes file text in it, which here could be key material.
    throw new GoogleAuthError(`The service account key ${relative(process.cwd(), KEY_FILE)} is not valid JSON.`);
  }
}

export async function accessToken(scope: Scope): Promise<string> {
  if (!existsSync(KEY_FILE)) {
    throw new GoogleAuthError(
      `No service account key at ${relative(process.cwd(), KEY_FILE)}. See "Google access" in reports/care-report/README.md.`,
    );
  }
  const key = parseServiceAccountKey(readKeyFile());
  const response = await fetchWithTimeout(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: tokenRequestBody(createServiceAccountJwt(key, Math.floor(Date.now() / 1000), scope)),
  });
  const body = ((await readBody(response)) ?? {}) as { access_token?: string; error_description?: string; error?: string };
  if (!response.ok || !body.access_token) {
    throw new GoogleAuthError(
      `Google refused the service account sign-in (${response.status}): ${body.error_description ?? body.error ?? "no details"}. ` +
        "If the key was deleted in Google Cloud, create a new one.",
    );
  }
  return body.access_token;
}
