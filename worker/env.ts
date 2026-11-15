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
};

export type AppEnv = { Bindings: Bindings };
