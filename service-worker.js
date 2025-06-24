// File Version: v38
// Last Updated: 2025-06-25

const CACHE_NAME = 'kangas-watchlist-v1';
const urlsToCache = [
    './',
    'index.html',
    'style.css',
    'script.js',
    'manifest.json',
    // Add any other critical assets here if they are not already covered
    // by default network-first strategy for Firebase scripts.
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // No cache hit - fetch from network
                return fetch(event.request).catch(function() {
                    // This catch() will only happen if network is down.
                    // For now, no specific offline page is provided,
                    // but you could add a fallback HTML page here.
                    console.log('Network request failed and no cache match for:', event.request.url);
                    // You might return an offline page or other fallback here
                    // return caches.match('/offline.html');
                });
            })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
