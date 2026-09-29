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
 * Cleans any legacy auto-generated report templates or repeated metadata from a program description.
 * Ensures that the Description contains ONLY the actual program description entered by the user,
 * without duplicating Program Name, Date & Time, Place Held, For Whom, Resource Person, or auto-generated boilerplate.
 */
export function getCleanProgramDescription(
  rawDescription?: string,
  programName?: string
): string {
  if (!rawDescription || typeof rawDescription !== 'string') return '';
  let text = rawDescription.trim();
  if (!text) return '';

  // Check for auto-generated report template markers (**Date & Time**, **Place Held**, etc.)
  const hasTemplateMarkers =
    text.includes('**Date & Time') ||
    text.includes('**Place Held') ||
    text.includes('**For Whom') ||
    text.includes('**Resource Person') ||
    text.includes('**Target Audience') ||
    text.includes('**Venue') ||
    text.includes('**Conducted By') ||
    text.includes('**Program Category');

  if (hasTemplateMarkers) {
    const lines = text.split('\n');
    const cleanedLines: string[] = [];
    let skipNextLine = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (
        line.startsWith('**Date & Time') ||
        line.startsWith('**Place Held') ||
        line.startsWith('**For Whom') ||
        line.startsWith('**Resource Person') ||
        line.startsWith('**Target Audience') ||
        line.startsWith('**Venue') ||
        line.startsWith('**Conducted By') ||
        line.startsWith('**Program Category')
      ) {
        if (!line.includes(':') || line.endsWith('**') || line.endsWith(':')) {
          skipNextLine = true;
        }
        continue;
      }

      if (skipNextLine) {
        skipNextLine = false;
        continue;
      }

      // Skip title repetition
      if (
        programName &&
        (line.toLowerCase() === programName.trim().toLowerCase() ||
          line.toUpperCase() === programName.trim().toUpperCase())
      ) {
        continue;
      }

      // Skip auto-generated boilerplate sentences
      if (
        line.startsWith('An institutional program designed for') ||
        line.startsWith('An official institutional program organized for') ||
        line.startsWith('A comprehensive program organized for') ||
        line.startsWith('A dedicated program organized for') ||
        line.startsWith('organized to foster excellence') ||
        line.startsWith('focused on empowering')
      ) {
        continue;
      }

      if (line) {
        cleanedLines.push(lines[i]);
      }
    }

    text = cleanedLines.join('\n').trim();
  }

  // If text is only the program name or empty
  if (
    programName &&
    (text.toLowerCase() === programName.trim().toLowerCase() ||
      text.toUpperCase() === programName.trim().toUpperCase())
  ) {
    return '';
  }

  return text;
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

  const timeDisplay = permission.time || (permission.timeFrom
    ? (permission.timeTill ? `${permission.timeFrom} – ${permission.timeTill}` : permission.timeFrom)
    : 'Scheduled Time');

  const cleanDescription = getCleanProgramDescription(
    permission.description,
    permission.programName
  );

  const lines: string[] = [
    'Assalamu Alaikum,',
    '',
    'Approval is requested for the following college program:',
    '',
    `Program: ${permission.programName || 'College Program'}`,
    `Conducted By: ${permission.conductedBy || 'Department / Organization'}`,
    `Date: ${permission.date || 'Scheduled Date'}`,
    `Time: ${timeDisplay}`,
    `Venue: ${permission.venue || 'College Campus'}`,
    `Target Audience: ${permission.audience || 'Students'}`,
  ];

  if (permission.programInCharge && permission.programInCharge.trim()) {
    lines.push(`Program In-Charge: ${permission.programInCharge.trim()}`);
  }

  if (cleanDescription && cleanDescription.trim()) {
    lines.push(`Description: ${cleanDescription.trim()}`);
  }

  lines.push('');
  lines.push('Please review and respond using the secure link below:');
  lines.push(publicUrl);
  lines.push('');
  lines.push('— Munazzam Institutional Reporting & Analytics');

  return lines.join('\n');
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

