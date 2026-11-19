// How important a game is, and whether it's close. Used to order the
// All games page. Pure functions, so they can be tested with Node.

// Rough interest of each competition for a US fan.
const LEAGUE_WEIGHT = {
  'NFL': 30, 'Champions League': 25, 'NBA': 18, 'Premier League': 16, 'La Liga': 16,
  'MLB': 14, 'UFC': 18, 'Supercopa': 15, 'Bundesliga': 10, 'Serie A': 10, 'Europa League': 10,
  'Copa del Rey': 10, 'NHL': 8, 'MLS': 8, 'Ligue 1': 7, 'ATP': 8, 'WTA': 8, 'Cycling': 8,
  'Cyclocross': 6, 'Scottish Prem': 5, 'Argentina': 5,
};
const F1_SESSION = (title) => (/: Race$/i.test(title) ? 30 : /Sprint|Qualifying/i.test(title) ? 15 : 4);

// Regulation length, and what counts as "close" late in a game or at the end.
const RULES = {
  Basketball: { periods: 4, latePeriod: 4, liveMargin: 6, finishMargin: 3 },
  Football:   { periods: 4, latePeriod: 4, liveMargin: 8, finishMargin: 3 },
  Baseball:   { periods: 9, latePeriod: 7, liveMargin: 2, finishMargin: 1 },
  Hockey:     { periods: 3, latePeriod: 3, liveMargin: 1, finishMargin: 1 },
  Soccer:     { periods: 2, latePeriod: 2, liveMargin: 1, finishMargin: 0 },
};

// 'live' = in progress and down to the wire; 'finish' = ended by a hair or in overtime.
export function closeness(item) {
  const r = RULES[item.sport];
  if (!r || item.margin == null || !item.period) return '';
  const overtime = item.period > r.periods;
  if (item.state === 'in') {
    return (overtime || item.period >= r.latePeriod) && item.margin <= r.liveMargin ? 'live' : '';
  }
  if (item.state === 'post') {
    // A soccer draw isn't a "close finish" by itself.
    return (overtime && item.sport !== 'Soccer') || (item.margin > 0 && item.margin <= r.finishMargin) ? 'finish' : '';
  }
  return '';
}

// Higher is more important.
export function importance(item) {
  let score = item.sport === 'F1' ? F1_SESSION(item.title) : (LEAGUE_WEIGHT[item.league] ?? 5);
  if (item.section === 'mine') score += 100;
  if (item.rivalry) score += 30;
  if (item.postseason) score += 40;
  if (item.tag === 'Worlds') score += 20;
  if (item.national) score += 8;
  if (item.quality != null) score += Math.round(item.quality * 15) + (item.topMatchup ? 15 : 0);
  const close = closeness(item);
  if (item.state === 'in') score += 15 + (close === 'live' ? 35 : 0);
  if (item.state === 'post') score -= close === 'finish' ? 35 : 50;
  return score;
}

// Win share from an ESPN record summary like "8-2", "7-3-2" (soccer: W-D-L; NHL: W-L-OTL).
export function winShare(summary, sport) {
  const n = String(summary ?? '').split('-').map(Number);
  if (n.length < 2 || n.some(isNaN)) return null;
  let wins, games;
  if (sport === 'Soccer' && n.length === 3) { wins = n[0] + n[1] / 2; games = n[0] + n[1] + n[2]; }
  else { wins = n[0]; games = n.reduce((a, b) => a + b, 0); }
  return games >= 4 ? wins / games : null;
}

export function rank(item) {
  const close = closeness(item);
  return { ...item, close, importance: importance(item) };
}
