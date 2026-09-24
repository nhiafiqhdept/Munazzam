import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Landmark,
  FileText,
  BookOpen,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ActiveTab } from '../../types';

export const TreasuryNav: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const treasuryTabs: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'treasury-dashboard', label: 'Treasury Dashboard', icon: LayoutDashboard },
    { id: 'treasury-accounts', label: 'Accounts', icon: Wallet },
    { id: 'treasury-income', label: 'Income', icon: ArrowDownLeft },
    { id: 'treasury-expenses', label: 'Expenses', icon: ArrowUpRight },
    { id: 'treasury-loans', label: 'Loans (Borrowed/Lent)', icon: Landmark },
    { id: 'treasury-transfers', label: 'Account Transfers', icon: ArrowLeftRight },
    { id: 'treasury-events', label: 'Events', icon: Calendar },
    { id: 'treasury-ledger', label: 'Transactions Ledger', icon: FileText },
    { id: 'treasury-cashbook', label: 'Cash & Bank Books', icon: BookOpen },
    { id: 'treasury-reports', label: 'Financial Reports', icon: BarChart3 },
  ];

  // Check scroll position to toggle scroll arrows and fade cues
  const updateScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollContainerRef.current;
    if (!el) return;

    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    // Convert vertical mouse-wheel events into horizontal scrolling when hovering
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
      el.removeEventListener('wheel', handleWheel);
    };
  }, [updateScrollState]);

  // Ensure active tab is automatically scrolled into view
  useEffect(() => {
    const activeEl = tabButtonRefs.current[activeTab];
    if (activeEl && scrollContainerRef.current) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        inline: 'nearest',
        block: 'nearest',
      });
      // Re-evaluate scroll indicators after animation
      setTimeout(updateScrollState, 350);
    }
  }, [activeTab, updateScrollState]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = Math.max(260, Math.floor(el.clientWidth * 0.6));
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleTabClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-white border-b border-slate-200/90 shadow-2xs mb-2 sm:mb-6 no-print sticky top-16 sm:top-20 lg:top-24 z-20 backdrop-blur-md bg-white/95">
      <div className="max-w-7xl lg:max-w-[1400px] mx-auto px-2 sm:px-6 lg:px-8">
        <div className="relative flex items-center py-2 sm:py-2.5">
          {/* Scroll Left Button */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => handleScroll('left')}
              aria-label="Scroll treasury navigation left"
              className="absolute left-0 z-20 w-8 h-8 rounded-full bg-white/95 text-slate-700 shadow-md border border-slate-200/90 flex items-center justify-center hover:bg-slate-50 hover:text-emerald-700 active:scale-95 transition-all cursor-pointer -translate-x-1"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Left Gradient Fade Mask */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white via-white/80 to-transparent pointer-events-none z-10 transition-opacity duration-200 ${
              canScrollLeft ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Scrollable Navigation Track */}
          <div
            ref={scrollContainerRef}
            className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 px-1 custom-scrollbar w-full scroll-smooth"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {treasuryTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(node) => {
                    tabButtonRefs.current[tab.id] = node;
                  }}
                  type="button"
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer select-none active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/70 hover:border-slate-300'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                      isActive ? 'text-emerald-200' : 'text-slate-500'
                    }`}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
            {/* End spacer to ensure final item has generous breathing room and is never clipped */}
            <div className="w-6 shrink-0 h-1 pointer-events-none" aria-hidden="true" />
          </div>

          {/* Right Gradient Fade Mask */}
          <div
            className={`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-10 transition-opacity duration-200 ${
              canScrollRight ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Scroll Right Button */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => handleScroll('right')}
              aria-label="Scroll treasury navigation right"
              className="absolute right-0 z-20 w-8 h-8 rounded-full bg-white/95 text-slate-700 shadow-md border border-slate-200/90 flex items-center justify-center hover:bg-slate-50 hover:text-emerald-700 active:scale-95 transition-all cursor-pointer translate-x-1"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

