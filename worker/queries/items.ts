import type { Item, Link, Status } from "../../shared/items";
import { statusFields, type BoughtDetails } from "../status";
import type { CreateItemInput, UpdateItemInput } from "../validation";

// The query layer: the only file that contains SQL. The routes call these
// functions and never touch the database directly, so there is one place to
// look when a query is wrong, and one place the tests need to cover.
//
// Every value reaches SQL through a "?" placeholder, which the database fills
// in safely. Text from a caller is never joined into the SQL itself.
//
// Private items. Every function takes the viewer, the signed-in person's
// email, and every query that reads or changes an item includes VISIBLE, so
// it only ever matches items that are shared or that the viewer added. To
// anyone else a private item does not exist: they get null, which the routes
// turn into "Not found", exactly as for an item that was never there. The rule
// lives here, in the SQL, rather than in the routes, so no route can forget it.

/** Shared, or added by the viewer. Takes the viewer's email as its one "?". */
const VISIBLE = "(is_private = 0 OR added_by = ?)";

/** The columns of an item, renamed to the names the API uses. */
const ITEM_COLUMNS = `
  id, title, notes, status, type, priority,
  needed_by AS neededBy, budget_cents AS budgetCents,
  bought_on AS boughtOn, paid_cents AS paidCents, bought_from AS boughtFrom,
  added_by AS addedBy, is_private AS isPrivate,
  archived_at AS archivedAt, created_at AS createdAt, updated_at AS updatedAt`;

const LINK_COLUMNS = "id, item_id AS itemId, url, label, created_at AS createdAt";

/** An item as the database returns it. SQLite has no true or false, only 1 and 0. */
type ItemRow = Omit<Item, "links" | "isPrivate"> & { isPrivate: 0 | 1 };
type LinkRow = Link & { itemId: number };

function toItem(row: ItemRow, links: Link[]): Item {
  return { ...row, isPrivate: row.isPrivate === 1, links };
}

function toLink(row: LinkRow): Link {
  return { id: row.id, url: row.url, label: row.label, createdAt: row.createdAt };
}

/** The current time in the same format the database uses for its own timestamps. */
const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

/**
 * Lists the items the viewer may see, with their links, newest first.
 * Archived items are left out unless asked for.
 */
export async function listItems(
  db: D1Database,
  viewer: string,
  options: { includeArchived?: boolean } = {},
): Promise<Item[]> {
  const where = `WHERE ${VISIBLE}${options.includeArchived ? "" : " AND archived_at IS NULL"}`;
  // One round trip to the database for both queries.
  const [itemResult, linkResult] = await db.batch([
    db.prepare(`SELECT ${ITEM_COLUMNS} FROM items ${where} ORDER BY id DESC`).bind(viewer),
    // Only the links of the items being listed.
    db
      .prepare(
        `SELECT ${LINK_COLUMNS} FROM links WHERE item_id IN (SELECT id FROM items ${where}) ORDER BY id`,
      )
      .bind(viewer),
  ]);

  const linksByItem = new Map<number, Link[]>();
  for (const row of (linkResult?.results ?? []) as LinkRow[]) {
    const links = linksByItem.get(row.itemId) ?? [];
    links.push(toLink(row));
    linksByItem.set(row.itemId, links);
  }
  return ((itemResult?.results ?? []) as ItemRow[]).map((row) =>
    toItem(row, linksByItem.get(row.id) ?? []),
  );
}

/**
 * One item with its links, or null if there is no such item or the viewer may
 * not see it. Archived items are found too.
 */
export async function getItem(db: D1Database, viewer: string, id: number): Promise<Item | null> {
  const [itemResult, linkResult] = await db.batch([
    db.prepare(`SELECT ${ITEM_COLUMNS} FROM items WHERE id = ? AND ${VISIBLE}`).bind(id, viewer),
    db.prepare(`SELECT ${LINK_COLUMNS} FROM links WHERE item_id = ? ORDER BY id`).bind(id),
  ]);
  const row = (itemResult?.results as ItemRow[] | undefined)?.[0];
  // The links query does not check visibility itself, so its answer is only
  // used once the item query has found an item the viewer may see.
  if (!row) return null;
  return toItem(row, ((linkResult?.results ?? []) as LinkRow[]).map(toLink));
}

/** Adds an item, recording the viewer as the person who added it. It starts as an idea. */
export async function createItem(
  db: D1Database,
  viewer: string,
  input: CreateItemInput,
): Promise<Item> {
  const created = await db
    .prepare(
      `INSERT INTO items (title, notes, type, priority, needed_by, budget_cents, added_by, is_private)
       VALUES (?, COALESCE(?, ''), COALESCE(?, 'one_off'), COALESCE(?, 'normal'), ?, ?, ?, ?)
       RETURNING id`,
    )
    .bind(
      input.title,
      input.notes ?? null,
      input.type ?? null,
      input.priority ?? null,
      input.neededBy ?? null,
      input.budgetCents ?? null,
      viewer,
      input.isPrivate ? 1 : 0,
    )
    .first<{ id: number }>();
  const item = created && (await getItem(db, viewer, created.id));
  // RETURNING always gives the new row back. If it ever does not, say so
  // rather than telling the caller it worked.
  if (!item) {
    throw new Error("The item was inserted but the database did not return it.");
  }
  return item;
}

