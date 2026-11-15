# buying-list

A shared household buying list, installed on your phone, that tracks things from idea to bought and does the product research for you.

## Status

Phase 1 of the [roadmap](ROADMAP.md), the walking skeleton: a page with a text box and an Add button, a list underneath, and a database behind it, all behind sign-in. Items can be added and listed. Nothing else works yet.

- [`ROADMAP.md`](ROADMAP.md): what is being built, in what order.
- [`docs/decisions/`](docs/decisions/): why it is being built this way, and what else was considered.
- [`SECURITY.md`](SECURITY.md): how the app and this repository are protected, and how to report a problem.
- [`AGENTS.md`](AGENTS.md): the rules that AI coding agents follow here.

This README will grow into a full guide as the app takes shape.

## How it works

One Cloudflare Worker does everything the server side needs to do.

```
browser ──▶ Cloudflare Access (sign-in) ──▶ Worker ──▶ D1 database
                                              │
                                              └──▶ the front end's files
```

- `src/`: the front end, written in React and built by Vite.
- `worker/`: the Worker. It uses [Hono](https://hono.dev) for the API routes, checks the Access token on every request, and hands everything that is not an API call to the front end's files.
- `migrations/`: the database's tables, as numbered SQL files.
- `wrangler.jsonc`: tells Cloudflare what the Worker is and what it is connected to.

The API has two routes so far: `GET /api/items` lists the items, newest first, and `POST /api/items` adds one.

## Set up and run on your own computer

You need [Node.js](https://nodejs.org) 24 or newer (the version is in `.nvmrc`) and Git. On Windows, run the commands in Git Bash.

```bash
npm install
cp .dev.vars.example .dev.vars    # local settings, ignored by git
npm run db:migrate:local          # creates the local database
npm run dev                       # opens the app on http://localhost:5173
```

Locally the sign-in check is skipped, and only for requests to `localhost`. That is the `DEV_SKIP_ACCESS` line in `.dev.vars`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the app locally, with a local database. |
| `npm run check` | Type check, lint, format check and tests: everything the GitHub check runs. |
| `npm run format` | Fixes formatting. |
| `npm run build` | Builds the front end and the Worker into `dist/`. |
| `npm run deploy` | Builds, then deploys with Wrangler. |

## Deploy your own copy

You need a free [Cloudflare account](https://dash.cloudflare.com/sign-up) with Cloudflare Zero Trust set up (the free plan covers up to 50 people).

1. Sign in: `npx wrangler login`.
2. Create the database: `npx wrangler d1 create buying-list`. Copy the `database_id` it prints into `wrangler.jsonc`.
3. Create the table: `npm run db:migrate:remote`.
4. Deploy: `npm run deploy`. Until step 6 is done the app answers every request with an error, because it refuses to run without its sign-in settings.
5. Put Cloudflare Access in front of the Worker. In the Cloudflare dashboard, open the Worker's settings, find its `workers.dev` address and turn on Cloudflare Access. Then, in Zero Trust under Access, open the new application and make sure the policy lists only the people who may use the app.
6. Give the Worker its two sign-in settings, which name your own account and so are not kept in this repository. Wrangler asks for each value, and the characters do not show as you paste.
   - `npx wrangler secret put TEAM_DOMAIN`: your team address, such as `https://YOUR-TEAM.cloudflareaccess.com`. The team name is the one you chose when you set up Zero Trust, shown in its settings and in the address bar of the sign-in page. Start with `https://` and put nothing after the name.
   - `npx wrangler secret put POLICY_AUD`: the Application Audience (AUD) tag, shown on the Access application's overview.

Open the Worker's address. You should be asked to sign in, and then see the list.

### If you are refused after signing in

The Worker logs why it refused a request, and never tells the visitor. Read the log with:

```bash
npx wrangler tail buying-list --format pretty
```

Then reload the page and look for a line starting `Access token refused` or `Access check is not configured`. Two common causes:

- `Expected 200 OK from the JSON Web Key Set HTTP response`: `TEAM_DOMAIN` is not your team address. Open `YOUR-TEAM-ADDRESS/cdn-cgi/access/certs` in a browser. It should show JSON containing `keys`.
- A message about the `aud` claim: `POLICY_AUD` belongs to a different Access application.

## Configuration

| Setting | Where it is set | What it is |
| --- | --- | --- |
| `database_id` | `wrangler.jsonc` | Which D1 database the Worker uses. |
| `TEAM_DOMAIN` | Worker secret | Your Access team address. |
| `POLICY_AUD` | Worker secret | The Access application's audience tag. |
| `DEV_SKIP_ACCESS` | `.dev.vars` | Local development only. Skips the sign-in check for `localhost`. |

## Costs

Nothing, on the free plans of Cloudflare Workers, D1 and Access. The figures and their sources are in [decision 0001](docs/decisions/0001-stack-and-hosting.md).

## Limitations

- There is no way yet to edit, remove or mark an item as bought.
- Everyone who can sign in sees the same list, and the app does not yet record who added what.
- Titles are the only data an item has.
- The tests cover the sign-in check and the input checks. The database queries are tried by hand, and are not yet covered by automated tests.

## How this is built

The project is built in the open, one reviewed pull request at a time, with AI coding agents doing much of the writing. Every pull request explains why its approach was chosen.

## Pre-push check

Everything pushed to a public repository is public straight away, so this repository includes a check that runs on your own computer before anything leaves it.

**What it covers:** pushes made with `git push` from a computer where you have set it up. Nothing else.

**What it does not cover:** pushes made by cloud coding agents, and anything typed on github.com. Those rely on a different protection: agents working here are given no private material to begin with. See "Separation" in [`AGENTS.md`](AGENTS.md).

It refuses a push if a commit:

- was written under the wrong name or email, or
- contains a term from your private list, in its changes, file names, commit message or branch name.

The script is in [`.githooks/pre-push`](.githooks/pre-push). It contains no private terms. It reads them from a file that you keep outside the repository.

### Setup

Do this once for each copy of the repository. On Windows, run the commands in Git Bash, which is installed with [Git for Windows](https://git-scm.com/downloads).

1. Create your private list: a plain text file with one term per line, saved outside this repository. The default location is a file named `.private-terms.txt` in your home folder. Lines starting with `#` are ignored, and matching ignores upper and lower case.

2. Tell git who the commits should be from, and what the check should expect. Use your own public name and email.

   ```bash
   git config user.name "YOUR PUBLIC NAME"
   git config user.email "YOUR PUBLIC EMAIL"
   git config prepush.authorName "YOUR PUBLIC NAME"
   git config prepush.authorEmail "YOUR PUBLIC EMAIL"
   ```

3. Switch the check on.

   ```bash
   git config core.hooksPath .githooks
   ```

4. If your list is somewhere other than the default location, say where.

   ```bash
   git config prepush.termsFile "/path/to/your/file"
   ```

### Run the tests

The check has its own tests. They build a throwaway repository in a temporary folder, with made-up terms, and try thirteen pushes. Nothing touches this repository, GitHub or your real list.

```bash
sh tests/pre-push.test.sh
```

The last line should read `13 passed, 0 failed`.

### Check that it works for you

Make a throwaway commit containing one of your terms on a test branch, and try to push it. The push should be refused, and nothing is sent. Then delete the test branch.

### Other limits

- It cannot read images or other binary files.
- It only knows the terms on your list.

It can be skipped with `git push --no-verify`. Do not do that.

## Licence

[MIT](LICENSE)
