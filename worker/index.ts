import { Hono } from "hono";
import { requireAccess, remoteKeys, type KeySource } from "./access";
import type { AppEnv } from "./env";
import { items } from "./items";

/**
 * Builds the app. The key source is a parameter only so that tests can supply
 * their own keys.
 */
export function createApp(keySource: KeySource = remoteKeys) {
  const app = new Hono<AppEnv>();

  // Every request passes through the Access check first, including requests
  // for the front end's own files (see "run_worker_first" in wrangler.jsonc).
  app.use("*", requireAccess(keySource));

  app.route("/api/items", items);

  // Anything under /api that is not a route above is a mistake by the caller,
  // so it gets a JSON error rather than the front end's page.
  app.all("/api/*", (c) => c.json({ error: "Not found." }, 404));

  // Everything else is the front end: hand it to the static files.
  app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

  app.onError((error, c) => {
    console.error("Unhandled error:", error);
    return c.json({ error: "Something went wrong." }, 500);
  });

  return app;
}

export default createApp();
