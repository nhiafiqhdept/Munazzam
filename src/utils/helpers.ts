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

// Upload file to server and return URL with progress support
export async function uploadFile(
  file: File, 
  onProgress?: (percent: number) => void
): Promise<string> {
  // Convert images and files instantly to Data URL for instant response
  try {
    const dataUrl = await fileToDataUrl(file);
    if (onProgress) onProgress(100);
    return dataUrl;
  } catch {
    // Fallback to server XHR upload if needed
  }

  const token = localStorage.getItem('org_token');
  if (!token) {
    return fileToDataUrl(file);
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

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
          resolve(fileToDataUrl(file));
        }
      } else {
        resolve(fileToDataUrl(file));
      }
    };

    xhr.onerror = () => resolve(fileToDataUrl(file));
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

export function determineProgramStatusByDate(dateStr: string): 'upcoming' | 'completed' {
  if (!dateStr) return 'upcoming';
  
  try {
    // Current date in local time
    const today = new Date();
    // Reset hours, minutes, seconds, ms for today to do a pure date comparison
    today.setHours(0, 0, 0, 0);
    
    // Parse the program date
    let progDate = new Date(dateStr);
    
    // If the input date is just YYYY-MM-DD, parsing it with `new Date('YYYY-MM-DD')`
    // in JS defaults to UTC midnight, which when converted to local time might shift to the previous day!
    // To prevent timezone shifting, we should parse the YYYY-MM-DD manually in local time:
    if (typeof dateStr === 'string' && dateStr.includes('-') && !dateStr.includes('T')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // 0-indexed
        const day = parseInt(parts[2], 10);
        progDate = new Date(year, month, day, 0, 0, 0, 0);
      }
    } else if (typeof dateStr === 'string' && dateStr.includes('/') && !dateStr.includes('T')) {
      // Sometimes dates are in MM/DD/YYYY format
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        let month = parseInt(parts[0], 10) - 1;
        let day = parseInt(parts[1], 10);
        let year = parseInt(parts[2], 10);
        // handle YYYY/MM/DD
        if (parts[0].length === 4) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          day = parseInt(parts[2], 10);
        }
        progDate = new Date(year, month, day, 0, 0, 0, 0);
      }
    }
    
    // If invalid date parsing fallback, use standard date
    if (isNaN(progDate.getTime())) {
      progDate = new Date(dateStr);
    }
    
    // Reset time of program date to midnight for comparison
    progDate.setHours(0, 0, 0, 0);
    
    // IF program date is today or in the future: upcoming, otherwise: completed
    if (progDate.getTime() >= today.getTime()) {
      return 'upcoming';
    } else {
      return 'completed';
    }
  } catch (err) {
    console.error('Error determining program status:', err);
    return 'upcoming'; // safe fallback
  }
}

/**
 * Resolves the effective status for a program.
 * - Preserves 'ongoing' status if explicitly set.
 * - If program date is today or in the future, returns 'upcoming' (correcting any future records mistakenly saved as 'completed').
 * - If program date has passed, returns 'completed' (preserving historical records).
 */
export function getProgramEffectiveStatus(prog?: {
  date?: string;
  status?: string;
  subWingId?: string;
  subWingStatus?: string;
}): 'upcoming' | 'completed' | 'ongoing' {
  if (!prog) return 'upcoming';
  if (prog.status === 'ongoing') return 'ongoing';

  if (prog.date) {
    const dateBased = determineProgramStatusByDate(prog.date);
    if (dateBased === 'upcoming') {
      return 'upcoming';
    } else {
      return 'completed';
    }
  }

  return (prog.status as any) || 'completed';
}
