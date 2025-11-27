/**
 * Service Worker for PWA
 * Implements Stale-While-Revalidate caching strategy
 */

const CACHE_NAME = 'claude-showcase-v1';
const STATIC_CACHE = 'claude-static-v1';

// Assets to precache
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg'
];

// Install event - precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Stale-While-Revalidate strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external requests
  if (url.origin !== location.origin) return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    staleWhileRevalidate(request)
  );
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Try to get from cache first
  const cachedResponse = await cache.match(request);
  
  // Fetch fresh version in background
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      // Only cache successful responses
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => {
      // Network failed, return cached or offline fallback
      return cachedResponse || new Response('Offline', {
        status: 503,
        statusText: 'Service Unavailable'
      });
    });

  // Return cached response immediately, or wait for network
  return cachedResponse || fetchPromise;
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
