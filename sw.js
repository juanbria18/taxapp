// TaxUSA Service Worker — Cache First para assets estáticos
const CACHE = 'taxusa-v1';
const PRECACHE = [
    './login.html',
    './profiles.html',
    './index.html',
    './compras.html',
    './itinerario.html',
    './unidades.html',
    './comparador.html',
    './style.css',
    './manifest.json',
    './icon-512.png',
];

// Al instalar: pre-cachear todos los archivos del app
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
    );
    self.skipWaiting();
});

// Al activar: limpiar caches viejos
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: Cache First para HTML/CSS/JS propios, Network First para APIs
self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // APIs externas siempre desde la red (cotizaciones, queue-times, firebase)
    const networkOnly = [
        'dolarapi.com', 'open.er-api.com', 'queue-times.com',
        'firebaseapp.com', 'googleapis.com/firestore', 'corsproxy.io',
        'recaptcha', 'gstatic.com/firebasejs'
    ];
    if (networkOnly.some(d => url.href.includes(d))) {
        return; // deja que el browser maneje normalmente
    }

    // Google Fonts → cache con stale-while-revalidate
    if (url.href.includes('fonts.googleapis.com') || url.href.includes('fonts.gstatic.com')) {
        e.respondWith(
            caches.open(CACHE).then(cache =>
                cache.match(e.request).then(cached => {
                    const fresh = fetch(e.request).then(res => {
                        cache.put(e.request, res.clone());
                        return res;
                    });
                    return cached || fresh;
                })
            )
        );
        return;
    }

    // Flags CDN → cache agresivo (no cambian)
    if (url.href.includes('flagcdn.com')) {
        e.respondWith(
            caches.open(CACHE).then(cache =>
                cache.match(e.request).then(r => r || fetch(e.request).then(res => {
                    cache.put(e.request, res.clone());
                    return res;
                }))
            )
        );
        return;
    }

    // Archivos propios del app → Cache First
    if (PRECACHE.some(p => url.pathname.endsWith(p.replace('./', '')))) {
        e.respondWith(
            caches.open(CACHE).then(cache =>
                cache.match(e.request).then(r => r || fetch(e.request))
            )
        );
    }
});
