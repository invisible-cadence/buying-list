import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  addLink,
  changeStatus,
  createItem,
  getItem,
  listItems,
  removeLink,
  setArchived,
  updateItem,
} from "./items";
import {
  applyMigration,
  createTestDatabase,
  migrationFiles,
  type TestDatabase,
} from "../test-support/database";

// These tests run the real queries against a real (local) D1 database with the
// real migrations applied. Everything is invented data.

let database: TestDatabase;
let db: D1Database;

beforeAll(async () => {
  database = await createTestDatabase();
  db = database.db;
});

afterAll(async () => {
  await database.dispose();
});

beforeEach(async () => {
  await database.reset();
});

/** Waits a few milliseconds, so two timestamps cannot be equal. */
const pause = () => new Promise((resolve) => setTimeout(resolve, 10));

describe("creating and reading items", () => {
  it("starts an item as an idea with sensible defaults", async () => {
    const item = await createItem(db, { title: "Kettle" });
    expect(item).toMatchObject({
      title: "Kettle",
      notes: "",
      status: "idea",
      type: "one_off",
      priority: "normal",
      neededBy: null,
      budgetCents: null,
      boughtOn: null,
      paidCents: null,
      boughtFrom: "",
      archivedAt: null,
      links: [],
    });
    expect(item.createdAt).toBe(item.updatedAt);
  });

  it("keeps every field it is given", async () => {
    const item = await createItem(db, {
      title: "Kettle",
      notes: "Quiet one",
      type: "gift",
      priority: "high",
      neededBy: "2026-12-24",
      budgetCents: 6000,
    });
    expect(item).toMatchObject({
      notes: "Quiet one",
      type: "gift",
      priority: "high",
      neededBy: "2026-12-24",
      budgetCents: 6000,
    });
  });

  it("finds an item by id, and says so when there is none", async () => {
    const created = await createItem(db, { title: "Kettle" });
    expect(await getItem(db, created.id)).toEqual(created);
    expect(await getItem(db, created.id + 1000)).toBeNull();
  });

  it("lists the newest item first", async () => {
    await createItem(db, { title: "First" });
    await createItem(db, { title: "Second" });
    const titles = (await listItems(db)).map((item) => item.title);
    expect(titles).toEqual(["Second", "First"]);
  });

  it("returns each item with its own links only", async () => {
    const kettle = await createItem(db, { title: "Kettle" });
    const toaster = await createItem(db, { title: "Toaster" });
    await addLink(db, kettle.id, { url: "https://shop.example/kettle" });
    await addLink(db, toaster.id, { url: "https://shop.example/toaster" });

    const byTitle = Object.fromEntries(
      (await listItems(db)).map((item) => [item.title, item.links.map((l) => l.url)]),
    );
    expect(byTitle).toEqual({
      Kettle: ["https://shop.example/kettle"],
      Toaster: ["https://shop.example/toaster"],
    });
  });
});

describe("editing", () => {
  it("changes only the fields it is given", async () => {
    const created = await createItem(db, {
      title: "Kettle",
      notes: "Quiet one",
      budgetCents: 6000,
    });
    const edited = await updateItem(db, created.id, { title: "Electric kettle" });
    expect(edited).toMatchObject({
      title: "Electric kettle",
      notes: "Quiet one",
      budgetCents: 6000,
    });
  });

  it("clears a date or budget when given null", async () => {
    const created = await createItem(db, {
      title: "Kettle",
      neededBy: "2026-12-24",
      budgetCents: 6000,
    });
    const edited = await updateItem(db, created.id, { neededBy: null, budgetCents: null });
    expect(edited).toMatchObject({ neededBy: null, budgetCents: null });
  });

  it("updates the time it was last changed, and leaves the time it was created", async () => {
    const created = await createItem(db, { title: "Kettle" });
    await pause();
    const edited = await updateItem(db, created.id, { notes: "Quiet one" });
    expect(edited?.createdAt).toBe(created.createdAt);
    expect(edited!.updatedAt > created.updatedAt).toBe(true);
  });

  it("returns null for an item that does not exist", async () => {
    expect(await updateItem(db, 999, { title: "Nothing" })).toBeNull();
  });

  it("refuses to run with nothing to change, rather than writing broken SQL", async () => {
    const created = await createItem(db, { title: "Kettle" });
    await expect(updateItem(db, created.id, {})).rejects.toThrow("no changes");
  });

  it("treats text that looks like SQL as plain text", async () => {
    const nasty = "x'); DROP TABLE items; --";
    const created = await createItem(db, { title: nasty });
    expect((await getItem(db, created.id))?.title).toBe(nasty);
    expect(await listItems(db)).toHaveLength(1);
  });
});

