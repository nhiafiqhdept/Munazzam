import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize or reuse Firebase App instance singleton
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore safely with custom database ID from configuration
function createFirestoreInstance(): Firestore {
  try {
    const dbId = (firebaseConfig as any)?.firestoreDatabaseId;
    if (dbId && typeof dbId === 'string' && dbId.trim().length > 0 && dbId !== '(default)') {
      const db = getFirestore(app, dbId);
      enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
            console.warn('The current browser does not support persistence.');
        }
      });
      return db;
    }
  } catch (err) {
    console.warn('Could not initialize custom firestoreDatabaseId, falling back to default:', err);
  }
  const db = getFirestore(app);
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
        console.warn('The current browser does not support persistence.');
    }
  });
  return db;
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
