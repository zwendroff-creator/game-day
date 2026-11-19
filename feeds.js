// Turns the raw feeds into one simple list of "things to watch today".
// No DOM code here, so it can be tested with Node.
import {
  LEAGUES, SPORT_FEEDS, CYCLING_DIRECT, RIVALRIES, WATCH_FALLBACK, MIAMI_LOCAL,
  espnScoreboard, DEFAULT_LEAGUES,
} from './sources.js';
import { CYCLOCROSS } from './cyclocross.js';
import { rank, winShare } from './ranking.js';

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

    let title;
    if (ours) {
      const other = teams.find((c) => c !== ours);
      title = `${ours.team?.shortDisplayName ?? ours.team?.displayName} ${ours.homeAway === 'home' ? 'vs' : 'at'} ${other?.team?.shortDisplayName ?? other?.team?.displayName ?? 'TBD'}`;
    } else {
      title = `${away.team?.shortDisplayName ?? away.team?.displayName} at ${home.team?.shortDisplayName ?? home.team?.displayName}`;
    }
    const hasScore = teams.every((c) => c.score != null && c.score !== '') && (comp.status?.type?.state ?? 'pre') !== 'pre';
    const record = (c) => {
      const r = (c.records ?? []).find((x) => x.type === 'total' || x.name === 'overall' || x.name === 'All Splits') ?? c.records?.[0];
      return winShare(r?.summary, feed.sport);
    };
    const shares = [record(home), record(away)];
    const quality = shares.every((x) => x != null) ? (shares[0] + shares[1]) / 2 : null;
    const topMatchup = shares.every((x) => x != null && x >= 0.6);
    const national = (comp.broadcasts ?? []).some((b) => (b.market ?? '').toLowerCase() === 'national');
    items.push({
      id: `${feed.group}:${ev.id}`,
      section: ours ? 'mine' : rivalry || postseason ? 'big' : 'rest',
      sport: feed.sport,
      league: feed.league,
      title,
      subtitle: feed.league,
      tag: rivalry?.name ?? (postseason ? 'Playoffs' : topMatchup ? 'Top matchup' : ''),
      start,
      rivalry: !!rivalry, postseason, national, quality, topMatchup,
      period: comp.status?.period ?? ev.status?.period ?? 0,
      margin: hasScore ? Math.abs(Number(home.score) - Number(away.score)) : null,
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
      // Tennis and golf: tournaments run for days, so they show as all-day items.
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

// --- Cyclocross (hand-kept calendar) -----------------------------------------
export function cyclocrossToday(today, calendar = CYCLOCROSS) {
  return calendar.filter((r) => r.date === isoDay(today)).map((r) => ({
    id: `cx:${r.date}:${r.place}`,
    section: 'other', sport: 'Cycling', league: 'Cyclocross',
    title: `Cyclocross: ${r.place}`,
    subtitle: r.series,
    tag: r.series === 'World Championships' ? 'Worlds' : r.series === 'European Championships' ? 'Euros' : '',
    score: '', start: null, allDay: true, state: 'pre', statusText: '',
    watch: r.watch,
  }));
}

// --- Putting it together -----------------------------------------------------
const SPORT_ORDER = ['Soccer', 'Football', 'Basketball', 'Baseball', 'Hockey', 'F1', 'Tennis', 'Golf', 'Combat', 'Cycling'];

export function sortItems(items) {
  const t = (i) => (i.start ? i.start.getTime() : -1);
  return [...items].sort((a, b) => (t(a) - t(b)) || (SPORT_ORDER.indexOf(a.sport) - SPORT_ORDER.indexOf(b.sport)));
}

async function getJson(fetchFn, url) {
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`${res.status} from ${url}`);
  return res.json();
}

// What a followed-league setting matches: the league, or "Cycling" for all road races.
export const followKey = (item) => (item.sport === 'Cycling' && item.league !== 'Cyclocross' ? 'Cycling' : item.league);

// Which "Nothing on today in ..." name each followed whole sport reports as.
const QUIET_NAME = { 'Formula 1': 'F1', ATP: 'Tennis', WTA: 'Tennis', UFC: 'UFC', 'PGA Tour': 'Golf', LPGA: 'Golf', Cycling: 'Cycling', Cyclocross: 'Cycling' };

// Returns { all, ranked, mine, big, league, other, rest, failed, quiet }:
//   all/ranked = every item today (by time / by importance)
//   mine, big, league (followed leagues' games), other (followed whole sports) = the Highlights
//   rest = everything else; failed = feeds that didn't load; quiet = followed sports with nothing today
// leagues: followed league/sport keys (see FOLLOWABLE_SPORTS and LEAGUES).
// cyclingUrl: the app reads ./cycling.json; Node can read TheSportsDB directly.
export async function loadToday({ today = new Date(), follows, leagues = DEFAULT_LEAGUES, fetchFn = fetch, cyclingUrl = './cycling.json' }) {
  const day = ymd(today);
  const jobs = [
    ...LEAGUES.map((f) => [f.league, () => getJson(fetchFn, espnScoreboard(f.path, day)).then((j) => parseLeague(f, j, today, follows))]),
    ...SPORT_FEEDS.map((f) => [f.league, () => getJson(fetchFn, espnScoreboard(f.path, day)).then((j) => parseSportFeed(f, j, today))]),
    ['Cycling', () => getJson(fetchFn, cyclingUrl === 'direct' ? CYCLING_DIRECT(isoDay(today)) : cyclingUrl).then((j) => parseCycling(j, today))],
  ];
  const results = await Promise.allSettled(jobs.map(([, run]) => run()));
  const all = [];
  const failed = [];
  results.forEach((r, i) => (r.status === 'fulfilled' ? all.push(...r.value) : failed.push(jobs[i][0])));
  all.push(...cyclocrossToday(today));

  // Sort each item into Highlights or not, by what he follows.
  const followed = new Set(leagues);
  for (const item of all) {
    const on = followed.has(followKey(item));
    if (item.section === 'rest' && on) item.section = 'league';
    else if (item.section === 'other' && !on) item.section = 'rest';
  }

  const seen = new Set();
  const items = sortItems(all.filter((i) => (seen.has(i.id) ? false : seen.add(i.id))).map(rank));

  // Followed whole sports that loaded fine but have nothing on today.
  const quiet = [];
  for (const name of uniq(Object.values(QUIET_NAME))) {
    const keys = Object.keys(QUIET_NAME).filter((k) => QUIET_NAME[k] === name && followed.has(k));
    if (!keys.length || keys.some((k) => failed.includes(k))) continue;
    if (!items.some((i) => keys.includes(followKey(i)))) quiet.push(name);
  }

  return {
    all: items,
    ranked: [...items].sort((a, b) => (b.importance - a.importance) || ((a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0))),
    rest: items.filter((i) => i.section === 'rest'),
    mine: items.filter((i) => i.section === 'mine'),
    big: items.filter((i) => i.section === 'big'),
    league: items.filter((i) => i.section === 'league'),
    other: items.filter((i) => i.section === 'other'),
    failed: uniq(failed),
    quiet,
  };
}

// Teams in one league, for the "add a team" picker. Read from teams.json,
// which the publish job builds (see tools/teams.mjs).
let teamsFile;
export async function loadTeams(leaguePath, fetchFn = fetch, url = './teams.json') {
  const feed = LEAGUES.find((l) => l.path === leaguePath);
  teamsFile ??= getJson(fetchFn, url).catch((err) => { teamsFile = undefined; throw err; });
  const all = await teamsFile;
  return (all[leaguePath] ?? [])
    .map((t) => ({ ...t, group: feed.group, league: feed.league }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}
