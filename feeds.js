// Turns the raw feeds into one simple list of "things to watch today".
// No DOM code here, so it can be tested with Node.
import {
  LEAGUES, SPORT_FEEDS, CYCLING_DIRECT, RIVALRIES, WATCH_FALLBACK, MIAMI_LOCAL,
  espnScoreboard, espnTeams,
} from './sources.js';

// Each item looks like:
// { id, section: 'mine'|'big'|'other', sport, league, title, subtitle, tag,
//   start: Date|null, allDay, state: 'pre'|'in'|'post', statusText, score, watch: string[] }

export const ymd = (d) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
export const isoDay = (d) => `${ymd(d).slice(0, 4)}-${ymd(d).slice(4, 6)}-${ymd(d).slice(6)}`;

const sameLocalDay = (a, b) => ymd(a) === ymd(b);
const uniq = (xs) => [...new Set(xs.filter(Boolean).map((s) => String(s).trim()))];
const plain = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Broadcast names from an ESPN competition, keeping only ones that reach
// Miami: national channels, plus Miami's own local channels.
export function broadcastsFor(comp, league) {
  const out = [];
  let skippedLocal = false;
  const isMiami = (name) => MIAMI_LOCAL.some((m) => plain(name).includes(plain(m)));
  const consider = (name, market) => {
    if (!name) return;
    if (!market || market === 'national' || isMiami(name)) out.push(name);
    else skippedLocal = true;
  };
  for (const b of comp?.broadcasts ?? []) for (const n of b.names ?? []) consider(n, b.market?.toLowerCase?.());
  for (const g of comp?.geoBroadcasts ?? []) consider(g.media?.shortName, g.market?.type?.toLowerCase());
  const watch = uniq(out);
  if (watch.length) return watch;
  return WATCH_FALLBACK[league] ?? [];
  // (skippedLocal just means the only listing was another market's channel.)
}

const statusOf = (status) => ({
  state: status?.type?.state ?? 'pre',
  statusText: status?.type?.shortDetail ?? status?.type?.detail ?? '',
});

const teamMatches = (team, follow) =>
  (follow.id && String(team?.id) === String(follow.id)) ||
  (!follow.id && follow.abbr && team?.abbreviation === follow.abbr);

export function findRivalry(nameA, nameB) {
  const a = plain(nameA), b = plain(nameB);
  return RIVALRIES.find((r) => {
    const ra = plain(r.a), rb = plain(r.b);
    return (a.includes(ra) && b.includes(rb)) || (a.includes(rb) && b.includes(ra));
  });
}

// --- Team sports -------------------------------------------------------------
// follows: [{ group, id, abbr, name }]
export function parseLeague(feed, json, today, follows) {
  const mine = follows.filter((f) => f.group === feed.group);
  const items = [];
  for (const ev of json?.events ?? []) {
    const comp = ev.competitions?.[0];
    const teams = comp?.competitors ?? [];
    if (teams.length !== 2) continue;
    const start = new Date(comp.date ?? ev.date);
    if (isNaN(start) || !sameLocalDay(start, today)) continue;

    const ours = teams.find((c) => mine.some((f) => teamMatches(c.team, f)));
    const [home, away] = [teams.find((c) => c.homeAway === 'home') ?? teams[0], teams.find((c) => c.homeAway === 'away') ?? teams[1]];
    const rivalry = findRivalry(home.team?.displayName, away.team?.displayName);
    const postseason = ev.season?.type === 3 && feed.group !== 'soccer';
    if (!ours && !rivalry && !postseason) continue;

    let title;
    if (ours) {
      const other = teams.find((c) => c !== ours);
      title = `${ours.team?.shortDisplayName ?? ours.team?.displayName} ${ours.homeAway === 'home' ? 'vs' : 'at'} ${other?.team?.shortDisplayName ?? other?.team?.displayName ?? 'TBD'}`;
    } else {
      title = `${away.team?.shortDisplayName ?? away.team?.displayName} at ${home.team?.shortDisplayName ?? home.team?.displayName}`;
    }
    const hasScore = teams.every((c) => c.score != null && c.score !== '') && (comp.status?.type?.state ?? 'pre') !== 'pre';
    items.push({
      id: `${feed.group}:${ev.id}`,
      section: ours ? 'mine' : 'big',
      sport: feed.sport,
      league: feed.league,
      title,
      subtitle: feed.league,
      tag: rivalry?.name ?? (postseason ? 'Playoffs' : ''),
      start,
      allDay: false,
      ...statusOf(comp.status ?? ev.status),
      score: hasScore ? `${away.team?.abbreviation} ${away.score} – ${home.score} ${home.team?.abbreviation}` : '',
      watch: broadcastsFor(comp, feed.league),
    });
  }
  return items;
}

