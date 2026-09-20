import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, XCircle, AlertCircle, MessageSquare, User, Building, Share2, Copy, Check, ExternalLink } from 'lucide-react';
import { ProgramPermission, PermissionStatus } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../utils/helpers';
import { PermissionStatusBadge } from './PermissionStatusBadge';
import { SharePermissionModal } from './SharePermissionModal';
import { buildWhatsAppShareMessage, openWhatsAppShare, copyToClipboard, getPublicApprovalUrl } from '../../utils/permissionTokens';

interface PermissionReviewModalProps {
  permission: ProgramPermission;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PermissionReviewModal: React.FC<PermissionReviewModalProps> = ({
  permission,
  onClose,
  onSuccess,
}) => {
  const {
    approveProgramPermission,
    recommendProgramPermission,
    rejectProgramPermission,
    requestPermissionChanges,
    user,
  } = useApp();

  const [decision, setDecision] = useState<'approve' | 'recommend' | 'changes' | 'reject'>('approve');
  const [authorityName, setAuthorityName] = useState(
    permission.approvingAuthority === 'Principal'
      ? 'Principal Office'
      : user?.username || permission.approvingAuthority
  );
  const [designation, setDesignation] = useState(permission.approvingAuthority || 'Principal');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleQuickWhatsApp = () => {
    const msg = buildWhatsAppShareMessage(permission);
    openWhatsAppShare(msg);
  };

  const handleQuickCopy = async () => {
    const url = permission.approvalToken ? getPublicApprovalUrl(permission.approvalToken) : '';
    if (url) {
      const ok = await copyToClipboard(url);
      if (ok) {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }
    } else {
      setShowShareModal(true);
    }
  };

  const handleAction = async () => {
    setError(null);
    if (!authorityName.trim()) {
      setError('Please provide the reviewer / authority name.');
      return;
    }

    if (decision === 'reject' && !reason.trim()) {
      setError('Please provide a specific reason for rejection.');
      return;
    }

    if (decision === 'changes' && !notes.trim()) {
      setError('Please provide specific comments describing the required changes.');
      return;
    }

    setLoading(true);
    try {
      if (decision === 'approve') {
        await approveProgramPermission(permission.id, authorityName.trim(), notes.trim());
      } else if (decision === 'recommend') {
        await recommendProgramPermission(permission.id, authorityName.trim(), designation.trim(), notes.trim());
      } else if (decision === 'changes') {
        await requestPermissionChanges(permission.id, authorityName.trim(), notes.trim());
      } else if (decision === 'reject') {
        await rejectProgramPermission(permission.id, authorityName.trim(), reason.trim());
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Error executing permission decision:', err);
      setError(err?.message || 'Failed to update permission status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Review College Permission Request</h3>
              <p className="text-xs text-slate-400">
                Official institutional review & approval by {permission.approvingAuthority}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* WhatsApp Direct Principal Approval Dispatch Card */}
          <div className="p-4 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.174L2 22l4.981-1.309A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.25c-1.636 0-3.153-.497-4.417-1.352l-.316-.214-2.955.775.789-2.88-.236-.376C4.043 14.898 3.5 13.5 3.5 12c0-4.687 3.813-8.5 8.5-8.5s8.5 3.813 8.5 8.5-3.813 8.5-8.5 8.5z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Need Principal Approval via WhatsApp?</h4>
                <p className="text-[11px] text-slate-600">
                  Send a passwordless digital review link directly to the Principal's WhatsApp.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleQuickWhatsApp}
                className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Send WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="px-3 py-1.5 bg-white border border-[#25D366]/40 text-[#128C7E] hover:bg-slate-50 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title="View Link & QR Code"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Options</span>
              </button>
            </div>
          </div>

          {/* Program Overview Mini Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Request for Program:
                </span>
                <h4 className="text-sm font-bold text-slate-900">{permission.programName}</h4>
              </div>
              <PermissionStatusBadge status={permission.status} size="sm" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 pt-2 border-t border-slate-200">
              <div>
                <span className="font-bold text-slate-500">Conducted By:</span>{' '}
                <span className="font-semibold text-slate-800">{permission.conductedBy}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500">Date:</span>{' '}
                <span className="font-semibold text-slate-800">{formatDate(permission.date)}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500">Venue:</span>{' '}
                <span className="font-semibold text-slate-800">{permission.venue}</span>
              </div>
            </div>
          </div>

          {/* Decision Selection Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Select Action / Decision <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setDecision('approve')}
                className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  decision === 'approve'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Approve</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('recommend')}
                className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  decision === 'recommend'
                    ? 'bg-blue-50 border-blue-500 text-blue-800 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <span>Recommend</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('changes')}
                className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  decision === 'changes'
                    ? 'bg-orange-50 border-orange-500 text-orange-800 ring-2 ring-orange-500/20 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <span>Changes Req.</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('reject')}
                className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  decision === 'reject'
                    ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>Reject</span>
              </button>
            </div>
          </div>

          {/* Authority Signer Particulars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Authorized Person Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={authorityName}
                onChange={(e) => setAuthorityName(e.target.value)}
                placeholder="e.g. Dr. K. M. Abdul Gafoor"
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Designation / Role Title</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Principal / Dean of Student Affairs"
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Notes or Mandatory Rejection Reason */}
          {decision === 'reject' ? (
            <div>
              <label className="block text-xs font-bold text-rose-700 mb-1">
                Reason for Rejection <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State the reason why permission cannot be granted for this program..."
                className="w-full text-xs bg-white border border-rose-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-rose-500"
              />
            </div>
          ) : decision === 'changes' ? (
            <div>
              <label className="block text-xs font-bold text-orange-800 mb-1">
                Instructions for Changes Required <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Please change the venue to Seminar Hall and adjust program timing to after 3:00 PM."
                className="w-full text-xs bg-white border border-orange-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-orange-500"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {decision === 'approve' ? 'Approval Conditions / Remarks (Optional)' : 'Recommendation Remarks (Optional)'}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Sanctioned subject to discipline and maintaining campus cleanliness."
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleAction}
            className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              decision === 'approve'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : decision === 'recommend'
                ? 'bg-blue-600 hover:bg-blue-700'
                : decision === 'changes'
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {decision === 'approve' && <CheckCircle2 className="w-4 h-4" />}
            {decision === 'recommend' && <ShieldCheck className="w-4 h-4" />}
            {decision === 'changes' && <AlertCircle className="w-4 h-4" />}
            {decision === 'reject' && <XCircle className="w-4 h-4" />}
            <span>
              {loading
                ? 'Processing...'
                : decision === 'approve'
                ? 'Confirm & Sanction Approval'
                : decision === 'recommend'
                ? 'Record Recommendation'
                : decision === 'changes'
                ? 'Request Changes'
                : 'Confirm Rejection'}
            </span>
          </button>
        </div>
      </div>

      {/* Share Permission Modal */}
      {showShareModal && (
        <SharePermissionModal
          permission={permission}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};
