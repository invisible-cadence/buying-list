import type { Item, ItemType, Priority } from "../shared/items";
import type { ItemChanges } from "./api";
import { formatMoney, parseMoney } from "./format";

// The item page's form works with text, as typed. The API works with typed
// values. These two functions translate between them, and are plain so they
// can be tested without a screen.

/** The form's fields, as text in the boxes. An empty date or budget means none. */
export type FormValues = {
  title: string;
  notes: string;
  type: ItemType;
  priority: Priority;
  neededBy: string;
  budget: string;
};

/** Fills the form from an item. */
export function formValuesOf(item: Item): FormValues {
  return {
    title: item.title,
    notes: item.notes,
    type: item.type,
    priority: item.priority,
    neededBy: item.neededBy ?? "",
    budget: item.budgetCents === null ? "" : formatMoney(item.budgetCents),
  };
}

/**
 * Works out what to send when the form is saved: only the fields that differ
 * from the item, so a save never overwrites a field the person did not touch.
 * Gives back an error sentence instead when something typed cannot be sent.
 * An empty set of changes means there is nothing to save.
 */
export function changesFrom(
  item: Item,
  values: FormValues,
): { changes: ItemChanges } | { error: string } {
  const title = values.title.trim();
  if (title === "") return { error: "A title is required." };

  const budget = parseMoney(values.budget, "budget");
  if ("error" in budget) return budget;

  const neededBy = values.neededBy === "" ? null : values.neededBy;

  const changes: ItemChanges = {};
  if (title !== item.title) changes.title = title;
  if (values.notes !== item.notes) changes.notes = values.notes;
  if (values.type !== item.type) changes.type = values.type;
  if (values.priority !== item.priority) changes.priority = values.priority;
  if (neededBy !== item.neededBy) changes.neededBy = neededBy;
  if (budget.cents !== item.budgetCents) changes.budgetCents = budget.cents;
  return { changes };
}
