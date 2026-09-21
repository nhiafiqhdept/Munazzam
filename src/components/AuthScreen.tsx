import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, LogIn, UserPlus, Lock, Mail, Eye, EyeOff, HelpCircle, Search } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { getFirebaseErrorMessage } from '../utils/firebaseErrors';
import { DEFAULT_ORG_LOGO } from '../utils/helpers';
import { AuthUser } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

function logAuthDiagnostic(context: string, err: any) {
  console.error(`[Firebase Auth Diagnostic - ${context}]`, {
    code: err?.code || 'UNKNOWN_CODE',
    message: err?.message || String(err),
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
    projectId: firebaseConfig?.projectId || 'unknown',
    authDomain: firebaseConfig?.authDomain || 'unknown',
  });
}

interface AuthScreenProps {
  onLoginSuccess: (token: string, user: AuthUser) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
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
  const [forgotError, setForgotError] = useState('');

  const [publicSearchQuery, setPublicSearchQuery] = useState('');
  const [publicSearching, setPublicSearching] = useState(false);
  const [publicSearchResult, setPublicSearchResult] = useState<{ searchableName: string; name: string } | null>(null);
  const [publicSearchError, setPublicSearchError] = useState('');

  const handlePublicSearch = async () => {
    setPublicSearchError('');
    setPublicSearchResult(null);
    const queryTerm = publicSearchQuery.trim().toUpperCase();
    if (!queryTerm) {
      setPublicSearchError('Please enter a searchable organization name.');
      return;
    }

    try {
      setPublicSearching(true);
      const querySnapshot = await getDocs(collection(db, 'accounts'));
      let found = null;
      for (const docSnap of querySnapshot.docs) {
        const accData = docSnap.data();
        const profile = accData.profile || {};
        const sName = (profile.searchableName || '').trim().toUpperCase();
        if (sName === queryTerm) {
          found = {
            searchableName: sName,
            name: profile.name || 'Organization',
          };
          break;
        }
      }

      if (found) {
        setPublicSearchResult(found);
      } else {
        setPublicSearchError('Organization not found with that searchable name.');
      }
    } catch (err) {
      console.error('Public search error:', err);
      setPublicSearchError('Failed to search organization. Please try again.');
    } finally {
      setPublicSearching(false);
    }
  };
  const lastName = localStorage.getItem('last_org_name') || 'Munazzam Organization Portal';

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

    const cleanEmail = email.trim();
    const errors: typeof fieldErrors = {};

