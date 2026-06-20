/* ============================================================
   Service worker — makes the games installable + offline-capable.
   - App shell (same-origin files) is precached and served
     network-first so updates flow but offline still works.
   - Cross-origin assets (PokeAPI sprites, three.js, fonts) are
     cached on first use (cache-first) so replays work offline.
   Safe to remove: if it fails, the games just run online as before.
   ============================================================ */
const VERSION = 'pkmn-arcade-v1';
const SHELL = [
  './',
  './index.html',
  './monopoly.html',
  './gamekit.css',
  './gamekit.js',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    // Network-first for our own files (fresh when online, cached when not).
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
    );
  } else {
    // Cache-first for external assets (sprites / CDNs), so offline replays work.
    e.respondWith(
      caches.match(req).then((m) => m || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => m))
    );
  }
});
