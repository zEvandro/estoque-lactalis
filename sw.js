// ═══════════════════════════════════════════════
// ESTOQUE CONTAGEM — Service Worker v4.0
// ═══════════════════════════════════════════════
const CACHE_NAME = 'estoque-v4';

// Recursos para cachear na instalação
const PRECACHE = [
  './estoque-lactalis.html',
  './manifest.json',
  './icon.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js',
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap'
];

// Instalação — pré-cache dos recursos principais
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE).catch(() => {}))
    // NÃO chama skipWaiting aqui — espera o usuário confirmar a atualização
  );
});

// Ativação — limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Mensagem do app pedindo para ativar a nova versão
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch — Network first, cache como fallback
self.addEventListener('fetch', event => {
  // Firebase: sempre network (dados em tempo real)
  if (event.request.url.includes('firebasedatabase') ||
      event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('googleapis.com/identitytoolkit')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('./estoque-lactalis.html');
          }
        });
      })
  );
});
