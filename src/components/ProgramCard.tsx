import React, { useState } from 'react';
import {
  Calendar,
  ArrowRight,
  Camera,
  Sparkles,
  BookOpen,
  Award,
  GraduationCap,
  Users,
  Landmark,
  Compass,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Program } from '../types';
import { formatDate, getProgramEffectiveStatus } from '../utils/helpers';
import { useApp } from '../context/AppContext';

interface ProgramCardProps {
  program: Program;
  onViewDetails: (id: string) => void;
  onEdit?: (program: Program) => void;
  onDelete?: (program: Program) => void;
  isAdmin?: boolean;
  wingFallback?: string;
}

/**
 * Checks whether the program actually has a genuine uploaded poster image,
 * excluding placeholders, empty strings, and generic stock images.
 */
export function isValidUploadedPoster(poster?: string | null): boolean {
  if (!poster || typeof poster !== 'string') return false;
  const trimmed = poster.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (
    lower === 'no poster' ||
    lower === 'null' ||
    lower === 'undefined' ||
    lower === 'none' ||
    lower === 'false'
  ) {
    return false;
  }
  // Exclude placeholder services and generic stock photos
  if (
    lower.includes('unsplash.com') ||
    lower.includes('placeholder') ||
    lower.includes('dummyimage') ||
    lower.includes('via.placeholder') ||
    lower.includes('placehold.co')
  ) {
    return false;
  }
  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/')
  );
}

export interface CardTheme {
  id: string;
  category: string;
  gradient: string;
  accent: string;
  glow: string;
  badgeBorder: string;
}

