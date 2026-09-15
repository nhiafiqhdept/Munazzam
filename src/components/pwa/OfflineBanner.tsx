import React from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export const OfflineBanner: React.FC = () => {
  const { isOnline, wasOffline } = useNetworkStatus();

  if (isOnline && !wasOffline) {
    return null;
  }

  if (!isOnline) {
    return (
      <div 
        id="pwa-offline-status-banner"
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto"
      >
        <div className="flex items-center justify-between gap-3 bg-slate-900/95 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700/60 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl shrink-0">
              <WifiOff className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <span>Offline Mode</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                Viewing local cached state. Cloud sync paused.
              </p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors shrink-0"
            title="Retry Connection"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // When connection restored
  return (
    <div 
      id="pwa-online-restored-banner"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto"
    >
      <div className="flex items-center gap-3 bg-emerald-950/95 text-white px-4 py-3 rounded-2xl shadow-xl border border-emerald-700/60 backdrop-blur-md">
        <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
          <Wifi className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-emerald-200">
            Connection Restored
          </p>
          <p className="text-[11px] text-emerald-300/80 truncate">
            Connected to cloud database. Real-time sync active.
          </p>
        </div>
      </div>
    </div>
  );
};
