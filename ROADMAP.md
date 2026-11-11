# Roadmap

A shared household buying list: a small web app, installed on phones, that tracks things from idea to bought and does the product research.

The first goal is something that works and can be tested in real life. The app is useful at home from the end of Phase 3. Everything after that is improvement, shaped by what real use shows.

## What it will do

- Capture items fast: typed, or shared as a link from another app.
- Track each item through clear statuses: idea, researching, decided, waiting for money, ready to buy, bought.
- Research products: compare the links it is given, or find options itself, with prices from shops that deliver to a configured country.
- Share one list between the people in a household, with private items for gifts.
- Send reminders: a regular review, buy-by dates for seasonal things, and a running restock basket.

## Approach

- **Stack:** TypeScript throughout, on Cloudflare: Workers for the API, D1 for the database, static assets for the front end. React with Vite, and Hono for the API.
- **Sign-in:** Cloudflare Access in front of the app from the first deployment.
- **Research:** the Claude API with web search and web fetch, with a monthly spend limit.
- **Reminders:** n8n on a schedule, calling the app.
- **Deploying:** by hand with `wrangler deploy`.
- **One household per deployment.** Anyone else runs their own copy from this repository.

The reasons are in [`docs/decisions/0001-stack-and-hosting.md`](docs/decisions/0001-stack-and-hosting.md).

## Phases

| Phase | What | Status |
| --- | --- | --- |
| 0 | Setup and security baseline | In progress |
| 1 | Walking skeleton, behind sign-in | Not started |
| 2 | Core list | Not started |
| 3 | Several people, private items, install on a phone | Not started |
| | Pause: two to three weeks of real use | |
| 4 | Fast capture from a phone | Not started |
| 5 | AI research | Not started |
| 6 | Reminders and the restock basket | Not started |
| 7 | Documentation and a clickable demo | Not started |

### Phase 0: Setup and security baseline

Accounts, tools and safeguards, before any app code.

- Repository files: licence, agent instructions, security policy, ignore list and this roadmap.
- A pre-push check that refuses a push with the wrong commit author or a private term.
- A ruleset on `main`: changes arrive through pull requests only.
- Accounts for Cloudflare and the Claude API, with a spend limit on the API from day one.
- Local tools: Node.js, Git and Wrangler.
- Cloudflare's starter Worker deployed with Access in front of it, to prove the toolchain.

**Done when:** a "hello" page is live, only the allowed people can open it, and a test push containing a private term is refused.

### Phase 1: Walking skeleton

The thinnest version that runs end to end: type an item, save it, see it in a list, on a live address behind sign-in.

1. Project structure at the root of the repository: a React front end built with Vite, and an API on a Worker using Hono.
2. One D1 table, `items`, created through a migration file.
3. Two API routes: list items, add an item.
4. One screen: a text box, an Add button, and the list underneath.
5. TypeScript strict mode, ESLint, Prettier, and Vitest with one real test.
6. GitHub Actions running lint and tests on every pull request, with read-only permissions.
7. The Worker verifies the Access token on every request.

**Done when:** an item added from a phone's browser is still there after a refresh, and a visitor who is not signed in gets nothing.

### Phase 2: Core list

The real data model and a list worth using.

An item holds: a title and notes, a status, links, a type (one-off, restock, gift, seasonal), a priority, a needed-by date, a rough budget, bought details, who added it, and whether it is private.

1. A migration for the full model, with a separate `links` table.
2. API routes to create, edit, change status and archive, with input validated on the way in.
3. Screens: the list grouped by status, an item page, and a quick-add box.
4. Filters by type, by status and by "needed soon".
5. Tests for the status rules and the validation.

**Done when:** an item can go from idea to bought, with links and notes, entirely on a phone.

### Phase 3: Several people, private items, install on a phone

- The app reads who is signed in from the Access token and records who added each item.
- A private item is visible only to the person who added it. The rule is enforced in the API, with a test that proves it.
- A web app manifest and icons, so the app can be added to a phone's home screen.

**Done when:** two people have the app on their phones, each has added something, and a private item stays hidden from the other.

### Pause: real use

Use the app for two to three weeks before building more. Note what is annoying, what is missing and what goes unused. Then revisit the phases below: reorder them, cut them, or stop here if this is already enough.

### Phase 4: Fast capture from a phone

- A phone shortcut that appears in the share menu and sends a shared link, with an optional note, to the app's API.
- The shortcut uses its own Cloudflare Access service token.
- Pasting text that contains several links creates one item with several candidate links.

**Done when:** sharing a product page from a phone adds it to the list in two taps.

### Phase 5: AI research

Press "Research" on an item and get back a short, sourced shortlist.

- **Compare these:** the item has candidate links. Claude reads each page and compares them against the item's notes.
- **Find options:** the item has no links. Claude searches the web and proposes a budget, a middle and a premium option.
- Search is localised to a configured country. Currency, delivery rules and preferred shops live in configuration, not code.
- Claude returns structured data that the code validates. Every option has a name, price, shop, link, pros, cons and a "checked on" date, and every claim links to its source.
- Cost controls: a cap on searches per request, a monthly spend limit, and research runs only when asked.

**Done when:** a request such as "a quiet kettle under 60" returns three options from shops that deliver to the configured country, with links that work.

### Phase 6: Reminders and the restock basket

- A read-only digest endpoint, protected by its own service token.
- An n8n workflow that calls it on a schedule and sends a message: what is ready to buy, what has been stuck in research, and what has a buy-by date coming up.
- Seasonal items that repeat each year.
- A restock basket: items collect as they run low, show as one checklist, and are marked bought together.

**Done when:** the scheduled message arrives, and the next restock order comes from the basket.

### Phase 7: Documentation and a clickable demo

- A second deployment in demo mode: no sign-in, no secrets, no API key and no real database. It opens into an invented list, and a visitor's changes stay in their own browser.
- Research in the demo shows saved results, so it costs nothing to run.
- Short screen recordings, made with invented data.
- A README that a stranger can follow to run their own copy.

**Done when:** a stranger can open the demo, understand the app in a minute, and follow the README to run their own.

## Not in version 1

- Buying from inside the app.
- Price tracking over time.
- Bank or budget integration.
- A native phone app.
- Link previews.
- "Usually bought together" suggestions.

## Later

- An MCP server, so an AI assistant can read and add to the list directly.
- Native notifications on the phone.
