import React, { useState, useRef, useEffect } from 'react';
import { Bell, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NotificationCenter } from './NotificationCenter';

export const NotificationBell: React.FC = () => {
  const { unreadNotificationCount, isPublicView, setActiveTab } = useApp();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const bellContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click when in desktop popover mode
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellContainerRef.current && !bellContainerRef.current.contains(event.target as Node)) {
        // Only auto-close on desktop clicks outside the container
        if (window.innerWidth >= 640) {
          setIsOpen(false);
        }
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (isPublicView) return null;

  return (
    <div className="relative inline-block" ref={bellContainerRef}>
      {/* Bell Button in Header */}
      <button
        id="header-notification-bell-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all duration-200 flex items-center justify-center cursor-pointer select-none text-xs font-semibold ${
          isOpen
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
            : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border-slate-200 shadow-2xs'
        }`}
        title="Notification Center"
        aria-label="Notification Center"
      >
        <Bell className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'text-emerald-700 scale-110' : ''}`} />

        {/* Unread Badge Counter */}
        {unreadNotificationCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-emerald-700 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs animate-in zoom-in-75">
            {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
          </span>
        )}
      </button>

      {/* Popover / Full Mobile Viewport Overlay */}
      {isOpen && (
        <>
          {/* Mobile Full-Screen Overlay & Sheet (< 640px) */}
          <div className="sm:hidden fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end">
            <div className="w-full max-w-full h-[92vh] bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-200">
              <NotificationCenter
                isModal={true}
                onClose={() => setIsOpen(false)}
                onNavigateToEntity={() => setIsOpen(false)}
              />
              <div className="bg-slate-50 p-3 border-t border-slate-100 flex items-center justify-between text-xs px-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setActiveTab('notifications');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-emerald-800 font-bold hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Open Full Notification Page</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Compact Dropdown (>= 640px) */}
          <div className="hidden sm:block absolute right-0 mt-2 w-[440px] max-w-[calc(100vw-2rem)] bg-white rounded-3xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right">
            <div className="max-h-[580px] flex flex-col">
              <NotificationCenter
                isModal={true}
                onClose={() => setIsOpen(false)}
                onNavigateToEntity={() => setIsOpen(false)}
              />
              <div className="bg-slate-50 p-3 border-t border-slate-100 flex items-center justify-between text-xs px-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setActiveTab('notifications');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-emerald-800 font-bold hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Open Full Notification Center</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
