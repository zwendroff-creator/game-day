// Run with: node --test test/
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLeague, parseSportFeed, parseCycling, loadToday, findRivalry, loadTeams, cyclocrossToday } from '../feeds.js';
import { LEAGUES, DEFAULT_TEAMS } from '../sources.js';

const today = new Date(2026, 10, 22, 9, 0); // Sun Nov 22 2026, local time
const at = (h, m = 0) => new Date(2026, 10, 22, h, m).toISOString();
const team = (id, abbr, name, homeAway, score) => ({ homeAway, score, team: { id, abbreviation: abbr, displayName: name, shortDisplayName: name.split(' ').pop() } });
const game = (id, date, home, away, extra = {}) => ({
  id, date, season: { type: 2 },
  competitions: [{ date, competitors: [home, away], status: { type: { state: 'pre', shortDetail: '' } }, ...extra }],
});
const nfl = LEAGUES.find((l) => l.group === 'nfl');
const laliga = LEAGUES.find((l) => l.path === 'soccer/esp.1');

test('finds followed team and keeps national broadcast', () => {
  const json = { events: [
    game('1', at(13), team('9', 'GB', 'Green Bay Packers', 'home'), team('3', 'CHI', 'Chicago Bears', 'away'),
      { broadcasts: [{ market: 'national', names: ['FOX'] }] }),
    game('2', at(13), team('6', 'DAL', 'Dallas Cowboys', 'home'), team('19', 'NYG', 'New York Giants', 'away')),
  ] };
  const all = parseLeague(nfl, json, today, DEFAULT_TEAMS);
  assert.equal(all.length, 2);
  assert.equal(all.find((i) => i.id === 'nfl:2').section, 'rest');
  const items = all.filter((i) => i.section === 'mine');
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Packers vs Bears');
  assert.equal(items[0].tag, 'Bears–Packers rivalry');
  assert.deepEqual(items[0].watch, ['FOX']);
});

test('other markets\' local channel falls back to out-of-market package', () => {
  const json = { events: [game('1', at(13), team('9', 'GB', 'Green Bay Packers', 'away'), team('8', 'DET', 'Detroit Lions', 'home'),
    { broadcasts: [{ market: 'home', names: ['WJBK'] }] })] };
  assert.deepEqual(parseLeague(nfl, json, today, DEFAULT_TEAMS)[0].watch, ['NFL Sunday Ticket (YouTube)']);
});

test('rivalry games not involving his teams go to Big games', () => {
  const json = { events: [
    game('5', at(15), team('86', 'RMA', 'Real Madrid', 'home'), team('1068', 'ATM', 'Atlético Madrid', 'away')),
    game('6', at(15), team('95', 'GIR', 'Girona', 'home'), team('85', 'VAL', 'Valencia', 'away')),
  ] };
  const all = parseLeague(laliga, json, today, DEFAULT_TEAMS);
  assert.deepEqual(all.map((i) => i.section).sort(), ['big', 'rest']);
  const items = all.filter((i) => i.section === 'big');
  assert.equal(items.length, 1);
  assert.equal(items[0].tag, 'Madrid derby');
  assert.deepEqual(items[0].watch, ['ESPN+']);
});

test('El Clasico counts as his game and gets the tag', () => {
  const json = { events: [game('7', at(15), team('86', 'RMA', 'Real Madrid', 'home'), team('83', 'BAR', 'Barcelona', 'away'))] };
  const [i] = parseLeague(laliga, json, today, DEFAULT_TEAMS);
  assert.equal(i.section, 'mine');
  assert.equal(i.tag, 'El Clásico');
  assert.equal(i.title, 'Barcelona at Madrid');
});

test('Inter Miami does not match Serie A Inter rivalry', () => {
  assert.equal(findRivalry('Inter Miami CF', 'AC Milan'), undefined);
  assert.equal(findRivalry('Internazionale', 'AC Milan').name, 'Derby della Madonnina');
});

test('games on other days are skipped', () => {
  const json = { events: [game('1', new Date(2026, 10, 23, 20).toISOString(), team('9', 'GB', 'Green Bay Packers', 'home'), team('3', 'CHI', 'Chicago Bears', 'away'))] };
  assert.equal(parseLeague(nfl, json, today, DEFAULT_TEAMS).length, 0);
});

