// Saves elite start times for upcoming cyclocross races, read from each race's
// page on cyclocross24.com, so the app can show real times instead of "All day".
// Races it can't read are left out, and the app falls back to "All day".
// Usage: node tools/cxtimes.mjs site/cx-times.json
import { writeFileSync } from 'node:fs';
import { CYCLOCROSS, cxSlugs, parseCxSchedule } from '../cyclocross.js';
import { isoDay } from '../feeds.js';

const from = isoDay(new Date(Date.now() - 86400000));
const to = isoDay(new Date(Date.now() + 30 * 86400000));
const races = {};
const soon = CYCLOCROSS.filter((r) => r.date >= from && r.date <= to);
for (const r of soon) {
  for (const slug of cxSlugs(r.place)) {
    try {
      const res = await fetch(`https://cyclocross24.com/race/${slug}/`, { headers: { 'User-Agent': 'GameDay calendar (personal app)' } });
      if (!res.ok) continue;
      const times = parseCxSchedule(await res.text(), r.date);
      if (times) { races[`${r.date}|${r.place}`] = times; break; }
    } catch (err) {
      console.warn(`${r.place}: ${err.message}`);
    }
  }
  console.log(`${r.date} ${r.place}: ${JSON.stringify(races[`${r.date}|${r.place}`] ?? 'no times yet')}`);
}
writeFileSync(process.argv[2] ?? 'cx-times.json', JSON.stringify({ updated: new Date().toISOString(), races }));
console.log(`Saved start times for ${Object.keys(races).length} of ${soon.length} races.`);
