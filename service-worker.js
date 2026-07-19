// Blocktopia Service Worker
// Bump VERSION any time you ship an update — that's the ONLY thing you need to
// change. Browsers automatically detect that this file's bytes changed and will
// install the new worker in the background, which triggers the update popup.
const VERSION = '1.7.0';

const CACHE_NAME = 'blocktopia-cache-' + VERSION;
const CORE_ASSETS = ['./app.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // cache.addAll() is all-or-nothing — if a single listed asset 404s
      // (wrong filename, moved file, etc.) the entire install used to fail
      // silently and the update-available popup would never fire. Caching
      // each asset independently means a bad path can't block installation
      // (and therefore can't block the update from ever being detected).
      Promise.all(
        CORE_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn('SW: failed to pre-cache', url, err))
        )
      )
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('blocktopia-cache-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  if (url.includes('app.html') || event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
