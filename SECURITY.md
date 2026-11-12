# Security

This is a small personal project, maintained by one person in their spare time. Reports are welcome and will be looked at as soon as is practical.

## Reporting a problem

Please do not open a public issue for a security problem.

Use GitHub's private reporting instead: open the **Security** tab of this repository and choose **Report a vulnerability**. Say what you found, how to reproduce it, and what you think the impact is.

## What this project is

One household runs one deployment. This repository holds the code only. There is no shared hosted service and no other person's data.

If you run your own copy, you are responsible for your own deployment, your own secrets and your own data.

## How the app is protected

The app is not built yet. This section is the design that the code has to meet, and it will be updated as each part lands.

- **Sign-in:** Cloudflare Access sits in front of every address the app has, from the first deployment. A visitor who is not on the allow list never reaches the app.
- **Token check:** the app verifies the Access token on every request and does not trust a header alone.
- **Automations:** each automated caller has its own Cloudflare Access service token, which can be revoked without affecting anyone's sign-in. The reminders caller can reach one read-only endpoint.
- **Private items:** an item marked private is visible only to the person who added it. This is enforced in the API and covered by a test.
- **Untrusted content:** web pages and model output are treated as untrusted. Model output is validated against a fixed structure, and only `http` and `https` links are stored.
- **Spending:** the Claude API key is used only by this app and has a monthly spend limit.
- **Demo:** the public demo has no sign-in, no secrets, no API key and no real database. It shows invented data only.

## Where secrets live

Nothing secret is stored in this repository or in its GitHub settings.

| Secret | Where it lives |
| --- | --- |
| Claude API key | A Cloudflare Worker secret |
| Cloudflare Access service tokens | The caller that uses them, and a password manager |
| Local development values | `.dev.vars`, which git ignores |

Deployment is done by hand with `wrangler deploy`, so no deployment credential is held by GitHub.

## What data the app stores

- List items: titles, notes, links, status, type, priority, dates, rough budgets and where something was bought.
- The email address of each person who signs in, to record who added an item.

It does not store payment details, bank details or passwords.

When research is run on an item, that item's title, notes and links are sent to the Claude API.

## Keeping this repository clean

- Tests, examples, demos and screenshots use invented data.
- Agents working here are given no private material, so they have nothing personal to publish.
- On the maintainer's own computer, a pre-push check refuses a push that carries the wrong commit author or a term from a private list. See the README.
- GitHub secret scanning and push protection are enabled.
