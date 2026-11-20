# 0006: The item model and status rules

- **Date:** 2026-11-20
- **Status:** accepted

## What had to be decided

How an item is stored, and which rules govern its status, before any screen depends on them.

## Decision

- **Any status can move to any other.** The statuses are idea, researching, decided, waiting for money, ready to buy and bought. Buying plans go backwards, such as a decided item that turns out to be too expensive, and forbidding that would make the app fight the person using it.
- **Bought details belong to the bought status.** Moving to bought records a date (today unless one is given), and optionally the price paid and the shop. Moving to any other status clears them. The code applies this rule, and the table also refuses an item that is bought without a date or has purchase details without being bought.
- **Archiving is a separate column, not a status.** An archived item remembers whether it was bought, and can be restored to exactly where it was.
- **Money is a whole number of cents, with no currency column.** Decimals invite rounding errors, and one deployment is one household with one currency.
- **Dates are text in the form `YYYY-MM-DD`, times are ISO 8601 in UTC.** SQLite has no date type. This form sorts correctly as text and the database can check that a date is real.
- **Status, type and priority are text with a list of allowed values enforced by the table.** An alternative is a lookup table for each. Four fixed lists do not need one, and the lists live in `shared/items.ts` for the screen to use.
- **Links are a separate table**, one row per link, removed with their item. An item can have any number of them.
- **The columns for who added an item and whether it is private exist now, but nothing sets or reads them until Phase 3.** The migration happens once, and the API refuses a request that mentions them, so there is no privacy setting that looks like it works and does not.
- **Only web addresses are accepted as links.** A link that starts with `javascript:` could run code if a screen ever made it clickable, so the API and the table both refuse anything but `http://` and `https://`.
- **The migration rebuilds the `items` table** rather than adding columns, because SQLite cannot add most kinds of rule to an existing table. Rows from Phase 1 keep their ids and dates and start as ideas.

## What would change this decision

- Real use showing that a forward-only status order is wanted after all.
- A second currency, which would need a currency column.
- Phase 3 finding that the private and added-by columns need a different shape.
