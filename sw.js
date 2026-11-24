const BUILD_ID = '1.0.3';
const CACHE_NAME = `vahedyar-${BUILD_ID}`;

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon192.png',
  './favicon512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(ASSETS_TO_CACHE.map((u) => new Request(u, { cache: 'reload' })))
    )
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; 

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req, { cache: 'reload' }).then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }

  event.waitUntil((async () => {
    await self.registration.showNotification(data.title || 'واحدیار', {
      body: data.body || '',
      icon: './favicon192.png',
      badge: './favicon192.png',
      dir: 'rtl',
      lang: 'fa',
      data: { url: data.url || '/' },
    });
    // اگر اپ باز است، شمارنده‌ی زنگوله به‌روز شود
    const list = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    list.forEach((c) => c.postMessage({ type: 'push-received' }));
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.url) || '/';
  const target = new URL('/#' + path, self.location.origin).href; // HashRouter

  event.waitUntil((async () => {
    const list = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (list.length) {
      const c = list[0];
      await c.focus();
      try { await c.navigate(target); } catch {}
      return;
    }
    await clients.openWindow(target);
  })());
});