export const THUMBNAIL_THEMES: CardTheme[] = [
  // 1. Purple + Magenta
  {
    id: 'purple-magenta',
    category: 'purple',
    gradient: 'from-[#2e0854] via-[#5b1380] to-[#b8147d]',
    accent: '#e879f9',
    glow: 'rgba(232, 121, 249, 0.35)',
    badgeBorder: 'border-fuchsia-400/30',
  },
  // 2. Emerald + Mint (Green)
  {
    id: 'emerald-mint',
    category: 'green',
    gradient: 'from-[#022c22] via-[#046c4e] to-[#0f766e]',
    accent: '#34d399',
    glow: 'rgba(52, 211, 153, 0.35)',
    badgeBorder: 'border-emerald-400/30',
  },
  // 3. Orange + Amber
  {
    id: 'orange-amber',
    category: 'orange',
    gradient: 'from-[#431407] via-[#7c2d12] to-[#c2410c]',
    accent: '#fb923c',
    glow: 'rgba(251, 146, 60, 0.35)',
    badgeBorder: 'border-orange-400/30',
  },
  // 4. Royal Blue + Cyan
  {
    id: 'royal-blue-cyan',
    category: 'blue',
    gradient: 'from-[#0b192c] via-[#1e3a8a] to-[#0284c7]',
    accent: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.35)',
    badgeBorder: 'border-sky-400/30',
  },
  // 5. Crimson + Rose (Red)
  {
    id: 'crimson-rose',
    category: 'red',
    gradient: 'from-[#3f0713] via-[#881337] to-[#be123c]',
    accent: '#fb7185',
    glow: 'rgba(251, 113, 133, 0.35)',
    badgeBorder: 'border-rose-400/30',
  },
  // 6. Indigo + Electric Violet
  {
    id: 'indigo-violet',
    category: 'violet',
    gradient: 'from-[#1e1b4b] via-[#3730a3] to-[#6d28d9]',
    accent: '#a78bfa',
    glow: 'rgba(167, 139, 250, 0.35)',
    badgeBorder: 'border-violet-400/30',
  },
  // 7. Deep Ocean Teal + Turquoise
  {
    id: 'ocean-teal',
    category: 'teal',
    gradient: 'from-[#042f2e] via-[#0d9488] to-[#0891b2]',
    accent: '#2dd4bf',
    glow: 'rgba(45, 212, 191, 0.35)',
    badgeBorder: 'border-teal-400/30',
  },
  // 8. Forest Green + Lime
  {
    id: 'forest-lime',
    category: 'lime',
    gradient: 'from-[#14532d] via-[#15803d] to-[#4d7c0f]',
    accent: '#a3e635',
    glow: 'rgba(163, 230, 53, 0.35)',
    badgeBorder: 'border-lime-400/30',
  },
  // 9. Burgundy + Coral
  {
    id: 'burgundy-coral',
    category: 'coral',
    gradient: 'from-[#4a041f] via-[#9f1239] to-[#ea580c]',
    accent: '#f97316',
    glow: 'rgba(249, 115, 22, 0.35)',
    badgeBorder: 'border-orange-400/30',
  },
  // 10. Berry Pink + Purple
  {
    id: 'berry-pink',
    category: 'pink',
    gradient: 'from-[#500724] via-[#9d174d] to-[#701a75]',
    accent: '#f472b6',
    glow: 'rgba(244, 114, 182, 0.35)',
    badgeBorder: 'border-pink-400/30',
  },
  // 11. Midnight Navy + Electric Sapphire Blue
  {
    id: 'navy-sapphire',
    category: 'blue',
    gradient: 'from-[#030712] via-[#1e1b4b] to-[#1d4ed8]',
    accent: '#60a5fa',
    glow: 'rgba(96, 165, 250, 0.35)',
    badgeBorder: 'border-blue-400/30',
  },
  // 12. Dark Plum + Rose Quartz
  {
    id: 'plum-rose',
    category: 'plum',
    gradient: 'from-[#3b0764] via-[#701a75] to-[#9f1239]',
    accent: '#f43f5e',
    glow: 'rgba(244, 63, 94, 0.35)',
    badgeBorder: 'border-rose-400/30',
  },
  // 13. Rust + Flame Red-Orange
  {
    id: 'rust-flame',
    category: 'orange',
    gradient: 'from-[#450a0a] via-[#991b1b] to-[#ea580c]',
    accent: '#ff8c00',
    glow: 'rgba(255, 140, 0, 0.35)',
    badgeBorder: 'border-amber-400/30',
  },
  // 14. Pine + Aquamarine
  {
    id: 'pine-aquamarine',
    category: 'green',
    gradient: 'from-[#064e3b] via-[#047857] to-[#0284c7]',
    accent: '#38edf8',
    glow: 'rgba(56, 237, 248, 0.35)',
    badgeBorder: 'border-cyan-400/30',
  },
  // 15. Ultra Violet + Amethyst
  {
    id: 'ultraviolet-amethyst',
    category: 'violet',
    gradient: 'from-[#2e1065] via-[#5b21b6] to-[#7e22ce]',
    accent: '#c084fc',
    glow: 'rgba(192, 132, 252, 0.35)',
    badgeBorder: 'border-purple-400/30',
  },
  // 16. Midnight Cobalt + Aqua Cyan
  {
    id: 'cobalt-cyan',
    category: 'cyan',
    gradient: 'from-[#0c4a6e] via-[#0369a1] to-[#0d9488]',
    accent: '#22d3ee',
    glow: 'rgba(34, 211, 238, 0.35)',
    badgeBorder: 'border-cyan-400/30',
  },
  // 17. Maroon + Terracotta
  {
    id: 'maroon-terracotta',
    category: 'red',
    gradient: 'from-[#4c0519] via-[#881337] to-[#c2410c]',
    accent: '#f87171',
    glow: 'rgba(248, 113, 113, 0.35)',
    badgeBorder: 'border-rose-400/30',
  },
  // 18. Deep Sapphire + Dark Indigo
  {
    id: 'sapphire-indigo',
    category: 'indigo',
    gradient: 'from-[#020617] via-[#172554] to-[#312e81]',
    accent: '#818cf8',
    glow: 'rgba(129, 140, 248, 0.35)',
    badgeBorder: 'border-indigo-400/30',
  },
  // 19. Emerald + Rich Gold
  {
    id: 'emerald-gold',
    category: 'amber',
    gradient: 'from-[#064e3b] via-[#15803d] to-[#b45309]',
    accent: '#facc15',
    glow: 'rgba(250, 204, 21, 0.35)',
    badgeBorder: 'border-amber-400/30',
  },
  // 20. Deep Magenta + Fuchsia Pink
  {
    id: 'magenta-fuchsia',
    category: 'pink',
    gradient: 'from-[#4c0519] via-[#831843] to-[#be185d]',
    accent: '#f472b6',
    glow: 'rgba(244, 114, 182, 0.35)',
    badgeBorder: 'border-pink-400/30',
  },
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Deterministic color variant for fallback cards based on program ID/name
 * with position index offset and adjacent category collision avoidance.
 */
export function getCardTheme(
  prog: Program,
  positionIndex?: number,
  previousCategory?: string
): CardTheme {
  const seed = prog.id || prog.name || 'munazzam_program';
  const baseHash = hashString(seed);

  let themeIndex: number;
  if (typeof positionIndex === 'number') {
    // Jump across palette using stride of 7 to avoid adjacent similar colors
    themeIndex = (baseHash + positionIndex * 7) % THUMBNAIL_THEMES.length;
  } else {
    themeIndex = baseHash % THUMBNAIL_THEMES.length;
  }

  // Prevent consecutive items from sharing the exact same color family category
  if (previousCategory) {
    let attempts = 0;
    while (
      THUMBNAIL_THEMES[themeIndex].category === previousCategory &&
      attempts < THUMBNAIL_THEMES.length
    ) {
      themeIndex = (themeIndex + 1) % THUMBNAIL_THEMES.length;
      attempts++;
    }
  }

  return THUMBNAIL_THEMES[themeIndex];
}