// The only columns an edit may change, and the field that names each one.
// Building the SET clause from this list, and never from the caller's own
// field names, is what keeps the SQL safe.
const EDITABLE_COLUMNS = {
  title: "title",
  notes: "notes",
  type: "type",
  priority: "priority",
  neededBy: "needed_by",
  budgetCents: "budget_cents",
} as const;

/**
 * Changes some fields of an item and leaves the rest alone. A field set to
 * null (the date or the budget) is cleared. Returns null if there is no such
 * item, the viewer may not see it, or the change includes isPrivate and the
 * viewer did not add the item.
 *
 * The routes check who added the item first, to give a clear message. The
 * extra condition here means the database refuses it too.
 */
export async function updateItem(
  db: D1Database,
  viewer: string,
  id: number,
  changes: UpdateItemInput,
): Promise<Item | null> {
  const assignments: string[] = [];
  const values: unknown[] = [];
  for (const [field, column] of Object.entries(EDITABLE_COLUMNS)) {
    const value = changes[field as keyof typeof EDITABLE_COLUMNS];
    if (value !== undefined) {
      assignments.push(`${column} = ?`);
      values.push(value);
    }
  }
  if (changes.isPrivate !== undefined) {
    assignments.push("is_private = ?");
    values.push(changes.isPrivate ? 1 : 0);
  }
  if (assignments.length === 0) {
    // Nothing to change. Validation stops this earlier, so reaching here is a mistake in the caller.
    throw new Error("updateItem was called with no changes.");
  }
  return updateAndReturn(db, viewer, id, `${assignments.join(", ")}, updated_at = ${NOW}`, values, {
    addedByViewer: changes.isPrivate !== undefined,
  });
}

/**
 * Moves an item to a new status, applying the rules in status.ts.
 * Returns null if there is no such item.
 *
 * @param today The date to record as the purchase date when none is given.
 */
export async function changeStatus(
  db: D1Database,
  viewer: string,
  id: number,
  to: Status,
  details: BoughtDetails,
  today: string,
): Promise<Item | null> {
  const current = await getItem(db, viewer, id);
  if (!current) return null;
  const fields = statusFields(to, details, current, today);
  return updateAndReturn(
    db,
    viewer,
    id,
    `status = ?, bought_on = ?, paid_cents = ?, bought_from = ?, updated_at = ${NOW}`,
    [fields.status, fields.boughtOn, fields.paidCents, fields.boughtFrom],
  );
}

/** Archives an item, or brings it back. Doing either twice changes nothing. */
export async function setArchived(
  db: D1Database,
  viewer: string,
  id: number,
  archived: boolean,
): Promise<Item | null> {
  const assignment = archived
    ? `archived_at = COALESCE(archived_at, ${NOW})`
    : "archived_at = NULL";
  return updateAndReturn(db, viewer, id, `${assignment}, updated_at = ${NOW}`, []);
}

/**
 * Runs an UPDATE on one item the viewer may see, then returns the item as it
 * now is. With addedByViewer, it also requires the viewer to have added it.
 */
async function updateAndReturn(
  db: D1Database,
  viewer: string,
  id: number,
  set: string,
  values: unknown[],
  options: { addedByViewer?: boolean } = {},
): Promise<Item | null> {
  const owner = options.addedByViewer ? " AND added_by = ?" : "";
  const updated = await db
    .prepare(`UPDATE items SET ${set} WHERE id = ? AND ${VISIBLE}${owner} RETURNING id`)
    .bind(...values, id, viewer, ...(options.addedByViewer ? [viewer] : []))
    .first<{ id: number }>();
  return updated ? getItem(db, viewer, id) : null;
}

/**
 * Adds a link to an item. Returns the item as it now is, or null if there is
 * no such item or the viewer may not see it.
 */
export async function addLink(
  db: D1Database,
  viewer: string,
  itemId: number,
  link: { url: string; label?: string },
): Promise<Item | null> {
  // INSERT ... SELECT ... WHERE EXISTS adds the link only if the item exists
  // and the viewer may see it, in one step, so there is no gap in which that
  // could change.
  const added = await db
    .prepare(
      `INSERT INTO links (item_id, url, label)
       SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM items WHERE id = ? AND ${VISIBLE})
       RETURNING id`,
    )
    .bind(itemId, link.url, link.label ?? "", itemId, viewer)
    .first<{ id: number }>();
  return added ? getItem(db, viewer, itemId) : null;
}

/**
 * Removes a link from an item. The link must belong to that item, so a wrong
 * pair of ids removes nothing. Returns the item as it now is, or null if the
 * item has no such link or the viewer may not see the item.
 */
export async function removeLink(
  db: D1Database,
  viewer: string,
  itemId: number,
  linkId: number,
): Promise<Item | null> {
  const removed = await db
    .prepare(
      `DELETE FROM links
       WHERE id = ? AND item_id = ? AND EXISTS (SELECT 1 FROM items WHERE id = ? AND ${VISIBLE})
       RETURNING id`,
    )
    .bind(linkId, itemId, itemId, viewer)
    .first<{ id: number }>();
  return removed ? getItem(db, viewer, itemId) : null;
}
