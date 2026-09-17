import React, { useState } from 'react';
import { Database, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const QuotaBanner: React.FC = () => {
  const { isQuotaExceeded } = useApp();
  const [dismissed, setDismissed] = useState(false);

  if (!isQuotaExceeded || dismissed) {
    return null;
  }

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
            <span>High Load Mode Active</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          </p>
          <p className="text-[11px] text-amber-300/85 mt-0.5 leading-relaxed">
            The cloud database is experiencing extremely high traffic. Your portal is running in **Optimistic Local-First Mode**. All additions, edits, and details will update instantly on your device and will sync with the cloud as soon as connections clear.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-amber-900/40 text-amber-400 hover:text-white rounded-lg transition-colors shrink-0"
          aria-label="Dismiss message"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
