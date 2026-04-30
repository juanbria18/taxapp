const CACHE_NAME = 'tax-usa-v1700';
const CACHE_IMAGES = 'tax-usa-img-v1600';

const STATIC_ASSETS = [
  '/',
  '/login.html',
  '/profiles.html',
  '/index.html',
  '/compras.html',
  '/itinerario.html',
  '/unidades.html',
  '/comparador.html',
  '/manifest.json',
  '/sw.js',
  '/icon-512.png'
];

// URLs que siempre deben ir a la red (datos en tiempo real)
const NETWORK_ONLY = [
  'dolarapi.com',
  'firebaseapp.com',
  'googleapis.com',
  'gstatic.com',
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'recaptcha',
  'flagcdn.com'
];

// Instalación: cachear assets estáticos
self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activación: limpiar caches viejos
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== CACHE_IMAGES)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  const url = evt.request.url;

  // Network-only: APIs en tiempo real y Firebase
  if (NETWORK_ONLY.some((pattern) => url.includes(pattern))) {
    return;
  }

  // Imágenes: cache-first con fallback a red, se guardan en cache de imágenes
  if (evt.request.destination === 'image') {
    evt.respondWith(
      caches.open(CACHE_IMAGES).then(async (cache) => {
        const cached = await cache.match(evt.request);
        if (cached) return cached;
        try {
          const response = await fetch(evt.request);
          if (response.ok) cache.put(evt.request, response.clone());
          return response;
        } catch {
          return new Response('', { status: 404 });
        }
      })
    );
    return;
  }

  // HTML: network-first (contenido siempre actualizado), fallback a cache
  if (evt.request.destination === 'document') {
    evt.respondWith(
      fetch(evt.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(evt.request, clone));
          return response;
        })
        .catch(() => caches.match(evt.request))
    );
    return;
  }

  // Resto (JS, CSS, fonts): stale-while-revalidate
  evt.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(evt.request);
      const fetchPromise = fetch(evt.request).then((response) => {
        if (response.ok) cache.put(evt.request, response.clone());
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
