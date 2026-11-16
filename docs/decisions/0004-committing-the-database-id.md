# 0004: Committing the D1 database ID

- **Date:** 2026-11-15
- **Status:** accepted

## What had to be decided

`wrangler.jsonc` needs the ID of the D1 database. AGENTS.md says never to commit "private IDs", so it was not clear whether this one may be public.

## Decision

The ID is committed. It names a database in one Cloudflare account, and it grants no access: using it needs that account's login or an API token, and neither is in the repository. Cloudflare's own examples commit it too.

Values that name the owner's account in a more useful way, the Access team address and the audience tag, are not committed. They are Worker secrets (see decision 0003).

## Other option considered

Keep a placeholder in the file and edit a local copy, telling git to ignore that change. Nothing would be published, but it is fiddly and a mistake would publish the ID anyway.

## What would change this decision

- Cloudflare making the database ID usable on its own.
- A second deployment, such as the Phase 7 demo, which should have its own database and its own ID.
