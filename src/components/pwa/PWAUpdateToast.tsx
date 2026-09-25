import React, { useEffect, useState } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const PWAUpdateToast: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      if (r) {
        // Check for updates every 60 seconds
        setInterval(() => {
          r.update().catch(() => {});
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [localVersion, setLocalVersion] = useState<string | null>(null);
  const [showVersionToast, setShowVersionToast] = useState(false);

  // Check version.json periodically to detect Vercel redeploys immediately
  useEffect(() => {
    let isMounted = true;
    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.version) return;

        const storedVersion = localStorage.getItem('munazzam_app_version');
        if (!storedVersion) {
          localStorage.setItem('munazzam_app_version', data.version);
          if (isMounted) setLocalVersion(data.version);
        } else if (storedVersion !== data.version) {
          if (isMounted) {
            setRemoteVersion(data.version);
            setShowVersionToast(true);
          }
        }
      } catch {
        // network error / offline, ignore
      }
    };

    checkVersion();
    const interval = setInterval(checkVersion, 60 * 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', checkVersion);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', checkVersion);
    };
  }, []);

  const handleUpdateNow = () => {
    if (remoteVersion) {
      localStorage.setItem('munazzam_app_version', remoteVersion);
    }
    updateServiceWorker(true);
  };

  if (!needRefresh && !showVersionToast) {
    return null;
  }

  return (
    <div 
      id="pwa-update-available-toast"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto"
    >
      <div className="flex items-center justify-between gap-3 bg-emerald-900/95 text-white px-4 py-3.5 rounded-2xl shadow-2xl border border-emerald-600/60 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-xl shrink-0">
            <Sparkles className="w-4 h-4 animate-spin" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-emerald-100">
              New Version Available
            </p>
            <p className="text-[11px] text-emerald-200/80 truncate">
              A fresh update with the latest fixes is ready.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleUpdateNow}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Update Now</span>
          </button>
          <button
            onClick={() => {
              setNeedRefresh(false);
              setShowVersionToast(false);
            }}
            className="p-1.5 hover:bg-emerald-800 text-emerald-300 hover:text-white rounded-lg transition-colors"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
