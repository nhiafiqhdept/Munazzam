import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  Search,
  MapPin,
  Clock,
  Camera,
  ChevronRight,
  Edit2,
  Trash2,
  Copy,
  Check,
  Layers,
  Users,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  User,
  FileText,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Program, SubWing } from '../types';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/helpers';
import { ConfirmModal } from './ConfirmModal';
import { db, cleanFirestorePayload } from '../lib/firebase';
import { doc, updateDoc, addDoc, setDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import bcrypt from 'bcryptjs';

interface ProgramsViewProps {
  onOpenAddModal: () => void;
  onOpenEditModal: (program: Program) => void;
}

export const ProgramsView: React.FC<ProgramsViewProps> = ({
  onOpenAddModal,
  onOpenEditModal,
}) => {
  const {
    currentOrg,
    programs,
    programCategories,
    viewProgramDetails,
    deleteProgram,
    isAdmin,
    subWings,
    subWingPrograms,
  } = useApp();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'official' | 'subwings'>('official');
  const [activeSubTab, setActiveSubTab] = useState<'proposals' | 'partners'>('proposals');

  // Search and general filters for official programs
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);

  // Link copy state
  const [linkCopied, setLinkCopied] = useState(false);

  // Manual Sub-Wing Creation States
  const [isAddPartnerOpen, setIsAddPartnerOpen] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerPresident, setNewPartnerPresident] = useState('');
  const [newPartnerContact, setNewPartnerContact] = useState('');
  const [newPartnerEmail, setNewPartnerEmail] = useState('');
  const [newPartnerPassword, setNewPartnerPassword] = useState('');
  const [newPartnerDesc, setNewPartnerDesc] = useState('');
  const [addPartnerError, setAddPartnerError] = useState<string | null>(null);
  const [addPartnerSubmitting, setAddPartnerSubmitting] = useState(false);

  // Sub-Wing Proposals filter
  const [proposalFilter, setProposalFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  // Public Portal ID state
  const [publicPortalId, setPublicPortalId] = useState<string>('');
  const [portalLoading, setPortalLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!currentOrg?.id) return;

    const syncPortal = async () => {
      try {
        // Query to check if a sub-wing portal already exists for this account
        const q = query(
          collection(db, 'sub_wing_portals'),
          where('accountId', '==', currentOrg.id)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          setPublicPortalId(docSnap.id);
        } else {
          // Generate a clean random alphanumeric portal ID
          const newPortalId = `swp_${currentOrg.id.slice(0, 8)}_${Math.random().toString(36).substring(2, 8)}`;
          const payload = cleanFirestorePayload({
            id: newPortalId,
            accountId: currentOrg.id,
            status: 'active',
            createdAt: new Date().toISOString(),
          });
          await setDoc(doc(db, 'sub_wing_portals', newPortalId), payload);
          setPublicPortalId(newPortalId);
        }
      } catch (err) {
        console.error('Error syncing sub-wing portal:', err);
      } finally {
        setPortalLoading(false);
      }
    };

    syncPortal();
  }, [currentOrg?.id]);

  if (!currentOrg) return null;

  // Filter & sort official programs
  const filteredPrograms = programs
    .filter((prog) => {
      const matchesSearch =
        prog.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (prog.category && prog.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        prog.place.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prog.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prog.audience.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        selectedStatus === 'all' || (prog.status || 'completed').toLowerCase() === selectedStatus.toLowerCase();

      const matchesCategory =
        selectedCategory === 'all' ||
        (selectedCategory === 'uncategorized'
          ? !prog.category
          : (prog.category || '').toLowerCase() === selectedCategory.toLowerCase() ||
            prog.category_id === selectedCategory);

      return matchesSearch && matchesStatus && matchesCategory;
    })
    .sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteProgram(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const hasActiveFilters = searchQuery.trim().length > 0 || selectedStatus !== 'all' || selectedCategory !== 'all';

  // Copy portal link helper
  const getPublicOrigin = () => {
    let origin = window.location.origin;
    if (origin.includes('ais-dev-')) {
      origin = origin.replace('ais-dev-', 'ais-pre-');
    }
    return origin;
  };

  const portalUrl = `${getPublicOrigin()}/?subwing=true&portal=${publicPortalId || currentOrg.id}`;
  const handleCopyPortalLink = () => {
    navigator.clipboard.writeText(portalUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // Manual Partner Registration
  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartnerName.trim() || !newPartnerPresident.trim() || !newPartnerEmail.trim() || !newPartnerPassword.trim()) {
      setAddPartnerError('Please fill in all required fields (*).');
      return;
    }

    setAddPartnerError(null);
    setAddPartnerSubmitting(true);

    const activePortalId = publicPortalId || currentOrg.id;

    try {
      // Check for global account duplicates? No, scope uniqueness scoped to this parent organization!
      const q = query(
        collection(db, 'sub_wings'),
        where('portalId', '==', activePortalId),
        where('email', '==', newPartnerEmail.trim().toLowerCase())
      );
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        setAddPartnerError('A sub-wing with this email is already registered under your organization.');
        setAddPartnerSubmitting(false);
        return;
      }

      const hash = bcrypt.hashSync(newPartnerPassword, 10);
      const payload = cleanFirestorePayload({
        portalId: activePortalId,
        accountId: currentOrg.id,
        name: newPartnerName.trim(),
        president: newPartnerPresident.trim(),
        contactDetails: newPartnerContact.trim(),
        email: newPartnerEmail.trim().toLowerCase(),
        passwordHash: hash,
        description: newPartnerDesc.trim(),
        status: 'approved', // Admin manual additions are auto-approved!
        createdAt: new Date().toISOString(),
      });

      await addDoc(collection(db, 'sub_wings'), payload);

      // Reset
      setNewPartnerName('');
      setNewPartnerPresident('');
      setNewPartnerContact('');
      setNewPartnerEmail('');
      setNewPartnerPassword('');
      setNewPartnerDesc('');
      setIsAddPartnerOpen(false);
    } catch (err) {
      console.error('Error adding sub-wing partner:', err);
      setAddPartnerError('An error occurred. Please try again.');
    } finally {
      setAddPartnerSubmitting(false);
    }
  };

  // Sub-Wing Actions
  const handleApproveSubWing = async (id: string) => {
    try {
      await updateDoc(doc(db, 'sub_wings', id), { status: 'approved' });
    } catch (err) {
      console.error('Error approving sub-wing:', err);
    }
  };

  const handleRejectSubWing = async (id: string) => {
    try {
      // 1. Delete all submitted program proposals belonging exclusively to this sub-wing
      const q = query(collection(db, 'programs'), where('subWingId', '==', id));
      const querySnap = await getDocs(q);
      const deletePromises = querySnap.docs.map((docSnap) => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);

      // 2. Delete the sub-wing account document
      await deleteDoc(doc(db, 'sub_wings', id));
    } catch (err) {
      console.error('Error rejecting and cleaning up sub-wing:', err);
    }
  };

  // Program Proposals Actions
  const handleApproveProposal = async (id: string) => {
    try {
      await updateDoc(doc(db, 'programs', id), { subWingStatus: 'approved' });
    } catch (err) {
      console.error('Error approving proposal:', err);
    }
  };

  const handleRejectProposal = async (id: string) => {
    try {
      await updateDoc(doc(db, 'programs', id), { subWingStatus: 'rejected' });
    } catch (err) {
      console.error('Error rejecting proposal:', err);
    }
  };

  // Counts
  const totalSubWings = subWings.length;
  const pendingSubWingsCount = subWings.filter((sw) => sw.status === 'pending').length;
  const pendingProposalsCount = subWingPrograms.filter((p) => p.subWingStatus === 'pending').length;

  return (
    <div className="space-y-4 pb-12">
      {/* Tab Switcher for Admin */}
      {isAdmin && (
        <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200 w-fit">
          <button
            onClick={() => setActiveTab('official')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'official'
                ? 'bg-white text-emerald-800 shadow-sm font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Official Programs & Activities</span>
          </button>
          <button
            onClick={() => setActiveTab('subwings')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 relative cursor-pointer ${
              activeTab === 'subwings'
                ? 'bg-white text-emerald-800 shadow-sm font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Sub-Wing Program Proposals</span>
            {(pendingSubWingsCount > 0 || pendingProposalsCount > 0) && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
            )}
          </button>
        </div>
      )}

      {/* VIEW A: OFFICIAL PROGRAMS & ACTIVITIES */}
      {activeTab === 'official' && (
        <>
          {/* Executive Combined Header & Toolbar Card */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            {/* Top Header Row */}
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 sm:p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100/80 shrink-0 shadow-2xs">
                  <CalendarDays className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-emerald-700" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-xl font-bold text-slate-900 font-heading leading-tight truncate">
                    Programs & Activities
                  </h1>
                  <p className="text-xs text-slate-500 hidden sm:block mt-0.5 truncate">
                    Official register of seminars, workshops, and academic events for {currentOrg.name}.
                  </p>
                </div>
              </div>

              {isAdmin && (
                <button
                  id="add-program-btn"
                  onClick={onOpenAddModal}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-2xs hover:shadow-xs transition-all active:scale-[0.98] shrink-0 cursor-pointer border border-emerald-600/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Program</span>
                </button>
              )}
            </div>

            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1 border-t border-slate-100">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="search-programs-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search programs by title, venue, audience..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {programCategories.length > 0 && (
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white font-medium cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    {programCategories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                    <option value="uncategorized">Uncategorized</option>
                  </select>
                )}

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white font-medium cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                </select>
              </div>
            </div>
          </div>

          {/* Programs List */}
          {filteredPrograms.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 sm:p-10 text-center border border-dashed border-slate-300 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  {hasActiveFilters ? 'No Programs Match Your Search' : 'No Programs Recorded Yet'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  {hasActiveFilters
                    ? 'Try adjusting your search terms or status filter to find recorded events.'
                    : 'Click "Add Program" in the header to record your organization\'s first event.'}
                </p>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedStatus('all');
                    setSelectedCategory('all');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPrograms.map((prog) => {
                return (
                  <div
                    key={prog.id}
                    id={`program-item-${prog.id}`}
                    className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-2xs hover:shadow-lg transition-all flex flex-col justify-between group"
                  >
                    {/* Top Section */}
                    <div>
                      {/* Poster Image */}
                      <div
                        className="relative h-48 bg-slate-900 overflow-hidden cursor-pointer"
                        onClick={() => viewProgramDetails(prog.id)}
                      >
                        <img
                          src={prog.poster || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80'}
                          alt={prog.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                        {/* Proof Count */}
                        {prog.media && prog.media.length > 0 && (
                          <span className="absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-xs text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Camera className="w-3 h-3" />
                            <span>{prog.media.length} Proofs</span>
                          </span>
                        )}

                        {/* Date Badge */}
                        <div className="absolute bottom-3 left-3 right-3 text-white">
                          <p className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{formatDate(prog.date)}</span>
                          </p>
                        </div>
                      </div>

                      {/* Body Content */}
                      <div className="p-5 space-y-3">
                        <h3
                          onClick={() => viewProgramDetails(prog.id)}
                          className="text-base font-bold text-slate-900 font-heading leading-snug hover:text-emerald-700 cursor-pointer transition-colors line-clamp-2"
                        >
                          {prog.name}
                        </h3>

                        <div className="space-y-1.5 text-xs text-slate-600">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{prog.place}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {prog.description}
                        </p>

                        <div className="pt-2 flex items-center gap-2 flex-wrap">
                          {prog.category && (
                            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-md">
                              {prog.category}
                            </span>
                          )}
                          <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                            For: {prog.audience}
                          </span>
                          {prog.subWingName && (
                            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md">
                              Sub-Wing: {prog.subWingName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer Controls */}
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => viewProgramDetails(prog.id)}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
                      >
                        <span>View Record & Proofs</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onOpenEditModal(prog)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 rounded-lg hover:bg-white transition-colors"
                            title="Edit Program"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(prog)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
                            title="Delete Program"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* VIEW B: SUB-WING PROGRAMS & PROPOSALS */}
      {activeTab === 'subwings' && (
        <div className="space-y-6">
          {/* Executive Overview & Link Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Link Copy Widget */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 md:col-span-2 flex flex-col justify-between gap-4 shadow-2xs">
              <div className="space-y-1.5">
                <span className="inline-flex px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold rounded-md">
                  🔗 Public Registration & Proposal Portal
                </span>
                <h3 className="text-sm font-bold text-slate-900">Partner Sub-Wing Integration</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Share this unique link with your departments, student unions, and sub-wings. They will be able to register, log in, and directly propose programs & activities for your review and approval.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono text-slate-600 select-all truncate">
                  {portalUrl}
                </div>
                <button
                  onClick={handleCopyPortalLink}
                  className="px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Portal URL</span>
                    </>
                  )}
                </button>
                <a
                  href={portalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors"
                  title="Open Portal Tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="bg-emerald-800 text-white p-5 rounded-2xl flex flex-col justify-between gap-3 shadow-sm">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-emerald-300 tracking-wider uppercase">Active Sub-Wings</p>
                <h3 className="text-3xl font-black font-heading tracking-tight">{totalSubWings} Partners</h3>
              </div>
              <div className="text-xs text-emerald-100 flex justify-between pt-3 border-t border-emerald-700/60">
                <span>Pending Wings: <strong>{pendingSubWingsCount}</strong></span>
                <span>Pending Proposals: <strong>{pendingProposalsCount}</strong></span>
              </div>
            </div>
          </div>

          {/* Sub-Tab Selector */}
          <div className="flex border-b border-slate-200/80 pb-px">
            <button
              onClick={() => setActiveSubTab('proposals')}
              className={`pb-2.5 px-4 text-xs font-bold transition-all relative cursor-pointer ${
                activeSubTab === 'proposals'
                  ? 'text-emerald-700 border-b-2 border-emerald-700 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Proposals & Submissions ({subWingPrograms.length})
            </button>
            <button
              onClick={() => setActiveSubTab('partners')}
              className={`pb-2.5 px-4 text-xs font-bold transition-all relative cursor-pointer ${
                activeSubTab === 'partners'
                  ? 'text-emerald-700 border-b-2 border-emerald-700 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Partner Directory ({subWings.length})
              {pendingSubWingsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[9px] font-extrabold">
                  {pendingSubWingsCount}
                </span>
              )}
            </button>
          </div>

          {/* SUB-VIEW 1: PROPOSALS & SUBMISSIONS */}
          {activeSubTab === 'proposals' && (
            <div className="space-y-4">
              {/* Filter Row */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-semibold">
                  {(['pending', 'approved', 'rejected', 'all'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setProposalFilter(filter)}
                      className={`px-3 py-1 rounded-lg transition-colors capitalize cursor-pointer ${
                        proposalFilter === filter
                          ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Proposal Listing */}
              {subWingPrograms.filter(p => proposalFilter === 'all' || p.subWingStatus === proposalFilter).length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
                  <CalendarDays className="w-8 h-8 text-slate-300 mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">No proposals found</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      There are no sub-wing program proposals matching this filter.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subWingPrograms
                    .filter(p => proposalFilter === 'all' || p.subWingStatus === proposalFilter)
                    .map((proposal) => (
                      <div
                        key={proposal.id}
                        className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                              <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                              {proposal.date}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${
                              proposal.subWingStatus === 'approved'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : proposal.subWingStatus === 'rejected'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {proposal.subWingStatus?.toUpperCase()}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-bold text-slate-900 text-sm leading-snug">{proposal.name}</h4>
                            <p className="text-[10px] text-emerald-800 font-bold mt-0.5">
                              Submitted by: {proposal.subWingName || 'Approved Wing'}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <div>
                              <span className="font-bold block text-slate-400 text-[9px] uppercase tracking-wider">Time</span>
                              <span className="font-semibold text-slate-800">{proposal.time || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="font-bold block text-slate-400 text-[9px] uppercase tracking-wider">Target Audience</span>
                              <span className="font-semibold text-slate-800 truncate block" title={proposal.audience}>{proposal.audience || 'N/A'}</span>
                            </div>
                          </div>

                          {proposal.resourcePerson && (
                            <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <span className="font-bold block text-slate-400 text-[9px] uppercase tracking-wider">Resource Person / Faculty</span>
                              <span className="font-semibold text-slate-800 block truncate" title={proposal.resourcePerson}>{proposal.resourcePerson}</span>
                            </div>
                          )}

                          <p className="text-xs text-slate-500 whitespace-pre-line leading-relaxed line-clamp-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            {proposal.description || 'No description provided.'}
                          </p>
                        </div>

                        {proposal.subWingStatus === 'pending' && (
                          <div className="flex gap-2 pt-2 border-t border-slate-100">
                            <button
                              onClick={() => handleRejectProposal(proposal.id)}
                              className="flex-1 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              Reject Proposal
                            </button>
                            <button
                              onClick={() => handleApproveProposal(proposal.id)}
                              className="flex-1 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              Approve & Publish
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* SUB-VIEW 2: PARTNER DIRECTORY */}
          {activeSubTab === 'partners' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center gap-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>Registered Partner Sub-Wings</span>
                </h3>
                <button
                  onClick={() => setIsAddPartnerOpen(true)}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-transform active:scale-95 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Partner</span>
                </button>
              </div>

              {/* Partners Listing */}
              {subWings.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
                  <Users className="w-8 h-8 text-slate-300 mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">No partner sub-wings yet</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      Use the public portal link to allow departments/wings to register, or click "Add Partner" to manually register one.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subWings.map((wing) => (
                    <div
                      key={wing.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm leading-snug">{wing.name}</h4>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[9px] font-extrabold border ${
                              wing.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : wing.status === 'rejected'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {wing.status.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-600 border-t border-b border-slate-100 py-2.5">
                          <p className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>President: <strong>{wing.president}</strong></span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{wing.email}</span>
                          </p>
                          {wing.contactDetails && (
                            <p className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{wing.contactDetails}</span>
                            </p>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500 italic leading-relaxed line-clamp-3">
                          {wing.description || 'No description listed.'}
                        </p>
                      </div>

                      {wing.status === 'pending' && (
                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => handleRejectSubWing(wing.id)}
                            className="flex-1 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            Disapprove
                          </button>
                          <button
                            onClick={() => handleApproveSubWing(wing.id)}
                            className="flex-1 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            Approve Partner
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manual Partner Addition Modal */}
      {isAddPartnerOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-md font-bold text-slate-900 font-heading">
                Manually Register Sub-Wing Partner
              </h3>
              <button
                onClick={() => setIsAddPartnerOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {addPartnerError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addPartnerError}</span>
              </div>
            )}

            <form onSubmit={handleAddPartner} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">SUB-WING NAME *</label>
                <input
                  type="text"
                  required
                  value={newPartnerName}
                  onChange={(e) => setNewPartnerName(e.target.value)}
                  placeholder="e.g. Department of Fiqh, Arts Council"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">PRESIDENT / RESPONSIBLE PERSON *</label>
                <input
                  type="text"
                  required
                  value={newPartnerPresident}
                  onChange={(e) => setNewPartnerPresident(e.target.value)}
                  placeholder="President's name"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">CONTACT DETAILS</label>
                <input
                  type="text"
                  value={newPartnerContact}
                  onChange={(e) => setNewPartnerContact(e.target.value)}
                  placeholder="Phone number, Telegram, etc."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">LOGIN EMAIL / USERNAME *</label>
                <input
                  type="email"
                  required
                  value={newPartnerEmail}
                  onChange={(e) => setNewPartnerEmail(e.target.value)}
                  placeholder="partner@munazzam.org"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">LOGIN PASSWORD *</label>
                <input
                  type="password"
                  required
                  value={newPartnerPassword}
                  onChange={(e) => setNewPartnerPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">DESCRIPTION / NOTES</label>
                <textarea
                  rows={3}
                  value={newPartnerDesc}
                  onChange={(e) => setNewPartnerDesc(e.target.value)}
                  placeholder="Notes about sub-wing activities or department targets..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPartnerOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addPartnerSubmitting}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  {addPartnerSubmitting ? 'Registering...' : 'Register Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Program Activity"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}" and all attached documentation proofs?`}
        confirmText="Yes, Delete Record"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
