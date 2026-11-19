import { loadToday, loadTeams, loadUpcoming } from './feeds.js';
import { DEFAULT_TEAMS, PICKER_LEAGUES, LEAGUES, FOLLOWABLE_SPORTS, DEFAULT_LEAGUES } from './sources.js';
import { VAPID_PUBLIC_KEY } from './push-config.js';

const $ = (sel) => document.querySelector(sel);
const STORE_KEY = 'follows.v1';

// --- Followed teams (saved on this phone) -------------------------------------
function getFollows() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch {}
  return DEFAULT_TEAMS;
}
function setFollows(list) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch {}
}
// Whole sports and leagues he follows (saved on this phone).
const LEAGUES_KEY = 'leagues.v1';
function getLeagues() {
  try {
    const saved = JSON.parse(localStorage.getItem(LEAGUES_KEY));
    if (Array.isArray(saved)) return saved;
  } catch {}
  return DEFAULT_LEAGUES;
}
function setLeagues(list) {
  try { localStorage.setItem(LEAGUES_KEY, JSON.stringify(list)); } catch {}
}
const sameTeam = (a, b) => a.group === b.group && String(a.id) === String(b.id);

// --- Rendering ---------------------------------------------------------------
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

const ICON = { Soccer: '⚽', Football: '🏈', Basketball: '🏀', Baseball: '⚾', Hockey: '🏒', F1: '🏎️', Tennis: '🎾', Combat: '🥊', Cycling: '🚴', Golf: '⛳' };

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function card(item) {
  const when = item.allDay ? 'All day' : timeFmt.format(item.start);
  const live = item.state === 'in';
  const done = item.state === 'post';
  const hot = item.close === 'live' ? '<span class="pill hot">🔥 Close game</span>'
    : item.close === 'finish' ? '<span class="pill hot finish">Close finish</span>' : '';
  const status = live ? `<span class="pill live">● ${esc(item.statusText || 'Live')}</span>`
    : done ? `<span class="pill done">${esc(item.statusText || 'Final')}</span>` : '';
  return `
    <article class="card ${done ? 'is-done' : ''} ${item.section === 'mine' ? 'is-mine' : ''} ${item.close === 'live' ? 'is-hot' : ''}">
      <div class="when"><span class="time">${esc(when)}</span><span class="icon" aria-hidden="true">${ICON[item.sport] ?? '•'}</span></div>
      <div class="body">
        <div class="meta">${item.section === 'mine' ? '<span class="pill mine">★ Your team</span> ' : ''}${esc(item.subtitle)}${item.tag ? ` <span class="pill tag">${esc(item.tag)}</span>` : ''} ${hot} ${status}</div>
        <h3>${esc(item.title)}</h3>
        ${item.score ? `<div class="score">${esc(item.score)}</div>` : ''}
        <div class="watch">${(item.watch ?? []).map((w) => `<span class="chip">📺 ${esc(w)}</span>`).join('')}</div>
      </div>
    </article>`;
}

function section(title, items, empty) {
  if (!items.length && !empty) return '';
  return `<section><h2>${esc(title)}</h2>${items.length ? items.map(card).join('') : `<p class="empty">${esc(empty)}</p>`}</section>`;
}

// --- Two views: every game today, or just the highlights ----------------------
const VIEW_KEY = 'view.v1';
let view = 'all';
try { const v = localStorage.getItem(VIEW_KEY); if (v === 'highlights' || v === 'upcoming') view = v; } catch {}
let lastData = null;

// All games: Top games ranked by importance (see ranking.js), then the rest by time.
function allGamesView({ ranked }) {
  if (!ranked.length) return '<p class="empty">No games found for today.</p>';
  if (ranked.length < 8) return section('Ranked by importance', ranked, '');
  // Top 5 by importance, then everything else by start time (all-day events first).
  const t = (i) => (i.start ? i.start.getTime() : -1);
  const more = ranked.slice(5).sort((a, b) => t(a) - t(b));
  return section('Top games', ranked.slice(0, 5), '') + section('More today', more, '');
}

