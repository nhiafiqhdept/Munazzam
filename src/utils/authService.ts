import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { getFirebaseErrorMessage } from './firebaseErrors';
import { AuthUser } from '../types';

export interface AuthResult {
  ok: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
}

export async function authenticateRegister(email: string, pass: string): Promise<AuthResult> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const fbUser = cred.user;
    const token = await fbUser.getIdToken();

    const accountRef = doc(db, 'accounts', fbUser.uid);
    const now = new Date().toISOString();
    await setDoc(accountRef, {
      accountId: fbUser.uid,
      email: fbUser.email,
      createdAt: now,
      updatedAt: now,
      status: 'active',
      profile: {
        name: 'My Organization',
        college_name: 'Main Campus',
        tagline: 'Excellence in Action',
        logo: '',
        email: fbUser.email,
      },
    });

    return {
      ok: true,
      token,
      user: {
        id: fbUser.uid,
        username: email.split('@')[0],
        email: fbUser.email || email,
        role: 'admin',
      },
    };
  } catch (err: any) {
    return {
      ok: false,
      error: getFirebaseErrorMessage(err),
    };
  }
}

export async function authenticateLogin(email: string, pass: string): Promise<AuthResult> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const fbUser = cred.user;
    const token = await fbUser.getIdToken();

    const accountRef = doc(db, 'accounts', fbUser.uid);
    const snap = await getDoc(accountRef);
    if (!snap.exists()) {
      const now = new Date().toISOString();
      await setDoc(accountRef, {
        accountId: fbUser.uid,
        email: fbUser.email,
        createdAt: now,
        updatedAt: now,
        status: 'active',
        profile: {
          name: 'My Organization',
          college_name: 'Main Campus',
          tagline: 'Excellence in Action',
          logo: '',
          email: fbUser.email,
        },
      });
    }

    return {
      ok: true,
      token,
      user: {
        id: fbUser.uid,
        username: email.split('@')[0],
        email: fbUser.email || email,
        role: 'admin',
      },
    };
  } catch (err: any) {
    return {
      ok: false,
      error: getFirebaseErrorMessage(err),
    };
  }
}

export async function logoutFirebaseUser(): Promise<void> {
  await signOut(auth);
}
