const CACHE_NAME = 'client-records-v5';
const ASSETS = ['./', './index.html', './icon-192.png', './icon-512.png'];
const NETWORK_TIMEOUT_MS = 2500; // 電波が悪い時にここで固まらないよう短めのタイムアウト

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

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

// タイムアウト付きfetch: 電波が悪い時にネットワーク応答を待ち続けて
// 画面が固まることを防ぐ（一定時間で諦めてキャッシュへ切り替える）
function fetchWithTimeout(request, ms) {
  return new Promise(function(resolve, reject) {
    var timer = setTimeout(function() {
      reject(new Error('timeout'));
    }, ms);
    fetch(request).then(function(res) {
      clearTimeout(timer);
      resolve(res);
    }).catch(function(err) {
      clearTimeout(timer);
      reject(err);
    });
  });
}

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetchWithTimeout(event.request, NETWORK_TIMEOUT_MS).then(function(response) {
      if (response && response.status === 200) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(function() {
      // タイムアウト・オフライン時は即座にキャッシュから返す
      return caches.match(event.request).then(function(cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});
