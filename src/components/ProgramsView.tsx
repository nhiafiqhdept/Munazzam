import React, { useState, useEffect, useMemo } from 'react';
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
  ArrowLeft,
  Eye,
  Building2,
} from 'lucide-react';
import { Program, SubWing } from '../types';
import { useApp } from '../context/AppContext';
import { formatDate, determineProgramStatusByDate, getProgramEffectiveStatus } from '../utils/helpers';
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

  // Sub-Wing Proposals and Directory Navigation
  const [proposalFilter, setProposalFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedSubWingId, setSelectedSubWingId] = useState<string | null>(null);
  const [selectedProposalForDetails, setSelectedProposalForDetails] = useState<Program | null>(null);
  const [subWingSearch, setSubWingSearch] = useState('');

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
        selectedStatus === 'all' || getProgramEffectiveStatus(prog).toLowerCase() === selectedStatus.toLowerCase();

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
      const found = subWingPrograms.find((p) => p.id === id);
      const calculatedStatus = found ? determineProgramStatusByDate(found.date) : 'upcoming';
      await updateDoc(doc(db, 'programs', id), { 
        subWingStatus: 'approved',
        status: calculatedStatus
      });
      if (selectedProposalForDetails?.id === id) {
        setSelectedProposalForDetails((prev) =>
          prev ? { ...prev, subWingStatus: 'approved', status: calculatedStatus } : null
        );
      }
    } catch (err) {
      console.error('Error approving proposal:', err);
    }
  };

  const handleRejectProposal = async (id: string) => {
    try {
      await updateDoc(doc(db, 'programs', id), { subWingStatus: 'rejected' });
      if (selectedProposalForDetails?.id === id) {
        setSelectedProposalForDetails((prev) =>
          prev ? { ...prev, subWingStatus: 'rejected' } : null
        );
      }
    } catch (err) {
      console.error('Error rejecting proposal:', err);
    }
  };

  // Sub-Wing directory and proposals calculation
  const allSubWings = useMemo(() => {
    const map = new Map<string, SubWing>();
    subWings.forEach((w) => map.set(w.id, w));
    // Fallback: If any proposal references a sub-wing not in sub_wings table, synthesize an entry so proposals are never orphaned
    subWingPrograms.forEach((p) => {
      if (p.subWingId && !map.has(p.subWingId)) {
        map.set(p.subWingId, {
          id: p.subWingId,
          portalId: currentOrg?.id || '',
          name: p.subWingName || 'Sub-Wing Partner',
          president: 'Responsible Person',
          contactDetails: '',
          email: p.submittedByEmail || '',
          passwordHash: '',
          description: '',
          status: 'approved',
          createdAt: p.submittedAt || '',
        });
      }
    });
    return Array.from(map.values());
  }, [subWings, subWingPrograms, currentOrg?.id]);

  const getSubWingStats = (wingId: string) => {
    const wingProposals = subWingPrograms.filter(
      (p) =>
        p.subWingId === wingId &&
        (!p.organization_id || p.organization_id === currentOrg.id)
    );
    const total = wingProposals.length;
    const pending = wingProposals.filter((p) => p.subWingStatus === 'pending').length;
    const approved = wingProposals.filter((p) => p.subWingStatus === 'approved').length;
    const rejected = wingProposals.filter((p) => p.subWingStatus === 'rejected').length;
    return { total, pending, approved, rejected, proposals: wingProposals };
  };

  // Counts
  const totalSubWings = allSubWings.length;
  const pendingSubWingsCount = allSubWings.filter((sw) => sw.status === 'pending').length;
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
                      {/* Poster Image Area */}
                      <div
                        className="relative h-48 bg-slate-900 overflow-hidden cursor-pointer"
                        onClick={() => viewProgramDetails(prog.id)}
                      >
                        <img
                          src={prog.poster || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=80'}
                          alt={prog.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                        {/* Status Badge */}
                        <span
                          className={`absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs uppercase tracking-wider flex items-center gap-1 shadow-sm ${
                            getProgramEffectiveStatus(prog) === 'upcoming'
                              ? 'bg-sky-500/90 text-white border border-sky-400/40'
                              : getProgramEffectiveStatus(prog) === 'ongoing'
                              ? 'bg-amber-500/90 text-white border border-amber-400/40'
                              : 'bg-emerald-600/90 text-white border border-emerald-400/40'
                          }`}
                        >
                          {getProgramEffectiveStatus(prog) === 'upcoming' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          )}
                          {getProgramEffectiveStatus(prog)}
                        </span>

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
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formatDate(prog.date)}</span>
                          </div>
                          {prog.place && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{prog.place}</span>
                            </div>
                          )}
                        </div>

                        {prog.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {prog.description}
                          </p>
                        )}

                        <div className="pt-2 flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                              getProgramEffectiveStatus(prog) === 'upcoming'
                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                : getProgramEffectiveStatus(prog) === 'ongoing'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {getProgramEffectiveStatus(prog)}
                          </span>
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
              onClick={() => {
                setActiveSubTab('proposals');
              }}
              className={`pb-2.5 px-4 text-xs font-bold transition-all relative cursor-pointer ${
                activeSubTab === 'proposals'
                  ? 'text-emerald-700 border-b-2 border-emerald-700 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sub-Wing Directory & Proposals ({subWingPrograms.length})
              {pendingProposalsCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[9px] font-extrabold">
                  {pendingProposalsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveSubTab('partners')}
              className={`pb-2.5 px-4 text-xs font-bold transition-all relative cursor-pointer ${
                activeSubTab === 'partners'
                  ? 'text-emerald-700 border-b-2 border-emerald-700 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Partner Directory ({totalSubWings})
              {pendingSubWingsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[9px] font-extrabold">
                  {pendingSubWingsCount}
                </span>
              )}
            </button>
          </div>

          {/* SUB-VIEW 1: SUB-WING DIRECTORY & PROPOSAL REVIEW */}
          {activeSubTab === 'proposals' && (
            <div className="space-y-4">
              {/* STATE A: NO SUB-WING SELECTED -> SHOW SUB-WING DIRECTORY CARDS */}
              {selectedSubWingId === null ? (
                <div className="space-y-4">
                  {/* Directory Header Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-700" />
                        <span>Sub-Wing Program Proposals</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Select a Sub-Wing to review its submitted program proposals
                      </p>
                    </div>

                    {allSubWings.length > 2 && (
                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={subWingSearch}
                          onChange={(e) => setSubWingSearch(e.target.value)}
                          placeholder="Search sub-wings..."
                          className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    )}
                  </div>

                  {/* Sub-Wing Cards Grid (Matching Class Organization Card design language) */}
                  {(() => {
                    const filteredWings = allSubWings.filter(
                      (w) =>
                        w.name.toLowerCase().includes(subWingSearch.toLowerCase()) ||
                        w.president.toLowerCase().includes(subWingSearch.toLowerCase())
                    );

                    if (filteredWings.length === 0) {
                      return (
                        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
                          <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">
                              {allSubWings.length === 0
                                ? 'No Sub-Wings Registered Yet'
                                : 'No Sub-Wings Match Your Search'}
                            </h4>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                              {allSubWings.length === 0
                                ? 'Share the public portal link with your departments or click "Add Partner" in Partner Directory to register sub-wings.'
                                : `No registered sub-wings match "${subWingSearch}".`}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredWings.map((wing) => {
                          const stats = getSubWingStats(wing.id);
                          const initials = wing.name.trim().substring(0, 2).toUpperCase() || 'SW';

                          return (
                            <div
                              key={wing.id}
                              onClick={() => {
                                setSelectedSubWingId(wing.id);
                                setProposalFilter(stats.pending > 0 ? 'pending' : 'all');
                              }}
                              className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 hover:border-emerald-600 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-4 group"
                            >
                              <div className="space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center font-black text-emerald-800 text-sm flex-shrink-0 shadow-2xs">
                                      {initials}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition-colors truncate">
                                        {wing.name}
                                      </h4>
                                      <p className="text-xs text-slate-500 truncate mt-0.5">
                                        {wing.president ? `President: ${wing.president}` : 'Sub-Wing Partner'}
                                      </p>
                                    </div>
                                  </div>

                                  {stats.pending > 0 ? (
                                    <span className="px-2 py-0.5 text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 rounded-full flex-shrink-0 animate-pulse">
                                      {stats.pending} Pending
                                    </span>
                                  ) : (
                                    wing.status === 'pending' && (
                                      <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 rounded-full flex-shrink-0">
                                        Pending Wing
                                      </span>
                                    )
                                  )}
                                </div>

                                {/* Proposal Statistics (Total, Pending, Approved, Rejected) */}
                                <div className="grid grid-cols-4 gap-1 sm:gap-2 bg-slate-50/80 p-2 rounded-xl text-center text-xs border border-slate-100/90">
                                  <div>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Total</span>
                                    <span className="font-bold text-slate-800">{stats.total}</span>
                                  </div>
                                  <div className="border-x border-slate-200/60">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Pending</span>
                                    <span
                                      className={`font-bold ${
                                        stats.pending > 0 ? 'text-amber-600' : 'text-slate-600'
                                      }`}
                                    >
                                      {stats.pending}
                                    </span>
                                  </div>
                                  <div className="border-r border-slate-200/60">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Approved</span>
                                    <span className="font-bold text-emerald-600">{stats.approved}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Rejected</span>
                                    <span className="font-bold text-rose-600">{stats.rejected}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:text-emerald-800">
                                <span>Review Proposals →</span>
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* STATE B: DEDICATED SUB-WING PROPOSAL REVIEW VIEW */
                (() => {
                  const selectedSubWing = allSubWings.find((w) => w.id === selectedSubWingId);
                  if (!selectedSubWing) {
                    return (
                      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
                        <p className="text-sm text-slate-600">Sub-Wing not found or has been removed.</p>
                        <button
                          onClick={() => setSelectedSubWingId(null)}
                          className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                        >
                          ← Back to Sub-Wings
                        </button>
                      </div>
                    );
                  }

                  const selectedStats = getSubWingStats(selectedSubWing.id);
                  const selectedWingProposals = selectedStats.proposals;
                  const filteredProposals = selectedWingProposals.filter(
                    (p) => proposalFilter === 'all' || p.subWingStatus === proposalFilter
                  );

                  return (
                    <div className="space-y-4">
                      {/* Top Navigation Row: Back Button */}
                      <div className="flex items-center justify-between gap-3">
                        <button
                          onClick={() => setSelectedSubWingId(null)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-emerald-800 bg-white border border-slate-200 hover:border-emerald-300 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-2xs group"
                        >
                          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                          <span>Back to Sub-Wings</span>
                        </button>

                        <span className="text-xs text-slate-500 font-medium">
                          Reviewing proposals for <strong className="text-slate-800">{selectedSubWing.name}</strong>
                        </span>
                      </div>

                      {/* Selected Sub-Wing Header Card */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center font-black text-emerald-800 text-base flex-shrink-0 shadow-2xs">
                            {selectedSubWing.name.trim().substring(0, 2).toUpperCase() || 'SW'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-heading truncate">
                                {selectedSubWing.name}
                              </h3>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                  selectedSubWing.status === 'approved'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {selectedSubWing.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              President: <strong className="text-slate-700">{selectedSubWing.president || 'N/A'}</strong>
                              {selectedSubWing.email && <span className="ml-2 text-slate-400">• {selectedSubWing.email}</span>}
                              {selectedSubWing.contactDetails && (
                                <span className="ml-2 text-slate-400">• {selectedSubWing.contactDetails}</span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Statistics Summary Pills */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-xl font-bold">
                            Total: {selectedStats.total}
                          </span>
                          <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl font-bold">
                            Pending: {selectedStats.pending}
                          </span>
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold">
                            Approved: {selectedStats.approved}
                          </span>
                          <span className="px-3 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl font-bold">
                            Rejected: {selectedStats.rejected}
                          </span>
                        </div>
                      </div>

                      {/* Status Filter Row */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
                        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-semibold">
                          <button
                            onClick={() => setProposalFilter('pending')}
                            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                              proposalFilter === 'pending'
                                ? 'bg-white text-amber-700 shadow-2xs font-bold'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Pending ({selectedStats.pending})
                          </button>
                          <button
                            onClick={() => setProposalFilter('approved')}
                            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                              proposalFilter === 'approved'
                                ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Approved ({selectedStats.approved})
                          </button>
                          <button
                            onClick={() => setProposalFilter('rejected')}
                            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                              proposalFilter === 'rejected'
                                ? 'bg-white text-rose-700 shadow-2xs font-bold'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Rejected ({selectedStats.rejected})
                          </button>
                          <button
                            onClick={() => setProposalFilter('all')}
                            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                              proposalFilter === 'all'
                                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            All ({selectedStats.total})
                          </button>
                        </div>
                      </div>

                      {/* Proposals List for Selected Sub-Wing */}
                      {selectedStats.total === 0 ? (
                        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
                          <CalendarDays className="w-8 h-8 text-slate-300 mx-auto" />
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">No proposals yet</h4>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                              This Sub-Wing has not submitted any program proposals.
                            </p>
                          </div>
                        </div>
                      ) : filteredProposals.length === 0 ? (
                        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
                          <CalendarDays className="w-8 h-8 text-slate-300 mx-auto" />
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">No {proposalFilter} proposals found</h4>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                              There are currently no proposals with {proposalFilter} status for this Sub-Wing.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {filteredProposals.map((proposal) => (
                            <div
                              key={proposal.id}
                              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors"
                            >
                              <div className="space-y-3">
                                {/* Date & Status */}
                                <div className="flex justify-between items-center gap-2">
                                  <span className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
                                    <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                                    {formatDate(proposal.date)}
                                  </span>
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                      proposal.subWingStatus === 'approved'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : proposal.subWingStatus === 'rejected'
                                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                                        : 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                                    }`}
                                  >
                                    {proposal.subWingStatus?.toUpperCase()}
                                  </span>
                                </div>

                                {/* Title & Category */}
                                <div>
                                  <h4 className="font-bold text-slate-900 text-base leading-snug">{proposal.name}</h4>
                                  {proposal.category && (
                                    <span className="inline-block mt-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                      {proposal.category}
                                    </span>
                                  )}
                                </div>

                                {/* Metadata Grid: Time & Target Audience */}
                                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                  <div>
                                    <span className="font-bold block text-slate-400 text-[9px] uppercase tracking-wider">
                                      Time
                                    </span>
                                    <span className="font-semibold text-slate-800">{proposal.time || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="font-bold block text-slate-400 text-[9px] uppercase tracking-wider">
                                      Target Audience
                                    </span>
                                    <span className="font-semibold text-slate-800 truncate block" title={proposal.audience}>
                                      {proposal.audience || 'N/A'}
                                    </span>
                                  </div>
                                </div>

                                {/* Resource Person / Faculty (if provided, otherwise omitted) */}
                                {proposal.resourcePerson && (
                                  <div className="text-xs text-slate-700 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100/80">
                                    <span className="font-bold block text-emerald-800 text-[9px] uppercase tracking-wider">
                                      Resource Person / Faculty
                                    </span>
                                    <span
                                      className="font-semibold text-emerald-950 block mt-0.5 truncate"
                                      title={proposal.resourcePerson}
                                    >
                                      {proposal.resourcePerson}
                                    </span>
                                  </div>
                                )}

                                {/* Description (if provided) */}
                                {proposal.description && (
                                  <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed line-clamp-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    {proposal.description}
                                  </p>
                                )}

                                {/* Submission Metadata */}
                                {(proposal.submittedAt || proposal.submittedByEmail) && (
                                  <p className="text-[10px] text-slate-400">
                                    Submitted {proposal.submittedAt ? formatDate(proposal.submittedAt) : ''}
                                    {proposal.submittedByEmail ? ` by ${proposal.submittedByEmail}` : ''}
                                  </p>
                                )}
                              </div>

                              {/* Proposal Card Actions */}
                              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                <button
                                  onClick={() => setSelectedProposalForDetails(proposal)}
                                  className="text-xs font-bold text-slate-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Details</span>
                                </button>

                                {proposal.subWingStatus === 'pending' && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleRejectProposal(proposal.id)}
                                      className="px-3 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                    >
                                      Reject
                                    </button>
                                    <button
                                      onClick={() => handleApproveProposal(proposal.id)}
                                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                                    >
                                      Approve & Publish
                                    </button>
                                  </div>
                                )}

                                {proposal.subWingStatus === 'approved' && (
                                  <button
                                    onClick={() => viewProgramDetails(proposal.id)}
                                    className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                  >
                                    <span>View in Official Programs</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()
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
                  {subWings.map((wing) => {
                    const initials = wing.name.trim().substring(0, 2).toUpperCase() || 'SW';
                    const stats = getSubWingStats(wing.id);

                    return (
                      <div
                        key={wing.id}
                        className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-600 hover:shadow-md transition-all flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center font-black text-emerald-800 text-xs flex-shrink-0 shadow-2xs">
                                {initials}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-slate-900 text-sm leading-snug truncate">{wing.name}</h4>
                                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-md text-[9px] font-extrabold border ${
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

                            {stats.total > 0 && (
                              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 shrink-0">
                                {stats.total} {stats.total === 1 ? 'proposal' : 'proposals'}
                              </span>
                            )}
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

                        {wing.status === 'pending' ? (
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
                        ) : (
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <button
                              onClick={() => {
                                setSelectedSubWingId(wing.id);
                                setActiveSubTab('proposals');
                                setProposalFilter('all');
                              }}
                              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <span>Review Proposals ({stats.total})</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
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

      {/* Sub-Wing Proposal Details Modal */}
      {selectedProposalForDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Sub-Wing Proposal Review
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                  {selectedProposalForDetails.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Submitted by: <strong>{selectedProposalForDetails.subWingName || 'Sub-Wing Partner'}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedProposalForDetails(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Poster Preview if available */}
            {selectedProposalForDetails.poster && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 max-h-56 bg-slate-100 flex items-center justify-center">
                <img
                  src={selectedProposalForDetails.poster}
                  alt={selectedProposalForDetails.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div>
                <span className="font-bold text-slate-400 text-[10px] uppercase block">Proposed Date</span>
                <span className="font-semibold text-slate-800">{formatDate(selectedProposalForDetails.date)}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 text-[10px] uppercase block">Time</span>
                <span className="font-semibold text-slate-800">{selectedProposalForDetails.time || 'N/A'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 text-[10px] uppercase block">Venue / Place</span>
                <span className="font-semibold text-slate-800">{selectedProposalForDetails.place || 'N/A'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 text-[10px] uppercase block">Target Audience</span>
                <span className="font-semibold text-slate-800">{selectedProposalForDetails.audience || 'N/A'}</span>
              </div>
              {selectedProposalForDetails.category && (
                <div className="col-span-2">
                  <span className="font-bold text-slate-400 text-[10px] uppercase block">Category</span>
                  <span className="font-semibold text-slate-800">{selectedProposalForDetails.category}</span>
                </div>
              )}
            </div>

            {/* Resource Person / Faculty */}
            {selectedProposalForDetails.resourcePerson && (
              <div className="text-xs bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100">
                <span className="font-bold text-emerald-800 text-[10px] uppercase block">Resource Person / Faculty</span>
                <span className="font-semibold text-emerald-950 block mt-0.5">{selectedProposalForDetails.resourcePerson}</span>
              </div>
            )}

            {/* Description */}
            {selectedProposalForDetails.description && (
              <div className="space-y-1">
                <span className="font-bold text-slate-700 text-xs block">Description</span>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                  {selectedProposalForDetails.description}
                </div>
              </div>
            )}

            {/* Attached Media */}
            {selectedProposalForDetails.media && selectedProposalForDetails.media.length > 0 && (
              <div className="space-y-1.5">
                <span className="font-bold text-slate-700 text-xs block">Attached Media & Proofs</span>
                <div className="grid grid-cols-3 gap-2">
                  {selectedProposalForDetails.media.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="aspect-square rounded-xl overflow-hidden border border-slate-200 block hover:opacity-90"
                    >
                      <img src={url} alt={`proof-${idx}`} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Status & Submitter */}
            <div className="flex justify-between items-center text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <span>
                Status:{' '}
                <strong className="capitalize text-slate-800">{selectedProposalForDetails.subWingStatus}</strong>
              </span>
              {selectedProposalForDetails.submittedAt && (
                <span>Submitted {formatDate(selectedProposalForDetails.submittedAt)}</span>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedProposalForDetails(null)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>

              {selectedProposalForDetails.subWingStatus === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleRejectProposal(selectedProposalForDetails.id)}
                    className="flex-1 py-2.5 border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Reject Proposal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproveProposal(selectedProposalForDetails.id)}
                    className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-2xs"
                  >
                    Approve & Publish
                  </button>
                </>
              )}
            </div>
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
