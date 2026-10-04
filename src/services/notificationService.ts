import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
} from 'firebase/firestore';
import { getMessaging, getToken, isSupported, Messaging } from 'firebase/messaging';
import { db, cleanFirestorePayload } from '../lib/firebase';
import app from '../lib/firebase';
import {
  AppNotification,
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  NotificationDevice,
  NotificationPreferences,
} from '../types';

let messagingInstance: Messaging | null = null;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Safely initialize Firebase Cloud Messaging if supported by browser/runtime
 */
export async function getFCMInstance(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  if (messagingInstance) return messagingInstance;

  try {
    const supported = await isSupported();
    if (supported) {
      messagingInstance = getMessaging(app);
      return messagingInstance;
    }
  } catch (err) {
    console.warn('FCM isSupported check notice:', err);
  }
  return null;
}

/**
 * Get or generate a persistent local device ID for multi-device support
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'device_server';
  const KEY = 'munazzam_device_id';
  let deviceId = localStorage.getItem(KEY);
  if (!deviceId) {
    deviceId = `dev_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    localStorage.setItem(KEY, deviceId);
  }
  return deviceId;
}

/**
 * Detect current platform and browser
 */
export function getClientEnvironment(): { platform: 'web' | 'android' | 'ios' | 'desktop'; browser: string } {
  if (typeof window === 'undefined') return { platform: 'web', browser: 'unknown' };

  const ua = navigator.userAgent.toLowerCase();
  let platform: 'web' | 'android' | 'ios' | 'desktop' = 'web';

  if (/android/.test(ua)) {
    platform = 'android';
  } else if (/iphone|ipad|ipod/.test(ua)) {
    platform = 'ios';
  } else if (/macintosh|windows|linux/.test(ua)) {
    platform = 'desktop';
  }

  let browser = 'Chrome';
  if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('opr') || ua.includes('opera')) browser = 'Opera';

  return { platform, browser };
}

/**
 * Request Notification Permission, register Web Push & FCM device token
 */
export async function requestNotificationPermission(
  userId: string,
  organizationId: string,
  subOrgId?: string,
  subWingId?: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { success: false, error: 'Push notifications are not supported on this browser/platform.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission was denied or dismissed.' };
    }

    let swRegistration: ServiceWorkerRegistration | undefined;
    let webPushSub: PushSubscription | null = null;
    let fcmToken = '';

    // 1. Get or register authoritative Service Worker
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.ready;
      } catch {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      }

      // 2. Fetch VAPID public key and subscribe to Web Push
      try {
        const vapidRes = await fetch('/api/notifications/vapid-public-key');
        const vapidData = await vapidRes.json();
        if (vapidData.success && vapidData.publicKey && swRegistration.pushManager) {
          const convertedKey = urlBase64ToUint8Array(vapidData.publicKey);
          webPushSub = await swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedKey,
          });
        }
      } catch (pushSubErr) {
        console.warn('WebPush subscription notice:', pushSubErr);
      }
    }

    // 3. Try Firebase Cloud Messaging token if available
    const messaging = await getFCMInstance();
    if (messaging && swRegistration) {
      try {
        fcmToken = await getToken(messaging, {
          serviceWorkerRegistration: swRegistration,
        });
      } catch (fcmErr) {
        console.warn('FCM token generation notice:', fcmErr);
      }
    }

    // 4. Save device subscription to server and Firestore
    const deviceId = getDeviceId();
    const { platform, browser } = getClientEnvironment();
    const now = new Date().toISOString();

    const deviceData = {
      deviceId,
      userId: userId || 'anonymous',
      organizationId: organizationId || 'main',
      subOrganizationId: subOrgId || undefined,
      subWingId: subWingId || undefined,
      fcmToken: fcmToken || undefined,
      webPushSubscription: webPushSub ? webPushSub.toJSON() : undefined,
      platform,
      browser,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
    };

    // Save to server backend
    fetch('/api/notifications/register-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deviceData),
    }).catch((err) => console.warn('Server device registration sync notice:', err));

    // Save to Firestore
    const cleaned = cleanFirestorePayload({
      id: deviceId,
      ...deviceData,
    });
    await setDoc(doc(db, 'notification_devices', deviceId), cleaned, { merge: true });

    return { success: true, token: fcmToken || (webPushSub ? 'web_push_active' : undefined) };
  } catch (err: any) {
    console.error('Error requesting notification permission:', err);
    return { success: false, error: err?.message || 'Failed to activate notifications.' };
  }
}

/**
 * Send a real test push notification from backend to device
 */
export async function sendRealTestPushNotification(
  userId?: string,
  organizationId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const deviceId = getDeviceId();
    const res = await fetch('/api/notifications/test-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        userId: userId || 'anonymous',
        organizationId: organizationId || 'main',
      }),
    });
    const data = await res.json();
    return {
      success: Boolean(data.success),
      message: data.message || (data.success ? 'Test push dispatched!' : 'Failed to deliver test push.'),
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Error communicating with push server.' };
  }
}

