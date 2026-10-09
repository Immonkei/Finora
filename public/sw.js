const CACHE_NAME = "finora-pwa-v1.2.0";
const PRECACHE_URLS = [
  "/",
  "/today",
  "/transactions",
  "/goals",
  "/week",
  "/month",
  "/settings",
  "/manifest.json",
  "/icon.png",
  "/apple-icon.png",
  "/finora-icon.png",
  "/finora-full.png",
  "/finora-full-dark.png",
];

// Install: pre-cache core application shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS).catch((err) => {
          console.warn("[Finora SW] Pre-cache partial failure:", err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up obsolete caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: Stale-while-revalidate for static assets, network-first for pages
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests or Supabase/external API requests from caching
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Next.js static assets and images: cache-first with background revalidation
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2|woff)$/)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // HTML page navigation: network-first, fallback to cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return (
              cached ||
              caches.match("/today") ||
              new Response("<h1>Offline</h1><p>Finora is currently offline.</p>", {
                headers: { "Content-Type": "text/html" },
              })
            );
          });
        })
    );
  }
});
