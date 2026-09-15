import React from 'react';
import { AlertTriangle, Lock, ArrowLeft, RefreshCw, ExternalLink } from 'lucide-react';

interface PortalUnavailableScreenProps {
  reason: 'invalid' | 'disabled' | 'missing' | 'expired';
  customMessage?: string;
  onRetry?: () => void;
}

export const PortalUnavailableScreen: React.FC<PortalUnavailableScreenProps> = ({
  reason,
  customMessage,
  onRetry,
}) => {
  const getTitle = () => {
    switch (reason) {
      case 'disabled':
        return 'Points Portal Temporarily Disabled';
      case 'missing':
        return 'Points Portal Link Incomplete';
      case 'expired':
        return 'Points Portal Link Expired';
      case 'invalid':
      default:
        return 'Points Portal Unavailable';
    }
  };

  const getDescription = () => {
    if (customMessage) return customMessage;
    switch (reason) {
      case 'disabled':
        return 'This institution Points Portal has been temporarily disabled by its administrator. External student and class submissions are paused until it is re-activated.';
      case 'missing':
        return 'No Points Portal identifier was provided in this URL. Each main Munazzam account has an independent, secure Points Portal link. Please use the complete link provided by your class or institution administrator.';
      case 'expired':
        return 'This Points Portal link has expired or has been regenerated with a new security token. Please ask your administrator for the updated portal link.';
      case 'invalid':
      default:
        return 'The Points Portal link is unrecognized or does not belong to an active organization. Please check the URL carefully or request a verified link from your administrator.';
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 text-center space-y-6">
        {/* Visual Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-inner">
          {reason === 'disabled' ? (
            <Lock className="w-8 h-8 text-amber-700" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-amber-700" />
          )}
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-3 py-1 bg-slate-100 text-slate-600 rounded-full">
            Access Error
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-heading tracking-tight">
            {getTitle()}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            {getDescription()}
          </p>
        </div>

        {/* Security & Organization Notice */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs text-slate-500 space-y-1">
          <p className="font-bold text-slate-700">Looking for your class or student account?</p>
          <p className="text-[11px] leading-normal">
            Points portals are isolated per organization. Make sure you are clicking the full link shared by your specific institution, which looks like:
          </p>
          <code className="block mt-1 text-[10px] font-mono bg-white border border-slate-200 rounded-lg p-2 text-slate-700 overflow-x-auto">
            https://.../?suborg=true&portal=YOUR_PORTAL_TOKEN
          </code>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
          )}

          <a
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go to Main App</span>
          </a>
        </div>
      </div>
    </div>
  );
};
