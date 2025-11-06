const CACHE_NAME = "wordhex-v2"; // ← bump this when you deploy a new version
const APP_SHELL = [
  "/",                // index.html
  "/offline.html",    // fallback page
  "/LOGO-192.png",
  "/LOGO-512.png",
  "/manifest.webmanifest"
];

// Install: pre-cache app shell
self.addEventListener("install", (event) => {
  console.log("🧩 [SW] Install");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("🧩 [SW] Pre-caching app shell");
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting(); // Activate immediately after install
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  console.log("🧹 [SW] Activate");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log("🗑️ [SW] Removing old cache:", key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// Fetch: Cache-first with network fallback
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return; // Only cache GET requests

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return from cache
        return cachedResponse;
      }

      // Fetch from network and cache dynamically
      return fetch(event.request)
        .then((response) => {
          // Don’t cache opaque or error responses
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clonedResponse);
          });

          return response;
        })
        .catch(() => caches.match("/offline.html"));
    })
  );
});

// Optional: Listen for skipWaiting messages (used for update prompts)
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
