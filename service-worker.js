// File Version: v26
// Last Updated: 2025-06-28 (New version to force update after script.js changes)

// Increment the cache name to force the browser to re-install this new service worker.
const CACHE_NAME = 'asx-tracker-v26';

// Only precache external CDN assets.
// Local files (index.html, script.js, style.css) will be handled by the 'network-first' fetch strategy,
// which is more resilient to GitHub Pages sub-directory hosting.
const CACHED_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'
];

self.addEventListener('install', (event) => {
    console.log('Service Worker v26: Installing...'); // Updated log for version
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker v26: Caching assets...'); // Updated log
                return cache.addAll(CACHED_ASSETS);
            })
            .then(() => self.skipWaiting()) // Activate new service worker immediately
            .catch(error => {
                console.error('Service Worker v26: Caching failed', error); // Updated log
            })
    );
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker v26: Activating...'); // Updated log for version
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker v26: Deleting old cache', cacheName); // Updated log
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control of clients immediately
    );
});

self.addEventListener('fetch', (event) => {
    // Only handle GET requests for caching strategy
    if (event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                // Return cached response if found
                if (cachedResponse) {
                    // console.log(`Service Worker v26: Serving from cache: ${event.request.url}`); // Updated log
                    return cachedResponse;
                }

                // Otherwise, go to network and cache the response
                // console.log(`Service Worker v26: Fetching from network: ${event.request.url}`); // Updated log
                const fetchPromise = fetch(event.request).then((response) => {
                    // Check if we received a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // IMPORTANT: Clone the response. A response is a stream
                    // and can only be consumed once. We must clone it so that
                    // both the browser and the cache can consume it.
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    return response;
                }).catch(error => {
                    console.error(`Service Worker v26: Network fetch failed for ${event.request.url}.`, error); // Updated log
                    // If network fails and there's no cache, or if you want to provide a specific fallback
                    // return caches.match('/offline.html'); // Example fallback
                });

                // Return cached response immediately if available, otherwise wait for network
                return cachedResponse || fetchPromise;

            }).catch(error => {
                console.error(`Service Worker v26: Cache match failed for ${event.request.url}.`, error); // Updated log
                // Fallback in case both cache and network fail (unlikely given fetchPromise)
                return fetch(event.request); // Try network one more time if cache fails
            })
        );
    } else {
        // For non-GET requests (e.g., POST, PUT, DELETE), just fetch from network
        // Do NOT cache these requests as they modify data.
        event.respondWith(fetch(event.request));
    }
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
        console.log('Service Worker v26: Skip waiting message received, new SW activated.'); // Updated log
    }
});
