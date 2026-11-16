/* Estante — funciona sin internet y recibe libros compartidos desde otras apps */
const V = 'estante-v1';
const BASE = ['./', './index.html', './jszip.min.js', './manifest.webmanifest',
  './fonts/literata-latin-400-normal.woff2', './fonts/literata-latin-400-italic.woff2',
  './fonts/literata-latin-700-normal.woff2', './fonts/literata-latin-700-italic.woff2',
  './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(BASE))); self.skipWaiting() });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== 'compartidos').map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  // Compartir › Estante (desde el administrador de archivos, Drive, WhatsApp…)
  if (e.request.method === 'POST' && u.pathname.endsWith('/compartir')){
    e.respondWith((async () => {
      const fd = await e.request.formData(); const c = await caches.open('compartidos'); let i = 0;
      for (const f of fd.getAll('libros')){
        await c.put(new Request('./compartido-' + Date.now() + '-' + (i++)),
          new Response(f, { headers: { 'x-nombre': encodeURIComponent(f.name || 'libro.epub'), 'content-type': f.type || 'application/epub+zip' } }));
      }
      return Response.redirect('./?compartido=1', 303);
    })());
    return;
  }
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (e.request.mode === 'navigate'){
    // la página: primero internet (para recibir actualizaciones), si no hay, la guardada
    e.respondWith(fetch(e.request).then(r => { const cl = r.clone(); caches.open(V).then(c => c.put('./index.html', cl)); return r })
      .catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => {
    if (res.ok){ const cl = res.clone(); caches.open(V).then(c => c.put(e.request, cl)) } return res;
  })));
});
