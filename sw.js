const CACHE_NAME = 'tax-usa-v4';
const assets = ['./', './index.html'];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(assets)));
});

self.addEventListener('fetch', event => {
    event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});
