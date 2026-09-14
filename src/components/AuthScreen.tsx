import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, LogIn, UserPlus, Lock, User, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { DEFAULT_ORG_LOGO } from '../utils/helpers';
import { safeApiFetch } from '../utils/api';
import { authenticateLogin, authenticateRegister } from '../utils/authService';
import { AuthUser } from '../types';

interface AuthScreenProps {
  onLoginSuccess: (token: string, user: AuthUser) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [generalError, setGeneralError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const lastLogo = localStorage.getItem('last_org_logo') || '';
  const lastName = localStorage.getItem('last_org_name') || 'Organization Portal';

  const clearErrors = () => {
    setFieldErrors({});
    setGeneralError('');
    setSuccessMessage('');
  };

  const handleToggleMode = (registerMode: boolean) => {
    setIsRegister(registerMode);
    clearErrors();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    const cleanUsername = username.trim();
    const errors: typeof fieldErrors = {};

    if (!cleanUsername) {
      errors.username = 'Username is required.';
    } else if (isRegister && cleanUsername.length < 3) {
      errors.username = 'Username must be at least 3 characters long.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (isRegister && password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.';
    }

    if (isRegister && password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const result = isRegister
        ? await authenticateRegister(cleanUsername, password)
        : await authenticateLogin(cleanUsername, password);

      if (result.ok && result.token && result.user) {
        setSuccessMessage(
          isRegister
            ? 'Account created successfully! Loading dashboard...'
            : 'Authenticated successfully! Loading dashboard...'
        );

        setTimeout(() => {
          onLoginSuccess(result.token!, result.user!);
        }, 300);
        return;
      }

      // Display specific failure reason
      if (result.error) {
        setGeneralError(result.error);
      } else {
        setGeneralError('Incorrect username or password.');
      }
    } catch (err: any) {
      console.error('Auth request failed:', err);
      setGeneralError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    setForgotLoading(true);
    try {
      await safeApiFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      setForgotSent(true);
    } catch {
      setForgotSent(true);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div
        id="auth-card"
        className="w-full max-w-[420px] bg-white rounded-3xl border border-slate-200/60 shadow-xl px-6 py-10 sm:p-10 flex flex-col items-center"
      >
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
          {isRegister
            ? 'Sign up to manage and document your organization'
            : 'Sign in with your username and password'}
        </p>

        {/* General Error Banner */}
        {generalError && (
          <div
            id="auth-error-banner"
            className="w-full mb-5 p-3.5 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 text-left animate-in fade-in"
          >
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span className="font-medium leading-relaxed">{generalError}</span>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div
            id="auth-success-banner"
            className="w-full mb-5 p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800 text-left animate-in fade-in"
          >
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span className="font-medium leading-relaxed">{successMessage}</span>
          </div>
        )}

        {/* Login/Register Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col" noValidate>
          {/* Username Field */}
          <div className="w-full text-left mb-4">
            <label
              htmlFor="auth-username"
              className="block text-[11px] font-extrabold tracking-wider text-slate-700 uppercase mb-1.5"
            >
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="auth-username"
                type="text"
                autoComplete="username"
                value={username}
                disabled={loading}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (fieldErrors.username) {
                    setFieldErrors((prev) => ({ ...prev, username: undefined }));
                  }
                  if (generalError) setGeneralError('');
                }}
                placeholder="Enter username"
                className={`w-full pl-10 pr-4 py-3 bg-white border ${
                  fieldErrors.username ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-200'
                } rounded-2xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all placeholder:text-slate-400 disabled:bg-slate-50`}
              />
            </div>
            {fieldErrors.username && (
              <p className="mt-1.5 text-xs text-rose-600 font-medium text-left">{fieldErrors.username}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="w-full text-left mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="auth-password"
                className="block text-[11px] font-extrabold tracking-wider text-slate-700 uppercase"
              >
                Password
              </label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotOpen(true);
                    setForgotSent(false);
                    setForgotEmail('');
                  }}
                  className="text-xs text-purple-700 hover:text-purple-800 font-bold transition-colors"
                >
                  Forgot?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                value={password}
                disabled={loading}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }
                  if (generalError) setGeneralError('');
                }}
                placeholder="••••••••"
                className={`w-full pl-10 pr-10 py-3 bg-white border ${
                  fieldErrors.password ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-200'
                } rounded-2xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all placeholder:text-slate-400 disabled:bg-slate-50`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1.5 text-xs text-rose-600 font-medium text-left">{fieldErrors.password}</p>
            )}
          </div>

          {/* Confirm Password (Register Only) */}
          {isRegister && (
            <div className="w-full text-left mb-6">
              <label
                htmlFor="auth-confirm-password"
                className="block text-[11px] font-extrabold tracking-wider text-slate-700 uppercase mb-1.5"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  disabled={loading}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }
                    if (generalError) setGeneralError('');
                  }}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-4 py-3 bg-white border ${
                    fieldErrors.confirmPassword ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-200'
                  } rounded-2xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all placeholder:text-slate-400 disabled:bg-slate-50`}
                />
              </div>
              {fieldErrors.confirmPassword && (
                <p className="mt-1.5 text-xs text-rose-600 font-medium text-left">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-[#4c1d95] hover:bg-[#3b0764] active:scale-[0.99] text-white font-bold rounded-2xl shadow-sm hover:shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm mt-2 mb-6 cursor-pointer disabled:cursor-not-allowed"
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
        <div className="text-center w-full pt-2 border-t border-slate-100">
          <p className="text-sm font-semibold text-slate-600">
            {isRegister ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleToggleMode(false)}
                  className="text-[#4c1d95] font-bold hover:underline transition-colors ml-1"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleToggleMode(true)}
                  className="text-[#4c1d95] font-bold hover:underline transition-colors ml-1"
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
          <div
            id="forgot-password-modal"
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden p-6 space-y-4 text-left"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-purple-700" />
                <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
              </div>
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
                <h4 className="font-bold text-emerald-900 text-sm">Instructions Dispatched</h4>
                <p className="text-xs text-emerald-700 leading-normal">
                  If an account exists for {forgotEmail}, password reset instructions have been recorded. You can also contact your organization head to update access.
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
                  Enter your registered username or email address and we will provide password reset instructions.
                </p>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Username or Email
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotEmail}
                    disabled={forgotLoading}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Enter your username or email"
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
                    disabled={forgotLoading}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {forgotLoading ? 'Sending...' : 'Send Instructions'}
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
