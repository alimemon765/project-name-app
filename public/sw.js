/* PROJECT_NAME service worker (step 1): offline shell + saved papers stay readable.
   Navigations: network-first, cached copy or /offline when the network fails.
   Static build assets: cache-first (they are content-hashed). Nothing else is cached yet. */
const VERSION = "v2";
const SHELL = `shell-${VERSION}`;
const STATIC = `static-${VERSION}`;
const PRECACHE = ["/", "/saved", "/offline", "/manifest.webmanifest"];
const NAV_ALLOW = [/^\/$/, /^\/saved$/, /^\/offline$/, /^\/paper\//];   // never cache account/settings HTML
const MAX_PAPER_PAGES = 60;
const cacheable = (res) => res && res.ok && !res.redirected && res.type === "basic" && !/no-store/.test(res.headers.get("cache-control") || "");
async function trim(cacheName, prefix, max) {
  const c = await caches.open(cacheName);
  const keys = (await c.keys()).filter((r) => new URL(r.url).pathname.startsWith(prefix));
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((r) => c.delete(r)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL, STATIC].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;               // never cache third-party responses

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (cacheable(res) && NAV_ALLOW.some((re) => re.test(url.pathname)) && !url.search) {
            const copy = res.clone();
            caches.open(SHELL).then((c) => c.put(request, copy)).then(() => trim(SHELL, "/paper/", MAX_PAPER_PAGES));
          }
          return res;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("/offline"))),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        if (cacheable(res)) { const copy = res.clone(); caches.open(STATIC).then((c) => c.put(request, copy)); }
        return res;
      })),
    );
  }
});
