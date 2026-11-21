// What the front end and the Worker must agree on. Both import from here, so
// there is one place to change. Keep this file free of code that only runs in
// a browser or only on the Worker, because both sides compile it.

/** The longest title an item may have. The Worker enforces it; the screen uses it to stop typing. */
export const MAX_TITLE_LENGTH = 200;
export const MAX_NOTES_LENGTH = 2000;
export const MAX_URL_LENGTH = 2000;
/** The longest link label and the longest shop name. */
export const MAX_LABEL_LENGTH = 200;

/** Where an item is on its way from idea to bought, in order. */
export const STATUSES = [
  "idea",
  "researching",
  "decided",
  "waiting_for_money",
  "ready_to_buy",
  "bought",
] as const;
export type Status = (typeof STATUSES)[number];

export const ITEM_TYPES = ["one_off", "restock", "gift", "seasonal"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const PRIORITIES = ["low", "normal", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

/** A web address attached to an item. */
export type Link = {
  id: number;
  url: string;
  /** Optional short name for the link. Empty when there is none. */
  label: string;
  createdAt: string;
};

/**
 * An item as the API sends it.
 *
 * Dates are YYYY-MM-DD text. Money is a whole number of cents. A field that
 * may be missing is null, never left out, so the shape is always the same.
 */
export type Item = {
  id: number;
  title: string;
  notes: string;
  status: Status;
  type: ItemType;
  priority: Priority;
  neededBy: string | null;
  budgetCents: number | null;
  /** The three bought fields are only set while the status is "bought". */
  boughtOn: string | null;
  paidCents: number | null;
  boughtFrom: string;
  /** Set when the item is archived. Archived items leave the list. */
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  links: Link[];
};
