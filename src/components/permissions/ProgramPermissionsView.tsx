import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Plus,
  Printer,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  Calendar,
  Building,
  UserCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ProgramPermission, PermissionStatus, Program } from '../../types';
import { formatDate } from '../../utils/helpers';
import { PermissionStatusBadge } from './PermissionStatusBadge';
import { PrintableApprovalRequest } from './PrintableApprovalRequest';
import { PermissionReviewModal } from './PermissionReviewModal';
import { PermissionRequestModal } from './PermissionRequestModal';
import { SharePermissionModal } from './SharePermissionModal';
import { openWhatsAppShare, buildWhatsAppShareMessage, copyToClipboard, getPublicApprovalUrl } from '../../utils/permissionTokens';

export const ProgramPermissionsView: React.FC = () => {
  const {
    programPermissions,
    programs,
    viewProgramDetails,
    isAdmin,
    currentOrg,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrintPermission, setSelectedPrintPermission] = useState<ProgramPermission | null>(null);
  const [selectedReviewPermission, setSelectedReviewPermission] = useState<ProgramPermission | null>(null);
  const [selectedSharePermission, setSelectedSharePermission] = useState<ProgramPermission | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedEditProgram, setSelectedEditProgram] = useState<Program | null>(null);
  const [existingEditPermission, setExistingEditPermission] = useState<ProgramPermission | undefined>(undefined);
  const [showNewRequestSelectModal, setShowNewRequestSelectModal] = useState(false);

  const handleQuickCopyLink = async (perm: ProgramPermission) => {
    const url = perm.approvalToken ? getPublicApprovalUrl(perm.approvalToken) : '';
    if (url) {
      const ok = await copyToClipboard(url);
      if (ok) {
        setCopiedId(perm.id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } else {
      setSelectedSharePermission(perm);
    }
  };

  // Filtered permissions
  const filteredPermissions = useMemo(() => {
    return programPermissions.filter((p) => {
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.programName.toLowerCase().includes(q) ||
        (p.conductedBy && p.conductedBy.toLowerCase().includes(q)) ||
        (p.venue && p.venue.toLowerCase().includes(q)) ||
        (p.approvingAuthority && p.approvingAuthority.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [programPermissions, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: programPermissions.length,
      pending: programPermissions.filter((p) => p.status === 'pending').length,
      recommended: programPermissions.filter((p) => p.status === 'recommended').length,
      approved: programPermissions.filter((p) => p.status === 'approved').length,
      changes_required: programPermissions.filter((p) => p.status === 'changes_required').length,
      rejected: programPermissions.filter((p) => p.status === 'rejected').length,
    };
  }, [programPermissions]);

  // Programs without permission requests for quick request creation
  const programsWithoutPermission = useMemo(() => {
    return programs.filter(
      (prog) => !programPermissions.some((perm) => perm.programId === prog.id)
    );
  }, [programs, programPermissions]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0f1f4b] via-[#1e3a8a] to-[#1d4ed8] text-white flex items-center justify-center shadow-md shadow-blue-900/10">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Program Permissions
                </h1>
                <span className="bg-blue-50 text-[#1e3a8a] text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200">
                  College Approval Workflow
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Official administrative permission dossier and printable approval requests
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewRequestSelectModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-[#0f1f4b] via-[#1e3a8a] to-[#1d4ed8] hover:from-[#1e3a8a] hover:to-[#2563eb] text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer border border-blue-900/30"
            >
              <Plus className="w-4 h-4" />
              <span>Request College Permission</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div
            onClick={() => setStatusFilter('all')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="text-[11px] font-bold block opacity-80">ALL REQUESTS</span>
            <span className="text-xl font-black">{stats.total}</span>
          </div>

          <div
            onClick={() => setStatusFilter('approved')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'approved'
                ? 'bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-sm'
                : 'bg-blue-50 border-blue-200 text-blue-950 hover:bg-blue-100/70'
            }`}
          >
            <span className="text-[11px] font-bold block opacity-80">APPROVED</span>
            <span className="text-xl font-black">{stats.approved}</span>
          </div>

          <div
            onClick={() => setStatusFilter('pending')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100/70'
            }`}
          >
            <span className="text-[11px] font-bold block opacity-80">PENDING</span>
            <span className="text-xl font-black">{stats.pending}</span>
          </div>

          <div
            onClick={() => setStatusFilter('recommended')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'recommended'
                ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                : 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100/70'
            }`}
          >
            <span className="text-[11px] font-bold block opacity-80">RECOMMENDED</span>
            <span className="text-xl font-black">{stats.recommended}</span>
          </div>

          <div
            onClick={() => setStatusFilter('changes_required')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'changes_required'
                ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                : 'bg-orange-50 border-orange-200 text-orange-900 hover:bg-orange-100/70'
            }`}
          >
            <span className="text-[11px] font-bold block opacity-80">CHANGES REQ.</span>
            <span className="text-xl font-black">{stats.changes_required}</span>
          </div>

          <div
            onClick={() => setStatusFilter('rejected')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'rejected'
                ? 'bg-rose-700 text-white border-rose-700 shadow-sm'
                : 'bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100/70'
            }`}
          >
            <span className="text-[11px] font-bold block opacity-80">REJECTED</span>
            <span className="text-xl font-black">{stats.rejected}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by program name, conducted by, venue, or authority..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-semibold">
          {[
            { id: 'all', label: 'All' },
            { id: 'approved', label: 'Approved' },
            { id: 'pending', label: 'Pending' },
            { id: 'recommended', label: 'Recommended' },
            { id: 'changes_required', label: 'Changes Req.' },
            { id: 'rejected', label: 'Rejected' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setStatusFilter(item.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === item.id
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Permissions List Cards */}
      {filteredPermissions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-2xs">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center text-slate-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No Program Permission Requests Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'No permission records matched your filter criteria.'
                : 'College permission has not been requested for any program yet.'}
            </p>
          </div>
          {programs.length > 0 && (
            <button
              onClick={() => setShowNewRequestSelectModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-[#0f1f4b] via-[#1e3a8a] to-[#1d4ed8] hover:from-[#1e3a8a] hover:to-[#2563eb] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Permission Request</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredPermissions.map((perm) => {
            const matchingProg = programs.find((p) => p.id === perm.programId);
            return (
              <div key={perm.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-bold text-slate-900 text-sm">{perm.programName}</div>
                  <PermissionStatusBadge status={perm.status} size="sm" />
                </div>
                
                <div className="text-[11px] text-slate-500 font-medium space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Building className="w-3 h-3 text-slate-400" />
                    {perm.conductedBy || currentOrg?.name}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {formatDate(perm.date)} {perm.timeFrom ? `at ${perm.timeFrom}` : ''}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedSharePermission(perm)}
                      className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                      title="Share"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedPrintPermission(perm)}
                      className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                      title="Print"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedReviewPermission(perm)}
                      className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg transition-colors cursor-pointer"
                      title="Review"
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                  </div>
                  {matchingProg && (
                    <button
                      onClick={() => viewProgramDetails(matchingProg.id)}
                      className="px-3 py-1.5 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share Permission via WhatsApp / QR Modal */}
      {selectedSharePermission && (
        <SharePermissionModal
          permission={selectedSharePermission}
          onClose={() => setSelectedSharePermission(null)}
        />
      )}

      {/* Select Program to Request Permission Modal */}
      {showNewRequestSelectModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Select Program for Permission Request</h3>
                <p className="text-xs text-slate-400">
                  Choose an existing program to initiate the college approval workflow
                </p>
              </div>
              <button
                onClick={() => setShowNewRequestSelectModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {programs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No programs recorded in the system yet. Please create a program first.
                </div>
              ) : (
                programs.map((prog) => {
                  const existingPerm = programPermissions.find((p) => p.programId === prog.id);
                  return (
                    <div
                      key={prog.id}
                      onClick={() => {
                        setShowNewRequestSelectModal(false);
                        setSelectedEditProgram(prog);
                        setExistingEditPermission(existingPerm);
                      }}
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-[#1e3a8a] hover:bg-blue-50/40 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#1e3a8a]">
                          {prog.name}
                        </h4>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-1">
                          <span>📅 {formatDate(prog.date)}</span>
                          <span>📍 {prog.place}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {existingPerm ? (
                          <PermissionStatusBadge status={existingPerm.status} size="sm" />
                        ) : (
                          <span className="text-[11px] font-bold text-[#1e3a8a] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                            + Start Request
                          </span>
                        )}
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#1e3a8a] transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Printable Request Modal */}
      {selectedPrintPermission && (
        <PrintableApprovalRequest
          permission={selectedPrintPermission}
          onClose={() => setSelectedPrintPermission(null)}
        />
      )}

      {/* Review Modal */}
      {selectedReviewPermission && (
        <PermissionReviewModal
          permission={selectedReviewPermission}
          onClose={() => setSelectedReviewPermission(null)}
        />
      )}

      {/* Request Permission Form Modal */}
      {selectedEditProgram && (
        <PermissionRequestModal
          program={selectedEditProgram}
          existingPermission={existingEditPermission}
          onClose={() => {
            setSelectedEditProgram(null);
            setExistingEditPermission(undefined);
          }}
        />
      )}
    </div>
  );
};
