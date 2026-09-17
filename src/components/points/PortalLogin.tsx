import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { useApp } from '../../context/AppContext';
import { Shield, Lock, Mail, Eye, EyeOff, Users, Award, Info, CheckCircle2, User } from 'lucide-react';
import { motion } from 'motion/react';

interface PortalLoginProps {
  onJoinAsViewer: () => void;
}

export const PortalLogin: React.FC<PortalLoginProps> = ({ onJoinAsViewer }) => {
  const { loginPortalUser } = usePortal();
  const { user: masterUser } = useApp();
  
  const [roleMode, setRoleMode] = useState<'sub_org' | 'nsu_admin' | 'viewer'>('sub_org');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Auto-fill master admin email if choosing Admin mode
  const handleRoleChange = (role: 'sub_org' | 'nsu_admin') => {
    setRoleMode(role);
    setError('');
    if (role === 'nsu_admin' && masterUser?.email) {
      setEmail(masterUser.email);
    } else {
      setEmail('');
    }
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all credentials.');
      return;
    }

    setLoading(true);
    try {
      const ok = await loginPortalUser(email, password);
      if (ok) {
        setSuccess(true);
      } else {
        setError('Invalid login details. Please check with your portal admin.');
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto my-4 sm:my-8" id="portal-login-screen">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-8 space-y-5 sm:space-y-6"
      >
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center shadow-xs">
            <Award className="w-8 h-8 stroke-[2]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold font-heading text-slate-900">Points Portal Login</h2>
            <p className="text-xs text-slate-500">Class Achievements & Performance Ranking</p>
          </div>
        </div>

        {/* Role Select Buttons */}
        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/60 text-xs">
          <button
            type="button"
            id="role-sub-org"
            onClick={() => handleRoleChange('sub_org')}
            className={`py-2 px-1 font-semibold rounded-xl text-center transition-all cursor-pointer ${
              roleMode === 'sub_org'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/40 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sub-Org
          </button>
          <button
            type="button"
            id="role-nsu-admin"
            onClick={() => handleRoleChange('nsu_admin')}
            className={`py-2 px-1 font-semibold rounded-xl text-center transition-all cursor-pointer ${
              roleMode === 'nsu_admin'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/40 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Admin
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Login successful! Entering portal...</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700" htmlFor="portal-email">Email or Username</label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10 flex items-center justify-center">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                id="portal-email"
                required
                placeholder={roleMode === 'nsu_admin' ? 'admin@nsu.edu' : 'class1@nsu.edu'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || success}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-800"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700" htmlFor="portal-password">Password</label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                id="portal-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || success}
                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg focus:outline-none z-10 flex items-center justify-center"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {roleMode === 'nsu_admin' && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-800 leading-normal flex gap-2">
              <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p><strong>Admin Notice:</strong> Use your standard login credentials. For workspace admin testing, the master password bypass is <strong>1234</strong>.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-3 px-6 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-md transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Sign In securely'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
