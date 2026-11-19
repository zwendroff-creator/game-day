// What Victor follows, and where each thing comes from.
// Victor lives in Miami (Eastern time) and uses an iPhone.

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports';

// Team-sport competitions we read every day. "group" ties competitions
// together so a followed soccer club is found in its league AND in cups.
export const LEAGUES = [
  { path: 'football/nfl',            league: 'NFL',              sport: 'Football',   group: 'nfl' },
  { path: 'basketball/nba',          league: 'NBA',              sport: 'Basketball', group: 'nba' },
  { path: 'baseball/mlb',            league: 'MLB',              sport: 'Baseball',   group: 'mlb' },
  { path: 'hockey/nhl',              league: 'NHL',              sport: 'Hockey',     group: 'nhl' },
  { path: 'football/college-football', league: 'College Football', sport: 'Football', group: 'ncaaf', noPicker: true },
  { path: 'basketball/mens-college-basketball', league: 'College Basketball', sport: 'Basketball', group: 'ncaab', noPicker: true },
  { path: 'soccer/esp.1',            league: 'La Liga',          sport: 'Soccer',     group: 'soccer', pickable: true },
  { path: 'soccer/eng.1',            league: 'Premier League',   sport: 'Soccer',     group: 'soccer', pickable: true },
  { path: 'soccer/ger.1',            league: 'Bundesliga',       sport: 'Soccer',     group: 'soccer', pickable: true },
  { path: 'soccer/ita.1',            league: 'Serie A',          sport: 'Soccer',     group: 'soccer', pickable: true },
  { path: 'soccer/fra.1',            league: 'Ligue 1',          sport: 'Soccer',     group: 'soccer', pickable: true },
  { path: 'soccer/usa.1',            league: 'MLS',              sport: 'Soccer',     group: 'soccer', pickable: true },
  { path: 'soccer/sco.1',            league: 'Scottish Prem',    sport: 'Soccer',     group: 'soccer' },
  { path: 'soccer/arg.1',            league: 'Argentina',        sport: 'Soccer',     group: 'soccer' },
  { path: 'soccer/uefa.champions',   league: 'Champions League', sport: 'Soccer',     group: 'soccer' },
  { path: 'soccer/uefa.europa',      league: 'Europa League',    sport: 'Soccer',     group: 'soccer' },
  { path: 'soccer/esp.copa_del_rey', league: 'Copa del Rey',     sport: 'Soccer',     group: 'soccer', cup: true },
  { path: 'soccer/esp.super_cup',    league: 'Supercopa',        sport: 'Soccer',     group: 'soccer', cup: true },
  // Cups ("cup: true" groups them in settings).
  { path: 'soccer/eng.fa',           league: 'FA Cup',           sport: 'Soccer',     group: 'soccer', cup: true },
  { path: 'soccer/eng.league_cup',   league: 'Carabao Cup',      sport: 'Soccer',     group: 'soccer', cup: true },
  { path: 'soccer/ger.dfb_pokal',    league: 'DFB-Pokal',        sport: 'Soccer',     group: 'soccer', cup: true },
  { path: 'soccer/ita.coppa_italia', league: 'Coppa Italia',     sport: 'Soccer',     group: 'soccer', cup: true },
  { path: 'soccer/fra.coupe_de_france', league: 'Coupe de France', sport: 'Soccer',   group: 'soccer', cup: true },
  { path: 'soccer/ned.cup',          league: 'KNVB Beker',       sport: 'Soccer',     group: 'soccer', cup: true },
  { path: 'soccer/por.taca.portugal', league: 'Taça de Portugal', sport: 'Soccer',    group: 'soccer', cup: true },
  { path: 'soccer/sco.tennents',     league: 'Scottish Cup',     sport: 'Soccer',     group: 'soccer', cup: true },
  { path: 'soccer/sco.cis',          league: 'Scottish League Cup', sport: 'Soccer',  group: 'soccer', cup: true },
  { path: 'soccer/uefa.europa.conf', league: 'Conference League', sport: 'Soccer',    group: 'soccer', cup: true },
  { path: 'soccer/uefa.super_cup',   league: 'UEFA Super Cup',   sport: 'Soccer',     group: 'soccer', cup: true },
  { path: 'soccer/fifa.cwc',         league: 'Club World Cup',   sport: 'Soccer',     group: 'soccer', cup: true },
  { path: 'soccer/conmebol.libertadores', league: 'Copa Libertadores', sport: 'Soccer', group: 'soccer', cup: true },
  { path: 'soccer/conmebol.sudamericana', league: 'Copa Sudamericana', sport: 'Soccer', group: 'soccer', cup: true },
  { path: 'soccer/concacaf.champions', league: 'Concacaf Champions Cup', sport: 'Soccer', group: 'soccer', cup: true },
  { path: 'soccer/concacaf.leagues.cup', league: 'Leagues Cup',  sport: 'Soccer',     group: 'soccer', cup: true },
  { path: 'soccer/usa.open',         league: 'U.S. Open Cup',    sport: 'Soccer',     group: 'soccer', cup: true },
  { path: 'soccer/eng.charity',      league: 'Community Shield', sport: 'Soccer',     group: 'soccer', cup: true },
  { path: 'soccer/ita.super_cup',    league: 'Supercoppa Italiana', sport: 'Soccer',  group: 'soccer', cup: true },
  { path: 'soccer/ger.super_cup',    league: 'DFL-Supercup',     sport: 'Soccer',     group: 'soccer', cup: true },
  { path: 'soccer/fra.super_cup',    league: 'Trophée des Champions', sport: 'Soccer', group: 'soccer', cup: true },
];

