import React, { useState, useEffect } from 'react';
import { PortalProvider, usePortal, SP_Organization, DEFAULT_PORTAL_ID } from '../../context/PortalContext';
import { useApp } from '../../context/AppContext';
import { PortalLogin } from './PortalLogin';
import { AdminDashboard } from './AdminDashboard';
import { SubOrgDashboard } from './SubOrgDashboard';
import { ViewerDashboard } from './ViewerDashboard';
import { PortalUnavailableScreen } from './PortalUnavailableScreen';
import { LogOut, Shield, Users, Award, Eye, EyeOff, Trophy, HelpCircle, Mail, Lock, User, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

const SubOrgRegistrationForm: React.FC<{ regCode: string; onBackToLogin: () => void }> = ({ regCode, onBackToLogin }) => {
  const { registerSubOrganization, getRegistrationLinkStatus, loginPortalUser } = usePortal();
  
  const [loadingLink, setLoadingLink] = useState(true);
  const [linkStatus, setLinkStatus] = useState<'pending' | 'completed' | 'not_found' | null>(null);
  const [linkLabel, setLinkLabel] = useState('');
  
  const [viewMode, setViewMode] = useState<'choose' | 'register' | 'login'>('choose');
  
  // Option 1 (Register) State
  const [orgName, setOrgName] = useState('');
  const [className, setClassName] = useState('');
  const [leader, setLeader] = useState('');
  const [contactDetails, setContactDetails] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Option 2 (Login) State
  const [loginFormEmail, setLoginFormEmail] = useState('');
  const [loginFormPassword, setLoginFormPassword] = useState('');
  const [showLoginFormPassword, setShowLoginFormPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    const checkLink = async () => {
      try {
        const status = await getRegistrationLinkStatus(regCode);
        if (status) {
          setLinkStatus(status.status);
          setLinkLabel(status.label);
        } else {
          setLinkStatus('not_found');
        }
      } catch (e) {
        setLinkStatus('not_found');
      } finally {
        setLoadingLink(false);
      }
    };
    checkLink();
  }, [regCode, getRegistrationLinkStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!orgName || !className || !loginEmail || !loginPassword) {
      setError('Please fill in all required fields (Organization Name, Class Name, Email, and Password).');
      return;
    }

    setSubmitting(true);
    try {
      const orgData: Omit<SP_Organization, 'id' | 'portalId' | 'totalPoints' | 'createdAt' | 'updatedAt'> = {
        name: orgName,
        className: className,
        logo: '',
        description: `Class Sub-Org registered via invite link for ${className}`,
        leader: leader,
        contactDetails: contactDetails,
        status: 'pending'
      };

      await registerSubOrganization(regCode, orgData, loginEmail, loginPassword);
      const autoLoginOk = await loginPortalUser(loginEmail, loginPassword);
      if (autoLoginOk) {
        onBackToLogin();
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to register the organization. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginFormEmail || !loginFormPassword) {
      setLoginError('Please enter both your email and password.');
      return;
    }

    setLoggingIn(true);
    try {
      const loginSuccess = await loginPortalUser(loginFormEmail, loginFormPassword);
      if (loginSuccess) {
        onBackToLogin(); // Clear invite parameters from the URL to display the sub-org dashboard instantly!
      } else {
        setLoginError('Incorrect email or password. Please verify your credentials.');
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoggingIn(false);
    }
  };

  if (loadingLink) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl border border-slate-200 p-8 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-sm text-slate-500">Verifying registration invite...</p>
      </div>
    );
  }

  if (linkStatus === 'not_found') {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900">Invalid Registration Link</h3>
        <p className="text-xs text-slate-500">This registration link is invalid, malformed, or has expired. Please ask your administrator to generate a new registration link.</p>
        <button
          onClick={onBackToLogin}
          className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          Go to Student Points Portal
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Registration Complete!</h3>
        <p className="text-xs text-slate-500">Your class sub-organization <strong>{orgName}</strong> was registered successfully. You can now log into the Student Points Portal with your email and password.</p>
        <button
          onClick={onBackToLogin}
          className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  // Segment 1: Selection screen showing Options 1 & 2
  if (viewMode === 'choose') {
    return (
      <div className="w-full max-w-lg mx-auto my-4 sm:my-8 px-2 sm:px-0">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-5 sm:p-8 space-y-5 sm:space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center shadow-xs">
              <Award className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold font-heading text-slate-900">Student Points Portal</h2>
              <p className="text-xs text-slate-500">Configure your class account or log in to submit extracurricular achievements</p>
            </div>
            {linkLabel && (
              <div className="inline-block px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-[10px] font-bold">
                Invitation Slot: {linkLabel}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:gap-4 pt-2">
            {/* Option 1 Option Card */}
            <button
              onClick={() => setViewMode('register')}
              className="text-left p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/20 transition-all cursor-pointer group flex gap-3 sm:gap-4 items-start"
            >
              <div className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-700 rounded-xl group-hover:bg-emerald-100 transition-colors flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">Create New Sub-Organization</h3>
                <p className="text-xs text-slate-500">Register a new class or grade level account to track points and achievements.</p>
              </div>
            </button>

            {/* Option 2 Option Card */}
            <button
              onClick={() => setViewMode('login')}
              className="text-left p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/20 transition-all cursor-pointer group flex gap-3 sm:gap-4 items-start"
            >
              <div className="p-2.5 sm:p-3 bg-slate-100 text-slate-700 rounded-xl group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors flex-shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">Already Have a Sub-Organization? Login</h3>
                <p className="text-xs text-slate-500">Access your dashboard using your existing credentials without duplicate registrations.</p>
              </div>
            </button>
          </div>

          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl transition-colors border border-slate-200 cursor-pointer text-center"
          >
            Cancel and Return to Portal
          </button>
        </motion.div>
      </div>
    );
  }

  // Segment 2: Registration option
  if (viewMode === 'register') {
    if (linkStatus === 'completed' && !success) {
      return (
        <div className="w-full max-w-md mx-auto my-4 sm:my-12 px-2 sm:px-0">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-6 sm:p-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900">Link Already Registered</h3>
            <p className="text-xs text-slate-500">This registration link has already been used to create an organization. To prevent duplicates, each registration link can only be used once.</p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => setViewMode('login')}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Already Have an Account? Login
              </button>
              <button
                onClick={() => setViewMode('choose')}
                className="w-full py-2 px-4 text-slate-500 hover:text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Back to Options
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full max-w-lg mx-auto my-4 sm:my-8 px-2 sm:px-0">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-5 sm:p-8 space-y-5 sm:space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center shadow-xs">
              <Award className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold font-heading text-slate-900">Add Sub-Organization</h2>
              <p className="text-xs text-slate-500">Create your own class account to submit achievements</p>
            </div>
            {linkLabel && (
              <div className="inline-block px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-[10px] font-bold">
                Slot: {linkLabel}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Organization Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fida Organization"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Class/Grade Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Class 3"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">President</label>
                <input
                  type="text"
                  placeholder="e.g. Ahmad Hasan"
                  value={leader}
                  onChange={(e) => setLeader(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Contact Details</label>
                <input
                  type="text"
                  placeholder="e.g. +966 50 123 4567"
                  value={contactDetails}
                  onChange={(e) => setContactDetails(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Account Credentials</h4>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Login Email or Username *</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="name@nsu.edu"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Login Password *</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10 flex items-center justify-center">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg focus:outline-none z-10 flex items-center justify-center"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-6 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-md transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
              <span>Create Class Account</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('choose')}
              className="w-full py-2 px-4 text-slate-500 hover:text-slate-800 text-xs font-semibold transition-colors cursor-pointer mt-2"
            >
              ← Back to Options
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Segment 3: Login option
  return (
    <div className="max-w-lg mx-auto my-12">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-8 space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold font-heading text-slate-900">Sub-Organization Login</h2>
            <p className="text-xs text-slate-500">Access your dashboard using your registered account credentials</p>
          </div>
          {linkLabel && (
            <div className="inline-block px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-[10px] font-bold">
              Invitation Slot: {linkLabel}
            </div>
          )}
        </div>

        {loginError && (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{loginError}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Login Email or Username *</label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10 flex items-center justify-center">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                placeholder="name@nsu.edu"
                value={loginFormEmail}
                onChange={(e) => setLoginFormEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Password *</label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showLoginFormPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={loginFormPassword}
                onChange={(e) => setLoginFormPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowLoginFormPassword(!showLoginFormPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg focus:outline-none z-10 flex items-center justify-center"
              >
                {showLoginFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loggingIn}
            className="w-full py-3 px-6 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-md transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loggingIn ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Login'
            )}
          </button>

          <button
            type="button"
            onClick={() => setViewMode('choose')}
            className="w-full py-2 px-4 text-slate-500 hover:text-slate-800 text-xs font-semibold transition-colors cursor-pointer mt-2"
          >
            ← Back to Options
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const StudentPointsInner: React.FC = () => {
  const { user, isAuthenticated } = useApp();
  const { 
    portalUser, 
    logoutPortalUser, 
    setPortalUserDirectly,
    portalStatus,
    portalErrorMessage,
    loading,
    rejectionInfo,
    clearRejectionInfo
  } = usePortal();
  const [explicitLogout, setExplicitLogout] = useState(false);

  // Check query parameter/hash for registration token
  const [regCode, setRegCode] = useState<string | null>(null);

  const isSuborgLink = window.location.search.includes('suborg=true') || window.location.hash.includes('suborg=true');
  const [suborgViewMode, setSuborgViewMode] = useState<'login' | 'register'>('login');
  const [showLogin, setShowLogin] = useState(false);

  // Direct registration states
  const { createClassOrganization, loginPortalUser } = usePortal();

  if (rejectionInfo?.isRejected) {
    return (
      <div className="w-full max-w-lg mx-auto my-8 px-4" id="org-rejection-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl border border-rose-200 p-8 text-center space-y-6 shadow-2xl"
        >
          <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <AlertCircle className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <span className="inline-block px-3.5 py-1 bg-rose-50 border border-rose-200 text-rose-800 rounded-full text-xs font-bold tracking-tight">
              ⚠️ Organization Access Rejected
            </span>
            <h3 className="text-xl font-bold font-heading text-slate-900">
              {rejectionInfo.title || 'Admin Rejected Your Class Organization'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line px-2">
              {rejectionInfo.message || `Your class organization "${rejectionInfo.organizationName}" has been rejected by the administrator.\n\nPlease contact the administrator if you believe this was a mistake.`}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                clearRejectionInfo();
              }}
              className="w-full py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-md transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }
  const [regOrgName, setRegOrgName] = useState('');
  const [regClassName, setRegClassName] = useState('');
  const [regLeader, setRegLeader] = useState('');
  const [regContactDetails, setRegContactDetails] = useState('');
  const [regLoginEmail, setRegLoginEmail] = useState('');
  const [regLoginPassword, setRegLoginPassword] = useState('');
  const [showRegLoginPassword, setShowRegLoginPassword] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Direct login states
  const [loginFormEmail, setLoginFormEmail] = useState('');
  const [loginFormPassword, setLoginFormPassword] = useState('');
  const [showLoginFormPassword, setShowLoginFormPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const handleDirectRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!regOrgName || !regClassName || !regLoginEmail || !regLoginPassword) {
      setRegError('Please fill in all required fields (Organization Name, Class/Grade Name, Login Email, and Login Password).');
      return;
    }
    setRegSubmitting(true);
    try {
      await createClassOrganization({
        name: regOrgName,
        className: regClassName,
        logo: '',
        description: `Class registered directly through shared portal for ${regClassName}`,
        leader: regLeader,
        contactDetails: regContactDetails,
        status: 'pending'
      }, regLoginEmail, regLoginPassword);

      // Immediately log in!
      const ok = await loginPortalUser(regLoginEmail, regLoginPassword);
      if (ok) {
        setRegOrgName('');
        setRegClassName('');
        setRegLeader('');
        setRegContactDetails('');
        setRegLoginEmail('');
        setRegLoginPassword('');
        setRegError('');
      } else {
        setRegError('Registration succeeded, but auto-login failed. Please log in using the Login option.');
        setSuborgViewMode('login');
      }
    } catch (err: any) {
      setRegError(err?.message || 'Failed to create the class account. Please try again.');
    } finally {
      setRegSubmitting(false);
    }
  };

  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginFormEmail || !loginFormPassword) {
      setLoginError('Please enter both your email/username and password.');
      return;
    }
    setLoggingIn(true);
    try {
      const ok = await loginPortalUser(loginFormEmail, loginFormPassword);
      if (ok) {
        setLoginFormEmail('');
        setLoginFormPassword('');
        setLoginError('');
      } else {
        setLoginError('Incorrect email or password. Please verify your credentials.');
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoggingIn(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const regCodeFromQuery = params.get('reg');
    
    let regCodeFromHash = null;
    if (window.location.hash.includes('reg=')) {
      const hashParts = window.location.hash.split('reg=');
      if (hashParts.length > 1) {
        regCodeFromHash = hashParts[1].split('&')[0];
      }
    }
    
    const token = regCodeFromQuery || regCodeFromHash;
    if (token) {
      setRegCode(token);
    }
  }, []);

  // Auto-login as Admin on load ONLY if user is authenticated in the main Munazzam app
  useEffect(() => {
    if (isAuthenticated && user?.id && !portalUser && !explicitLogout) {
      const adminUser: any = {
        id: user.id,
        portalId: user.id,
        organizationId: null,
        email: user.email || 'admin@munazzam.app',
        role: 'nsu_admin',
        name: user.name || 'Munazzam Admin',
        status: 'active'
      };
      setPortalUserDirectly(adminUser);
    }
  }, [isAuthenticated, user?.id, user?.email, user?.name, portalUser, explicitLogout, setPortalUserDirectly]);

  const handleExit = () => {
    if (portalUser) {
      logoutPortalUser();
      setExplicitLogout(true);
    }
  };

  const handleBackToLogin = () => {
    setRegCode(null);
    // Remove reg from URL query
    const url = new URL(window.location.href);
    url.searchParams.delete('reg');
    window.history.replaceState({}, '', url.toString());
  };

  // For unauthenticated external visitors: check portal status
  if (!isAuthenticated && !portalUser) {
    if (portalStatus === 'loading' || (portalStatus === 'active' && loading)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3" id="points-portal-loading-view">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-xs font-semibold text-slate-500 tracking-wide">Connecting to Points Portal...</p>
        </div>
      );
    }

    if (portalStatus === 'invalid' || portalStatus === 'disabled' || portalStatus === 'missing') {
      return <PortalUnavailableScreen reason={portalStatus} message={portalErrorMessage || undefined} />;
    }
  }

  const getRoleLabel = () => {
    if (portalUser?.role === 'super_admin' || portalUser?.role === 'nsu_admin') {
      return (
        <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold rounded-full flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-amber-600" />
          Admin
        </span>
      );
    }
    if (portalUser?.role === 'sub_org_admin') {
      return (
        <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-full flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-emerald-600" />
          Class Sub-Org Admin
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold rounded-full flex items-center gap-1.5">
        <Eye className="w-3.5 h-3.5 text-sky-600" />
        Public Student Viewer
      </span>
    );
  };

  // If a registration invite is present, render the "Add Sub-Organization" form directly!
  if (regCode) {
    return (
      <div className="space-y-6" id="student-points-register-invite-wrapper">
        <SubOrgRegistrationForm regCode={regCode} onBackToLogin={handleBackToLogin} />
      </div>
    );
  }

  // If not authenticated, show login screen
  if (!portalUser) {
    if (showLogin) {
      if (isSuborgLink) {
      return (
        <div className="w-full max-w-lg mx-auto my-4 sm:my-8 px-2 sm:px-0" id="direct-suborg-portal-access">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-5 sm:p-8 space-y-5 sm:space-y-6"
          >
            {/* Direct Header Branding */}
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center shadow-xs">
                <Award className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold font-heading text-slate-900">Student Points Portal</h2>
                <p className="text-xs text-slate-500">
                  {suborgViewMode === 'login'
                    ? 'Access your class account or register to submit extracurricular achievements'
                    : 'Create your new class or grade level account to track points and achievements'}
                </p>
              </div>
            </div>

            {suborgViewMode === 'login' ? (
              // DIRECT LOGIN FORM
              <form onSubmit={handleDirectLogin} className="space-y-4">
                {loginError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Email or Username *</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10 flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="name@nsu.edu"
                      value={loginFormEmail}
                      onChange={(e) => setLoginFormEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Password *</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10 flex items-center justify-center">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showLoginFormPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={loginFormPassword}
                      onChange={(e) => setLoginFormPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginFormPassword(!showLoginFormPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg focus:outline-none z-10 flex items-center justify-center"
                    >
                      {showLoginFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loggingIn}
                  className="w-full py-3 px-6 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-md transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loggingIn ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Login to Class Account'
                  )}
                </button>

                <div className="border-t border-slate-100 pt-4 text-center">
                  <p className="text-xs text-slate-500 mb-2">Don't have an account yet?</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSuborgViewMode('register');
                      setRegError('');
                    }}
                    className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-emerald-800 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer"
                  >
                    Create New Sub-Organization
                  </button>
                </div>
              </form>
            ) : (
              // DIRECT REGISTRATION FORM
              <form onSubmit={handleDirectRegister} className="space-y-4">
                {regError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                    <span>{regError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Organization Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Fida Organization"
                      value={regOrgName}
                      onChange={(e) => setRegOrgName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Class/Grade Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Class 3"
                      value={regClassName}
                      onChange={(e) => setRegClassName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">President</label>
                    <input
                      type="text"
                      placeholder="e.g. Ahmad Hasan"
                      value={regLeader}
                      onChange={(e) => setRegLeader(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Contact Details</label>
                    <input
                      type="text"
                      placeholder="e.g. +966 50 123 4567"
                      value={regContactDetails}
                      onChange={(e) => setRegContactDetails(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Account Credentials</h4>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Login Email or Username *</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10 flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="name@nsu.edu"
                        value={regLoginEmail}
                        onChange={(e) => setRegLoginEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Login Password *</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10 flex items-center justify-center">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type={showRegLoginPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={regLoginPassword}
                        onChange={(e) => setRegLoginPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegLoginPassword(!showRegLoginPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg focus:outline-none z-10 flex items-center justify-center"
                      >
                        {showRegLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={regSubmitting}
                  className="w-full py-3 px-6 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-md transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {regSubmitting && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                  <span>Create Class Account</span>
                </button>

                <div className="border-t border-slate-100 pt-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setSuborgViewMode('login');
                      setLoginError('');
                    }}
                    className="text-slate-500 hover:text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    ← Already Have a Sub-Organization? Login
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      );
    }

    return <PortalLogin />;
  }

  // Public Mode Default: Show clean responsive header with [ Login as Sub-Org ] button, and render the ViewerDashboard directly
  return (
    <div className="space-y-6" id="public-portal-dashboard-wrapper">
      {/* Public Header with Login Button */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xs">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
            <Trophy className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 font-heading">Student Points Portal</h2>
            <p className="text-xs text-slate-500">Public Live Standings and Conferred Honors</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSuborgViewMode('login');
              setShowLogin(true);
            }}
            className="py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Login as Sub-Org</span>
          </button>
        </div>
      </div>

      <ViewerDashboard />
    </div>
  );
}

  return (
    <div className="space-y-6" id="student-points-inner-wrapper">
      {/* Render proper workspace view */}
      {(portalUser?.role === 'super_admin' || portalUser?.role === 'nsu_admin') && <AdminDashboard />}
      {portalUser?.role === 'sub_org_admin' && <SubOrgDashboard />}

      {/* Portal workspace footer control */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xs">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
            <Trophy className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 font-heading">Student Points Management</h2>
            <p className="text-xs text-slate-500">Workspace Portal Context Isolation</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {getRoleLabel()}
          <button
            onClick={handleExit}
            className="py-1.5 px-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const StudentPointsPortal: React.FC = () => {
  return (
    <PortalProvider>
      <div className="space-y-4 sm:space-y-6" id="student-points-portal-root">
        {/* Main Heading */}
        <div className="bg-emerald-50/40 border border-emerald-100/60 rounded-2xl sm:rounded-3xl px-4 py-3 sm:px-6 sm:py-3.5 flex items-center justify-center sm:justify-start">
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 font-heading tracking-tight">
            Student Points Management
          </h1>
        </div>

        <StudentPointsInner />
      </div>
    </PortalProvider>
  );
};
