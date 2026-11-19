// Always loads the newest app, and shows the last loaded games when offline.
const SHELL = 'gameday-shell-v10';
const DATA = 'gameday-data-v10';
const FILES = ['./', './index.html', './styles.css', './app.js', './feeds.js', './sources.js', './cyclocross.js', './ranking.js', './push-config.js', './manifest.json',
  './icons/icon-192.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => ![SHELL, DATA].includes(k)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin === location.origin) {
    // App files: always get the newest copy (skipping the browser's cache),
    // and use the saved copy only when offline.
    e.respondWith(fetch(e.request.url, { cache: 'no-cache' }).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true })));
  } else {
    // Sports data: always try the network first, fall back to the last copy.
    e.respondWith(fetch(e.request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(DATA).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request)));
  }
});

// Morning rundown notifications (sent by the notifier job).
self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data.json(); } catch { data = { title: 'Game Day', body: e.data?.text() ?? '' }; }
  e.waitUntil(self.registration.showNotification(data.title ?? 'Game Day', {
    body: data.body ?? "See what's on today.",
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((wins) =>
    wins.length ? wins[0].focus() : self.clients.openWindow('./')));
});
