import type { Item, Link, Status } from "../../shared/items";
import { statusFields, type BoughtDetails } from "../status";
import type { CreateItemInput, UpdateItemInput } from "../validation";

// The query layer: the only file that contains SQL. The routes call these
// functions and never touch the database directly, so there is one place to
// look when a query is wrong, and one place the tests need to cover.
//
// Every value reaches SQL through a "?" placeholder, which the database fills
// in safely. Text from a caller is never joined into the SQL itself.

/** The columns of an item, renamed to the names the API uses. */
const ITEM_COLUMNS = `
  id, title, notes, status, type, priority,
  needed_by AS neededBy, budget_cents AS budgetCents,
  bought_on AS boughtOn, paid_cents AS paidCents, bought_from AS boughtFrom,
  archived_at AS archivedAt, created_at AS createdAt, updated_at AS updatedAt`;

const LINK_COLUMNS = "id, item_id AS itemId, url, label, created_at AS createdAt";

type ItemRow = Omit<Item, "links">;
type LinkRow = Link & { itemId: number };

function toLink(row: LinkRow): Link {
  return { id: row.id, url: row.url, label: row.label, createdAt: row.createdAt };
}

/** The current time in the same format the database uses for its own timestamps. */
const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

/**
 * Lists items with their links, newest first. Archived items are left out
 * unless asked for.
 */
export async function listItems(
  db: D1Database,
  options: { includeArchived?: boolean } = {},
): Promise<Item[]> {
  const where = options.includeArchived ? "" : "WHERE archived_at IS NULL";
  // One round trip to the database for both queries.
  const [itemResult, linkResult] = await db.batch([
    db.prepare(`SELECT ${ITEM_COLUMNS} FROM items ${where} ORDER BY id DESC`),
    // Only the links of the items being listed, not those of archived items.
    db.prepare(
      `SELECT ${LINK_COLUMNS} FROM links WHERE item_id IN (SELECT id FROM items ${where}) ORDER BY id`,
    ),
  ]);

  const linksByItem = new Map<number, Link[]>();
  for (const row of (linkResult?.results ?? []) as LinkRow[]) {
    const links = linksByItem.get(row.itemId) ?? [];
    links.push(toLink(row));
    linksByItem.set(row.itemId, links);
  }
  return ((itemResult?.results ?? []) as ItemRow[]).map((row) => ({
    ...row,
    links: linksByItem.get(row.id) ?? [],
  }));
}

/** One item with its links, or null if there is no such item. Archived items are found too. */
export async function getItem(db: D1Database, id: number): Promise<Item | null> {
  const [itemResult, linkResult] = await db.batch([
    db.prepare(`SELECT ${ITEM_COLUMNS} FROM items WHERE id = ?`).bind(id),
    db.prepare(`SELECT ${LINK_COLUMNS} FROM links WHERE item_id = ? ORDER BY id`).bind(id),
  ]);
  const row = (itemResult?.results as ItemRow[] | undefined)?.[0];
  if (!row) return null;
  return { ...row, links: ((linkResult?.results ?? []) as LinkRow[]).map(toLink) };
}

/** Adds an item. It starts as an idea. */
export async function createItem(db: D1Database, input: CreateItemInput): Promise<Item> {
  const created = await db
    .prepare(
      `INSERT INTO items (title, notes, type, priority, needed_by, budget_cents)
       VALUES (?, COALESCE(?, ''), COALESCE(?, 'one_off'), COALESCE(?, 'normal'), ?, ?)
       RETURNING id`,
    )
    .bind(
      input.title,
      input.notes ?? null,
      input.type ?? null,
      input.priority ?? null,
      input.neededBy ?? null,
      input.budgetCents ?? null,
    )
    .first<{ id: number }>();
  const item = created && (await getItem(db, created.id));
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
 * null (the date or the budget) is cleared. Returns null if there is no such item.
 */
export async function updateItem(
  db: D1Database,
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
  if (assignments.length === 0) {
    // Nothing to change. Validation stops this earlier, so reaching here is a mistake in the caller.
    throw new Error("updateItem was called with no changes.");
  }
  return updateAndReturn(db, id, `${assignments.join(", ")}, updated_at = ${NOW}`, values);
}

/**
 * Moves an item to a new status, applying the rules in status.ts.
 * Returns null if there is no such item.
 *
 * @param today The date to record as the purchase date when none is given.
 */
export async function changeStatus(
  db: D1Database,
  id: number,
  to: Status,
  details: BoughtDetails,
  today: string,
): Promise<Item | null> {
  const current = await getItem(db, id);
  if (!current) return null;
  const fields = statusFields(to, details, current, today);
  return updateAndReturn(
    db,
    id,
    `status = ?, bought_on = ?, paid_cents = ?, bought_from = ?, updated_at = ${NOW}`,
    [fields.status, fields.boughtOn, fields.paidCents, fields.boughtFrom],
  );
}

/** Archives an item, or brings it back. Doing either twice changes nothing. */
export async function setArchived(
  db: D1Database,
  id: number,
  archived: boolean,
): Promise<Item | null> {
  const assignment = archived
    ? `archived_at = COALESCE(archived_at, ${NOW})`
    : "archived_at = NULL";
  return updateAndReturn(db, id, `${assignment}, updated_at = ${NOW}`, []);
}

/** Runs an UPDATE on one item, then returns the item as it now is. */
async function updateAndReturn(
  db: D1Database,
  id: number,
  set: string,
  values: unknown[],
): Promise<Item | null> {
  const updated = await db
    .prepare(`UPDATE items SET ${set} WHERE id = ? RETURNING id`)
    .bind(...values, id)
    .first<{ id: number }>();
  return updated ? getItem(db, id) : null;
}

/** Adds a link to an item. Returns the item as it now is, or null if there is no such item. */
export async function addLink(
  db: D1Database,
  itemId: number,
  link: { url: string; label?: string },
): Promise<Item | null> {
  // INSERT ... SELECT ... WHERE EXISTS adds the link only if the item exists,
  // in one step, so there is no gap in which the item could vanish.
  const added = await db
    .prepare(
      `INSERT INTO links (item_id, url, label)
       SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM items WHERE id = ?)
       RETURNING id`,
    )
    .bind(itemId, link.url, link.label ?? "", itemId)
    .first<{ id: number }>();
  return added ? getItem(db, itemId) : null;
}

/**
 * Removes a link from an item. The link must belong to that item, so a wrong
 * pair of ids removes nothing. Returns the item as it now is, or null if the
 * item has no such link.
 */
export async function removeLink(
  db: D1Database,
  itemId: number,
  linkId: number,
): Promise<Item | null> {
  const removed = await db
    .prepare("DELETE FROM links WHERE id = ? AND item_id = ? RETURNING id")
    .bind(linkId, itemId)
    .first<{ id: number }>();
  return removed ? getItem(db, itemId) : null;
}
