import { generateKeyPair, SignJWT, type CryptoKey } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { normaliseTeamDomain } from "./access";
import { createApp } from "./index";
import type { Bindings } from "./env";

// Invented values. Nothing here belongs to a real account.
const TEAM_DOMAIN = "https://example-team.cloudflareaccess.com";
const AUD = "example-audience-tag";
const LIVE_URL = "https://buying-list.example.com/";

let privateKey: CryptoKey;
let publicKey: CryptoKey;
let otherPrivateKey: CryptoKey;

beforeAll(async () => {
  ({ privateKey, publicKey } = await generateKeyPair("RS256"));
  ({ privateKey: otherPrivateKey } = await generateKeyPair("RS256"));
});

// The app, with the test's own public key standing in for Cloudflare's.
function app() {
  return createApp(() => () => Promise.resolve(publicKey));
}

function bindings(overrides: Partial<Bindings> = {}): Bindings {
  return {
    // The Access check runs first, so these are only reached when it passes.
    ASSETS: { fetch: () => Promise.resolve(new Response("the front end")) } as unknown as Fetcher,
    DB: {} as D1Database,
    TEAM_DOMAIN,
    POLICY_AUD: AUD,
    ...overrides,
  };
}

function sign(options: { key?: CryptoKey; iss?: string; aud?: string; exp?: string } = {}) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(options.iss ?? TEAM_DOMAIN)
    .setAudience(options.aud ?? AUD)
    .setIssuedAt()
    .setExpirationTime(options.exp ?? "5m")
    .sign(options.key ?? privateKey);
}

async function request(token: string | undefined, env: Bindings = bindings(), url = LIVE_URL) {
  const headers = token ? { "Cf-Access-Jwt-Assertion": token } : undefined;
  return app().request(url, { headers }, env);
}

describe("the Access token check", () => {
  it("lets a request with a valid token through", async () => {
    const response = await request(await sign());
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("the front end");
  });

  it("refuses a request with no token", async () => {
    expect((await request(undefined)).status).toBe(401);
  });

  it("refuses a token that is not a token at all", async () => {
    expect((await request("not-a-token")).status).toBe(401);
  });

  it("refuses a token signed with a different key", async () => {
    expect((await request(await sign({ key: otherPrivateKey }))).status).toBe(401);
  });

  it("refuses a token made for a different application", async () => {
    expect((await request(await sign({ aud: "another-app" }))).status).toBe(401);
  });

  it("refuses a token from a different issuer", async () => {
    const token = await sign({ iss: "https://other-team.cloudflareaccess.com" });
    expect((await request(token)).status).toBe(401);
  });

  it("refuses an expired token", async () => {
    const token = await sign({ exp: "-1m" });
    expect((await request(token)).status).toBe(401);
  });

  it("checks API requests as well as the front end's files", async () => {
    const response = await request(undefined, bindings(), `${LIVE_URL}api/items`);
    expect(response.status).toBe(401);
  });

  it("does not say why a token was refused", async () => {
    const response = await request(await sign({ aud: "another-app" }));
    expect(await response.json()).toEqual({ error: "Not signed in." });
  });

  it("refuses everyone when the settings are missing", async () => {
    const env = bindings({ TEAM_DOMAIN: undefined, POLICY_AUD: undefined });
    expect((await request(await sign(), env)).status).toBe(500);
  });
});

describe("the local development switch", () => {
  const dev = bindings({ DEV_SKIP_ACCESS: "true", TEAM_DOMAIN: undefined, POLICY_AUD: undefined });

  it("skips the check for localhost when switched on", async () => {
    expect((await request(undefined, dev, "http://localhost:5173/")).status).toBe(200);
  });

  it("is ignored for any other address, even when switched on", async () => {
    expect((await request(undefined, dev, LIVE_URL)).status).toBe(500);
    const withSettings = bindings({ DEV_SKIP_ACCESS: "true" });
    expect((await request(undefined, withSettings, LIVE_URL)).status).toBe(401);
  });

  it("does nothing for localhost when switched off", async () => {
    const off = bindings({ TEAM_DOMAIN: undefined, POLICY_AUD: undefined });
    expect((await request(undefined, off, "http://localhost:5173/")).status).toBe(500);
  });
});

describe("the team address", () => {
  it("forgives spaces and trailing slashes", () => {
    expect(normaliseTeamDomain(`  ${TEAM_DOMAIN}/ \n`)).toBe(TEAM_DOMAIN);
  });

  it("rejects a value that is not https:// and a host name alone", () => {
    expect(normaliseTeamDomain("example-team.cloudflareaccess.com")).toBeNull();
    expect(normaliseTeamDomain("http://example-team.cloudflareaccess.com")).toBeNull();
    expect(normaliseTeamDomain(`${TEAM_DOMAIN}/cdn-cgi/access/certs`)).toBeNull();
  });

  it("still accepts a valid token when the address has a trailing slash", async () => {
    const env = bindings({ TEAM_DOMAIN: `${TEAM_DOMAIN}/` });
    expect((await request(await sign(), env)).status).toBe(200);
  });

  it("refuses everyone when the address has the wrong shape", async () => {
    const env = bindings({ TEAM_DOMAIN: "example-team.cloudflareaccess.com" });
    expect((await request(await sign(), env)).status).toBe(500);
  });
});
