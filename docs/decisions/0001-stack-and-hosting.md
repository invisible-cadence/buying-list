# 0001: Stack and hosting

- **Date:** 2026-11-11
- **Status:** accepted

## What had to be decided

Where a small, private web app for one household should run, what it should be written in, and how people sign in.

The requirements that shaped the choice:

- A handful of users, and very little traffic.
- Household data, so only the allowed people may reach it.
- A running cost close to zero.
- As little to maintain as possible.
- Usable from a phone's home screen.
- Worth learning from, and readable by a stranger.

## Options considered

### A. Cloudflare Workers, D1 and Access (chosen)

The API runs on a Worker, the data is in D1 (SQLite), the front end is served as static assets, and Cloudflare Access handles sign-in.

- **For:** one platform for hosting, database and sign-in. Nothing to patch or keep running. The free plan covers this scale many times over. D1 is SQLite, so the data stays portable.
- **Against:** Workers are not a standard Node.js server, so some libraries do not run there. It ties the app to one provider's tools.

### B. A hosted backend service with a built-in database and sign-in

Services of this kind provide a database, user accounts and an API with little code.

- **For:** fast to start, and sign-in is included.
- **Against:** access rules are written in the service's own rule language and are easy to get subtly wrong. Less is learned about how an API and a database fit together, which is one of the goals here.

### C. A small server running Node.js and SQLite

A virtual machine or container, with the app and its database on it.

- **For:** the most conventional setup, and no platform limits.
- **Against:** a server to secure, update and back up, with a monthly charge. Sign-in would have to be built or bolted on. That is a lot of upkeep for a list.

### D. No hosting: a local-only app that syncs between phones

- **For:** no server, and the data stays on the devices.
- **Against:** syncing between people is the hard part of this app, and research and reminders need something running in the cloud anyway.

## Decision

Option A.

1. **Sign-in without writing sign-in code.** Access stops a visitor before they reach the app. Writing authentication by hand is a classic source of security mistakes, and this app holds real household data.
2. **Almost nothing to maintain.** There is no server to patch.
3. **The cost is close to zero.** See below.
4. **It teaches the right things:** how a browser, an API and a database talk to each other, migrations, and enforcing access rules on the server.

## Related choices

- **TypeScript everywhere.** One language for the front end and the API, with strict type checking to catch mistakes early.
- **React with Vite, and Hono for the API.** Both are widely used and well documented, and Hono is built for Workers.
- **Access is in place from the first deployment,** not added later, so the app is never reachable without sign-in.
- **The app verifies the Access token itself.** Cloudflare [recommends this](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/) so a request cannot pretend to have come through Access.
- **Deployment is by hand** with `wrangler deploy`. No deployment credential is stored in GitHub, and merging a pull request does not change the live app. Automatic deployment may come later as its own decision.
- **Reminders run in n8n,** which calls a read-only endpoint on a schedule. The app stays simple, and the schedule lives where other automations already do.
- **Research uses the Claude API** with web search and web fetch, and returns structured data that the code validates.

## Costs

Checked on 10 November 2026.

| Item | Cost | Source |
| --- | --- | --- |
| Cloudflare Workers, free plan | 0. Includes 100,000 requests a day. Requests for static assets are free. | [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) |
| Cloudflare D1, free plan | 0. Includes 5 million rows read and 100,000 rows written a day, and 5 GB of storage. | [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) |
| Cloudflare Access | Expected to be 0 at this size. Not yet confirmed against Cloudflare's own plan page; to be checked when the account is created. | [Cloudflare Access](https://www.cloudflare.com/en-au/products/cloudflare-access) |
| Claude API | The only running cost. Web search is US$10 per 1,000 searches plus tokens, and web fetch has no extra charge. Estimated at one to two US dollars a month for occasional use. A monthly spend limit caps it. | [Claude API pricing](https://platform.claude.com/docs/en/about-claude/pricing), [spend limits](https://platform.claude.com/docs/en/api/rate-limits) |
| n8n | Depends on how you run it. Not a new cost for this project. | |

The Claude figure is an estimate and will be replaced with a measured one after Phase 5.

## What would change this decision

- The free plans changing so that this scale is no longer covered.
- A needed library that cannot run on Workers.
- Access no longer being free for a household-sized group.

Because the data is plain SQLite and the API is ordinary HTTP, moving to option C later would mean rewriting the hosting, not the app.
