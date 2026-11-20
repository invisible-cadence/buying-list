import type { Status } from "../shared/items";

/** The details that go with a purchase. All optional when the caller sends them. */
export type BoughtDetails = {
  boughtOn?: string;
  paidCents?: number;
  boughtFrom?: string;
};

/** The columns that change when an item's status changes. */
export type StatusFields = {
  status: Status;
  boughtOn: string | null;
  paidCents: number | null;
  boughtFrom: string;
};

/**
 * Works out what an item looks like after moving to a new status.
 *
 * The rules:
 * - Any status can move to any other. Buying plans change, so going back from
 *   "ready to buy" to "researching" is allowed.
 * - Moving to "bought" records the purchase. The date defaults to today.
 * - Moving to anything else clears the purchase details.
 *
 * It is a plain function with no database, so the rules can be tested alone.
 * Whether bought details were sent with the wrong status is checked earlier,
 * in validation.ts.
 *
 * @param today The date to use when none was given, as YYYY-MM-DD.
 */
export function statusFields(to: Status, details: BoughtDetails, today: string): StatusFields {
  if (to !== "bought") {
    return { status: to, boughtOn: null, paidCents: null, boughtFrom: "" };
  }
  return {
    status: to,
    boughtOn: details.boughtOn ?? today,
    paidCents: details.paidCents ?? null,
    boughtFrom: details.boughtFrom ?? "",
  };
}
