/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'mood-tracker-v1';
const RUNTIME_CACHE = 'mood-tracker-runtime';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/manifest.json',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Precaching assets');
      return cache.addAll(PRECACHE_ASSETS).catch((error) => {
        console.error('[Service Worker] Precaching failed:', error);
        // Continue even if precaching fails
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('[Service Worker] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network-first strategy with cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API requests - network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response before caching
          const responseClone = response.clone();

          // Only cache successful responses
          if (response.status === 200) {
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }

          return response;
        })
        .catch(() => {
          // If network fails, try to get from cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline response if no cached data
            return new Response(
              JSON.stringify({
                error: 'Offline',
                message: 'You are currently offline. Some features may be limited.'
              }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                  'Content-Type': 'application/json',
                }),
              }
            );
          });
        })
    );
    return;
  }

  // Static assets - cache-first strategy
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          const responseClone = response.clone();

          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });

          return response;
        })
        .catch(() => {
          // Return a fallback page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Syncing:', event.tag);

  if (event.tag === 'sync-mood-entries') {
    event.waitUntil(syncTimeEntries());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);

  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
      },
      {
        action: 'close',
        title: 'Close',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification('Mood Tracker', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);

  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper function to open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('mood-tracker-offline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('requests')) {
        const requestStore = db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
        requestStore.createIndex('timestamp', 'timestamp', { unique: false });
        requestStore.createIndex('url', 'url', { unique: false });
      }

      if (!db.objectStoreNames.contains('data')) {
        const dataStore = db.createObjectStore('data', { keyPath: 'key' });
        dataStore.createIndex('timestamp', 'timestamp', { unique: false });
        dataStore.createIndex('type', 'type', { unique: false });
      }
    };
  });
}

// Helper function to sync queued requests when back online
async function syncTimeEntries() {
  try {
    console.log('[Service Worker] Syncing queued requests...');

    const db = await openDB();
    const tx = db.transaction('requests', 'readonly');
    const store = tx.objectStore('requests');

    return new Promise((resolve, reject) => {
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = async () => {
        const requests = getAllRequest.result;
        console.log(`[Service Worker] Found ${requests.length} queued requests`);

        let successCount = 0;
        let failCount = 0;

        for (const queuedRequest of requests) {
          try {
            const response = await fetch(queuedRequest.url, {
              method: queuedRequest.method,
              headers: queuedRequest.headers,
              body: queuedRequest.body,
            });

            if (response.ok) {
              // Remove from queue if successful
              const deleteTx = db.transaction('requests', 'readwrite');
              const deleteStore = deleteTx.objectStore('requests');
              deleteStore.delete(queuedRequest.id);

              successCount++;
              console.log(`[Service Worker] Successfully synced request ${queuedRequest.id}`);

              // Notify clients that sync was successful
              const clients = await self.clients.matchAll();
              clients.forEach((client) => {
                client.postMessage({
                  type: 'SYNC_SUCCESS',
                  requestId: queuedRequest.id,
                  method: queuedRequest.method,
                  url: queuedRequest.url,
                });
              });
            } else {
              failCount++;
              console.warn(`[Service Worker] Failed to sync request ${queuedRequest.id}: ${response.status}`);
            }
          } catch (error) {
            failCount++;
            console.error(`[Service Worker] Error syncing request ${queuedRequest.id}:`, error);
          }
        }

        console.log(`[Service Worker] Sync complete. Success: ${successCount}, Failed: ${failCount}`);
        resolve({ successCount, failCount });
      };

      getAllRequest.onerror = () => reject(getAllRequest.error);
    });
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
    return Promise.reject(error);
  }
}

// Message handler for commands from the app
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    const urlsToCache = event.data.payload;
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.addAll(urlsToCache);
      })
    );
  }

  if (event.data && event.data.type === 'QUEUE_REQUEST') {
    const { url, method, headers, body } = event.data.payload;
    event.waitUntil(
      queueRequest(url, method, headers, body).then(() => {
        // Notify client that request was queued
        event.ports[0].postMessage({
          type: 'REQUEST_QUEUED',
          success: true,
        });
      })
    );
  }

  if (event.data && event.data.type === 'TRIGGER_SYNC') {
    // Manually trigger sync
    event.waitUntil(syncTimeEntries());
  }
});

// Queue a request for later sync
async function queueRequest(url, method, headers, body) {
  try {
    const db = await openDB();
    const tx = db.transaction('requests', 'readwrite');
    const store = tx.objectStore('requests');

    const queuedRequest = {
      url,
      method,
      headers,
      body,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const addRequest = store.add(queuedRequest);
      addRequest.onsuccess = () => {
        console.log('[Service Worker] Request queued:', url);
        resolve();
      };
      addRequest.onerror = () => reject(addRequest.error);
    });
  } catch (error) {
    console.error('[Service Worker] Failed to queue request:', error);
    throw error;
  }
}
