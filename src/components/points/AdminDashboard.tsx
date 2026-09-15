import React, { useState } from 'react';
import { usePortal, SP_Organization, SP_Achievement } from '../../context/PortalContext';
import { 
  Trophy, Plus, Users, Award, Star, Settings, Megaphone, ShieldAlert, CheckCircle2,
  ListFilter, Eye, Check, X, FileText, Calendar, MapPin, Film, History, Loader2, AlertCircle,
  Building, ChevronLeft, ChevronRight, Search, ArrowUpDown, Download, Play
} from 'lucide-react';
import { motion } from 'motion/react';
import { formatDate, generateId } from '../../utils/helpers';

export const AdminDashboard: React.FC = () => {
  const { 
    organizations, achievements, categories, mediaAttachments, awards, announcements, competitions, auditLogs, transactions,
    createClassOrganization, updateClassOrganization, reviewAchievement, addCategory, deleteCategory,
    addCompetition, completeCompetition, addAward, addAnnouncement,
    registrationLinks, generateRegistrationLink
  } = usePortal();

  const [activeTab, setActiveTab] = useState<'review' | 'organizations' | 'categories' | 'competitions' | 'awards' | 'announcements' | 'audit'>('review');
  const [selectedAchievement, setSelectedAchievement] = useState<SP_Achievement | null>(null);

  // Invitation invite state
  const [inviteLabel, setInviteLabel] = useState('');
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);

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
  const totalPointsAwarded = transactions.filter(t => t.status === 'active').reduce((acc, curr) => acc + curr.points, 0);

  // Forms states
  const [reviewPoints, setReviewPoints] = useState<number>(10);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [reviewLoading, setReviewLoading] = useState<boolean>(false);

  // 1. Org form state
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

  // 2. Category form
  const [catName, setCatName] = useState('');
  const [catPoints, setCatPoints] = useState<number>(15);

  // 3. Competition form
  const [compName, setCompName] = useState('');
  const [compStart, setCompStart] = useState('');
  const [compEnd, setCompEnd] = useState('');

  // 4. Award form
  const [awName, setAwName] = useState('');
  const [awDesc, setAwDesc] = useState('');
  const [awOrgId, setAwOrgId] = useState('');
  const [awPeriod, setAwPeriod] = useState('');

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

    if (organizations.length >= 10) {
      setOrgError('You can manage a maximum of 10 class sub-organizations under NSU.');
      return;
    }

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
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500">OUT OF 10</span>
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
          className={`py-3.5 px-5 font-bold text-xs border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'organizations' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Class Organizations
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-heading">Achievements Review Panel</h2>
                  <p className="text-xs text-slate-500">Select a class organization to inspect and review their submitted programs and achievements.</p>
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
                    
                    // Compute total points from approved point transactions
                    const pointsAwarded = transactions
                      .filter(t => t.organizationId === org.id && t.status === 'active')
                      .reduce((sum, t) => sum + t.points, 0);

                    return (
                      <div 
                        key={org.id} 
                        className="bg-white rounded-3xl border border-slate-200 p-5 hover:border-emerald-600/40 transition-all shadow-xs flex flex-col justify-between space-y-4 group"
                        id={`org-card-${org.id}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center font-black text-emerald-800 text-base shadow-2xs flex-shrink-0">
                            {org.logo ? (
                              <img src={org.logo} alt={org.name} className="w-full h-full rounded-2xl object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              org.name.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-emerald-800 transition-colors">{org.name}</h3>
                            <p className="text-xs text-slate-500 font-semibold">{org.className}</p>
                          </div>
                        </div>

                        {/* Summary Metrics */}
                        <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-center">
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Submitted</p>
                            <p className="text-sm font-black text-slate-800">{totalSubmitted}</p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Pending</p>
                            <p className={`text-sm font-black ${pendingCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                              {pendingCount}
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Approved</p>
                            <p className="text-sm font-black text-emerald-600">{approvedCount}</p>
                          </div>
                        </div>

                        {/* Extra Status Rows */}
                        <div className="flex items-center justify-between text-xs pt-1">
                          <div className="space-y-0.5 text-left">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Rejected Submissions</p>
                            <p className="font-bold text-rose-600">{rejectedCount}</p>
                          </div>
                          <div className="space-y-0.5 text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Awarded Points</p>
                            <p className="font-black text-emerald-800 text-sm">+{pointsAwarded} pts</p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedOrgId(org.id);
                          }}
                          className="w-full py-2.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 text-slate-700 font-bold rounded-2xl text-xs border border-slate-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
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
              const pointsAwarded = transactions
                .filter(t => t.organizationId === selectedOrg.id && t.status === 'active')
                .reduce((sum, t) => sum + t.points, 0);

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
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Class Organizations Listing ({organizations.length}/10)</h2>
            <div className="divide-y divide-slate-100">
              {organizations.map((org) => (
                <div key={org.id} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-700 text-sm">
                      {org.name.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{org.name}</p>
                      <p className="text-xs text-slate-500">{org.className} • Leader: {org.leader || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="text-sm font-extrabold text-emerald-800">{org.totalPoints} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* General Points Portal Link Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">General Shared Points Portal Link</h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                Copy and share this permanent link with all sub-organizations. They can register new class accounts or log in directly to access their dashboards.
              </p>
            </div>

            <div className="space-y-3">
              {/* Public link (for external users / other accounts) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-700">Public Shared Link (For all students & other accounts)</span>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">No Google Login Required</span>
                </div>
                <div className="flex gap-1.5 items-center bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-600 font-mono truncate flex-grow select-all">
                    {getPublicOrigin() + window.location.pathname}?suborg=true
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const fullUrl = `${getPublicOrigin()}${window.location.pathname}?suborg=true`;
                      navigator.clipboard.writeText(fullUrl);
                      setCopiedLinkId('general_link');
                      setTimeout(() => setCopiedLinkId(null), 2000);
                    }}
                    className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer text-xs font-bold shrink-0 ${
                      copiedLinkId === 'general_link'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    }`}
                  >
                    {copiedLinkId === 'general_link' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-3.5 h-3.5" />
                        <span>Copy Public Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {window.location.origin.includes('ais-dev-') && (
                <div className="p-3 bg-blue-50 border border-blue-200/70 rounded-xl text-[11px] text-blue-900 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900">
                    <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>How to activate the Public Link (Fixes 404 / 403 errors):</span>
                  </div>
                  <p className="text-[10px] text-blue-800 leading-relaxed">
                    If opening the public link shows <em>"404 Page not found"</em>, it simply means the public build hasn't been published yet. 
                    Click the <strong className="font-semibold text-blue-950">"Share"</strong> button in the top-right header of Google AI Studio to publish it. Once shared, anyone on any Google account or phone can access the portal without errors.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Point Categories customizable */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 font-heading">Custom point categories</h2>
            <div className="divide-y divide-slate-100">
              {categories.map(cat => (
                <div key={cat.id} className="flex justify-between items-center py-3">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{cat.name}</p>
                    <p className="text-[10px] text-slate-400">Created: {formatDate(cat.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-extrabold text-sm text-emerald-800">+{cat.defaultPoints} pts</span>
                    <button
                      onClick={async () => {
                        if (confirm('Delete point category?')) {
                          await deleteCategory(cat.id);
                        }
                      }}
                      className="p-1 hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
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
                onClick={async () => {
                  if (!catName) return;
                  await addCategory(catName, catPoints);
                  setCatName('');
                }}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Competitions */}
      {activeTab === 'competitions' && (
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
      )}

      {/* Awards section */}
      {activeTab === 'awards' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 font-heading">Conferred Awards</h2>
            <div className="divide-y divide-slate-100">
              {awards.map(aw => (
                <div key={aw.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{aw.name}</p>
                    <p className="text-xs text-slate-500">Winner: <strong>{aw.winnerOrganizationName}</strong> • {formatDate(aw.awardDate)}</p>
                  </div>
                  <span className="text-xl">🏆</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Confer Award</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Award Title</label>
                <input
                  type="text"
                  placeholder="e.g. Outstanding Cultural Lead"
                  value={awName}
                  onChange={(e) => setAwName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Award Description</label>
                <input
                  type="text"
                  placeholder="e.g. Awarded for highest seminar participation"
                  value={awDesc}
                  onChange={(e) => setAwDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Winner Class Organization</label>
                <select
                  value={awOrgId}
                  onChange={(e) => setAwOrgId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                >
                  <option value="">Select organization...</option>
                  {organizations.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={async () => {
                  if (!awName || !awOrgId) return;
                  const winner = organizations.find(o => o.id === awOrgId);
                  if (!winner) return;

                  await addAward({
                    name: awName,
                    description: awDesc,
                    evaluationPeriod: awPeriod,
                    winnerOrganizationId: awOrgId,
                    winnerOrganizationName: winner.name,
                    awardDate: new Date().toISOString().split('T')[0],
                    certificateUrl: '',
                    notes: ''
                  });

                  setAwName('');
                  setAwDesc('');
                  setAwOrgId('');
                }}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Confer Award
              </button>
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
                      
                      <div className="grid grid-cols-2 gap-4 text-xs">
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
                        </div>

                        <div className="space-y-1">
                          <p className="text-slate-400 font-bold text-[10px] uppercase">Organizer Details</p>
                          <p className="font-extrabold text-slate-800">
                            {selectedAchievement.responsiblePerson || 'N/A'}
                          </p>
                          <p className="text-slate-500 text-[10px] font-semibold">
                            Participants: {selectedAchievement.participantsCount || 0} students
                          </p>
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
