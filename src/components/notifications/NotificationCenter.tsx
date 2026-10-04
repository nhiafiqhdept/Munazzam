import React, { useState } from 'react';
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
    viewProgramDetails,
    setSelectedProgramId,
    programs,
  } = useApp();

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [showOnlyUnread, setShowOnlyUnread] = useState<boolean>(false);
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);

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
  const getCategoryIcon = (category: NotificationCategory, type: string) => {
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

  const getCategoryBadgeClass = (category: NotificationCategory) => {
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

    // Default deep linking navigation
    if (notification.route) {
      const targetRoute = notification.route as any;
      setActiveTab(targetRoute);
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
    <div className={`flex flex-col bg-white ${isModal ? 'h-full max-h-[85vh]' : 'rounded-3xl border border-slate-200/90 shadow-card p-4 sm:p-6'} overflow-hidden`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100 shadow-2xs">
            <Bell className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                Notification Center
              </h2>
              {unreadNotificationCount > 0 && (
                <span className="px-2 py-0.5 bg-emerald-700 text-white rounded-full text-[11px] font-bold">
                  {unreadNotificationCount} new
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Authoritative activity stream for {currentOrg?.name || 'your organization'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadNotificationCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={isMarkingAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              title="Mark all notifications as read"
            >
              <CheckCheck className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}

          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between py-3 gap-2 overflow-x-auto no-scrollbar border-b border-slate-100">
        <div className="flex items-center gap-1.5 shrink-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none whitespace-nowrap ${
                activeCategoryFilter === cat.id
                  ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                  : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowOnlyUnread(!showOnlyUnread)}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
            showOnlyUnread
              ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold shadow-2xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${showOnlyUnread ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`} />
          <span>Unread Only</span>
        </button>
      </div>

      {/* Notification List Body */}
      <div className="flex-1 overflow-y-auto py-2 space-y-2.5 min-h-[260px] pr-1">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400">
              <Bell className="w-7 h-7 stroke-[1.5]" />
            </div>
            <div className="space-y-1 max-w-xs">
              <p className="text-sm font-bold text-slate-800 font-heading">
                {showOnlyUnread
                  ? 'No unread notifications'
                  : activeCategoryFilter !== 'all'
                  ? `No ${activeCategoryFilter} notifications yet`
                  : 'You are all caught up!'}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Updates regarding program approvals, permissions, Sub-Wings, and member achievements will appear here.
              </p>
            </div>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <motion.div
              key={notification.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => handleItemClick(notification)}
              className={`group relative p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5 ${
                notification.isRead
                  ? 'bg-white border-slate-200/80 hover:bg-slate-50/80 hover:border-slate-300 shadow-2xs'
                  : 'bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50/70 shadow-xs'
              }`}
            >
              {/* Unread dot indicator */}
              {!notification.isRead && (
                <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              )}

              {/* Category Icon */}
              <div
                className={`p-2.5 rounded-xl border shrink-0 transition-transform group-hover:scale-105 ${
                  notification.isRead
                    ? 'bg-slate-50 border-slate-200/80'
                    : 'bg-white border-emerald-200 shadow-2xs'
                }`}
              >
                {getCategoryIcon(notification.category, notification.type)}
              </div>

              {/* Text content */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap pr-4">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${getCategoryBadgeClass(
                      notification.category
                    )}`}
                  >
                    {notification.category}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(notification.createdAt)}
                  </span>
                </div>

                <h4
                  className={`text-xs sm:text-sm leading-snug font-heading ${
                    notification.isRead ? 'text-slate-800 font-semibold' : 'text-slate-950 font-bold'
                  }`}
                >
                  {notification.title}
                </h4>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {notification.message}
                </p>
              </div>

              {/* Action buttons on hover */}
              <div className="flex items-center gap-1 shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Dismiss notification"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="p-1 text-slate-400 group-hover:text-emerald-700 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
