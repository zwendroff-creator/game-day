// Saves the next 4 weeks of games to the given file for the app's Upcoming
// tab. Runs in the daily publish job with TZ=America/New_York, so "a day"
// means a day in Miami. Games are saved without anyone's follows applied;
// the app sorts them into his teams, big games and so on.
// Usage: node tools/upcoming.mjs site/upcoming.json [days]
import { writeFileSync } from 'node:fs';
import { LEAGUES, SPORT_FEEDS, espnScoreboard } from '../sources.js';
import { parseLeague, parseSportFeed, parseCycling, isoDay, ymd } from '../feeds.js';
import { CYCLING_DIRECT } from '../sources.js';

const DAYS = Number(process.argv[3] ?? 27);
const CONCURRENCY = 8;

async function getJson(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i >= tries) throw err;
      await new Promise((r) => setTimeout(r, 500 * i));
    }
  }
}

// Fields the app needs to show and rank a game later.
const KEEP = ['id', 'group', 'home', 'away', 'section', 'sport', 'league', 'title', 'subtitle', 'tag', 'start', 'allDay',
  'rivalry', 'postseason', 'national', 'quality', 'topMatchup', 'state', 'statusText', 'watch'];
const slim = (item) => Object.fromEntries(KEEP.filter((k) => item[k] !== undefined && item[k] !== '' && item[k] !== null).map((k) => [k, item[k]]));

const jobs = [];
const days = {};
for (let d = 1; d <= DAYS; d++) {
  const day = new Date();
  day.setDate(day.getDate() + d);
  day.setHours(12, 0, 0, 0);
  const iso = isoDay(day);
  days[iso] = [];
  for (const f of LEAGUES) jobs.push([iso, () => getJson(espnScoreboard(f.path, ymd(day))).then((j) => parseLeague(f, j, day, []))]);
  for (const f of SPORT_FEEDS) jobs.push([iso, () => getJson(espnScoreboard(f.path, ymd(day))).then((j) => parseSportFeed(f, j, day))]);
  jobs.push([iso, () => getJson(CYCLING_DIRECT(iso)).then((j) => parseCycling(j, day))]);
}

let failures = 0;
let next = 0;
async function worker() {
  while (next < jobs.length) {
    const [iso, run] = jobs[next++];
    try { days[iso].push(...(await run()).map(slim)); } catch { failures++; }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const total = Object.values(days).reduce((n, list) => n + list.length, 0);
if (failures > jobs.length / 4) { console.error(`Too many failed requests (${failures} of ${jobs.length}).`); process.exit(1); }
writeFileSync(process.argv[2] ?? 'upcoming.json', JSON.stringify({ updated: new Date().toISOString(), days }));
console.log(`Saved ${total} events over ${DAYS} days (${failures} of ${jobs.length} requests failed).`);
