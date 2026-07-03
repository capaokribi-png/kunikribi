/* KuniKribi — Service Worker : mode hors ligne / offline mode */
const CACHE = 'kunikribi-v1';
const FICHIERS = [
  './',
  './index.html',
  './manifest.json',
  './confidentialite.html',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(cles =>
      Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Stratégie : cache d'abord (l'app doit marcher sans réseau), réseau en secours */
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(rep =>
      rep || fetch(e.request).then(r => {
        const copie = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copie));
        return r;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
