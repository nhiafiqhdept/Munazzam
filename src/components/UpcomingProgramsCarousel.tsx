import React, { useState, useEffect, useRef } from 'react';
import { Program } from '../types';
import { ProgramThumbnail, getThemesForProgramList } from './ProgramCard';

interface UpcomingProgramsCarouselProps {
  programs: Program[];
  onViewDetails: (id: string) => void;
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
  const touchStartXRef = useRef<number | null>(null);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const totalSlides = upcomingPrograms.length;

  // Check prefers-reduced-motion
  const prefersReducedMotion = useRef(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }, []);

  // Reset index if out of bounds
  useEffect(() => {
    if (currentIndex >= totalSlides && totalSlides > 0) {
      setCurrentIndex(0);
    }
  }, [totalSlides, currentIndex]);

  // Autoplay handler (1.5s interval if 2+ slides and no reduced motion)
  useEffect(() => {
    if (totalSlides <= 1 || isPaused || prefersReducedMotion.current) {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
      return;
    }

    autoplayTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, 1500);

    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, [totalSlides, isPaused]);

  if (totalSlides === 0) {
    return null;
  }

  const currentProgram = upcomingPrograms[currentIndex] || upcomingPrograms[0];

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
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
    // Resume autoplay after brief pause
    setTimeout(() => setIsPaused(false), 2000);
  };

  return (
    <section className="w-full">
      <div
        className="relative w-full group select-none transition-all duration-300"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Render ONLY the exact Program Thumbnail */}
        <div className="w-full transition-all duration-300 transform">
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
                  setIsPaused(true);
                  setTimeout(() => setIsPaused(false), 3000);
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
    </section>
  );
};
