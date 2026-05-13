const CACHE = "inboxai-shell-v1";
const SHELL = ["/", "/inbox", "/compose", "/settings", "/manifest.json", "/icons/icon-192.svg", "/icons/icon-512.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Skip API and OAuth calls — never cache those.
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ??
        fetch(req)
          .then((res) => {
            if (res.ok && (url.pathname === "/" || url.pathname.startsWith("/icons/") || url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || url.pathname === "/manifest.json")) {
              const clone = res.clone();
              caches.open(CACHE).then((c) => c.put(req, clone));
            }
            return res;
          })
          .catch(() => caches.match("/") as Promise<Response>),
    ),
  );
});
