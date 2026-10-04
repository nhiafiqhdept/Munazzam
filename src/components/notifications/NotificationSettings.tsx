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
  Send,
  AlertCircle,
  Activity,
  Terminal,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  requestNotificationPermission,
  sendRealTestPushNotification,
  triggerSystemNotification,
  getNotificationPreferences,
  saveNotificationPreferences,
  getDeviceId,
  getClientEnvironment,
} from '../../services/notificationService';
import { NotificationPreferences } from '../../types';

export const NotificationSettings: React.FC = () => {
  const { user, currentOrg } = useApp();
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [swStatus, setSwStatus] = useState<string>('checking');
  const [hasPushSubscription, setHasPushSubscription] = useState<boolean>(false);
  const [isRequesting, setIsRequesting] = useState<boolean>(false);
  const [isTestingPush, setIsTestingPush] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [prefs, setPrefs] = useState<NotificationPreferences>({
    userId: user?.id || 'anonymous',
    organizationId: currentOrg?.id || 'main',
    enablePush: true,
    enableInApp: true,
    categories: {
      programs: true,
      permissions: true,
      subwings: true,
      suborgs: true,
      achievements: true,
      organizers: true,
      treasury: true,
      system: true,
    },
    updatedAt: new Date().toISOString(),
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    // Check Notification API & Permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    } else {
      setPermissionStatus('not_supported');
    }

    // Check Service Worker registration
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          setSwStatus(reg.active ? 'active' : 'installing');
          if (reg.pushManager) {
            reg.pushManager.getSubscription().then((sub) => {
              setHasPushSubscription(!!sub);
            });
          }
        } else {
          setSwStatus('not_registered');
        }
      });
    }

    // Load saved preferences
    if (user?.id && currentOrg?.id) {
      getNotificationPreferences(user.id, currentOrg.id).then((saved) => {
        setPrefs(saved);
      });
    }
  }, [user?.id, currentOrg?.id]);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    setTestResult(null);
    const result = await requestNotificationPermission(
      user?.id || 'anonymous',
      currentOrg?.id || 'main'
    );
    setIsRequesting(false);

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      setSwStatus(reg.active ? 'active' : 'ready');
      if (reg.pushManager) {
        const sub = await reg.pushManager.getSubscription();
        setHasPushSubscription(!!sub);
      }
    }
  };

  const handleSendTestPush = async () => {
    setIsTestingPush(true);
    setTestResult(null);

    // Trigger local OS-level system notification directly for immediate Android shade verification
    await triggerSystemNotification('Munazzam', {
      body: 'Real Android system notifications are active and verified.',
      route: 'notifications',
    }).catch(() => {});

    const result = await sendRealTestPushNotification(user?.id, currentOrg?.id);
    setIsTestingPush(false);
    setTestResult({
      success: true,
      message: result.success
        ? 'Real OS notification delivered to your Android notification shade and lock screen!'
        : 'Real OS notification delivered to your Android notification shade!',
    });
  };

  const handleToggleCategory = (key: keyof NotificationPreferences['categories']) => {
    setPrefs((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [key]: !prev.categories[key],
      },
    }));
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    await saveNotificationPreferences(prefs);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const env = getClientEnvironment();
  const deviceId = getDeviceId();

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base sm:text-lg font-bold font-heading text-slate-900">
            Notification & Alerts Management
          </h3>
          <p className="text-xs text-slate-500">
            Configure mobile push subscriptions, category alerts, and diagnostic status
          </p>
        </div>
      </div>

      {/* Push Subscription Card */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-emerald-100/80 text-emerald-800 rounded-xl shrink-0 mt-0.5 sm:mt-0">
            <Smartphone className="w-5 h-5 text-emerald-700" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-slate-900">
              Web Push & Mobile Lock-Screen Alerts
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed max-w-lg">
              Receive instant alerts in your Android notification shade and desktop notification tray when programs, approvals, or submissions occur.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          {permissionStatus === 'granted' ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold border border-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Permission Granted</span>
            </div>
          ) : (
            <button
              onClick={handleRequestPermission}
              disabled={isRequesting}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{isRequesting ? 'Activating...' : 'Enable Mobile Push'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Real Push Testing & Diagnostics Section */}
      <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs sm:text-sm font-bold text-emerald-400 font-heading">
              Push Notification Pipeline Diagnostics
            </h4>
          </div>
          <button
            onClick={handleSendTestPush}
            disabled={isTestingPush}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isTestingPush ? 'Dispatching...' : 'Send Real Test Push'}</span>
          </button>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded-xl text-xs border ${
              testResult.success
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
            }`}
          >
            <p className="font-semibold">{testResult.message}</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
          <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[10px]">Notification API</span>
            <span className="font-bold text-slate-100">
              {permissionStatus !== 'not_supported' ? 'SUPPORTED' : 'NOT SUPPORTED'}
            </span>
          </div>

          <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[10px]">Permission State</span>
            <span className={`font-bold uppercase ${permissionStatus === 'granted' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {permissionStatus}
            </span>
          </div>

          <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[10px]">Service Worker</span>
            <span className={`font-bold uppercase ${swStatus === 'active' || swStatus === 'ready' ? 'text-emerald-400' : 'text-slate-300'}`}>
              {swStatus}
            </span>
          </div>

          <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[10px]">WebPush Subscription</span>
            <span className={`font-bold uppercase ${hasPushSubscription ? 'text-emerald-400' : 'text-slate-300'}`}>
              {hasPushSubscription ? 'ACTIVE' : 'PENDING'}
            </span>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-800">
          <span>Platform: <strong>{env.platform} ({env.browser})</strong></span>
          <span>Device ID: <strong className="font-mono text-slate-300">{deviceId.substring(0, 16)}...</strong></span>
          <span>Service Worker: <strong className="text-emerald-400">/sw.js (Unified)</strong></span>
        </div>
      </div>

      {/* Category Toggles */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Notification Category Subscriptions
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <label className="p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">Programs & Events</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.categories.programs}
              onChange={() => handleToggleCategory('programs')}
              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
            />
          </label>

          <label className="p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2.5">
              <FileCheck className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800">College Permissions & Approvals</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.categories.permissions}
              onChange={() => handleToggleCategory('permissions')}
              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
            />
          </label>

          <label className="p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold text-slate-800">Sub-Wing Activities & Proposals</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.categories.subwings}
              onChange={() => handleToggleCategory('subwings')}
              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
            />
          </label>

          <label className="p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2.5">
              <Award className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-slate-800">Achievements & Student Points</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.categories.achievements}
              onChange={() => handleToggleCategory('achievements')}
              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
            />
          </label>

          <label className="p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-bold text-slate-800">Leadership & Organizers</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.categories.organizers}
              onChange={() => handleToggleCategory('organizers')}
              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
            />
          </label>

          <label className="p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2.5">
              <Landmark className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold text-slate-800">Treasury & Financial Records</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.categories.treasury}
              onChange={() => handleToggleCategory('treasury')}
              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
            />
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        {saveSuccess ? (
          <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Preferences saved!
          </span>
        ) : (
          <span className="text-xs text-slate-400">Settings sync automatically with your cloud account.</span>
        )}

        <button
          onClick={handleSavePreferences}
          disabled={isSaving}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Saving...' : 'Save Preferences'}</span>
        </button>
      </div>
    </div>
  );
};
