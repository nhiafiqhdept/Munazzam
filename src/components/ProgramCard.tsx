import React from 'react';
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

/**
 * Deterministic color variant for fallback cards based on program ID/name.
 */
function getCardTheme(prog: Program) {
  const seed = prog.id || prog.name || 'munazzam_program';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % 5;

  const themes = [
    {
      id: 'navy-purple',
      // Deep navy -> purple
      gradient: 'from-[#0a0f1d] via-[#1a1442] to-[#4c1d95]',
      accent: '#818cf8',
      glow: 'rgba(129, 140, 248, 0.25)',
      badgeBorder: 'border-indigo-400/25',
    },
    {
      id: 'crimson-burgundy',
      // Deep red -> burgundy -> dark navy
      gradient: 'from-[#20030a] via-[#54091f] to-[#1a0826]',
      accent: '#fb7185',
      glow: 'rgba(251, 113, 133, 0.25)',
      badgeBorder: 'border-rose-400/25',
    },
    {
      id: 'deep-blue-violet',
      // Deep blue / violet
      gradient: 'from-[#031525] via-[#0c2a5e] to-[#31104b]',
      accent: '#60a5fa',
      glow: 'rgba(96, 165, 250, 0.25)',
      badgeBorder: 'border-blue-400/25',
    },
    {
      id: 'dark-maroon-navy',
      // Dark maroon / crimson
      gradient: 'from-[#1e0524] via-[#430b2c] to-[#0d1527]',
      accent: '#f472b6',
      glow: 'rgba(244, 114, 182, 0.25)',
      badgeBorder: 'border-pink-400/25',
    },
    {
      id: 'emerald-navy',
      // Emerald / deep navy
      gradient: 'from-[#021d17] via-[#064e3b] to-[#0a1120]',
      accent: '#34d399',
      glow: 'rgba(52, 211, 153, 0.25)',
      badgeBorder: 'border-emerald-400/25',
    },
  ];

  return themes[index];
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

export const ProgramCard: React.FC<ProgramCardProps> = ({
  program,
  onViewDetails,
  onEdit,
  onDelete,
  isAdmin = false,
  wingFallback,
}) => {
  const theme = getCardTheme(program);
  const IconComponent = getDecorativeIcon(program);
  const effectiveStatus = getProgramEffectiveStatus(program);
  const statusBadgeText = (effectiveStatus || 'upcoming').toUpperCase();

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
      {/* 1. VISUAL HEADER AREA (Always Generated Design Thumbnail)      */}
      {/* ============================================================== */}
      <div
        className="relative h-48 sm:h-52 w-full overflow-hidden select-none cursor-pointer flex flex-col justify-between p-4"
        onClick={() => onViewDetails(program.id)}
      >
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

        {/* Top Row: Status Pill Badge */}
        <div className="relative z-10 flex items-center justify-between gap-2 w-full">
          <span
            className={`px-2.5 py-0.5 rounded-full bg-black/35 backdrop-blur-md border ${theme.badgeBorder} text-white/95 text-[10px] font-semibold tracking-wide uppercase shadow-2xs truncate max-w-[80%]`}
          >
            {statusBadgeText}
          </span>

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
            <p className="text-[10px] sm:text-[11px] font-semibold tracking-widest text-white/70 uppercase text-center mt-1 truncate max-w-[90%]">
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
