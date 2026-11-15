import { Hono } from "hono";
import type { AppEnv } from "./env";

export const MAX_TITLE_LENGTH = 200;

export type Item = {
  id: number;
  title: string;
  createdAt: string;
};

/**
 * Turns whatever the caller sent into a clean title, or says why it cannot.
 * Kept separate from the route so it can be tested on its own.
 */
export function parseTitle(body: unknown): { title: string } | { error: string } {
  if (typeof body !== "object" || body === null || !("title" in body)) {
    return { error: "A title is required." };
  }
  if (typeof body.title !== "string") {
    return { error: "The title must be text." };
  }
  const title = body.title.trim();
  if (title.length === 0) {
    return { error: "A title is required." };
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return { error: `The title must be at most ${MAX_TITLE_LENGTH} characters.` };
  }
  return { title };
}

export const items = new Hono<AppEnv>();

items.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, title, created_at AS createdAt FROM items ORDER BY id DESC",
  ).all<Item>();
  return c.json({ items: results });
});

items.post("/", async (c) => {
  // Browsers only send this content type from a script on the app's own page,
  // not from a form on another website. Requiring it blocks that kind of
  // forged request.
  if (!c.req.header("Content-Type")?.startsWith("application/json")) {
    return c.json({ error: "Send the item as JSON." }, 415);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "The request body is not valid JSON." }, 400);
  }

  const parsed = parseTitle(body);
  if ("error" in parsed) {
    return c.json({ error: parsed.error }, 400);
  }

  // The question mark is a placeholder that D1 fills in safely, so a title
  // can never be read as SQL.
  const item = await c.env.DB.prepare(
    "INSERT INTO items (title) VALUES (?) RETURNING id, title, created_at AS createdAt",
  )
    .bind(parsed.title)
    .first<Item>();

  return c.json({ item }, 201);
});