function highlightsView({ mine, big, league, other }) {
  const names = getFollows().map((f) => f.name).join(', ');
  // Games from whole leagues he follows, one heading per league.
  const byLeague = new Map();
  for (const item of league) byLeague.set(item.league, [...(byLeague.get(item.league) ?? []), item]);
  const leagueSections = [...byLeague.entries()].map(([name, items]) => section(name, items, '')).join('');
  return section('Your teams', mine, names ? `No games today for ${names}.` : 'Add a team to follow with the ⚙︎ button.') +
    section('Big games today', big, '') +
    leagueSections +
    section('Your sports', other, '') +
    (!big.length && !league.length && !other.length ? '<p class="empty">Nothing else on today from what you follow.</p>' : '');
}

// --- Upcoming: a 4-week calendar; tap a day to see its games ------------------
let upcoming = null;        // [{ day, iso, all, mine, big, league, other, ranked }]
let upcomingLoadedAt = 0;
let upcomingError = false;
let selectedIso = null;
let showAllDay = false;
const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'short' });
const longDayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

async function ensureUpcoming(force = false) {
  if (!force && upcoming && Date.now() - upcomingLoadedAt < 60 * 60_000) return;
  try {
    upcoming = await loadUpcoming({ follows: getFollows(), leagues: getLeagues() });
    upcomingLoadedAt = Date.now();
    upcomingError = false;
  } catch (err) {
    console.error(err);
    upcomingError = true;
  }
}

function upcomingView() {
  if (upcomingError && !upcoming) return '<p class="note">Couldn\'t load upcoming games. Tap ↻ to try again.</p>';
  if (!upcoming) return '<p class="empty">Loading the next 4 weeks…</p>';
  if (!upcoming.length) return '<p class="empty">No upcoming games found.</p>';
  const byIso = new Map(upcoming.map((d) => [d.iso, d]));
  if (!selectedIso || !byIso.has(selectedIso)) {
    selectedIso = (upcoming.find((d) => d.mine.length) ?? upcoming[0]).iso;
  }
  // Calendar grid, Sunday to Saturday, from this week through the last saved day.
  const first = new Date(); first.setHours(12, 0, 0, 0); first.setDate(first.getDate() - first.getDay());
  const last = upcoming[upcoming.length - 1].day;
  const cells = [];
  for (let d = new Date(first); d <= last || d.getDay() !== 0; d.setDate(d.getDate() + 1)) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const info = byIso.get(iso);
    const label = d.getDate() === 1 || !cells.length ? `${monthFmt.format(d)} ${d.getDate()}` : d.getDate();
    const isToday = d.toDateString() === new Date().toDateString();
    if (!info) { cells.push(`<div class="day off ${isToday ? 'today' : ''}" ${isToday ? 'title="Today: see All games"' : ''}><span class="num">${label}</span></div>`); continue; }
    const dots = (info.mine.length ? '<i class="dot mine"></i>' : '') + (info.big.length ? '<i class="dot big"></i>' : '') +
      (info.league.length || info.other.length ? '<i class="dot follow"></i>' : '');
    cells.push(`<button class="day ${iso === selectedIso ? 'sel' : ''}" data-iso="${iso}" aria-pressed="${iso === selectedIso}"
      aria-label="${esc(longDayFmt.format(info.day))}: ${info.all.length} games${info.mine.length ? ', your team plays' : ''}">
      <span class="num">${label}</span><span class="dots">${dots}</span></button>`);
  }
  const sel = byIso.get(selectedIso);
  const names = getFollows().map((f) => f.name).join(', ');
  const highlights = section('Your teams', sel.mine, names ? `No games for ${names}.` : '') +
    section('Big games', sel.big, '') +
    [...new Set(sel.league.map((i) => i.league))].map((l) => section(l, sel.league.filter((i) => i.league === l), '')).join('') +
    section('Your sports', sel.other, '');
  return `
    <div class="cal">
      <div class="dow">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x) => `<span>${x}</span>`).join('')}</div>
      <div class="grid">${cells.join('')}</div>
      <p class="legend"><i class="dot mine"></i> Your team <i class="dot big"></i> Big game <i class="dot follow"></i> Sports &amp; leagues you follow</p>
    </div>
    <h2 class="dayhead">${esc(longDayFmt.format(sel.day))}</h2>
    ${showAllDay ? section(`All ${sel.all.length} games, most important first`, sel.ranked, 'No games.') : highlights}
    ${sel.all.length ? `<button class="link" id="toggle-all">${showAllDay ? 'Show just the highlights' : `Show all ${sel.all.length} games this day`}</button>` : ''}`;
}