// --- Whole sports ------------------------------------------------------------
export function parseSportFeed(feed, json, today) {
  const items = [];
  const base = { section: 'other', sport: feed.sport, league: feed.league, tag: '', score: '' };
  for (const ev of json?.events ?? []) {
    if (feed.kind === 'sessions') {
      // F1: one event per race weekend, one competition per session.
      for (const comp of ev.competitions ?? []) {
        const start = new Date(comp.date ?? comp.startDate);
        if (isNaN(start) || !sameLocalDay(start, today)) continue;
        const session = comp.type?.text ?? comp.type?.abbreviation ?? 'Session';
        items.push({
          ...base,
          id: `${feed.path}:${ev.id}:${comp.id}`,
          title: `${ev.shortName ?? ev.name}: ${session}`,
          subtitle: feed.league,
          tag: /race/i.test(session) ? 'Race day' : '',
          start, allDay: false,
          ...statusOf(comp.status),
          watch: broadcastsFor(comp, feed.league),
        });
      }
    } else if (feed.kind === 'card') {
      // UFC: one item per fight card, timed from its earliest bout.
      const comps = ev.competitions ?? [];
      const times = comps.map((c) => new Date(c.date)).filter((d) => !isNaN(d));
      const start = times.length ? new Date(Math.min(...times)) : new Date(ev.date);
      if (isNaN(start) || !sameLocalDay(start, today)) continue;
      const main = comps[comps.length - 1];
      const fighters = (main?.competitors ?? []).map((c) => c.athlete?.shortName ?? c.athlete?.displayName).filter(Boolean);
      items.push({
        ...base,
        id: `${feed.path}:${ev.id}`,
        title: ev.name ?? ev.shortName,
        subtitle: fighters.length === 2 ? `Main event: ${fighters.join(' vs ')}` : feed.league,
        start, allDay: false,
        ...statusOf(ev.status ?? main?.status),
        watch: broadcastsFor(main ?? comps[0], feed.league),
      });
    } else if (feed.kind === 'tournament') {
      // Tennis: tournaments run for days, so they show as all-day items.
      const from = new Date(ev.date);
      const to = new Date(ev.endDate ?? ev.date);
      const dayStart = new Date(today); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(today); dayEnd.setHours(23, 59, 59, 999);
      if (isNaN(from) || from > dayEnd || to < dayStart) continue;
      if (ev.status?.type?.state === 'post') continue; // already over
      items.push({
        ...base,
        id: `${feed.path}:${ev.id}`,
        title: ev.name ?? ev.shortName,
        subtitle: `${feed.league} tournament`,
        start: null, allDay: true,
        ...statusOf(ev.status),
        watch: WATCH_FALLBACK[feed.league],
      });
    }
  }
  return items;
}

