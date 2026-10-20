import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, ArrowRight, Camera, Sparkles, Clock } from 'lucide-react';
import { Program } from '../types';
import { CardTheme, THUMBNAIL_THEMES, getThemesForProgramList, getDecorativeIcon } from './ProgramCard';
import { formatDate, getProgramEffectiveStatus } from '../utils/helpers';

interface UpcomingProgramsCarouselProps {
  programs: Program[];
  onViewDetails: (id: string) => void;
  onOpenAddProgram?: () => void;
}

function getSlideIndex(offset: number, current: number, total: number): number {
  if (total <= 0) return 0;
  return ((current + offset) % total + total) % total;
}

/**
 * Format program date cleanly for hero showcase badge
 */
function formatShowcaseDate(dateStr?: string): string {
  if (!dateStr) return 'Date TBA';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Modern Hero Showcase Card designed specifically for the prominent hero showcase
 */
interface ShowcaseCardProps {
  program: Program;
  theme: CardTheme;
  onViewDetails?: (id: string) => void;
  interactive?: boolean;
  isCenter?: boolean;
  className?: string;
}

const ShowcaseCard: React.FC<ShowcaseCardProps> = ({
  program,
  theme,
  onViewDetails,
  interactive = true,
  isCenter = true,
  className = '',
}) => {
  const effectiveStatus = getProgramEffectiveStatus(program);
  const IconComponent = getDecorativeIcon(program);
  const dateFormatted = formatShowcaseDate(program.date);
  const categoryText = (
    program.subWingName ||
    program.category ||
    'Academic Event'
  ).toUpperCase();

  return (
    <div
      onClick={() => {
        if (interactive && onViewDetails) {
          onViewDetails(program.id);
        }
      }}
      style={{ aspectRatio: '16 / 9' }}
      className={`relative w-full h-full aspect-video rounded-2xl overflow-hidden select-none flex flex-col justify-between p-3 sm:p-4.5 lg:p-5 transition-all duration-300 ${
        interactive ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Rich Backdrop Gradient (using theme with deep navy/royal/amber palettes) */}
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient || 'from-[#0f1f4b] via-[#1e3a8a] to-[#1d4ed8]'}`} />

      {/* Subtle Decorative Star/Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.14] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />

      {/* Ambient Radial Lighting Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-45 mix-blend-screen"
        style={{
          background: `radial-gradient(ellipse at 50% 35%, ${theme.glow || 'rgba(59,130,246,0.35)'} 0%, transparent 75%)`,
        }}
      />

      {/* TOP ROW: Date Badge + Status Badge */}
      <div className="relative z-10 flex items-center justify-between gap-2 w-full flex-wrap">


        {/* Colour-Coded Status Badge:
            - Happening Today: warm amber (#f59e0b / amber-400)
            - Upcoming: vibrant royal blue
            - Completed: elegant slate
        */}
        <div className="flex items-center gap-1.5 shrink-0">
          {effectiveStatus === 'ongoing' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-amber-400 text-amber-950 border border-amber-300 text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-sm ring-1 ring-amber-400/40">
              <span className="w-2 h-2 rounded-full bg-amber-950 animate-pulse" />
              Happening Today
            </span>
          ) : effectiveStatus === 'completed' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-slate-700/95 text-slate-100 border border-slate-500/80 text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-sm">
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              Completed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-blue-600 text-white border border-blue-400/80 text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-sm ring-1 ring-blue-400/30">
              <span className="w-2 h-2 rounded-full bg-sky-200" />
              Upcoming
            </span>
          )}

          {program.media && program.media.length > 0 && (
            <span className="px-2 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-amber-300 text-[10px] font-bold flex items-center gap-1">
              <Camera className="w-3 h-3" />
              <span>{program.media.length}</span>
            </span>
          )}
        </div>
      </div>

      {/* CENTER ROW: Decorative Icon + Program Title + Category */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center px-2 py-2">
        {/* Translucent Frosted Glass Circle Icon */}
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/15 backdrop-blur-xs border border-white/25 flex items-center justify-center text-white mb-2.5 shadow-sm group-hover:scale-110 transition-transform">
          <IconComponent className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white" />
        </div>

        {/* Large Bold Uppercase Program Title */}
        <h3 className="text-base sm:text-xl md:text-2xl font-black uppercase tracking-tight text-white leading-tight line-clamp-2 px-2 drop-shadow-md font-heading">
          {program.name}
        </h3>

        {/* Category Pill + Venue/Time */}
        <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-white/15 text-white/90 backdrop-blur-xs border border-white/20">
            {categoryText}
          </span>
          {program.place && (
            <span className="text-[11px] sm:text-xs text-white/80 font-medium truncate max-w-[200px]">
              • {program.place}
            </span>
          )}
        </div>
      </div>


    </div>
  );
};

