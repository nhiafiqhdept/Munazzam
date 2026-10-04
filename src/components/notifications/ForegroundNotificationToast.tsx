import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  X,
  ArrowRight,
  Calendar,
  FileCheck,
  Layers,
  Award,
  Users,
  Landmark,
} from 'lucide-react';
import { AppNotification, NotificationCategory } from '../../types';

interface ForegroundNotificationToastProps {
  notification: AppNotification | null;
  onClose: () => void;
  onClick: (notification: AppNotification) => void;
}

export const ForegroundNotificationToast: React.FC<ForegroundNotificationToastProps> = ({
  notification,
  onClose,
  onClick,
}) => {
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      onClose();
    }, 5500);
    return () => clearTimeout(timer);
  }, [notification, onClose]);

  if (!notification) return null;

  const getIcon = (category?: NotificationCategory) => {
    switch (category) {
      case 'programs':
        return <Calendar className="w-4 h-4 text-emerald-600" />;
      case 'permissions':
        return <FileCheck className="w-4 h-4 text-blue-600" />;
      case 'subwings':
        return <Layers className="w-4 h-4 text-purple-600" />;
      case 'achievements':
      case 'suborgs':
        return <Award className="w-4 h-4 text-amber-600" />;
      case 'organizers':
        return <Users className="w-4 h-4 text-teal-600" />;
      case 'treasury':
        return <Landmark className="w-4 h-4 text-emerald-700" />;
      default:
        return <Bell className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed top-3 left-3 right-3 sm:left-auto sm:right-5 sm:w-[380px] z-[110] no-print"
      >
        <div className="bg-slate-900/95 text-white backdrop-blur-md rounded-2xl p-3.5 shadow-2xl border border-emerald-500/30 flex flex-col gap-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center">
                {getIcon(notification.category)}
              </div>
              <span className="text-[11px] font-bold tracking-tight text-emerald-400 font-heading">
                Munazzam • Instant Update
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div
            onClick={() => onClick(notification)}
            className="cursor-pointer group flex flex-col gap-1"
          >
            <h4 className="text-xs font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
              {notification.title}
            </h4>
            <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
              {notification.message}
            </p>
            <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
              <span>Just now</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                View details <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
