import { STATUSES, type Item, type Status } from "../shared/items";

export type StatusGroup = { status: Status; items: Item[] };

/**
 * Splits the list into one group per status, in the order an item travels
 * from idea to bought. Statuses with no items are left out, so the screen
 * shows no empty headings. Within a group, items keep the order they came in.
 * Archived items are left out too, because archiving hides an item.
 */
export function groupByStatus(items: readonly Item[]): StatusGroup[] {
  const shown = items.filter((item) => item.archivedAt === null);
  return STATUSES.map((status) => ({
    status,
    items: shown.filter((item) => item.status === status),
  })).filter((group) => group.items.length > 0);
}

/**
 * Puts the server's latest copy of an item into the list: in place of the old
 * copy, or at the top if the list did not have it, such as an archived item
 * brought back from its page.
 */
export function withLatest(items: readonly Item[], latest: Item): Item[] {
  return items.some((item) => item.id === latest.id)
    ? items.map((item) => (item.id === latest.id ? latest : item))
    : [latest, ...items];
}
