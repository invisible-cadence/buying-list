# 0002: Tooling versions

- **Date:** 2026-11-15
- **Status:** accepted

## What had to be decided

Which version of Node.js the project uses, and which major versions of the main tools.

## Node.js

Node.js 22 reaches end of life on 30 April 2027, about five months after this project's first release ([Node.js release schedule](https://github.com/nodejs/Release/blob/main/schedule.json)). Node 24 is supported until 30 April 2028 and Node 26 until 30 April 2029.

Node only runs the tooling on a developer's computer and in the GitHub check. The live app runs on Cloudflare's own Workers runtime.

**Decision:** Node 24. It gives two more years of support than Node 22 and is widely tested by tools. Node 26 would give a year more, at some risk that tools lag behind it. The version is set in `.nvmrc` and in `engines` in `package.json`, and the GitHub check reads `.nvmrc`.

## Tool versions held back

- **TypeScript 6.0, not 7.** The newest TypeScript major is 7, but `typescript-eslint` supports versions below 6.1 only, and linting is a requirement. Revisit when `typescript-eslint` supports TypeScript 7.
- **Vitest runs in plain Node,** without the Cloudflare Workers test pool. The tests so far cover logic that does not need a real database. Testing the SQL against a real D1 database, which Phase 2 may need, would add that pool, and it currently requires Vitest 4. If that comes, Vitest moves back to version 4.

## What would change this decision

- Node 24 dropping out of support for a tool this project needs.
- `typescript-eslint` adding support for TypeScript 7.
