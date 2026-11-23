import { describe, expect, it } from "vitest";
import type { Item } from "../shared/items";
import { formatDate, formatMoney, localToday, parseMoney, summaryOf } from "./format";

describe("parseMoney", () => {
  it("reads whole numbers and decimals as exact cents", () => {
    expect(parseMoney("12")).toEqual({ cents: 1200 });
    expect(parseMoney("12.50")).toEqual({ cents: 1250 });
    expect(parseMoney("0.99")).toEqual({ cents: 99 });
  });

  it("reads one digit after the mark as tens of cents", () => {
    expect(parseMoney("12.5")).toEqual({ cents: 1250 });
  });

  it("avoids floating-point rounding", () => {
    // parseFloat("19.99") * 100 is 1998.9999999999998.
    expect(parseMoney("19.99")).toEqual({ cents: 1999 });
  });

  it("accepts a comma as the decimal mark", () => {
    expect(parseMoney("12,50")).toEqual({ cents: 1250 });
  });

  it("ignores spaces around the number", () => {
    expect(parseMoney("  7.20 ")).toEqual({ cents: 720 });
  });

  it("names the amount in its error", () => {
    expect(parseMoney("lots", "budget")).toEqual({
      error: "Write the budget as a number, such as 12 or 12.50.",
    });
  });

  it("treats an empty box as no price", () => {
    expect(parseMoney("")).toEqual({ cents: null });
    expect(parseMoney("   ")).toEqual({ cents: null });
  });

  it.each(["abc", "12.345", "-5", "1,000.00", "12.", ".5", "1e3", "1234567890"])(
    "refuses %j",
    (text) => {
      expect(parseMoney(text)).toHaveProperty("error");
    },
  );
});

describe("formatMoney", () => {
  it("always shows two decimals", () => {
    expect(formatMoney(1250)).toBe("12.50");
    expect(formatMoney(1200)).toBe("12.00");
    expect(formatMoney(5)).toBe("0.05");
    expect(formatMoney(0)).toBe("0.00");
  });

  it("reverses parseMoney", () => {
    expect(parseMoney(formatMoney(4999))).toEqual({ cents: 4999 });
  });
});

describe("localToday", () => {
  it("uses the local date, not the UTC one", () => {
    // Late evening locally. Built from parts, so it is local whatever the
    // time zone of the computer running the test.
    expect(localToday(new Date(2026, 11, 31, 23, 30))).toBe("2026-12-31");
  });

  it("pads the month and day", () => {
    expect(localToday(new Date(2027, 0, 5))).toBe("2027-01-05");
  });
});

describe("formatDate", () => {
  it("shows the same calendar day it was given", () => {
    expect(formatDate("2026-12-01", "en-GB")).toBe("1 Dec 2026");
  });

  it("gives back text it cannot read", () => {
    expect(formatDate("soon", "en-GB")).toBe("soon");
  });
});

describe("summaryOf", () => {
  const base: Item = {
    id: 1,
    title: "Electric kettle",
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
  };

  it("is empty for an item with nothing set", () => {
    expect(summaryOf(base)).toBe("");
  });

  it("shows the plans of an open item", () => {
    expect(summaryOf({ ...base, priority: "high", budgetCents: 6000 })).toBe(
      "High priority · Budget 60.00",
    );
  });

  it("reads as a sentence for a bought item, leaving out what is missing", () => {
    expect(
      summaryOf({ ...base, status: "bought", paidCents: 2499, boughtFrom: "Example Shop" }),
    ).toBe("Bought for 24.99 at Example Shop");
  });
});
