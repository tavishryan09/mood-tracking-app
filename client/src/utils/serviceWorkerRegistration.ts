// Service Worker Registration for PWA functionality
// This file handles registering, updating, and managing the service worker

import { offlineManager } from './offlineManager';

const isLocalhost = Boolean(
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/))
);

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
};

export function register(config?: Config) {
  if (typeof window === 'undefined') {
    return;
  }

  if ('serviceWorker' in navigator) {
    // The URL constructor is available in all browsers that support SW.
    const publicUrl = new URL(window.location.href);

    if (publicUrl.origin !== window.location.origin) {
      // Our service worker won't work if PUBLIC_URL is on a different origin
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `/service-worker.js`;

      if (isLocalhost) {
        // This is running on localhost. Check if a service worker still exists or not.
        checkValidServiceWorker(swUrl, config);

        // Add some additional logging to localhost
        navigator.serviceWorker.ready.then(() => {

        });
      } else {
        // Is not localhost. Just register service worker
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl: string, config?: Config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched,
              // but the previous service worker will still serve the older
              // content until all client tabs are closed.

              // Execute callback
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // At this point, everything has been precached.

              // Execute callback
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('[PWA] Error during service worker registration:', error);
    });
}

function checkValidServiceWorker(swUrl: string, config?: Config) {
  // Check if the service worker can be found. If it can't reload the page.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      // Ensure service worker exists, and that we really are getting a JS file.
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No service worker found. Reload the page.
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker found. Proceed as normal.
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {

    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();

      })
      .catch((error) => {
        console.error('[PWA] Error unregistering service worker:', error);
      });
  }
}

// Request permission for notifications
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {

    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

// Show a notification
export async function showNotification(title: string, options?: NotificationOptions) {
  const permission = await requestNotificationPermission();

  if (permission === 'granted' && 'serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      ...options,
    });
  }
}

// Check if app is installed
export function isAppInstalled(): boolean {
  // Check if running in standalone mode
  if (typeof window !== 'undefined') {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  }
  return false;
}

// Get install prompt event
let deferredPrompt: any = null;

export function initInstallPrompt() {
  if (typeof window === 'undefined') {
    return;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;

  });
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) {

    return false;
  }

  // Show the install prompt
  deferredPrompt.prompt();

  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice;

  // Clear the deferredPrompt for next time
  deferredPrompt = null;

  return outcome === 'accepted';
}

export function canInstall(): boolean {
  return deferredPrompt !== null && !isAppInstalled();
}

// Initialize offline support
export async function initOfflineSupport() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Initialize IndexedDB
    await offlineManager.init();

    // Listen for messages from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {

        if (event.data && event.data.type === 'SYNC_SUCCESS') {

          // You can dispatch a custom event here for components to listen to
          window.dispatchEvent(new CustomEvent('sync-success', {
            detail: event.data,
          }));
        }
      });
    }

    // Listen for online/offline events
    window.addEventListener('online', async () => {

      await offlineManager.triggerSync();
      window.dispatchEvent(new CustomEvent('connection-change', {
        detail: { online: true },
      }));
    });

    window.addEventListener('offline', () => {

      window.dispatchEvent(new CustomEvent('connection-change', {
        detail: { online: false },
      }));
    });

    // Initial online status check
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  } catch (error) {
    console.error('[PWA] Error initializing offline support:', error);
  }
}

// Get online status
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') {
    return true;
  }
  return navigator.onLine;
}

// Get queued requests count
export async function getQueuedRequestsCount(): Promise<number> {
  try {
    const requests = await offlineManager.getQueuedRequests();
    return requests.length;
  } catch (error) {
    console.error('[PWA] Error getting queued requests count:', error);
    return 0;
  }
}

// Manually trigger sync
export async function triggerManualSync(): Promise<void> {
  try {
    await offlineManager.triggerSync();

  } catch (error) {
    console.error('[PWA] Error triggering manual sync:', error);
  }
}
