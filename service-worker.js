// File Version: v10
// Last Updated: 2025-06-26 (Incremented cache for fresh install)

// Increment the cache name to force the browser to re-install this new service worker.
const CACHE_NAME = 'asx-tracker-v10'; 

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
    console.log('Service Worker v10: Installing...'); // Updated log for version
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker v10: Cache opened');
                return cache.addAll(CACHED_ASSETS);
            })
            .then(() => {
                console.log('Service Worker v10: All assets precached. Installation complete and skipWaiting called.'); // Updated log
                self.skipWaiting(); // Forces the new service worker to activate immediately
            })
            .catch(error => {
                console.error('Service Worker v10: Precaching failed:', error); // Updated log
            })
    );
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker v10: Activating...'); // Updated log
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName.startsWith('asx-tracker-') && cacheName !== CACHE_NAME) {
                        console.log(`Service Worker v10: Deleting old cache: ${cacheName}`); // Updated log
                        return caches.delete(cacheName);
                    }
                    return Promise.resolve();
                })
            );
        }).then(() => {
            console.log('Service Worker v10: Old caches cleared, claiming clients.'); // Updated log
            return self.clients.claim(); // Immediately takes control of all open pages
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                // If a cached response is found, try to fetch from network in background for update
                const fetchPromise = fetch(event.request).then((response) => {
                    // Only cache valid responses, e.g., HTTP 200 OK
                    if (response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                }).catch(error => {
                    console.error(`Service Worker v10: Network fetch failed for ${event.request.url}.`, error); // Updated log
                    // If network fails and there's no cache, or if you want to provide a specific fallback
                    // return caches.match('/offline.html'); // Example fallback
                });

                // Return cached response immediately if available, otherwise wait for network
                return cachedResponse || fetchPromise;

            }).catch(error => {
                console.error(`Service Worker v10: Cache match failed for ${event.request.url}.`, error); // Updated log
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
        console.log('Service Worker v10: Skip waiting message received, new SW activated.'); // Updated log
    }
});
