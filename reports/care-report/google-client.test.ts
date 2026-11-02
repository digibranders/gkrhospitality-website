import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleAuthError, SCOPES } from "./google-auth.ts";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const validKey = JSON.stringify({
  type: "service_account",
  client_email: "reader@example.iam.gserviceaccount.com",
  private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
});

describe("google client", () => {
  let dir: string;
  let keyFile: string;

  /** google-client.ts reads GOOGLE_KEY_FILE on import, so each test imports it after pointing that at a temporary file. */
  const loadClient = async (keyText: string): Promise<typeof import("./google-client.ts")> => {
    writeFileSync(keyFile, keyText);
    vi.stubEnv("GOOGLE_KEY_FILE", keyFile);
    vi.resetModules();
    return import("./google-client.ts");
  };

  const errorFrom = async (work: Promise<unknown>): Promise<Error> => {
    const error = await work.then(
      () => null,
      (reason: unknown) => reason,
    );
    if (!(error instanceof Error)) throw new Error("Expected the call to fail with an Error.");
    return error;
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "care-report-"));
    keyFile = join(dir, "test-key.json");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    rmSync(dir, { recursive: true, force: true });
  });

  it("names a broken key file without repeating any of its text", async () => {
    const { accessToken } = await loadClient('{"private_key": "SECRET-KEY-MATERIAL');
    const error = await errorFrom(accessToken(SCOPES.analytics));
    expect(error.name).toBe("GoogleAuthError");
    expect(error.message).toContain("test-key.json");
    expect(error.message).not.toContain("SECRET");
  });

  it("returns the token and gives the sign-in request a time limit", async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(new Response('{"access_token":"abc"}')));
    vi.stubGlobal("fetch", fetchMock);
    const { accessToken } = await loadClient(validKey);
    await expect(accessToken(SCOPES.analytics)).resolves.toBe("abc");
    expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("reports Google's reason when it refuses the sign-in", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(new Response('{"error":"invalid_grant","error_description":"Bad key"}', { status: 400 })));
    const { accessToken } = await loadClient(validKey);
    const error = await errorFrom(accessToken(SCOPES.analytics));
    expect(error.name).toBe("GoogleAuthError");
    expect(error.message).toContain("(400): Bad key");
  });

  it("names the sign-in, not a SyntaxError, when the token response is an HTML page", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(new Response("<html>Bad gateway</html>", { status: 502 })));
    const { accessToken } = await loadClient(validKey);
    const error = await errorFrom(accessToken(SCOPES.analytics));
    expect(error.name).toBe("GoogleAuthError");
    expect(error.message).toContain("(502): no details");
  });

  describe("readApiJson", () => {
    const fail = (message: string): Error => new GoogleAuthError(message);

    it("returns the parsed body of a good response", async () => {
      const { readApiJson } = await loadClient(validKey);
      await expect(readApiJson(new Response('{"rows":[]}'), "GA4", fail)).resolves.toEqual({ rows: [] });
    });

    it("gives the API's own message for an error response", async () => {
      const { readApiJson } = await loadClient(validKey);
      const response = new Response('{"error":{"message":"Quota exceeded"}}', { status: 429 });
      await expect(readApiJson(response, "GA4", fail)).rejects.toThrow("GA4 returned 429: Quota exceeded");
    });

    it("names the API when an error page is HTML", async () => {
      const { readApiJson } = await loadClient(validKey);
      const response = new Response("<!doctype html><title>Bad gateway</title>", { status: 502 });
      const error = await errorFrom(readApiJson(response, "Search Console", fail));
      expect(error).toBeInstanceOf(GoogleAuthError);
      expect(error.message).toBe("Search Console returned 502: no details");
    });

    it("names the API when a successful response is not JSON", async () => {
      const { readApiJson } = await loadClient(validKey);
      await expect(readApiJson(new Response("<html></html>"), "GA4", fail)).rejects.toThrow("GA4 returned a response that is not JSON (200).");
    });
  });

  it("gives a Google API request a 30 second time limit", async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(new Response("{}")));
    vi.stubGlobal("fetch", fetchMock);
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const { fetchWithTimeout } = await loadClient(validKey);
    await fetchWithTimeout("https://example.com/api", { method: "POST" });
    expect(timeout).toHaveBeenCalledWith(30_000);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" });
    timeout.mockRestore();
  });
});