describe("status", () => {
  it("records the purchase when an item becomes bought", async () => {
    const created = await createItem(db, { title: "Kettle" });
    const bought = await changeStatus(
      db,
      created.id,
      "bought",
      { boughtOn: "2026-11-18", paidCents: 4999, boughtFrom: "Example Shop" },
      "2026-11-20",
    );
    expect(bought).toMatchObject({
      status: "bought",
      boughtOn: "2026-11-18",
      paidCents: 4999,
      boughtFrom: "Example Shop",
    });
  });

  it("uses today's date when the purchase date is left out", async () => {
    const created = await createItem(db, { title: "Kettle" });
    const bought = await changeStatus(db, created.id, "bought", {}, "2026-11-20");
    expect(bought).toMatchObject({ boughtOn: "2026-11-20", paidCents: null });
  });

  it("clears the purchase details when an item moves back out of bought", async () => {
    const created = await createItem(db, { title: "Kettle" });
    await changeStatus(
      db,
      created.id,
      "bought",
      { paidCents: 4999, boughtFrom: "Shop" },
      "2026-11-20",
    );
    const back = await changeStatus(db, created.id, "researching", {}, "2026-11-21");
    expect(back).toMatchObject({
      status: "researching",
      boughtOn: null,
      paidCents: null,
      boughtFrom: "",
    });
  });

  it("lets an item move through every status, in any direction", async () => {
    const created = await createItem(db, { title: "Kettle" });
    for (const status of [
      "decided",
      "idea",
      "ready_to_buy",
      "waiting_for_money",
      "researching",
    ] as const) {
      expect((await changeStatus(db, created.id, status, {}, "2026-11-20"))?.status).toBe(status);
    }
  });

  it("returns null for an item that does not exist", async () => {
    expect(await changeStatus(db, 999, "bought", {}, "2026-11-20")).toBeNull();
  });
});

describe("archiving", () => {
  it("hides an archived item from the list, but it can still be found by id", async () => {
    const kept = await createItem(db, { title: "Kept" });
    const archived = await createItem(db, { title: "Archived" });
    await setArchived(db, archived.id, true);

    expect((await listItems(db)).map((item) => item.id)).toEqual([kept.id]);
    expect(await getItem(db, archived.id)).toMatchObject({ title: "Archived" });
  });

  it("includes archived items when asked", async () => {
    const item = await createItem(db, { title: "Archived" });
    await setArchived(db, item.id, true);
    expect(await listItems(db, { includeArchived: true })).toHaveLength(1);
  });

  it("keeps the status of an archived item, so a bought item stays bought", async () => {
    const created = await createItem(db, { title: "Kettle" });
    await changeStatus(db, created.id, "bought", {}, "2026-11-20");
    const archived = await setArchived(db, created.id, true);
    expect(archived).toMatchObject({ status: "bought", boughtOn: "2026-11-20" });
    expect(archived?.archivedAt).not.toBeNull();
  });

  it("brings an item back, and archiving twice changes nothing", async () => {
    const created = await createItem(db, { title: "Kettle" });
    const first = await setArchived(db, created.id, true);
    await pause();
    const second = await setArchived(db, created.id, true);
    expect(second?.archivedAt).toBe(first?.archivedAt);

    const restored = await setArchived(db, created.id, false);
    expect(restored?.archivedAt).toBeNull();
    expect(await listItems(db)).toHaveLength(1);
  });

  it("returns null for an item that does not exist", async () => {
    expect(await setArchived(db, 999, true)).toBeNull();
  });
});

