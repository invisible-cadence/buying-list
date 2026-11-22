import type { Item } from "../shared/items";

// Turning the API's plain values into text for people, and back. Plain
// functions with no React, so they can be tested on their own.

/** Most whole-unit digits a typed price may have. Far beyond any real purchase. */
const MAX_WHOLE_DIGITS = 9;

/**
 * Reads a price typed by a person, such as "12", "12.5" or "12,50", as whole
 * cents. A comma works as the decimal mark too, because many phone keyboards
 * offer one. An empty box means no amount, which is allowed.
 *
 * @param what What the amount is, for the error message, such as "budget".
 *
 * The text is read digit by digit rather than with parseFloat, because
 * 0.1 + 0.2 is not exactly 0.3 in floating point, and money must be exact.
 */
export function parseMoney(
  text: string,
  what = "price",
): { cents: number | null } | { error: string } {
  const trimmed = text.trim();
  if (trimmed === "") return { cents: null };

  const match = new RegExp(`^(\\d{1,${MAX_WHOLE_DIGITS}})(?:[.,](\\d{1,2}))?$`).exec(trimmed);
  if (!match) {
    return { error: `Write the ${what} as a number, such as 12 or 12.50.` };
  }
  const whole = Number(match[1]);
  // "12.5" means 12.50, so a single digit after the mark is tens of cents.
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  return { cents: whole * 100 + fraction };
}

/** Shows whole cents as a price with two decimals, such as 1250 as "12.50". */
export function formatMoney(cents: number): string {
  const whole = Math.floor(cents / 100);
  const fraction = String(cents % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}

/**
 * Today's date where the phone is, as YYYY-MM-DD. The server's "today" is in
 * UTC, which is a day off late in the evening in some places, so the screen
 * sends its own.
 */
export function localToday(now: Date = new Date()): string {
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Shows a YYYY-MM-DD date in the phone's own style, such as "1 Dec 2026".
 *
 * @param locale Which language's style to use. Left out, the phone's own.
 */
export function formatDate(isoDate: string, locale?: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return isoDate;
  // Built from parts, the date is midnight where the phone is. Reading the
  // text directly would make it midnight in UTC, which shows as the previous
  // day in places behind UTC.
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** The short line under the title: what was paid for a bought item, otherwise the plans. */
export function summaryOf(item: Item): string {
  if (item.status === "bought") {
    // Reads as a sentence, such as "Bought for 24.99 at Example Shop on 20 Nov 2026".
    const parts = ["Bought"];
    if (item.paidCents !== null) parts.push(`for ${formatMoney(item.paidCents)}`);
    if (item.boughtFrom !== "") parts.push(`at ${item.boughtFrom}`);
    if (item.boughtOn !== null) parts.push(`on ${formatDate(item.boughtOn)}`);
    return parts.join(" ");
  }
  const parts: string[] = [];
  if (item.priority === "high") parts.push("High priority");
  if (item.budgetCents !== null) parts.push(`Budget ${formatMoney(item.budgetCents)}`);
  if (item.neededBy !== null) parts.push(`Needed by ${formatDate(item.neededBy)}`);
  return parts.join(" · ");
}
