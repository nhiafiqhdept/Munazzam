// Unified Firebase Cloud Messaging & Web Push Service Worker for Munazzam PWA
// Handles background push notifications, Android notification shade alerts, and notification clicks

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 1. Safe Load Firebase App & Messaging Compat SDKs
try {
  importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

  firebase.initializeApp({
    projectId: 'gen-lang-client-0644512836',
    appId: '1:304813139007:web:09552d87a507b12f34048a',
    apiKey: 'AIzaSyCOmFbp81aFJVVGac5tFILHeU86xLoEIb8',
    authDomain: 'gen-lang-client-0644512836.firebaseapp.com',
    messagingSenderId: '304813139007',
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[Munazzam SW] FCM Background message received:', payload);

    const title = payload.notification?.title || payload.data?.title || 'Munazzam';
    const body = payload.notification?.body || payload.data?.message || payload.data?.body || 'New organization update received.';
    const icon = payload.notification?.icon || payload.data?.icon || '/pwa-192x192.png';
    const badge = payload.notification?.badge || '/favicon-32x32.png';
    const tag = payload.data?.tag || `munazzam-${Date.now()}`;
    const url = payload.data?.url || payload.data?.route || '/';

    const notificationOptions = {
      body,
      icon,
      badge,
      tag,
      data: {
        url,
        notificationId: payload.data?.notificationId,
        entityType: payload.data?.entityType,
        entityId: payload.data?.entityId,
      },
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true,
      renotify: true,
      silent: false,
    };

    return self.registration.showNotification(title, notificationOptions);
  });
} catch (err) {
  console.warn('[Munazzam SW] Firebase compat messaging initialization note:', err);
}

// 2. Direct Web Push Event Listener (Supports standard Web Push payloads on Android Chrome & desktop)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || data.notification?.title || 'Munazzam';
  const body = data.body || data.message || data.notification?.body || 'New organization update received.';
  const icon = data.icon || data.notification?.icon || '/pwa-192x192.png';
  const badge = data.badge || '/favicon-32x32.png';
  const tag = data.tag || (data.data && data.data.notificationId) || `munazzam-${Date.now()}`;
  const url = data.url || data.route || (data.data && data.data.url) || '/';

  const options = {
    body,
    icon,
    badge,
    tag,
    data: {
      url,
      ...data,
    },
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    renotify: true,
    silent: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 3. Notification Click Handler: Focus or open window and navigate to target entity
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = data.url || '/';

  // Ensure absolute URL within current origin
  if (!targetUrl.startsWith('http')) {
    targetUrl = new URL(targetUrl, self.location.origin).href;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open on this origin, focus and navigate
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // If no window is currently open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