$('#list').addEventListener('click', (e) => {
  const day = e.target.closest('.day[data-iso]');
  if (day) { selectedIso = day.dataset.iso; showAllDay = false; renderView(); return; }
  if (e.target.closest('#toggle-all')) { showAllDay = !showAllDay; renderView(); }
});

function renderView() {
  for (const btn of document.querySelectorAll('[data-view]')) btn.setAttribute('aria-selected', String(btn.dataset.view === view));
  if (view === 'upcoming') {
    $('#list').innerHTML = upcomingView();
    if (!upcoming && !upcomingError) ensureUpcoming().then(() => { if (view === 'upcoming') renderView(); });
    return;
  }
  if (!lastData) return;
  const { failed, quiet } = lastData;
  $('#list').innerHTML = (view === 'all' ? allGamesView(lastData) : highlightsView(lastData)) +
    (quiet.length ? `<p class="note">Nothing on today in ${esc(quiet.join(', '))}.</p>` : '') +
    (failed.length ? `<p class="note">Couldn't load: ${esc(failed.join(', '))}. Tap ↻ to try again.</p>` : '');
}

// Older cached copies of index.html have no tabs, so add them if missing.
if (!document.querySelector('.tabs')) {
  $('#list').insertAdjacentHTML('beforebegin', `<nav class="tabs" role="tablist" aria-label="View">
    <button role="tab" data-view="all" aria-selected="true">All games</button>
    <button role="tab" data-view="highlights" aria-selected="false">Highlights</button>
    <button role="tab" data-view="upcoming" aria-selected="false">Upcoming</button></nav>`);
}
document.querySelector('.tabs').onclick = (e) => {
  const btn = e.target.closest('[data-view]');
  if (!btn || btn.dataset.view === view) return;
  view = btn.dataset.view;
  try { localStorage.setItem(VIEW_KEY, view); } catch {}
  renderView();
  window.scrollTo(0, 0);
};

let refreshTimer;
async function render() {
  const today = new Date();
  $('#date').textContent = dayFmt.format(today);
  $('#list').setAttribute('aria-busy', 'true');
  $('#refresh').disabled = true;
  try {
    lastData = await loadToday({ today, follows: getFollows(), leagues: getLeagues() });
    if (view === 'upcoming') await ensureUpcoming(true);
    else upcoming = null; // re-sort with current follows next time it opens
    renderView();
    $('#updated').textContent = `Updated ${timeFmt.format(new Date())}`;
    clearTimeout(refreshTimer);
    const anyLive = lastData.all.some((i) => i.state === 'in');
    refreshTimer = setTimeout(render, anyLive ? 60_000 : 10 * 60_000);
  } catch (err) {
    $('#list').innerHTML = `<p class="note">Couldn't load today's games. Check your connection and tap ↻.</p>`;
    console.error(err);
  } finally {
    $('#list').removeAttribute('aria-busy');
    $('#refresh').disabled = false;
  }
}

// --- Team settings sheet -----------------------------------------------------
function renderFollows() {
  const list = getFollows();
  $('#follows').innerHTML = list.length
    ? list.map((f, i) => `<li><span>${esc(f.name)} <small>${esc(f.league ?? '')}</small></span><button data-remove="${i}" aria-label="Stop following ${esc(f.name)}">Remove</button></li>`).join('')
    : '<li class="empty">No teams yet.</li>';
}

// Checkboxes for whole sports and leagues.
function renderSports() {
  const on = new Set(getLeagues());
  const box = (key, label) => `<label class="toggle"><input type="checkbox" data-key="${esc(key)}" ${on.has(key) ? 'checked' : ''}><span>${esc(label)}</span></label>`;
  $('#sports').innerHTML =
    `<p class="hint">Sports</p><div class="toggles">${FOLLOWABLE_SPORTS.map((s) => box(s.key, s.label)).join('')}</div>` +
    `<p class="hint">Whole leagues (every game, not just one team)</p><div class="toggles">${LEAGUES.filter((l) => !l.cup).map((l) => box(l.league, l.league)).join('')}</div>` +
    `<p class="hint">Cups</p><div class="toggles">${LEAGUES.filter((l) => l.cup).map((l) => box(l.league, l.league)).join('')}</div>`;
}