/**
 * Create a Centralized Notification with duplicate protection
 */
export interface CreateNotificationParams {
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  organizationId: string;
  recipientUserId?: string;
  subOrganizationId?: string;
  subWingId?: string;
  entityType?: 'program' | 'permission' | 'subwing' | 'suborg' | 'achievement' | 'organizer' | 'treasury' | 'system';
  entityId?: string;
  route?: string;
  priority?: NotificationPriority;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

export async function createNotification(
  params: CreateNotificationParams
): Promise<AppNotification | null> {
  try {
    const {
      type,
      category,
      title,
      message,
      organizationId,
      recipientUserId,
      subOrganizationId,
      subWingId,
      entityType,
      entityId,
      route,
      priority = 'normal',
      metadata = {},
      idempotencyKey,
    } = params;

    if (!organizationId) {
      console.warn('Notification creation skipped: missing organizationId');
      return null;
    }

    // Generate deterministic idempotency key if not provided (prevents duplicate triggers within a 15-second window)
    const timeWindow = Math.floor(Date.now() / 15000);
    const key =
      idempotencyKey ||
      `${type}_${entityId || 'none'}_${recipientUserId || organizationId}_${subWingId || 'none'}_${timeWindow}`;

    // Query if identical notification was already posted recently
    const qDuplicate = query(
      collection(db, 'notifications'),
      where('idempotencyKey', '==', key),
      limit(1)
    );

    const dupSnap = await getDocs(qDuplicate);
    if (!dupSnap.empty) {
      const existingDoc = dupSnap.docs[0];
      return { id: existingDoc.id, ...(existingDoc.data() as any) };
    }

    const now = new Date().toISOString();
    const payload = cleanFirestorePayload({
      recipientUserId: recipientUserId || undefined,
      organizationId,
      subOrganizationId: subOrganizationId || undefined,
      subWingId: subWingId || undefined,
      type,
      category,
      title,
      message,
      createdAt: now,
      isRead: false,
      entityType: entityType || undefined,
      entityId: entityId || undefined,
      route: route || undefined,
      priority,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      idempotencyKey: key,
    });

    const docRef = await addDoc(collection(db, 'notifications'), payload);

    const newNotification: AppNotification = {
      id: docRef.id,
      ...payload,
    } as AppNotification;

    // Trigger backend WebPush dispatch to all registered target devices
    fetch('/api/notifications/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId,
        recipientUserId,
        subWingId,
        title,
        body: message,
        icon: '/pwa-192x192.png',
        url: route ? `/?view=${route}` : '/',
        data: {
          notificationId: docRef.id,
          entityType,
          entityId,
          route,
        },
      }),
    }).catch((pushErr) => console.warn('Backend push dispatch notice:', pushErr));

    return newNotification;
  } catch (err) {
    console.error('Error creating notification:', err);
    return null;
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  if (!notificationId) return;
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      isRead: true,
      readAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error marking notification as read:', err);
  }
}

/**
 * Mark all notifications for an organization/user as read in a batch
 */
export async function markAllNotificationsAsRead(
  organizationId: string,
  userId?: string
): Promise<void> {
  if (!organizationId) return;
  try {
    const q = query(
      collection(db, 'notifications'),
      where('organizationId', '==', organizationId),
      where('isRead', '==', false),
      limit(100)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    const now = new Date().toISOString();

    snapshot.docs.forEach((d) => {
      batch.update(d.ref, {
        isRead: true,
        readAt: now,
      });
    });

    await batch.commit();
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
  }
}

/**
 * Delete a notification document
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  if (!notificationId) return;
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
  } catch (err) {
    console.error('Error deleting notification:', err);
  }
}

/**
 * Fetch default or saved notification preferences
 */
export async function getNotificationPreferences(
  userId: string,
  organizationId: string
): Promise<NotificationPreferences> {
  const defaultPrefs: NotificationPreferences = {
    userId: userId || 'anonymous',
    organizationId: organizationId || 'main',
    enablePush: true,
    enableInApp: true,
    categories: {
      programs: true,
      permissions: true,
      subwings: true,
      suborgs: true,
      achievements: true,
      organizers: true,
      treasury: true,
      system: true,
    },
    updatedAt: new Date().toISOString(),
  };

  if (!userId) return defaultPrefs;

  try {
    const prefDoc = await getDoc(doc(db, 'notification_preferences', userId));
    if (prefDoc.exists()) {
      return { ...defaultPrefs, ...(prefDoc.data() as any) };
    }
  } catch (err) {
    console.warn('Could not fetch preferences from DB, using defaults:', err);
  }

  return defaultPrefs;
}

/**
 * Save user notification preferences
 */
export async function saveNotificationPreferences(
  prefs: NotificationPreferences
): Promise<void> {
  if (!prefs.userId) return;
  try {
    const payload = cleanFirestorePayload({
      ...prefs,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'notification_preferences', prefs.userId), payload, { merge: true });
  } catch (err) {
    console.error('Error saving notification preferences:', err);
  }
}