/**
 * Computes a list of themes for a collection of programs, ensuring adjacent items
 * always belong to distinct color categories.
 */
export function getThemesForProgramList(programs: Program[]): CardTheme[] {
  const result: CardTheme[] = [];
  let prevCat: string | undefined = undefined;

  for (let i = 0; i < programs.length; i++) {
    const theme = getCardTheme(programs[i], i, prevCat);
    result.push(theme);
    prevCat = theme.category;
  }

  return result;
}

/**
 * Returns a contextual icon for the visual header
 */
function getDecorativeIcon(prog: Program) {
  const text = `${prog.name} ${prog.category || ''} ${prog.subCategory || ''}`.toLowerCase();
  if (text.includes('academic') || text.includes('lecture') || text.includes('talk') || text.includes('study')) {
    return BookOpen;
  }
  if (text.includes('award') || text.includes('competition') || text.includes('trophy')) {
    return Award;
  }
  if (text.includes('degree') || text.includes('graduation') || text.includes('student') || text.includes('colloquium')) {
    return GraduationCap;
  }
  if (text.includes('community') || text.includes('meet') || text.includes('union') || text.includes('gathering')) {
    return Users;
  }
  if (text.includes('legal') || text.includes('jurist') || text.includes('ethics') || text.includes('official')) {
    return Landmark;
  }
  if (text.includes('workshop') || text.includes('art') || text.includes('orientation')) {
    return Compass;
  }
  return Sparkles;
}

/**
 * Formats date into uppercase format e.g. "21 SEPTEMBER 2026"
 */
function formatThumbnailDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    let date: Date;
    if (typeof dateStr === 'string' && dateStr.includes('-') && !dateStr.includes('T')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        date = new Date(year, month, day, 0, 0, 0, 0);
      } else {
        date = new Date(dateStr);
      }
    } else if (typeof dateStr === 'string' && dateStr.includes('/') && !dateStr.includes('T')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        let month = parseInt(parts[0], 10) - 1;
        let day = parseInt(parts[1], 10);
        let year = parseInt(parts[2], 10);
        if (parts[0].length === 4) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          day = parseInt(parts[2], 10);
        }
        date = new Date(year, month, day, 0, 0, 0, 0);
      } else {
        date = new Date(dateStr);
      }
    } else {
      date = new Date(dateStr);
    }
    if (isNaN(date.getTime())) return dateStr.toUpperCase();
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`.toUpperCase();
  } catch {
    return (dateStr || '').toUpperCase();
  }
}

interface ProgramCardProps {
  program: Program;
  onViewDetails: (id: string) => void;
  onEdit?: (program: Program) => void;
  onDelete?: (program: Program) => void;
  isAdmin?: boolean;
  wingFallback?: string;
  positionIndex?: number;
  theme?: CardTheme;
}

export const ProgramThumbnail: React.FC<{
  program: Program;
  onViewDetails: (id: string) => void;
  wingFallback?: string;
  positionIndex?: number;
  theme?: CardTheme;
}> = ({ program, onViewDetails, wingFallback, positionIndex, theme: themeProp }) => {
  const { updateProgram, isPublicView, isAdmin } = useApp();
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const theme = themeProp || getCardTheme(program, positionIndex);
  const IconComponent = getDecorativeIcon(program);
  const effectiveStatus = getProgramEffectiveStatus(program);
  const statusBadgeText = (effectiveStatus || 'upcoming').toUpperCase();
  const canEditStatus = isAdmin && !isPublicView;
  const hasRealPoster = isValidUploadedPoster(program.poster);

  const handleBadgeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!canEditStatus || isTogglingStatus) return;

    setIsTogglingStatus(true);
    const nextStatus = effectiveStatus === 'completed' ? 'upcoming' : 'completed';
    try {
      await updateProgram({
        id: program.id,
        status: nextStatus,
      });
    } catch (err) {
      console.error('Failed to toggle program status:', err);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  return (
    <div
      id={`program-thumbnail-${program.id}`}
      className="relative h-52 sm:h-56 md:h-64 w-full overflow-hidden select-none cursor-pointer flex flex-col justify-between p-5 rounded-2xl shadow-md border border-slate-200/90 group"
      onClick={() => onViewDetails(program.id)}
    >
      {hasRealPoster ? (
        <>
          <img
            src={program.poster!}
            alt={program.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/50" />
        </>
      ) : (
        <>
          {/* Rich Gradient Canvas */}
          <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient}`} />

          {/* Subtle Decorative Dotted Pattern */}
          <div
            className="absolute inset-0 opacity-[0.14] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />

          {/* Ambient Radial Glow */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen"
            style={{
              background: `radial-gradient(circle at 50% 40%, ${theme.glow} 0%, transparent 70%)`,
            }}
          />
        </>
      )}

      {/* Top Row: Status Pill Badge */}
      <div className="relative z-10 flex items-center justify-between gap-2 w-full">
        <button
          type="button"
          onClick={handleBadgeClick}
          disabled={!canEditStatus || isTogglingStatus}
          title={
            canEditStatus
              ? `Click to change status to ${effectiveStatus === 'completed' ? 'UPCOMING' : 'COMPLETED'}`
              : `Program status: ${statusBadgeText}`
          }
          className={`px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border ${theme.badgeBorder} text-white/95 text-[10px] font-semibold tracking-wide uppercase shadow-2xs truncate max-w-[80%] transition-all ${
            canEditStatus
              ? 'cursor-pointer hover:bg-black/60 hover:scale-105 active:scale-95 hover:border-white/40 ring-1 ring-white/10'
              : 'cursor-default'
          } ${isTogglingStatus ? 'opacity-70 animate-pulse' : ''}`}
        >
          {statusBadgeText}
        </button>

        {program.media && program.media.length > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-amber-300 text-[10px] font-semibold flex items-center gap-1 shadow-2xs">
            <Camera className="w-3 h-3" />
            <span>{program.media.length}</span>
          </span>
        )}
      </div>

      {/* Center Content: Icon + Main Title + Program Date */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center px-2 py-2">
        {/* Subtle Decorative Center Icon */}
        <div className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-white/90 mb-2 shadow-2xs group-hover:scale-105 transition-transform">
          <IconComponent className="w-4.5 h-4.5" />
        </div>

        {/* Large Bold Uppercase Program Title */}
        <h2 className="text-base sm:text-lg md:text-xl font-black uppercase tracking-wider text-white text-center leading-tight line-clamp-2 px-2 drop-shadow-sm font-heading">
          {program.name}
        </h2>

        {/* Program Date below program name */}
        {program.date && (
          <p className="text-[11px] sm:text-xs font-semibold tracking-widest text-white/80 uppercase text-center mt-2 truncate max-w-[90%]">
            {formatThumbnailDate(program.date)}
          </p>
        )}
      </div>

      {/* Bottom spacer */}
      <div className="relative z-10 h-1" />
    </div>
  );
};