test('F1 shows only today\'s sessions with Apple TV fallback', () => {
  const json = { events: [{ id: 'gp', name: 'Las Vegas Grand Prix', shortName: 'Las Vegas GP', competitions: [
    { id: 'q', date: new Date(2026, 10, 21, 22).toISOString(), type: { abbreviation: 'Qual', text: 'Qualifying' } },
    { id: 'r', date: at(1), type: { abbreviation: 'Race', text: 'Race' }, status: { type: { state: 'pre' } } },
  ] }] };
  const items = parseSportFeed({ sport: 'F1', league: 'Formula 1', path: 'racing/f1', kind: 'sessions' }, json, today);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Las Vegas GP: Race');
  assert.deepEqual(items[0].watch, ['Apple TV']);
});

test('tennis tournament spanning today is an all-day item', () => {
  const json = { events: [{ id: 't', name: 'Davis Cup Finals', date: new Date(2026, 10, 18).toISOString(), endDate: new Date(2026, 10, 23).toISOString() }] };
  const items = parseSportFeed({ sport: 'Tennis', league: 'ATP', path: 'tennis/atp', kind: 'tournament' }, json, today);
  assert.equal(items.length, 1);
  assert.equal(items[0].allDay, true);
});

test('UFC card uses earliest bout and names main event', () => {
  const bout = (d, a, b) => ({ date: d, competitors: [{ athlete: { shortName: a } }, { athlete: { shortName: b } }] });
  const json = { events: [{ id: 'u', name: 'UFC 323', competitions: [bout(at(18), 'A. One', 'B. Two'), bout(at(22), 'C. Champ', 'D. Rival')] }] };
  const [i] = parseSportFeed({ sport: 'Combat', league: 'UFC', path: 'mma/ufc', kind: 'card' }, json, today);
  assert.equal(new Date(i.start).getHours(), 18);
  assert.equal(i.subtitle, 'Main event: C. Champ vs D. Rival');
});

test('cycling handles empty off-season response', () => {
  assert.deepEqual(parseCycling({ events: null }, today), []);
});

test('cycling season list keeps only today', () => {
  const items = parseCycling({ events: [
    { idEvent: '1', strEvent: 'Il Lombardia', dateEvent: '2026-11-22', strLeague: 'UCI World Tour' },
    { idEvent: '2', strEvent: 'Paris-Roubaix', dateEvent: '2026-04-12', strLeague: 'UCI World Tour' },
  ] }, today);
  assert.deepEqual(items.map((i) => i.title), ['Il Lombardia']);
});

test('finished tennis tournaments are hidden', () => {
  const json = { events: [{ id: 't', name: 'ATP Finals', date: new Date(2026, 10, 15).toISOString(), endDate: new Date(2026, 10, 22).toISOString(), status: { type: { state: 'post' } } }] };
  assert.equal(parseSportFeed({ sport: 'Tennis', league: 'ATP', path: 'tennis/atp', kind: 'tournament' }, json, today).length, 0);
});

test('loadToday survives failing feeds and groups sections', async () => {
  const fetchFn = async (url) => {
    if (url.includes('football/nfl')) return { ok: true, json: async () => ({ events: [game('1', at(13), team('9', 'GB', 'Green Bay Packers', 'home'), team('3', 'CHI', 'Chicago Bears', 'away'))] }) };
    if (url.includes('mma/ufc')) return { ok: false, status: 500 };
    return { ok: true, json: async () => ({ events: [] }) };
  };
  const r = await loadToday({ today, follows: DEFAULT_TEAMS, fetchFn });
  assert.equal(r.mine.length, 1);
  assert.ok(r.all.length >= r.mine.length + r.other.length);
  assert.deepEqual(r.failed, ['UFC']);
  assert.deepEqual(r.quiet, ['F1', 'Tennis']); // Nov 22 has a cyclocross race
});

