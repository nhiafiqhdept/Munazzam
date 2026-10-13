import { optimizeImageFile, isImageFile, OptimizedImageResult } from './imageOptimizer';
export * from './imageOptimizer';

export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatFullDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function extractYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  // Match standard youtube, youtu.be, shorts, and embed links
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i;
  const match = url.match(regExp);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}?rel=0`;
  }
  return null;
}

export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i;
  const match = url.match(regExp);
  return match && match[1] ? match[1] : null;
}

export function isYouTubeUrl(url: string): boolean {
  if (!url) return false;
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

export function getVideoFilename(url: string, caption?: string): string {
  if (caption && caption.trim()) {
    const cleanCap = caption.trim().replace(/[^a-zA-Z0-9_\-\.\s]/g, '_');
    if (!isYouTubeUrl(url) && !/\.(mp4|webm|mov|mkv|avi)$/i.test(cleanCap)) {
      return `${cleanCap}.mp4`;
    }
    return cleanCap;
  }
  if (!url) return 'video.mp4';
  if (url.startsWith('data:video/')) {
    const mime = url.substring(11, url.indexOf(';'));
    return `video_${Date.now()}.${mime || 'mp4'}`;
  }
  try {
    const parsed = new URL(url, window.location.href);
    const pathname = parsed.pathname;
    const parts = pathname.split('/');
    const last = parts[parts.length - 1];
    if (last && last.includes('.')) {
      return decodeURIComponent(last);
    }
  } catch {}
  return `video_${Date.now()}.mp4`;
}

// Compress and resize image files to prevent oversized strings exceeding storage limits
export async function compressImageFile(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.85
): Promise<string> {
  if (!isImageFile(file)) {
    return fileToDataUrl(file);
  }
  try {
    const result = await optimizeImageFile(file, {
      maxDimension: Math.max(maxWidth, maxHeight),
      initialQuality: quality,
      targetMaxSizeBytes: 500 * 1024,
    });
    return result.dataUrl;
  } catch (err) {
    console.warn('Image optimization fallback in compressImageFile:', err);
    return fileToDataUrl(file);
  }
}

// Upload file to server and return URL with progress support
// Automatically optimizes any image file before uploading
export async function uploadFile(
  file: File, 
  onProgress?: (percent: number) => void
): Promise<string> {
  let fileToUpload = file;
  let optimizedDataUrl = '';

  // Step 1, 2, 3, 4: Automatic image optimization BEFORE upload
  if (isImageFile(file)) {
    try {
      const optimized = await optimizeImageFile(file, {
        maxDimension: 1600,
        targetMaxSizeBytes: 500 * 1024,
      });
      fileToUpload = optimized.file;
      optimizedDataUrl = optimized.dataUrl;
    } catch (optErr) {
      console.warn('Pre-upload image optimization notice:', optErr);
    }
  }

  // Instant response via optimized Data URL if offline or without token
  const token = localStorage.getItem('org_token');
  if (!token) {
    if (onProgress) onProgress(100);
    return optimizedDataUrl || fileToDataUrl(fileToUpload);
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', fileToUpload);

    xhr.open('POST', '/api/upload');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.url);
        } catch (err) {
          resolve(optimizedDataUrl || fileToDataUrl(fileToUpload));
        }
      } else {
        resolve(optimizedDataUrl || fileToDataUrl(fileToUpload));
      }
    };

    xhr.onerror = () => resolve(optimizedDataUrl || fileToDataUrl(fileToUpload));
    xhr.send(formData);
  });
}

// Convert uploaded File to Data URL (base64)
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file);
  });
}

// Category color palettes
export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  blue: { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200', dot: 'bg-sky-500' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', dot: 'bg-rose-500' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200', dot: 'bg-teal-500' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300', dot: 'bg-slate-500' },
};

export const DEFAULT_POSITIONS = [
  'President',
  'Vice President',
  'General Secretary',
  'Joint Secretary',
  'Treasurer',
  'Coordinator',
  'Media Coordinator',
  'Academic Secretary',
  'Cultural Secretary',
  'Public Relations Officer',
  'Executive Member',
];

export const DEFAULT_AUDIENCES = [
  'All Students',
  'Department Students',
  'First Year Students',
  'Faculty & Teachers',
  'Organization Members',
  'Academic Community',
  'General Public',
  'Postgraduate Scholars',
];

export const DEFAULT_CATEGORY_NAMES = [
  { name: 'Seminar', color: 'emerald' },
  { name: 'Workshop', color: 'blue' },
  { name: 'Competition', color: 'amber' },
  { name: 'Awareness Program', color: 'indigo' },
  { name: 'Lecture', color: 'purple' },
  { name: 'Training', color: 'teal' },
  { name: 'Meeting', color: 'slate' },
  { name: 'Campaign', color: 'rose' },
  { name: 'Cultural Program', color: 'amber' },
  { name: 'Academic Program', color: 'emerald' },
];

export const DEFAULT_ORG_LOGO = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-graduation-cap"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>';

/**
 * Returns today's date string (YYYY-MM-DD) in Asia/Kolkata timezone.
 */
export function getKolkataTodayDateString(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date()); // e.g. "2026-10-12"
  } catch {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const istTime = new Date(utc + (3600000 * 5.5));
    const year = istTime.getFullYear();
    const month = String(istTime.getMonth() + 1).padStart(2, '0');
    const day = String(istTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Normalizes a given date string into a clean YYYY-MM-DD representation in Asia/Kolkata.
 */
export function normalizeDateToKolkataYMD(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();

  // If date starts with YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Handle slashes: YYYY/MM/DD or MM/DD/YYYY
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
    }
  }

  // Fallback parsing with timezone conversion
  try {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(parsed);
    }
  } catch {}

  return trimmed;
}

/**
 * Derives a program's status strictly from its date relative to today in Asia/Kolkata:
 * - date < today (Asia/Kolkata) => 'completed'
 * - date === today (Asia/Kolkata) => 'ongoing' (Happening Today / Ongoing)
 * - date > today (Asia/Kolkata) => 'upcoming'
 */
export function determineProgramStatusByDate(
  dateStr?: string
): 'completed' | 'ongoing' | 'upcoming' {
  if (!dateStr) return 'upcoming';

  const progYMD = normalizeDateToKolkataYMD(dateStr);
  if (!progYMD) return 'upcoming';

  const todayYMD = getKolkataTodayDateString();

  if (progYMD < todayYMD) {
    return 'completed';
  } else if (progYMD === todayYMD) {
    return 'ongoing';
  } else {
    return 'upcoming';
  }
}

/**
 * Resolves the effective status for a program.
 * - Always derives status from the program's date relative to today (Asia/Kolkata).
 * - If a stored/manual status exists, the date-derived status overrides it to ensure
 *   past programs are Completed, today's are Ongoing, and future programs are Upcoming.
 */
export function getProgramEffectiveStatus(prog?: {
  date?: string;
  status?: string;
  subWingId?: string;
  subWingStatus?: string;
}): 'completed' | 'ongoing' | 'upcoming' {
  if (!prog) return 'upcoming';

  // Primary source of truth: date relative to today (Asia/Kolkata)
  if (prog.date) {
    return determineProgramStatusByDate(prog.date);
  }

  // Fallback if no date is recorded on the document
  if (prog.status && typeof prog.status === 'string') {
    const s = prog.status.trim().toLowerCase();
    if (s === 'completed' || s === 'ongoing' || s === 'upcoming') {
      return s as 'completed' | 'ongoing' | 'upcoming';
    }
  }

  return 'upcoming';
}

/**
 * Visual metadata and labels for program statuses.
 */
export function getProgramStatusDisplay(status: 'completed' | 'ongoing' | 'upcoming' | string): {
  label: string;
  badgeText: string;
  subLabel: string;
} {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'completed') {
    return {
      label: 'Completed',
      badgeText: 'COMPLETED',
      subLabel: 'Event concluded (Past date)',
    };
  }
  if (normalized === 'ongoing') {
    return {
      label: 'Happening Today / Ongoing',
      badgeText: 'HAPPENING TODAY',
      subLabel: 'Scheduled for today (Asia/Kolkata)',
    };
  }
  return {
    label: 'Upcoming',
    badgeText: 'UPCOMING',
    subLabel: 'Future event scheduled',
  };
}

/**
 * Role badge styling matching the approved navy/indigo/amber/sky-blue design system:
 * - Indigo for HOD/Faculty/Dean/Advisor
 * - Royal blue for Chairman/Convenor/President/Secretary
 * - Warm amber for Treasurer/Finance Secretary
 * - Sky blue for PRO/Public Relations/Media
 * - Supporting violet/slate for other roles
 */
export function getRoleBadgeStyle(position?: string): {
  badge: string;
  dot: string;
  category: 'indigo' | 'royal' | 'amber' | 'sky' | 'default';
} {
  const pos = (position || '').toLowerCase();

  // Indigo for HOD/Faculty/Dean/Advisor
  if (
    pos.includes('hod') ||
    pos.includes('faculty') ||
    pos.includes('head') ||
    pos.includes('dean') ||
    pos.includes('advisor') ||
    pos.includes('professor')
  ) {
    return {
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/90',
      dot: 'bg-indigo-500',
      category: 'indigo',
    };
  }

  // Warm Amber for Treasurer / Finance Secretary
  if (pos.includes('treasurer') || pos.includes('finance')) {
    return {
      badge: 'bg-amber-50 text-amber-800 border-amber-200/90',
      dot: 'bg-amber-500',
      category: 'amber',
    };
  }

  // Sky blue for PRO / Public Relations / Media
  if (pos.includes('pro') || pos.includes('public relation') || pos.includes('media')) {
    return {
      badge: 'bg-sky-50 text-sky-700 border-sky-200/90',
      dot: 'bg-sky-500',
      category: 'sky',
    };
  }

  // Royal Blue for Chairman / Convenor / President / General Secretary
  if (
    pos.includes('chairman') ||
    pos.includes('convenor') ||
    pos.includes('conveener') ||
    pos.includes('president') ||
    pos.includes('secretary') ||
    pos.includes('leader')
  ) {
    return {
      badge: 'bg-blue-50 text-[#1d4ed8] border-blue-200/90',
      dot: 'bg-blue-500',
      category: 'royal',
    };
  }

  // Supporting Violet / Slate for other roles
  return {
    badge: 'bg-violet-50 text-violet-700 border-violet-200/90',
    dot: 'bg-violet-500',
    category: 'default',
  };
}

