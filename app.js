import { loadToday, loadTeams } from './feeds.js';
import { DEFAULT_TEAMS, PICKER_LEAGUES, LEAGUES } from './sources.js';
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
const sameTeam = (a, b) => a.group === b.group && String(a.id) === String(b.id);

// --- Rendering ---------------------------------------------------------------
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

const ICON = { Soccer: '⚽', Football: '🏈', Basketball: '🏀', Baseball: '⚾', Hockey: '🏒', F1: '🏎️', Tennis: '🎾', Combat: '🥊', Cycling: '🚴' };

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function card(item) {
  const when = item.allDay ? 'All day' : timeFmt.format(item.start);
  const live = item.state === 'in';
  const done = item.state === 'post';
  const status = live ? `<span class="pill live">● ${esc(item.statusText || 'Live')}</span>`
    : done ? `<span class="pill done">${esc(item.statusText || 'Final')}</span>` : '';
  return `
    <article class="card ${done ? 'is-done' : ''} ${item.section === 'mine' ? 'is-mine' : ''}">
      <div class="when"><span class="time">${esc(when)}</span><span class="icon" aria-hidden="true">${ICON[item.sport] ?? '•'}</span></div>
      <div class="body">
        <div class="meta">${item.section === 'mine' ? '<span class="pill mine">★ Your team</span> ' : ''}${esc(item.subtitle)}${item.tag ? ` <span class="pill tag">${esc(item.tag)}</span>` : ''} ${status}</div>
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
try { if (localStorage.getItem(VIEW_KEY) === 'highlights') view = 'highlights'; } catch {}
let lastData = null;

// League order on the All games page: his teams' leagues first, then the rest.
const LEAGUE_ORDER = [...LEAGUES.map((l) => l.league), 'Formula 1', 'ATP', 'WTA', 'UFC', 'Cyclocross'];
const leagueRank = (league) => { const i = LEAGUE_ORDER.indexOf(league); return i < 0 ? LEAGUE_ORDER.length : i; };

function allGamesView({ all }) {
  if (!all.length) return '<p class="empty">No games found for today.</p>';
  const groups = new Map();
  for (const item of all) {
    const key = item.sport === 'Cycling' && item.league !== 'Cyclocross' ? 'Cycling' : item.league;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const followedLeague = (items) => items.some((i) => i.section === 'mine');
  return [...groups.entries()]
    .sort(([a, ai], [b, bi]) => (followedLeague(bi) - followedLeague(ai)) || (leagueRank(a) - leagueRank(b)))
    .map(([league, items]) => `<section><h2>${esc(league)} <span class="count">${items.length}</span></h2>${items.map(card).join('')}</section>`)
    .join('');
}

function highlightsView({ mine, big, other }) {
  const names = getFollows().map((f) => f.name).join(', ');
  return section('Your teams', mine, names ? `No games today for ${names}.` : 'Add a team to follow with the ⚙︎ button.') +
    section('Big games today', big, '') +
    section('Also on today', other, '') +
    (!big.length && !other.length ? '<p class="empty">Nothing else big on today.</p>' : '');
}

function renderView() {
  for (const btn of document.querySelectorAll('[data-view]')) btn.setAttribute('aria-selected', String(btn.dataset.view === view));
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
    <button role="tab" data-view="highlights" aria-selected="false">Highlights</button></nav>`);
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
    lastData = await loadToday({ today, follows: getFollows() });
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
  $('#open-settings').onclick = () => { renderFollows(); renderPicker(); $('#settings').showModal(); };
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
  $('#reset-teams').onclick = () => { setFollows(DEFAULT_TEAMS); renderFollows(); renderPicker(); };
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
      const code = btoa(unescape(encodeURIComponent(JSON.stringify({ subscription: sub.toJSON(), follows: getFollows() }))));
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

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