test('morning summary lists his games first', async () => {
  const { summarize } = await import('../notify/morning.mjs');
  const mk = (section, h, title, tag = '') => ({ section, title, tag, start: new Date(Date.UTC(2026, 10, 22, h)), allDay: false });
  const msg = summarize({ mine: [mk('mine', 0, 'Heat vs Knicks')], big: [mk('big', 20, 'Tottenham at Arsenal', 'North London derby')], other: [] });
  assert.equal(msg.title, 'Game day: 1 for your teams');
  assert.match(msg.body, /Heat vs Knicks\n.*North London derby: Tottenham at Arsenal/);
  assert.equal(summarize({ mine: [], big: [], other: [] }), null);
});

test('team picker reads teams.json and sorts by name', async () => {
  const fetchFn = async () => ({ ok: true, json: async () => ({ 'football/nfl': [
    { id: '9', abbr: 'GB', name: 'Packers', fullName: 'Green Bay Packers' },
    { id: '3', abbr: 'CHI', name: 'Bears', fullName: 'Chicago Bears' },
  ] }) });
  const teams = await loadTeams('football/nfl', fetchFn);
  assert.deepEqual(teams.map((t) => t.fullName), ['Chicago Bears', 'Green Bay Packers']);
  assert.equal(teams[0].group, 'nfl');
  assert.equal(teams[0].league, 'NFL');
});

test('Heat-Knicks is flagged as a rivalry', () => {
  assert.equal(findRivalry('New York Knicks', 'Miami Heat').name, 'Heat–Knicks');
});

test('cyclocross shows on race day with where to watch', () => {
  const items = cyclocrossToday(today); // Nov 22: X2O Trofee Beringen
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Cyclocross: Beringen');
  assert.deepEqual(items[0].watch, ['HBO Max']);
  const wc = cyclocrossToday(new Date(2026, 11, 13));
  assert.equal(wc[0].subtitle, 'UCI Cyclocross World Cup');
  assert.deepEqual(wc[0].watch, ['FloBikes', 'HBO Max']);
});

test('cycling is not "quiet" on a cyclocross day', async () => {
  const fetchFn = async () => ({ ok: true, json: async () => ({ events: [] }) });
  const r = await loadToday({ today, follows: DEFAULT_TEAMS, fetchFn });
  assert.ok(r.other.some((i) => i.league === 'Cyclocross'));
  assert.ok(!r.quiet.includes('Cycling'));
});

// --- Ranking ---------------------------------------------------------------
import { closeness, importance, winShare } from '../ranking.js';
const g = (o) => ({ sport: 'Basketball', league: 'NBA', section: 'rest', title: '', state: 'pre', ...o });

test('close game rules', () => {
  assert.equal(closeness(g({ state: 'in', period: 4, margin: 4 })), 'live');
  assert.equal(closeness(g({ state: 'in', period: 2, margin: 2 })), ''); // too early
  assert.equal(closeness(g({ state: 'in', period: 4, margin: 15 })), '');
  assert.equal(closeness(g({ state: 'post', period: 5, margin: 9 })), 'finish'); // overtime
  assert.equal(closeness(g({ sport: 'Baseball', league: 'MLB', state: 'in', period: 8, margin: 1 })), 'live');
  assert.equal(closeness(g({ sport: 'Soccer', league: 'La Liga', state: 'post', period: 2, margin: 0 })), '');
  assert.equal(closeness(g({ sport: 'Soccer', league: 'La Liga', state: 'in', period: 2, margin: 1 })), 'live');
});

test('importance order: his team > live close > rivalry > plain', () => {
  const mine = importance(g({ section: 'mine' }));
  const closeLive = importance(g({ state: 'in', period: 4, margin: 2 }));
  const rivalry = importance(g({ rivalry: true }));
  const plainGame = importance(g({}));
  const finished = importance(g({ state: 'post', period: 4, margin: 20 }));
  assert.ok(mine > closeLive && closeLive > rivalry && rivalry > plainGame && plainGame > finished);
});

test('NFL outranks NHL, and F1 race outranks practice', () => {
  assert.ok(importance(g({ sport: 'Football', league: 'NFL' })) > importance(g({ sport: 'Hockey', league: 'NHL' })));
  assert.ok(importance({ sport: 'F1', league: 'Formula 1', title: 'Las Vegas GP: Race', state: 'pre' }) >
    importance({ sport: 'F1', league: 'Formula 1', title: 'Las Vegas GP: FP1', state: 'pre' }));
});

