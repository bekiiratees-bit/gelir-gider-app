const CACHE_NAME = 'gelir-gider-v2.0.3';
const ASSETS = [
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './app_icon_512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request).then((res) => {
        return res || caches.match('./index.html');
      });
    })
  );
});
