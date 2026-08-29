// Gamefolio does not use a service worker (see client/src/main.tsx, which
// actively unregisters any it finds on load). This file exists only so that
// a *legacy* installed worker - from before that decision, a browser
// extension, or a stale mobile install - gets uninstalled instead of
// permanently intercepting navigation with a stale cached page after a
// deploy. A worker stuck like that can prevent main.tsx's own unregister
// call from ever running, since it never lets the fresh JS load.
//
// Browsers periodically re-fetch the currently-registered worker's script
// (typically on every navigation to an in-scope page) and compare it
// byte-for-byte; any difference triggers an install of this version, which
// immediately unregisters itself and reloads open tabs.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clientsList = await self.clients.matchAll({ type: "window" });
      for (const client of clientsList) {
        client.navigate(client.url);
      }
    })(),
  );
});
