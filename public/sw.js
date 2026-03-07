// Service Worker - Phase 3: Offline cache for instant 2nd+ visits
const CACHE_NAME = 'bitcoincard-v1';
const PRECACHE_URLS = [
  '/',
  '/images/stas-swap.webp',
  '/images/bv2.webp',
  '/images/btcpay.webp',
  '/images/close-btn.webp',
];

// Install: precache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: stale-while-revalidate for same-origin, network-first for others
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only cache same-origin requests
  if (url.origin !== location.origin) return;

  // For navigation (HTML): network-first with cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // For assets (JS, CSS, images): stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          cache.put(event.request, response.clone());
          return response;
        });
        return cached || fetchPromise;
      })
    )
  );
});
