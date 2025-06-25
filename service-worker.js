// File Version: v8
// Last Updated: 2025-06-25

// Increment the cache name to force the browser to re-install this new service worker.
const CACHE_NAME = 'asx-tracker-v8'; 

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
    console.log('Service Worker v8: Installing...'); // Updated log for version
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker v8: Cache opened'); // Updated log for version
                // Attempt to precache only the CDN assets
                return cache.addAll(CACHED_ASSETS)
                    .catch(error => {
                        console.error('Service Worker v8: Cache.addAll for CDN assets failed:', error);
                        // Do not fail the entire installation if some CDN assets fail to cache initially
                        return Promise.resolve(); 
                    });
            })
            .then(() => self.skipWaiting()) // Activates the new service worker immediately
            .catch((error) => console.error('Service Worker v8: Installation failed (critical error):', error)) // Updated log
    );
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker v8: Activating...'); // Updated log for version
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker v8: Deleting old cache:', cacheName); // Updated log
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Takes control of uncontrolled clients immediately
    );
});

self.addEventListener('fetch', (event) => {
    // Determine the base path for your GitHub Pages repository
    // This is crucial for correctly identifying your app's local files.
    // Example: For 'iamkanga.github.io/ASX-Share-Tracker/', the base path is '/ASX-Share-Tracker/'
    const basePath = new URL(self.location).pathname.split('/').slice(0, -1).join('/') + '/';

    // Construct the expected paths for your core app files relative to the base path
    const indexPath = `${basePath}index.html`;
    const scriptPath = `${basePath}script.js`;
    const stylePath = `${basePath}style.css`;

    // Strategy for HTML documents (index.html) and critical JS/CSS (script.js, style.css): Network first
    // This ensures that the main page and the core scripts/styles are always fresh.
    if (event.request.mode === 'navigate' || 
        event.request.url.includes(scriptPath) || 
        event.request.url.includes(stylePath) ||
        event.request.url.endsWith(indexPath) // Ensure index.html is caught correctly
        ) {
        
        console.log(`Service Worker v8: Fetching ${event.request.url} (Network First)`); // Updated log
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Only cache GET requests. POST requests (like Firebase auth) cannot be cached.
                    if (response && response.status === 200 && event.request.method === 'GET') {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                })
                .catch(async (error) => {
                    console.error(`Service Worker v8: Network fetch failed for ${event.request.url}. Trying cache.`, error); // Updated log
                    // Fallback to cache if network fails
                    return caches.match(event.request);
                })
        );
    } else {
        // For other assets (e.g., precached CDN libraries), use Cache-First, then Network
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    console.log(`Service Worker v8: Serving from cache: ${event.request.url}`); // Updated log
                    return cachedResponse;
                }
                // If not in cache, fetch from network
                return fetch(event.request).then(response => {
                    // Only cache GET requests. POST requests (like Firebase auth) cannot be cached.
                    if (response && response.status === 200 && event.request.method === 'GET') {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                }).catch(error => {
                    console.error(`Service Worker v8: Network fetch failed for ${event.request.url}.`, error); // Updated log
                    // Potentially return a fallback for images, etc.
                });
            })
        );
    }
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
        console.log('Service Worker v8: Skip waiting message received, new SW activated.'); // Updated log
    }
});
