const CACHE_NAME = 'openseo-v2.0.0';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/src/main.js',
  '/src/api/client.js',
  '/src/api/constants.js',
  '/src/api/prompts.js',
  '/src/services/storage.js',
  '/src/utils/seo.js',
  '/src/utils/text.js',
  '/src/utils/ui_gauge.js',
  '/src/utils/export.js',
  '/favicon.svg',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
