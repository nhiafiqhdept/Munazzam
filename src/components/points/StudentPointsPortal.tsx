import React, { useState } from 'react';
import { PortalProvider, usePortal } from '../../context/PortalContext';
import { PortalLogin } from './PortalLogin';
import { AdminDashboard } from './AdminDashboard';
import { SubOrgDashboard } from './SubOrgDashboard';
import { ViewerDashboard } from './ViewerDashboard';
import { LogOut, Shield, Users, Award, Eye, Trophy, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

const StudentPointsInner: React.FC = () => {
  const { portalUser, logoutPortalUser } = usePortal();
  const [isViewer, setIsViewer] = useState(false);

  const handleExit = () => {
    if (portalUser) {
      logoutPortalUser();
    } else {
      setIsViewer(false);
    }
  };

  const getRoleLabel = () => {
    if (portalUser?.role === 'super_admin' || portalUser?.role === 'nsu_admin') {
      return (
        <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold rounded-full flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-amber-600" />
          NSU Super Admin
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

  // If not authenticated and not viewer, show login screen
  if (!portalUser && !isViewer) {
    return <PortalLogin onJoinAsViewer={() => setIsViewer(true)} />;
  }

  return (
    <div className="space-y-6" id="student-points-inner-wrapper">
      {/* Portal workspace top control header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xs">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
            <Trophy className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 font-heading">NSU Student Points Management</h2>
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
            <span>{portalUser ? 'Log Out' : 'Exit Viewer'}</span>
          </button>
        </div>
      </div>

      {/* Render proper workspace view */}
      {(portalUser?.role === 'super_admin' || portalUser?.role === 'nsu_admin') && <AdminDashboard />}
      {portalUser?.role === 'sub_org_admin' && <SubOrgDashboard />}
      {!portalUser && isViewer && <ViewerDashboard />}
    </div>
  );
};

export const StudentPointsPortal: React.FC = () => {
  return (
    <PortalProvider>
      <div className="space-y-6" id="student-points-portal-root">
        {/* Decorative background visual */}
        <div className="bg-emerald-50/40 border border-emerald-100/60 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-slate-900 font-heading">Student Points Management</h1>
            <p className="text-xs text-slate-500">Evaluate extracurricular activities, assign scores, and view leaderboards live.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-800 font-bold bg-white/80 py-2 px-4 rounded-2xl border border-emerald-100/40">
            <Award className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>NSU Campus League System</span>
          </div>
        </div>

        <StudentPointsInner />
      </div>
    </PortalProvider>
  );
};
