import { Hono, type Context } from "hono";
import type { z } from "zod";
import type { AppEnv } from "./env";
import {
  addLink,
  changeStatus,
  createItem,
  getItem,
  listItems,
  removeLink,
  setArchived,
  updateItem,
} from "./queries/items";
import {
  addLinkSchema,
  changeStatusSchema,
  createItemSchema,
  parse,
  updateItemSchema,
} from "./validation";

// The routes: only the web side of things. Each one reads the request, has it
// checked by validation.ts, calls one function from the query layer, and sends
// the answer. The rules and the SQL live elsewhere.

export const items = new Hono<AppEnv>();

// Anything that changes data must say it is JSON. Browsers only send this
// content type from a script on the app's own page, not from a form on another
// website, so requiring it blocks that kind of forged request.
// Media types are not case sensitive, so "Application/JSON" is valid too.
items.use("*", async (c, next) => {
  if (c.req.method === "GET" || c.req.method === "HEAD") {
    return next();
  }
  if (!c.req.header("Content-Type")?.toLowerCase().startsWith("application/json")) {
    return c.json({ error: "Send the request as JSON." }, 415);
  }
  return next();
});

type Ctx = Context<AppEnv>;

const notFound = (c: Ctx) => c.json({ error: "Not found." }, 404);

/** Reads an id from the address. Anything that is not a plain whole number cannot be an item. */
function idFrom(value: string | undefined): number | null {
  if (value === undefined || !/^\d{1,15}$/.test(value)) return null;
  return Number(value);
}

/** Reads the JSON body and checks it against a schema. */
async function readBody<T>(
  c: Ctx,
  schema: z.ZodType<T>,
): Promise<{ data: T } | { response: Response }> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return { response: c.json({ error: "The request body is not valid JSON." }, 400) };
  }
  const parsed = parse(schema, body);
  if ("error" in parsed) {
    return { response: c.json({ error: parsed.error }, 400) };
  }
  return parsed;
}

/** Today's date in UTC as YYYY-MM-DD. The screen can send the phone's own date instead. */
const today = () => new Date().toISOString().slice(0, 10);

items.get("/", async (c) => {
  const includeArchived = c.req.query("archived") === "true";
  return c.json({ items: await listItems(c.env.DB, { includeArchived }) });
});

items.get("/:id", async (c) => {
  const id = idFrom(c.req.param("id"));
  const item = id === null ? null : await getItem(c.env.DB, id);
  return item ? c.json({ item }) : notFound(c);
});

items.post("/", async (c) => {
  const body = await readBody(c, createItemSchema);
  if ("response" in body) return body.response;
  return c.json({ item: await createItem(c.env.DB, body.data) }, 201);
});

items.patch("/:id", async (c) => {
  const id = idFrom(c.req.param("id"));
  const body = await readBody(c, updateItemSchema);
  if ("response" in body) return body.response;
  const item = id === null ? null : await updateItem(c.env.DB, id, body.data);
  return item ? c.json({ item }) : notFound(c);
});

items.post("/:id/status", async (c) => {
  const id = idFrom(c.req.param("id"));
  const body = await readBody(c, changeStatusSchema);
  if ("response" in body) return body.response;
  const { status, ...details } = body.data;
  const item = id === null ? null : await changeStatus(c.env.DB, id, status, details, today());
  return item ? c.json({ item }) : notFound(c);
});

items.post("/:id/archive", async (c) => {
  const id = idFrom(c.req.param("id"));
  const item = id === null ? null : await setArchived(c.env.DB, id, true);
  return item ? c.json({ item }) : notFound(c);
});

items.post("/:id/unarchive", async (c) => {
  const id = idFrom(c.req.param("id"));
  const item = id === null ? null : await setArchived(c.env.DB, id, false);
  return item ? c.json({ item }) : notFound(c);
});

items.post("/:id/links", async (c) => {
  const id = idFrom(c.req.param("id"));
  const body = await readBody(c, addLinkSchema);
  if ("response" in body) return body.response;
  const item = id === null ? null : await addLink(c.env.DB, id, body.data);
  return item ? c.json({ item }, 201) : notFound(c);
});

items.delete("/:id/links/:linkId", async (c) => {
  const id = idFrom(c.req.param("id"));
  const linkId = idFrom(c.req.param("linkId"));
  const item = id === null || linkId === null ? null : await removeLink(c.env.DB, id, linkId);
  return item ? c.json({ item }) : notFound(c);
});
