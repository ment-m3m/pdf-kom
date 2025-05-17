const CACHE_NAME = 'my-pwa-cache-v1.01';
const FILES_TO_CACHE = [
  '/',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/main.js',
  './libs/materialize.min.css',
  './libs/materialize.min.js',
  './libs/pdf-lib.min.js',
  './pdfjs/pdf.js',
  './pdfjs/pdf.worker.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// インストール時にアプリシェルをキャッシュに保存
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// アクティベート時に古いキャッシュをクリア（任意）
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// フェッチ時はキャッシュ優先で返し、なければネットワークへフォールバック
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

