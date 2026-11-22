# 0009: Moving between pages without a routing library

- **Date:** 2026-11-22
- **Status:** accepted

## What had to be decided

The item page is the app's second page. Each page needs its own address, so that the phone's back button returns to the list and an item's page can be reloaded or opened directly. How should the app work out which page to show?

## Decision

Write it by hand, in two small files:

- `src/route.ts` reads an address into a page: `/` is the list, `/items/12` is item 12, anything else is "not found". It is a plain function with tests.
- `src/navigation.tsx` changes the address with the browser's own history API (`pushState`), listens for the back and forward buttons (`popstate`), and offers a `Link` that changes page without reloading the app. Links are real links, so they can still be opened in a new tab.

On the server nothing changes. The Worker's static-assets setting `not_found_handling: "single-page-application"` already answers any address that is not a file with the app's page, after the Access check.

## Options considered

- **React Router** or **TanStack Router.** Full-featured and widely used, with nested layouts, data loading and route parameters. Two pages use none of that, and either would add a dependency and a set of ideas to learn for about forty lines of plain code.
- **Addresses after a `#`,** such as `/#/items/12`. Simpler still, since the server never sees them, but uglier addresses, and the server already handles real paths.
- **No addresses at all,** with the page held in React state. The least code, but the back button would leave the app instead of returning to the list, which is the first thing a phone user would try.

## Cost

Nothing. No new dependencies.

## What would change this decision

- More than a handful of pages, pages inside pages, or addresses with search terms or filters in them. A routing library earns its place then.
