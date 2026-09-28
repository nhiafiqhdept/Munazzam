import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Program } from '../types';
import { ProgramThumbnail, getThemesForProgramList } from './ProgramCard';

interface UpcomingProgramsCarouselProps {
  programs: Program[];
  onViewDetails: (id: string) => void;
}

function getSlideIndex(offset: number, current: number, total: number): number {
  if (total <= 0) return 0;
  return ((current + offset) % total + total) % total;
}

export const UpcomingProgramsCarousel: React.FC<UpcomingProgramsCarouselProps> = ({
  programs,
  onViewDetails,
}) => {
  // Filter strictly for authoritative saved status 'upcoming'
  const upcomingPrograms = React.useMemo(() => {
    return programs
      .filter((p) => p.status && p.status.trim().toLowerCase() === 'upcoming')
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateA - dateB;
      });
  }, [programs]);

  const programThemes = React.useMemo(() => {
    return getThemesForProgramList(upcomingPrograms);
  }, [upcomingPrograms]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [slidingDirection, setSlidingDirection] = useState<'next' | 'prev' | null>(null);

  const touchStartXRef = useRef<number | null>(null);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAnimatingRef = useRef(false);

  // Measure desktop container width for responsive carousel layout without overflow
  const desktopContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1000);

  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });

  const totalSlides = upcomingPrograms.length;

  // Check prefers-reduced-motion
  const prefersReducedMotion = useRef(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }, []);

  // Track window resize to toggle desktop mode
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Measure desktop container dynamically
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

  // Cleanup all timers on unmount
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

  // Autoplay handler:
  // Strictly preserves 1200ms interval for mobile view, and uses 900ms for desktop view
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

  if (totalSlides === 0) {
    return null;
  }

  const currentProgram = upcomingPrograms[currentIndex] || upcomingPrograms[0];

  // Mobile Touch handlers (strictly unmodified)
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
        // Swipe right -> previous
        setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
      } else {
        // Swipe left -> next
        setCurrentIndex((prev) => (prev + 1) % totalSlides);
      }
    }
    touchStartXRef.current = null;
    pauseTemporarily(2000);
  };

  // Desktop Mouse Drag / Swipe Handlers
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

  // Dimensions calculation for Desktop 3-poster display
  // Ensures 3 posters sit horizontally with center card dominant, without clipping or horizontal overflow
  const gap = 24;
  const availableWidth = Math.max(700, containerWidth - 48);
  const cardWidth = Math.min(440, Math.max(290, Math.floor((availableWidth - 2 * gap) / 2.92)));
  const shiftX = cardWidth + gap;
  const cardHeight = 256;

  // Offsets rendered in desktop sliding track: [-2, -1, 0, 1, 2]
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
    <section className="w-full">
      {/* ============================================================== */}
      {/* 1. MOBILE VIEW (Screens < 1024px)                             */}
      {/* STRICTLY PRESERVED: Design, dimensions, autoplay, swipe untouched*/}
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
          {/* Render ONLY the exact Program Thumbnail with smooth 300ms transition */}
          <div className="w-full transition-all duration-300 ease-in-out transform">
            <ProgramThumbnail
              program={currentProgram}
              onViewDetails={onViewDetails}
              theme={programThemes[currentIndex]}
              positionIndex={currentIndex}
            />
          </div>

          {/* Pagination Indicators (Below Thumbnail) */}
          {totalSlides > 1 && (
            <div className="flex items-center justify-center gap-2 pt-3">
              {upcomingPrograms.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(idx);
                    pauseTemporarily(2500);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    currentIndex === idx
                      ? 'w-6 bg-emerald-600'
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
      {/* 2. DESKTOP CINEMATIC 3-POSTER CAROUSEL (Screens >= 1024px)     */}
      {/* Professional 3-poster display: Center highlighted, sides subdued*/}
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
          /* Single slide on desktop: perfectly centered, highlighted */
          <div className="flex justify-center items-center py-4">
            <div style={{ width: cardWidth, height: cardHeight }} className="relative">
              <div
                className="absolute -inset-2.5 rounded-3xl -z-10 pointer-events-none transition-all duration-500"
                style={{
                  background: programThemes[0]?.glow || 'rgba(16,185,129,0.3)',
                  filter: 'blur(24px)',
                  opacity: 0.45,
                }}
              />
              <ProgramThumbnail
                program={upcomingPrograms[0]}
                onViewDetails={onViewDetails}
                theme={programThemes[0]}
                positionIndex={0}
                className="shadow-[0_20px_45px_-12px_rgba(0,0,0,0.35)] ring-1 ring-white/20"
              />
            </div>
          </div>
        ) : (
          /* 3-Poster Horizontal Stage */
          <div className="relative w-full h-[300px] overflow-hidden py-3">
            {/* Ambient Radial Backlight for Center Poster */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[260px] rounded-full pointer-events-none -z-10 transition-colors duration-300"
              style={{
                background: `radial-gradient(ellipse at center, ${
                  programThemes[currentIndex]?.glow || 'rgba(16,185,129,0.35)'
                } 0%, transparent 70%)`,
                filter: 'blur(40px)',
                opacity: 0.5,
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
                const prog = upcomingPrograms[slideIdx];
                const theme = programThemes[slideIdx];

                // Compute effective target slot during animation for scale and focus transitions
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
                      top: '16px',
                      left: `${baseLeft}px`,
                      width: `${cardWidth}px`,
                      height: `${cardHeight}px`,
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
                        ? 'cursor-pointer hover:opacity-80 transition-opacity'
                        : ''
                    }`}
                    onClick={() => {
                      if (isAnimatingRef.current) return;
                      if (off === 0) {
                        // Click on center poster opens full program details
                        onViewDetails(prog.id);
                      } else if (off === -1) {
                        // Click on left poster smoothly navigates to it
                        handlePrev();
                        pauseTemporarily(3000);
                      } else if (off === 1) {
                        // Click on right poster smoothly navigates to it
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
                    {/* Ambient Glow behind center poster */}
                    {isCenter && (
                      <div
                        className="absolute -inset-3 rounded-3xl -z-10 pointer-events-none transition-all duration-300"
                        style={{
                          background: theme?.glow || 'rgba(16,185,129,0.3)',
                          filter: 'blur(20px)',
                          opacity: 0.45,
                        }}
                      />
                    )}

                    {/* Program Thumbnail Container */}
                    <div
                      className={`w-full h-full rounded-2xl overflow-hidden transition-shadow duration-300 ${
                        isCenter
                          ? 'shadow-[0_20px_45px_-12px_rgba(0,0,0,0.35)] ring-1 ring-white/25'
                          : 'shadow-md'
                      }`}
                    >
                      <ProgramThumbnail
                        program={prog}
                        onViewDetails={isCenter ? onViewDetails : undefined}
                        theme={theme}
                        positionIndex={slideIdx}
                        interactive={isCenter}
                        className="!h-full w-full"
                      />

                      {/* Subtle darkening veil over subdued side posters */}
                      {!isCenter && (
                        <div className="absolute inset-0 bg-slate-950/20 hover:bg-slate-950/5 rounded-2xl transition-colors pointer-events-none" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Floating Sleek Navigation Arrow: Left */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
                pauseTemporarily(3000);
              }}
              disabled={isAnimatingRef.current}
              aria-label="Previous program"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-slate-900/65 hover:bg-slate-900/90 text-white backdrop-blur-md border border-white/20 shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer group"
            >
              <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
            </button>

            {/* Floating Sleek Navigation Arrow: Right */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
                pauseTemporarily(3000);
              }}
              disabled={isAnimatingRef.current}
              aria-label="Next program"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-slate-900/65 hover:bg-slate-900/90 text-white backdrop-blur-md border border-white/20 shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer group"
            >
              <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}

        {/* Desktop Pagination Indicators */}
        {totalSlides > 1 && (
          <div className="flex items-center justify-center gap-2 pt-3">
            {upcomingPrograms.map((p, idx) => (
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
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  currentIndex === idx
                    ? 'w-8 bg-emerald-600 shadow-xs'
                    : 'w-2 bg-slate-300 hover:bg-slate-400'
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

