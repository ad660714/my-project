const CACHE_NAME = 'training-plan-cache-v2'; // 增加版本号
const CORE_ASSETS = [
  '/',
  '/training_plan.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// 安装 Service Worker 并缓存核心资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('缓存核心资源');
        return cache.addAll(CORE_ASSETS.map(url => new Request(url, { cache: 'no-cache' })));
      })
      .then(() => self.skipWaiting())
  );
});

// 激活时清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('清理旧缓存:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 优化 fetch 处理：网络优先 + 缓存回退
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // 如果有缓存，直接返回
        if (cachedResponse) return cachedResponse;

        // 网络优先策略
        return fetch(event.request.clone()).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200 || event.request.method !== 'GET') {
            return networkResponse;
          }

          // 缓存网络响应（克隆以避免消费）
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch(() => {
          // 离线回退到默认页面
          if (event.request.mode === 'navigate') {
            return caches.match('/training_plan.html');
          }
          return new Response('离线模式下无可用内容', { status: 503 });
        });
      })
  );
});