    if (!cleanEmail) {
      errors.email = 'Email address is required.';
    } else if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      errors.email = 'Please enter a valid email address.';
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
      if (isRegister) {
        // 1. Register with Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const firebaseUser = userCredential.user;

        // 2. Provision Firestore Account Document indexed by Firebase UID
        const accountRef = doc(db, 'accounts', firebaseUser.uid);
        const now = new Date().toISOString();
        await setDoc(accountRef, {
          accountId: firebaseUser.uid,
          email: firebaseUser.email,
          createdAt: now,
          updatedAt: now,
          status: 'active',
          profile: {
            name: 'My Organization',
            college_name: 'Main Campus',
            tagline: 'Excellence in Action',
            logo: '',
            email: firebaseUser.email,
          },
          settings: {
            theme: 'light',
          },
        });

        setSuccessMessage('Account created successfully! Redirecting to dashboard...');

        const token = await firebaseUser.getIdToken();
        const authUser: AuthUser = {
          id: firebaseUser.uid,
          username: cleanEmail.split('@')[0],
          email: firebaseUser.email || cleanEmail,
          role: 'admin',
        };

        setTimeout(() => {
          onLoginSuccess(token, authUser);
        }, 500);
      } else {
        // 1. Sign In with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const firebaseUser = userCredential.user;

        // 2. Verify or Auto-Create Firestore Account Document
        const accountRef = doc(db, 'accounts', firebaseUser.uid);
        const docSnap = await getDoc(accountRef);
        if (!docSnap.exists()) {
          const now = new Date().toISOString();
          await setDoc(accountRef, {
            accountId: firebaseUser.uid,
            email: firebaseUser.email,
            createdAt: now,
            updatedAt: now,
            status: 'active',
            profile: {
              name: 'My Organization',
              college_name: 'Main Campus',
              tagline: 'Excellence in Action',
              logo: '',
              email: firebaseUser.email,
            },
          });
        }

        setSuccessMessage('Authenticated successfully! Redirecting...');

        const token = await firebaseUser.getIdToken();
        const authUser: AuthUser = {
          id: firebaseUser.uid,
          username: cleanEmail.split('@')[0],
          email: firebaseUser.email || cleanEmail,
          role: 'admin',
        };

        setTimeout(() => {
          onLoginSuccess(token, authUser);
        }, 500);
      }
    } catch (err: any) {
      logAuthDiagnostic('Email/Password Auth', err);
      const friendlyMessage = getFirebaseErrorMessage(err);
      setGeneralError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address.');
      return;
    }

    setForgotLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim());
      setForgotSent(true);
    } catch (err: any) {
      logAuthDiagnostic('Password Reset', err);
      setForgotError(getFirebaseErrorMessage(err));
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
        {/* Munazzam App Icon & Branding */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-slate-900 border border-emerald-500/30 p-2 flex items-center justify-center overflow-hidden mb-3.5 shadow-md shrink-0">
            <img
              src="/icon-192x192.png"
              alt="Munazzam"
              className="w-full h-full object-contain rounded-xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/icon.svg';
              }}
            />
          </div>
          <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-heading">
            Munazzam
          </span>
          <span className="text-[11px] font-semibold text-emerald-800 tracking-wide">
            Organization Management Platform
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 text-center mb-1">
          {isRegister ? 'Create Administrator Account' : 'Sign in to your account'}
        </h1>

        {/* Subtitle */}
        <p className="text-xs text-slate-500 text-center mb-6">
          {isRegister
            ? 'Sign up with your credentials to start managing records'
            : 'Enter your credentials to access your organization workspace'}
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
          {/* Email Field */}
          <div className="w-full text-left mb-4">
            <label
              htmlFor="auth-email"
              className="block text-[11px] font-extrabold tracking-wider text-slate-700 uppercase mb-1.5"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                disabled={loading}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }
                  if (generalError) setGeneralError('');
                }}
                placeholder="name@organization.org"
                className={`w-full pl-10 pr-4 py-3 bg-white border ${
                  fieldErrors.email ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-200'
                } rounded-2xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all placeholder:text-slate-400 disabled:bg-slate-50`}
              />
            </div>
            {fieldErrors.email && (
              <p className="mt-1.5 text-xs text-rose-600 font-medium text-left">{fieldErrors.email}</p>
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
                    setForgotEmail(email);
                    setForgotError('');
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

        {/* PUBLIC VIEW SECTION */}
        <div className="mt-6 pt-6 border-t border-slate-200 mb-4">
          <div className="text-center mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Public View</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Search and view an organization without signing in.</p>
          </div>
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={publicSearchQuery}
              onChange={(e) => setPublicSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handlePublicSearch();
                }
              }}
              placeholder="Search organization..."
              className="w-full pl-10 pr-24 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <button
              type="button"
              onClick={handlePublicSearch}
              disabled={publicSearching}
              className="absolute right-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {publicSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {publicSearchResult && (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between animate-in fade-in">
              <div>
                <span className="font-bold text-emerald-900 text-xs block">{publicSearchResult.searchableName}</span>
                <span className="text-slate-600 text-[11px] block">{publicSearchResult.name}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.location.hash = `#public_org=${encodeURIComponent(publicSearchResult.searchableName)}`;
                  window.location.reload();
                }}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                View Public Organization
              </button>
            </div>
          )}

          {publicSearchError && (
            <p className="text-rose-600 text-xs mt-2 text-center font-medium animate-in fade-in">{publicSearchError}</p>
          )}
        </div>

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
                  setForgotError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {forgotSent ? (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-emerald-900 text-sm">Password reset email sent</h4>
                <p className="text-xs text-emerald-700 leading-normal">
                  If an account exists for {forgotEmail}, password reset instructions have been sent. Please check your inbox.
                </p>
                <button
                  onClick={() => {
                    setIsForgotOpen(false);
                    setForgotSent(false);
                    setForgotEmail('');
                    setForgotError('');
                  }}
                  className="mt-2 px-4 py-2 bg-purple-700 text-white text-xs font-bold rounded-xl"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your registered email address and we will send a password reset link.
                </p>

                {forgotError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    disabled={forgotLoading}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@organization.org"
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
                    {forgotLoading ? 'Sending...' : 'Send Reset Link'}
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
