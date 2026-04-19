// Service Worker - 每次部署自動更新
const VERSION = '20260419-v2';
const CACHE = 'yunnan-' + VERSION;

self.addEventListener('install', e => {
  // 立即接管，不等舊版關閉
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['./', './index.html']))
  );
});

self.addEventListener('activate', e => {
  // 清除所有舊快取
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // API 呼叫直接走網路
  if (url.includes('script.google.com') ||
      url.includes('anthropic.com') ||
      url.includes('googleapis.com') ||
      url.includes('fonts.googleapis.com') ||
      url.includes('fonts.gstatic.com')) {
    e.respondWith(fetch(e.request).catch(() =>
      new Response('{"error":"離線中"}', {headers:{'Content-Type':'application/json'}})
    ));
    return;
  }
  // HTML 頁面：永遠先嘗試網路，有新版就更新快取
  if (e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // 其他資源：快取優先
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      });
      return cached || network;
    })
  );
});
