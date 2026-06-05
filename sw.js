'use strict';

const APP_VERSION = 'v1.4.30';
const CACHE_NAME = 'math-practice-' + APP_VERSION;

const PRECACHE_URLS = [
  './index.html',
  './js/updates.js',
  './style.css',
  './manifest.json',
  './js/config.js',
  './js/sfx.js',
  './js/quiz.js',
  './js/focus.js',
  './js/admin.js',
  './js/main.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(PRECACHE_URLS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  // Pass external requests (Google Fonts, etc.) straight to network
  var reqUrl = new URL(event.request.url);
  if (reqUrl.origin !== self.location.origin) return;

  var pathname = reqUrl.pathname || '';
  var isAppShellAsset =
    event.request.mode === 'navigate' ||
    pathname.endsWith('.html') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.json');

  if (isAppShellAsset) {
    // Network-first so installed PWA gets fresh JS/CSS/HTML when online.
    event.respondWith(
      fetch(event.request)
        .then(function (response) {
          if (response && response.status === 200 && response.type === 'basic') {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(function () {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache-first for other same-origin assets.
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;

      return fetch(event.request).then(function (response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});
