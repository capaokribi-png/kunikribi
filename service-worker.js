// CuniSmart PWA — service worker à mise à jour automatique.
// Astuce : incrémentez CACHE_VERSION (v4 -> v5...) à chaque grosse mise à jour
// pour forcer le nettoyage de l'ancien cache.
// v5 — CuniMaster : parcours certifiants pondeuse, porc, chèvre, bovin (64 leçons ajoutées)
const CACHE_VERSION = 'cunismart-v5';
const CORE = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // le nouveau SW prend la main tout de suite
  e.waitUntil(
    caches.open(CACHE_VERSION).then((c) => c.addAll(CORE).catch(() => {}))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Les appels API ne sont jamais mis en cache (toujours le réseau)
  if (url.pathname.startsWith('/api/')) return;

  // Pages (index.html, navigations) : RÉSEAU D'ABORD -> toujours la dernière version.
  // Cache seulement en secours (hors-ligne).
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // Autres ressources (icônes, etc.) : cache d'abord, mise à jour en arrière-plan.
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