describe("links", () => {
  it("adds links in the order they were added, with an optional label", async () => {
    const created = await createItem(db, { title: "Kettle" });
    await addLink(db, created.id, { url: "https://shop.example/a", label: "Shop A" });
    const item = await addLink(db, created.id, { url: "https://shop.example/b" });
    expect(item?.links.map((l) => [l.url, l.label])).toEqual([
      ["https://shop.example/a", "Shop A"],
      ["https://shop.example/b", ""],
    ]);
  });

  it("adds nothing and returns null when the item does not exist", async () => {
    expect(await addLink(db, 999, { url: "https://shop.example" })).toBeNull();
    const result = await db.prepare("SELECT count(*) AS n FROM links").first<{ n: number }>();
    expect(result?.n).toBe(0);
  });

  it("removes a link from its own item", async () => {
    const created = await createItem(db, { title: "Kettle" });
    const withLink = await addLink(db, created.id, { url: "https://shop.example" });
    const linkId = withLink!.links[0]!.id;
    expect((await removeLink(db, created.id, linkId))?.links).toEqual([]);
  });

  it("does not remove a link through the wrong item", async () => {
    const kettle = await createItem(db, { title: "Kettle" });
    const toaster = await createItem(db, { title: "Toaster" });
    const withLink = await addLink(db, kettle.id, { url: "https://shop.example" });
    const linkId = withLink!.links[0]!.id;

    expect(await removeLink(db, toaster.id, linkId)).toBeNull();
    expect((await getItem(db, kettle.id))?.links).toHaveLength(1);
  });

  it("returns null when the link does not exist", async () => {
    const created = await createItem(db, { title: "Kettle" });
    expect(await removeLink(db, created.id, 999)).toBeNull();
  });

  it("is deleted along with its item", async () => {
    const created = await createItem(db, { title: "Kettle" });
    await addLink(db, created.id, { url: "https://shop.example" });
    await db.prepare("DELETE FROM items WHERE id = ?").bind(created.id).run();
    const result = await db.prepare("SELECT count(*) AS n FROM links").first<{ n: number }>();
    expect(result?.n).toBe(0);
  });
});

describe("the rules the database enforces itself", () => {
  // The code above should never produce these. They are the last line of
  // defence, so each one is tried directly.
  const refused = (sql: string) => expect(db.prepare(sql).run()).rejects.toThrow();

  it("refuses an item that is bought without a purchase date", async () => {
    await refused("INSERT INTO items (title, status) VALUES ('Kettle', 'bought')");
  });

  it("refuses purchase details on an item that is not bought", async () => {
    await refused("INSERT INTO items (title, paid_cents) VALUES ('Kettle', 100)");
    await refused("INSERT INTO items (title, bought_from) VALUES ('Kettle', 'Shop')");
  });

  it("refuses a status, type or priority that is not on the list", async () => {
    await refused("INSERT INTO items (title, status) VALUES ('Kettle', 'lost')");
    await refused("INSERT INTO items (title, type) VALUES ('Kettle', 'gadget')");
    await refused("INSERT INTO items (title, priority) VALUES ('Kettle', 'urgent')");
  });

  it("refuses an impossible date and a negative amount", async () => {
    await refused("INSERT INTO items (title, needed_by) VALUES ('Kettle', '2026-02-30')");
    await refused("INSERT INTO items (title, budget_cents) VALUES ('Kettle', -1)");
  });

  it("refuses a link that is not a web address, and a link to a missing item", async () => {
    const created = await createItem(db, { title: "Kettle" });
    await refused(`INSERT INTO links (item_id, url) VALUES (${created.id}, 'javascript:alert(1)')`);
    await refused("INSERT INTO links (item_id, url) VALUES (999, 'https://shop.example')");
  });
});

describe("the migration", () => {
  it("keeps the items added in Phase 1, with their ids and dates", async () => {
    const [first, second] = migrationFiles();
    const old = await createTestDatabase(false);
    try {
      await applyMigration(old.db, first!);
      await old.db
        .prepare("INSERT INTO items (title) VALUES ('Old item one'), ('Old item two')")
        .run();
      const before = await old.db
        .prepare("SELECT id, title, created_at FROM items ORDER BY id")
        .all<{ id: number; title: string; created_at: string }>();

      await applyMigration(old.db, second!);

      const after = await old.db
        .prepare("SELECT id, title, status, created_at, updated_at FROM items ORDER BY id")
        .all<{
          id: number;
          title: string;
          status: string;
          created_at: string;
          updated_at: string;
        }>();
      expect(after.results.map((r) => [r.id, r.title, r.created_at])).toEqual(
        before.results.map((r) => [r.id, r.title, r.created_at]),
      );
      expect(after.results.every((r) => r.status === "idea")).toBe(true);
      expect(after.results.every((r) => r.updated_at === r.created_at)).toBe(true);
    } finally {
      await old.dispose();
    }
  });
});
