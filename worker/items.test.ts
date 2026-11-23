import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./index";
import type { Bindings } from "./env";
import type { Item } from "../shared/items";
import { createTestDatabase, type TestDatabase } from "./test-support/database";

// These tests send requests through the whole app to a real (local) database.
// The sign-in check is switched off for localhost, as it is during development.

/** Two invented people who share the list. Requests are Alex's unless a test says otherwise. */
const ALEX = "alex@example.com";
const SAM = "sam@example.com";

let database: TestDatabase;
let env: Bindings;
const app = createApp();

beforeAll(async () => {
  database = await createTestDatabase();
  env = { DEV_SKIP_ACCESS: "true", DEV_USER_EMAIL: ALEX, DB: database.db } as Bindings;
});

afterAll(async () => {
  await database.dispose();
});

beforeEach(async () => {
  await database.reset();
});

async function send(
  method: string,
  path: string,
  body?: unknown,
  contentType = "application/json",
  viewer = ALEX,
) {
  return await app.request(
    `http://localhost/api/items${path}`,
    {
      method,
      headers: { "Content-Type": contentType },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    },
    // Locally, who is signed in comes from DEV_USER_EMAIL, so each person is a
    // different setting.
    { ...env, DEV_USER_EMAIL: viewer },
  );
}

/** Sends a request as Sam. */
const asSam = (method: string, path: string, body?: unknown) =>
  send(method, path, body, "application/json", SAM);

async function itemFrom(response: Response): Promise<Item> {
  return (await response.json<{ item: Item }>()).item;
}

async function addItem(title = "Kettle"): Promise<Item> {
  const response = await send("POST", "", { title });
  expect(response.status).toBe(201);
  return itemFrom(response);
}

