// Saves the team list for every league in the "add a team" picker to the
// given file. ESPN's teams feed can't be read from a browser, so the
// publish job builds this file and the app reads it from its own site.
// Usage: node tools/teams.mjs site/teams.json
import { writeFileSync } from 'node:fs';
import { PICKER_LEAGUES, espnTeams } from '../sources.js';

const out = {};
for (const l of PICKER_LEAGUES) {
  const res = await fetch(espnTeams(l.path));
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${l.league}`);
  const json = await res.json();
  out[l.path] = (json?.sports?.[0]?.leagues?.[0]?.teams ?? []).map(({ team }) => ({
    id: String(team.id), abbr: team.abbreviation,
    name: team.shortDisplayName ?? team.displayName, fullName: team.displayName,
    logo: team.logos?.[0]?.href ?? '',
  }));
  if (!out[l.path].length) throw new Error(`No teams for ${l.league}`);
  console.log(`${l.league}: ${out[l.path].length} teams`);
}
writeFileSync(process.argv[2] ?? 'teams.json', JSON.stringify(out));
