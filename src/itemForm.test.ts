import { describe, expect, it } from "vitest";
import type { Item } from "../shared/items";
import { changesFrom, formValuesOf } from "./itemForm";

/** An invented item with every optional field set. */
const item: Item = {
  id: 1,
  title: "Electric kettle",
  notes: "Quiet, one litre",
  status: "researching",
  type: "one_off",
  priority: "normal",
  neededBy: "2026-12-10",
  budgetCents: 6000,
  boughtOn: null,
  paidCents: null,
  boughtFrom: "",
  addedBy: null,
  isPrivate: false,
  archivedAt: null,
  createdAt: "2026-11-21 10:00:00",
  updatedAt: "2026-11-21 10:00:00",
  links: [],
};

describe("formValuesOf", () => {
  it("shows money as a price and missing values as empty boxes", () => {
    expect(formValuesOf(item).budget).toBe("60.00");
    const bare = formValuesOf({ ...item, neededBy: null, budgetCents: null });
    expect(bare.neededBy).toBe("");
    expect(bare.budget).toBe("");
  });
});

describe("changesFrom", () => {
  it("sends nothing when nothing was changed", () => {
    expect(changesFrom(item, formValuesOf(item))).toEqual({ changes: {} });
  });

  it("sends only the fields that changed", () => {
    const values = { ...formValuesOf(item), priority: "high" as const, notes: "Quiet" };
    expect(changesFrom(item, values)).toEqual({ changes: { priority: "high", notes: "Quiet" } });
  });

  it("treats a budget typed differently but worth the same as unchanged", () => {
    expect(changesFrom(item, { ...formValuesOf(item), budget: "60" })).toEqual({ changes: {} });
  });

  it("sends a new budget in cents", () => {
    expect(changesFrom(item, { ...formValuesOf(item), budget: "55,50" })).toEqual({
      changes: { budgetCents: 5550 },
    });
  });

  it("clears the date and budget when their boxes are emptied", () => {
    const values = { ...formValuesOf(item), neededBy: "", budget: "" };
    expect(changesFrom(item, values)).toEqual({ changes: { neededBy: null, budgetCents: null } });
  });

  it("trims the title, and does not count spaces alone as a change", () => {
    expect(changesFrom(item, { ...formValuesOf(item), title: "  Electric kettle " })).toEqual({
      changes: {},
    });
  });

  it("sends the private setting only when it changed", () => {
    expect(changesFrom(item, { ...formValuesOf(item), isPrivate: true })).toEqual({
      changes: { isPrivate: true },
    });
  });

  it("refuses an empty title", () => {
    expect(changesFrom(item, { ...formValuesOf(item), title: "   " })).toEqual({
      error: "A title is required.",
    });
  });

  it("refuses a budget it cannot read, naming the budget", () => {
    expect(changesFrom(item, { ...formValuesOf(item), budget: "about 50" })).toEqual({
      error: "Write the budget as a number, such as 12 or 12.50.",
    });
  });
});
