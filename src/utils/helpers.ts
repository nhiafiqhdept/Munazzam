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
  const token = localStorage.getItem('org_token');
  if (!token) throw new Error('Authentication required for upload.');

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
          reject(new Error('Invalid server response.'));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          reject(new Error(errorData.error || 'Failed to upload file.'));
        } catch {
          reject(new Error('Failed to upload file.'));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload.'));
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

export const SAMPLE_ORG_LOGOS = [
  {
    id: 'seal_academic',
    name: 'Academic Crest',
    url: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'seal_dept',
    name: 'Islamic Studies / Fiqh Seal',
    url: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'seal_union',
    name: 'Student Union Emblem',
    url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=300&auto=format&fit=crop&q=80',
  },
];
