import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  CheckCheck,
  Trash2,
  Calendar,
  FileCheck,
  Layers,
  Award,
  Users,
  Landmark,
  Settings,
  Clock,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Shield,
  X,
  ArrowLeft,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppNotification, NotificationCategory } from '../../types';
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '../../services/notificationService';

interface NotificationCenterProps {
  onNavigateToEntity?: (notification: AppNotification) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onNavigateToEntity,
  onClose,
  isModal = false,
}) => {
  const {
    notifications,
    unreadNotificationCount,
    currentOrg,
    user,
    setActiveTab,
    setSelectedProgramId,
  } = useApp();

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [showOnlyUnread, setShowOnlyUnread] = useState<boolean>(false);
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);

  // Ensure document body overflow is never stuck or locked
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }, []);

  // Format relative timestamp
  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  // Helper to get matching icon per category
  const getCategoryIcon = (category?: NotificationCategory) => {
    switch (category) {
      case 'programs':
        return <Calendar className="w-4 h-4 text-emerald-600" />;
      case 'permissions':
        return <FileCheck className="w-4 h-4 text-blue-600" />;
      case 'subwings':
        return <Layers className="w-4 h-4 text-purple-600" />;
      case 'suborgs':
      case 'achievements':
        return <Award className="w-4 h-4 text-amber-600" />;
      case 'organizers':
        return <Users className="w-4 h-4 text-teal-600" />;
      case 'treasury':
        return <Landmark className="w-4 h-4 text-emerald-700" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  const getCategoryBadgeClass = (category?: NotificationCategory) => {
    switch (category) {
      case 'programs':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
      case 'permissions':
        return 'bg-blue-50 text-blue-800 border-blue-200/80';
      case 'subwings':
        return 'bg-purple-50 text-purple-800 border-purple-200/80';
      case 'suborgs':
      case 'achievements':
        return 'bg-amber-50 text-amber-800 border-amber-200/80';
      case 'organizers':
        return 'bg-teal-50 text-teal-800 border-teal-200/80';
      case 'treasury':
        return 'bg-emerald-50 text-emerald-900 border-emerald-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Filtering
  const filteredNotifications = notifications.filter((item) => {
    if (showOnlyUnread && item.isRead) return false;
    if (activeCategoryFilter !== 'all' && item.category !== activeCategoryFilter) {
      return false;
    }
    return true;
  });

  const handleMarkAllRead = async () => {
    if (!currentOrg?.id || isMarkingAll) return;
    setIsMarkingAll(true);
    await markAllNotificationsAsRead(currentOrg.id, user?.id);
    setIsMarkingAll(false);
  };

  const handleItemClick = (notification: AppNotification) => {
    if (!notification.isRead) {
      markNotificationAsRead(notification.id);
    }

    if (onNavigateToEntity) {
      onNavigateToEntity(notification);
      return;
    }

    // Direct deep link routing
    if (notification.route) {
      setActiveTab(notification.route as any);
    } else if (notification.entityType === 'program' && notification.entityId) {
      setSelectedProgramId(notification.entityId);
      setActiveTab('programs');
    } else if (notification.category === 'programs' || notification.category === 'permissions') {
      setActiveTab('programs');
    } else if (notification.category === 'organizers') {
      setActiveTab('organizers');
    } else if (notification.category === 'treasury') {
      setActiveTab('treasury-dashboard');
    } else if (notification.category === 'achievements' || notification.category === 'suborgs') {
      setActiveTab('student-points');
    } else if (notification.category === 'subwings') {
      setActiveTab('programs');
    }

    if (onClose) {
      onClose();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'programs', label: 'Programs' },
    { id: 'permissions', label: 'Permissions' },
    { id: 'subwings', label: 'Sub-Wings' },
    { id: 'achievements', label: 'Achievements' },
    { id: 'organizers', label: 'Organizers' },
    { id: 'treasury', label: 'Treasury' },
  ];

  return (
    <div
      className={`w-full max-w-full box-border flex flex-col ${
        isModal ? 'flex-1 min-h-0 bg-white overflow-hidden' : 'bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6'
      }`}
    >
      {/* Institutional Header */}
      <div className={`shrink-0 border-b border-slate-100 ${isModal ? 'p-4 bg-slate-50/80 backdrop-blur-xs' : 'pb-4 mb-4'}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {isModal && (
              <button
                onClick={onClose}
                className="p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                title="Back / Close"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5 sm:hidden" />
                <X className="w-5 h-5 hidden sm:block" />
              </button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold font-heading text-slate-900 tracking-tight">
                  Notification Center
                </h3>
                {unreadNotificationCount > 0 && (
                  <span className="px-2 py-0.5 bg-emerald-700 text-white rounded-full text-[11px] font-bold">
                    {unreadNotificationCount} unread
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate hidden xs:block">
                Activity stream for {currentOrg?.name || 'Munazzam'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {unreadNotificationCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
                className="px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-4 h-4 text-emerald-700" />
                <span className="hidden xs:inline">Mark all read</span>
              </button>
            )}
            {!isModal && (
              <button
                onClick={() => setActiveTab('settings')}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Notification Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-3 flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 flex-1">
            {categories.map((cat) => {
              const active = activeCategoryFilter === cat.id;
              const count = cat.id === 'all'
                ? notifications.length
                : notifications.filter((n) => n.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryFilter(cat.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  <span>{cat.label}</span>
                  {count > 0 && (
                    <span className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${active ? 'bg-slate-700 text-slate-100' : 'bg-slate-200 text-slate-700'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowOnlyUnread(!showOnlyUnread)}
            className={`px-2.5 py-1 text-xs font-medium rounded-xl border transition-all shrink-0 cursor-pointer ${
              showOnlyUnread
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold'
                : 'text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
          >
            Unread
          </button>
        </div>
      </div>

      {/* Notifications Scrollable Stream */}
      <div
        className={`flex-1 min-h-0 overflow-y-auto scrollbar-thin ${isModal ? 'p-3 sm:p-4 space-y-2.5 max-h-[58dvh] sm:max-h-[380px]' : 'space-y-3 max-h-[600px] p-1'}`}
        style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
      >
        {filteredNotifications.length === 0 ? (
          <div className="py-12 sm:py-16 text-center space-y-3 px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Bell className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div className="space-y-1 max-w-xs mx-auto">
              <h4 className="text-sm font-bold text-slate-800">No notifications yet</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Real-time activity regarding programs, permissions, and leadership will appear here automatically.
              </p>
            </div>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const isUnread = !item.isRead;

            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`group relative p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isUnread
                    ? 'bg-emerald-50/40 hover:bg-emerald-50/70 border-emerald-300/80 shadow-2xs'
                    : 'bg-white hover:bg-slate-50/90 border-slate-200 shadow-2xs'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Category Icon */}
                  <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs shrink-0 mt-0.5">
                    {getCategoryIcon(item.category)}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getCategoryBadgeClass(item.category)}`}>
                          {item.category || 'System'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatTime(item.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" title="Unread" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(item.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Delete notification"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className={`text-xs sm:text-sm font-heading ${isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                      {item.title}
                    </h4>

                    <p className="text-xs text-slate-600 leading-relaxed break-words">
                      {item.message}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
