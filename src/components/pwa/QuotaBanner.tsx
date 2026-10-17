import React, { useState, useEffect } from 'react';
import { Database, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const QuotaBanner: React.FC = () => {
  let isQuotaExceeded = false;
  let setIsQuotaExceeded: ((val: boolean) => void) | undefined;
  try {
    const app = useApp();
    isQuotaExceeded = Boolean(app?.isQuotaExceeded);
    setIsQuotaExceeded = app?.setIsQuotaExceeded;
  } catch {
    // Gracefully ignore if used outside AppProvider (e.g. public portal routes)
    return null;
  }
  const [dismissed, setDismissed] = useState(false);

  // When quota state recovers to false, reset dismissed so banner can notify again if quota is exceeded in the future
  useEffect(() => {
    if (!isQuotaExceeded) {
      setDismissed(false);
    }
  }, [isQuotaExceeded]);

  if (!isQuotaExceeded || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    if (setIsQuotaExceeded) {
      setIsQuotaExceeded(false);
    }
    try {
      window.dispatchEvent(new CustomEvent('firestore-quota-reset'));
    } catch {}
  };

  return (
    <div 
      id="firestore-quota-warning-banner"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto"
    >
      <div className="flex items-start gap-3 bg-amber-950/95 text-white px-4 py-3 rounded-2xl shadow-xl border border-amber-700/60 backdrop-blur-md">
        <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl shrink-0 mt-0.5">
          <Database className="w-4 h-4 animate-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
            <span>Cloud Database Limit Reached</span>
          </p>
          <p className="text-[11px] text-amber-300/85 mt-0.5 leading-relaxed">
            Cloud database read limit reached. Some data may be temporarily unavailable. Please try again after the quota resets.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-amber-900/40 text-amber-400 hover:text-white rounded-lg transition-colors shrink-0"
          aria-label="Dismiss message"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