// Leagues offered in the "add a team" picker (US leagues + main soccer leagues).
export const PICKER_LEAGUES = LEAGUES.filter((l) => !l.noPicker && (l.group !== 'soccer' || l.pickable));

// Victor's starting teams. Matching is by ESPN team id, or abbreviation as a backup.
export const DEFAULT_TEAMS = [
  { group: 'soccer', id: '83', abbr: 'BAR', name: 'Barcelona', league: 'La Liga' },
  { group: 'mlb',    id: '25', abbr: 'SD',  name: 'Padres',    league: 'MLB' },
  { group: 'nfl',    id: '9',  abbr: 'GB',  name: 'Packers',   league: 'NFL' },
  { group: 'nba',    id: '14', abbr: 'MIA', name: 'Heat',      league: 'NBA' },
];

// Whole sports: every event happening today is shown.
export const SPORT_FEEDS = [
  { sport: 'F1',     league: 'Formula 1', path: 'racing/f1',  kind: 'sessions' },
  { sport: 'Combat', league: 'UFC',       path: 'mma/ufc',    kind: 'card' },
  { sport: 'Tennis', league: 'ATP',       path: 'tennis/atp', kind: 'tournament' },
  { sport: 'Tennis', league: 'WTA',       path: 'tennis/wta', kind: 'tournament' },
  { sport: 'Golf',   league: 'PGA Tour',  path: 'golf/pga',   kind: 'tournament' },
  { sport: 'Golf',   league: 'LPGA',      path: 'golf/lpga',  kind: 'tournament' },
];

// Whole sports and leagues Victor can follow in settings. Followed ones show
// in Highlights; everything shows in All games either way.
export const FOLLOWABLE_SPORTS = [
  { key: 'Formula 1', label: 'F1' },
  { key: 'ATP', label: 'Tennis: ATP' },
  { key: 'WTA', label: 'Tennis: WTA' },
  { key: 'UFC', label: 'UFC' },
  { key: 'PGA Tour', label: 'Golf: PGA Tour' },
  { key: 'LPGA', label: 'Golf: LPGA' },
  { key: 'Cycling', label: 'Road cycling' },
  { key: 'Cyclocross', label: 'Cyclocross' },
];
// What he follows to start with: the sports he told us about.
export const DEFAULT_LEAGUES = ['Formula 1', 'ATP', 'WTA', 'UFC', 'Cycling', 'Cyclocross'];

// Cycling isn't on ESPN, so it comes from TheSportsDB's free tier.
// Browsers can't read TheSportsDB directly, so the publish job saves the
// season calendar as cycling.json next to the app (see tools/cycling.mjs).
// "123" is TheSportsDB's free test key (the old "3" key was retired).
export const CYCLING_DIRECT = (isoDate) =>
  `https://www.thesportsdb.com/api/v1/json/123/eventsday.php?d=${isoDate}&s=Cycling`;

export const espnScoreboard = (path, yyyymmdd) => `${ESPN}/${path}/scoreboard?dates=${yyyymmdd}`;
export const espnTeams = (path) => `${ESPN}/${path}/teams`;

