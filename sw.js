const CACHE_NAME = 'client-records-v4';
const ASSETS = ['./', './index.html', './icon-192.png', './icon-512.png'];

// インストール時: 一旦アプリ本体をキャッシュ（オフライン用の保険）
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// 有効化時: 古いバージョンのキャッシュを削除
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

// フェッチ: ネットワーク優先（常に最新版を取得）→ 失敗時のみキャッシュ（オフライン対応）
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then(function(response) {
      // 取得できたら最新版をキャッシュに保存し直す
      if (response && response.status === 200) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(function() {
      // オフライン時のみキャッシュから返す
      return caches.match(event.request).then(function(cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});
