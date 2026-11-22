import { describe, expect, it } from "vitest";
import type { Item, Status } from "../shared/items";
import { groupByStatus, withLatest } from "./groups";

/** An invented item with sensible defaults. Only the id and status matter here. */
function item(id: number, status: Status): Item {
  return {
    id,
    title: `Item ${id}`,
    notes: "",
    status,
    type: "one_off",
    priority: "normal",
    neededBy: null,
    budgetCents: null,
    boughtOn: null,
    paidCents: null,
    boughtFrom: "",
    archivedAt: null,
    createdAt: "2026-11-21 10:00:00",
    updatedAt: "2026-11-21 10:00:00",
    links: [],
  };
}

describe("groupByStatus", () => {
  it("puts the groups in the order an item travels, whatever order the items come in", () => {
    const groups = groupByStatus([item(1, "bought"), item(2, "idea"), item(3, "ready_to_buy")]);
    expect(groups.map((group) => group.status)).toEqual(["idea", "ready_to_buy", "bought"]);
  });

  it("leaves out statuses that have no items", () => {
    const groups = groupByStatus([item(1, "decided")]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.status).toBe("decided");
  });

  it("keeps the order of items within a group", () => {
    const groups = groupByStatus([item(3, "idea"), item(1, "researching"), item(2, "idea")]);
    expect(groups[0]?.items.map((i) => i.id)).toEqual([3, 2]);
  });

  it("gives no groups for an empty list", () => {
    expect(groupByStatus([])).toEqual([]);
  });
});

describe("withLatest", () => {
  it("replaces the old copy of an item in place", () => {
    const moved = item(2, "bought");
    const list = withLatest([item(1, "idea"), item(2, "idea"), item(3, "idea")], moved);
    expect(list.map((i) => i.id)).toEqual([1, 2, 3]);
    expect(list[1]).toBe(moved);
  });

  it("adds an item the list did not have at the top", () => {
    const list = withLatest([item(1, "idea")], item(9, "decided"));
    expect(list.map((i) => i.id)).toEqual([9, 1]);
  });
});
