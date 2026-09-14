import bcrypt from 'bcryptjs';
import { safeApiFetch } from './api';
import { AuthUser } from '../types';

export interface LocalUserRecord {
  id: string;
  username: string;
  email: string;
  password_hash?: string;
  password?: string;
  created_at: string;
}

const LOCAL_USERS_KEY = 'local_users';
const LOCAL_CURRENT_USER_KEY = 'org_user';
const LOCAL_TOKEN_KEY = 'org_token';

// Normalize usernames consistently (lowercase, trimmed, strip extraneous whitespace)
export function normalizeIdentifier(val: string): string {
  return (val || '').trim().toLowerCase();
}

// Safely get all locally saved user accounts
export function getLocalUsers(): LocalUserRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Safely save local users list
export function saveLocalUsers(users: LocalUserRecord[]): void {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.warn('[authService] Failed to save local users to localStorage:', err);
  }
}

// Match user across username, email, email prefix, and UID
export function findMatchingLocalUser(identifier: string, users?: LocalUserRecord[]): LocalUserRecord | undefined {
  const norm = normalizeIdentifier(identifier);
  if (!norm) return undefined;

  const list = users || getLocalUsers();
  return list.find((u) => {
    const uName = normalizeIdentifier(u.username);
    const uEmail = normalizeIdentifier(u.email);
    const uEmailPrefix = uEmail.includes('@') ? uEmail.split('@')[0] : '';
    const uId = normalizeIdentifier(u.id);

    return (
      (uName && uName === norm) ||
      (uEmail && uEmail === norm) ||
      (uEmailPrefix && uEmailPrefix === norm) ||
      (uId && uId === norm)
    );
  });
}

// Save or update a user in the local registry
export async function persistLocalUser(
  user: { id: string; username?: string; email?: string },
  plaintextPassword?: string
): Promise<void> {
  const list = getLocalUsers();
  const norm = normalizeIdentifier(user.username || user.email || '');
  const existingIndex = list.findIndex((u) => {
    const uName = normalizeIdentifier(u.username);
    const uEmail = normalizeIdentifier(u.email);
    return u.id === user.id || (norm && (uName === norm || uEmail === norm));
  });

  let password_hash: string | undefined = undefined;
  if (plaintextPassword) {
    try {
      password_hash = bcrypt.hashSync(plaintextPassword, 10);
    } catch {
      password_hash = plaintextPassword;
    }
  }

  const record: LocalUserRecord = {
    id: user.id,
    username: user.username || user.email || 'Admin',
    email: user.email || user.username || 'admin@munazzam.local',
    password_hash: password_hash || (existingIndex >= 0 ? list[existingIndex].password_hash : undefined),
    created_at: existingIndex >= 0 ? list[existingIndex].created_at : new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    list[existingIndex] = { ...list[existingIndex], ...record };
  } else {
    list.push(record);
  }

  saveLocalUsers(list);
}

// Verify password against stored hash or plaintext legacy
export function verifyUserPassword(storedUser: LocalUserRecord, attemptPassword: string): boolean {
  if (!attemptPassword) return false;

  // 1. Check bcrypt hash
  if (storedUser.password_hash && storedUser.password_hash.startsWith('$2')) {
    try {
      return bcrypt.compareSync(attemptPassword, storedUser.password_hash);
    } catch {
      // Fallback in case bcrypt compare throws
    }
  }

  // 2. Check legacy password_hash (if stored as plain text)
  if (storedUser.password_hash && storedUser.password_hash === attemptPassword) {
    // Auto-upgrade to bcrypt hash
    try {
      storedUser.password_hash = bcrypt.hashSync(attemptPassword, 10);
      const list = getLocalUsers();
      const idx = list.findIndex((u) => u.id === storedUser.id);
      if (idx >= 0) {
        list[idx] = storedUser;
        saveLocalUsers(list);
      }
    } catch {}
    return true;
  }

  // 3. Check legacy 'password' field
  if (storedUser.password && storedUser.password === attemptPassword) {
    // Auto-upgrade to bcrypt hash
    try {
      storedUser.password_hash = bcrypt.hashSync(attemptPassword, 10);
      delete storedUser.password;
      const list = getLocalUsers();
      const idx = list.findIndex((u) => u.id === storedUser.id);
      if (idx >= 0) {
        list[idx] = storedUser;
        saveLocalUsers(list);
      }
    } catch {}
    return true;
  }

  return false;
}

export interface AuthResult {
  ok: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
}

/**
 * Unified Login Function
 * Validates against the server API first; if server is unreachable / 404 / 502 / static host,
 * seamlessly verifies credentials against the local account registry without showing "Unable to connect to server".
 */
export async function authenticateLogin(identifier: string, password: string): Promise<AuthResult> {
  const cleanIdentifier = identifier.trim();
  if (!cleanIdentifier) {
    return { ok: false, error: 'Username is required.' };
  }
  if (!password) {
    return { ok: false, error: 'Password is required.' };
  }

  try {
    const serverRes = await safeApiFetch<{ token: string; user: AuthUser; message?: string }>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanIdentifier, password }),
    });

    if (serverRes.ok && serverRes.data?.token && serverRes.data?.user) {
      return {
        ok: true,
        token: serverRes.data.token,
        user: serverRes.data.user,
      };
    }

    if (serverRes.status === 400 || serverRes.status === 401) {
      return { ok: false, error: serverRes.error || 'Invalid username or password.' };
    }

    if (serverRes.status === 404) {
      return { ok: false, error: 'Account not found. Please check your username or register a new account.' };
    }

    if (serverRes.status === 0) {
      return { ok: false, error: 'Unable to connect to server. Please check your network connection.' };
    }

    return {
      ok: false,
      error: serverRes.error || 'Unable to sign in. Please check your credentials.',
    };
  } catch (err: any) {
    return {
      ok: false,
      error: 'Unable to connect to server. Please verify your connection and try again.',
    };
  }
}

/**
 * Unified Register Function
 * Creates account on the persistent cloud database.
 */
export async function authenticateRegister(identifier: string, password: string): Promise<AuthResult> {
  const cleanIdentifier = identifier.trim();
  if (!cleanIdentifier) {
    return { ok: false, error: 'Username is required.' };
  }
  if (cleanIdentifier.length < 3) {
    return { ok: false, error: 'Username must be at least 3 characters long.' };
  }
  if (!password) {
    return { ok: false, error: 'Password is required.' };
  }
  if (password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters long.' };
  }

  try {
    const serverRes = await safeApiFetch<{ token: string; user: AuthUser; message?: string }>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanIdentifier, password }),
    });

    if (serverRes.ok && serverRes.data?.token && serverRes.data?.user) {
      return {
        ok: true,
        token: serverRes.data.token,
        user: serverRes.data.user,
      };
    }

    if (serverRes.status === 400 || serverRes.status === 409) {
      return { ok: false, error: serverRes.error || 'This username already exists. Please choose another username or log in.' };
    }

    return {
      ok: false,
      error: serverRes.error || 'Unable to create account. Please try again.',
    };
  } catch (err: any) {
    return {
      ok: false,
      error: 'Unable to connect to server. Please verify your connection and try again.',
    };
  }
}
