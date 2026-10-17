const CACHE_NAME = 'linkedin-job-dashboard-v5';
const APP_SHELL = ['./', './index.html', './about.html', './request-job.html', './manifest.json', './assets/job-search-qr.png', './css/main.css', './css/components.css', './css/responsive.css', './css/public-redesign.css', './data/config.js', './data/locations.js', './data/search-data.js', './data/career-data.js', './data/career-searches.js', './data/site-content.json', './js/utils.js', './js/filters.js', './js/tab-manager.js', './js/open-all.js', './js/career-searches.js', './js/career.js', './js/ui.js', './js/site-config.js', './js/site-content.js', './js/app.js', './js/request.js'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('linkedin-job-dashboard-') && key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
