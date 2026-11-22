import { STATUSES, type Item, type Status } from "../shared/items";

/** The name of each status as people read it. */
export const STATUS_LABELS: Record<Status, string> = {
  idea: "Idea",
  researching: "Researching",
  decided: "Decided",
  waiting_for_money: "Waiting for money",
  ready_to_buy: "Ready to buy",
  bought: "Bought",
};

export type StatusGroup = { status: Status; items: Item[] };

/**
 * Splits the list into one group per status, in the order an item travels
 * from idea to bought. Statuses with no items are left out, so the screen
 * shows no empty headings. Within a group, items keep the order they came in.
 */
export function groupByStatus(items: readonly Item[]): StatusGroup[] {
  return STATUSES.map((status) => ({
    status,
    items: items.filter((item) => item.status === status),
  })).filter((group) => group.items.length > 0);
}
