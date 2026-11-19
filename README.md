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

## How All games is ranked
`ranking.js` scores each game. It weighs Victor's teams first, then playoffs, rivalries, live close games, top matchups (both teams win 60%+), national TV, and how big the league is. Finished games drop to the bottom. A "🔥 Close game" label marks games that are late and within a few points (NBA 6, NFL 8, MLB 2 runs, NHL 1 goal, soccer 1 goal in the second half). "Close finish" marks games that ended by a hair or in overtime.

## Following sports and leagues
In ⚙︎ › "Sports & leagues I follow", Victor can follow whole sports (F1, tennis, UFC, golf, cycling, cyclocross) or whole leagues (NFL, NHL, Premier League, college, and others). Followed ones show in Highlights and the morning alert. All games shows everything except leagues he hides.

In ⚙︎ › "Hide leagues", he can tick leagues or sports he never wants to see. They are left off every tab and the morning alert, but his own teams' games still show (for example, a Barcelona game in a hidden cup). Hiding a league stops following it, and following it again un-hides it.

## Upcoming
The publish job saves the next 4 weeks of games as `upcoming.json` (`tools/upcoming.mjs`, about 1,200 small ESPN requests, refreshed daily). The Upcoming tab shows them on a calendar. Dots mark days with his teams (blue), big games (orange) or sports and leagues he follows (grey). Tap a day for its highlights, or for all of that day's games.

## Cyclocross start times

The publish job runs `tools/cxtimes.mjs` each morning. For races in the next 30 days it reads the schedule on the race's cyclocross24.com page (times there are Belgian local time) and saves the elite women's and men's start times to `cx-times.json`. The app shows the earliest elite start as the time, and both on the card. If a page can't be read, the race stays "All day". Odd town names are mapped in `SLUG_ALIASES` in cyclocross.js.
