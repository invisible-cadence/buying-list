# 0007: Validating input with Zod

- **Date:** 2026-11-20
- **Status:** accepted

## What had to be decided

Everything a caller sends to the API is untrusted, and Phase 2 has about ten fields across five kinds of request. How should it be checked?

## Decision

Use [Zod](https://zod.dev) (version 4, MIT licence). Each kind of request is described once as a schema in `worker/validation.ts`. The schemas are strict: a field they do not know is an error, so a caller is never left thinking a field worked when it was ignored. Error messages are written as plain sentences, because the screen will show them.

## Options considered

- **Hand-written checks,** as in Phase 1. No dependency, and fine for one field. At ten fields and partial edits it becomes long and repetitive, which is where mistakes creep in.
- **Valibot.** The same idea, built so that unused parts can be left out of the download. That matters for code that runs in the browser, and this validation runs only on the Worker.
- **ArkType.** Also similar, newer and less widely known.

Zod is the best known of the three, so there are more examples and answers available, and it is recognisable to anyone reading the project. That is a judgement about familiarity, not a claim that it is technically the best. Because all the schemas sit in one file, switching later would be a small change.

## Cost

Nothing to pay. It adds about 40 kB (gzipped) to the Worker: the built Worker went from 27.5 kB to 67.9 kB. Cloudflare's [limits page](https://developers.cloudflare.com/workers/platform/limits/) (last updated 19 November 2026, read on 20 November 2026) gives a Worker size limit of 64 MiB uncompressed on both the Free and Paid plans, and says there is no compressed size limit, so this is far inside it.

## What would change this decision

- The size of the Worker becoming a problem, or the same schemas being needed in the browser, which would favour Valibot.
