// Simple service worker to handle non-precached URLs gracefully
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Handle non-precached URLs by falling back to network
  event.respondWith(
    fetch(event.request).catch(() => {
      // If network fails, return a simple response for HTML requests
      if (event.request.headers.get('accept')?.includes('text/html')) {
        return new Response(
          '<!DOCTYPE html><html><head><title>Zeno App</title></head><body><div id="app"></div><script>window.location.reload();</script></body></html>',
          {
            headers: { 'Content-Type': 'text/html' },
          }
        );
      }
      // For other requests, let the browser handle the error
      throw new Error('Network error');
    })
  );
});

