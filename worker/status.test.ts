import { describe, expect, it } from "vitest";
import { STATUSES } from "../shared/items";
import { statusFields } from "./status";

const TODAY = "2026-11-20";

describe("statusFields", () => {
  it("records the purchase when an item becomes bought", () => {
    const fields = statusFields(
      "bought",
      { boughtOn: "2026-11-18", paidCents: 4999, boughtFrom: "Example Shop" },
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
    expect(statusFields("bought", {}, TODAY)).toEqual({
      status: "bought",
      boughtOn: TODAY,
      paidCents: null,
      boughtFrom: "",
    });
  });

  it("clears the purchase details for every status other than bought", () => {
    for (const status of STATUSES.filter((s) => s !== "bought")) {
      expect(statusFields(status, {}, TODAY)).toEqual({
        status,
        boughtOn: null,
        paidCents: null,
        boughtFrom: "",
      });
    }
  });
});
