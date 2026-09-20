import { ProgramPermission } from '../types';

/**
 * Local storage key for custom production base URL override.
 */
export const PUBLIC_APP_BASE_URL_STORAGE_KEY = 'munazzam_public_app_base_url';

/**
 * Returns the configured or auto-detected public application base URL.
 * Order of priority:
 * 1. User/Org custom configured base URL from localStorage (e.g. https://munazzam.edu or custom Cloud Run URL)
 * 2. Environment variable VITE_PUBLIC_APP_URL or PUBLIC_APP_BASE_URL
 * 3. Intelligent Public Host resolver:
 *    - In AI Studio preview / dev container, "ais-dev-*" URLs are internal developer-only URLs protected by AI Studio cookies.
 *      The public shared URL that external anonymous users (Principals, WhatsApp recipients, Incognito users)
 *      can access without any authentication or cookies is "ais-pre-*".
 *      So if hostname starts with "ais-dev-", we automatically map to "ais-pre-".
 *    - For any custom domain, production Cloud Run domain, or local host, window.location.origin is used directly.
 */
export function getPublicAppBaseUrl(): string {
  // 1. Check localStorage custom configured domain
  if (typeof window !== 'undefined') {
    try {
      const customUrl = localStorage.getItem(PUBLIC_APP_BASE_URL_STORAGE_KEY);
      if (customUrl && customUrl.trim()) {
        let clean = customUrl.trim();
        if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
          clean = `https://${clean}`;
        }
        return clean.replace(/\/+$/, '');
      }
    } catch {
      // Ignore localStorage access errors
    }
  }

  // 2. Check Vite environment variables if defined
  const envUrl =
    (import.meta as any)?.env?.VITE_PUBLIC_APP_URL ||
    (import.meta as any)?.env?.PUBLIC_APP_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    let clean = envUrl.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    return clean.replace(/\/+$/, '');
  }

  // 3. Runtime origin resolver with AI Studio Shared URL detection
  if (typeof window !== 'undefined') {
    const { protocol, host, hostname } = window.location;

    // AI Studio Dev URL detection: convert ais-dev-... to ais-pre-... (which allows public, unauthenticated external access)
    if (hostname.startsWith('ais-dev-')) {
      const publicSharedHost = host.replace(/^ais-dev-/, 'ais-pre-');
      return `${protocol}//${publicSharedHost}`;
    }

    return window.location.origin.replace(/\/+$/, '');
  }

  return '';
}

/**
 * Saves a custom base URL to localStorage.
 */
export function setCustomPublicAppBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    try {
      if (!url || !url.trim()) {
        localStorage.removeItem(PUBLIC_APP_BASE_URL_STORAGE_KEY);
      } else {
        let clean = url.trim();
        if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
          clean = `https://${clean}`;
        }
        localStorage.setItem(PUBLIC_APP_BASE_URL_STORAGE_KEY, clean.replace(/\/+$/, ''));
      }
    } catch (e) {
      console.warn('Failed to save custom public app base URL:', e);
    }
  }
}

/**
 * Generates a cryptographically unguessable secure token for public permission review.
 */
export function generateSecurePermissionToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomPart = '';
  // Generate 24 random characters
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    for (let i = 0; i < array.length; i++) {
      randomPart += chars[array[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 24; i++) {
      randomPart += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  const timestampPart = Date.now().toString(36);
  return `cpt_${timestampPart}_${randomPart}`;
}

/**
 * Returns the public approval URL for a given token using the production/public base URL.
 */
export function getPublicApprovalUrl(token: string): string {
  const baseUrl = getPublicAppBaseUrl();
  if (!baseUrl) {
    return `/public/college-permission/${token}`;
  }
  return `${baseUrl}/public/college-permission/${token}`;
}

/**
 * Builds the official WhatsApp approval share message matching the exact institutional format.
 */
export function buildWhatsAppShareMessage(
  permission: Partial<ProgramPermission>,
  token?: string
): string {
  const actualToken = token || permission.approvalToken || '';
  const publicUrl = actualToken ? getPublicApprovalUrl(actualToken) : '[Review & Approve Permission]';

  const timeDisplay = permission.timeFrom
    ? (permission.timeTill ? `${permission.timeFrom} - ${permission.timeTill}` : permission.timeFrom)
    : 'Scheduled Time';

  const message = `Assalamu Alaikum,\n\nApproval is requested for the following college program:\n\nProgram: ${permission.programName || 'College Program'}\nConducted By: ${permission.conductedBy || 'Department / Organization'}\nDate: ${permission.date || 'Scheduled Date'}\nTime: ${timeDisplay}\nVenue: ${permission.venue || 'College Campus'}\n\nPlease review and respond using the secure link below:\n\n${publicUrl}\n\n— Munazzam Institutional Reporting & Analytics`;

  return message;
}

/**
 * Opens WhatsApp with the pre-filled encoded share message.
 */
export function openWhatsAppShare(message: string): void {
  const encoded = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/?text=${encoded}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Helper to copy text to clipboard with fallback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard writeText failed, using fallback:', err);
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed:', err);
    return false;
  }
}

