// File Version: v2
// Last Updated: 2025-06-25

const CACHE_NAME = 'asx-tracker-v2'; // New cache name for cache busting
const CACHED_ASSETS = [
    '/', // Cache index.html
    '/index.html',
    // Note: script-v57.js and style.css?v=10 are intentionally NOT in precache
    // as they should be network-first or network-only for development
    // to ensure latest versions.
    // However, for production stability, you might list them here.
    // For aggressive cache-busting in development, we omit them from precache.
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'
];

self.addEventListener('install', (event) => {
    console.log('Service Worker v2: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker v2: Cache opened');
                return cache.addAll(CACHED_ASSETS);
            })
            .then(() => self.skipWaiting()) // Activates the new service worker immediately
            .catch((error) => console.error('Service Worker v2: Cache.addAll failed', error))
    );
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker v2: Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker v2: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Takes control of uncontrolled clients immediately
    );
});

self.addEventListener('fetch', (event) => {
    // Strategy for HTML documents (index.html) and critical JS (script-v57.js): Network first
    // This ensures that the main page and the core script are always fresh.
    if (event.request.mode === 'navigate' || event.request.url.includes('script-v57.js') || event.request.url.includes('style.css')) {
        console.log(`Service Worker v2: Fetching ${event.request.url} (Network First)`);
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // If response is good, clone it and put into cache
                    if (response && response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                })
                .catch(async (error) => {
                    console.error(`Service Worker v2: Network fetch failed for ${event.request.url}. Trying cache.`, error);
                    // Fallback to cache if network fails
                    return caches.match(event.request);
                })
        );
    } else {
        // For other assets (e.g., Firebase libraries from CDN, fonts), use Cache-First, then Network
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    console.log(`Service Worker v2: Serving from cache: ${event.request.url}`);
                    return cachedResponse;
                }
                // If not in cache, fetch from network
                return fetch(event.request).then(response => {
                    // If response is good, clone it and put into cache
                    if (response && response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                }).catch(error => {
                    console.error(`Service Worker v2: Network fetch failed for ${event.request.url}.`, error);
                    // Potentially return a fallback for images, etc.
                });
            })
        );
    }
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
        console.log('Service Worker v2: Skip waiting message received, new SW activated.');
    }
});