describe("an item's journey from idea to bought", () => {
  it("can be created, given a link and notes, moved through the statuses and bought", async () => {
    const created = await addItem();
    expect(created.status).toBe("idea");

    const withLink = await send("POST", `/${created.id}/links`, {
      url: "https://shop.example/kettle",
      label: "Kettle page",
    });
    expect(withLink.status).toBe(201);
    expect((await itemFrom(withLink)).links).toHaveLength(1);

    const edited = await send("PATCH", `/${created.id}`, {
      notes: "Quiet one",
      budgetCents: 6000,
      neededBy: "2026-12-24",
    });
    expect(edited.status).toBe(200);

    expect(
      (await itemFrom(await send("POST", `/${created.id}/status`, { status: "researching" })))
        .status,
    ).toBe("researching");
    expect(
      (await itemFrom(await send("POST", `/${created.id}/status`, { status: "ready_to_buy" })))
        .status,
    ).toBe("ready_to_buy");

    const bought = await itemFrom(
      await send("POST", `/${created.id}/status`, {
        status: "bought",
        paidCents: 4999,
        boughtFrom: "Example Shop",
      }),
    );
    expect(bought).toMatchObject({
      status: "bought",
      notes: "Quiet one",
      budgetCents: 6000,
      paidCents: 4999,
      boughtFrom: "Example Shop",
    });
    expect(bought.boughtOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(bought.links).toHaveLength(1);

    const fetched = await itemFrom(await send("GET", `/${created.id}`));
    expect(fetched).toEqual(bought);
  });

  it("leaves the list when archived, and returns when restored", async () => {
    const created = await addItem();
    const archive = await send("POST", `/${created.id}/archive`);
    expect(archive.status).toBe(200);
    expect((await itemFrom(archive)).archivedAt).not.toBeNull();

    const listed = async (query = "") =>
      (await (await send("GET", query)).json<{ items: Item[] }>()).items;
    expect(await listed()).toHaveLength(0);
    expect(await listed("?archived=true")).toHaveLength(1);

    await send("POST", `/${created.id}/unarchive`);
    expect(await listed()).toHaveLength(1);
  });

  it("can have a link removed", async () => {
    const created = await addItem();
    const withLink = await itemFrom(
      await send("POST", `/${created.id}/links`, { url: "https://shop.example" }),
    );
    const response = await send("DELETE", `/${created.id}/links/${withLink.links[0]!.id}`);
    expect(response.status).toBe(200);
    expect((await itemFrom(response)).links).toEqual([]);
  });
});

describe("refusing bad requests", () => {
  it("refuses a body that is not JSON", async () => {
    expect((await send("POST", "", "not json")).status).toBe(400);
  });

  it("refuses a request that does not say it is JSON, for every kind of change", async () => {
    const created = await addItem();
    const attempts = [
      send("POST", "", '{"title":"Kettle"}', "text/plain"),
      send("PATCH", `/${created.id}`, '{"title":"Kettle"}', "text/plain"),
      send("POST", `/${created.id}/archive`, undefined, "application/x-www-form-urlencoded"),
      send("DELETE", `/${created.id}/links/1`, undefined, "text/plain"),
    ];
    for (const response of await Promise.all(attempts)) {
      expect(response.status).toBe(415);
    }
    // Nothing was archived by the refused request.
    expect((await itemFrom(await send("GET", `/${created.id}`))).archivedAt).toBeNull();
  });

  it("answers 400, not a server error, for an address the URL parser accepts but the table would not", async () => {
    const created = await addItem();
    const response = await send("POST", `/${created.id}/links`, { url: "http:example.com" });
    expect(response.status).toBe(400);
  });

  it("answers 404 for an id that is not a number, even when the body is also wrong", async () => {
    for (const path of ["/abc", "/abc/status", "/abc/links"]) {
      const method = path === "/abc" ? "PATCH" : "POST";
      expect((await send(method, path, { nonsense: true })).status).toBe(404);
    }
  });

  it("keeps the purchase details when an item is marked bought a second time", async () => {
    const created = await addItem();
    await send("POST", `/${created.id}/status`, {
      status: "bought",
      boughtOn: "2026-11-10",
      paidCents: 4999,
      boughtFrom: "Example Shop",
    });
    const again = await itemFrom(await send("POST", `/${created.id}/status`, { status: "bought" }));
    expect(again).toMatchObject({
      boughtOn: "2026-11-10",
      paidCents: 4999,
      boughtFrom: "Example Shop",
    });
  });

  it("accepts the content type in any letter case", async () => {
    // Valid type, invalid body: the answer is 400 (bad body), not 415 (bad type).
    expect((await send("POST", "", "not json", "Application/JSON; charset=utf-8")).status).toBe(
      400,
    );
  });

  it("says what is wrong with the input", async () => {
    const blank = await send("POST", "", { title: "  " });
    expect(blank.status).toBe(400);
    expect(await blank.json()).toEqual({ error: "A title is required." });

    const created = await addItem();
    const badStatus = await send("POST", `/${created.id}/status`, { status: "lost" });
    expect(badStatus.status).toBe(400);
    const stray = await send("POST", `/${created.id}/status`, { status: "decided", paidCents: 5 });
    expect(stray.status).toBe(400);
    const badLink = await send("POST", `/${created.id}/links`, { url: "javascript:alert(1)" });
    expect(badLink.status).toBe(400);
    const emptyEdit = await send("PATCH", `/${created.id}`, {});
    expect(emptyEdit.status).toBe(400);
  });

  it("changes nothing when the input is refused", async () => {
    const created = await addItem();
    await send("PATCH", `/${created.id}`, { title: "Changed", budgetCents: -5 });
    expect((await itemFrom(await send("GET", `/${created.id}`))).title).toBe("Kettle");
  });

  it("answers 404 for an item or link that does not exist, or an id that is not a number", async () => {
    const created = await addItem();
    const missing = [
      send("GET", "/999"),
      send("GET", "/abc"),
      send("PATCH", "/999", { title: "x" }),
      send("POST", "/999/status", { status: "idea" }),
      send("POST", "/999/archive"),
      send("POST", "/999/links", { url: "https://shop.example" }),
      send("DELETE", `/${created.id}/links/999`),
      send("DELETE", `/${created.id}/links/abc`),
    ];
    for (const response of await Promise.all(missing)) {
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Not found." });
    }
  });
});

describe("deleting an item", () => {
  it("deletes it for good, answering with no content", async () => {
    const item = await addItem();
    const response = await send("DELETE", `/${item.id}`);
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect((await send("GET", `/${item.id}`)).status).toBe(404);
  });

  it("answers Not found for an item that is not there, or an id that is not a number", async () => {
    for (const path of ["/999", "/abc"]) {
      const response = await send("DELETE", path);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Not found." });
    }
  });

  it("refuses a delete that does not say it is JSON, like every other change", async () => {
    const item = await addItem();
    expect((await send("DELETE", `/${item.id}`, undefined, "text/plain")).status).toBe(415);
    expect((await send("GET", `/${item.id}`)).status).toBe(200);
  });
});

describe("who is signed in, and private items", () => {
  async function alexsSecret(): Promise<Item> {
    const response = await send("POST", "", { title: "Present for Sam", isPrivate: true });
    expect(response.status).toBe(201);
    const item = await itemFrom(response);
    return itemFrom(await send("POST", `/${item.id}/links`, { url: "https://shop.example/p" }));
  }

  it("says who is signed in", async () => {
    const response = await app.request("http://localhost/api/me", {}, env);
    expect(await response.json()).toEqual({ email: ALEX });
  });

  it("records the signed-in person as the one who added an item", async () => {
    expect(await addItem()).toMatchObject({ addedBy: ALEX, isPrivate: false });
  });

  it("refuses an attempt to say who added an item", async () => {
    const response = await send("POST", "", { title: "Kettle", addedBy: SAM });
    expect(response.status).toBe(400);
  });

  it("answers Not found to anyone else, for every route that takes the item", async () => {
    const secret = await alexsSecret();
    const linkId = secret.links[0]!.id;
    const attempts = [
      asSam("GET", `/${secret.id}`),
      asSam("PATCH", `/${secret.id}`, { title: "Found it" }),
      asSam("PATCH", `/${secret.id}`, { isPrivate: false }),
      asSam("POST", `/${secret.id}/status`, { status: "bought" }),
      asSam("POST", `/${secret.id}/archive`),
      asSam("POST", `/${secret.id}/unarchive`),
      asSam("POST", `/${secret.id}/links`, { url: "https://shop.example/x" }),
      asSam("DELETE", `/${secret.id}/links/${linkId}`),
      asSam("DELETE", `/${secret.id}`),
    ];
    for (const response of await Promise.all(attempts)) {
      expect(response.status).toBe(404);
      // The same answer as for an item that was never there, so nothing is given away.
      expect(await response.json()).toEqual({ error: "Not found." });
    }
    // And Alex's item is exactly as it was.
    expect(await itemFrom(await send("GET", `/${secret.id}`))).toEqual(secret);
  });

  it("leaves a private item out of everyone else's list, archived or not", async () => {
    const secret = await alexsSecret();
    const sams = async (query: string) =>
      (await (await asSam("GET", query)).json<{ items: Item[] }>()).items;
    expect(await sams("")).toEqual([]);
    expect(await sams("?archived=true")).toEqual([]);
    const alexs = (await (await send("GET", "")).json<{ items: Item[] }>()).items;
    expect(alexs.map((i) => i.id)).toEqual([secret.id]);
  });

  it("explains, with 403, why someone else cannot make a shared item private", async () => {
    const shared = await addItem();
    const response = await asSam("PATCH", `/${shared.id}`, { isPrivate: true });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Only the person who added an item can change whether it is private.",
    });
    // Sam can still edit everything else about a shared item.
    expect((await asSam("PATCH", `/${shared.id}`, { notes: "Blue" })).status).toBe(200);
  });

  it("lets the person who added an item make it private, and shared again", async () => {
    const item = await addItem();
    const hidden = await send("PATCH", `/${item.id}`, { isPrivate: true });
    expect(await itemFrom(hidden)).toMatchObject({ isPrivate: true });
    expect((await asSam("GET", `/${item.id}`)).status).toBe(404);

    await send("PATCH", `/${item.id}`, { isPrivate: false });
    expect((await asSam("GET", `/${item.id}`)).status).toBe(200);
  });
});

describe("unknown API paths", () => {
  it("answer with a JSON error, not the front end", async () => {
    const response = await app.request("http://localhost/api/nothing", {}, env);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found." });
  });
});
