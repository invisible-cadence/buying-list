import { describe, expect, it } from "vitest";
import { STATUSES } from "../shared/items";
import { statusFields } from "./status";

const TODAY = "2026-11-20";

// An item that has not been bought, and one that has.
const OPEN = { status: "researching", boughtOn: null, paidCents: null, boughtFrom: "" } as const;
const BOUGHT = {
  status: "bought",
  boughtOn: "2026-11-10",
  paidCents: 4999,
  boughtFrom: "Example Shop",
} as const;

describe("statusFields", () => {
  it("records the purchase when an item becomes bought", () => {
    const fields = statusFields(
      "bought",
      { boughtOn: "2026-11-18", paidCents: 4999, boughtFrom: "Example Shop" },
      OPEN,
      TODAY,
    );
    expect(fields).toEqual({
      status: "bought",
      boughtOn: "2026-11-18",
      paidCents: 4999,
      boughtFrom: "Example Shop",
    });
  });

  it("uses today's date when no purchase date is given", () => {
    expect(statusFields("bought", {}, OPEN, TODAY)).toEqual({
      status: "bought",
      boughtOn: TODAY,
      paidCents: null,
      boughtFrom: "",
    });
  });

  it("clears the purchase details for every status other than bought", () => {
    for (const status of STATUSES.filter((s) => s !== "bought")) {
      expect(statusFields(status, {}, BOUGHT, TODAY)).toEqual({
        status,
        boughtOn: null,
        paidCents: null,
        boughtFrom: "",
      });
    }
  });

  it("keeps the purchase details when an item that is already bought is marked bought again", () => {
    expect(statusFields("bought", {}, BOUGHT, TODAY)).toEqual({
      status: "bought",
      boughtOn: "2026-11-10",
      paidCents: 4999,
      boughtFrom: "Example Shop",
    });
  });

  it("changes only the details it is given when marking bought again", () => {
    expect(statusFields("bought", { paidCents: 4500 }, BOUGHT, TODAY)).toEqual({
      status: "bought",
      boughtOn: "2026-11-10",
      paidCents: 4500,
      boughtFrom: "Example Shop",
    });
  });
});
