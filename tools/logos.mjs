// Saves each league's logo (light and dark versions) from ESPN's scoreboard
// feeds, so the app can show it on game cards.
// Usage: node tools/logos.mjs site/logos.json
import { writeFileSync } from 'node:fs';
import { LEAGUES, SPORT_FEEDS, espnScoreboard } from '../sources.js';

const out = {};
for (const f of [...LEAGUES, ...SPORT_FEEDS]) {
  try {
    const res = await fetch(espnScoreboard(f.path, '').split('?')[0]);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const logos = (await res.json())?.leagues?.[0]?.logos ?? [];
    const pick = (rel) => logos.find((l) => l.rel?.includes(rel))?.href;
    const light = pick('default') ?? logos[0]?.href;
    if (!light) { console.log(`${f.league}: no logo`); continue; }
    out[f.league] = { light, dark: pick('dark') ?? light };
  } catch (err) {
    console.log(`${f.league}: ${err.message}`);
  }
}
writeFileSync(process.argv[2] ?? 'logos.json', JSON.stringify(out));
console.log(`Saved logos for ${Object.keys(out).length} leagues.`);
