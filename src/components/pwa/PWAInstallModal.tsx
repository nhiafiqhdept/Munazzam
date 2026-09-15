import React from 'react';
import { X, Download, Share2, PlusSquare, Monitor, Smartphone, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    const res = await install();
    if (res.success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="pwa-install-modal"
        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 overflow-hidden relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with App Emblem */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-xs border border-emerald-500/20 shrink-0 bg-slate-900 flex items-center justify-center">
            <img 
              src="/icon-192x192.png" 
              alt="Munazzam App Icon" 
              className="w-full h-full object-cover" 
            />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-heading">
              Install Munazzam
            </h3>
            <p className="text-xs text-slate-500">
              Fast, offline-ready progressive web app
            </p>
          </div>
        </div>

        {/* Status Body */}
        {isInstalled ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200/80 rounded-2xl text-center space-y-2 mb-4">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-emerald-900">
              Munazzam is already installed!
            </p>
            <p className="text-xs text-emerald-700">
              You can launch it directly from your home screen or application launcher.
            </p>
          </div>
        ) : isInstallable ? (
          <div className="space-y-4 mb-4">
            <p className="text-xs sm:text-sm text-slate-600">
              Install Munazzam on your device for one-tap access, fullscreen experience, and offline cached view.
            </p>
            <button
              id="pwa-trigger-install-btn"
              onClick={handleNativeInstall}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Install to Device</span>
            </button>
          </div>
        ) : isIOS ? (
          <div className="space-y-3 mb-4">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs text-slate-700">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>How to install on iPhone & iPad:</span>
              </p>
              <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-600">
                <li className="leading-relaxed">
                  Tap the <strong className="text-slate-900 font-semibold inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5 text-blue-600 inline" /> Share</strong> button in the Safari browser toolbar.
                </li>
                <li className="leading-relaxed">
                  Scroll down the share sheet and select <strong className="text-slate-900 font-semibold inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 text-slate-700 inline" /> Add to Home Screen</strong>.
                </li>
                <li className="leading-relaxed">
                  Tap <strong className="text-slate-900 font-semibold">Add</strong> at top right to complete installation.
                </li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs text-slate-600">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-emerald-600" />
                <span>Desktop & Other Browsers:</span>
              </p>
              <p>
                In Chrome, Edge, or Brave: Click the <strong>Install</strong> icon in the address bar (or Menu → <strong>Install Munazzam</strong>).
              </p>
            </div>
          </div>
        )}

        {/* Feature Highlights */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
          <div className="p-2 bg-slate-50/70 rounded-xl">
            <p className="text-[11px] font-bold text-slate-800">Standalone</p>
            <p className="text-[10px] text-slate-500">No browser bar</p>
          </div>
          <div className="p-2 bg-slate-50/70 rounded-xl">
            <p className="text-[11px] font-bold text-slate-800">Cloud Sync</p>
            <p className="text-[10px] text-slate-500">Real-time DB</p>
          </div>
          <div className="p-2 bg-slate-50/70 rounded-xl">
            <p className="text-[11px] font-bold text-slate-800">Offline Safe</p>
            <p className="text-[10px] text-slate-500">Cached UI shell</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
