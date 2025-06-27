// File Version: v25
// Last Updated: 2025-06-27 (New version to force update after code changes)

// Increment the cache name to force the browser to re-install this new service worker.
const CACHE_NAME = 'asx-tracker-v25'; 

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
    console.log('Service Worker v25: Installing...'); // Updated log for version
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker v25: Caching assets...'); // Updated log
                return cache.addAll(CACHED_ASSETS);
            })
            .catch(error => {
                console.error('Service Worker v25: Failed to cache assets:', error); // Updated log
            })
    );
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker v25: Activating...'); // Updated log for version
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker v25: Deleting old cache:', cacheName); // Updated log
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim(); // Immediately take control of any open pages
    console.log('Service Worker v25: Activated and claimed clients.'); // Updated log
});

self.addEventListener('fetch', (event) => {
    // For GET requests, try network first, then cache
    if (event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((response) => {
                    // Check if we received a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    // Clone the response because it's a stream and can only be consumed once
                    const responseToCache = response.clone();
                    // Cache the new response if it's a local file or an asset we want to cache
                    const url = new URL(event.request.url);
                    const isLocalAsset = url.origin === self.location.origin && 
                                         ['/index.html', '/script.js', '/style.css', '/manifest.json'].some(path => url.pathname.endsWith(path));

                    if (isLocalAsset || CACHED_ASSETS.includes(event.request.url)) {
                        caches.open(CACHE_NAME).then((cache) => {
                            console.log(`Service Worker v25: Caching new/updated asset: ${event.request.url}`); // Updated log
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                }).catch(error => {
                    console.error(`Service Worker v25: Network fetch failed for ${event.request.url}.`, error); // Updated log
                    // If network fails and there's no cache, or if you want to provide a specific fallback
                    // return caches.match('/offline.html'); // Example fallback
                });

                // Return cached response immediately if available, otherwise wait for network
                return cachedResponse || fetchPromise;

            }).catch(error => {
                console.error(`Service Worker v25: Cache match failed for ${event.request.url}.`, error); // Updated log
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
        console.log('Service Worker v25: Skip waiting message received, new SW activated.'); // Updated log
    }
});