/* Artron — service worker.
   Pri svakoj izmeni podići VERZIJU, inače korisnik i dalje gleda staru verziju. */

const VERZIJA = 'v3';
const LJUSKA = `ljuska-${VERZIJA}`;
const PODACI = `podaci-${VERZIJA}`;

/* Sve što je potrebno da se aplikacija otvori bez mreže. */
const ZA_KES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/osnova.css',
  './css/komponente.css',
  './css/ekrani.css',
  './js/app.js',
  './js/unos.js',
  './js/unos-dana.js',
  './js/dan.js',
  './js/polja.js',
  './js/skladiste.js',
  './js/telo/regioni.js',
  './js/telo/cev.js',
  './js/telo/telo-model.js',
  './js/telo/mapa-tela.js',
  './js/vendor/three.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(LJUSKA)
      .then(k => k.addAll(ZA_KES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(imena => Promise.all(
        imena.filter(n => !n.endsWith(VERZIJA)).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  /* Vreme: mreža prvo, keš kao rezerva — nikad star podatak kad ima novog. */
  if (url.hostname.endsWith('open-meteo.com')) {
    e.respondWith(
      fetch(request)
        .then(res => {
          const kopija = res.clone();
          caches.open(PODACI).then(k => k.put(request, kopija));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  /* Ljuska: keš prvo, uz tiho osvežavanje u pozadini. */
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(request).then(kesirano => {
        const sa_mreze = fetch(request)
          .then(res => {
            const kopija = res.clone();
            caches.open(LJUSKA).then(k => k.put(request, kopija));
            return res;
          })
          .catch(() => kesirano);
        return kesirano || sa_mreze;
      })
    );
  }
});
