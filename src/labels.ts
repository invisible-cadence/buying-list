import type { ItemType, Priority, Status } from "../shared/items";
import type { SortOrder } from "./find";

// The names people read for the API's fixed words. The API speaks in words
// such as "waiting_for_money"; the screen shows "Waiting for money".

export const STATUS_LABELS: Record<Status, string> = {
  idea: "Idea",
  researching: "Researching",
  decided: "Decided",
  waiting_for_money: "Waiting for money",
  ready_to_buy: "Ready to buy",
  bought: "Bought",
};

export const TYPE_LABELS: Record<ItemType, string> = {
  one_off: "One-off",
  restock: "Restock",
  gift: "Gift",
  seasonal: "Seasonal",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
};

export const SORT_LABELS: Record<SortOrder, string> = {
  newest: "Newest first",
  priority: "Priority, high first",
  needed_by: "Needed-by date, soonest first",
  title: "A to Z",
};
