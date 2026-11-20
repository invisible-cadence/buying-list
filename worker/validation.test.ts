import { describe, expect, it } from "vitest";
import { MAX_NOTES_LENGTH, MAX_TITLE_LENGTH } from "../shared/items";
import {
  addLinkSchema,
  changeStatusSchema,
  createItemSchema,
  parse,
  updateItemSchema,
} from "./validation";

/** The message for the first problem, or undefined when the input is fine. */
function problem(schema: Parameters<typeof parse>[0], body: unknown): string | undefined {
  const result = parse(schema, body);
  return "error" in result ? result.error : undefined;
}

describe("creating an item", () => {
  it("accepts a title alone and trims the spaces around it", () => {
    expect(parse(createItemSchema, { title: "  Kettle  " })).toEqual({ data: { title: "Kettle" } });
  });

  it("accepts every optional field", () => {
    const body = {
      title: "Kettle",
      notes: "Quiet one",
      type: "restock",
      priority: "high",
      neededBy: "2026-12-24",
      budgetCents: 6000,
    };
    expect(parse(createItemSchema, body)).toEqual({ data: body });
  });

  it("rejects a missing, empty or blank title", () => {
    expect(problem(createItemSchema, {})).toBe("A title is required.");
    expect(problem(createItemSchema, { title: "" })).toBe("A title is required.");
    expect(problem(createItemSchema, { title: "   " })).toBe("A title is required.");
  });

  it("rejects a title that is not text", () => {
    expect(problem(createItemSchema, { title: 42 })).toBe("The title must be text.");
  });

  it("rejects a body that is not an object", () => {
    for (const body of [null, "Kettle", 42, ["Kettle"]]) {
      expect(problem(createItemSchema, body)).toBe("Send the data as a JSON object.");
    }
  });

  it("accepts the longest allowed title and notes, and rejects one character more", () => {
    expect(problem(createItemSchema, { title: "a".repeat(MAX_TITLE_LENGTH) })).toBeUndefined();
    expect(problem(createItemSchema, { title: "a".repeat(MAX_TITLE_LENGTH + 1) })).toMatch(
      /at most 200/,
    );
    const notes = "a".repeat(MAX_NOTES_LENGTH);
    expect(problem(createItemSchema, { title: "x", notes })).toBeUndefined();
    expect(problem(createItemSchema, { title: "x", notes: notes + "a" })).toMatch(/at most 2000/);
  });

  it("rejects a type or priority that is not on the list", () => {
    expect(problem(createItemSchema, { title: "x", type: "gadget" })).toMatch(/must be one of/);
    expect(problem(createItemSchema, { title: "x", priority: "urgent" })).toMatch(/must be one of/);
  });

  it("rejects dates that are not real dates", () => {
    for (const neededBy of ["2026-02-30", "24/12/2026", "tomorrow", "2026-13-01", 20261224]) {
      expect(problem(createItemSchema, { title: "x", neededBy })).toMatch(/real date/);
    }
  });

  it("rejects a budget that is negative, fractional or not a number", () => {
    expect(problem(createItemSchema, { title: "x", budgetCents: -1 })).toMatch(/negative/);
    expect(problem(createItemSchema, { title: "x", budgetCents: 10.5 })).toMatch(/whole number/);
    expect(problem(createItemSchema, { title: "x", budgetCents: "60" })).toMatch(/number/);
  });

  it("rejects a field it does not know, including the ones Phase 3 will add", () => {
    expect(problem(createItemSchema, { title: "x", isPrivate: true })).toMatch(/isPrivate/);
    expect(problem(createItemSchema, { title: "x", status: "bought" })).toMatch(/status/);
  });
});

describe("editing an item", () => {
  it("accepts any single field", () => {
    expect(parse(updateItemSchema, { notes: "New notes" })).toEqual({
      data: { notes: "New notes" },
    });
  });

  it("accepts null to clear the date or the budget", () => {
    const body = { neededBy: null, budgetCents: null };
    expect(parse(updateItemSchema, body)).toEqual({ data: body });
  });

  it("rejects an edit that changes nothing", () => {
    expect(problem(updateItemSchema, {})).toBe("Send at least one field to change.");
  });

  it("still checks each field it is given", () => {
    expect(problem(updateItemSchema, { title: "  " })).toBe("A title is required.");
  });
});

describe("changing status", () => {
  it("accepts every status", () => {
    expect(problem(changeStatusSchema, { status: "researching" })).toBeUndefined();
    expect(problem(changeStatusSchema, { status: "ready_to_buy" })).toBeUndefined();
  });

  it("rejects a status that is not on the list, or missing", () => {
    expect(problem(changeStatusSchema, { status: "archived" })).toMatch(/must be one of/);
    expect(problem(changeStatusSchema, {})).toMatch(/must be one of/);
  });

  it("accepts purchase details with bought, and trims the shop", () => {
    const body = {
      status: "bought",
      boughtOn: "2026-11-18",
      paidCents: 4999,
      boughtFrom: " Shop ",
    };
    expect(parse(changeStatusSchema, body)).toEqual({ data: { ...body, boughtFrom: "Shop" } });
  });

  it("rejects purchase details sent with any other status", () => {
    const expected = "Purchase details can only be sent with the status bought.";
    expect(problem(changeStatusSchema, { status: "decided", paidCents: 100 })).toBe(expected);
    expect(problem(changeStatusSchema, { status: "idea", boughtFrom: "Shop" })).toBe(expected);
  });
});

describe("adding a link", () => {
  it("accepts http and https addresses and trims them", () => {
    expect(parse(addLinkSchema, { url: " https://shop.example/kettle " })).toEqual({
      data: { url: "https://shop.example/kettle" },
    });
    expect(problem(addLinkSchema, { url: "http://shop.example" })).toBeUndefined();
  });

  it("rejects anything that is not a web address, including script and file addresses", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,hi",
      "file:///etc/passwd",
      "ftp://x.example",
      "shop.example",
      "",
      5,
    ]) {
      expect(problem(addLinkSchema, { url })).toBeDefined();
    }
  });

  it("rejects a link that is too long", () => {
    expect(problem(addLinkSchema, { url: "https://shop.example/" + "a".repeat(2000) })).toMatch(
      /at most 2000/,
    );
  });

  it("accepts an optional label", () => {
    const body = { url: "https://shop.example", label: "Kettle page" };
    expect(parse(addLinkSchema, body)).toEqual({ data: body });
  });
});
