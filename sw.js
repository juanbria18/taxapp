// TaxUSA Service Worker — v5
const CACHE = 'taxusa-v5';
const PRECACHE = [
    './login.html',
    './selector.html',
    './profiles.html',
    './index.html',
    './compras.html',
    './itinerario.html',
    './unidades.html',
    './tickets.html',
    './grupo.html',
    './style.css',
    './manifest.json',
    './assets/icon-512.png',
    './assets/icon-192.png',
];

const OFFLINE_FALLBACK = './index.html';

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(cache =>
            Promise.allSettled(PRECACHE.map(url => cache.add(url)))
        )
    );
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // APIs externas — siempre red
    const networkOnly = [
        'dolarapi.com', 'open.er-api.com', 'queue-times.com',
        'firebaseapp.com', 'googleapis.com/firestore', 'googleapis.com/identitytoolkit',
        'securetoken.googleapis.com', 'firebaseio.com',
        'corsproxy.io', 'recaptcha', 'gstatic.com/firebasejs',
        'taxusa-proxy', 'taxusa.juanbria18.workers.dev',
        'groq', 'llama',
    ];
    if (networkOnly.some(d => url.href.includes(d))) return;

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

    // Flags CDN → cache agresivo
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

    // gstatic / googleapis.com/ajax → cache
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

    // Archivos HTML propios → Network First
    // Siempre busca en red; usa caché solo si no hay conexión
    if (
        url.origin === self.location.origin &&
        e.request.headers.get('accept')?.includes('text/html')
    ) {
        e.respondWith(
            fetch(e.request).then(res => {
                if (res && res.status === 200) {
                    caches.open(CACHE).then(cache => cache.put(e.request, res.clone()));
                }
                return res;
            }).catch(() =>
                caches.match(e.request).then(cached => cached || caches.match(OFFLINE_FALLBACK))
            )
        );
        return;
    }

    // Resto (css, js, imágenes) → Cache First
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
