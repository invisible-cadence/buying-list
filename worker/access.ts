import { createMiddleware } from "hono/factory";
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from "jose";
import type { AppEnv } from "./env";

const TOKEN_HEADER = "Cf-Access-Jwt-Assertion";

/**
 * Where to find the public keys that Cloudflare Access signs tokens with.
 * Production uses the keys Cloudflare publishes for your team. Tests pass in
 * their own keys instead, so no network is needed.
 */
export type KeySource = (teamDomain: string) => JWTVerifyGetKey;

// One key set per team address, kept for as long as this Worker instance lives.
// jose downloads the keys on first use and caches them.
const remoteKeySets = new Map<string, JWTVerifyGetKey>();

export const remoteKeys: KeySource = (teamDomain) => {
  let keys = remoteKeySets.get(teamDomain);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
    remoteKeySets.set(teamDomain, keys);
  }
  return keys;
};

/**
 * Cleans up the team address and checks it has the right shape: https://,
 * then a host name, and nothing after it. Returns null when it does not.
 * Spaces, capital letters and trailing slashes are the easy mistakes to make
 * when pasting it in, so they are forgiven. Host names are not case sensitive,
 * but the token's issuer is compared as text and Access writes it in lower
 * case. Anything else, such as a path, query, port or user name, is reported
 * rather than guessed at.
 */
export function normaliseTeamDomain(value: string): string | null {
  const cleaned = value.trim().replace(/\/+$/, "").toLowerCase();
  return /^https:\/\/[a-z0-9.-]+$/.test(cleaned) ? cleaned : null;
}

/**
 * Cleans up an email for comparing: spaces trimmed and lower case, because
 * the same person can be written with different capitals. Returns null when
 * it is not something with an @ in it.
 */
export function normaliseEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+$/.test(cleaned) ? cleaned : null;
}

function isLocalRequest(request: Request): boolean {
  const { hostname } = new URL(request.url);
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * Checks the Cloudflare Access token on every request, and records who is
 * signed in as "viewer" for the routes to read.
 *
 * Access already stops visitors at Cloudflare's edge. This check means the app
 * does not depend on that alone: a request that skipped Access, or came in
 * through an address Access does not cover, is still refused.
 *
 * It fails closed. If the settings are missing, nobody gets in.
 */
export function requireAccess(keySource: KeySource = remoteKeys) {
  return createMiddleware<AppEnv>(async (c, next) => {
    // Local development only. Both conditions must hold, so setting the
    // variable by mistake on the live Worker does nothing: a request for the
    // live address never has a localhost hostname.
    if (c.env.DEV_SKIP_ACCESS === "true" && isLocalRequest(c.req.raw)) {
      const devViewer = normaliseEmail(c.env.DEV_USER_EMAIL);
      if (!devViewer) {
        console.error("Local sign-in is not configured: set DEV_USER_EMAIL in .dev.vars.");
        return c.json({ error: "Server is not configured." }, 500);
      }
      c.set("viewer", devViewer);
      return next();
    }

    const { TEAM_DOMAIN: rawTeamDomain, POLICY_AUD: audience } = c.env;
    if (!rawTeamDomain || !audience) {
      console.error("Access check is not configured: TEAM_DOMAIN or POLICY_AUD is missing.");
      return c.json({ error: "Server is not configured." }, 500);
    }

    const teamDomain = normaliseTeamDomain(rawTeamDomain);
    if (!teamDomain) {
      console.error(
        "Access check is not configured: TEAM_DOMAIN must be https:// followed by the team " +
          "address only, with no path after it.",
      );
      return c.json({ error: "Server is not configured." }, 500);
    }

    const token = c.req.header(TOKEN_HEADER);
    if (!token) {
      return c.json({ error: "Not signed in." }, 401);
    }

    let payload: JWTPayload;
    try {
      // jwtVerify checks the signature, the expiry, the issuer (who made the
      // token) and the audience (which application it was made for).
      ({ payload } = await jwtVerify(token, keySource(teamDomain), {
        issuer: teamDomain,
        audience,
        algorithms: ["RS256"],
      }));
    } catch (error) {
      // The reason is logged for the owner and never sent to the caller.
      console.warn("Access token refused:", error instanceof Error ? error.message : error);
      return c.json({ error: "Not signed in." }, 401);
    }

    // A person's token names their email. A service token, made for a
    // program rather than a person, has none, and nothing in the app is
    // meant for programs yet, so it is refused.
    const viewer = normaliseEmail(payload.email);
    if (!viewer) {
      console.warn("Access token refused: it has no email, so it is not a person's sign-in.");
      return c.json({ error: "Not signed in." }, 401);
    }
    c.set("viewer", viewer);

    return next();
  });
}
