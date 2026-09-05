// =========================================================================
// VOCAFLOW PWA CACHE & OFFLINE ENGINE (v0.10.9-alpha-14)
// =========================================================================
const CACHE_NAME = 'vocaflow-pwa-v0.10.9-alpha-14';
const ASSETS = [
  './',
  './index.html',
  './vocaflow.html',
  './manifest.json',
  './xlsx.full.min.js',
  './audio/sfx_fireworks.mp3',
  './audio/sfx_correct.mp3',
  './audio/sfx_wrong.mp3',
  './audio/sfx_skip.mp3',
  './audio/sfx_purchase.mp3',
  './icons/Icon-192.png',
  './icons/Icon-512.png',
  './icons/Icon-maskable-192.png',
  './icons/Icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.log('Cache addAll non-fatal warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Direct pass-through for external APIs (Firebase, Gemini AI, Google Translate TTS)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Network-first for HTML page navigation so users always see latest updates immediately
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((res) => res || caches.match('./index.html') || caches.match('./'));
        })
    );
    return;
  }

  // Stale-While-Revalidate for static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      }).catch(() => {});

      return cachedResponse || fetchPromise;
    })
  );
});
