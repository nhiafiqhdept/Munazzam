import React, { useState, useEffect } from 'react';
import { Bell, Sparkles, Check, X, Shield } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { requestNotificationPermission } from '../../services/notificationService';

export const NotificationPermissionBanner: React.FC = () => {
  const { user, currentOrg, isPublicView } = useApp();
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isPublicView || typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    // Check if permission is default (neither granted nor denied) and not previously dismissed in this session
    const dismissed = localStorage.getItem('munazzam_notif_dismissed');
    if (Notification.permission === 'default' && !dismissed) {
      // Delay showing the banner slightly so the app loads smoothly first
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isPublicView]);

  if (!isVisible || isPublicView) return null;

  const handleEnable = async () => {
    setIsActivating(true);
    setStatusMessage(null);

    const result = await requestNotificationPermission(
      user?.id || 'anonymous',
      currentOrg?.id || 'main'
    );

    setIsActivating(false);
    if (result.success) {
      setStatusMessage('Notifications enabled successfully!');
      setTimeout(() => {
        setIsVisible(false);
      }, 1800);
    } else {
      localStorage.setItem('munazzam_notif_dismissed', 'true');
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('munazzam_notif_dismissed', 'true');
    setIsVisible(false);
  };

  return (
    <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-xl border border-emerald-500/30 mb-5 relative overflow-hidden animate-in slide-in-from-top-4 duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30 shrink-0 mt-0.5 sm:mt-0">
            <Bell className="w-5 h-5 text-emerald-400 animate-bounce" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-white font-heading">
                Enable Munazzam Push Notifications
              </h4>
              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-semibold">
                Instant Alerts
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              Stay informed about program approvals, college permissions, Sub-Wing submissions, and important updates even when the app is in the background.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end pt-1 sm:pt-0">
          <button
            type="button"
            onClick={handleDismiss}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 font-semibold rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            Not now
          </button>

          <button
            type="button"
            onClick={handleEnable}
            disabled={isActivating}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            {isActivating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span>Enabling...</span>
              </>
            ) : statusMessage ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{statusMessage}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span>Enable Notifications</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
