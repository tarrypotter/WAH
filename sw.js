/* APPVERSE — offline cache */
const CACHE = 'appverse-v1';
const CORE = [
  './', './index.html', './manifest.json', './apps.json',
  './apple-touch-icon.png', './icon-192.png', './icon-512.png',
  './icon-maskable-512.png', './favicon-32.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(CORE.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 문서·앱 목록: 네트워크 우선, 실패 시 캐시
  const isDoc = req.mode === 'navigate' || req.destination === 'document';
  const isAppsJson = url.origin === self.location.origin && url.pathname.endsWith('/apps.json');
  if (isDoc || isAppsJson) {
    e.respondWith(
      fetch(req)
        .then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); return r; })
        .catch(() => caches.match(req).then((m) => m || (isDoc ? caches.match('./index.html') : undefined)))
    );
    return;
  }

  // 그 외(자체 정적 자산 + CDN 폰트/부트스트랩): 캐시 우선
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((r) => {
        if (r && (r.ok || r.type === 'opaque')) {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return r;
      }).catch(() => hit);
    })
  );
});
