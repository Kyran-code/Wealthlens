const CACHE = 'wealthlens-v30';
const SHELL = ['./index.html', './manifest.json', './icon-192.svg', './icon-512.svg'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // Cache each shell item independently so one missing/404 file can't abort the whole install
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
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
    url.includes('parqet.com') || url.includes('clearbit.com') ||
    url.includes('googleapis.com') || url.includes('gstatic.com') ||
    url.includes('accounts.google.com') || url.includes('firebaseapp.com') ||
    url.includes('firebase.google.com') || url.includes('firestore.googleapis.com');

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
