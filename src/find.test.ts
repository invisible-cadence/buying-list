import { describe, expect, it } from "vitest";
import type { Item } from "../shared/items";
import { addDays, findItems, isNarrowed, isNeededSoon, NO_FILTERS } from "./find";

const TODAY = "2026-11-22";

/** An invented item. Only what a test sets matters. */
function item(id: number, fields: Partial<Item> = {}): Item {
  return {
    id,
    title: `Item ${id}`,
    notes: "",
    status: "idea",
    type: "one_off",
    priority: "normal",
    neededBy: null,
    budgetCents: null,
    boughtOn: null,
    paidCents: null,
    boughtFrom: "",
    addedBy: null,
    isPrivate: false,
    archivedAt: null,
    createdAt: "2026-11-21 10:00:00",
    updatedAt: "2026-11-21 10:00:00",
    links: [],
    ...fields,
  };
}

const ids = (items: Item[]) => items.map((i) => i.id);
const find = (items: Item[], options: Partial<typeof NO_FILTERS>) =>
  ids(findItems(items, { ...NO_FILTERS, ...options }, TODAY));

describe("findItems with no choices", () => {
  it("shows every item that is not archived, newest first", () => {
    const items = [item(1), item(3), item(2, { archivedAt: "2026-11-22 09:00:00" })];
    expect(find(items, {})).toEqual([3, 1]);
  });

  it("does not change the list it was given", () => {
    const items = [item(1), item(2)];
    findItems(items, NO_FILTERS, TODAY);
    expect(ids(items)).toEqual([1, 2]);
  });
});

describe("search", () => {
  const items = [
    item(1, { title: "Electric kettle" }),
    item(2, { title: "Toaster", notes: "Same colour as the KETTLE" }),
    item(3, { title: "Rain jacket" }),
  ];

  it("matches the title or the notes, ignoring case", () => {
    expect(find(items, { search: "Kettle" })).toEqual([2, 1]);
  });

  it("ignores spaces around the search", () => {
    expect(find(items, { search: "  jacket " })).toEqual([3]);
  });

  it("shows nothing when nothing matches", () => {
    expect(find(items, { search: "sofa" })).toEqual([]);
  });
});

describe("filters", () => {
  it("keeps one type", () => {
    const items = [item(1, { type: "gift" }), item(2, { type: "restock" })];
    expect(find(items, { type: "gift" })).toEqual([1]);
  });

  it("keeps one status", () => {
    const items = [item(1, { status: "decided" }), item(2, { status: "idea" })];
    expect(find(items, { status: "decided" })).toEqual([1]);
  });

  it("combines every choice, so an item must match them all", () => {
    const items = [
      item(1, { type: "gift", title: "Board game" }),
      item(2, { type: "gift", title: "Scarf" }),
      item(3, { type: "one_off", title: "Board game shelf" }),
    ];
    expect(find(items, { type: "gift", search: "board" })).toEqual([1]);
  });

  it("adds archived items when asked", () => {
    const items = [item(1), item(2, { archivedAt: "2026-11-22 09:00:00" })];
    expect(find(items, { showArchived: true })).toEqual([2, 1]);
  });
});

describe("isNeededSoon", () => {
  it("includes the last day of the window and leaves out the day after", () => {
    expect(isNeededSoon(item(1, { neededBy: addDays(TODAY, 14) }), TODAY)).toBe(true);
    expect(isNeededSoon(item(1, { neededBy: addDays(TODAY, 15) }), TODAY)).toBe(false);
  });

  it("includes overdue items", () => {
    expect(isNeededSoon(item(1, { neededBy: "2026-11-01" }), TODAY)).toBe(true);
  });

  it("leaves out items with no date, and items already bought", () => {
    expect(isNeededSoon(item(1), TODAY)).toBe(false);
    expect(isNeededSoon(item(1, { neededBy: TODAY, status: "bought" }), TODAY)).toBe(false);
  });
});

describe("addDays", () => {
  it("crosses months and years", () => {
    expect(addDays("2026-12-25", 14)).toBe("2027-01-08");
  });

  it("is not thrown off by the clocks changing", () => {
    // Clocks go back in much of Europe on 25 October 2026.
    expect(addDays("2026-10-20", 14)).toBe("2026-11-03");
  });
});

describe("sorting", () => {
  it("puts high priority first, then normal, then low, newest first within each", () => {
    const items = [
      item(1, { priority: "low" }),
      item(2, { priority: "high" }),
      item(3, { priority: "normal" }),
      item(4, { priority: "high" }),
    ];
    expect(find(items, { sort: "priority" })).toEqual([4, 2, 3, 1]);
  });

  it("puts the soonest needed-by date first and items with no date last", () => {
    const items = [
      item(1),
      item(2, { neededBy: "2027-01-10" }),
      item(3, { neededBy: "2026-12-01" }),
      item(4),
    ];
    expect(find(items, { sort: "needed_by" })).toEqual([3, 2, 4, 1]);
  });

  it("sorts A to Z ignoring case", () => {
    const items = [
      item(1, { title: "toaster" }),
      item(2, { title: "Apron" }),
      item(3, { title: "Kettle" }),
    ];
    expect(find(items, { sort: "title" })).toEqual([2, 3, 1]);
  });
});

describe("isNarrowed", () => {
  it("is false with no choices, and for sorting or showing archived items alone", () => {
    expect(isNarrowed(NO_FILTERS)).toBe(false);
    expect(isNarrowed({ ...NO_FILTERS, sort: "title", showArchived: true })).toBe(false);
  });

  it("is true for any choice that hides items", () => {
    expect(isNarrowed({ ...NO_FILTERS, search: "kettle" })).toBe(true);
    expect(isNarrowed({ ...NO_FILTERS, type: "gift" })).toBe(true);
    expect(isNarrowed({ ...NO_FILTERS, status: "idea" })).toBe(true);
    expect(isNarrowed({ ...NO_FILTERS, neededSoon: true })).toBe(true);
  });

  it("does not count a search of spaces", () => {
    expect(isNarrowed({ ...NO_FILTERS, search: "   " })).toBe(false);
  });
});
