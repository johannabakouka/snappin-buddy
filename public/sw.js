// Cache hors ligne de Snappin'Buddy.
// Règle d'or : en cas de doute, on laisse passer la requête vers le réseau.
// Un cache qui échoue ne doit jamais empêcher l'app de s'ouvrir.
const CACHE_NAME = 'snappin-buddy-v4';
const STATIC_ASSETS = ['/', '/logo.png', '/manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .catch(() => null)
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .catch(() => null)
  );
  self.clients.claim();
});

// Permet de désactiver le cache à distance si un jour il pose problème
self.addEventListener('message', event => {
  if (event.data === 'clear-cache') {
    caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))));
  }
});

function shouldSkip(request) {
  if (request.method !== 'GET') return true;
  const url = request.url;
  return (
    url.includes('/api/') ||
    url.includes('supabase') ||
    url.includes('stripe') ||
    url.includes('maptiler') ||
    url.includes('openstreetmap') ||
    url.includes('tile.') ||
    !url.startsWith(self.location.origin)
  );
}

self.addEventListener('fetch', event => {
  if (shouldSkip(event.request)) return;

  // Pages : réseau d'abord, pour que chaque déploiement arrive chez les utilisateurs.
  // Le cache ne sert que si le réseau ne répond pas du tout.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => null);
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request)
            .then(cached => cached || caches.match('/'))
            .then(cached => cached || fetch(event.request))
        )
    );
    return;
  }

  // Fichiers de l'app : on sert le cache s'il existe, sinon le réseau.
  // Si le fichier manque dans le cache ET sur le réseau, on renvoie la requête telle quelle
  // plutôt qu'une erreur, pour ne jamais casser le chargement de l'app.
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => null);
          }
          return response;
        });
      })
      .catch(() => fetch(event.request))
  );
});
