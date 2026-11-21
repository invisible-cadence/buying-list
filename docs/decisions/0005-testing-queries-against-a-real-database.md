# 0005: Testing the database queries against a real database

- **Date:** 2026-11-20
- **Status:** accepted

## What had to be decided

Phase 2 adds many SQL queries and a migration. Mistakes in SQL are the kind a type checker cannot see, so the queries and the migration need tests that run them. How should the tests get a database?

## Decision

The tests start a real D1 database on the developer's computer with [Miniflare](https://developers.cloudflare.com/workers/testing/miniflare/), Cloudflare's local simulator, and apply the real files from `migrations/` before the tests run. Miniflare is added as a dev dependency. It is the same engine behind `wrangler dev`, so SQL that passes here behaves the same on the live database, including the rules a table enforces and foreign keys.

Each test file starts one database and empties the tables before each test, which keeps the whole suite to a few seconds. A test also checks that the migration keeps rows that existed before it.

## Options considered

- **Cloudflare's Vitest pool (`@cloudflare/vitest-pool-workers`).** It runs the tests inside the Workers runtime. Its current release requires Vitest 4, so it would have meant moving Vitest back a major version. The tests here only need a database, not the whole runtime.
- **Another SQLite library with a hand-written stand-in for D1.** No new simulator, but the tests would then check the stand-in, and could pass while the real thing fails.
- **Testing by hand.** This was Phase 1's approach. It does not scale to this many queries.

## Details worth knowing

- Miniflare is pinned to its stable 4.x line. Wrangler itself currently uses a 5.x beta, whose options are different and undocumented, so the test helper does not use that one. Two copies are installed; only the dev dependency is used by tests.
- A migration file is run whole, as `wrangler d1 migrations apply` does. D1's `exec()` splits statements by line and breaks on multi-line SQL, so the helper uses `prepare().run()` instead.
- Cost: nothing. Miniflare is open source and runs locally.

## What would change this decision

- The Workers Vitest pool supporting Vitest 5, if the tests start to need the full runtime rather than a database.
- Miniflare 5 reaching a stable release with documented options. The helper in `worker/test-support/database.ts` is the only place that would change.