// Rivalries and derbies worth a heads-up. Both names must appear in the
// matchup (accents and case ignored). "leagues" limits where we look, so
// "Inter" in Serie A never matches Inter Miami.
export const RIVALRIES = [
  // Soccer
  { a: 'Barcelona', b: 'Real Madrid', name: 'El Clásico' },
  { a: 'Real Madrid', b: 'Atletico', name: 'Madrid derby' },
  { a: 'Sevilla', b: 'Betis', name: 'Seville derby' },
  { a: 'Athletic', b: 'Real Sociedad', name: 'Basque derby' },
  { a: 'Barcelona', b: 'Espanyol', name: 'Barcelona derby' },
  { a: 'Arsenal', b: 'Tottenham', name: 'North London derby' },
  { a: 'Manchester United', b: 'Manchester City', name: 'Manchester derby' },
  { a: 'Liverpool', b: 'Everton', name: 'Merseyside derby' },
  { a: 'Liverpool', b: 'Manchester United', name: 'North West derby' },
  { a: 'Arsenal', b: 'Chelsea', name: 'London derby' },
  { a: 'Chelsea', b: 'Tottenham', name: 'London derby' },
  { a: 'Bayern', b: 'Dortmund', name: 'Der Klassiker' },
  { a: 'Dortmund', b: 'Schalke', name: 'Revierderby' },
  { a: 'Internazionale', b: 'AC Milan', name: 'Derby della Madonnina' },
  { a: 'Roma', b: 'Lazio', name: 'Derby della Capitale' },
  { a: 'Juventus', b: 'Internazionale', name: "Derby d'Italia" },
  { a: 'Juventus', b: 'Torino', name: 'Derby della Mole' },
  { a: 'Paris Saint-Germain', b: 'Marseille', name: 'Le Classique' },
  { a: 'Celtic', b: 'Rangers', name: 'Old Firm derby' },
  { a: 'Boca', b: 'River', name: 'Superclásico' },
  { a: 'Inter Miami', b: 'Orlando', name: 'Florida derby' },
  { a: 'LA Galaxy', b: 'LAFC', name: 'El Tráfico' },
  { a: 'Seattle', b: 'Portland', name: 'Cascadia Cup' },
  // NFL
  { a: 'Bears', b: 'Packers', name: 'Bears–Packers rivalry' },
  { a: 'Cowboys', b: 'Eagles', name: 'NFC East rivalry' },
  { a: 'Cowboys', b: 'Commanders', name: 'NFC East rivalry' },
  { a: 'Giants', b: 'Eagles', name: 'NFC East rivalry' },
  { a: 'Ravens', b: 'Steelers', name: 'AFC North rivalry' },
  { a: 'Chiefs', b: 'Raiders', name: 'AFC West rivalry' },
  { a: '49ers', b: 'Seahawks', name: 'NFC West rivalry' },
  { a: '49ers', b: 'Cowboys', name: 'Classic rivalry' },
  { a: 'Dolphins', b: 'Bills', name: 'AFC East rivalry (Miami)' },
  { a: 'Dolphins', b: 'Jets', name: 'AFC East rivalry (Miami)' },
  // NBA
  { a: 'Lakers', b: 'Celtics', name: 'Lakers–Celtics' },
  { a: 'Celtics', b: 'Knicks', name: 'Celtics–Knicks' },
  { a: 'Lakers', b: 'Clippers', name: 'Battle of LA' },
  { a: 'Bulls', b: 'Pistons', name: 'Bulls–Pistons' },
  { a: 'Knicks', b: 'Nets', name: 'Battle of New York' },
  { a: 'Heat', b: 'Knicks', name: 'Heat–Knicks' },
  { a: 'Heat', b: 'Celtics', name: 'Heat–Celtics' },
  { a: 'Heat', b: 'Magic', name: 'Florida rivalry' },
  { a: 'Heat', b: 'Bulls', name: 'Heat–Bulls' },
  { a: '76ers', b: 'Celtics', name: '76ers–Celtics' },
  { a: 'Warriors', b: 'Lakers', name: 'Warriors–Lakers' },
  { a: 'Warriors', b: 'Cavaliers', name: 'Warriors–Cavaliers' },
  { a: 'Mavericks', b: 'Spurs', name: 'Texas rivalry' },
  { a: 'Rockets', b: 'Mavericks', name: 'Texas rivalry' },
  { a: 'Suns', b: 'Lakers', name: 'Suns–Lakers' },
  { a: 'Nuggets', b: 'Lakers', name: 'Nuggets–Lakers' },
  // MLB
  { a: 'Yankees', b: 'Red Sox', name: 'Yankees–Red Sox' },
  { a: 'Dodgers', b: 'Giants', name: 'Dodgers–Giants' },
  { a: 'Cubs', b: 'Cardinals', name: 'Cubs–Cardinals' },
  { a: 'Yankees', b: 'Mets', name: 'Subway Series' },
  { a: 'Cubs', b: 'White Sox', name: 'Crosstown Classic' },
  // NHL
  { a: 'Bruins', b: 'Canadiens', name: 'Bruins–Canadiens' },
  { a: 'Panthers', b: 'Lightning', name: 'Battle of Florida' },
  { a: 'Rangers', b: 'Islanders', name: 'New York rivalry' },
  { a: 'Oilers', b: 'Flames', name: 'Battle of Alberta' },
];