async function renderPicker() {
  const path = $('#league').value;
  const box = $('#teams');
  box.innerHTML = '<p class="empty">Loading teams…</p>';
  try {
    const teams = await loadTeams(path);
    const follows = getFollows();
    box.innerHTML = teams.map((t, i) => {
      const on = follows.some((f) => sameTeam(f, t));
      return `<button class="team ${on ? 'on' : ''}" data-team="${i}" ${on ? 'disabled' : ''}>
        ${t.logo ? `<img src="${esc(t.logo)}" alt="" loading="lazy">` : ''}<span>${esc(t.fullName)}</span>${on ? '<em>Following</em>' : ''}</button>`;
    }).join('');
    box.onclick = (e) => {
      const btn = e.target.closest('[data-team]');
      if (!btn) return;
      const t = teams[Number(btn.dataset.team)];
      setFollows([...getFollows(), { group: t.group, id: t.id, abbr: t.abbr, name: t.name, league: t.league }]);
      renderFollows();
      renderPicker();
    };
  } catch {
    box.innerHTML = '<p class="empty">Couldn\'t load teams. Try again in a moment.</p>';
  }
}

function setupSettings() {
  $('#league').innerHTML = PICKER_LEAGUES.map((l) => `<option value="${l.path}">${esc(l.league)}</option>`).join('');
  $('#open-settings').onclick = () => { renderFollows(); renderSports(); renderPicker(); $('#settings').showModal(); };
  $('#close-settings').onclick = () => { $('#settings').close(); render(); };
  $('#league').onchange = renderPicker;
  $('#follows').onclick = (e) => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    const list = getFollows();
    list.splice(Number(btn.dataset.remove), 1);
    setFollows(list);
    renderFollows();
    renderPicker();
  };
  $('#reset-teams').onclick = () => { setFollows(DEFAULT_TEAMS); setLeagues(DEFAULT_LEAGUES); renderFollows(); renderSports(); renderPicker(); };
  $('#sports').onchange = (e) => {
    const box = e.target.closest('input[data-key]');
    if (!box) return;
    const keys = new Set(getLeagues());
    if (box.checked) keys.add(box.dataset.key); else keys.delete(box.dataset.key);
    setLeagues([...keys]);
  };
}

// --- Morning alerts ----------------------------------------------------------
// iPhones only allow notifications once the app is on the home screen.
const installed = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const keyBytes = (b64) => {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

function setupAlerts() {
  if (!VAPID_PUBLIC_KEY) return;
  $('#alerts').hidden = false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    $('#alerts-msg').textContent = installed()
      ? 'This phone doesn\'t support notifications from web apps.'
      : 'To get morning alerts, first add Game Day to your home screen: in Safari tap Share, then "Add to Home Screen". Then open it from there.';
    $('#alerts-on').hidden = true;
    return;
  }
  $('#alerts-on').onclick = async () => {
    try {
      if ((await Notification.requestPermission()) !== 'granted') {
        $('#alerts-msg').textContent = 'Notifications are off for Game Day. You can turn them on in Settings, then Notifications.';
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription())
        ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
      const code = btoa(unescape(encodeURIComponent(JSON.stringify({ subscription: sub.toJSON(), follows: getFollows(), leagues: getLeagues() }))));
      $('#code').value = code;
      $('#alerts-code').hidden = false;
      $('#alerts-on').textContent = 'Alerts are on for this phone';
    } catch (err) {
      $('#alerts-msg').textContent = `Couldn't turn on alerts (${err.message}).`;
    }
  };
  $('#share-code').onclick = async () => {
    const text = $('#code').value;
    try {
      if (navigator.share) await navigator.share({ title: 'Game Day alerts code', text });
      else { await navigator.clipboard.writeText(text); $('#share-code').textContent = 'Copied'; }
    } catch {}
  };
}

// --- Start -------------------------------------------------------------------
$('#refresh').onclick = render;
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
setupSettings();
setupAlerts();
render();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => reg.update()).catch(() => {});
  // When a new version takes over, reload once so the whole page matches it.
  const hadOld = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadOld && !reloaded) { reloaded = true; location.reload(); }
  });
}
