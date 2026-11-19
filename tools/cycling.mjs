// Saves the next few days of pro cycling races from TheSportsDB to the given
// file, so the app can read them from its own site (browsers can't call
// TheSportsDB directly). The publish job runs this every morning.
// Usage: node tools/cycling.mjs site/cycling.json
import { writeFileSync } from 'node:fs';
import { CYCLING_DIRECT } from '../sources.js';
import { isoDay } from '../feeds.js';

const events = [];
let failures = 0;
for (let i = -1; i <= 3; i++) {
  const day = new Date(Date.now() + i * 86400000);
  try {
    const res = await fetch(CYCLING_DIRECT(isoDay(day)));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    for (const e of json?.events ?? []) {
      events.push({ idEvent: e.idEvent, strEvent: e.strEvent, strLeague: e.strLeague, dateEvent: e.dateEvent, strTimestamp: e.strTimestamp });
    }
  } catch (err) {
    failures++;
    console.warn(`Skipped ${isoDay(day)}: ${err.message}`);
  }
}
if (failures === 5) { console.error('TheSportsDB could not be reached.'); process.exit(1); }
writeFileSync(process.argv[2] ?? 'cycling.json', JSON.stringify({ updated: new Date().toISOString(), events }));
console.log(`Saved ${events.length} cycling races.`);