test('win share reads records', () => {
  assert.equal(winShare('8-2', 'Football'), 0.8);
  assert.equal(winShare('6-2-2', 'Soccer'), 0.7); // W-D-L
  assert.equal(winShare('3-1', 'Basketball'), null); // too few games
});

test('loadToday returns games ranked, his team first', async () => {
  const fetchFn = async (url) => {
    if (url.includes('basketball/nba')) return { ok: true, json: async () => ({ events: [
      game('a', at(19), team('1', 'ATL', 'Atlanta Hawks', 'home'), team('2', 'BOS', 'Boston Celtics', 'away')),
      game('b', at(20), team('14', 'MIA', 'Miami Heat', 'home'), team('5', 'CHA', 'Charlotte Hornets', 'away')),
    ] }) };
    return { ok: true, json: async () => ({ events: [] }) };
  };
  const r = await loadToday({ today, follows: DEFAULT_TEAMS, fetchFn });
  assert.equal(r.ranked[0].title, 'Heat vs Hornets');
});

test('following a whole league puts its games in Highlights', async () => {
  const fetchFn = async (url) => {
    if (url.includes('hockey/nhl')) return { ok: true, json: async () => ({ events: [
      game('h1', at(19), team('1', 'BOS', 'Boston Bruins', 'home'), team('2', 'CBJ', 'Columbus Blue Jackets', 'away')),
    ] }) };
    if (url.includes('racing/f1')) return { ok: true, json: async () => ({ events: [{ id: 'gp', name: 'GP', shortName: 'GP', competitions: [{ id: 'r', date: at(14), type: { text: 'Race' } }] }] }) };
    return { ok: true, json: async () => ({ events: [] }) };
  };
  const off = await loadToday({ today, follows: [], fetchFn });
  assert.equal(off.league.length, 0);
  assert.equal(off.other.filter((i) => i.sport === 'F1').length, 1); // F1 followed by default
  const on = await loadToday({ today, follows: [], leagues: ['NHL'], fetchFn });
  assert.deepEqual(on.league.map((i) => i.title), ['Jackets at Bruins']);
  assert.equal(on.other.filter((i) => i.sport === 'F1').length, 0); // F1 unfollowed: only in All games
  assert.ok(on.all.some((i) => i.sport === 'F1'));
});

test('college top matchup needs two ranked teams', () => {
  const ncaab = LEAGUES.find((l) => l.group === 'ncaab');
  const ranked = (id, name, ha, rank) => ({ ...team(id, id, name, ha), curatedRank: { current: rank }, records: [{ type: 'total', summary: '4-0' }] });
  const json = { events: [
    game('c1', at(19), ranked('1', 'Kansas Jayhawks', 'home', 5), ranked('2', 'Houston Cougars', 'away', 8)),
    game('c2', at(19), ranked('3', 'USC Trojans', 'home', 99), ranked('4', 'Tarleton State Texans', 'away', 99)),
  ] };
  const items = parseLeague(ncaab, json, today, []);
  assert.equal(items.find((i) => i.id.endsWith('c1')).tag, 'Top 25 matchup');
  assert.equal(items.find((i) => i.id.endsWith('c2')).tag, '');
});

// --- Upcoming ----------------------------------------------------------------
import { loadUpcoming, organize, classifyTeamGame } from '../feeds.js';

test('saved games are re-sorted with his current teams', () => {
  const raw = parseLeague(nfl, { events: [game('9', at(13), team('9', 'GB', 'Green Bay Packers', 'home'), team('8', 'DET', 'Detroit Lions', 'away'))] }, today, []);
  assert.equal(raw[0].section, 'rest');
  const json = JSON.parse(JSON.stringify(raw)); // as stored in upcoming.json
  const again = classifyTeamGame(json[0], DEFAULT_TEAMS);
  assert.equal(again.section, 'mine');
  assert.equal(again.title, 'Packers vs Lions');
  assert.equal(organize(json, { follows: [], leagues: ['NFL'] })[0].section, 'league');
});

