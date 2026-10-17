import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize or reuse Firebase App instance singleton
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore safely with custom database ID from configuration
function createFirestoreInstance(): Firestore {
  const dbId = (firebaseConfig as any)?.firestoreDatabaseId;
  const isCustomDb = dbId && typeof dbId === 'string' && dbId.trim().length > 0 && dbId !== '(default)';
  const targetDbId = isCustomDb ? dbId.trim() : undefined;

  const settings = {
    experimentalAutoDetectLongPolling: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  };

  try {
    return targetDbId ? initializeFirestore(app, settings, targetDbId) : initializeFirestore(app, settings);
  } catch (err) {
    try {
      return targetDbId ? getFirestore(app, targetDbId) : getFirestore(app);
    } catch (fallbackErr) {
      console.warn('Fallback getFirestore failed, defaulting:', fallbackErr);
      return getFirestore(app);
    }
  }
}

export const db: Firestore = createFirestoreInstance();

// Initialize Firebase Authentication
export const auth: Auth = getAuth(app);

/**
 * Removes undefined fields recursively from an object before sending to Firestore
 * to prevent 'Unsupported field value: undefined' errors.
 */
export function cleanFirestorePayload<T extends Record<string, any>>(data: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        cleaned[key] = cleanFirestorePayload(val);
      } else if (Array.isArray(val)) {
        cleaned[key] = val.map((item) =>
          item && typeof item === 'object' && !(item instanceof Date)
            ? cleanFirestorePayload(item)
            : item
        );
      } else {
        cleaned[key] = val;
      }
    }
  }
  return cleaned;
}

export default app;
