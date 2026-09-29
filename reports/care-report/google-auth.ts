/**
 * Service-account sign-in for Google's reporting APIs (Search Console, GA4).
 * Pure functions, covered by google-auth.test.ts; google-client.ts does the HTTP.
 */
import { createSign } from "node:crypto";

export class GoogleAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleAuthError";
  }
}

export interface ServiceAccountKey {
  clientEmail: string;
  privateKey: string;
}

export const TOKEN_URL = "https://oauth2.googleapis.com/token";
const TOKEN_LIFETIME_S = 3600;

/** Read-only permissions. The service account never needs write access. */
export const SCOPES = {
  searchConsole: "https://www.googleapis.com/auth/webmasters.readonly",
  analytics: "https://www.googleapis.com/auth/analytics.readonly",
} as const;

export type Scope = (typeof SCOPES)[keyof typeof SCOPES];

/** Validates the JSON key file downloaded from Google Cloud. */
export function parseServiceAccountKey(input: unknown): ServiceAccountKey {
  const hint =
    "Expected a service account key: the JSON file from Google Cloud > IAM & Admin > Service Accounts > Keys.";
  if (typeof input !== "object" || input === null) throw new GoogleAuthError(hint);
  const key = input as Record<string, unknown>;
  if (key.type !== "service_account") {
    throw new GoogleAuthError(`${hint} This file has "type": ${JSON.stringify(key.type)}.`);
  }
  if (typeof key.client_email !== "string" || typeof key.private_key !== "string") {
    throw new GoogleAuthError(`${hint} It is missing client_email or private_key.`);
  }
  return { clientEmail: key.client_email, privateKey: key.private_key };
}

const base64Url = (text: string): string => Buffer.from(text, "utf8").toString("base64url");

/** A signed JWT that Google exchanges for an access token limited to `scope`. */
export function createServiceAccountJwt(key: ServiceAccountKey, nowSeconds: number, scope: Scope): string {
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(
    JSON.stringify({
      iss: key.clientEmail,
      scope,
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
