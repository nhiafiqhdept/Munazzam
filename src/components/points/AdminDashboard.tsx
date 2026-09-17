import React, { useState } from 'react';
import { usePortal, SP_Organization, SP_Achievement, SP_Category, SP_Award, AwardWinner, getAwardWinners, getWinnerDisplayName, getWinnerSubtext } from '../../context/PortalContext';
import { useApp } from '../../context/AppContext';
import { 
  Trophy, Plus, Users, Award, Star, Settings, Megaphone, ShieldAlert, CheckCircle2,
  ListFilter, Eye, Check, X, FileText, Calendar, MapPin, Film, History, Loader2, AlertCircle,
  Building, ChevronLeft, ChevronRight, Search, ArrowUpDown, Download, Play,
  Link as LinkIcon, ExternalLink, RefreshCw, Power, Copy, User, UserCheck, Edit3, Trash2, MoreVertical, Sliders, Lock
} from 'lucide-react';
import { motion } from 'motion/react';
import { formatDate, generateId } from '../../utils/helpers';

export const AdminDashboard: React.FC = () => {
  const { user } = useApp();
  const { 
    portal, toggleSubmissionsAllowed,
    organizations, achievements, categories, mediaAttachments, awards, announcements, competitions, auditLogs, transactions,
    members, createClassOrganization, updateClassOrganization, deleteClassOrganization, rejectClassOrganization, approveClassOrganization, reviewAchievement, addCategory, deleteCategory,
    addCompetition, completeCompetition, addAward, updateAward, deleteAward, addAnnouncement,
    registrationLinks, generateRegistrationLink,
    updateAchievementAchiever, recalculateLeaderboardTotals, addMember,
    portalLink, portalLinkLoading, generateAccountPortalLink, togglePortalLinkStatus, regenerateAccountPortalLink
  } = usePortal();

  const [activeTab, setActiveTab] = useState<'review' | 'organizations' | 'categories' | 'competitions' | 'awards' | 'announcements' | 'audit'>('review');
  const [selectedAchievement, setSelectedAchievement] = useState<SP_Achievement | null>(null);

  // Achiever assignment in review modal
  const [isEditingAchiever, setIsEditingAchiever] = useState(false);
  const [targetAchieverId, setTargetAchieverId] = useState('');
  const [targetAchieverName, setTargetAchieverName] = useState('');
  const [targetAchieverStudentId, setTargetAchieverStudentId] = useState('');
  const [savingAchiever, setSavingAchiever] = useState(false);

  // Invitation invite state
  const [inviteLabel, setInviteLabel] = useState('');
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);

  // Account-specific portal link state & actions
  const [portalActionLoading, setPortalActionLoading] = useState(false);
  const [portalActionMessage, setPortalActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleGeneratePortalLink = async () => {
    setPortalActionLoading(true);
    setPortalActionMessage(null);
    try {
      await generateAccountPortalLink();
      setPortalActionMessage({ type: 'success', text: 'Points Portal link generated successfully!' });
      setTimeout(() => setPortalActionMessage(null), 4000);
    } catch (e: any) {
      setPortalActionMessage({ type: 'error', text: e?.message || 'Failed to generate Points Portal link.' });
    } finally {
      setPortalActionLoading(false);
    }
  };

  const handleTogglePortalStatus = async () => {
    if (!portalLink) return;
    setPortalActionLoading(true);
    setPortalActionMessage(null);
    try {
      const nextStatus = portalLink.status === 'active' ? 'disabled' : 'active';
      await togglePortalLinkStatus(nextStatus);
      setPortalActionMessage({ 
        type: 'success', 
        text: nextStatus === 'active' ? 'Points Portal link re-activated.' : 'Points Portal link disabled.' 
      });
      setTimeout(() => setPortalActionMessage(null), 4000);
    } catch (e: any) {
      setPortalActionMessage({ type: 'error', text: e?.message || 'Failed to update link status.' });
    } finally {
      setPortalActionLoading(false);
    }
  };

  const handleRegeneratePortalLink = async () => {
    if (!window.confirm('Are you sure you want to regenerate your Points Portal link? The previous URL and token will immediately stop working.')) {
      return;
    }
    setPortalActionLoading(true);
    setPortalActionMessage(null);
    try {
      await regenerateAccountPortalLink();
      setPortalActionMessage({ type: 'success', text: 'Points Portal link regenerated with a new secure token.' });
      setTimeout(() => setPortalActionMessage(null), 4000);
    } catch (e: any) {
      setPortalActionMessage({ type: 'error', text: e?.message || 'Failed to regenerate link.' });
    } finally {
      setPortalActionLoading(false);
    }
  };

  // Submissions allowance toggle
  const [togglingSubmissions, setTogglingSubmissions] = useState(false);

  const handleToggleSubmissions = async () => {
    const currentlyAllowed = portal?.submissionsAllowed !== false;
    const nextState = !currentlyAllowed;
    if (!window.confirm(nextState 
      ? 'Are you sure you want to OPEN achievement submissions for all class organizations?' 
      : 'Are you sure you want to PAUSE achievement submissions? Class organizations will not be able to submit new achievements until reopened.'
    )) {
      return;
    }
    setTogglingSubmissions(true);
    try {
      await toggleSubmissionsAllowed(nextState);
    } catch (err: any) {
      alert(err?.message || 'Failed to update submissions status');
    } finally {
      setTogglingSubmissions(false);
    }
  };

  // Public URL formatter (maps internal AI Studio dev preview host to public shared preview host)
  const getPublicOrigin = () => {
    let origin = window.location.origin;
    if (origin.includes('ais-dev-')) {
      origin = origin.replace('ais-dev-', 'ais-pre-');
    }
    return origin;
  };

  const getFullRegistrationUrl = (linkId: string) => {
    const baseUrl = getPublicOrigin() + window.location.pathname;
    return `${baseUrl}?reg=${linkId}`;
  };

  const handleCopyLink = (linkId: string) => {
    const fullUrl = getFullRegistrationUrl(linkId);
    navigator.clipboard.writeText(fullUrl);
    setCopiedLinkId(linkId);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  // Redesigned review workflow state
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<string>('newest');

  // Point evaluation fields
  const [baseAwardedPoints, setBaseAwardedPoints] = useState<number>(10);
  const [bonusPoints, setBonusPoints] = useState<number>(0);
  const [deductionPoints, setDeductionPoints] = useState<number>(0);

  // Stats
  const pendingAchievements = achievements.filter(a => a.status === 'Submitted' || a.status === 'Under Review');
  const totalPointsAwarded = achievements
    .filter(a => a.status === 'Approved')
    .reduce((acc, curr) => acc + (Number(curr.awardedPoints) || 0), 0);

  // Forms states
  const [reviewPoints, setReviewPoints] = useState<number>(10);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [reviewLoading, setReviewLoading] = useState<boolean>(false);

  // 1. Org form state & deletion state
  const [orgName, setOrgName] = useState('');
  const [orgClass, setOrgClass] = useState('');
  const [orgLeader, setOrgLeader] = useState('');
  const [orgContact, setOrgContact] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgPass, setOrgPass] = useState('');
  const [orgDesc, setOrgDesc] = useState('');
  const [orgError, setOrgError] = useState('');
  const [orgSuccess, setOrgSuccess] = useState('');
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<SP_Organization | null>(null);
  const [orgToApprove, setOrgToApprove] = useState<SP_Organization | null>(null);
  const [isDeletingOrg, setIsDeletingOrg] = useState<boolean>(false);
  const [isApprovingOrg, setIsApprovingOrg] = useState<boolean>(false);
  const [activeOrgMenuId, setActiveOrgMenuId] = useState<string | null>(null);
  const [orgActionError, setOrgActionError] = useState<string>('');
  const [orgActionSuccess, setOrgActionSuccess] = useState<string>('');

  // 2. Category form
  const [catName, setCatName] = useState('');
  const [catPoints, setCatPoints] = useState<number>(15);
  const [catError, setCatError] = useState('');
  const [catSuccess, setCatSuccess] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<SP_Category | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState<boolean>(false);

  // 3. Competition form
  const [compName, setCompName] = useState('');
  const [compStart, setCompStart] = useState('');
  const [compEnd, setCompEnd] = useState('');

  // 4. Award form
  const [awName, setAwName] = useState('');
  const [awDesc, setAwDesc] = useState('');
  const [awRecipientType, setAwRecipientType] = useState<'class_organization' | 'individual'>('class_organization');
  const [awOrgId1, setAwOrgId1] = useState('');
  const [awOrgId2, setAwOrgId2] = useState('');
  const [awOrgId3, setAwOrgId3] = useState('');
  const [awIndId1, setAwIndId1] = useState('');
  const [awIndId2, setAwIndId2] = useState('');
  const [awIndId3, setAwIndId3] = useState('');
  const [awPeriod, setAwPeriod] = useState('');

  // Award Edit Modal state
  const [editingAward, setEditingAward] = useState<SP_Award | null>(null);
  const [editAwName, setEditAwName] = useState('');
  const [editAwDesc, setEditAwDesc] = useState('');
  const [editAwRecipientType, setEditAwRecipientType] = useState<'class_organization' | 'individual'>('class_organization');
  const [editAwOrgId1, setEditAwOrgId1] = useState('');
  const [editAwOrgId2, setEditAwOrgId2] = useState('');
  const [editAwOrgId3, setEditAwOrgId3] = useState('');
  const [editAwIndId1, setEditAwIndId1] = useState('');
  const [editAwIndId2, setEditAwIndId2] = useState('');
  const [editAwIndId3, setEditAwIndId3] = useState('');

  // 5. Announcement form
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  const getOrgName = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    return org ? org.name : 'Unknown Class';
  };

  const getCategoryName = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? cat.name : 'General Achievement';
  };

  const getMediaForAchievement = (achId: string) => {
    return mediaAttachments.filter(m => m.achievementId === achId);
  };

  const handleCreateOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgError('');
    setOrgSuccess('');

    // if (organizations.length >= 10) {
    //   setOrgError('You can manage a maximum of 10 class sub-organizations under NSU.');
    //   return;
    // }

    if (!orgName || !orgClass || !orgEmail || !orgPass) {
      setOrgError('Please fill in Name, Class, Login Email, and Password.');
      return;
    }

    setOrgLoading(true);
    try {
      await createClassOrganization({
        name: orgName,
        className: orgClass,
        leader: orgLeader,
        contactDetails: orgContact,
        description: orgDesc,
        logo: '',
        status: 'active'
      }, orgEmail, orgPass);

      setOrgName('');
      setOrgClass('');
      setOrgLeader('');
      setOrgContact('');
      setOrgEmail('');
      setOrgPass('');
      setOrgDesc('');
      setOrgSuccess('Class sub-organization successfully created!');
    } catch (err: any) {
      setOrgError(err?.message || 'Failed to create organization. Email may be already taken.');
    } finally {
      setOrgLoading(false);
    }
  };

  const handleReviewAction = async (status: 'Approved' | 'Rejected' | 'Returned for Correction') => {
    if (!selectedAchievement) return;
    setReviewLoading(true);
    try {
      const finalPoints = status === 'Approved' ? Math.max(0, baseAwardedPoints + bonusPoints - deductionPoints) : 0;
      await reviewAchievement(
        selectedAchievement.id, 
        status, 
        finalPoints, 
        reviewNotes,
        baseAwardedPoints,
        bonusPoints,
        deductionPoints
      );
      setSelectedAchievement(null);
      setReviewNotes('');
    } catch (e) {
      console.error(e);
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="space-y-6" id="admin-portal-dashboard">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-3.5 sm:p-5 flex flex-col justify-between shadow-xs">
          <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Sub-Organizations</p>
          <div className="flex flex-wrap items-baseline gap-1 sm:gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-800">{organizations.length}</span>
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500">TOTAL</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-3.5 sm:p-5 flex flex-col justify-between shadow-xs">
          <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Pending Reviews</p>
          <div className="flex flex-wrap items-baseline gap-1 sm:gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-600">{pendingAchievements.length}</span>
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500">SUBMISSIONS</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-3.5 sm:p-5 flex flex-col justify-between shadow-xs">
          <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Total Points</p>
          <div className="flex flex-wrap items-baseline gap-1 sm:gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-800">{totalPointsAwarded}</span>
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500">POINTS</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl border border-emerald-100 p-3.5 sm:p-5 flex flex-col justify-between shadow-xs bg-emerald-50/20">
          <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Top Performer</p>
          <p className="font-extrabold text-emerald-950 text-xs sm:text-base mt-2 truncate">
            {organizations[0] ? `${organizations[0].name} (${organizations[0].totalPoints} pts)` : 'None'}
          </p>
        </div>
      </div>

      {/* Pending Sub-Organizations Alert Banner */}
      {organizations.filter(o => o.status === 'pending').length > 0 && (
        <div className="space-y-3" id="admin-pending-orgs-alerts">
          {organizations.filter(o => o.status === 'pending').map((pendingOrg) => (
            <div 
              key={pendingOrg.id}
              className="bg-amber-50/90 border border-amber-200 rounded-3xl p-4 sm:p-5 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 flex-shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900 font-heading">
                      New Class Organization Pending Approval
                    </h3>
                    <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Pending Approval
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <span className="font-bold text-slate-800">{pendingOrg.name}</span> has registered using the shared registration code and is waiting for confirmation.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-600">
                    <div>
                      <span className="text-slate-400 block font-semibold">Organization:</span>
                      <span className="font-bold text-slate-800 truncate">{pendingOrg.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Leader:</span>
                      <span className="font-bold text-slate-800 truncate">{pendingOrg.leader || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Registered:</span>
                      <span className="font-bold text-slate-800">{new Date(pendingOrg.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Status:</span>
                      <span className="font-bold text-amber-800">Pending Approval</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Approve / Reject Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                <button
                  type="button"
                  onClick={() => {
                    setOrgActionError('');
                    setOrgActionSuccess('');
                    setOrgToApprove(pendingOrg);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrgActionError('');
                    setOrgActionSuccess('');
                    setOrgToDelete(pendingOrg);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin tabs menu */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('review')}
          className={`py-3.5 px-5 font-bold text-xs border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'review' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Review Submissions ({pendingAchievements.length})
        </button>
        <button
          onClick={() => setActiveTab('organizations')}
          className={`py-3.5 px-5 font-bold text-xs border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'organizations' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Class Organizations</span>
          {organizations.filter(o => o.status === 'pending').length > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300 rounded-full">
              {organizations.filter(o => o.status === 'pending').length} Pending
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`py-3.5 px-5 font-bold text-xs border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'categories' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Point Categories
        </button>
        <button
          onClick={() => setActiveTab('competitions')}
          className={`py-3.5 px-5 font-bold text-xs border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'competitions' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Evaluation Periods
        </button>
        <button
          onClick={() => setActiveTab('awards')}
          className={`py-3.5 px-5 font-bold text-xs border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'awards' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Awards Manager
        </button>
        <button
          onClick={() => setActiveTab('announcements')}
          className={`py-3.5 px-5 font-bold text-xs border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'announcements' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Announcements
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`py-3.5 px-5 font-bold text-xs border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'audit' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Audit History Trail
        </button>
      </div>

      {/* Review Tab */}
      {activeTab === 'review' && (
        <div className="space-y-6">
          {!selectedOrgId ? (
            // STEP 1: Grid of Organizations
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-heading">Achievements Review Panel</h2>
                  <p className="text-xs text-slate-500">Select a class organization to inspect and review their submitted programs and achievements.</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Submissions Status</span>
                    <span className={`text-xs font-black inline-flex items-center gap-1.5 ${
                      portal?.submissionsAllowed !== false ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        portal?.submissionsAllowed !== false ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                      }`} />
                      {portal?.submissionsAllowed !== false ? 'Accepting Submissions' : 'Submissions Paused'}
                    </span>
                  </div>

                  <button
                    onClick={handleToggleSubmissions}
                    disabled={togglingSubmissions}
                    className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border ${
                      portal?.submissionsAllowed !== false
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-700'
                    }`}
                    title={portal?.submissionsAllowed !== false ? 'Pause achievement submissions from class organizations' : 'Open achievement submissions'}
                  >
                    {togglingSubmissions ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Power className="w-3.5 h-3.5" />
                    )}
                    <span>{portal?.submissionsAllowed !== false ? 'Pause Submissions' : 'Open Submissions'}</span>
                  </button>
                </div>
              </div>

              {organizations.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-xs italic">
                  No class sub-organizations are registered in the portal yet. Create accounts under the "Class Organizations" tab.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {organizations.map((org) => {
                    const orgAchievements = achievements.filter(a => a.organizationId === org.id);
                    const totalSubmitted = orgAchievements.length;
                    const pendingCount = orgAchievements.filter(a => a.status === 'Submitted' || a.status === 'Under Review').length;
                    const approvedCount = orgAchievements.filter(a => a.status === 'Approved').length;
                    const rejectedCount = orgAchievements.filter(a => a.status === 'Rejected').length;
                    
                    // Compute total points from approved achievements
                    const pointsAwarded = orgAchievements
                      .filter(a => a.status === 'Approved')
                      .reduce((sum, a) => sum + (Number(a.awardedPoints) || 0), 0);

                    return (
                      <div 
                        key={org.id} 
                        className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 hover:border-emerald-600/40 transition-all shadow-xs flex flex-col justify-between space-y-3 group"
                        id={`org-card-${org.id}`}
                      >
                        {/* Organization Header */}
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center font-black text-emerald-800 text-xs shadow-2xs flex-shrink-0">
                            {org.logo ? (
                              <img src={org.logo} alt={org.name} className="w-full h-full rounded-xl object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              org.name.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-emerald-800 transition-colors leading-tight">{org.name}</h3>
                            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                              {org.membersCount || 0} members {org.className ? `• ${org.className}` : ''}
                            </p>
                          </div>
                        </div>

                        {/* Primary Statistics (Submitted / Pending / Approved) */}
                        <div className="grid grid-cols-3 gap-1 py-2 border-y border-slate-100 text-center">
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Submitted</p>
                            <p className="text-sm font-black text-slate-800">{totalSubmitted}</p>
                          </div>
                          <div className="space-y-0.5 border-x border-slate-100/80">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Pending</p>
                            <p className={`text-sm font-black ${pendingCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                              {pendingCount}
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Approved</p>
                            <p className="text-sm font-black text-emerald-600">{approvedCount}</p>
                          </div>
                        </div>

                        {/* Secondary Statistics (Rejected / Awarded Points) */}
                        <div className="flex items-center justify-between text-xs px-0.5">
                          <div className="space-y-0.5 text-left">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Rejected Submissions</p>
                            <p className="text-xs font-bold text-rose-600">{rejectedCount}</p>
                          </div>
                          <div className="space-y-0.5 text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Awarded Points</p>
                            <p className="text-xs font-black text-emerald-800">+{pointsAwarded} pts</p>
                          </div>
                        </div>

                        {/* Action Button */}
                        <button
                          onClick={() => {
                            setSelectedOrgId(org.id);
                          }}
                          className="w-full py-2 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                        >
                          <Building className="w-3.5 h-3.5" />
                          Review Programs
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            // STEP 2: Dedicated Organization's Submissions View
            (() => {
              const selectedOrg = organizations.find(o => o.id === selectedOrgId);
              if (!selectedOrg) {
                return (
                  <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-600">
                    <p>Organization not found.</p>
                    <button onClick={() => setSelectedOrgId(null)} className="mt-4 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl">
                      Back to Organizations List
                    </button>
                  </div>
                );
              }

              // Filter achievements for this organization
              const orgAchievements = achievements.filter(a => a.organizationId === selectedOrg.id);
              const totalSubmitted = orgAchievements.length;
              const pendingCount = orgAchievements.filter(a => a.status === 'Submitted' || a.status === 'Under Review').length;
              const approvedCount = orgAchievements.filter(a => a.status === 'Approved').length;
              const rejectedCount = orgAchievements.filter(a => a.status === 'Rejected').length;
              const pointsAwarded = orgAchievements
                .filter(a => a.status === 'Approved')
                .reduce((sum, a) => sum + (Number(a.awardedPoints) || 0), 0);

              // Apply Search Query & Filter by Status
              const searchedAchs = orgAchievements.filter(a => {
                const query = searchQuery.toLowerCase();
                return (
                  a.title.toLowerCase().includes(query) ||
                  a.programName.toLowerCase().includes(query) ||
                  a.description.toLowerCase().includes(query)
                );
              });

              const filteredAchs = statusFilter === 'All' ? searchedAchs : searchedAchs.filter(a => a.status === statusFilter);

              // Apply Sort
              const sortedAchs = [...filteredAchs].sort((a, b) => {
                if (sortOption === 'newest') {
                  return new Date(b.submittedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.createdAt).getTime();
                }
                if (sortOption === 'oldest') {
                  return new Date(a.submittedAt || a.createdAt).getTime() - new Date(b.submittedAt || b.createdAt).getTime();
                }
                if (sortOption === 'points') {
                  return (b.requestedPoints || 0) - (a.requestedPoints || 0);
                }
                if (sortOption === 'status') {
                  return a.status.localeCompare(b.status);
                }
                return 0;
              });

              return (
                <div className="space-y-6" id="org-review-container">
                  {/* Breadcrumbs */}
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <button 
                      onClick={() => setSelectedOrgId(null)} 
                      className="hover:text-emerald-800 transition-colors cursor-pointer font-bold"
                    >
                      Achievements Review
                    </button>
                    <span>→</span>
                    <span className="text-slate-800 font-extrabold">{selectedOrg.name}</span>
                  </div>

                  {/* Organization Summary Card */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center font-black text-emerald-800 text-lg shadow-xs flex-shrink-0">
                        {selectedOrg.logo ? (
                          <img src={selectedOrg.logo} alt={selectedOrg.name} className="w-full h-full rounded-2xl object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          selectedOrg.name.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 font-heading">{selectedOrg.name}</h2>
                        <p className="text-sm text-slate-500 font-semibold">{selectedOrg.className}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Leader: {selectedOrg.leader || 'N/A'} • Contact: {selectedOrg.contactDetails || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 text-center flex-shrink-0">
                      <div className="px-3">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Points</p>
                        <p className="text-base font-black text-emerald-800">+{pointsAwarded} pts</p>
                      </div>
                      <div className="px-3 border-l border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pending</p>
                        <p className="text-base font-black text-amber-600">{pendingCount}</p>
                      </div>
                      <div className="px-3 border-l border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Approved</p>
                        <p className="text-base font-black text-emerald-600">{approvedCount}</p>
                      </div>
                      <div className="px-3 border-l border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Rejected</p>
                        <p className="text-base font-black text-rose-600">{rejectedCount}</p>
                      </div>
                    </div>
                  </div>

                  {/* Filters and search block */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="relative w-full max-w-sm">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Search className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          placeholder="Search programs/achievements..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5">
                        <span className="text-slate-400 font-bold text-[10px] uppercase">Status:</span>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="bg-transparent border-none text-slate-800 font-semibold focus:outline-none focus:ring-0 text-xs py-0 pl-1 pr-4"
                        >
                          <option value="All">All Statuses</option>
                          <option value="Submitted">Submitted</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Approved">Approved</option>
                          <option value="Rejected">Rejected</option>
                          <option value="Returned for Correction">Returned for Correction</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5">
                        <span className="text-slate-400 font-bold text-[10px] uppercase">Sort:</span>
                        <select
                          value={sortOption}
                          onChange={(e) => setSortOption(e.target.value)}
                          className="bg-transparent border-none text-slate-800 font-semibold focus:outline-none focus:ring-0 text-xs py-0 pl-1 pr-4"
                        >
                          <option value="newest">Newest First</option>
                          <option value="oldest">Oldest First</option>
                          <option value="points">Requested Points</option>
                          <option value="status">Status</option>
                        </select>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedOrgId(null);
                        }}
                        className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-2xl text-xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back to Organizations
                      </button>
                    </div>
                  </div>

                  {/* Achievements List / Table Block */}
                  <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                    {orgAchievements.length === 0 ? (
                      <div className="text-center py-16 text-slate-400 text-xs italic">
                        “No achievements submitted by this organization yet.”
                      </div>
                    ) : sortedAchs.length === 0 ? (
                      <div className="text-center py-16 text-slate-400 text-xs italic">
                        {statusFilter === 'Submitted' ? '“No pending achievements to review.”' : 'No achievements match the selected filters.'}
                      </div>
                    ) : (
                      <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-xs text-left text-slate-600">
                            <thead className="bg-slate-50/70 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-100">
                              <tr>
                                <th className="py-3 px-4">Program / Achievement Title</th>
                                <th className="py-3 px-4">Whose Achievement (Achiever)</th>
                                <th className="py-3 px-4">Category</th>
                                <th className="py-3 px-4">Date</th>
                                <th className="py-3 px-4">Requested</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Submitted Date</th>
                                <th className="py-3 px-4 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {sortedAchs.map((ach) => (
                                <tr key={ach.id} className="hover:bg-slate-50/30 transition-colors">
                                  <td className="py-4 px-4 font-medium text-slate-700 max-w-xs">
                                    <p className="font-extrabold text-slate-950 text-sm">{ach.title}</p>
                                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{ach.programName}</p>
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="flex items-center gap-1.5">
                                      <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                      <div>
                                        <p className="font-extrabold text-slate-900 text-xs">
                                          {ach.achieverName || 'Achiever Not Assigned'}
                                        </p>
                                        {ach.achieverStudentId ? (
                                          <p className="text-[10px] text-slate-400 font-mono">ID: {ach.achieverStudentId}</p>
                                        ) : ach.achieverName === 'Achiever Not Assigned' || !ach.achieverName ? (
                                          <span className="text-[9px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block">
                                            Needs Assignment
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-4 px-4 font-semibold text-slate-600">
                                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 text-[10px] font-bold rounded-lg border border-slate-200/40">
                                      {getCategoryName(ach.categoryId)}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 text-slate-500 font-medium">
                                    {formatDate(ach.date)}
                                  </td>
                                  <td className="py-4 px-4 font-black text-slate-800 text-sm">
                                    {ach.requestedPoints} pts
                                  </td>
                                  <td className="py-4 px-4 font-medium">
                                    {(() => {
                                      switch (ach.status) {
                                        case 'Approved':
                                          return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-100 text-[10px] font-bold rounded-lg">🟢 Approved</span>;
                                        case 'Rejected':
                                          return <span className="px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-100 text-[10px] font-bold rounded-lg">🔴 Rejected</span>;
                                        case 'Under Review':
                                          return <span className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-100 text-[10px] font-bold rounded-lg">🔵 Under Review</span>;
                                        case 'Returned for Correction':
                                          return <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-100 text-[10px] font-bold rounded-lg">🟡 Returned</span>;
                                        default:
                                          return <span className="px-2.5 py-1 bg-slate-50 text-slate-800 border border-slate-100 text-[10px] font-bold rounded-lg">⚪ Submitted</span>;
                                      }
                                    })()}
                                  </td>
                                  <td className="py-4 px-4 text-slate-400">
                                    {formatDate(ach.submittedAt || ach.createdAt)}
                                  </td>
                                  <td className="py-4 px-4 text-right">
                                    <button
                                      onClick={() => {
                                        setSelectedAchievement(ach);
                                        setBaseAwardedPoints(ach.requestedPoints || 10);
                                        setBonusPoints(ach.bonusPoints || 0);
                                        setDeductionPoints(ach.deductionPoints || 0);
                                        setReviewPoints(ach.requestedPoints || 10);
                                        setReviewNotes(ach.reviewNotes || '');
                                      }}
                                      className="py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-extrabold rounded-xl shadow-2xs transition-colors cursor-pointer"
                                    >
                                      Evaluate
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Stacked List View */}
                        <div className="block md:hidden divide-y divide-slate-100">
                          {sortedAchs.map((ach) => (
                            <div key={ach.id} className="p-4 space-y-3">
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0">
                                  <h4 className="font-extrabold text-slate-950 text-sm break-words">{ach.title}</h4>
                                  <p className="text-[11px] text-slate-500 font-semibold">{ach.programName}</p>
                                </div>
                                <span className="flex-shrink-0">
                                  {(() => {
                                    switch (ach.status) {
                                      case 'Approved':
                                        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[9px] font-bold rounded-lg font-mono">Approved</span>;
                                      case 'Rejected':
                                        return <span className="px-2 py-0.5 bg-rose-50 text-rose-800 text-[9px] font-bold rounded-lg font-mono">Rejected</span>;
                                      case 'Under Review':
                                        return <span className="px-2 py-0.5 bg-blue-50 text-blue-800 text-[9px] font-bold rounded-lg font-mono">Review</span>;
                                      case 'Returned for Correction':
                                        return <span className="px-2 py-0.5 bg-amber-50 text-amber-800 text-[9px] font-bold rounded-lg font-mono">Returned</span>;
                                      default:
                                        return <span className="px-2 py-0.5 bg-slate-50 text-slate-800 text-[9px] font-bold rounded-lg font-mono">Submitted</span>;
                                    }
                                  })()}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-bold bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                                <div>
                                  <span className="text-slate-400 block uppercase">Category</span>
                                  <span className="text-slate-700 font-bold truncate block">{getCategoryName(ach.categoryId)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block uppercase">Requested</span>
                                  <span className="text-slate-700 font-extrabold block">{ach.requestedPoints} pts</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[10px] text-slate-400">Submitted: {formatDate(ach.submittedAt || ach.createdAt)}</span>
                                <button
                                  onClick={() => {
                                    setSelectedAchievement(ach);
                                    setBaseAwardedPoints(ach.requestedPoints || 10);
                                    setBonusPoints(ach.bonusPoints || 0);
                                    setDeductionPoints(ach.deductionPoints || 0);
                                    setReviewPoints(ach.requestedPoints || 10);
                                    setReviewNotes(ach.reviewNotes || '');
                                  }}
                                  className="py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold rounded-xl transition-colors cursor-pointer"
                                >
                                  Evaluate
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Organizations management Tab */}
      {activeTab === 'organizations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-heading">Class Organizations Listing</h2>
                  <p className="text-xs text-slate-500">Manage all registered sub-organizations and classes</p>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">{organizations.length} organizations</span>
              </div>

              {orgActionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{orgActionError}</span>
                </div>
              )}

              {orgActionSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{orgActionSuccess}</span>
                </div>
              )}

              <div className="divide-y divide-slate-100">
                {organizations.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No class organizations found. Register or create one using the sidebar form.
                  </div>
                ) : (
                  organizations.map((org) => (
                    <div key={org.id} className="flex items-center justify-between py-3.5 group hover:bg-slate-50/60 px-2.5 rounded-2xl transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 ${org.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-100'} border rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 shadow-2xs`}>
                          {org.logo ? (
                            <img src={org.logo} alt={org.name} className="w-full h-full rounded-xl object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            org.name.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm flex items-center gap-2 truncate">
                            <span className="truncate">{org.name}</span>
                            {org.status === 'pending' && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                Pending
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {org.className || 'Class'} • Leader: {org.leader || 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {org.status === 'pending' ? (
                          <div className="flex items-center gap-1.5">
                            <button 
                              type="button"
                              onClick={() => {
                                setOrgActionError('');
                                setOrgActionSuccess('');
                                setOrgToApprove(org);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 cursor-pointer shadow-xs transition-colors flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                            <button 
                              type="button"
                              onClick={() => {
                                setOrgActionError('');
                                setOrgActionSuccess('');
                                setOrgToDelete(org);
                              }}
                              className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold hover:bg-rose-700 cursor-pointer shadow-xs transition-colors flex items-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Approved</span>
                          </span>
                        )}

                        <span className="text-xs sm:text-sm font-extrabold text-emerald-800 bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-100">
                          {org.totalPoints || 0} pts
                        </span>

                        {/* Action Menu (⋮) & Delete Button */}
                        <div className="relative">
                          <button
                            type="button"
                            title="Organization options"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveOrgMenuId(activeOrgMenuId === org.id ? null : org.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeOrgMenuId === org.id && (
                            <div 
                              className="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl py-1.5 z-30 animate-scale-up"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveOrgMenuId(null);
                                  setOrgActionError('');
                                  setOrgActionSuccess('');
                                  setOrgToDelete(org);
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                <span>Delete Organization</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          {/* Account-Specific Points Portal Link Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4" id="account-points-portal-link-card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-emerald-600" />
                  <span>Account Points Portal</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                  Share the official access link for the Student Points Management portal.
                </p>
              </div>

              {/* Status Indicator */}
              {!portalLinkLoading && portalLink && portalLink.status === 'active' && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Active</span>
                </div>
              )}
            </div>

            {/* Content Body */}
            {portalLinkLoading ? (
              <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Loading your account portal settings...</span>
              </div>
            ) : !portalLink || portalLink.status === 'not_generated' ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-5 text-center space-y-3">
                <div className="mx-auto w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <LinkIcon className="w-5 h-5" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h4 className="text-xs font-bold text-slate-800">No Portal Link Generated Yet</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Generate an account-specific link for <span className="font-semibold text-slate-700">{user?.email}</span>. This creates an isolated Points Portal where your sub-organizations and students can register and track achievements.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGeneratePortalLink}
                  disabled={portalActionLoading}
                  className="py-2.5 px-5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer disabled:opacity-50"
                >
                  {portalActionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Unique Link...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Generate Points Portal Link</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Active Link View */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700">Portal Link</span>

                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <div className="flex-grow flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 overflow-x-auto">
                      <span className="text-[11px] text-slate-700 font-mono whitespace-nowrap select-all">
                        {portalLink.pointsPortalUrl}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(portalLink.pointsPortalUrl);
                        setCopiedLinkId('account_portal_link');
                        setTimeout(() => setCopiedLinkId(null), 2000);
                      }}
                      className={`py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs font-bold shrink-0 ${
                        copiedLinkId === 'account_portal_link'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                      }`}
                    >
                      {copiedLinkId === 'account_portal_link' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Portal Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Add Class Organization & Registration Links */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">Add Class Organization</h3>
              <p className="text-xs text-slate-500">Create a new sub-organization with dedicated credentials.</p>
            </div>

            {orgError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{orgError}</span>
              </div>
            )}
            {orgSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{orgSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrgSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Organization Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Club or Class 10A"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Grade / Class / Batch *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grade 11 - Section B"
                  value={orgClass}
                  onChange={(e) => setOrgClass(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Leader / Rep</label>
                  <input
                    type="text"
                    placeholder="e.g. Alex Johnson"
                    value={orgLeader}
                    onChange={(e) => setOrgLeader(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Contact Details</label>
                  <input
                    type="text"
                    placeholder="e.g. +1 555-0199"
                    value={orgContact}
                    onChange={(e) => setOrgContact(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Sub-Org Login Email *</label>
                <input
                  type="email"
                  required
                  placeholder="leader@school.org"
                  value={orgEmail}
                  onChange={(e) => setOrgEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={orgPass}
                  onChange={(e) => setOrgPass(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional notes or details about this organization..."
                  value={orgDesc}
                  onChange={(e) => setOrgDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <button
                type="submit"
                disabled={orgLoading}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                {orgLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Organization...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Create Organization</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
      )}

      {/* Class Organization Approval Confirmation Modal */}
      {orgToApprove && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 space-y-5 shadow-2xl animate-scale-up">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 font-heading">Approve Class Organization?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Approve <span className="font-bold text-slate-800">'{orgToApprove.name}'</span> as a Class Organization?
                </p>
              </div>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-semibold">Class / Section:</span>
                <span className="font-bold text-slate-800">{orgToApprove.className || 'General'}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-semibold">Leader:</span>
                <span className="font-bold text-slate-800">{orgToApprove.leader || 'N/A'}</span>
              </div>
              <p className="text-[11px] text-emerald-800 pt-1 border-t border-emerald-100/60">
                Approving will mark this organization as active and confirm its participation. All existing submissions and points remain intact.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isApprovingOrg}
                onClick={() => setOrgToApprove(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isApprovingOrg}
                onClick={async () => {
                  if (!orgToApprove) return;
                  setIsApprovingOrg(true);
                  setOrgActionError('');
                  setOrgActionSuccess('');
                  try {
                    const target = orgToApprove;
                    await approveClassOrganization(target.id);
                    setOrgToApprove(null);
                    setOrgActionSuccess(`Class organization '${target.name}' approved successfully.`);
                    setTimeout(() => setOrgActionSuccess(''), 5000);
                  } catch (err: any) {
                    console.error('Failed to approve organization:', err);
                    setOrgActionError(err?.message || 'Failed to approve organization. Please try again.');
                    setTimeout(() => setOrgActionError(''), 6000);
                  } finally {
                    setIsApprovingOrg(false);
                  }
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                {isApprovingOrg ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Approving Organization...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Class Organization Deletion / Rejection Confirmation Modal */}
      {orgToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 space-y-5 shadow-2xl animate-scale-up">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  {orgToDelete.status === 'pending' ? 'Reject Class Organization?' : 'Delete Class Organization?'}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {orgToDelete.status === 'pending'
                    ? 'Rejecting this organization will permanently remove the organization and all data submitted by it.'
                    : <>You are about to permanently delete <span className="font-bold text-slate-800">'{orgToDelete.name}'</span> and all data associated with this organization.</>}
                </p>
              </div>
            </div>

            {/* Impact Details Box */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5 text-xs text-slate-600">
              <p className="font-bold text-slate-800">
                Organization: <span className="text-emerald-800">{orgToDelete.name}</span>
              </p>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">This action will remove:</p>
              <ul className="space-y-1 text-slate-600 list-disc list-inside text-[11px] pl-1">
                <li>Organization profile</li>
                <li>Sub-organization account/users</li>
                <li>Achievement submissions</li>
                <li>Achievement proof/media references</li>
                <li>Point transactions</li>
                <li>Awarded points</li>
                <li>Notifications</li>
                <li>Announcements related to this organization</li>
                <li>Other organization-specific data</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingOrg}
                onClick={() => setOrgToDelete(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingOrg}
                onClick={async () => {
                  if (!orgToDelete) return;
                  setIsDeletingOrg(true);
                  setOrgActionError('');
                  setOrgActionSuccess('');
                  try {
                    const target = orgToDelete;
                    const isPending = target.status === 'pending';
                    if (isPending) {
                      await rejectClassOrganization(target.id, `Your class organization registration request for '${target.name}' was rejected by the administrator.`);
                    } else {
                      await deleteClassOrganization(target.id);
                    }
                    setOrgToDelete(null);
                    setOrgActionSuccess(
                      isPending
                        ? `Class organization '${target.name}' was rejected and portal access revoked.`
                        : `Class organization '${target.name}' deleted successfully.`
                    );
                    setTimeout(() => setOrgActionSuccess(''), 5000);
                  } catch (err: any) {
                    console.error('Failed to reject/delete organization:', err);
                    setOrgActionError(err?.message || 'Failed to remove organization. Please try again.');
                    setTimeout(() => setOrgActionError(''), 6000);
                  } finally {
                    setIsDeletingOrg(false);
                  }
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                {isDeletingOrg ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{orgToDelete.status === 'pending' ? 'Rejecting Organization...' : 'Deleting Organization...'}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{orgToDelete.status === 'pending' ? 'Reject & Delete' : 'Delete Organization'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Point Categories customizable */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-900 font-heading">Custom point categories</h2>
              <span className="text-xs font-semibold text-slate-500">{categories.length} categories</span>
            </div>
            {catError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{catError}</span>
              </div>
            )}
            {catSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{catSuccess}</span>
              </div>
            )}
            <div className="divide-y divide-slate-100">
              {categories.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400 font-medium">No custom point categories found. Add your first one using the form.</p>
              ) : (
                categories.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center py-3 group hover:bg-slate-50/50 px-2 rounded-xl transition-colors">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{cat.name}</p>
                      <p className="text-[10px] text-slate-400">Created: {formatDate(cat.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-extrabold text-sm text-emerald-800">+{cat.defaultPoints} pts</span>
                      <button
                        type="button"
                        title={`Delete ${cat.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCatError('');
                          setCatSuccess('');
                          setCategoryToDelete(cat);
                        }}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Add Custom Category</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Research Paper"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Default Points</label>
                <input
                  type="number"
                  min="1"
                  value={catPoints}
                  onChange={(e) => setCatPoints(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!catName) return;
                  try {
                    setCatError('');
                    setCatSuccess('');
                    await addCategory(catName, catPoints);
                    setCatName('');
                    setCatSuccess('Point category added successfully.');
                    setTimeout(() => setCatSuccess(''), 4000);
                  } catch (e: any) {
                    setCatError(e?.message || 'Failed to add category.');
                    setTimeout(() => setCatError(''), 5000);
                  }
                }}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Point Category Deletion Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 space-y-5 shadow-2xl animate-scale-up">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 font-heading">Delete Point Category?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to delete <span className="font-bold text-slate-800">'{categoryToDelete.name}'</span>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingCategory}
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingCategory}
                onClick={async () => {
                  if (!categoryToDelete) return;
                  setIsDeletingCategory(true);
                  setCatError('');
                  setCatSuccess('');
                  try {
                    const targetId = categoryToDelete.id;
                    await deleteCategory(targetId);
                    setCategoryToDelete(null);
                    setCatSuccess('Point category deleted successfully.');
                    setTimeout(() => setCatSuccess(''), 4000);
                  } catch (err: any) {
                    console.error('Failed to delete category', err);
                    setCatError(err?.message || 'Failed to delete category. Please try again.');
                    setTimeout(() => setCatError(''), 5000);
                  } finally {
                    setIsDeletingCategory(false);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isDeletingCategory ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Competitions */}
      {activeTab === 'competitions' && (
        <div className="space-y-6">
          {/* Main Munazzam / Admin Master Achievement Submissions Control */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                      Achievement Submissions
                    </h2>
                  </div>
                </div>
                <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                  Controls whether Sub-Organizations can submit new achievements during this evaluation period.
                  When turned OFF, the "+ Add Achievement" button is hidden and submission creation is strictly blocked.
                </p>
              </div>

              {/* Master ON/OFF Toggle Control */}
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/90 rounded-2xl p-3 sm:px-5 shrink-0">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Portal Submission Access
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      portal?.submissionsAllowed !== false ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`} />
                    <span className={`text-xs font-black ${
                      portal?.submissionsAllowed !== false ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {portal?.submissionsAllowed !== false ? 'Achievement Submissions Open' : 'Achievement Submissions Closed'}
                    </span>
                  </div>
                </div>

                {/* Clear ON / OFF Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleSubmissions}
                  disabled={togglingSubmissions}
                  className={`relative inline-flex items-center h-10 w-24 rounded-full p-1 transition-all duration-300 ease-in-out cursor-pointer focus:outline-none shadow-inner border ${
                    portal?.submissionsAllowed !== false
                      ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-700 text-white'
                      : 'bg-slate-300 hover:bg-slate-400 border-slate-400 text-slate-700'
                  } disabled:opacity-50`}
                  role="switch"
                  aria-checked={portal?.submissionsAllowed !== false}
                  title={`Achievement Submissions are currently ${portal?.submissionsAllowed !== false ? 'ON' : 'OFF'}. Click to toggle.`}
                >
                  <span className={`absolute left-3 text-[11px] font-black tracking-wider text-white transition-opacity ${
                    portal?.submissionsAllowed !== false ? 'opacity-100' : 'opacity-0'
                  }`}>
                    ON
                  </span>
                  <span className={`absolute right-3 text-[11px] font-black tracking-wider text-slate-700 transition-opacity ${
                    portal?.submissionsAllowed !== false ? 'opacity-0' : 'opacity-100'
                  }`}>
                    OFF
                  </span>
                  <span
                    className={`inline-block h-8 w-8 rounded-full bg-white shadow-md transform transition-transform duration-300 ease-in-out flex items-center justify-center ${
                      portal?.submissionsAllowed !== false ? 'translate-x-14' : 'translate-x-0'
                    }`}
                  >
                    {togglingSubmissions ? (
                      <Loader2 className="w-3.5 h-3.5 text-slate-600 animate-spin" />
                    ) : portal?.submissionsAllowed !== false ? (
                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-rose-500" />
                    )}
                  </span>
                </button>
              </div>
            </div>

            {/* Clear Rules and Active Evaluation Period Connection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className={`p-3.5 rounded-2xl border flex items-start gap-3 text-xs ${
                portal?.submissionsAllowed !== false
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 font-medium'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <div className={`p-1.5 rounded-xl shrink-0 ${
                  portal?.submissionsAllowed !== false ? 'bg-emerald-200/70 text-emerald-800' : 'bg-slate-200 text-slate-500'
                }`}>
                  <Check className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 uppercase text-[10px] tracking-wider">State: ON</span>
                    {portal?.submissionsAllowed !== false && (
                      <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[9px] font-bold">CURRENT</span>
                    )}
                  </div>
                  <p className="font-bold text-slate-800 text-xs">Sub-Organizations can submit achievements.</p>
                  <p className="text-[11px] text-slate-500">The "+ Add Achievement" button is active and accessible to all class organizations.</p>
                </div>
              </div>

              <div className={`p-3.5 rounded-2xl border flex items-start gap-3 text-xs ${
                portal?.submissionsAllowed === false
                  ? 'bg-rose-50/70 border-rose-200 text-rose-950 font-medium'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <div className={`p-1.5 rounded-xl shrink-0 ${
                  portal?.submissionsAllowed === false ? 'bg-rose-200/70 text-rose-800' : 'bg-slate-200 text-slate-500'
                }`}>
                  <Lock className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 uppercase text-[10px] tracking-wider">State: OFF</span>
                    {portal?.submissionsAllowed === false && (
                      <span className="px-2 py-0.5 bg-rose-600 text-white rounded-md text-[9px] font-bold">CURRENT</span>
                    )}
                  </div>
                  <p className="font-bold text-slate-800 text-xs">Sub-Organizations cannot submit achievements.</p>
                  <p className="text-[11px] text-slate-500">The button is hidden, forms are blocked, and submission creation is locked.</p>
                </div>
              </div>
            </div>

            {/* Evaluation Period Connection Status */}
            {(() => {
              const activeComp = competitions.find(c => c.status === 'active');
              return (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      {activeComp ? (
                        <>
                          Active Evaluation Period: <strong className="text-slate-900">{activeComp.name}</strong> ({formatDate(activeComp.startDate)} – {formatDate(activeComp.endDate)})
                        </>
                      ) : (
                        <span className="italic text-slate-500">No active evaluation period is currently running.</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500">Current Status:</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                      portal?.submissionsAllowed !== false
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {portal?.submissionsAllowed !== false ? 'Achievement Submissions Open' : 'Achievement Submissions Closed'}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 font-heading">Evaluation Periods</h2>
            <div className="divide-y divide-slate-100">
              {competitions.map(comp => (
                <div key={comp.id} className="flex justify-between items-center py-4">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{comp.name}</p>
                    <p className="text-xs text-slate-400">{formatDate(comp.startDate)} to {formatDate(comp.endDate)}</p>
                  </div>
                  <div>
                    {comp.status === 'active' ? (
                      <button
                        onClick={async () => {
                          if (confirm('Conclude this evaluation period?')) {
                            await completeCompetition(comp.id);
                          }
                        }}
                        className="py-1 px-3 bg-emerald-50 text-emerald-800 font-bold rounded-lg text-[10px] cursor-pointer"
                      >
                        Conclude
                      </button>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">Completed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">New Evaluation Period</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Period Name</label>
                <input
                  type="text"
                  placeholder="e.g. Odd Semester 2026"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Start Date</label>
                <input
                  type="date"
                  value={compStart}
                  onChange={(e) => setCompStart(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">End Date</label>
                <input
                  type="date"
                  value={compEnd}
                  onChange={(e) => setCompEnd(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>
              <button
                onClick={async () => {
                  if (!compName || !compStart || !compEnd) return;
                  await addCompetition(compName, compStart, compEnd);
                  setCompName('');
                  setCompStart('');
                  setCompEnd('');
                }}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Start Period
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Awards section */}
      {activeTab === 'awards' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-900 font-heading">Conferred Awards</h2>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                Total: {awards.length}
              </span>
            </div>
            {awards.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No awards conferred yet. Use the form to confer an award.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {awards.map(aw => {
                  const winners = getAwardWinners(aw);
                  const isInd = aw.recipientType === 'individual';
                  return (
                    <div key={aw.id} className="py-4 flex justify-between items-start gap-4">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-slate-900 text-sm tracking-tight">{aw.name}</p>
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            isInd 
                              ? 'bg-purple-50 text-purple-700 border-purple-200' 
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}>
                            {isInd ? 'Individual Achievers' : 'Class Organization'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">({formatDate(aw.awardDate)})</span>
                        </div>
                        {aw.description && (
                          <p className="text-xs text-slate-500 italic line-clamp-1">{aw.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {winners.map((w, idx) => {
                            const posBadge = w.position === 1 ? '🥇 1st' : w.position === 2 ? '🥈 2nd' : '🥉 3rd';
                            const posBg = w.position === 1 
                              ? 'bg-amber-50 text-amber-900 border-amber-200' 
                              : w.position === 2 
                                ? 'bg-slate-100 text-slate-800 border-slate-200' 
                                : 'bg-amber-100/50 text-amber-950 border-amber-300/50';
                            const name = getWinnerDisplayName(w);
                            const sub = getWinnerSubtext(w);
                            return (
                              <span key={w.achieverId || w.organizationId || idx} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold text-[11px] ${posBg}`}>
                                <span>{posBadge}:</span>
                                <strong className="font-black">{name}</strong>
                                {sub && <span className="opacity-75 text-[10px]">({sub})</span>}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        <button
                          onClick={() => {
                            setEditingAward(aw);
                            setEditAwName(aw.name);
                            setEditAwDesc(aw.description || '');
                            const recType = aw.recipientType || 'class_organization';
                            setEditAwRecipientType(recType);

                            const wList = getAwardWinners(aw);
                            if (recType === 'class_organization') {
                              setEditAwOrgId1(wList.find(w => w.position === 1)?.organizationId || '');
                              setEditAwOrgId2(wList.find(w => w.position === 2)?.organizationId || '');
                              setEditAwOrgId3(wList.find(w => w.position === 3)?.organizationId || '');
                              setEditAwIndId1('');
                              setEditAwIndId2('');
                              setEditAwIndId3('');
                            } else {
                              setEditAwIndId1(wList.find(w => w.position === 1)?.achieverId || '');
                              setEditAwIndId2(wList.find(w => w.position === 2)?.achieverId || '');
                              setEditAwIndId3(wList.find(w => w.position === 3)?.achieverId || '');
                              setEditAwOrgId1('');
                              setEditAwOrgId2('');
                              setEditAwOrgId3('');
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Award"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm(`Are you sure you want to delete the award "${aw.name}"?`)) {
                              await deleteAward(aw.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Award"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Confer Award Form */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 font-heading">
              <span>🏆</span> Confer Award
            </h3>
            <div className="space-y-4">
              {/* Recipient Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Award Recipient <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAwRecipientType('class_organization')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      awRecipientType === 'class_organization'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Class Organization
                  </button>
                  <button
                    type="button"
                    onClick={() => setAwRecipientType('individual')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      awRecipientType === 'individual'
                        ? 'bg-white text-purple-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Individual Achiever
                  </button>
                </div>
              </div>

              {/* Award Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Award Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={awRecipientType === 'individual' ? "e.g. Best Orator Award" : "e.g. NSU Best Class Award"}
                  value={awName}
                  onChange={(e) => setAwName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Award Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Award Description</label>
                <input
                  type="text"
                  placeholder="e.g. Conferred for outstanding performance"
                  value={awDesc}
                  onChange={(e) => setAwDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* CLASS ORGANIZATION WINNERS */}
              {awRecipientType === 'class_organization' ? (
                <>
                  {/* 1st Winner — REQUIRED */}
                  <div className="space-y-1 pt-1 border-t border-slate-100">
                    <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
                      <span>🥇 1st Winner</span>
                      <span className="text-rose-500 text-[9px] font-bold">REQUIRED</span>
                    </label>
                    <select
                      value={awOrgId1}
                      onChange={(e) => setAwOrgId1(e.target.value)}
                      className="w-full px-3 py-2 bg-amber-50/40 border border-amber-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                    >
                      <option value="">Select 1st Winner Class Organization...</option>
                      {organizations
                        .filter(o => o.id !== awOrgId2 && o.id !== awOrgId3)
                        .map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))
                      }
                    </select>
                  </div>

                  {/* 2nd Winner — OPTIONAL */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                      <span>🥈 2nd Winner</span>
                      <span className="text-slate-400 text-[9px]">OPTIONAL</span>
                    </label>
                    <select
                      value={awOrgId2}
                      onChange={(e) => setAwOrgId2(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400"
                    >
                      <option value="">None / Select 2nd Winner (Optional)...</option>
                      {organizations
                        .filter(o => o.id !== awOrgId1 && o.id !== awOrgId3)
                        .map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))
                      }
                    </select>
                  </div>

                  {/* 3rd Winner — OPTIONAL */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center justify-between">
                      <span>🥉 3rd Winner</span>
                      <span className="text-slate-400 text-[9px]">OPTIONAL</span>
                    </label>
                    <select
                      value={awOrgId3}
                      onChange={(e) => setAwOrgId3(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-500"
                    >
                      <option value="">None / Select 3rd Winner (Optional)...</option>
                      {organizations
                        .filter(o => o.id !== awOrgId1 && o.id !== awOrgId2)
                        .map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))
                      }
                    </select>
                  </div>
                </>
              ) : (
                /* INDIVIDUAL ACHIEVER WINNERS */
                <>
                  {/* 1st Winner — REQUIRED */}
                  <div className="space-y-1 pt-1 border-t border-slate-100">
                    <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
                      <span>🥇 1st Winner</span>
                      <span className="text-rose-500 text-[9px] font-bold">REQUIRED</span>
                    </label>
                    <select
                      value={awIndId1}
                      onChange={(e) => setAwIndId1(e.target.value)}
                      className="w-full px-3 py-2 bg-purple-50/40 border border-purple-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                    >
                      <option value="">Select Individual Achiever...</option>
                      {members
                        .filter(m => m.id !== awIndId2 && m.id !== awIndId3)
                        .map(m => {
                          const org = organizations.find(o => o.id === m.organizationId);
                          return (
                            <option key={m.id} value={m.id}>
                              {m.name} {m.studentId ? `(ID: ${m.studentId})` : ''} {org ? `· ${org.name}` : ''}
                            </option>
                          );
                        })
                      }
                    </select>
                  </div>

                  {/* 2nd Winner — OPTIONAL */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                      <span>🥈 2nd Winner</span>
                      <span className="text-slate-400 text-[9px]">OPTIONAL</span>
                    </label>
                    <select
                      value={awIndId2}
                      onChange={(e) => setAwIndId2(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400"
                    >
                      <option value="">None / Select 2nd Winner (Optional)...</option>
                      {members
                        .filter(m => m.id !== awIndId1 && m.id !== awIndId3)
                        .map(m => {
                          const org = organizations.find(o => o.id === m.organizationId);
                          return (
                            <option key={m.id} value={m.id}>
                              {m.name} {m.studentId ? `(ID: ${m.studentId})` : ''} {org ? `· ${org.name}` : ''}
                            </option>
                          );
                        })
                      }
                    </select>
                  </div>

                  {/* 3rd Winner — OPTIONAL */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center justify-between">
                      <span>🥉 3rd Winner</span>
                      <span className="text-slate-400 text-[9px]">OPTIONAL</span>
                    </label>
                    <select
                      value={awIndId3}
                      onChange={(e) => setAwIndId3(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-500"
                    >
                      <option value="">None / Select 3rd Winner (Optional)...</option>
                      {members
                        .filter(m => m.id !== awIndId1 && m.id !== awIndId2)
                        .map(m => {
                          const org = organizations.find(o => o.id === m.organizationId);
                          return (
                            <option key={m.id} value={m.id}>
                              {m.name} {m.studentId ? `(ID: ${m.studentId})` : ''} {org ? `· ${org.name}` : ''}
                            </option>
                          );
                        })
                      }
                    </select>
                  </div>
                </>
              )}

              <button
                onClick={async () => {
                  if (!awName.trim()) return;

                  let winners: AwardWinner[] = [];
                  let primaryWinnerOrgId = '';
                  let primaryWinnerOrgName = '';

                  if (awRecipientType === 'class_organization') {
                    if (!awOrgId1) return;
                    const w1 = organizations.find(o => o.id === awOrgId1);
                    if (!w1) return;
                    primaryWinnerOrgId = w1.id;
                    primaryWinnerOrgName = w1.name;

                    winners.push({ position: 1, organizationId: w1.id, organizationName: w1.name, name: w1.name });

                    if (awOrgId2) {
                      const w2 = organizations.find(o => o.id === awOrgId2);
                      if (w2) winners.push({ position: 2, organizationId: w2.id, organizationName: w2.name, name: w2.name });
                    }
                    if (awOrgId3) {
                      const w3 = organizations.find(o => o.id === awOrgId3);
                      if (w3) winners.push({ position: 3, organizationId: w3.id, organizationName: w3.name, name: w3.name });
                    }
                  } else {
                    // Individual Achiever
                    if (!awIndId1) return;
                    const m1 = members.find(m => m.id === awIndId1);
                    if (!m1) return;
                    const o1 = organizations.find(o => o.id === m1.organizationId);
                    primaryWinnerOrgId = m1.organizationId;
                    primaryWinnerOrgName = o1?.name || '';

                    winners.push({
                      position: 1,
                      achieverId: m1.id,
                      studentId: m1.studentId || '',
                      achieverName: m1.name,
                      name: m1.name,
                      organizationId: m1.organizationId,
                      organizationName: o1?.name || ''
                    });

                    if (awIndId2) {
                      const m2 = members.find(m => m.id === awIndId2);
                      if (m2) {
                        const o2 = organizations.find(o => o.id === m2.organizationId);
                        winners.push({
                          position: 2,
                          achieverId: m2.id,
                          studentId: m2.studentId || '',
                          achieverName: m2.name,
                          name: m2.name,
                          organizationId: m2.organizationId,
                          organizationName: o2?.name || ''
                        });
                      }
                    }

                    if (awIndId3) {
                      const m3 = members.find(m => m.id === awIndId3);
                      if (m3) {
                        const o3 = organizations.find(o => o.id === m3.organizationId);
                        winners.push({
                          position: 3,
                          achieverId: m3.id,
                          studentId: m3.studentId || '',
                          achieverName: m3.name,
                          name: m3.name,
                          organizationId: m3.organizationId,
                          organizationName: o3?.name || ''
                        });
                      }
                    }
                  }

                  await addAward({
                    name: awName.trim(),
                    description: awDesc.trim(),
                    evaluationPeriod: awPeriod,
                    recipientType: awRecipientType,
                    winnerOrganizationId: primaryWinnerOrgId,
                    winnerOrganizationName: primaryWinnerOrgName,
                    winners: winners,
                    awardDate: new Date().toISOString().split('T')[0],
                    certificateUrl: '',
                    notes: ''
                  });

                  setAwName('');
                  setAwDesc('');
                  setAwOrgId1('');
                  setAwOrgId2('');
                  setAwOrgId3('');
                  setAwIndId1('');
                  setAwIndId2('');
                  setAwIndId3('');
                }}
                disabled={!awName.trim() || (awRecipientType === 'class_organization' ? !awOrgId1 : !awIndId1)}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Confer Award
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT AWARD MODAL */}
      {editingAward && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base font-heading flex items-center gap-2">
                <span>🏆</span> Edit Award
              </h3>
              <button
                onClick={() => setEditingAward(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Recipient Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Award Recipient
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setEditAwRecipientType('class_organization')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      editAwRecipientType === 'class_organization'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Class Organization
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditAwRecipientType('individual')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      editAwRecipientType === 'individual'
                        ? 'bg-white text-purple-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Individual Achiever
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Award Title *
                </label>
                <input
                  type="text"
                  value={editAwName}
                  onChange={(e) => setEditAwName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Award Description
                </label>
                <input
                  type="text"
                  value={editAwDesc}
                  onChange={(e) => setEditAwDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Winners selection for Edit */}
              {editAwRecipientType === 'class_organization' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">🥇 1st Winner *</label>
                    <select
                      value={editAwOrgId1}
                      onChange={(e) => setEditAwOrgId1(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    >
                      <option value="">Select 1st Winner Class Organization...</option>
                      {organizations
                        .filter(o => o.id !== editAwOrgId2 && o.id !== editAwOrgId3)
                        .map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))
                      }
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">🥈 2nd Winner (Optional)</label>
                    <select
                      value={editAwOrgId2}
                      onChange={(e) => setEditAwOrgId2(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    >
                      <option value="">None / Select 2nd Winner...</option>
                      {organizations
                        .filter(o => o.id !== editAwOrgId1 && o.id !== editAwOrgId3)
                        .map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))
                      }
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">🥉 3rd Winner (Optional)</label>
                    <select
                      value={editAwOrgId3}
                      onChange={(e) => setEditAwOrgId3(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    >
                      <option value="">None / Select 3rd Winner...</option>
                      {organizations
                        .filter(o => o.id !== editAwOrgId1 && o.id !== editAwOrgId2)
                        .map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))
                      }
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">🥇 1st Winner *</label>
                    <select
                      value={editAwIndId1}
                      onChange={(e) => setEditAwIndId1(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    >
                      <option value="">Select Individual Achiever...</option>
                      {members
                        .filter(m => m.id !== editAwIndId2 && m.id !== editAwIndId3)
                        .map(m => {
                          const org = organizations.find(o => o.id === m.organizationId);
                          return (
                            <option key={m.id} value={m.id}>
                              {m.name} {m.studentId ? `(ID: ${m.studentId})` : ''} {org ? `· ${org.name}` : ''}
                            </option>
                          );
                        })
                      }
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">🥈 2nd Winner (Optional)</label>
                    <select
                      value={editAwIndId2}
                      onChange={(e) => setEditAwIndId2(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    >
                      <option value="">None / Select 2nd Winner...</option>
                      {members
                        .filter(m => m.id !== editAwIndId1 && m.id !== editAwIndId3)
                        .map(m => {
                          const org = organizations.find(o => o.id === m.organizationId);
                          return (
                            <option key={m.id} value={m.id}>
                              {m.name} {m.studentId ? `(ID: ${m.studentId})` : ''} {org ? `· ${org.name}` : ''}
                            </option>
                          );
                        })
                      }
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">🥉 3rd Winner (Optional)</label>
                    <select
                      value={editAwIndId3}
                      onChange={(e) => setEditAwIndId3(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    >
                      <option value="">None / Select 3rd Winner...</option>
                      {members
                        .filter(m => m.id !== editAwIndId1 && m.id !== editAwIndId2)
                        .map(m => {
                          const org = organizations.find(o => o.id === m.organizationId);
                          return (
                            <option key={m.id} value={m.id}>
                              {m.name} {m.studentId ? `(ID: ${m.studentId})` : ''} {org ? `· ${org.name}` : ''}
                            </option>
                          );
                        })
                      }
                    </select>
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAward(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!editAwName.trim() || (editAwRecipientType === 'class_organization' ? !editAwOrgId1 : !editAwIndId1)}
                  onClick={async () => {
                    if (!editingAward || !editAwName.trim()) return;

                    let newWinners: AwardWinner[] = [];
                    let pOrgId = '';
                    let pOrgName = '';

                    if (editAwRecipientType === 'class_organization') {
                      if (!editAwOrgId1) return;
                      const w1 = organizations.find(o => o.id === editAwOrgId1);
                      if (!w1) return;
                      pOrgId = w1.id;
                      pOrgName = w1.name;
                      newWinners.push({ position: 1, organizationId: w1.id, organizationName: w1.name, name: w1.name });

                      if (editAwOrgId2) {
                        const w2 = organizations.find(o => o.id === editAwOrgId2);
                        if (w2) newWinners.push({ position: 2, organizationId: w2.id, organizationName: w2.name, name: w2.name });
                      }
                      if (editAwOrgId3) {
                        const w3 = organizations.find(o => o.id === editAwOrgId3);
                        if (w3) newWinners.push({ position: 3, organizationId: w3.id, organizationName: w3.name, name: w3.name });
                      }
                    } else {
                      if (!editAwIndId1) return;
                      const m1 = members.find(m => m.id === editAwIndId1);
                      if (!m1) return;
                      const o1 = organizations.find(o => o.id === m1.organizationId);
                      pOrgId = m1.organizationId;
                      pOrgName = o1?.name || '';
                      newWinners.push({
                        position: 1,
                        achieverId: m1.id,
                        studentId: m1.studentId || '',
                        achieverName: m1.name,
                        name: m1.name,
                        organizationId: m1.organizationId,
                        organizationName: o1?.name || ''
                      });

                      if (editAwIndId2) {
                        const m2 = members.find(m => m.id === editAwIndId2);
                        if (m2) {
                          const o2 = organizations.find(o => o.id === m2.organizationId);
                          newWinners.push({
                            position: 2,
                            achieverId: m2.id,
                            studentId: m2.studentId || '',
                            achieverName: m2.name,
                            name: m2.name,
                            organizationId: m2.organizationId,
                            organizationName: o2?.name || ''
                          });
                        }
                      }

                      if (editAwIndId3) {
                        const m3 = members.find(m => m.id === editAwIndId3);
                        if (m3) {
                          const o3 = organizations.find(o => o.id === m3.organizationId);
                          newWinners.push({
                            position: 3,
                            achieverId: m3.id,
                            studentId: m3.studentId || '',
                            achieverName: m3.name,
                            name: m3.name,
                            organizationId: m3.organizationId,
                            organizationName: o3?.name || ''
                          });
                        }
                      }
                    }

                    await updateAward(editingAward.id, {
                      name: editAwName.trim(),
                      description: editAwDesc.trim(),
                      recipientType: editAwRecipientType,
                      winnerOrganizationId: pOrgId,
                      winnerOrganizationName: pOrgName,
                      winners: newWinners
                    });

                    setEditingAward(null);
                  }}
                  className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Announcements */}
      {activeTab === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 font-heading">Announcements board</h2>
            <div className="space-y-3">
              {announcements.map(ann => (
                <div key={ann.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                  <div className="flex justify-between">
                    <p className="font-bold text-slate-900 text-xs">{ann.title}</p>
                    <p className="text-[9px] text-slate-400 font-semibold">{formatDate(ann.createdAt)}</p>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 whitespace-pre-line">{ann.content}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Publish Announcement</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Achievement submission deadline extended"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Announcement Content</label>
                <textarea
                  rows={4}
                  placeholder="Detail the update or news..."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>
              <button
                onClick={async () => {
                  if (!annTitle || !annContent) return;
                  await addAnnouncement(annTitle, annContent);
                  setAnnTitle('');
                  setAnnContent('');
                }}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Publish Announcement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs tab */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            Audit History logs (Auditing actions)
          </h2>
          <div className="overflow-y-auto max-h-96 text-[11px] divide-y divide-slate-100">
            {auditLogs.map(log => (
              <div key={log.id} className="py-3 flex justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-bold text-slate-800">{log.action}</p>
                  <p className="text-slate-500 leading-normal">{log.details}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-slate-700">{log.username}</p>
                  <p className="text-[9px] text-slate-400">{formatDate(log.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evaluate Modal */}
      {selectedAchievement && (
        (() => {
          const orgAchsForNav = achievements.filter(a => a.organizationId === selectedAchievement.organizationId);
          const searchedAchsForNav = orgAchsForNav.filter(a => {
            const query = searchQuery.toLowerCase();
            return (
              a.title.toLowerCase().includes(query) ||
              a.programName.toLowerCase().includes(query) ||
              a.description.toLowerCase().includes(query)
            );
          });
          const filteredAchsForNav = statusFilter === 'All' ? searchedAchsForNav : searchedAchsForNav.filter(a => a.status === statusFilter);
          const sortedAchsForNav = [...filteredAchsForNav].sort((a, b) => {
            if (sortOption === 'newest') {
              return new Date(b.submittedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.createdAt).getTime();
            }
            if (sortOption === 'oldest') {
              return new Date(a.submittedAt || a.createdAt).getTime() - new Date(b.submittedAt || b.createdAt).getTime();
            }
            if (sortOption === 'points') {
              return (b.requestedPoints || 0) - (a.requestedPoints || 0);
            }
            if (sortOption === 'status') {
              return a.status.localeCompare(b.status);
            }
            return 0;
          });

          const currentIndex = sortedAchsForNav.findIndex(a => a.id === selectedAchievement.id);
          const totalInList = sortedAchsForNav.length;

          // Compute media splits
          const mediaFiles = getMediaForAchievement(selectedAchievement.id);
          const photoProofs = mediaFiles.filter(m => m.proofType === 'photo');
          const videoProofs = mediaFiles.filter(m => m.proofType === 'video');
          const docProofs = mediaFiles.filter(m => m.proofType === 'document' || (!m.proofType && m.fileName.endsWith('.pdf')));

          // Filter transactions for this achievement
          const previousTxs = transactions.filter(t => t.achievementId === selectedAchievement.id && t.status === 'active');

          const finalAwardedTotal = Math.max(0, baseAwardedPoints + bonusPoints - deductionPoints);

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-3xl border border-slate-200 max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl animate-scale-up">
                
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-150 flex justify-between items-start gap-4 bg-slate-50/50 flex-shrink-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-lg border border-emerald-200/50">
                        {getCategoryName(selectedAchievement.categoryId)}
                      </span>
                      {selectedAchievement.status === 'Approved' ? (
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg">🟢 Approved</span>
                      ) : selectedAchievement.status === 'Rejected' ? (
                        <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-lg">🔴 Rejected</span>
                      ) : selectedAchievement.status === 'Returned for Correction' ? (
                        <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg">🟡 Returned</span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg">🔵 Under Review</span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-slate-950 font-heading">{selectedAchievement.title}</h3>
                    <p className="text-xs text-slate-500 font-semibold">
                      Submitted by: <span className="text-slate-800 font-bold">{getOrgName(selectedAchievement.organizationId)}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedAchievement(null)}
                    className="p-1.5 hover:bg-slate-200/60 rounded-full text-slate-500 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body (Scrollable Split Columns) */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* LEFT COLUMN: Metadata and Attachment Proofs */}
                  <div className="space-y-6">
                    {/* Event Info Card */}
                    <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-3">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Program Metadata</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <p className="text-slate-400 font-bold text-[10px] uppercase">Date & Venue</p>
                          <p className="font-extrabold text-slate-800 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {formatDate(selectedAchievement.date)}
                          </p>
                          <p className="text-slate-600 font-medium flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            {selectedAchievement.place || 'Main Campus'}
                          </p>
                          <p className="text-slate-500 text-[10px] font-semibold mt-1">
                            Participants: {selectedAchievement.participantsCount || 0} students
                          </p>
                        </div>

                        {/* Achiever Info & Reassignment */}
                        <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <p className="text-slate-500 font-bold text-[10px] uppercase flex items-center gap-1">
                              <User className="w-3 h-3 text-emerald-700" />
                              <span>Whose Achievement (Achiever)</span>
                            </p>
                            {!isEditingAchiever && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsEditingAchiever(true);
                                  setTargetAchieverId(selectedAchievement.achieverId || '');
                                  setTargetAchieverName(selectedAchievement.achieverName || '');
                                  setTargetAchieverStudentId(selectedAchievement.achieverStudentId || '');
                                }}
                                className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" />
                                {selectedAchievement.achieverName === 'Achiever Not Assigned' || !selectedAchievement.achieverName ? 'Assign Achiever' : 'Edit'}
                              </button>
                            )}
                          </div>

                          {!isEditingAchiever ? (
                            <div>
                              <p className="font-black text-slate-900 text-xs">
                                {selectedAchievement.achieverName || 'Achiever Not Assigned'}
                              </p>
                              {selectedAchievement.achieverStudentId ? (
                                <p className="text-[10px] text-slate-500 font-mono">
                                  Student ID: {selectedAchievement.achieverStudentId}
                                </p>
                              ) : selectedAchievement.achieverName === 'Achiever Not Assigned' || !selectedAchievement.achieverName ? (
                                <span className="text-[9px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block mt-1">
                                  ⚠️ Achiever Not Assigned
                                </span>
                              ) : null}
                              <p className="text-[9px] text-emerald-700 mt-1 font-semibold">
                                Points will be credited to this individual upon approval.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2 pt-1">
                              <select
                                value={targetAchieverId}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTargetAchieverId(val);
                                  if (val === 'new') {
                                    setTargetAchieverName('');
                                    setTargetAchieverStudentId('');
                                  } else {
                                    const m = members.find(mem => mem.id === val);
                                    if (m) {
                                      setTargetAchieverName(m.name);
                                      setTargetAchieverStudentId(m.studentId || '');
                                    }
                                  }
                                }}
                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                              >
                                <option value="">-- Select Existing Member --</option>
                                {members.filter(m => m.organizationId === selectedAchievement.organizationId).map(m => (
                                  <option key={m.id} value={m.id}>
                                    {m.name} {m.studentId ? `(${m.studentId})` : ''}
                                  </option>
                                ))}
                                <option value="new">+ Enter New Student / Achiever</option>
                              </select>

                              {(targetAchieverId === 'new' || members.filter(m => m.organizationId === selectedAchievement.organizationId).length === 0) && (
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    placeholder="Student / Achiever Full Name *"
                                    value={targetAchieverName}
                                    onChange={(e) => setTargetAchieverName(e.target.value)}
                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Student ID / Roll No"
                                    value={targetAchieverStudentId}
                                    onChange={(e) => setTargetAchieverStudentId(e.target.value)}
                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                  />
                                </div>
                              )}

                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  disabled={savingAchiever || !targetAchieverName.trim()}
                                  onClick={async () => {
                                    setSavingAchiever(true);
                                    try {
                                      let finalMemId = targetAchieverId;
                                      if (!finalMemId || finalMemId === 'new') {
                                        const newM = await addMember(selectedAchievement.organizationId, targetAchieverName.trim(), targetAchieverStudentId.trim());
                                        finalMemId = newM.id;
                                      }
                                      await updateAchievementAchiever(selectedAchievement.id, finalMemId, targetAchieverName.trim(), targetAchieverStudentId.trim());
                                      setSelectedAchievement(prev => prev ? {
                                        ...prev,
                                        achieverId: finalMemId,
                                        achieverName: targetAchieverName.trim(),
                                        achieverStudentId: targetAchieverStudentId.trim()
                                      } : null);
                                      setIsEditingAchiever(false);
                                    } catch (err) {
                                      console.error('Error assigning achiever', err);
                                    } finally {
                                      setSavingAchiever(false);
                                    }
                                  }}
                                  className="py-1 px-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold cursor-pointer disabled:opacity-50"
                                >
                                  {savingAchiever ? 'Saving...' : 'Save Achiever'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsEditingAchiever(false)}
                                  className="py-1 px-2 text-slate-500 hover:bg-slate-100 rounded-lg text-[10px] font-semibold cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-200/50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Program Description</p>
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-white p-3 rounded-xl border border-slate-100">
                          {selectedAchievement.description}
                        </p>
                      </div>
                    </div>

                    {/* CATEGORIZED PROOFS SECTIONS */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-emerald-600" />
                        PROGRAM ATTACHED PROOFS
                      </h4>

                      {mediaFiles.length === 0 ? (
                        <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center">
                          No proof files were attached to this submission.
                        </p>
                      ) : (
                        <div className="space-y-5">
                          {/* 1. Photograph Proofs */}
                          {photoProofs.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Photograph Proofs ({photoProofs.length})</p>
                              <div className="grid grid-cols-2 gap-3">
                                {photoProofs.map(photo => (
                                  <a 
                                    key={photo.id} 
                                    href={photo.fileUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-video hover:opacity-90 transition-opacity bg-slate-100 block group"
                                  >
                                    <img 
                                      src={photo.fileUrl} 
                                      alt={photo.fileName} 
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2">
                                      <p className="text-[9px] text-white font-bold truncate">{photo.fileName}</p>
                                    </div>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 2. Video Proofs with custom playing triggers */}
                          {videoProofs.length > 0 && (
                            <div className="space-y-3">
                              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Video Proofs ({videoProofs.length})</p>
                              <div className="space-y-3">
                                {videoProofs.map(video => (
                                  <div key={video.id} className="space-y-2 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
                                          <Film className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-xs font-bold text-slate-900 truncate">{video.fileName}</p>
                                          <p className="text-[9px] text-slate-400 font-semibold uppercase">VIDEO ATTACHMENT</p>
                                        </div>
                                      </div>
                                      <a 
                                        href={video.fileUrl} 
                                        download 
                                        className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer"
                                        title="Download Video"
                                      >
                                        <Download className="w-4 h-4" />
                                      </a>
                                    </div>
                                    <video 
                                      src={video.fileUrl} 
                                      controls 
                                      className="w-full rounded-xl border border-slate-200 shadow-inner bg-black aspect-video max-h-56" 
                                      referrerPolicy="no-referrer"
                                    >
                                      Your browser does not support the video tag.
                                    </video>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 3. PDF/Document Proofs */}
                          {docProofs.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">PDF / Document Proofs ({docProofs.length})</p>
                              <div className="space-y-2">
                                {docProofs.map(doc => (
                                  <div key={doc.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 flex-shrink-0">
                                        <FileText className="w-5 h-5" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-900 truncate">{doc.fileName}</p>
                                        <p className="text-[9px] text-slate-400 font-semibold uppercase">PDF DOCUMENT</p>
                                      </div>
                                    </div>
                                    <div className="flex gap-1.5">
                                      <a 
                                        href={doc.fileUrl} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-extrabold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                                      >
                                        <Eye className="w-3 h-3" />
                                        View
                                      </a>
                                      <a 
                                        href={doc.fileUrl} 
                                        download
                                        className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer"
                                        title="Download PDF"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Interactive Evaluation and Action Decision */}
                  <div className="space-y-6">
                    {/* Previous Transactions Summary */}
                    {previousTxs.length > 0 && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2 text-xs">
                        <p className="font-extrabold text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          Previous Evaluation Records
                        </p>
                        <div className="divide-y divide-emerald-100/50">
                          {previousTxs.map(tx => (
                            <div key={tx.id} className="py-2 flex justify-between items-center text-emerald-950 font-medium">
                              <div>
                                <p className="font-bold">Approved Points: +{tx.points} pts</p>
                                <p className="text-[10px] text-emerald-700">Reason: {tx.reason}</p>
                              </div>
                              <span className="text-[10px] text-emerald-600">{formatDate(tx.createdAt)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Previous review notes */}
                    {selectedAchievement.reviewNotes && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5 text-xs">
                        <p className="font-extrabold text-slate-700">Latest Review Notes / Feedback</p>
                        <p className="text-slate-600 leading-normal bg-white p-2.5 rounded-xl border border-slate-100">
                          {selectedAchievement.reviewNotes}
                        </p>
                      </div>
                    )}

                    {/* Point evaluation forms */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h4 className="text-xs font-black text-slate-900 uppercase">EVALUATION METRICS</h4>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                          Requested: {selectedAchievement.requestedPoints} pts
                        </span>
                      </div>

                      {/* Mathematical Components */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Base Awarded</label>
                          <input
                            type="number"
                            min="0"
                            value={baseAwardedPoints}
                            onChange={(e) => setBaseAwardedPoints(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Bonus (+)</label>
                          <input
                            type="number"
                            min="0"
                            value={bonusPoints}
                            onChange={(e) => setBonusPoints(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Deduction (-)</label>
                          <input
                            type="number"
                            min="0"
                            value={deductionPoints}
                            onChange={(e) => setDeductionPoints(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-rose-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Final Awarded Preview Box */}
                      <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-extrabold text-emerald-950 text-sm">Final Awarded Points</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Calculated dynamically: Base + Bonus - Deduction</p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black text-emerald-800">+{finalAwardedTotal}</span>
                          <span className="text-[10px] text-emerald-700 block font-bold">POINTS</span>
                        </div>
                      </div>

                      {/* Feedback Notes */}
                      <div className="space-y-1.5 text-xs">
                        <label className="font-bold text-slate-700">Evaluation Feedback Notes</label>
                        <textarea
                          rows={3}
                          placeholder="Provide details about point calculation, specifying bonus reasons or deduction causes..."
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      {/* Status CTAs */}
                      <div className="flex flex-col gap-2 pt-2">
                        <button
                          type="button"
                          disabled={reviewLoading}
                          onClick={() => handleReviewAction('Approved')}
                          className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                        >
                          {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Approve & Award {finalAwardedTotal} Points
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={reviewLoading}
                            onClick={() => handleReviewAction('Returned for Correction')}
                            className="py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl text-xs cursor-pointer flex items-center justify-center gap-1"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            Return for Correction
                          </button>
                          <button
                            type="button"
                            disabled={reviewLoading}
                            onClick={() => handleReviewAction('Rejected')}
                            className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs cursor-pointer flex items-center justify-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject Submission
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Navigation Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
                  <button
                    onClick={() => setSelectedAchievement(null)}
                    className="py-2 px-4 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-xs font-bold transition-colors text-center cursor-pointer"
                  >
                    Back to Submissions
                  </button>

                  <div className="flex items-center justify-center gap-2">
                    <button
                      disabled={currentIndex <= 0}
                      onClick={() => {
                        const prevAch = sortedAchsForNav[currentIndex - 1];
                        setSelectedAchievement(prevAch);
                        setBaseAwardedPoints(prevAch.requestedPoints || 10);
                        setBonusPoints(prevAch.bonusPoints || 0);
                        setDeductionPoints(prevAch.deductionPoints || 0);
                        setReviewPoints(prevAch.requestedPoints || 10);
                        setReviewNotes(prevAch.reviewNotes || '');
                      }}
                      className="py-2 px-3.5 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous Program
                    </button>

                    <span className="text-xs text-slate-500 font-bold px-1">
                      {currentIndex + 1} of {totalInList}
                    </span>

                    <button
                      disabled={currentIndex >= totalInList - 1 || currentIndex === -1}
                      onClick={() => {
                        const nextAch = sortedAchsForNav[currentIndex + 1];
                        setSelectedAchievement(nextAch);
                        setBaseAwardedPoints(nextAch.requestedPoints || 10);
                        setBonusPoints(nextAch.bonusPoints || 0);
                        setDeductionPoints(nextAch.deductionPoints || 0);
                        setReviewPoints(nextAch.requestedPoints || 10);
                        setReviewNotes(nextAch.reviewNotes || '');
                      }}
                      className="py-2 px-3.5 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      Next Program
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          );
        })()
      )}
    </div>
  );
};
