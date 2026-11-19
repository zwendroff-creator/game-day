// Saves this year's and next year's pro cycling calendars from TheSportsDB
// to the given file, so the app can read them from its own site.
// Usage: node tools/cycling.mjs site/cycling.json
import { writeFileSync } from 'node:fs';
import { CYCLING_LEAGUES } from '../sources.js';

const year = new Date().getFullYear();
const events = [];
for (const id of CYCLING_LEAGUES) {
  for (const season of [year, year + 1]) {
    try {
      const res = await fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=${id}&s=${season}`);
      const json = await res.json();
      for (const e of json?.events ?? []) {
        events.push({ idEvent: e.idEvent, strEvent: e.strEvent, strLeague: e.strLeague, dateEvent: e.dateEvent, strTimestamp: e.strTimestamp });
      }
    } catch (err) {
      console.warn(`Skipped league ${id} season ${season}: ${err.message}`);
    }
  }
}
writeFileSync(process.argv[2] ?? 'cycling.json', JSON.stringify({ updated: new Date().toISOString(), events }));
console.log(`Saved ${events.length} cycling races.`);
