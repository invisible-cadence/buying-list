/** The settings and services this Worker is given. */
export type Bindings = {
  /** The D1 database, bound in wrangler.jsonc. */
  DB: D1Database;
  /** The front end's built files, bound in wrangler.jsonc. */
  ASSETS: Fetcher;
  /** Your Access team address. A Worker secret. */
  TEAM_DOMAIN?: string;
  /** The Access application's audience tag. A Worker secret. */
  POLICY_AUD?: string;
  /** "true" in .dev.vars only. See worker/access.ts. */
  DEV_SKIP_ACCESS?: string;
  /** In .dev.vars only: who you are while the sign-in check is skipped. */
  DEV_USER_EMAIL?: string;
};

/** What the Access check works out for each request, for the routes to read. */
export type Variables = {
  /**
   * The email of the person making the request, in lower case. It always comes
   * from the verified sign-in token (or DEV_USER_EMAIL locally), never from
   * anything the caller sends.
   */
  viewer: string;
};

export type AppEnv = { Bindings: Bindings; Variables: Variables };
