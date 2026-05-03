// TaxUSA Service Worker — Cache First para assets estáticos
const CACHE = 'taxusa-v2';
const PRECACHE = [
    './login.html',
    './profiles.html',
    './index.html',
    './compras.html',
    './itinerario.html',
    './unidades.html',
    './comparador.html',
    './tickets.html',
    './style.css',
    './manifest.json',
    './icon-512.png',
    './icon-192.png',
];

// Página de fallback offline por si la red falla y no hay caché
const OFFLINE_FALLBACK = './index.html';

// Al instalar: pre-cachear todos los archivos del app
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(cache =>
            // allSettled para ignorar archivos que no existan aún
            Promise.allSettled(PRECACHE.map(url => cache.add(url)))
        )
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

// Fetch
self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // APIs externas siempre desde la red
    const networkOnly = [
        'dolarapi.com', 'open.er-api.com', 'queue-times.com',
        'firebaseapp.com', 'googleapis.com/firestore', 'googleapis.com/identitytoolkit',
        'securetoken.googleapis.com', 'firebaseio.com',
        'corsproxy.io', 'recaptcha', 'gstatic.com/firebasejs',
        'taxusa-proxy',
    ];
    if (networkOnly.some(d => url.href.includes(d))) {
        return;
    }

    // Google Fonts → stale-while-revalidate
    if (url.href.includes('fonts.googleapis.com') || url.href.includes('fonts.gstatic.com')) {
        e.respondWith(
            caches.open(CACHE).then(cache =>
                cache.match(e.request).then(cached => {
                    const fresh = fetch(e.request).then(res => {
                        cache.put(e.request, res.clone());
                        return res;
                    }).catch(() => cached);
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

    // gstatic no-firebase (íconos, etc.) → cache
    if (url.href.includes('gstatic.com') || url.href.includes('googleapis.com/ajax')) {
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

    // Archivos propios → Cache First, fallback a red, fallback offline
    if (
        url.origin === self.location.origin ||
        PRECACHE.some(p => url.pathname.endsWith(p.replace('./', '')))
    ) {
        e.respondWith(
            caches.open(CACHE).then(cache =>
                cache.match(e.request).then(cached => {
                    if (cached) return cached;
                    return fetch(e.request).then(res => {
                        if (res && res.status === 200 && e.request.method === 'GET') {
                            cache.put(e.request, res.clone());
                        }
                        return res;
                    }).catch(() => {
                        if (e.request.headers.get('accept')?.includes('text/html')) {
                            return caches.match(OFFLINE_FALLBACK);
                        }
                    });
                })
            )
        );
    }
});
