import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronDown, Check, Globe, X, Clock, FolderArchive, Layers } from 'lucide-react';
import { SP_Competition } from '../../context/PortalContext';
import { formatDate } from '../../utils/helpers';

export interface EvaluationPeriodSelectorProps {
  selectedPeriod: string; // 'active' | 'all' | competitionId
  onSelectPeriod: (periodId: string) => void;
  competitions: SP_Competition[];
  className?: string;
  compact?: boolean;
  label?: string;
  showAllOption?: boolean;
}

export const EvaluationPeriodSelector: React.FC<EvaluationPeriodSelectorProps> = ({
  selectedPeriod,
  onSelectPeriod,
  competitions,
  className = '',
  compact = false,
  label = 'Evaluation Period',
  showAllOption = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Active competition
  const activeCompetition = useMemo(() => {
    return competitions.find((c) => c.status === 'active');
  }, [competitions]);

  // Current selected competition object (if specific ID or active)
  const currentSelectedComp = useMemo(() => {
    if (selectedPeriod === 'all') return null;
    if (selectedPeriod === 'active') return activeCompetition || null;
    return competitions.find((c) => c.id === selectedPeriod) || null;
  }, [competitions, selectedPeriod, activeCompetition]);

  // Derived display name and date range
  const displayInfo = useMemo(() => {
    if (selectedPeriod === 'all') {
      return {
        title: 'All Evaluation Periods',
        subtitle: 'Cumulative / Lifetime data',
        badge: 'All Time',
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
        isActive: false,
      };
    }
    if (selectedPeriod === 'active') {
      if (activeCompetition) {
        const dates = activeCompetition.startDate && activeCompetition.endDate
          ? `${formatDate(activeCompetition.startDate)} – ${formatDate(activeCompetition.endDate)}`
          : activeCompetition.startDate
          ? `Started ${formatDate(activeCompetition.startDate)}`
          : 'Ongoing';
        return {
          title: activeCompetition.name,
          subtitle: dates,
          badge: 'Active Period',
          badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          isActive: true,
        };
      }
      return {
        title: 'Current Period',
        subtitle: 'No period actively marked',
        badge: 'None Active',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
        isActive: false,
      };
    }
    // Specific period
    const comp = competitions.find((c) => c.id === selectedPeriod);
    if (comp) {
      const dates = comp.startDate && comp.endDate
        ? `${formatDate(comp.startDate)} – ${formatDate(comp.endDate)}`
        : comp.startDate
        ? `Started ${formatDate(comp.startDate)}`
        : comp.status === 'completed' ? 'Concluded' : 'Draft';
      
      const isCompActive = comp.status === 'active';
      return {
        title: comp.name,
        subtitle: dates,
        badge: isCompActive ? 'Active' : comp.status === 'completed' ? 'Completed' : 'Draft',
        badgeColor: isCompActive
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : comp.status === 'completed'
          ? 'bg-slate-100 text-slate-700 border-slate-200'
          : 'bg-amber-50 text-amber-800 border-amber-200',
        isActive: isCompActive,
      };
    }
    return {
      title: 'Select Period',
      subtitle: 'Choose evaluation period',
      badge: '',
      badgeColor: '',
      isActive: false,
    };
  }, [selectedPeriod, activeCompetition, competitions]);

  // Click outside listener for desktop dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (periodId: string) => {
    onSelectPeriod(periodId);
    setIsOpen(false);
  };

  // Group competitions for cleaner dropdown
  const otherCompetitions = useMemo(() => {
    return competitions.filter((c) => c.id !== activeCompetition?.id);
  }, [competitions, activeCompetition]);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`} id="evaluation-period-selector-root">
      {/* Trigger Button */}
      <button
        type="button"
        id="evaluation-period-trigger-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Selected Evaluation Period: ${displayInfo.title}`}
        className={`group flex items-center justify-between gap-2.5 bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-emerald-600 rounded-2xl transition-all cursor-pointer shadow-2xs text-left ${
          compact ? 'px-3 py-1.5' : 'px-3.5 py-2'
        } ${isOpen ? 'ring-2 ring-emerald-500/20 border-emerald-600' : ''}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center shrink-0 text-emerald-800">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>

          <div className="min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] sm:text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                {label}
              </span>
              {displayInfo.badge && (
                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md border ${displayInfo.badgeColor}`}>
                  {displayInfo.badge}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-black text-slate-900 truncate leading-tight mt-0.5">
              {displayInfo.title}
            </p>
            {!compact && displayInfo.subtitle && (
              <p className="text-[10px] text-slate-500 font-medium truncate leading-tight">
                {displayInfo.subtitle}
              </p>
            )}
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 group-hover:text-emerald-700 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-700' : ''
          }`}
        />
      </button>

      {/* DESKTOP POPOVER DROPDOWN (hidden on small screens, positioned cleanly below) */}
      {isOpen && (
        <div className="hidden sm:block absolute left-0 top-full mt-2 w-80 md:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold text-slate-800">Select Evaluation Period</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {competitions.length} Available
            </span>
          </div>

          {/* Options List */}
          <div className="p-2 space-y-1 max-h-80 overflow-y-auto overscroll-contain">
            {/* 1. Active Period Option */}
            <button
              type="button"
              onClick={() => handleSelect('active')}
              className={`w-full flex items-start justify-between gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                selectedPeriod === 'active'
                  ? 'bg-emerald-50/80 border border-emerald-200 text-emerald-950'
                  : 'hover:bg-slate-50 border border-transparent text-slate-800'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5 text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black">
                      {activeCompetition ? activeCompetition.name : 'Current Period'}
                    </span>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                    {activeCompetition?.startDate && activeCompetition?.endDate
                      ? `${formatDate(activeCompetition.startDate)} – ${formatDate(activeCompetition.endDate)}`
                      : activeCompetition?.startDate
                      ? `Started ${formatDate(activeCompetition.startDate)}`
                      : 'Default active evaluation cycle'}
                  </p>
                </div>
              </div>

              {selectedPeriod === 'active' && (
                <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-1" />
              )}
            </button>

            {/* 2. All Periods Option */}
            {showAllOption && (
              <button
                type="button"
                onClick={() => handleSelect('all')}
                className={`w-full flex items-start justify-between gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  selectedPeriod === 'all'
                    ? 'bg-emerald-50/80 border border-emerald-200 text-emerald-950'
                    : 'hover:bg-slate-50 border border-transparent text-slate-800'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 text-slate-600">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black">All Evaluation Periods</span>
                    <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                      Show combined data across all historical periods (Lifetime)
                    </p>
                  </div>
                </div>

                {selectedPeriod === 'all' && (
                  <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-1" />
                )}
              </button>
            )}

            {/* 3. Specific / Previous Periods */}
            {otherCompetitions.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  Specific / Previous Periods
                </div>
                <div className="space-y-1 mt-1">
                  {otherCompetitions.map((comp) => {
                    const isSelected = selectedPeriod === comp.id;
                    const isCompleted = comp.status === 'completed';
                    const dates = comp.startDate && comp.endDate
                      ? `${formatDate(comp.startDate)} – ${formatDate(comp.endDate)}`
                      : comp.startDate
                      ? `Started ${formatDate(comp.startDate)}`
                      : comp.status;

                    return (
                      <button
                        key={comp.id}
                        type="button"
                        onClick={() => handleSelect(comp.id)}
                        className={`w-full flex items-start justify-between gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/80 border border-emerald-200 text-emerald-950'
                            : 'hover:bg-slate-50 border border-transparent text-slate-800'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 text-slate-600">
                            {isCompleted ? (
                              <FolderArchive className="w-3.5 h-3.5 text-slate-500" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold truncate">{comp.name}</span>
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${
                                isCompleted
                                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                {isCompleted ? 'Completed' : comp.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                              {dates}
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM SHEET / COMPACT MODAL */}
      {isOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full bg-white rounded-t-3xl border-t border-slate-200 shadow-2xl p-4 space-y-4 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-heading">Select Evaluation Period</h3>
                  <p className="text-[10px] text-slate-500">Filter submissions and points by period</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable list */}
            <div className="space-y-2 overflow-y-auto overscroll-contain flex-1 pr-0.5">
              {/* Active Period */}
              <button
                type="button"
                onClick={() => handleSelect('active')}
                className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all border ${
                  selectedPeriod === 'active'
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                    : 'bg-slate-50/70 hover:bg-slate-100/70 border-slate-200/80 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-800">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black truncate">
                        {activeCompetition ? activeCompetition.name : 'Current Active Period'}
                      </span>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Active
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {activeCompetition?.startDate && activeCompetition?.endDate
                        ? `${formatDate(activeCompetition.startDate)} – ${formatDate(activeCompetition.endDate)}`
                        : 'Currently active evaluation period'}
                    </p>
                  </div>
                </div>

                {selectedPeriod === 'active' && (
                  <Check className="w-4 h-4 text-emerald-700 shrink-0 ml-2" />
                )}
              </button>

              {/* All Periods */}
              {showAllOption && (
                <button
                  type="button"
                  onClick={() => handleSelect('all')}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all border ${
                    selectedPeriod === 'all'
                      ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                      : 'bg-slate-50/70 hover:bg-slate-100/70 border-slate-200/80 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-600">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black truncate">All Evaluation Periods</span>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        Combined lifetime submissions & points
                      </p>
                    </div>
                  </div>

                  {selectedPeriod === 'all' && (
                    <Check className="w-4 h-4 text-emerald-700 shrink-0 ml-2" />
                  )}
                </button>
              )}

              {/* Specific / Previous Periods */}
              {otherCompetitions.length > 0 && (
                <div className="pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1 mb-1.5">
                    Select Specific Period ({otherCompetitions.length})
                  </span>
                  <div className="space-y-1.5">
                    {otherCompetitions.map((comp) => {
                      const isSelected = selectedPeriod === comp.id;
                      const isCompleted = comp.status === 'completed';
                      const dates = comp.startDate && comp.endDate
                        ? `${formatDate(comp.startDate)} – ${formatDate(comp.endDate)}`
                        : comp.status;

                      return (
                        <button
                          key={comp.id}
                          type="button"
                          onClick={() => handleSelect(comp.id)}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all border ${
                            isSelected
                              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                              : 'bg-slate-50/70 hover:bg-slate-100/70 border-slate-200/80 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-600">
                              {isCompleted ? (
                                <FolderArchive className="w-4 h-4" />
                              ) : (
                                <Clock className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold truncate">{comp.name}</span>
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${
                                  isCompleted
                                    ? 'bg-slate-100 text-slate-700 border-slate-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}>
                                  {isCompleted ? 'Completed' : comp.status}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                {dates}
                              </p>
                            </div>
                          </div>

                          {isSelected && (
                            <Check className="w-4 h-4 text-emerald-700 shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Close footer button */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
