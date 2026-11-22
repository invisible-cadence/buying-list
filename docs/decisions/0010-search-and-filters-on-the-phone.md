# 0010: Search, filters and sort run on the phone

- **Date:** 2026-11-22
- **Status:** accepted

## What had to be decided

The list needs a search over titles and notes, filters by type, status and "needed soon", a choice of sort order, and a way to show archived items. Should the server do this, with the screen asking for a filtered list each time, or should the phone do it over the list it already has?

## Decision

The phone does it. The list is loaded once, archived items included, and `src/find.ts` filters and sorts it in plain functions with tests. The server's API is unchanged; the screen uses its existing `?archived=true` option.

"Needed soon" means a needed-by date in the next 14 days or already passed, for items not yet bought. Sorting applies within each status section. The choices are kept while moving between pages and reset when the app is reloaded.

## Options considered

- **Filtering in the API,** with query options such as `?type=gift&search=kettle` turned into SQL. This is the right choice for a large list, because only the matching rows travel. Here a household list holds tens or a few hundred items, so sending them all once is cheap, and every change of filter would otherwise wait for a round trip. It would also add query building, validation and tests on the server for no gain the person would notice.
- **Remembering the choices** between visits, in the address or in the browser's storage. Useful if real use shows the same filters being set every time, and easy to add then. Forgotten filters that silently hide items are a worse problem, so they start fresh.
- **Archived items in their own folded section,** like Bought. Considered and set aside in favour of a "Show archived" tick box that puts them back into their status sections, marked "Archived".

## Cost

Nothing. No new dependencies.

## What would change this decision

- The list growing to thousands of items, or loading slowly on a phone. Then the filtering moves into the API and SQL, and `find.ts` becomes the specification for it, since its tests describe exactly what each filter means.