export const UpcomingProgramsCarousel: React.FC<UpcomingProgramsCarouselProps> = ({
  programs,
  onViewDetails,
  onOpenAddProgram,
}) => {
  // Filter and sort programs:
  // 1. Ongoing (Happening Today) first
  // 2. Upcoming (sorted nearest date ascending) next
  // 3. Completed (sorted recent date descending) next
  // Ensures all three status badges appear accurately with real dates
  const showcasePrograms = useMemo(() => {
    const ongoing: Program[] = [];
    const upcoming: Program[] = [];
    const completed: Program[] = [];

    programs.forEach((p) => {
      const derived = getProgramEffectiveStatus(p);
      if (derived === 'ongoing') ongoing.push(p);
      else if (derived === 'upcoming') upcoming.push(p);
    });

    ongoing.sort((a, b) => (a.date ? new Date(a.date).getTime() : 0) - (b.date ? new Date(b.date).getTime() : 0));
    upcoming.sort((a, b) => (a.date ? new Date(a.date).getTime() : 0) - (b.date ? new Date(b.date).getTime() : 0));

    // Combine all
    return [...ongoing, ...upcoming];
  }, [programs]);

  const programThemes = useMemo(() => {
    return getThemesForProgramList(showcasePrograms);
  }, [showcasePrograms]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [slidingDirection, setSlidingDirection] = useState<'next' | 'prev' | null>(null);

  const touchStartXRef = useRef<number | null>(null);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAnimatingRef = useRef(false);

  // Desktop container reference
  const desktopContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1000);

  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });

  const totalSlides = showcasePrograms.length;

  // Check prefers-reduced-motion
  const prefersReducedMotion = useRef(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }, []);

  // Window resize listener
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Measure desktop container
  useEffect(() => {
    if (!desktopContainerRef.current) return;
    const updateWidth = () => {
      if (desktopContainerRef.current) {
        setContainerWidth(desktopContainerRef.current.clientWidth);
      }
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(desktopContainerRef.current);
    return () => ro.disconnect();
  }, [isDesktop]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    };
  }, []);

  // Reset index if out of bounds
  useEffect(() => {
    if (currentIndex >= totalSlides && totalSlides > 0) {
      setCurrentIndex(0);
    }
  }, [totalSlides, currentIndex]);

  const pauseTemporarily = useCallback((durationMs: number = 2500) => {
    setIsPaused(true);
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
    }
    resumeTimerRef.current = setTimeout(() => {
      setIsPaused(false);
      resumeTimerRef.current = null;
    }, durationMs);
  }, []);

  // Desktop smooth sliding navigation
  const handleNext = useCallback(() => {
    if (isAnimatingRef.current || totalSlides <= 1) return;
    isAnimatingRef.current = true;
    setSlidingDirection('next');

    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    animationTimeoutRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
      setSlidingDirection(null);
      requestAnimationFrame(() => {
        isAnimatingRef.current = false;
      });
    }, 300);
  }, [totalSlides]);

  const handlePrev = useCallback(() => {
    if (isAnimatingRef.current || totalSlides <= 1) return;
    isAnimatingRef.current = true;
    setSlidingDirection('prev');

    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    animationTimeoutRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
      setSlidingDirection(null);
      requestAnimationFrame(() => {
        isAnimatingRef.current = false;
      });
    }, 300);
  }, [totalSlides]);

  // CRITICAL REQUIREMENT 2:
  // Strict preservation of existing auto-scroll behavior: 900ms desktop, 1200ms mobile
  useEffect(() => {
    if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }

    if (totalSlides <= 1 || isPaused || prefersReducedMotion.current) {
      return;
    }

    const intervalDuration = isDesktop ? 900 : 1200;

    autoplayTimerRef.current = setInterval(() => {
      if (isDesktop) {
        handleNext();
      } else {
        setCurrentIndex((prev) => (prev + 1) % totalSlides);
      }
    }, intervalDuration);

    return () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
        autoplayTimerRef.current = null;
      }
    };
  }, [totalSlides, isPaused, isDesktop, handleNext]);

  // Mobile touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartXRef.current;
    if (Math.abs(diffX) > 40) {
      if (diffX > 0) {
        setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
      } else {
        setCurrentIndex((prev) => (prev + 1) % totalSlides);
      }
    }
    touchStartXRef.current = null;
    pauseTemporarily(2000);
  };

  // Desktop drag handlers
  const handleDesktopMouseDown = (e: React.MouseEvent) => {
    touchStartXRef.current = e.clientX;
    setIsPaused(true);
  };

  const handleDesktopMouseUp = (e: React.MouseEvent) => {
    if (touchStartXRef.current === null) return;
    const diffX = e.clientX - touchStartXRef.current;
    if (Math.abs(diffX) > 45) {
      if (diffX > 0) {
        handlePrev();
      } else {
        handleNext();
      }
    }
    touchStartXRef.current = null;
    pauseTemporarily(2500);
  };

  // If there are 0 programs, render an inviting showcase placeholder card
  if (totalSlides === 0) {
    return (
      <section className="w-full bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs text-center">
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-[#1e3a8a] flex items-center justify-center mx-auto shadow-xs">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base sm:text-lg font-bold font-heading text-slate-900">
            No Programs Scheduled
          </h3>
          <p className="text-xs sm:text-sm text-slate-500">
            Add events and activities to showcase them live on the executive dashboard carousel.
          </p>
          {onOpenAddProgram && (
            <button
              type="button"
              onClick={onOpenAddProgram}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-colors cursor-pointer shadow-sm mt-1"
            >
              <span>+ Add First Program</span>
            </button>
          )}
        </div>
      </section>
    );
  }

  const currentProgram = showcasePrograms[currentIndex] || showcasePrograms[0];

  // Desktop Dimensions: 16:9 Aspect Ratio (1280 x 720 proportions)
  const gap = 24;
  const availableWidth = Math.max(700, containerWidth - 48);
  const cardWidth = Math.min(520, Math.max(340, Math.floor((availableWidth - 2 * gap) / 2.6)));
  const cardHeight = Math.round((cardWidth * 9) / 16);
  const shiftX = cardWidth + gap;
  const stageHeight = Math.round(cardHeight * 1.1 + 32);

  const desktopOffsets = [-2, -1, 0, 1, 2];

  const trackTransform =
    slidingDirection === 'next'
      ? `translateX(-${shiftX}px)`
      : slidingDirection === 'prev'
      ? `translateX(${shiftX}px)`
      : 'translateX(0px)';

  const trackTransition = slidingDirection
    ? 'transform 300ms cubic-bezier(0.25, 1, 0.5, 1)'
    : 'none';

  return (
    <section className="w-full space-y-3" data-purpose="hero-programs-showcase">


      {/* ============================================================== */}
      {/* 1. MOBILE VIEW (Screens < 1024px)                             */}
      {/* ============================================================== */}
      <div className="block lg:hidden">
        <div
          className="relative w-full group select-none transition-all duration-300"
          onMouseEnter={() => {
            if (resumeTimerRef.current) {
              clearTimeout(resumeTimerRef.current);
              resumeTimerRef.current = null;
            }
            setIsPaused(true);
          }}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Card Container - Strict 16:9 Aspect Ratio (1280 x 720) */}
          <div
            style={{ aspectRatio: '16 / 9' }}
            className="w-full aspect-video rounded-2xl shadow-md overflow-hidden transition-all duration-300 ease-in-out"
          >
            <ShowcaseCard
              program={currentProgram}
              theme={programThemes[currentIndex]}
              onViewDetails={onViewDetails}
              interactive={true}
              isCenter={true}
            />
          </div>

          {/* Mobile Left & Right Arrows */}
          {totalSlides > 1 && null}

          {/* Mobile Pagination Indicators */}
          {totalSlides > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-3">
              {showcasePrograms.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(idx);
                    pauseTemporarily(2500);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    currentIndex === idx
                      ? 'w-6 bg-blue-600 shadow-xs'
                      : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. DESKTOP CINEMATIC 3-POSTER HERO SHOWCASE (Screens >= 1024px) */}
      {/* ============================================================== */}
      <div
        ref={desktopContainerRef}
        className="hidden lg:block select-none relative w-full"
        onMouseEnter={() => {
          if (resumeTimerRef.current) {
            clearTimeout(resumeTimerRef.current);
            resumeTimerRef.current = null;
          }
          setIsPaused(true);
        }}
        onMouseLeave={() => setIsPaused(false)}
        onMouseDown={handleDesktopMouseDown}
        onMouseUp={handleDesktopMouseUp}
      >
        {totalSlides === 1 ? (
          /* Single slide on desktop - 16:9 YouTube aspect ratio */
          <div className="flex justify-center items-center py-4">
            <div
              style={{ width: `${Math.min(640, cardWidth * 1.25)}px`, height: `${Math.round((Math.min(640, cardWidth * 1.25) * 9) / 16)}px`, aspectRatio: '16 / 9' }}
              className="relative aspect-video max-w-2xl w-full"
            >
              <div
                className="absolute -inset-3 rounded-3xl -z-10 pointer-events-none transition-all duration-500"
                style={{
                  background: programThemes[0]?.glow || 'rgba(29,78,216,0.35)',
                  filter: 'blur(26px)',
                  opacity: 0.5,
                }}
              />
              <div
                style={{ aspectRatio: '16 / 9' }}
                className="w-full h-full aspect-video rounded-2xl shadow-[0_20px_45px_-12px_rgba(15,31,75,0.4)] ring-1 ring-white/25 overflow-hidden"
              >
                <ShowcaseCard
                  program={showcasePrograms[0]}
                  theme={programThemes[0]}
                  onViewDetails={onViewDetails}
                  interactive={true}
                  isCenter={true}
                />
              </div>
            </div>
          </div>
        ) : (
          /* 3-Poster Horizontal Stage - 16:9 Aspect Ratio */
          <div style={{ height: `${stageHeight}px` }} className="relative w-full overflow-hidden py-3">
            {/* Ambient Radial Backlight for Center Poster */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[300px] rounded-full pointer-events-none -z-10 transition-colors duration-300"
              style={{
                background: `radial-gradient(ellipse at center, ${
                  programThemes[currentIndex]?.glow || 'rgba(29,78,216,0.35)'
                } 0%, transparent 70%)`,
                filter: 'blur(42px)',
                opacity: 0.55,
              }}
            />

            {/* Sliding Track */}
            <div
              style={{
                transform: trackTransform,
                transition: trackTransition,
              }}
              className="absolute inset-0 w-full h-full will-change-transform"
            >
              {desktopOffsets.map((off) => {
                const slideIdx = getSlideIndex(off, currentIndex, totalSlides);
                const prog = showcasePrograms[slideIdx];
                const theme = programThemes[slideIdx];

                let effectiveOff = off;
                if (slidingDirection === 'next') {
                  effectiveOff = off - 1;
                } else if (slidingDirection === 'prev') {
                  effectiveOff = off + 1;
                }

                const isCenter = effectiveOff === 0;
                const isSide = effectiveOff === -1 || effectiveOff === 1;

                const baseLeft = containerWidth / 2 - cardWidth / 2 + off * shiftX;

                let cardScale = 0.88;
                let cardOpacity = 0.55;
                let cardZIndex = 10;
                let cardFilter = 'brightness(0.92) contrast(0.95)';
                let cardPointerEvents: 'auto' | 'none' = 'auto';

                if (isCenter) {
                  cardScale = 1.04;
                  cardOpacity = 1;
                  cardZIndex = 25;
                  cardFilter = 'none';
                } else if (isSide) {
                  cardScale = 0.88;
                  cardOpacity = 0.55;
                  cardZIndex = 10;
                  cardFilter = 'brightness(0.92) contrast(0.95)';
                } else {
                  cardScale = 0.8;
                  cardOpacity = 0;
                  cardZIndex = 0;
                  cardPointerEvents = 'none';
                }

                return (
                  <div
                    key={`slot-${off}-${prog.id}`}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: `${baseLeft}px`,
                      width: `${cardWidth}px`,
                      height: `${cardHeight}px`,
                      aspectRatio: '16 / 9',
                      transform: `scale(${cardScale})`,
                      opacity: cardOpacity,
                      zIndex: cardZIndex,
                      filter: cardFilter,
                      pointerEvents: cardPointerEvents,
                      transition:
                        'transform 300ms cubic-bezier(0.25, 1, 0.5, 1), opacity 300ms ease, filter 300ms ease',
                    }}
                    className={`transform-gpu ${
                      isCenter
                        ? 'cursor-pointer'
                        : isSide
                        ? 'cursor-pointer hover:opacity-85 transition-opacity'
                        : ''
                    }`}
                    onClick={() => {
                      if (isAnimatingRef.current) return;
                      if (off === 0) {
                        onViewDetails(prog.id);
                      } else if (off === -1) {
                        handlePrev();
                        pauseTemporarily(3000);
                      } else if (off === 1) {
                        handleNext();
                        pauseTemporarily(3000);
                      }
                    }}
                    title={
                      isCenter
                        ? `View details: ${prog.name}`
                        : off === -1
                        ? `Previous: ${prog.name} (Click to focus)`
                        : `Next: ${prog.name} (Click to focus)`
                    }
                  >
                    {/* Center Poster Backlight Glow */}
                    {isCenter && (
                      <div
                        className="absolute -inset-3.5 rounded-3xl -z-10 pointer-events-none transition-all duration-300"
                        style={{
                          background: theme?.glow || 'rgba(29,78,216,0.35)',
                          filter: 'blur(24px)',
                          opacity: 0.5,
                        }}
                      />
                    )}

                    {/* Program Card Container */}
                    <div
                      style={{ aspectRatio: '16 / 9' }}
                      className={`w-full h-full aspect-video rounded-2xl overflow-hidden transition-shadow duration-300 ${
                        isCenter
                          ? 'shadow-[0_20px_45px_-12px_rgba(15,31,75,0.45)] ring-1 ring-white/30'
                          : 'shadow-md'
                      }`}
                    >
                      <ShowcaseCard
                        program={prog}
                        theme={theme}
                        onViewDetails={isCenter ? onViewDetails : undefined}
                        interactive={isCenter}
                        isCenter={isCenter}
                        className="!h-full w-full"
                      />

                      {/* Subtle darkening veil over side cards */}
                      {!isCenter && (
                        <div className="absolute inset-0 bg-[#0f1f4b]/25 hover:bg-[#0f1f4b]/10 rounded-2xl transition-colors pointer-events-none" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* Desktop Progress Dots Indicator */}
        {totalSlides > 1 && (
          <div className="flex items-center justify-center gap-2 pt-3">
            {showcasePrograms.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (idx === currentIndex || isAnimatingRef.current) return;
                  if (idx === (currentIndex + 1) % totalSlides) {
                    handleNext();
                  } else if (idx === (currentIndex - 1 + totalSlides) % totalSlides) {
                    handlePrev();
                  } else {
                    setCurrentIndex(idx);
                  }
                  pauseTemporarily(3000);
                }}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  currentIndex === idx
                    ? 'w-9 bg-blue-600 shadow-xs'
                    : 'w-2.5 bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
                title={p.name}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