test('loadUpcoming splits each future day into highlights', async () => {
  const tomorrow = '2026-11-23';
  const raw = parseLeague(nfl, { events: [game('9', new Date(2026, 10, 23, 13).toISOString(), team('9', 'GB', 'Green Bay Packers', 'home'), team('8', 'DET', 'Detroit Lions', 'away'))] }, new Date(2026, 10, 23, 12), []);
  const file = { days: { '2026-11-22': [], [tomorrow]: JSON.parse(JSON.stringify(raw)), '2026-11-24': [] } };
  const fetchFn = async () => ({ ok: true, json: async () => file });
  const days = await loadUpcoming({ follows: DEFAULT_TEAMS, fetchFn, from: today });
  assert.deepEqual(days.map((d) => d.iso), [tomorrow, '2026-11-24']); // today is left out
  assert.equal(days[0].mine[0].title, 'Packers vs Lions');
  assert.ok(days[0].mine[0].start instanceof Date);
});

test('hidden leagues are left out, except his own teams', async () => {
  const { organize } = await import('../feeds.js');
  const mk = (id, league, homeId, extra = {}) => ({ id, league, sport: 'Soccer', group: 'soccer', start: new Date('2026-11-22T15:00:00Z'), title: id,
    home: { id: homeId, abbreviation: 'H', short: 'Home' }, away: { id: '999', abbreviation: 'A', short: 'Away' }, ...extra });
  const follows = [{ group: 'soccer', id: '83', name: 'Barcelona' }];
  const items = organize([mk('a', 'MLS', '1'), mk('b', 'Copa del Rey', '83'), mk('c', 'Premier League', '2')],
    { follows, leagues: [], hidden: ['MLS', 'Copa del Rey'] });
  const ids = items.map((i) => i.id).sort();
  assert.deepEqual(ids, ['b', 'c']);
  const f1 = organize([{ id: 'f', league: 'Formula 1', sport: 'F1', section: 'other', title: 'Race', start: null }], { follows, leagues: ['Formula 1'], hidden: ['Formula 1'] });
  assert.equal(f1.length, 0);
});

test('cyclocross start times are read from a race page and shown on the card', async () => {
  const { parseCxSchedule, cxSlugs, CYCLOCROSS } = await import('../cyclocross.js');
  const html = `<h1>X2O Trofee Beringen</h1><span><img src="calendar.svg"> 22 November 2026</span>
    <h2>Schedule</h2><p>Sunday 22 November 2026</p>
    <div><span>10:00</span><span>10:00</span><a href="/race/18570/">Men Junior</a></div>
    <div><span>13:45</span><span>13:45</span><a href="/race/18568/">Women Elite</a></div>
    <div><span>15:00</span><span>15:00</span><a href="/race/18567/">Men Elite</a></div>
    <p>Local Time</p><p>Time in Beringen - 00:35.</p>`;
  const t = parseCxSchedule(html, '2026-11-22');
  assert.equal(t.women, '2026-11-22T12:45:00.000Z');
  assert.equal(t.men, '2026-11-22T14:00:00.000Z');
  assert.equal(parseCxSchedule(html, '2027-01-23'), null); // a different race in the same town
  assert.deepEqual(cxSlugs('Hamme-Zogge').slice(0, 1), ['hamme']);
  assert.ok(cxSlugs('Tábor').includes('tabor'));
  const [item] = cyclocrossToday(new Date(2026, 10, 22, 12), CYCLOCROSS, { '2026-11-22|Beringen': t });
  assert.equal(item.allDay, false);
  assert.equal(item.start.toISOString(), '2026-11-22T12:45:00.000Z');
  assert.match(item.subtitle, /Women 7:45\sAM, Men 9:00\sAM/);
  const [listed] = cyclocrossToday(new Date(2026, 10, 22, 12));
  assert.equal(listed.start.toISOString(), '2026-11-22T12:45:00.000Z'); // from the hand-kept list
  const [plain] = cyclocrossToday(new Date(2026, 11, 13, 12)); // Glasgow: no schedule yet
  assert.equal(plain.allDay, true);
});
