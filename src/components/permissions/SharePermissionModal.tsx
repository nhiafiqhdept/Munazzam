import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  RefreshCw,
  Clock,
  ShieldCheck,
  Building,
  Calendar,
  Sparkles,
  Globe,
  Settings,
  Info,
} from 'lucide-react';
import { ProgramPermission } from '../../types';
import {
  buildWhatsAppShareMessage,
  openWhatsAppShare,
  getPublicApprovalUrl,
  getPublicAppBaseUrl,
  setCustomPublicAppBaseUrl,
  copyToClipboard,
} from '../../utils/permissionTokens';
import { QRCodeView } from './QRCodeView';
import { formatDate } from '../../utils/helpers';
import { useApp } from '../../context/AppContext';

interface SharePermissionModalProps {
  permission: ProgramPermission;
  onClose: () => void;
}

export const SharePermissionModal: React.FC<SharePermissionModalProps> = ({
  permission,
  onClose,
}) => {
  const { generatePermissionApprovalToken } = useApp();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeToken, setActiveToken] = useState<string>(permission.approvalToken || '');
  const [expiryDate, setExpiryDate] = useState<string>(permission.tokenExpiresAt || '');
  const [customDomainInput, setCustomDomainInput] = useState<string>(() => getPublicAppBaseUrl());
  const [showDomainConfig, setShowDomainConfig] = useState(false);
  const [domainSaved, setDomainSaved] = useState(false);

  // Auto-generate token on mount if missing
  useEffect(() => {
    if (!activeToken) {
      handleGenerateNewLink();
    }
  }, []);

  const handleGenerateNewLink = async () => {
    setIsGenerating(true);
    try {
      const res = await generatePermissionApprovalToken(permission.id);
      setActiveToken(res.token);
      setExpiryDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString());
    } catch (err) {
      console.error('Failed to generate approval link:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const publicUrl = activeToken ? getPublicApprovalUrl(activeToken) : '';
  const shareMessage = buildWhatsAppShareMessage(permission, activeToken);

  const handleCopyLink = async () => {
    if (!publicUrl) return;
    const ok = await copyToClipboard(publicUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleWhatsAppClick = () => {
    openWhatsAppShare(shareMessage);
  };

  const handleSaveDomain = () => {
    setCustomPublicAppBaseUrl(customDomainInput.trim());
    setDomainSaved(true);
    setTimeout(() => {
      setDomainSaved(false);
      setShowDomainConfig(false);
    }, 1200);
  };

  const handleResetToDetectedDomain = () => {
    setCustomPublicAppBaseUrl('');
    setCustomDomainInput(getPublicAppBaseUrl());
    setDomainSaved(true);
    setTimeout(() => {
      setDomainSaved(false);
      setShowDomainConfig(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Share College Permission</h3>
              <p className="text-xs text-emerald-300/80">
                Official Principal review & approval dispatch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Public Access Verified Badge */}
          <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Public Anonymous Access Enabled: </span>
              <span className="text-emerald-800">
                The Principal can review and approve directly from WhatsApp without logging into Google or creating a Munazzam account.
              </span>
            </div>
          </div>

          {/* Program Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-200">
                Program Dossier
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">
                Status: <span className="capitalize text-slate-800 font-bold">{permission.status.replace('_', ' ')}</span>
              </span>
            </div>
            <h4 className="text-base font-black text-slate-900 leading-snug">
              {permission.programName}
            </h4>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium pt-1">
              <div className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>{permission.conductedBy}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatDate(permission.date)}</span>
              </div>
            </div>
          </div>

          {/* Primary Action: WhatsApp Direct Button */}
          <button
            type="button"
            onClick={handleWhatsAppClick}
            disabled={!activeToken || isGenerating}
            className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.99] text-white font-black rounded-2xl flex items-center justify-center gap-2.5 shadow-md shadow-[#25D366]/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {/* Official WhatsApp SVG Icon */}
            <svg
              className="w-5 h-5 fill-current flex-shrink-0"
              viewBox="0 0 24 24"
            >
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.174L2 22l4.981-1.309A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.25c-1.636 0-3.153-.497-4.417-1.352l-.316-.214-2.955.775.789-2.88-.236-.376C4.043 14.898 3.5 13.5 3.5 12c0-4.687 3.813-8.5 8.5-8.5s8.5 3.813 8.5 8.5-3.813 8.5-8.5 8.5z" />
            </svg>
            <span className="text-sm">Share via WhatsApp</span>
          </button>

          {/* Quick Actions Row */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={!activeToken || isGenerating}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copy Approval Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowQR(!showQR)}
              disabled={!activeToken || isGenerating}
              className={`py-2.5 px-3 border font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                showQR
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>{showQR ? 'Hide QR Code' : 'Show QR Code'}</span>
            </button>
          </div>

          {/* QR Code Display */}
          {showQR && activeToken && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center gap-2 text-center animate-in fade-in">
              <QRCodeView value={publicUrl} size={180} />
              <p className="text-[11px] text-slate-500 font-medium">
                The Principal can scan this QR code directly with any camera to open the approval page.
              </p>
            </div>
          )}

          {/* Public Link Details Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Public Approval Link</span>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Expires: {expiryDate ? formatDate(expiryDate) : '14 days'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 p-2.5 rounded-xl border border-slate-200/80">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="bg-transparent border-none text-xs font-mono text-slate-600 flex-1 outline-none truncate select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-1 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                title="Copy URL"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1 text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer"
                title="Preview public approval page in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Domain Configuration Toggle */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span>Public App Base URL</span>
              </div>
              <button
                type="button"
                onClick={() => setShowDomainConfig(!showDomainConfig)}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Settings className="w-3 h-3" />
                <span>{showDomainConfig ? 'Close' : 'Customize Domain'}</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-500 font-mono truncate">
              {getPublicAppBaseUrl() || window.location.origin}
            </div>

            {showDomainConfig && (
              <div className="pt-2 border-t border-slate-200 space-y-2 animate-in fade-in">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Custom Production Domain or Cloud Run URL:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customDomainInput}
                    onChange={(e) => setCustomDomainInput(e.target.value)}
                    placeholder="https://munazzam.edu or https://my-app.run.app"
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSaveDomain}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    {domainSaved ? 'Saved!' : 'Save'}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Overrides link generation base URL.</span>
                  <button
                    type="button"
                    onClick={handleResetToDetectedDomain}
                    className="text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Reset to auto-detected URL
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* WhatsApp Message Preview Accordion */}
          <details className="group rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-600">
            <summary className="font-bold text-slate-700 cursor-pointer select-none flex items-center justify-between">
              <span>View WhatsApp Message Template</span>
              <span className="text-[10px] text-emerald-700 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-2.5 pt-2.5 border-t border-slate-200/70 whitespace-pre-line font-mono text-[11px] text-slate-700 bg-white p-3 rounded-lg border">
              {shareMessage}
            </div>
          </details>

          {/* Regenerate Action */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">Need a new link?</span>
            <button
              type="button"
              onClick={handleGenerateNewLink}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>Generate New Approval Link</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Isolated Permission Token</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