// Where to watch in the US when the feed doesn't say, or only lists a
// local channel Victor can't get in Miami. Check these each season.
export const WATCH_FALLBACK = {
  'NFL':              ['NFL Sunday Ticket (YouTube)'],
  'NBA':              ['NBA League Pass'],
  'MLB':              ['MLB.TV'],
  'NHL':              ['ESPN+'],
  'College Football': ['ESPN+'],
  'College Basketball': ['ESPN+'],
  'PGA Tour':         ['Golf Channel', 'ESPN+', 'Peacock'],
  'LPGA':             ['Golf Channel', 'Peacock'],
  'La Liga':          ['ESPN+'],
  'Premier League':   ['Peacock', 'USA Network'],
  'Bundesliga':       ['ESPN+'],
  'Serie A':          ['Paramount+'],
  'Ligue 1':          ['beIN Sports'],
  'MLS':              ['Apple TV'],
  'Scottish Prem':    ['CBS Sports Golazo'],
  'Argentina':        ['Paramount+'],
  'Champions League': ['Paramount+', 'CBS'],
  'Europa League':    ['Paramount+'],
  'Copa del Rey':     ['ESPN+'],
  'Supercopa':        ['ESPN+'],
  'FA Cup':           ['ESPN+'],
  'Carabao Cup':      ['Paramount+'],
  // Cups: the feed usually names the channel; these are backups. "Check listings" = not sure.
  'DFB-Pokal':        ['ESPN+'],
  'DFL-Supercup':     ['ESPN+'],
  'Coppa Italia':     ['Paramount+'],
  'Supercoppa Italiana': ['Paramount+'],
  'Coupe de France':  ['beIN Sports'],
  'Trophée des Champions': ['beIN Sports'],
  'Conference League': ['Paramount+'],
  'UEFA Super Cup':   ['Paramount+', 'CBS'],
  'Copa Libertadores': ['beIN Sports', 'Fubo'],
  'Copa Sudamericana': ['beIN Sports', 'Fubo'],
  'Concacaf Champions Cup': ['FOX', 'FS1'],
  'Leagues Cup':      ['Apple TV'],
  'Club World Cup':   ['Check listings'],
  'KNVB Beker':       ['Check listings'],
  'Taça de Portugal': ['Check listings'],
  'Scottish Cup':     ['Check listings'],
  'Scottish League Cup': ['Check listings'],
  'U.S. Open Cup':    ['Check listings'],
  'Community Shield': ['ESPN+'],
  'Formula 1':        ['Apple TV'],
  'UFC':              ['Paramount+', 'CBS'],
  'ATP':              ['Tennis Channel', 'ESPN'],
  'WTA':              ['Tennis Channel', 'ESPN'],
  'Cycling':          ['Peacock', 'HBO Max', 'FloBikes'],
};

// Local channels that reach Miami. Another team's local channel doesn't
// count, and we point to the out-of-market package instead.
export const MIAMI_LOCAL = [
  'FanDuel SN Sun', 'FanDuel Sports Network Sun', 'FDSN Sun', 'Bally Sports Sun',
  'FanDuel SN Florida', 'FDSN Florida', 'Scripps', 'WSFL', 'WPLG', 'WFOR', 'WTVJ', 'WSVN', 'WBFS',
];
