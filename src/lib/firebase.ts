import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom database ID from configuration
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Authentication
export const auth = getAuth(app);

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
