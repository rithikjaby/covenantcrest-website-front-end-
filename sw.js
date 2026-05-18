// Covenant Crest — Offline-First Service Worker
var CACHE_NAME = 'cc-v1';
var STATIC_ASSETS = [
  '/',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/js/common.js',
  '/api.js'
];

// Install — cache core static assets
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — network-first for HTML, cache-first for static assets
self.addEventListener('fetch', function(e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  // HTML pages: always try network first so content stays fresh
  if (req.headers.get('accept') && req.headers.get('accept').indexOf('text/html') !== -1) {
    e.respondWith(
      fetch(req).then(function(res) {
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(c) { c.put(req, clone); });
        return res;
      }).catch(function() {
        return caches.match(req);
      })
    );
    return;
  }

  // Static assets: cache-first for speed
  e.respondWith(
    caches.match(req).then(function(cached) {
      return cached || fetch(req).then(function(res) {
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(c) { c.put(req, clone); });
        return res;
      });
    })
  );
});
