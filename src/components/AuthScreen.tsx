import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, LogIn, UserPlus } from 'lucide-react';
import { DEFAULT_ORG_LOGO } from '../utils/helpers';

interface AuthScreenProps {
  onLoginSuccess: (token: string, user: { id: string; email: string }) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const lastLogo = localStorage.getItem('last_org_logo') || '';
  const lastName = localStorage.getItem('last_org_name') || 'Organization Portal';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (isRegister) {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
    }

    setLoading(true);
    try {
      let data;
      let usedLocalFallback = false;

      try {
        const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const responseText = await res.text();
        try {
          data = JSON.parse(responseText);
        } catch (jsonErr) {
          if (res.status === 404 || res.status === 403 || res.status === 502 || res.status === 503) {
            // Server routing is blocked or down (e.g., iframe third-party cookies block) -> Fallback to Local DB
            usedLocalFallback = true;
          } else {
            throw new Error(`Invalid server response (not JSON). Status: ${res.status}`);
          }
        }

        if (!usedLocalFallback && !res.ok) {
          throw new Error(data.error || 'Authentication failed.');
        }
      } catch (networkErr: any) {
        // Network connection error -> Use Local DB fallback!
        usedLocalFallback = true;
      }

      if (usedLocalFallback) {
        const { localRegister, localLogin } = await import('../utils/localDB');
        if (isRegister) {
          data = await localRegister(email, password);
        } else {
          data = await localLogin(email, password);
        }
      }

      if (isRegister) {
        localStorage.setItem('org_token', data.token);
        localStorage.setItem('org_user', JSON.stringify(data.user));
        setSuccessMessage(
          usedLocalFallback
            ? 'Account created locally (Iframe Sandbox Mode)! Logging you in...'
            : 'Account created successfully! Automatically logging you in...'
        );
        setTimeout(() => {
          onLoginSuccess(data.token, data.user);
        }, 1000);
      } else {
        localStorage.setItem('org_token', data.token);
        localStorage.setItem('org_user', JSON.stringify(data.user));
        setSuccessMessage(
          usedLocalFallback 
            ? 'Logged in successfully (Sandbox Fallback Mode)!' 
            : 'Logged in successfully!'
        );
        setTimeout(() => {
          onLoginSuccess(data.token, data.user);
        }, 400);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      setForgotSent(true);
    } catch {
      setForgotSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-[420px] bg-white rounded-3xl border border-slate-200/60 shadow-xl px-6 py-10 sm:p-10 flex flex-col items-center">
        {/* Logo Container */}
        <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200/80 p-2 flex items-center justify-center overflow-hidden mb-6 shadow-xs shrink-0">
          <img
            src={lastLogo || DEFAULT_ORG_LOGO}
            alt={lastName}
            className="w-full h-full object-contain rounded-xl"
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_ORG_LOGO;
            }}
          />
        </div>

        {/* Heading */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 text-center mb-1">
          {isRegister ? 'Create Account' : 'Admin Login'}
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-slate-500 text-center mb-8">
          {isRegister ? 'Sign up to manage your organization' : 'Sign in with your username and password'}
        </p>

        {/* Alert Messages */}
        {error && (
          <div className="w-full mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-xs text-rose-800 text-left">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="w-full mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2 text-xs text-emerald-800 text-left">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span className="font-medium leading-relaxed">{successMessage}</span>
          </div>
        )}

        {/* Login/Register Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col">
          {/* Username Field */}
          <div className="w-full text-left mb-5">
            <label className="block text-[11px] font-extrabold tracking-wider text-teal-800 uppercase mb-2">
              USERNAME
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. ajvad"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Password Field */}
          <div className="w-full text-left mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] font-extrabold tracking-wider text-teal-800 uppercase">
                PASSWORD
              </label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(true)}
                  className="text-xs text-purple-700 hover:text-purple-800 font-bold transition-colors"
                >
                  Forgot?
                </button>
              )}
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Confirm Password (Register Only) */}
          {isRegister && (
            <div className="w-full text-left mb-6">
              <label className="block text-[11px] font-extrabold tracking-wider text-teal-800 uppercase mb-2">
                CONFIRM PASSWORD
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all placeholder:text-slate-400"
              />
            </div>
          )}

          {/* Login/Register Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-[#4c1d95] hover:bg-[#3b0764] active:scale-[0.99] text-white font-bold rounded-2xl shadow-sm hover:shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm mb-6"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{isRegister ? 'Creating account...' : 'Logging in...'}</span>
              </>
            ) : isRegister ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Admin Account</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Login to Dashboard</span>
              </>
            )}
          </button>
        </form>

        {/* Footer switcher link */}
        <div className="text-center mt-2 w-full">
          <p className="text-sm font-semibold text-slate-600">
            {isRegister ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="text-[#4c1d95] font-bold hover:underline transition-colors"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="text-[#4c1d95] font-bold hover:underline transition-colors"
                >
                  Create one
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden p-6 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
              <button
                onClick={() => {
                  setIsForgotOpen(false);
                  setForgotSent(false);
                  setForgotEmail('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {forgotSent ? (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-emerald-900 text-sm">Instructions Sent</h4>
                <p className="text-xs text-emerald-700 leading-normal">
                  If an account exists for {forgotEmail}, password reset instructions have been sent. (Note: Ensure backend email SMTP service is configured for automated delivery).
                </p>
                <button
                  onClick={() => {
                    setIsForgotOpen(false);
                    setForgotSent(false);
                    setForgotEmail('');
                  }}
                  className="mt-2 px-4 py-2 bg-purple-700 text-white text-xs font-bold rounded-xl"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your registered email address and we'll send you instructions to reset your password.
                </p>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    Send Reset Instructions
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
