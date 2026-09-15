import React, { useState } from 'react';
import { usePortal, SP_Achievement, SP_Media } from '../../context/PortalContext';
import { 
  Trophy, Star, Calendar, MapPin, Upload, FileText, Image, Film, Plus, Trash2, 
  CheckCircle2, AlertCircle, Loader2, Megaphone, ChevronRight, Bell, History, X, Check, Paperclip
} from 'lucide-react';
import { motion } from 'motion/react';
import { formatDate, generateId, uploadFile } from '../../utils/helpers';
import { ViewerDashboard } from './ViewerDashboard';

export type SubOrgTab = 'leaderboard' | 'awards' | 'overview' | 'submit' | 'notifications';

export const SubOrgDashboard: React.FC = () => {
  const { 
    portalUser, organizations, achievements, categories, mediaAttachments, announcements, notifications,
    submitAchievement, updateAchievement, deleteAchievement, markNotificationsAsRead
  } = usePortal();

  // Active sub-organization
  const activeOrg = organizations.find(o => o.id === portalUser?.organizationId);
  const orgIndex = organizations.findIndex(o => o.id === portalUser?.organizationId);
  const activeRank = orgIndex >= 0 ? orgIndex + 1 : '-';

  const [activeTab, setActiveTab] = useState<SubOrgTab>('leaderboard');
  const [selectedAchievement, setSelectedAchievement] = useState<SP_Achievement | null>(null);

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
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [requestedPoints, setRequestedPoints] = useState<number>(10);
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
      setRequestedPoints(cat.defaultPoints);
    }
  };

  // Multiple files handlers
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    
    for (const file of files) {
      const url = await uploadFile(file);
      setQueuedPhotos(prev => [...prev, {
        id: generateId('temp_pho'),
        file,
        name: file.name,
        size: file.size,
        url
      }]);
    }
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

    if (!title || !programName || !categoryId || !date || !description) {
      setFormError('Please fill in all required fields marked with *');
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

      await submitAchievement({
        title,
        programName,
        categoryId,
        date,
        place,
        description,
        participantsCount,
        responsiblePerson,
        requestedPoints,
        additionalNotes
      }, allFiles);

      // Reset form
      setTitle('');
      setProgramName('');
      setCategoryId('');
      setDate(new Date().toISOString().split('T')[0]);
      setPlace('');
      setDescription('');
      setParticipantsCount(0);
      setResponsiblePerson('');
      setRequestedPoints(10);
      setAdditionalNotes('');
      setQueuedPhotos([]);
      setQueuedVideos([]);
      setQueuedDocs([]);

      setFormSuccess('Achievement successfully submitted to the Review Panel!');
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
    <div className="space-y-6" id="sub-org-portal-dashboard">
      {/* Sub-Org Unified Portal Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`py-3.5 px-5 font-bold text-sm border-b-2 whitespace-nowrap transition-all cursor-pointer ${
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
          className={`py-3.5 px-5 font-bold text-sm border-b-2 whitespace-nowrap transition-all cursor-pointer ${
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
          className={`py-3.5 px-5 font-bold text-sm border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Overview & Submissions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('submit')}
          className={`py-3.5 px-5 font-bold text-sm border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'submit'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Submit Achievement
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('notifications');
            markNotificationsAsRead();
          }}
          className={`py-3.5 px-5 font-bold text-sm border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
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
                <span className="text-2xl sm:text-3xl font-black text-emerald-800">{activeOrg?.totalPoints || 0}</span>
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
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" />
                Submissions Registry
              </h2>
              <button
                onClick={() => setActiveTab('submit')}
                className="py-1.5 px-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Submission
              </button>
            </div>

            {orgAchievements.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs italic">
                You haven't submitted any achievements yet. Use the 'Submit Achievement' tab to start!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Title / Program</th>
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

      {/* Submit Achievement tab */}
      {activeTab === 'submit' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Submit New Achievement Proof</h2>
            <p className="text-xs text-slate-500">Attach files, fill details, and request evaluations from administrators.</p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-6">
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
                <label className="text-xs font-bold text-slate-700" htmlFor="ach-cat">Point Category *</label>
                <select
                  id="ach-cat"
                  required
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-800"
                >
                  <option value="">Select point category...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name} (Default: {cat.defaultPoints} pts)</option>
                  ))}
                </select>
              </div>

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

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700" htmlFor="ach-resp">Responsible Bearer / Leader</label>
                <input
                  type="text"
                  id="ach-resp"
                  placeholder="e.g. John Doe, President"
                  value={responsiblePerson}
                  onChange={(e) => setResponsiblePerson(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-800"
                />
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
                      Photo Proofs
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">multiple image/*</span>
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
                      Video Proofs
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">multiple video/*</span>
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

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-md transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading files and submitting to Admin...</span>
                </>
              ) : (
                'Submit Achievement to Admin'
              )}
            </button>
          </form>
        </div>
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

            <div className="grid grid-cols-2 gap-4 text-xs">
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
    </div>
  );
};
