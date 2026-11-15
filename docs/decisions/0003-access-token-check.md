# 0003: Checking the Access token in the Worker

- **Date:** 2026-11-15
- **Status:** accepted

## What had to be decided

How the Worker should make sure that only people who signed in through Cloudflare Access reach the app, and where its two sign-in settings should live.

## Decision

1. **The Worker verifies the token on every request.** Access puts a signed token in the `Cf-Access-Jwt-Assertion` header. The Worker checks its signature against the keys Cloudflare publishes for the team, and checks that it has not expired, that the issuer is the team's address, and that the audience is this application. Cloudflare [recommends this](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/). The checking is done by [`jose`](https://github.com/panva/jose), a widely used library, rather than hand-written.
2. **The check covers the front end's files too.** `run_worker_first` is on, so the Worker sees every request and passes the allowed ones to the static files. The cost is that file requests count as Worker requests, which the free plan's 100,000 a day covers many times over.
3. **It fails closed.** If the two settings are missing, every request gets an error. A refusal never says why.
4. **The two settings are Worker secrets, not committed config.** They name the owner's Cloudflare account, and this repository is public. The README explains how to set them.
5. **Local development has a switch,** `DEV_SKIP_ACCESS`, set only in `.dev.vars`, which is not deployed. It also requires the request to be for `localhost`, so setting it on the live Worker by mistake changes nothing. Both conditions are tested.
6. **Preview URLs are off,** so the Worker has one public address rather than one for each version.
7. **Adding an item requires a JSON content type,** which stops a form on another website from adding items using a visitor's sign-in.

## Other options considered

- **Rely on Access alone.** Simpler, but a mistake in Access settings, or an address that Access does not cover, would expose the data. The extra check is about thirty lines.
- **Put the team address in `wrangler.jsonc`.** Easier to set up, but it publishes the owner's account name.

## What would change this decision

- Cloudflare offering a built-in way for a Worker to verify Access tokens.
- Needing an address that is not behind Access, such as the Phase 7 demo. That would be a separate deployment, not an exception in this one.
