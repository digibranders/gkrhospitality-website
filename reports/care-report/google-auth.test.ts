import { createPublicKey, createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { GoogleAuthError, SCOPES, createServiceAccountJwt, parseServiceAccountKey } from "./google-auth.ts";

const base64UrlDecode = (text: string): string => Buffer.from(text, "base64url").toString("utf8");

describe("service account", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const key = parseServiceAccountKey({
    type: "service_account",
    client_email: "gkr-care-report@fynix-care-reports.iam.gserviceaccount.com",
    private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  });

  it("rejects files that are not service account keys", () => {
    expect(() => parseServiceAccountKey({ type: "authorized_user" })).toThrow(GoogleAuthError);
    expect(() => parseServiceAccountKey("not json")).toThrow(/service account key/);
  });

  it("signs a token request, limited to the scope asked for, that Google can verify", () => {
    const jwt = createServiceAccountJwt(key, 1_790_000_000, SCOPES.analytics);
    const [header, claims, signature] = jwt.split(".");

    expect(JSON.parse(base64UrlDecode(header))).toEqual({ alg: "RS256", typ: "JWT" });
    expect(JSON.parse(base64UrlDecode(claims))).toEqual({
      iss: key.clientEmail,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: 1_790_000_000,
      exp: 1_790_003_600,
    });

    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${header}.${claims}`);
    const verifyKey = createPublicKey(publicKey.export({ type: "spki", format: "pem" }));
    expect(verifier.verify(verifyKey, Buffer.from(signature, "base64url"))).toBe(true);
  });

  it("only offers read-only scopes", () => {
    for (const scope of Object.values(SCOPES)) expect(scope).toMatch(/\.readonly$/);
  });
});
