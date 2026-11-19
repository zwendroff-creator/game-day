// Run with: node --test test/
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLeague, parseSportFeed, parseCycling, loadToday, findRivalry } from '../feeds.js';
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
  const items = parseLeague(nfl, json, today, DEFAULT_TEAMS);
  assert.equal(items.length, 1);
  assert.equal(items[0].section, 'mine');
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
  const items = parseLeague(laliga, json, today, DEFAULT_TEAMS);
  assert.equal(items.length, 1);
  assert.equal(items[0].section, 'big');
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
  assert.deepEqual(r.failed, ['UFC']);
});

test('morning summary lists his games first', async () => {
  const { summarize } = await import('../notify/morning.mjs');
  const mk = (section, h, title, tag = '') => ({ section, title, tag, start: new Date(Date.UTC(2026, 10, 22, h)), allDay: false });
  const msg = summarize({ mine: [mk('mine', 0, 'Heat vs Knicks')], big: [mk('big', 20, 'Tottenham at Arsenal', 'North London derby')], other: [] });
  assert.equal(msg.title, 'Game day: 1 for your teams');
  assert.match(msg.body, /Heat vs Knicks\n.*North London derby: Tottenham at Arsenal/);
  assert.equal(summarize({ mine: [], big: [], other: [] }), null);
});
