const CACHE = 'wealthlens-v25';
const SHELL = ['./index.html', './manifest.json', './icon-192.svg', './icon-512.svg'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL).catch(() => c.add('./index.html')))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Always network-first for live data
  const isLiveData = url.includes('yahoo.com') || url.includes('corsproxy.io') ||
    url.includes('allorigins.win') || url.includes('financialmodelingprep') ||
    url.includes('parqet.com') || url.includes('clearbit.com');

  if (isLiveData) {
    e.respondWith(fetch(e.request.clone()).catch(() => new Response('{}', {headers:{'Content-Type':'application/json'}})));
    return;
  }

  // Cache-first for app shell
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request.clone()).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
