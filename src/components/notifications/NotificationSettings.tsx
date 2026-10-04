import React, { useState, useEffect } from 'react';
import {
  Bell,
  Smartphone,
  CheckCircle2,
  Calendar,
  FileCheck,
  Layers,
  Award,
  Users,
  Landmark,
  Shield,
  Save,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  requestNotificationPermission,
} from '../../services/notificationService';
import { NotificationPreferences } from '../../types';

export const NotificationSettings: React.FC = () => {
  const { user, currentOrg } = useApp();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  useEffect(() => {
    const loadPrefs = async () => {
      setLoading(true);
      const data = await getNotificationPreferences(
        user?.id || 'anonymous',
        currentOrg?.id || 'main'
      );
      setPreferences(data);
      setLoading(false);
    };

    loadPrefs();
  }, [user?.id, currentOrg?.id]);

  const handleToggleCategory = (catKey: keyof NotificationPreferences['categories']) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      categories: {
        ...preferences.categories,
        [catKey]: !preferences.categories[catKey],
      },
    });
    setSaveSuccess(false);
  };

  const handleTogglePush = async () => {
    if (!preferences) return;
    if (!preferences.enablePush && pushPermission !== 'granted') {
      const result = await requestNotificationPermission(
        user?.id || 'anonymous',
        currentOrg?.id || 'main'
      );
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPushPermission(Notification.permission);
      }
      if (result.success) {
        setPreferences({ ...preferences, enablePush: true });
      }
    } else {
      setPreferences({ ...preferences, enablePush: !preferences.enablePush });
    }
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!preferences) return;
    setSaving(true);
    await saveNotificationPreferences(preferences);
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  if (loading || !preferences) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center">
        <div className="w-8 h-8 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const categoryConfigs: {
    key: keyof NotificationPreferences['categories'];
    title: string;
    description: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      key: 'programs',
      title: 'Program Activity',
      description: 'Creation, updates, schedule changes, and status transitions for programs.',
      icon: Calendar,
    },
    {
      key: 'permissions',
      title: 'College Permissions & Approvals',
      description: 'Submission, approvals, rejections, and review feedback for official permissions.',
      icon: FileCheck,
    },
    {
      key: 'subwings',
      title: 'Sub-Wings & Affiliated Units',
      description: 'Sub-Wing logins, proposals, approvals, and partner submissions.',
      icon: Layers,
    },
    {
      key: 'achievements',
      title: 'Achievements & Student Points',
      description: 'Activity submissions, point allocations, and evaluation announcements.',
      icon: Award,
    },
    {
      key: 'organizers',
      title: 'Leadership & Organizers',
      description: 'Designation updates, new office bearers, and profile synchronization.',
      icon: Users,
    },
    {
      key: 'treasury',
      title: 'Treasury & Financial Operations',
      description: 'Important cashbook entries, transfers, and ledger movements.',
      icon: Landmark,
    },
    {
      key: 'system',
      title: 'System & Security Notices',
      description: 'Administrative events and institutional account security updates.',
      icon: Shield,
    },
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-card p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-heading">
            Notification Preferences
          </h3>
          <p className="text-xs text-slate-500">
            Control how and when Munazzam delivers alerts and updates to your devices.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-2xs transition-transform active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          {saving ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Preferences</span>
            </>
          )}
        </button>
      </div>

      {/* Global Delivery Channels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100/70 text-emerald-800 rounded-xl">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Web Push & Background</h4>
                <p className="text-[11px] text-slate-500">Lock screen & system tray alerts</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.enablePush}
              onChange={handleTogglePush}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
            />
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/60">
            <span>Browser Permission:</span>
            <span
              className={`font-semibold capitalize ${
                pushPermission === 'granted'
                  ? 'text-emerald-700'
                  : pushPermission === 'denied'
                  ? 'text-rose-600'
                  : 'text-amber-600'
              }`}
            >
              {pushPermission}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100/70 text-emerald-800 rounded-xl">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">In-App Notification Center</h4>
                <p className="text-[11px] text-slate-500">Header badge & activity feed</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.enableInApp}
              onChange={() =>
                setPreferences({ ...preferences, enableInApp: !preferences.enableInApp })
              }
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
            />
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/60">
            <span>Notification Stream:</span>
            <span className="font-semibold text-emerald-700">Active</span>
          </div>
        </div>
      </div>

      {/* Category Toggles */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Subscribed Categories
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {categoryConfigs.map((config) => {
            const Icon = config.icon;
            const isChecked = preferences.categories[config.key];
            return (
              <div
                key={config.key}
                onClick={() => handleToggleCategory(config.key)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  isChecked
                    ? 'bg-white border-emerald-200 shadow-2xs hover:border-emerald-300'
                    : 'bg-slate-50 border-slate-200 opacity-60 hover:opacity-80'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-2 bg-slate-100 rounded-xl text-slate-700 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">{config.title}</h5>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                      {config.description}
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}} // handled by parent div
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 mt-1 pointer-events-none"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
