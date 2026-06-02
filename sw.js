const CACHE_NAME = 'covenant-crest-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/about.html',
  '/haulage.html',
  '/trade.html',
  '/recruitment.html',
  '/hire.html',
  '/apply.html',
  '/privacy.html',
  '/terms.html',
  '/404.html',
  '/favicon.svg',
  '/og-image.svg',
  '/manifest.json',
  '/js/common.js',
  '/js/recruitment.js',
  '/js/job.js',
  '/js/haulage.js'
];

// Install Event - Pre-cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Pre-caching offline assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Handle offline routing and caching
self.addEventListener('fetch', event => {
  // Only handle GET requests and exclude API / Admin endpoints
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Skip API routes, admin portal and login/auth scripts/pages
  if (
    url.pathname.startsWith('/api') || 
    url.pathname.includes('admin') ||
    url.pathname.includes('login')
  ) {
    return;
  }

  // Network-first strategy for HTML pages, cache-first for other static assets
  const isHtml = event.request.headers.get('accept')?.includes('text/html') || url.pathname.endsWith('.html') || url.pathname === '/';

  if (isHtml) {
    // Network-First Strategy for HTML (keep it fresh, fallback to cache if offline)
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response and save it to the cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // If network fails, try to return from cache
          return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If completely offline and not in cache, fallback to 404.html
            return caches.match('/404.html');
          });
        })
    );
  } else {
    // Cache-First Strategy for static resources (CSS, JS, Images, Fonts)
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request).then(response => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          
          return response;
        });
      })
    );
  }
});
