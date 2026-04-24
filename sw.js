const CACHE_NAME = 'tax-usa-v5'; // Cambiado a v4 para forzar actualización
const assets = [
    './',
    './index.html',
    './compras.html' // Agregamos el nuevo archivo a la memoria offline
];

// Instalación: Guarda los archivos en la caché
self.addEventListener('install', event => {
    self.skipWaiting(); // Obliga al nuevo service worker a activarse de inmediato
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(assets);
        })
    );
});

// Activación: Limpia versiones viejas de la caché
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
});

// Estrategia: Primero busca en internet, si falla usa la caché
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
