// Firebase Messaging Service Worker for Munazzam PWA
// Handles background push notifications, lock-screen alerts, and notification clicks

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize Firebase in Service Worker
try {
  firebase.initializeApp({
    projectId: 'gen-lang-client-0644512836',
    appId: '1:304813139007:web:09552d87a507b12f34048a',
    apiKey: 'AIzaSyCOmFbp81aFJVVGac5tFILHeU86xLoEIb8',
    authDomain: 'gen-lang-client-0644512836.firebaseapp.com',
    messagingSenderId: '304813139007',
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message: ', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'Munazzam Notification';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.message || payload.data?.body || 'You have an update in Munazzam.',
      icon: payload.notification?.icon || payload.data?.icon || '/pwa-192x192.png',
      badge: '/favicon-32x32.png',
      tag: payload.data?.tag || payload.data?.notificationId || 'munazzam-notification',
      data: {
        url: payload.data?.url || payload.data?.route || '/',
        notificationId: payload.data?.notificationId,
        entityType: payload.data?.entityType,
        entityId: payload.data?.entityId,
      },
      vibrate: [100, 50, 100],
      requireInteraction: false,
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (err) {
  console.warn('[firebase-messaging-sw.js] Firebase background messaging initialization note:', err);
}

// Handle notification click event: focus window or open client URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
