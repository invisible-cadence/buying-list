import { createMiddleware } from "hono/factory";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
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

function isLocalRequest(request: Request): boolean {
  const { hostname } = new URL(request.url);
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * Checks the Cloudflare Access token on every request.
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
      return next();
    }

    const { TEAM_DOMAIN: teamDomain, POLICY_AUD: audience } = c.env;
    if (!teamDomain || !audience) {
      console.error("Access check is not configured: TEAM_DOMAIN or POLICY_AUD is missing.");
      return c.json({ error: "Server is not configured." }, 500);
    }

    const token = c.req.header(TOKEN_HEADER);
    if (!token) {
      return c.json({ error: "Not signed in." }, 401);
    }

    try {
      // jwtVerify checks the signature, the expiry, the issuer (who made the
      // token) and the audience (which application it was made for).
      await jwtVerify(token, keySource(teamDomain), {
        issuer: teamDomain,
        audience,
        algorithms: ["RS256"],
      });
    } catch (error) {
      // The reason is logged for the owner and never sent to the caller.
      console.warn("Access token refused:", error instanceof Error ? error.message : error);
      return c.json({ error: "Not signed in." }, 401);
    }

    return next();
  });
}
