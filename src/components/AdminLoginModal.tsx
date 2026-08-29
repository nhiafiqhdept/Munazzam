import React, { useState } from 'react';
import { Lock, KeyRound, X, CheckCircle, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose }) => {
  const { adminPin, setIsAdmin } = useApp();
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === adminPin || pinInput === '1234') {
      setError('');
      setSuccess(true);
      setTimeout(() => {
        setIsAdmin(true);
        setSuccess(false);
        setPinInput('');
        onClose();
      }, 500);
    } else {
      setError('Incorrect admin PIN. Default demo PIN is 1234.');
    }
  };

  const handleQuickDemoUnlock = () => {
    setIsAdmin(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="admin-login-modal"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100">Administrator Access</h3>
              <p className="text-xs text-slate-400">Unlock organization management tools</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Enter Admin Security PIN
            </label>
            <div className="relative">
              <KeyRound className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="admin-pin-input"
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setError('');
                }}
                placeholder="Default: 1234"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-mono tracking-widest text-center text-lg"
                autoFocus
              />
            </div>
            {error && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Authenticated successfully! Redirecting...</span>
              </div>
            )}
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-xs text-amber-800 flex items-start gap-2.5">
            <span className="font-bold text-amber-900 shrink-0">Note:</span>
            <span>
              Public visitors can view organization details and program proofs in read-only mode.
              Admin mode unlocks adding and modifying programs, organizers, and media. (Default PIN: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">1234</code>)
            </span>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              id="admin-submit-pin-btn"
              type="submit"
              className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Unlock Admin Mode</span>
            </button>

            <button
              type="button"
              onClick={handleQuickDemoUnlock}
              className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              ⚡ Quick Demo Unlock (1-Click)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
