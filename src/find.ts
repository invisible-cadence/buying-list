import type { Item, ItemType, Priority, Status } from "../shared/items";

// Search, filters and sort for the list. Plain functions over the items the
// phone already has, so they need no server and can be tested on their own.

/** How far ahead "needed soon" looks. Overdue items count too. */
export const NEEDED_SOON_DAYS = 14;

export const SORT_ORDERS = ["newest", "priority", "needed_by", "title"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

/** What the person has chosen in the search box and the filter fold-out. */
export type FindOptions = {
  search: string;
  type: ItemType | "all";
  status: Status | "all";
  neededSoon: boolean;
  showArchived: boolean;
  sort: SortOrder;
};

/** Nothing chosen: every item that is not archived, newest first. */
export const NO_FILTERS: FindOptions = {
  search: "",
  type: "all",
  status: "all",
  neededSoon: false,
  showArchived: false,
  sort: "newest",
};

/**
 * True when a choice is hiding items that would otherwise show, so the screen
 * can say "Showing 3 of 20". Sorting hides nothing, and showing archived items
 * adds rather than hides, so neither counts.
 */
export function isNarrowed(options: FindOptions): boolean {
  return (
    options.search.trim() !== "" ||
    options.type !== "all" ||
    options.status !== "all" ||
    options.neededSoon
  );
}

/** A YYYY-MM-DD date moved by a number of days. */
export function addDays(isoDate: string, days: number): string {
  // Midday in UTC, so no time-zone or clock-change shift can move the day.
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * True for an item that is not yet bought and is needed within the next
 * NEEDED_SOON_DAYS days, or was needed by a date that has passed.
 * YYYY-MM-DD dates compare correctly as plain text.
 */
export function isNeededSoon(item: Item, today: string): boolean {
  return (
    item.status !== "bought" &&
    item.neededBy !== null &&
    item.neededBy <= addDays(today, NEEDED_SOON_DAYS)
  );
}

/** True when the search words appear in the title or notes, ignoring case. */
function matchesSearch(item: Item, search: string): boolean {
  const wanted = search.trim().toLocaleLowerCase();
  if (wanted === "") return true;
  return (
    item.title.toLocaleLowerCase().includes(wanted) ||
    item.notes.toLocaleLowerCase().includes(wanted)
  );
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

// Each comparison returns a negative number when a comes first. Ids only ever
// increase, so the larger id is the newer item, and every order falls back to
// newest first when two items are otherwise equal.
const newestFirst = (a: Item, b: Item) => b.id - a.id;

const COMPARE: Record<SortOrder, (a: Item, b: Item) => number> = {
  newest: newestFirst,
  priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || newestFirst(a, b),
  needed_by: (a, b) => {
    // Items with no date go after every item with one.
    if (a.neededBy === b.neededBy) return newestFirst(a, b);
    if (a.neededBy === null) return 1;
    if (b.neededBy === null) return -1;
    return a.neededBy < b.neededBy ? -1 : 1;
  },
  title: (a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" }) || newestFirst(a, b),
};

/**
 * The items to show, in order. Grouping by status happens afterwards, so the
 * order chosen here is the order within each status section.
 *
 * @param today The phone's date as YYYY-MM-DD, for "needed soon".
 */
export function findItems(items: readonly Item[], options: FindOptions, today: string): Item[] {
  return items
    .filter(
      (item) =>
        (options.showArchived || item.archivedAt === null) &&
        (options.type === "all" || item.type === options.type) &&
        (options.status === "all" || item.status === options.status) &&
        (!options.neededSoon || isNeededSoon(item, today)) &&
        matchesSearch(item, options.search),
    )
    .sort(COMPARE[options.sort]);
}