export const ProgramCard: React.FC<ProgramCardProps> = ({
  program,
  onViewDetails,
  onEdit,
  onDelete,
  isAdmin = false,
  wingFallback,
  positionIndex,
  theme: themeProp,
}) => {
  const { updateProgram, isPublicView } = useApp();
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const theme = themeProp || getCardTheme(program, positionIndex);
  const IconComponent = getDecorativeIcon(program);
  const effectiveStatus = getProgramEffectiveStatus(program);
  const statusBadgeText = (effectiveStatus || 'upcoming').toUpperCase();
  const canEditStatus = isAdmin && !isPublicView;
  const hasRealPoster = isValidUploadedPoster(program.poster);

  const handleBadgeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!canEditStatus || isTogglingStatus) return;

    setIsTogglingStatus(true);
    const nextStatus = effectiveStatus === 'completed' ? 'upcoming' : 'completed';
    try {
      await updateProgram({
        id: program.id,
        status: nextStatus,
      });
    } catch (err) {
      console.error('Failed to toggle program status:', err);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Category / Wing badge at bottom-left
  const wingBadgeText = (
    program.subWingName ||
    program.category ||
    wingFallback ||
    'Degree Wing'
  ).toUpperCase();

  return (
    <div
      id={`program-card-${program.id}`}
      className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full group"
    >
      {/* ============================================================== */}
      {/* 1. VISUAL HEADER AREA                                          */}
      {/* ============================================================== */}
      <div
        className="relative h-48 sm:h-52 w-full overflow-hidden select-none cursor-pointer flex flex-col justify-between p-4"
        onClick={() => onViewDetails(program.id)}
      >
        {hasRealPoster ? (
          <>
            <img
              src={program.poster!}
              alt={program.name}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/50" />
          </>
        ) : (
          <>
            {/* Rich Gradient Canvas */}
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient}`} />

            {/* Subtle Decorative Dotted Pattern */}
            <div
              className="absolute inset-0 opacity-[0.14] pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            />

            {/* Ambient Radial Glow */}
            <div
              className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen"
              style={{
                background: `radial-gradient(circle at 50% 40%, ${theme.glow} 0%, transparent 70%)`,
              }}
            />
          </>
        )}

        {/* Top Row: Status Pill Badge */}
        <div className="relative z-10 flex items-center justify-between gap-2 w-full">
          <button
            type="button"
            onClick={handleBadgeClick}
            disabled={!canEditStatus || isTogglingStatus}
            title={
              canEditStatus
                ? `Click to change status to ${effectiveStatus === 'completed' ? 'UPCOMING' : 'COMPLETED'}`
                : `Program status: ${statusBadgeText}`
            }
            className={`px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-md border ${theme.badgeBorder} text-white/95 text-[10px] font-semibold tracking-wide uppercase shadow-2xs truncate max-w-[80%] transition-all ${
              canEditStatus
                ? 'cursor-pointer hover:bg-black/60 hover:scale-105 active:scale-95 hover:border-white/40 ring-1 ring-white/10'
                : 'cursor-default'
            } ${isTogglingStatus ? 'opacity-70 animate-pulse' : ''}`}
          >
            {statusBadgeText}
          </button>

          {program.media && program.media.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-amber-300 text-[10px] font-semibold flex items-center gap-1 shadow-2xs">
              <Camera className="w-3 h-3" />
              <span>{program.media.length}</span>
            </span>
          )}
        </div>

        {/* Center Content: Icon + Main Title + Program Date */}
        <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center px-2 py-1">
          {/* Subtle Decorative Center Icon */}
          <div className="w-7 h-7 rounded-full bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-white/90 mb-1.5 shadow-2xs group-hover:scale-105 transition-transform">
            <IconComponent className="w-3.5 h-3.5" />
          </div>

          {/* Large Bold Uppercase Program Title */}
          <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white text-center leading-tight line-clamp-2 px-2 drop-shadow-sm font-heading">
            {program.name}
          </h2>

          {/* Program Date below program name */}
          {program.date && (
            <p className="text-[10px] sm:text-[11px] font-semibold tracking-widest text-white/80 uppercase text-center mt-1 truncate max-w-[90%]">
              {formatThumbnailDate(program.date)}
            </p>
          )}
        </div>

        {/* Bottom spacer to preserve proportion */}
        <div className="relative z-10 h-1" />
      </div>

      {/* ============================================================== */}
      {/* 2. WHITE INFORMATION AREA                                      */}
      {/* ============================================================== */}
      <div className="bg-white p-4 sm:p-5 flex flex-col justify-between flex-1 space-y-3">
        {/* Top Info: Date, Title, Description */}
        <div className="space-y-1.5">
          {/* Row 1: Calendar + Date */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{formatDate(program.date)}</span>
            {program.time && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-slate-400 font-normal truncate">{program.time}</span>
              </>
            )}
          </div>

          {/* Row 2: Program Title in Body */}
          <h3
            onClick={() => onViewDetails(program.id)}
            className="text-sm sm:text-base font-bold text-slate-900 font-heading leading-snug line-clamp-1 hover:text-emerald-700 transition cursor-pointer"
            title={program.name}
          >
            {program.name}
          </h3>

          {/* Row 3: Short Description (approx 2 lines truncated) */}
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {program.description
              ? program.description
              : program.place
              ? `Venue: ${program.place}`
              : program.audience
              ? `Target Audience: ${program.audience}`
              : 'Official departmental activity and organized program record.'}
          </p>
        </div>

        {/* ============================================================== */}
        {/* 3. CARD FOOTER: WING BADGE + VIEW ACTION + ADMIN CONTROLS      */}
        {/* ============================================================== */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          {/* Bottom-Left: Category / Wing Badge */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-slate-100 text-slate-600 border border-slate-200/80 truncate max-w-[130px] inline-block"
              title={wingBadgeText}
            >
              {wingBadgeText}
            </span>
          </div>

          {/* Bottom-Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Admin Quick Edit & Delete */}
            {isAdmin && (onEdit || onDelete) && (
              <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-0.5">
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(program);
                    }}
                    className="p-1 text-slate-400 hover:text-emerald-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Edit Program"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(program);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Program"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* View Program Action */}
            <button
              onClick={() => onViewDetails(program.id)}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors group-hover:translate-x-0.5 transition-transform cursor-pointer"
            >
              <span>View Program</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
