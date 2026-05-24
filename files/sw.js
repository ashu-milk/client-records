const CACHE_NAME = 'client-records-v3';

// インストール時: アプリ本体を完全キャッシュ
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // index.html（アプリ本体）をキャッシュ
      return cache.addAll([
        './',
        './index.html'
      ]);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// 有効化時: 古いキャッシュを削除
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// フェッチ: キャッシュ優先（完全オフライン対応）
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached; // キャッシュヒット → オフラインでも返す
      return fetch(event.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function() {
        // オフラインでキャッシュもない場合 → index.htmlを返す
        return caches.match('./index.html');
      });
    })
  );
});