// --- Cycling (TheSportsDB) ---------------------------------------------------
// Works on a single day's list or a whole season: only today's races are kept.
export function parseCycling(json, today) {
  return (json?.events ?? []).filter((ev) => !ev.dateEvent || ev.dateEvent === isoDay(today)).map((ev) => {
    const ts = ev.strTimestamp ? new Date(/Z|[+-]\d\d:?\d\d$/.test(ev.strTimestamp) ? ev.strTimestamp : ev.strTimestamp + 'Z') : null;
    const timed = ts && !isNaN(ts) && sameLocalDay(ts, today);
    return {
      id: `cycling:${ev.idEvent}`,
      section: 'other', sport: 'Cycling', league: ev.strLeague ?? 'Cycling',
      title: ev.strEvent, subtitle: ev.strLeague ?? 'Cycling', tag: '', score: '',
      start: timed ? ts : null, allDay: !timed,
      state: 'pre', statusText: '',
      watch: WATCH_FALLBACK.Cycling,
    };
  });
}

// --- Putting it together -----------------------------------------------------
const SPORT_ORDER = ['Soccer', 'Football', 'Basketball', 'Baseball', 'Hockey', 'F1', 'Tennis', 'Combat', 'Cycling'];

export function sortItems(items) {
  const t = (i) => (i.start ? i.start.getTime() : -1);
  return [...items].sort((a, b) => (t(a) - t(b)) || (SPORT_ORDER.indexOf(a.sport) - SPORT_ORDER.indexOf(b.sport)));
}

async function getJson(fetchFn, url) {
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`${res.status} from ${url}`);
  return res.json();
}

// Returns { mine, big, other, failed: [names that didn't load], quiet: [sports with nothing today] }.
// cyclingUrl: the app reads ./cycling.json; Node can read TheSportsDB directly.
export async function loadToday({ today = new Date(), follows, fetchFn = fetch, cyclingUrl = './cycling.json' }) {
  const day = ymd(today);
  const jobs = [
    ...LEAGUES.map((f) => [f.league, () => getJson(fetchFn, espnScoreboard(f.path, day)).then((j) => parseLeague(f, j, today, follows))]),
    ...SPORT_FEEDS.map((f) => [f.league, () => getJson(fetchFn, espnScoreboard(f.path, day)).then((j) => parseSportFeed(f, j, today))]),
    ['Cycling', () => getJson(fetchFn, cyclingUrl === 'direct' ? CYCLING_DIRECT(isoDay(today)) : cyclingUrl).then((j) => parseCycling(j, today))],
  ];
  const results = await Promise.allSettled(jobs.map(([, run]) => run()));
  const all = [];
  const failed = [];
  const quiet = []; // whole sports that loaded fine but have nothing today
  const SPORT_NAMES = { 'Formula 1': 'F1', ATP: 'Tennis', WTA: 'Tennis', UFC: 'UFC', Cycling: 'Cycling' };
  results.forEach((r, i) => {
    const name = jobs[i][0];
    if (r.status !== 'fulfilled') { failed.push(name); return; }
    all.push(...r.value);
    if (SPORT_NAMES[name] && !r.value.length) quiet.push(SPORT_NAMES[name]);
  });
  const seen = new Set();
  const items = sortItems(all.filter((i) => (seen.has(i.id) ? false : seen.add(i.id))));
  return {
    mine: items.filter((i) => i.section === 'mine'),
    big: items.filter((i) => i.section === 'big'),
    other: items.filter((i) => i.section === 'other'),
    failed: uniq(failed),
    // Tennis counts as quiet only if both tours are.
    quiet: uniq(quiet).filter((q) => q !== 'Tennis' || quiet.filter((x) => x === 'Tennis').length === 2),
  };
}

// Teams in one league, for the "add a team" picker.
export async function loadTeams(leaguePath, fetchFn = fetch) {
  const feed = LEAGUES.find((l) => l.path === leaguePath);
  const json = await getJson(fetchFn, espnTeams(leaguePath));
  const teams = json?.sports?.[0]?.leagues?.[0]?.teams ?? [];
  return teams
    .map(({ team }) => ({
      group: feed.group, id: String(team.id), abbr: team.abbreviation,
      name: team.shortDisplayName ?? team.displayName, fullName: team.displayName,
      league: feed.league, logo: team.logos?.[0]?.href ?? '',
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}
