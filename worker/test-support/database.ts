import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Miniflare } from "miniflare";

// A real D1 database for tests, run on your own computer by Miniflare,
// Cloudflare's local simulator. It is the same database engine the live app
// uses, so a query that works here works there.

const MIGRATIONS_DIR = join(import.meta.dirname, "../../migrations");

/** The migration file names, in the order they are applied. */
export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

/** Runs one migration file, exactly as `wrangler d1 migrations apply` would. */
export async function applyMigration(db: D1Database, file: string): Promise<void> {
  await db.prepare(readFileSync(join(MIGRATIONS_DIR, file), "utf8")).run();
}

export type TestDatabase = {
  db: D1Database;
  /** Empties every table, so each test starts from nothing. */
  reset: () => Promise<void>;
  /** Shuts the simulator down. */
  dispose: () => Promise<void>;
};

/**
 * Starts an empty database and, by default, applies every migration to it.
 * Pass `applyAll: false` to apply them one at a time yourself.
 */
export async function createTestDatabase(applyAll = true): Promise<TestDatabase> {
  const miniflare = new Miniflare({
    // Miniflare needs a Worker to host the database. This one does nothing.
    modules: true,
    script: "export default { fetch() { return new Response(null); } }",
    d1Databases: { DB: "test-database" },
  });
  const db = await miniflare.getD1Database("DB");
  if (applyAll) {
    for (const file of migrationFiles()) {
      await applyMigration(db, file);
    }
  }
  return {
    db,
    reset: async () => {
      await db.batch([db.prepare("DELETE FROM links"), db.prepare("DELETE FROM items")]);
    },
    dispose: () => miniflare.dispose(),
  };
}
