import React, { useState, useEffect, useMemo } from 'react';
import { usePortal, SP_Achievement, SP_Media, SP_Member, SP_Organization, getAchievementPeriodId, getAwardPeriodId } from '../../context/PortalContext';
import { EvaluationPeriodSelector } from './EvaluationPeriodSelector';
import { 
  Trophy, Star, Calendar, MapPin, Upload, FileText, Image, Film, Plus, Trash2, 
  CheckCircle2, AlertCircle, Loader2, Megaphone, ChevronRight, Bell, History, X, Check, Paperclip, ArrowLeft,
  User, UserCheck, Pencil, Lock, LogOut, Building2, Search, Users, Award, ShieldAlert
} from 'lucide-react';
import { formatDate, generateId, uploadFile, optimizeImageFile, isImageFile } from '../../utils/helpers';
import { CustomOptionField } from '../common/CustomOptionField';

export type SubOrgTab = 'leaderboard' | 'awards' | 'overview' | 'submit' | 'notifications';

export const SubOrgDashboard: React.FC = () => {
  const { 
    portal, portalUser, organizations, achievements, categories, mediaAttachments, announcements, notifications,
    members, submitAchievement, updateAchievement, deleteAchievement, markNotificationsAsRead, logoutPortalUser,
    competitions, awards
  } = usePortal();

  // Active sub-organization
  const activeOrg = organizations.find(o => o.id === portalUser?.organizationId);
  const orgIndex = organizations.findIndex(o => o.id === portalUser?.organizationId);
  const activeRank = orgIndex >= 0 ? orgIndex + 1 : '-';

  // Sub-org members for achiever selection
  const orgMembers = members.filter(m => m.organizationId === portalUser?.organizationId);

  const [activeTab, setActiveTab] = useState<SubOrgTab>('leaderboard');
  const [selectedAchievement, setSelectedAchievement] = useState<SP_Achievement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAchievementId, setEditingAchievementId] = useState<string | null>(null);

  // Live Standings View state
  const [leaderboardScope, setLeaderboardScope] = useState<'achievers' | 'organizations'>('achievers');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>('active');
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active competition
  const activeCompetition = useMemo(() => {
    return competitions.find(c => c.status === 'active');
  }, [competitions]);

  // Active/approved organizations only
  const activeOrganizations = useMemo(() => {
    return organizations.filter(o => o.status === 'active' || (o.status as string) === 'approved');
  }, [organizations]);

  // Helper to check period match
  const isPeriodMatch = (itemPeriodId: string | null | undefined) => {
    if (selectedPeriodFilter === 'all') return true;
    if (selectedPeriodFilter === 'active') {
      if (!activeCompetition) return !itemPeriodId;
      return itemPeriodId === activeCompetition.id || (!itemPeriodId && competitions.length <= 1);
    }
    return itemPeriodId === selectedPeriodFilter;
  };

  // Compute period-specific stats for members
  const memberPeriodStats = useMemo(() => {
    const statsMap = new Map<string, { points: number; count: number }>();
    members.forEach(m => statsMap.set(m.id, { points: 0, count: 0 }));

    achievements.forEach(a => {
      if (a.status !== 'Approved') return;
      const periodId = getAchievementPeriodId(a, competitions);
      if (!isPeriodMatch(periodId)) return;

      const pts = Number(a.awardedPoints) || 0;
      let matchedMember = members.find(m => m.id === a.achieverId);
      if (!matchedMember && a.achieverStudentId && a.organizationId) {
        matchedMember = members.find(m => m.organizationId === a.organizationId && m.studentId && m.studentId.trim().toLowerCase() === a.achieverStudentId?.trim().toLowerCase());
      }
      if (!matchedMember && a.achieverName && a.organizationId) {
        matchedMember = members.find(m => m.organizationId === a.organizationId && m.name.trim().toLowerCase() === a.achieverName.trim().toLowerCase());
      }

      if (matchedMember) {
        const current = statsMap.get(matchedMember.id) || { points: 0, count: 0 };
        statsMap.set(matchedMember.id, {
          points: current.points + pts,
          count: current.count + 1
        });
      }
    });

    return statsMap;
  }, [members, achievements, competitions, selectedPeriodFilter, activeCompetition]);

  // Compute period-specific stats for organizations
  const orgPeriodStats = useMemo(() => {
    const statsMap = new Map<string, { points: number; count: number }>();
    activeOrganizations.forEach(o => statsMap.set(o.id, { points: 0, count: 0 }));

    achievements.forEach(a => {
      if (a.status !== 'Approved') return;
      const periodId = getAchievementPeriodId(a, competitions);
      if (!isPeriodMatch(periodId)) return;

      const pts = Number(a.awardedPoints) || 0;
      if (a.organizationId) {
        const current = statsMap.get(a.organizationId) || { points: 0, count: 0 };
        statsMap.set(a.organizationId, {
          points: current.points + pts,
          count: current.count + 1
        });
      }
    });

    return statsMap;
  }, [activeOrganizations, achievements, competitions, selectedPeriodFilter, activeCompetition]);

  // Filtered & sorted members
  const sortedMembers = useMemo(() => {
    return [...members]
      .filter(m => {
        if (selectedOrgFilter !== 'all' && m.organizationId !== selectedOrgFilter) return false;
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase().trim();
        const matchName = m.name?.toLowerCase().includes(query);
        const matchId = m.studentId && m.studentId.toLowerCase().includes(query);
        return matchName || matchId;
      })
      .map(m => {
        const stats = memberPeriodStats.get(m.id) || { points: 0, count: 0 };
        return { ...m, periodPoints: stats.points, periodApprovedCount: stats.count };
      })
      .sort((a, b) => b.periodPoints - a.periodPoints);
  }, [members, selectedOrgFilter, searchQuery, memberPeriodStats]);

  // Filtered & sorted organizations
  const sortedOrganizations = useMemo(() => {
    return [...activeOrganizations]
      .filter(o => {
        if (selectedOrgFilter !== 'all' && o.id !== selectedOrgFilter) return false;
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase().trim();
        const matchName = o.name?.toLowerCase().includes(query);
        const matchClass = o.className?.toLowerCase().includes(query);
        const matchLeader = o.leader && o.leader.toLowerCase().includes(query);
        return matchName || matchClass || matchLeader;
      })
      .map(o => {
        const stats = orgPeriodStats.get(o.id) || { points: 0, count: 0 };
        return { ...o, periodPoints: stats.points, periodApprovedCount: stats.count };
      })
      .sort((a, b) => b.periodPoints - a.periodPoints);
  }, [activeOrganizations, selectedOrgFilter, searchQuery, orgPeriodStats]);

  // Filtered awards
  const filteredAwards = useMemo(() => {
    return awards.filter(award => {
      const awardPeriodId = getAwardPeriodId(award, competitions);
      return isPeriodMatch(awardPeriodId);
    });
  }, [awards, selectedPeriodFilter, competitions, activeCompetition]);

  // Strict route/tab guard for submissions
  useEffect(() => {
    if (activeTab === 'submit' && !isEditing && portal?.submissionsAllowed === false) {
      setActiveTab('overview');
    }
  }, [activeTab, isEditing, portal?.submissionsAllowed]);

  // Filter achievements for this org only
  const orgAchievements = achievements.filter(a => a.organizationId === portalUser?.organizationId);

  // Form State for Achievement Submission
  const [title, setTitle] = useState('');
  const [programName, setProgramName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [place, setPlace] = useState('');
  const [description, setDescription] = useState('');
  const [participantsCount, setParticipantsCount] = useState<number>(0);
  
  const [achieverId, setAchieverId] = useState<string>('');
  const [achieverName, setAchieverName] = useState<string>('');
  const [achieverStudentId, setAchieverStudentId] = useState<string>('');
  const [isCustomAchiever, setIsCustomAchiever] = useState<boolean>(false);

  const [requestedPoints, setRequestedPoints] = useState<number>(10);
  const [selectedRank, setSelectedRank] = useState<'1st' | '2nd' | '3rd' | ''>('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const [queuedPhotos, setQueuedPhotos] = useState<{ id: string; file: File; name: string; size: number; url: string }[]>([]);
  const [queuedVideos, setQueuedVideos] = useState<{ id: string; file: File; name: string; size: number; url: string }[]>([]);
  const [queuedDocs, setQueuedDocs] = useState<{ id: string; file: File; name: string; size: number; url: string }[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const handleCategoryChange = (catId: string) => {
    setCategoryId(catId);
    if (catId !== 'OTHER') {
      setCustomCategoryName('');
    }
    const cat = categories.find(c => c.id === catId);
    if (cat) {
      if (cat.isRankBased) {
        setSelectedRank('1st');
        setRequestedPoints(cat.rank1Points || 5);
      } else {
        setSelectedRank('');
        setRequestedPoints(cat.defaultPoints);
      }
    } else {
      setSelectedRank('');
      setRequestedPoints(10);
    }
  };

  const handleRankChange = (rank: '1st' | '2nd' | '3rd') => {
    setSelectedRank(rank);
    const cat = categories.find(c => c.id === categoryId);
    if (cat && cat.isRankBased) {
      if (rank === '1st') setRequestedPoints(cat.rank1Points || 5);
      else if (rank === '2nd') setRequestedPoints(cat.rank2Points || 3);
      else if (rank === '3rd') setRequestedPoints(cat.rank3Points || 1);
    }
  };

  const handleEdit = (ach: SP_Achievement) => {
    setEditingAchievementId(ach.id);
    setIsEditing(true);
    setTitle(ach.title);
    setProgramName(ach.programName);
    if (ach.customCategory) {
      setCategoryId('OTHER');
      setCustomCategoryName(ach.customCategory);
    } else {
      setCategoryId(ach.categoryId);
      setCustomCategoryName('');
    }
    setDate(ach.date);
    setPlace(ach.place);
    setDescription(ach.description);
    setParticipantsCount(ach.participantsCount);
    setAchieverId(ach.achieverId);
    setAchieverName(ach.achieverName);
    setAchieverStudentId(ach.achieverStudentId || '');
    setRequestedPoints(ach.requestedPoints);
    setSelectedRank(ach.rank || '');
    setAdditionalNotes(ach.additionalNotes);
    
    const achMedia = getMediaForAchievement(ach.id);
    setQueuedPhotos(achMedia.filter(m => m.type === 'photo').map(m => ({ id: m.id, file: new File([], m.name), name: m.name, size: m.size, url: m.fileUrl })));
    setQueuedVideos(achMedia.filter(m => m.type === 'video').map(m => ({ id: m.id, file: new File([], m.name), name: m.name, size: m.size, url: m.fileUrl })));
    setQueuedDocs(achMedia.filter(m => m.type === 'document').map(m => ({ id: m.id, file: new File([], m.name), name: m.name, size: m.size, url: m.fileUrl })));
    
    setActiveTab('submit');
  };

  const resetForm = () => {
    setTitle('');
    setProgramName('');
    setCategoryId('');
    setCustomCategoryName('');
    setDate(new Date().toISOString().split('T')[0]);
    setPlace('');
    setDescription('');
    setParticipantsCount(0);
    setAchieverId('');
    setAchieverName('');
    setAchieverStudentId('');
    setIsCustomAchiever(false);
    setRequestedPoints(10);
    setAdditionalNotes('');
    setQueuedPhotos([]);
    setQueuedVideos([]);
    setQueuedDocs([]);
    setIsEditing(false);
    setEditingAchievementId(null);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    for (const file of files) {
      if (!isImageFile(file)) continue;
      try {
        const optimized = await optimizeImageFile(file, { maxDimension: 1600, targetMaxSizeBytes: 500 * 1024 });
        const url = await uploadFile(optimized.file);
        setQueuedPhotos(prev => [...prev, { id: generateId('temp_pho'), file: optimized.file, name: optimized.fileName, size: optimized.optimizedSize, url: url || optimized.dataUrl }]);
      } catch (err) {
        const url = await uploadFile(file);
        setQueuedPhotos(prev => [...prev, { id: generateId('temp_pho'), file, name: file.name, size: file.size, url }]);
      }
    }
    if (e.target) e.target.value = '';
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    for (const file of files) {
      const url = await uploadFile(file);
      setQueuedVideos(prev => [...prev, { id: generateId('temp_vid'), file, name: file.name, size: file.size, url }]);
    }
  };

  const handleDocSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    for (const file of files) {
      const url = await uploadFile(file);
      setQueuedDocs(prev => [...prev, { id: generateId('temp_doc'), file, name: file.name, size: file.size, url }]);
    }
  };

  const handleRemoveQueuedPhoto = (id: string) => setQueuedPhotos(prev => prev.filter(p => p.id !== id));
  const handleRemoveQueuedVideo = (id: string) => setQueuedVideos(prev => prev.filter(v => v.id !== id));
  const handleRemoveQueuedDoc = (id: string) => setQueuedDocs(prev => prev.filter(d => d.id !== id));

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!title.trim() || !programName.trim() || !date || !description.trim()) {
      setFormError('Please fill in all required fields marked with *.');
      return;
    }

    if (categoryId === 'OTHER' && !customCategoryName.trim()) {
      setFormError('Please enter a custom category name.');
      return;
    }

    const selectedCat = categories.find(c => c.id === categoryId);
    if (selectedCat?.isRankBased && !selectedRank) {
      setFormError('Please select a rank for this rank-based category.');
      return;
    }

    setSubmitting(true);
    try {
      const allFiles = [
        ...queuedPhotos.map(p => ({ fileUrl: p.url, name: p.name, size: p.size, type: 'photo' as const })),
        ...queuedVideos.map(v => ({ fileUrl: v.url, name: v.name, size: v.size, type: 'video' as const })),
        ...queuedDocs.map(d => ({ fileUrl: d.url, name: d.name, size: d.size, type: 'document' as const }))
      ];

      const cleanAchieverName = achieverName.trim();
      const cleanAchieverStudentId = achieverStudentId.trim();
      const finalAchId = cleanAchieverName ? achieverId : 'unassigned';
      const isOther = categoryId === 'OTHER';
      const effectiveCustomCategory = isOther ? customCategoryName.trim() : undefined;

      if (isEditing && editingAchievementId) {
        await updateAchievement(editingAchievementId, {
          title: title.trim(),
          programName: programName.trim(),
          categoryId: categoryId || '',
          customCategory: effectiveCustomCategory,
          date,
          place: place.trim(),
          description: description.trim(),
          participantsCount: Number(participantsCount) || 0,
          achieverId: finalAchId,
          achieverName: cleanAchieverName,
          achieverStudentId: cleanAchieverStudentId,
          requestedPoints: Number(requestedPoints) || 10,
          additionalNotes: additionalNotes.trim(),
          status: 'Submitted',
          rank: (selectedCat?.isRankBased && selectedRank) ? (selectedRank as '1st' | '2nd' | '3rd') : undefined,
          rankBasedPoints: !!selectedCat?.isRankBased
        });
        setFormSuccess('Submission updated successfully.');
      } else {
        if (portal?.submissionsAllowed === false) {
          setFormError('Achievement submissions are currently paused by the administrator.');
          setSubmitting(false);
          return;
        }
        await submitAchievement({
          title: title.trim(),
          programName: programName.trim(),
          categoryId: categoryId || '',
          customCategory: effectiveCustomCategory,
          date,
          place: place.trim(),
          description: description.trim(),
          participantsCount: Number(participantsCount) || 0,
          achieverId: finalAchId,
          achieverName: cleanAchieverName,
          achieverStudentId: cleanAchieverStudentId,
          requestedPoints: Number(requestedPoints) || 10,
          additionalNotes: additionalNotes.trim(),
          rank: (selectedCat?.isRankBased && selectedRank) ? (selectedRank as '1st' | '2nd' | '3rd') : undefined,
          rankBasedPoints: !!selectedCat?.isRankBased
        }, allFiles);
        setFormSuccess('Achievement successfully submitted to the Review Panel!');
      }

      resetForm();
      setActiveTab('overview');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit achievement. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getMediaForAchievement = (achId: string) => mediaAttachments.filter(m => m.achievementId === achId);
  const getCategoryName = (catId: string, customCat?: string) => {
    if (customCat && customCat.trim()) return customCat.trim();
    if (catId === 'OTHER') return 'Other Category';
    const cat = categories.find(c => c.id === catId);
    return cat ? cat.name : 'Achievement';
  };

  const getOrgName = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    return org ? org.name : 'Unknown Class';
  };

  const getStatusBadge = (status: SP_Achievement['status']) => {
    switch (status) {
      case 'Approved':
        return <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-md">Approved</span>;
      case 'Rejected':
        return <span className="px-2.5 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold rounded-md">Rejected</span>;
      case 'Under Review':
        return <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold rounded-md">Under Review</span>;
      case 'Returned for Correction':
        return <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold rounded-md">Correction Required</span>;
      default:
        return <span className="px-2.5 py-0.5 bg-slate-50 text-slate-800 border border-slate-200 text-[10px] font-bold rounded-md">Submitted</span>;
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-7xl mx-auto" id="sub-org-portal-dashboard">
      {/* 2. Organization Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-2xs">
        <div className="flex items-center gap-3.5 text-center sm:text-left w-full sm:w-auto">
          <div className="w-11 h-11 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center justify-center font-black text-sm shrink-0">
            {activeOrg?.logo ? (
              <img src={activeOrg.logo} alt={activeOrg.name} className="w-full h-full rounded-xl object-cover" referrerPolicy="no-referrer" />
            ) : (
              ((activeOrg?.name || portalUser?.name || 'SO').trim().slice(0, 2)).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              <h2 className="text-base font-bold text-slate-900 font-heading truncate">
                {activeOrg?.name || portalUser?.name || 'Class Sub-Organization'}
              </h2>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[10px] font-bold rounded-md">
                Class Sub-Org Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {activeOrg?.className || 'Department Class'} • Logged in as {portalUser?.email}
            </p>
          </div>
        </div>

        {/* 9. Student Points Management Footer Card / Logout Action */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
            <Trophy className="w-3.5 h-3.5 text-emerald-700" />
            <span>Student Points Management</span>
          </div>
          <button
            type="button"
            onClick={() => {
              logoutPortalUser();
              sessionStorage.setItem('sp_explicit_logout', 'true');
            }}
            className="w-full sm:w-auto py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* 3. Student Points Leaderboard Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-2xs relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
          <Trophy className="w-56 h-56 rotate-12 text-white" />
        </div>
        <div className="max-w-2xl space-y-1.5 relative z-10">
          <span className="px-2.5 py-0.5 bg-white/10 backdrop-blur-md rounded-md text-[9px] uppercase font-bold tracking-widest text-emerald-300 border border-white/10">
            PUBLIC DASHBOARD
          </span>
          <h1 className="text-lg sm:text-2xl font-extrabold font-heading tracking-tight leading-tight">Student Points Leaderboard</h1>
          <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed max-w-lg font-medium">
            Monitor student achievers, class sub-organization standings, and approved achievements in real time.
          </p>
        </div>
      </div>

      {/* Unified Portal Navigation */}
      {activeTab !== 'submit' && (
        <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'leaderboard' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Leaderboard & Standings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('awards')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'awards' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Conferred Awards
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'overview' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Overview & Submissions
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('notifications');
              markNotificationsAsRead();
            }}
            className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'notifications' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Alert Notifications</span>
            {notifications.filter(n => !n.isRead && n.organizationId === portalUser?.organizationId).length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            )}
          </button>
        </div>
      )}

      {/* 4. Leaderboard & Standings Tab */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          {/* 6. Evaluation Period Status — Complete Redesign */}
          <div className="bg-white rounded-2xl border-l-4 border-emerald-600 border border-slate-200/80 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Evaluation Period Status</h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    ACTIVE PERIOD
                  </span>
                </div>
                <p className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                  {activeCompetition ? activeCompetition.name : 'September Evaluation Cycle'}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  {activeCompetition?.startDate && activeCompetition?.endDate
                    ? `${formatDate(activeCompetition.startDate)} – ${formatDate(activeCompetition.endDate)}`
                    : 'Ongoing institutional academic evaluation cycle'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Standings Active
              </span>
            </div>
          </div>

          {/* 4. Live Standings Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-2xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-heading">Live Standings</h2>
                  <p className="text-xs text-slate-500">Real-time point standings and achievements</p>
                </div>
              </div>

              {/* Segmented Tabs: Student Achievers & Class Orgs */}
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setLeaderboardScope('achievers')}
                  className={`py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    leaderboardScope === 'achievers'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Student Achievers
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderboardScope('organizations')}
                  className={`py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    leaderboardScope === 'organizations'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Class Orgs
                </button>
              </div>
            </div>

            {/* Filters & Search Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Evaluation Period Filter */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Period Filter</label>
                <EvaluationPeriodSelector
                  compact={true}
                  selectedPeriod={selectedPeriodFilter}
                  onSelectPeriod={setSelectedPeriodFilter}
                  competitions={competitions}
                  className="w-full"
                />
              </div>

              {/* Organization Filter */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Organization Filter</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <select
                    value={selectedOrgFilter}
                    onChange={(e) => setSelectedOrgFilter(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all appearance-none cursor-pointer"
                  >
                    <option value="all">All Organizations ({activeOrganizations.length})</option>
                    {activeOrganizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Building2 className="w-3.5 h-3.5 opacity-0" />
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Search Directory</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by student name or ID…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* 5. Student / Class Leaderboard Entries */}
            <div className="pt-2">
              {leaderboardScope === 'achievers' ? (
                sortedMembers.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs italic">
                    No student achievers found matching the filter criteria.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
                    {sortedMembers.map((member, idx) => (
                      <div key={member.id} className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 border ${
                            idx === 0 ? 'bg-amber-100 text-amber-900 border-amber-300' :
                            idx === 1 ? 'bg-slate-200 text-slate-800 border-slate-300' :
                            idx === 2 ? 'bg-amber-700/20 text-amber-900 border-amber-700/30' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            #{idx + 1}
                          </div>

                          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                            {member.name.substring(0, 2).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-tight">
                              {member.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 flex-wrap">
                              <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">ID: {member.studentId || 'N/A'}</span>
                              <span>•</span>
                              <span className="truncate">{getOrgName(member.organizationId)}</span>
                              <span>•</span>
                              <span className="text-emerald-700 font-semibold">{member.periodApprovedCount} approved achievement{member.periodApprovedCount === 1 ? '' : 's'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm sm:text-base font-black text-emerald-800">
                            +{member.periodPoints}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">PTS</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                sortedOrganizations.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs italic">
                    No class organizations found matching the filter criteria.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
                    {sortedOrganizations.map((org, idx) => (
                      <div key={org.id} className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 border ${
                            idx === 0 ? 'bg-amber-100 text-amber-900 border-amber-300' :
                            idx === 1 ? 'bg-slate-200 text-slate-800 border-slate-300' :
                            idx === 2 ? 'bg-amber-700/20 text-amber-900 border-amber-700/30' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            #{idx + 1}
                          </div>

                          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                            {org.logo ? (
                              <img src={org.logo} alt={org.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              org.name.substring(0, 2).toUpperCase()
                            )}
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-tight">
                              {org.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 flex-wrap">
                              <span className="font-semibold text-slate-700">{org.className || 'Class'}</span>
                              <span>•</span>
                              <span>President: {org.leader || 'N/A'}</span>
                              <span>•</span>
                              <span className="text-emerald-700 font-semibold">{org.periodApprovedCount} submissions</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm sm:text-base font-black text-emerald-800">
                            +{org.periodPoints}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">PTS</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>

          {/* 7. Outstanding Award Winner */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <Trophy className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 font-heading">Outstanding Award Winner</h3>
            </div>

            {filteredAwards.length === 0 ? (
              <div className="p-4 bg-slate-50/70 rounded-xl text-center text-slate-400 text-xs italic">
                No awards conferred yet in this workspace.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredAwards.slice(0, 2).map(award => (
                  <div key={award.id} className="bg-amber-50/40 border border-amber-200/70 p-3.5 rounded-xl space-y-1">
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-amber-100 text-amber-900 rounded border border-amber-300">
                      {award.name}
                    </span>
                    <p className="text-xs font-bold text-slate-900 truncate mt-1">
                      {award.description || 'Conferred Achievement Award'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conferred Awards Tab */}
      {activeTab === 'awards' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-700" />
              Conferred Awards & Honors
            </h2>
            <EvaluationPeriodSelector
              compact={true}
              selectedPeriod={selectedPeriodFilter}
              onSelectPeriod={setSelectedPeriodFilter}
              competitions={competitions}
            />
          </div>

          {filteredAwards.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs italic">
              No awards have been conferred for this evaluation period.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAwards.map(award => (
                <div key={award.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-md">
                      {award.recipientType === 'individual' ? 'Individual Honor' : 'Class Organization Honor'}
                    </span>
                    <Trophy className="w-4 h-4 text-amber-600" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{award.name}</h3>
                  <p className="text-xs text-slate-600">{award.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Overview & Submissions Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Overview stats header */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex items-center gap-3 shadow-2xs col-span-2">
              {activeOrg?.logo ? (
                <img src={activeOrg.logo} alt={activeOrg?.name || 'Class Logo'} className="w-12 h-12 rounded-xl object-cover border border-slate-200" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                  {((activeOrg?.name || portalUser?.name || 'SP').trim().slice(0, 2)).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 font-heading leading-tight truncate">
                  {activeOrg?.name || portalUser?.name || 'Class Organization'}
                </h1>
                <p className="text-xs text-slate-500 truncate">
                  {activeOrg?.className || 'Class Account'} • Admin: {portalUser?.name || portalUser?.email}
                </p>
                <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
                  Active Organization
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between shadow-2xs">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider truncate">Total Earned</p>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black text-emerald-800">
                  {orgAchievements.filter(a => a.status === 'Approved').reduce((sum, a) => sum + (Number(a.awardedPoints) || 0), 0)}
                </span>
                <span className="text-[10px] font-semibold text-slate-500">POINTS</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between shadow-2xs">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider truncate">Leaderboard Rank</p>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black text-slate-800">#{activeRank || '-'}</span>
                <span className="text-[10px] font-semibold text-slate-500">OUT OF 10</span>
              </div>
            </div>
          </div>

          {/* 8. Add Achievement Button & Submissions Registry */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-700" />
                  Submissions Registry
                </h2>
                <p className="text-xs text-slate-500">Manage program submissions and evaluation proofs</p>
              </div>

              {portal?.submissionsAllowed !== false ? (
                <button
                  type="button"
                  onClick={() => { resetForm(); setActiveTab('submit'); }}
                  className="py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Achievement</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium">
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Submissions are currently closed by the administrator.</span>
                </div>
              )}
            </div>

            {orgAchievements.length === 0 ? (
              <div className="text-center py-12 space-y-1.5 border border-dashed border-slate-200 rounded-2xl">
                <p className="text-slate-600 text-xs font-bold">No Achievement Submissions Found</p>
                <p className="text-slate-400 text-xs">Click "+ Add Achievement" above to submit your first achievement proof.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Title / Program</th>
                      <th className="py-3 px-4">Achiever</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Requested Pts</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orgAchievements.map(ach => (
                      <tr key={ach.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div>
                            <p>{ach.title}</p>
                            <p className="text-[10px] font-semibold text-slate-400">{ach.programName}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {ach.achieverName || 'Unassigned'}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-500">
                          {getCategoryName(ach.categoryId, ach.customCategory)}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-500">
                          {formatDate(ach.date)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-700">
                          {ach.requestedPoints}
                        </td>
                        <td className="py-3.5 px-4">
                          {getStatusBadge(ach.status)}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => setSelectedAchievement(ach)}
                            className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-semibold cursor-pointer"
                          >
                            View
                          </button>
                          {(ach.status === 'Submitted' || ach.status === 'Returned for Correction') && (
                            <button
                              type="button"
                              onClick={() => handleEdit(ach)}
                              className="py-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-800 font-semibold cursor-pointer"
                            >
                              Edit
                            </button>
                          )}
                          {(ach.status === 'Draft' || ach.status === 'Returned for Correction') && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm('Are you sure you want to delete this submission?')) {
                                  await deleteAchievement(ach.id);
                                }
                              }}
                              className="py-1 px-2 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-700 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit / Edit Achievement Form View */}
      {activeTab === 'submit' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 space-y-6 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Overview</span>
            </button>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              {isEditing ? 'Edit Submission' : 'New Submission'}
            </span>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Achievement Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Tech Symposium Winner"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Program / Activity Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Programming Fest"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Point Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-800"
                >
                  <option value="">Select category...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} {cat.isRankBased ? '(Rank-Based)' : `(${cat.defaultPoints} pts)`}
                    </option>
                  ))}
                  <option value="OTHER">Other Category / Custom Option...</option>
                </select>

                {categoryId === 'OTHER' && (
                  <CustomOptionField
                    id="points-custom-category-input"
                    label="Enter Custom Point Category *"
                    value={customCategoryName}
                    onChange={setCustomCategoryName}
                    placeholder="e.g. Science Olympiad, Community Service, Hackathon..."
                    required
                    autoFocus
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Activity Date *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Student Name (Achiever)</label>
                <input
                  type="text"
                  placeholder="Optional Student Name"
                  value={achieverName}
                  onChange={(e) => setAchieverName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Requested Points</label>
                <input
                  type="number"
                  min="1"
                  value={requestedPoints}
                  onChange={(e) => setRequestedPoints(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Description *</label>
              <textarea
                required
                rows={3}
                placeholder="Provide detailed description of the achievement..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-800"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isEditing ? 'Save Changes' : 'Submit Achievement'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 shadow-2xs">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-700" />
            Class Alerts & Feedback
          </h2>

          {notifications.filter(n => n.organizationId === portalUser?.organizationId).length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs italic">
              No notifications found.
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.filter(n => n.organizationId === portalUser?.organizationId).map(not => (
                <div key={not.id} className="p-3.5 bg-slate-50/80 border border-slate-200/70 rounded-xl space-y-1">
                  <p className="text-xs font-bold text-slate-900">{not.title}</p>
                  <p className="text-xs text-slate-600">{not.message}</p>
                  <p className="text-[10px] text-slate-400">{formatDate(not.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Achievement Detail Modal */}
      {selectedAchievement && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-start gap-4 pb-3 border-b border-slate-100">
              <div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-md">
                  {getCategoryName(selectedAchievement.categoryId, selectedAchievement.customCategory)}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{selectedAchievement.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAchievement(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div>
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Program / Activity</span>
                <p className="font-semibold text-slate-900">{selectedAchievement.programName}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Date & Venue</span>
                <p className="font-semibold text-slate-900">{formatDate(selectedAchievement.date)} at {selectedAchievement.place || 'Main Campus'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Description</span>
                <p className="text-slate-700 leading-relaxed">{selectedAchievement.description}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Status & Points</span>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(selectedAchievement.status)}
                  <span className="font-bold text-slate-900">{selectedAchievement.awardedPoints !== undefined ? `${selectedAchievement.awardedPoints} pts awarded` : `${selectedAchievement.requestedPoints} pts requested`}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAchievement(null)}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
