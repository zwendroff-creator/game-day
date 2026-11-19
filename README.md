# Game Day

A home-screen web app that shows Victor what's on today: his teams first, then big rivalry and derby games, then F1, tennis, UFC and cycling, each with where to watch it in the US (Miami).

## Files
- `sources.js`: the leagues we read, Victor's starting teams, the rivalry list, and the where-to-watch backups. Most changes happen here.
- `feeds.js`: turns the ESPN and TheSportsDB feeds into today's list (no page code, so it's testable).
- `app.js`, `index.html`, `styles.css`: the screen and the "Teams I follow" sheet. Followed teams are saved on the phone.
- `sw.js`, `manifest.json`, `icons/`: what makes it installable and work offline.

## Run it
- Tests: `npm test`
- Locally: `npm start`, then open http://localhost:8080

## Put it on Victor's iPhone
1. Host the folder on any HTTPS static host (GitHub Pages, Cloudflare Pages, Netlify).
2. On the iPhone, open the link in Safari, tap Share, then "Add to Home Screen".

## Data sources
- ESPN's public scoreboard feeds (undocumented, free, no key).
- TheSportsDB free tier (test key 123) for road cycling.
- `cyclocross.js`: the 2026–27 cyclocross calendar (World Cup, Superprestige, X2O Trofee, Euros, Worlds), kept by hand. Update it each autumn.
- Where-to-watch backups in `sources.js` (check each season; US rights change).

## Setup on GitHub (one time)
- **Settings → Pages → Source: GitHub Actions.** Every push to `main` then tests and publishes the app.
- **Settings → Secrets and variables → Actions**, add:
  - `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`: the app's push keys (the public one is also in `push-config.js`).
  - `PUSH_SETUP`: the code Victor sends from the app after tapping "Turn on morning alerts".
- The "Morning rundown" workflow then runs every day at 7:30 AM Miami time (8:30 AM in summer). Use "Run workflow" to test it.
