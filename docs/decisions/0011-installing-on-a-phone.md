# 0011: Installing on a phone

- **Date:** 2026-11-22
- **Status:** accepted

## What had to be decided

Phase 3 asks for the app to be added to a phone's home screen. What does that need, given that every request, including the app's own files, has to pass Cloudflare Access?

## Decision

- **A web app manifest** at `public/manifest.webmanifest`: the name, a start address of `/`, `"display": "standalone"` so the app opens without the browser's address bar, colours, and icons at 192 and 512 pixels. Each icon is listed twice, once for normal use and once as "maskable", which lets Android crop it to its own shape. The drawing sits inside the middle of the square so that no crop cuts it.
- **The sign-in cookie on the manifest request.** Browsers fetch the manifest without cookies unless the page's link says otherwise, even from the same address. Cloudflare Access would then send the request to its sign-in page and the phone would see no manifest. `crossorigin="use-credentials"` on the link fixes that. MDN's [manifest page](https://developer.mozilla.org/en-US/docs/web/Manifest) (last modified 8 August 2025, read 22 November 2026) says: "If the manifest requires credentials to fetch, the crossorigin attribute must be set to use-credentials, even if the manifest file is in the same origin as the current page." I also checked this in Chromium with a small test server: without the attribute the manifest request carried no cookie, and with it, it did.
- **An Apple touch icon** at 180 pixels, because iPhones take the home-screen icon from `<link rel="apple-touch-icon">` rather than the manifest.
- **No service worker,** the piece of code that makes a web app work offline. Chrome used to require one before offering to install an app, and no longer does: see [Revisiting Chrome's installability criteria](https://developer.chrome.com/blog/update-install-criteria). Offline use stays after the trial.
- **The icon** is drawn by hand as `public/icons/icon.svg`. The PNGs were made from it by rendering it in a headless browser at each size. Any tool that turns an SVG into a PNG at a given size does the same job, such as Inkscape. A test checks that every icon the manifest names exists at the size it claims.

## Options considered

- **Letting the manifest and icons bypass Access,** with a second Access application for those paths and an exception in the Worker. This works even where a browser will not send cookies, but it weakens a rule that has had no exceptions so far: every request is checked. The cookie attribute avoids that. The bypass stays the fallback if a real phone cannot install the app.
- **A plugin that builds the manifest, icons and a service worker,** such as vite-plugin-pwa. It does much more than this needs, and brings a dependency and a service worker that would cache files, which is its own source of confusing bugs.
- **`"display": "minimal-ui"` or `"browser"`.** These keep some browser controls. If signing in inside the installed app misbehaves on a real phone, switching to one of them is the one-line fallback.

## Cost

Nothing. No new dependencies.

## What would change this decision

- A phone that refuses to install the app, or cannot sign in inside it. Then the fallbacks above, in that order: a different display mode, then a bypass for the manifest and icons.
- Wanting the app to work offline, which needs a service worker.
