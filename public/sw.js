const CACHE_NAME = 'student-tracker-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-light.png',
  '/icon-light-192.png',
  '/icon-light-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
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

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Exempt Supabase API traffic and database queries
  if (url.href.includes('supabase.co') || url.pathname.includes('/rest/v1/')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Only handle same-origin or specific external static assets (like fonts)
  const isSameOrigin = url.origin === self.location.origin;
  const isGoogleFont = url.origin.includes('fonts.googleapis.com') || url.origin.includes('fonts.gstatic.com');

  if (isSameOrigin || isGoogleFont) {
    e.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(e.request).then((cachedResponse) => {
          // Fetch from network in background
          const fetchPromise = fetch(e.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(e.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch((err) => {
            console.log('Background fetch failed:', err);
          });

          // Return cached response instantly if available, otherwise wait for network fetch
          return cachedResponse || fetchPromise;
        });
      })
    );
  }
});
