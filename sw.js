const CACHE_NAME = 'client-records-v7';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

// インストール時: アプリ本体を確実にキャッシュ
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

// フェッチ: Stale-While-Revalidate戦略
// キャッシュがあれば即座に返す（オフラインでも確実・高速）
// 同時にバックグラウンドでネットから最新版を取得しキャッシュを更新する
// → タイムアウト待ちで画面が固まる心配がなく、かつ常に最新版に更新される
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      var networkFetch = fetch(event.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function() {
        // ネットワーク取得に失敗した場合
        return cached || caches.match('./index.html');
      });

      // キャッシュがあれば即座に返却（オフラインでも待たされない）
      // キャッシュがなければネットワークの結果を待つ（初回アクセス時のみ）
      return cached || networkFetch;
    })
  );
});
