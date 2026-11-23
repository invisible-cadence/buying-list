# 0012: Who is signed in, and private items

- **Date:** 2026-11-23
- **Status:** accepted

## What had to be decided

Phase 3 asks the app to record who added each item, and to let an item be private, visible only to the person who added it, for things like gifts. Where does the app learn who someone is, and where is "private" enforced, so that a mistake in one place cannot leak an item?

## Decision

- **Who is signed in comes from the Access token, and nothing else.** The Worker already verifies the token on every request. It now also reads the token's `email` claim, which Cloudflare describes as "The email address of the authenticated user, verified by the identity provider" ([application token](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/), last updated 17 November 2026, read 23 November 2026). It is trimmed and lower-cased, and handed to the routes as `viewer`. The screen never sends who it is, and the API refuses a request that tries to set who added an item.
- **A token with no email is refused.** Service tokens, made for programs rather than people, carry a `common_name` and no email. Nothing in the app is for programs yet. Phase 4's phone shortcut will need to decide what a service token may do.
- **The rule lives in the SQL.** Every query in `worker/queries/items.ts` that reads or changes an item includes `(is_private = 0 OR added_by = ?)` with the viewer's email. This covers the list, one item, edits, status, archiving, and adding and removing links. A route cannot forget the rule, because it cannot reach an item without going through a query that has it.
- **"Not found", not "forbidden".** To anyone but the adder, a private item does not exist: it is missing from their list, and every route answers 404 with the same message as for an item that was never there. A 403 would tell them that something is there.
- **Only the adder may change privacy.** For a shared item someone else added, `PATCH` with `isPrivate` gets a 403 with a plain reason, because the item is visible and the refusal is about the action, not the item. The query also requires `added_by` to match, so the database refuses it even if the route check were missing.
- **Older items stay shared.** Items from before this change have no adder, so they stay visible to everyone and nobody can make them private.
- **The screen** asks `GET /api/me` who is signed in, to say "Added by you" and to show the private tick box only on the viewer's own items. That is for display only. The server enforces the rules whatever the screen shows.
- **Locally,** `DEV_USER_EMAIL` in `.dev.vars` stands in for the token's email, and changing it lets one person act as two. Without it the app refuses to run rather than guess.

## Options considered

- **Checking in each route.** Each route would load the item, compare the adder and decide. It works until one route forgets, and the routes that act on a link rather than an item are easy to miss. Putting the rule in the queries means there is one place to get right, and the tests cover it per route.
- **Row-level security in the database.** The cleanest form of the same idea, where the database applies the rule to every query by itself. D1 is SQLite, which does not have it.
- **Separate tables for private items.** Hard to get wrong for reading, but it would split every query and every screen in two for one flag.
- **Names instead of emails.** Friendlier on screen, but it needs a place to store and edit names. The email is already verified and costs nothing. Real use can show whether a name is worth adding.

## How it is tested

Tests with two invented people, at two levels:

- `worker/queries/items.test.ts` runs every query against a real local database: the second person cannot list, read, edit, move, archive, or add or remove links on the first person's private item, and nothing changes when they try. The first person can do all of it. Shared and older items work for both.
- `worker/items.test.ts` sends every route that takes an item through the whole app as the second person, and checks each answers exactly as for a missing item.

To check that the tests detect a mistake, the rule was broken on purpose twice: once by making every item visible, which failed six tests, and once by removing it from link removal only, which failed two.

## Cost

Nothing. No new dependencies and no database change: the columns were added in Phase 2.

## What would change this decision

- Phase 4's service token, which has no email, needing to add items. It would need its own rule for who the adder is.
- Wanting to share a private item with some people but not others, which needs more than one flag.
