import React, { useState, useEffect } from 'react';
import { usePortal, SP_Achievement, SP_Media } from '../../context/PortalContext';
import { 
  Trophy, Star, Calendar, MapPin, Upload, FileText, Image, Film, Plus, Trash2, 
  CheckCircle2, AlertCircle, Loader2, Megaphone, ChevronRight, Bell, History, X, Check, Paperclip, ArrowLeft,
  User, UserCheck, Pencil, Lock, LogOut
} from 'lucide-react';
import { motion } from 'motion/react';
import { formatDate, generateId, uploadFile, optimizeImageFile, isImageFile } from '../../utils/helpers';
import { ViewerDashboard } from './ViewerDashboard';

export type SubOrgTab = 'leaderboard' | 'awards' | 'overview' | 'submit' | 'notifications';

export const SubOrgDashboard: React.FC = () => {
  const { 
    portal, portalUser, organizations, achievements, categories, mediaAttachments, announcements, notifications,
    members, submitAchievement, updateAchievement, deleteAchievement, markNotificationsAsRead, logoutPortalUser
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

  // Strict route/tab guard: If submissions are closed by Admin, do not allow opening the submission form for new achievements
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
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [place, setPlace] = useState('');
  const [description, setDescription] = useState('');
  const [participantsCount, setParticipantsCount] = useState<number>(0);
  
  // Achiever state (Individual student ownership)
  const [achieverId, setAchieverId] = useState<string>('');
  const [achieverName, setAchieverName] = useState<string>('');
  const [achieverStudentId, setAchieverStudentId] = useState<string>('');
  const [isCustomAchiever, setIsCustomAchiever] = useState<boolean>(false);

  const [requestedPoints, setRequestedPoints] = useState<number>(10);
  const [selectedRank, setSelectedRank] = useState<'1st' | '2nd' | '3rd' | ''>('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Media attachments queues
  const [queuedPhotos, setQueuedPhotos] = useState<{ id: string; file: File; name: string; size: number; url: string }[]>([]);
  const [queuedVideos, setQueuedVideos] = useState<{ id: string; file: File; name: string; size: number; url: string }[]>([]);
  const [queuedDocs, setQueuedDocs] = useState<{ id: string; file: File; name: string; size: number; url: string }[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const handleCategoryChange = (catId: string) => {
    setCategoryId(catId);
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
    setCategoryId(ach.categoryId);
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
    
    // Media attachments
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

  // Multiple files handlers
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    
    for (const file of files) {
      if (!isImageFile(file)) continue;
      try {
        // Step 1: Optimize photo proof individually
        const optimized = await optimizeImageFile(file, {
          maxDimension: 1600,
          targetMaxSizeBytes: 500 * 1024,
        });

        // Step 2: Upload optimized file
        const url = await uploadFile(optimized.file);
        setQueuedPhotos(prev => [...prev, {
          id: generateId('temp_pho'),
          file: optimized.file,
          name: optimized.fileName,
          size: optimized.optimizedSize,
          url: url || optimized.dataUrl, // Uses optimized preview
        }]);
      } catch (err) {
        console.warn('Fallback on sub-org photo optimization:', err);
        const url = await uploadFile(file);
        setQueuedPhotos(prev => [...prev, {
          id: generateId('temp_pho'),
          file,
          name: file.name,
          size: file.size,
          url,
        }]);
      }
    }
    if (e.target) e.target.value = '';
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    
    for (const file of files) {
      const url = await uploadFile(file);
      setQueuedVideos(prev => [...prev, {
        id: generateId('temp_vid'),
        file,
        name: file.name,
        size: file.size,
        url
      }]);
    }
  };

  const handleDocSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    
    for (const file of files) {
      const url = await uploadFile(file);
      setQueuedDocs(prev => [...prev, {
        id: generateId('temp_doc'),
        file,
        name: file.name,
        size: file.size,
        url
      }]);
    }
  };

  const handleRemoveQueuedPhoto = (id: string) => {
    setQueuedPhotos(prev => prev.filter(p => p.id !== id));
  };

  const handleRemoveQueuedVideo = (id: string) => {
    setQueuedVideos(prev => prev.filter(v => v.id !== id));
  };

  const handleRemoveQueuedDoc = (id: string) => {
    setQueuedDocs(prev => prev.filter(d => d.id !== id));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!title.trim() || !programName.trim() || !date || !description.trim()) {
      setFormError('Please fill in all required fields marked with * (Title, Program/Activity Name, Activity Date, and Description).');
      return;
    }

    const selectedCat = categories.find(c => c.id === categoryId);
    if (selectedCat?.isRankBased && !selectedRank) {
      setFormError('Please select a rank (1st, 2nd, or 3rd place) for this rank-based category.');
      return;
    }

    setSubmitting(true);
    try {
      // Gather all uploaded files
      const allFiles = [
        ...queuedPhotos.map(p => ({ fileUrl: p.url, name: p.name, size: p.size, type: 'photo' as const })),
        ...queuedVideos.map(v => ({ fileUrl: v.url, name: v.name, size: v.size, type: 'video' as const })),
        ...queuedDocs.map(d => ({ fileUrl: d.url, name: d.name, size: d.size, type: 'document' as const }))
      ];

      const cleanAchieverName = achieverName.trim();
      const cleanAchieverStudentId = achieverStudentId.trim();
      const finalAchId = cleanAchieverName ? achieverId : 'unassigned';

      if (isEditing && editingAchievementId) {
        await updateAchievement(editingAchievementId, {
          title: title.trim(),
          programName: programName.trim(),
          categoryId: categoryId || '',
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

      // Reset form
      resetForm();
      
      setActiveTab('overview');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit achievement. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getMediaForAchievement = (achId: string) => {
    return mediaAttachments.filter(m => m.achievementId === achId);
  };

  const getCategoryName = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? cat.name : 'Achievement';
  };

  const getStatusBadge = (status: SP_Achievement['status']) => {
    switch (status) {
      case 'Approved':
        return <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-lg flex items-center gap-1">🟢 Approved</span>;
      case 'Rejected':
        return <span className="px-2.5 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold rounded-lg flex items-center gap-1">🔴 Rejected</span>;
      case 'Under Review':
        return <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold rounded-lg flex items-center gap-1">🔵 Under Review</span>;
      case 'Returned for Correction':
        return <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold rounded-lg flex items-center gap-1">🟡 Returned for Correction</span>;
      default:
        return <span className="px-2.5 py-0.5 bg-slate-50 text-slate-800 border border-slate-200 text-[10px] font-bold rounded-lg flex items-center gap-1">⚪ Submitted</span>;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6" id="sub-org-portal-dashboard">
      {/* Sub-Org Top Header Card with Log Out */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-xs">
        <div className="flex items-center gap-3 text-center sm:text-left w-full sm:w-auto">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center font-bold shrink-0">
            {((activeOrg?.name || portalUser?.name || 'SO').trim().slice(0, 2)).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900 font-heading truncate">
                {activeOrg?.name || portalUser?.name || 'Class Sub-Organization'}
              </h2>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-full">
                Class Sub-Org Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate">
              Logged in as {portalUser?.email}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            logoutPortalUser();
            sessionStorage.setItem('sp_explicit_logout', 'true');
          }}
          className="w-full sm:w-auto py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Out</span>
        </button>
      </div>

      {/* Sub-Org Unified Portal Navigation - only shown when not on full-screen submit form page */}
      {activeTab !== 'submit' && (
        <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none gap-1 sm:gap-2 px-1">
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`py-2.5 sm:py-3.5 px-3 sm:px-5 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Leaderboard & Ranks
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('awards')}
            className={`py-2.5 sm:py-3.5 px-3 sm:px-5 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'awards'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Conferred Awards
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-2.5 sm:py-3.5 px-3 sm:px-5 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
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
            className={`py-2.5 sm:py-3.5 px-3 sm:px-5 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'notifications'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Alert Notifications</span>
            {notifications.filter(n => !n.isRead && n.organizationId === portalUser?.organizationId).length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            )}
          </button>
        </div>
      )}

      {/* Leaderboard & Ranks Tab (Default) */}
      {activeTab === 'leaderboard' && (
        <ViewerDashboard currentTab="leaderboard" hideTabsHeader={true} />
      )}

      {/* Conferred Awards Tab */}
      {activeTab === 'awards' && (
        <ViewerDashboard currentTab="awards" hideTabsHeader={true} />
      )}

      {/* Overview & Submissions tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Overview stats header */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Class Identity Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-6 flex items-center gap-3 sm:gap-4 shadow-xs col-span-2">
              {activeOrg?.logo ? (
                <img src={activeOrg.logo} alt={activeOrg?.name || 'Class Logo'} className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl object-cover border border-slate-200" />
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-base sm:text-lg shrink-0">
                  {((activeOrg?.name || portalUser?.name || 'SP').trim().slice(0, 2)).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 font-heading leading-tight truncate">
                  {activeOrg?.name || portalUser?.name || 'Class Organization'}
                </h1>
                <p className="text-xs text-slate-500 truncate">
                  {activeOrg?.className || 'Class Account'} • Admin: {portalUser?.name || portalUser?.email}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md">
                    Active Organization
                  </span>
                </div>
              </div>
            </div>

            {/* Total Points Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-3.5 sm:p-5 flex flex-col justify-between shadow-xs">
              <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Total Earned</p>
              <div className="flex flex-wrap items-baseline gap-1 sm:gap-2 mt-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-800">
                  {orgAchievements.filter(a => a.status === 'Approved').reduce((sum, a) => sum + (Number(a.awardedPoints) || 0), 0)}
                </span>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-500">POINTS</span>
              </div>
            </div>

            {/* Current Standing Rank Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-3.5 sm:p-5 flex flex-col justify-between shadow-xs">
              <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Leaderboard Rank</p>
              <div className="flex flex-wrap items-baseline gap-1 sm:gap-2 mt-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-800">#{activeRank || '-'}</span>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-500">OUT OF 10</span>
              </div>
            </div>
          </div>
          {/* Achievements Submissions Table */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-6 space-y-4">
            <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" />
                Submissions Registry
              </h2>
              {portal?.submissionsAllowed !== false ? (
                <button
                  onClick={() => { resetForm(); setActiveTab('submit'); }}
                  className="py-1.5 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Achievement</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium">
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Achievement submissions are currently closed by the administrator.</span>
                </div>
              )}
            </div>

            {orgAchievements.length === 0 ? (
              <div className="text-center py-12 space-y-1.5">
                <p className="text-slate-400 text-xs italic">You haven't submitted any achievements yet.</p>
                {portal?.submissionsAllowed === false ? (
                  <p className="text-amber-800 text-xs font-medium inline-flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" />
                    Achievement submissions are currently closed by the administrator.
                  </p>
                ) : (
                  <p className="text-slate-400 text-xs italic">
                    Click the "+ Add Achievement" button to submit your first achievement!
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Title / Program</th>
                      <th className="py-3 px-4">Whose Achievement (Achiever)</th>
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
                        <td className="py-4 px-4 font-bold text-slate-900">
                          <div>
                            <p>{ach.title}</p>
                            <p className="text-[10px] font-semibold text-slate-400">{ach.programName}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <div>
                              <p className="font-extrabold text-slate-900 text-xs">{ach.achieverName || 'Achiever Not Assigned'}</p>
                              {ach.achieverStudentId && (
                                <p className="text-[10px] text-slate-400 font-mono">ID: {ach.achieverStudentId}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-semibold text-slate-500">
                          {getCategoryName(ach.categoryId)}
                        </td>
                        <td className="py-4 px-4 font-medium text-slate-500">
                          {formatDate(ach.date)}
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-700">
                          {ach.requestedPoints}
                        </td>
                        <td className="py-4 px-4">
                          {getStatusBadge(ach.status)}
                        </td>
                        <td className="py-4 px-4 text-right space-x-1">
                          <button
                            onClick={() => setSelectedAchievement(ach)}
                            className="py-1.5 px-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 font-semibold cursor-pointer inline-flex items-center gap-1"
                          >
                            View
                          </button>
                          {(ach.status === 'Submitted' || ach.status === 'Returned for Correction') && (
                            <button
                              onClick={() => handleEdit(ach)}
                              className="py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-700 font-semibold cursor-pointer inline-flex items-center gap-1"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Edit
                            </button>
                          )}
                          {(ach.status === 'Draft' || ach.status === 'Returned for Correction') && (
                            <button
                              onClick={async () => {
                                if (confirm('Are you sure you want to delete this submission?')) {
                                  await deleteAchievement(ach.id);
                                }
                              }}
                              className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-700 cursor-pointer"
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

      {/* Submit Achievement full page view */}
      {activeTab === 'submit' && (
        portal?.submissionsAllowed === false && !isEditing ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto shadow-sm my-6">
            <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900 font-heading">Achievement Submissions Closed</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Achievement submissions are currently closed by the administrator. New submissions cannot be created at this time.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="py-2.5 px-6 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs cursor-pointer transition-all"
            >
              Back to Submissions Registry
            </button>
          </div>
        ) : (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-8 space-y-6 shadow-sm">
          {/* Header with Back Button */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Overview</span>
            </button>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              {isEditing ? 'Edit Achievement Form' : 'New Achievement Form'}
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-base sm:text-xl font-bold text-slate-900">
              {isEditing ? 'Edit Achievement Submission' : 'Submit New Achievement Proof'}
            </h2>
            <p className="text-xs text-slate-500">
              {isEditing ? 'Update the details of your submitted achievement.' : 'Attach files, fill details, and request evaluations from administrators.'}
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-5 sm:space-y-6">
            {!isEditing && portal?.submissionsAllowed === false && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-sm text-amber-950">Submissions Temporarily Paused</p>
                  <p className="text-amber-800 leading-relaxed">
                    The portal administrator has paused new achievement submissions. You cannot submit new entries at this time. You can still review past submissions and rankings.
                  </p>
                </div>
              </div>
            )}

            {formError && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700" htmlFor="ach-title">Achievement Title *</label>
                <input
                  type="text"
                  id="ach-title"
                  required
                  placeholder="e.g. Conducted Seminar on AI Ethics"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700" htmlFor="ach-prog">Program/Activity Name *</label>
                <input
                  type="text"
                  id="ach-prog"
                  required
                  placeholder="e.g. AI Ethics Workshop Series"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700" htmlFor="ach-cat">Point Category</label>
                <select
                  id="ach-cat"
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-800"
                >
                  <option value="">Select point category (optional)...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} {cat.isRankBased ? '(Rank-Based)' : `(Default: ${cat.defaultPoints} pts)`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rank selection if category is rank-based */}
              {(() => {
                const selectedCat = categories.find(c => c.id === categoryId);
                if (!selectedCat?.isRankBased) return null;
                return (
                  <div className="space-y-2 bg-amber-50/60 p-4 rounded-2xl border border-amber-200 sm:col-span-2">
                    <label className="text-xs font-bold text-amber-900 uppercase flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-amber-600" />
                      <span>Position / Rank *</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['1st', '2nd', '3rd'] as const).map((r) => {
                        const pts = r === '1st' ? selectedCat.rank1Points : r === '2nd' ? selectedCat.rank2Points : selectedCat.rank3Points;
                        const isSelected = selectedRank === r;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => handleRankChange(r)}
                            className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-amber-600 border-amber-700 text-white shadow-sm'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{r} Place</span>
                            <span className={`text-[10px] ${isSelected ? 'text-amber-100' : 'text-slate-500'}`}>
                              +{pts || 0} pts
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700" htmlFor="ach-date">Activity Date *</label>
                <input
                  type="date"
                  id="ach-date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700" htmlFor="ach-place">Activity Venue/Place</label>
                <input
                  type="text"
                  id="ach-place"
                  placeholder="e.g. Audi 2 / Online"
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-800"
                />
              </div>

              {/* Student Identification - Individual Achiever Identification (Optional for group achievements) */}
              <div className="space-y-3 sm:col-span-2 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-700" />
                    <span>Student Identification</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium bg-slate-200/70 px-2 py-0.5 rounded-md self-start sm:self-auto">
                    Optional: Leave blank for group / class-level achievements
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block" htmlFor="ach-sid-input">Student / Roll ID</label>
                    <input
                      type="text"
                      id="ach-sid-input"
                      placeholder="Enter Student / Roll ID (Optional)"
                      value={achieverStudentId}
                      onChange={(e) => {
                        const sid = e.target.value;
                        setAchieverStudentId(sid);
                        // Lookup
                        const member = orgMembers.find(m => m.studentId?.toLowerCase() === sid.toLowerCase());
                        if (member) {
                          setAchieverName(member.name);
                          setAchieverId(member.id);
                        } else {
                          setAchieverId('new');
                        }
                      }}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block" htmlFor="ach-name-input">Student Name</label>
                    <input
                      type="text"
                      id="ach-name-input"
                      placeholder="Enter Student Name (Optional)"
                      value={achieverName}
                      onChange={(e) => {
                        setAchieverName(e.target.value);
                        if (!achieverId || achieverId !== 'new') {
                          setAchieverId('new');
                        }
                      }}
                      readOnly={achieverId && achieverId !== 'new'}
                      className={`w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-800 ${achieverId && achieverId !== 'new' ? 'opacity-70' : ''}`}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700" htmlFor="ach-part">Students Participant Count</label>
                <input
                  type="number"
                  id="ach-part"
                  min="0"
                  value={participantsCount}
                  onChange={(e) => setParticipantsCount(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700" htmlFor="ach-req">Requested Points</label>
                <input
                  type="number"
                  id="ach-req"
                  min="1"
                  value={requestedPoints}
                  onChange={(e) => setRequestedPoints(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700" htmlFor="ach-desc">Description of achievement *</label>
              <textarea
                id="ach-desc"
                required
                rows={4}
                placeholder="Detail the agenda, speaker/guests, and general outcomes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700" htmlFor="ach-notes">Additional Evaluation Notes</label>
              <textarea
                id="ach-notes"
                rows={2}
                placeholder="Any special remarks for points calculation..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-800"
              />
            </div>

            {/* Program Proof Upload Sections */}
            <div className="space-y-6 pt-4 border-t border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">UPLOAD PROGRAM PROOFS</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Photo Proof Section */}
                <div className="space-y-3 bg-slate-50 p-5 rounded-3xl border border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Image className="w-4 h-4 text-emerald-600" />
                      Photo Proofs <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">multiple images</span>
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      id="upload-photos"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <label
                      htmlFor="upload-photos"
                      className="w-full py-2 px-4 bg-white border border-slate-200 hover:border-emerald-600 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Choose Photo Files
                    </label>
                  </div>

                  {/* Photqueued list */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pt-1">
                    {queuedPhotos.map(p => (
                      <div key={p.id} className="bg-white p-2 rounded-xl border border-slate-100 flex items-center justify-between gap-2">
                        <img src={p.url} alt="Proof" className="w-8 h-8 rounded-md object-cover border border-slate-200" referrerPolicy="no-referrer" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-slate-900 truncate">{p.name}</p>
                          <p className="text-[9px] text-slate-400">{(p.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveQueuedPhoto(p.id)}
                          className="p-1 hover:bg-slate-100 rounded-md text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Video Proof Section */}
                <div className="space-y-3 bg-slate-50 p-5 rounded-3xl border border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Film className="w-4 h-4 text-emerald-600" />
                      Video Proofs <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">multiple videos</span>
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      id="upload-videos"
                      multiple
                      accept="video/*"
                      onChange={handleVideoSelect}
                      className="hidden"
                    />
                    <label
                      htmlFor="upload-videos"
                      className="w-full py-2 px-4 bg-white border border-slate-200 hover:border-emerald-600 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Choose Video Files
                    </label>
                  </div>

                  {/* Videoqueued list */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pt-1">
                    {queuedVideos.map(v => (
                      <div key={v.id} className="bg-white p-2 rounded-xl border border-slate-100 flex items-center justify-between gap-2">
                        <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-500">
                          <Film className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-slate-900 truncate">{v.name}</p>
                          <p className="text-[9px] text-slate-400">{(v.size / (1024 * 1024)).toFixed(1)} MB</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveQueuedVideo(v.id)}
                          className="p-1 hover:bg-slate-100 rounded-md text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Document Proof Section */}
                <div className="space-y-3 bg-slate-50 p-5 rounded-3xl border border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      Document Proofs
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">multiple documents</span>
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      id="upload-docs"
                      multiple
                      accept=".pdf,.doc,.docx"
                      onChange={handleDocSelect}
                      className="hidden"
                    />
                    <label
                      htmlFor="upload-docs"
                      className="w-full py-2 px-4 bg-white border border-slate-200 hover:border-emerald-600 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Choose Document Files
                    </label>
                  </div>

                  {/* Documentqueued list */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pt-1">
                    {queuedDocs.map(d => (
                      <div key={d.id} className="bg-white p-2 rounded-xl border border-slate-100 flex items-center justify-between gap-2">
                        <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-500">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-slate-900 truncate">{d.name}</p>
                          <p className="text-[9px] text-slate-400">{(d.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveQueuedDoc(d.id)}
                          className="p-1 hover:bg-slate-100 rounded-md text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  if (isEditing) {
                    if (confirm('Discard changes?')) {
                      setIsEditing(false);
                      setEditingAchievementId(null);
                      setActiveTab('overview');
                    }
                  } else {
                    setActiveTab('overview');
                  }
                }}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all text-sm flex items-center justify-center cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || (!isEditing && portal?.submissionsAllowed === false)}
                className="flex-1 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-md transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isEditing ? 'Saving changes...' : 'Submitting...'}</span>
                  </>
                ) : !isEditing && portal?.submissionsAllowed === false ? (
                  'Submissions Paused by Admin'
                ) : (
                  isEditing ? 'Save Changes' : 'Submit Achievement to Admin'
                )}
              </button>
            </div>
          </form>
        </div>
        )
      )}

      {/* Notifications tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-600" />
            Class Alerts & Review Feedback
          </h2>

          {notifications.filter(n => n.organizationId === portalUser?.organizationId).length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs italic">
              No notifications logs found for your organization.
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.filter(n => n.organizationId === portalUser?.organizationId).map(not => (
                <div key={not.id} className={`p-4 rounded-2xl border flex items-start gap-3 shadow-2xs ${not.isRead ? 'bg-slate-50/50 border-slate-100' : 'bg-emerald-50/20 border-emerald-100'}`}>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900">{not.title}</p>
                    <p className="text-[11px] text-slate-600 mt-1">{not.message}</p>
                    <p className="text-[9px] text-slate-400 font-semibold mt-2">{formatDate(not.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedAchievement && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 font-bold text-[10px] rounded-lg">
                  {getCategoryName(selectedAchievement.categoryId)}
                </span>
                <h3 className="text-xl font-bold text-slate-900 font-heading">{selectedAchievement.title}</h3>
                <p className="text-xs text-slate-500 font-semibold">{activeOrg?.name}</p>
              </div>
              <button
                onClick={() => setSelectedAchievement(null)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl space-y-1">
                <p className="text-slate-400 font-semibold">DATE & VENUE</p>
                <p className="font-bold text-slate-800 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {formatDate(selectedAchievement.date)}
                </p>
                <p className="text-slate-600 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {selectedAchievement.place || 'Main Campus'}
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl space-y-1">
                <p className="text-slate-400 font-semibold">WHOSE ACHIEVEMENT (ACHIEVER)</p>
                <p className="font-extrabold text-slate-900 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-emerald-700" />
                  {selectedAchievement.achieverName || 'Achiever Not Assigned'}
                </p>
                {selectedAchievement.achieverStudentId && (
                  <p className="text-slate-500 text-[10px] font-mono">
                    Student ID: {selectedAchievement.achieverStudentId}
                  </p>
                )}
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl space-y-1">
                <p className="text-slate-400 font-semibold">EVALUATION</p>
                <p className="font-bold text-emerald-700 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-emerald-600" />
                  Awarded: {selectedAchievement.awardedPoints} points
                </p>
                <div className="flex items-center gap-1">
                  <span>Status:</span>
                  {getStatusBadge(selectedAchievement.status)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800">ACTIVITY DESCRIPTION</h4>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{selectedAchievement.description}</p>
            </div>

            {/* Media Proof Preview Cards */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800">VERIFIED PROGRAM PROOFS</h4>
              {getMediaForAchievement(selectedAchievement.id).length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">No proof files attached to this submission.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {getMediaForAchievement(selectedAchievement.id).map(med => (
                    <div key={med.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3">
                      {med.proofType === 'photo' ? (
                        <img src={med.fileUrl} alt="Thumbnail" className="w-12 h-12 rounded-lg object-cover border border-slate-200" referrerPolicy="no-referrer" />
                      ) : med.proofType === 'video' ? (
                        <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                          <Film className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{med.fileName}</p>
                        <p className="text-[10px] text-slate-500 uppercase">{med.proofType}</p>
                      </div>
                      <a
                        href={med.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-white hover:bg-slate-100 rounded-lg text-slate-500 border border-slate-200 cursor-pointer"
                        title="Download/View file"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedAchievement.reviewNotes && (
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl space-y-1">
                <h4 className="text-xs font-bold text-emerald-900">ADMIN REVIEWER FEEDBACK</h4>
                <p className="text-xs text-emerald-800 italic leading-relaxed">"{selectedAchievement.reviewNotes}"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Action Button (+ Add Achievement) - comfortably positioned above bottom navigation bar in both app and portal viewports */}
      {activeTab !== 'submit' && portal?.submissionsAllowed !== false && (
        <div className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 z-[60]">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setActiveTab('submit');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2 px-4 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-full shadow-[0_10px_30px_rgba(4,120,87,0.4)] border-2 border-white/30 transition-all cursor-pointer group"
            title="Submit New Achievement"
            aria-label="Submit New Achievement"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 transition-colors shadow-inner">
              <Plus className="w-4 h-4 text-white stroke-[3]" />
            </div>
            <span className="font-bold pr-1">+ Add Achievement</span>
          </motion.button>
        </div>
      )}
    </div>
  );
};
