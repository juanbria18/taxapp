const CACHE_NAME = 'tax-usa-v101'; // Incrementamos la versión
const ASSETS = [
  '/',
  '/index.html',
  '/compras.html',
  '/itinerario.html', // Agregamos el nuevo archivo aquí
  '/manifest.json',
  '/sw.js'
];

// Instalación: Guardar archivos esenciales en caché
self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Cacheando recursos principales');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activación: Limpiar cachés antiguos
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      );
    })
  );
});

// Estrategia de respuesta
self.addEventListener('fetch', (evt) => {
  // Ignorar las llamadas a la API de Dólar (queremos que siempre sean en tiempo real)
  if (evt.request.url.includes('dolarapi.com')) {
    return; 
  }

  evt.respondWith(
    caches.match(evt.request).then((cacheRes) => {
      return cacheRes || fetch(evt.request);
    })
  );
});
