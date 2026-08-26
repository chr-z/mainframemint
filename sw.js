/* MainframeMint — offline-first PWA. Precache list injected at build time;
 * __MM_CACHE_VERSION__ is stamped with the deploy SHA by the Pages workflow. */
const CACHE_VERSION = "__MM_CACHE_VERSION__";
const PRECACHE = [
   "LICENSE",
   "README.md",
   "assets/icon.svg",
   "drivers/mfrun.cob",
   "engine/mfamort.cob",
   "engine/mfmcompd.cob",
   "engine/mfsaving.cob",
   "index.html",
   "js/app.js",
   "js/i18n.js",
   "js/mmcore.mjs",
   "manifest.json",
   "package.json",
   "style.css",
   "sw.js"
  ];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_VERSION).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match("index.html")))
  );
});
