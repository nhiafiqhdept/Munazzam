import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building,
  Calendar,
  Clock,
  MapPin,
  Users,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Printer,
  Sparkles,
  Award,
} from 'lucide-react';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ProgramPermission, PermissionHistoryItem } from '../../types';
import { formatDate } from '../../utils/helpers';
import { PermissionStatusBadge } from './PermissionStatusBadge';

interface OrganizationData {
  id?: string;
  name?: string;
  college_name?: string;
  logo?: string;
  tagline?: string;
}

interface PublicPermissionApprovalViewProps {
  token: string;
}

export const PublicPermissionApprovalView: React.FC<PublicPermissionApprovalViewProps> = ({
  token,
}) => {
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState<ProgramPermission | null>(null);
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<'not_found' | 'expired' | 'revoked' | null>(null);

  // Decision Modal States
  const [activeModal, setActiveModal] = useState<'approve' | 'reject' | 'changes' | null>(null);
  const [approverName, setApproverName] = useState('');
  const [approverDesignation, setApproverDesignation] = useState('Principal');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [changesNotes, setChangesNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<'approved' | 'rejected' | 'changes' | null>(null);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);

  const openModal = (type: 'approve' | 'reject' | 'changes') => {
    setSubmitErrorMessage(null);
    setActiveModal(type);
  };

  useEffect(() => {
    fetchPermissionAndOrgByToken();
  }, [token]);

  const fetchPermissionAndOrgByToken = async () => {
    setLoading(true);
    setErrorState(null);

    try {
      if (!token) {
        setErrorState('not_found');
        setLoading(false);
        return;
      }

      let fetchedPermData: any = null;
      let fetchedDocId: string = '';

      // 1. Attempt Server-side public API route
      try {
        const res = await fetch(`/api/public/college-permission/${encodeURIComponent(token)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.permission) {
            fetchedPermData = json.permission;
            fetchedDocId = json.permission.id || token;
            if (json.permission.organization) {
              setOrganization(json.permission.organization);
            }
          }
        }
      } catch (apiErr) {
        console.warn('Server public API fetch fallback to Firestore client:', apiErr);
      }

      // 2. If not found via server API, attempt direct Firestore query
      if (!fetchedPermData) {
        const q = query(
          collection(db, 'program_permissions'),
          where('approvalToken', '==', token)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          fetchedDocId = docSnap.id;
          fetchedPermData = docSnap.data();
        } else {
          // Fallback: check if the token itself is a direct permission document ID
          const directDoc = await getDoc(doc(db, 'program_permissions', token));
          if (directDoc.exists()) {
            fetchedDocId = directDoc.id;
            fetchedPermData = directDoc.data();
          }
        }
      }

      if (!fetchedPermData) {
        setErrorState('not_found');
        setLoading(false);
        return;
      }

      // 3. Process Permission Object
      const perm: ProgramPermission = {
        id: fetchedDocId,
        programId: fetchedPermData.programId || fetchedPermData.program_id || '',
        organizationId: fetchedPermData.organizationId || fetchedPermData.accountId || '',
        programName: fetchedPermData.programName || fetchedPermData.title || 'Untitled Program',
        conductedBy: fetchedPermData.conductedBy || fetchedPermData.organizer || '',
        category: fetchedPermData.category || '',
        subCategory: fetchedPermData.subCategory || '',
        date: fetchedPermData.date || '',
        timeFrom: fetchedPermData.timeFrom || '',
        timeTill: fetchedPermData.timeTill || '',
        venue: fetchedPermData.venue || '',
        audience: fetchedPermData.audience || '',
        resourcePerson: fetchedPermData.resourcePerson || '',
        expectedAttendance: fetchedPermData.expectedAttendance ? Number(fetchedPermData.expectedAttendance) : undefined,
        description: fetchedPermData.description || '',
        permissionNotes: fetchedPermData.permissionNotes || '',
        approvingAuthority: fetchedPermData.approvingAuthority || 'Principal',
        status: fetchedPermData.status || 'pending',
        submittedBy: fetchedPermData.submittedBy,
        recommendedBy: fetchedPermData.recommendedBy,
        approvedBy: fetchedPermData.approvedBy,
        approvedAt: fetchedPermData.approvedAt,
        approvalNotes: fetchedPermData.approvalNotes,
        approvalMethod: fetchedPermData.approvalMethod,
        approverDesignation: fetchedPermData.approverDesignation,
        rejectedBy: fetchedPermData.rejectedBy,
        rejectedAt: fetchedPermData.rejectedAt,
        rejectionReason: fetchedPermData.rejectionReason,
        changesRequestedBy: fetchedPermData.changesRequestedBy,
        changesRequestedAt: fetchedPermData.changesRequestedAt,
        changesRequiredNotes: fetchedPermData.changesRequiredNotes,
        approvalToken: fetchedPermData.approvalToken || fetchedPermData.approval_token || token,
        tokenCreatedAt: fetchedPermData.tokenCreatedAt,
        tokenExpiresAt: fetchedPermData.tokenExpiresAt,
        tokenRevoked: Boolean(fetchedPermData.tokenRevoked),
        history: fetchedPermData.history || [],
        createdAt: fetchedPermData.createdAt || fetchedPermData.created_at || new Date().toISOString(),
        updatedAt: fetchedPermData.updatedAt || fetchedPermData.updated_at || new Date().toISOString(),
      };

      // Set default designation from permission config if present
      if (perm.approvingAuthority) {
        setApproverDesignation(perm.approvingAuthority);
      }

      // Check revoked
      if (perm.tokenRevoked) {
        setErrorState('revoked');
        setLoading(false);
        return;
      }

      // Check expiration if date set
      if (perm.tokenExpiresAt) {
        const expiry = new Date(perm.tokenExpiresAt).getTime();
        if (!isNaN(expiry) && Date.now() > expiry) {
          setErrorState('expired');
          setLoading(false);
          return;
        }
      }

      setDocId(fetchedDocId);
      setPermission(perm);

      // 4. Retrieve Organization Profile & Logo/Crest dynamically
      await fetchOrganizationData(perm.organizationId);

      setLoading(false);
    } catch (err) {
      console.error('Error fetching public permission:', err);
      setErrorState('not_found');
      setLoading(false);
    }
  };

  const fetchOrganizationData = async (orgId?: string) => {
    try {
      if (orgId) {
        const orgDoc = await getDoc(doc(db, 'organizations', orgId));
        if (orgDoc.exists()) {
          const data = orgDoc.data();
          setOrganization((prev) => ({
            ...prev,
            id: orgDoc.id,
            name: data.name || prev?.name || '',
            college_name: data.college_name || prev?.college_name || '',
            logo: data.logo || prev?.logo || '',
            tagline: data.tagline || prev?.tagline || '',
          }));
          return;
        }
      }

      // Fallback: fetch first organization in database
      const orgsSnap = await getDocs(collection(db, 'organizations'));
      if (!orgsSnap.empty) {
        const firstDoc = orgsSnap.docs[0];
        const data = firstDoc.data();
        setOrganization((prev) => ({
          ...prev,
          id: firstDoc.id,
          name: data.name || prev?.name || '',
          college_name: data.college_name || prev?.college_name || '',
          logo: data.logo || prev?.logo || '',
          tagline: data.tagline || prev?.tagline || '',
        }));
      }
    } catch (orgErr) {
      console.warn('Could not load organization details from Firestore:', orgErr);
    }
  };

  const handleApproveSubmit = async () => {
    if (!token) return;
    setIsSubmitting(true);
    setSubmitErrorMessage(null);
    const finalApproverName = approverName.trim() || approverDesignation;

    try {
      const res = await fetch(`/api/public/college-permission/${encodeURIComponent(token)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          decision: 'approved',
          action: 'approved',
          approverName: finalApproverName,
          approver_name: finalApproverName,
          approverDesignation: approverDesignation,
          approver_designation: approverDesignation,
          approvalRemarks: approvalNotes.trim(),
          notes: approvalNotes.trim(),
        }),
      });

      const json = await res.json();

      if (res.ok && json.success && json.permission) {
        setPermission(json.permission);
        setActiveModal(null);
        setActionSuccess('approved');
      } else {
        const msg = json.message || json.error || 'An error occurred while approving. Please try again.';
        setSubmitErrorMessage(msg);
      }
    } catch (err: any) {
      console.error('Error approving permission:', err);
      setSubmitErrorMessage(err?.message || 'An error occurred while recording approval. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangesSubmit = async () => {
    if (!token) return;
    if (!changesNotes.trim()) {
      setSubmitErrorMessage('Please specify the required modifications.');
      return;
    }
    setIsSubmitting(true);
    setSubmitErrorMessage(null);
    const finalReviewerName = approverName.trim() || approverDesignation;

    try {
      const res = await fetch(`/api/public/college-permission/${encodeURIComponent(token)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          decision: 'changes_required',
          action: 'changes_requested',
          approverName: finalReviewerName,
          approver_name: finalReviewerName,
          approverDesignation: approverDesignation,
          approver_designation: approverDesignation,
          approvalRemarks: changesNotes.trim(),
          changesRequiredNotes: changesNotes.trim(),
          notes: changesNotes.trim(),
        }),
      });

      const json = await res.json();

      if (res.ok && json.success && json.permission) {
        setPermission(json.permission);
        setActiveModal(null);
        setActionSuccess('changes');
      } else {
        const msg = json.message || json.error || 'An error occurred while requesting changes. Please try again.';
        setSubmitErrorMessage(msg);
      }
    } catch (err: any) {
      console.error('Error requesting changes:', err);
      setSubmitErrorMessage(err?.message || 'An error occurred while submitting change request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!token) return;
    if (!rejectionReason.trim()) {
      setSubmitErrorMessage('Please provide a reason for rejecting this permission request.');
      return;
    }
    setIsSubmitting(true);
    setSubmitErrorMessage(null);
    const finalRejecterName = approverName.trim() || approverDesignation;

    try {
      const res = await fetch(`/api/public/college-permission/${encodeURIComponent(token)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          decision: 'rejected',
          action: 'rejected',
          approverName: finalRejecterName,
          approver_name: finalRejecterName,
          approverDesignation: approverDesignation,
          approver_designation: approverDesignation,
          approvalRemarks: rejectionReason.trim(),
          rejectionReason: rejectionReason.trim(),
          notes: rejectionReason.trim(),
        }),
      });

      const json = await res.json();

      if (res.ok && json.success && json.permission) {
        setPermission(json.permission);
        setActiveModal(null);
        setActionSuccess('rejected');
      } else {
        const msg = json.message || json.error || 'An error occurred while recording rejection. Please try again.';
        setSubmitErrorMessage(msg);
      }
    } catch (err: any) {
      console.error('Error rejecting permission:', err);
      setSubmitErrorMessage(err?.message || 'An error occurred while recording rejection. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-800 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-sm w-full">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <ShieldCheck className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Loading Permission Dossier</h2>
          <p className="text-xs text-slate-500">
            Retrieving official institutional approval request...
          </p>
          <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mt-1" />
        </div>
      </div>
    );
  }

  // Expired / Error States
  if (errorState || !permission) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl p-7 text-center shadow-md border border-slate-200 space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
            {errorState === 'expired' ? (
              <Clock className="w-7 h-7" />
            ) : (
              <AlertTriangle className="w-7 h-7" />
            )}
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-slate-900">
              {errorState === 'expired'
                ? 'Approval Link Expired'
                : errorState === 'revoked'
                ? 'Approval Link Revoked'
                : 'Permission Request Not Found'}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {errorState === 'expired'
                ? 'This permission request link is no longer active. Please contact the organizing department for a newly generated approval link.'
                : errorState === 'revoked'
                ? 'This approval link was revoked by the organizing authority. A newer link may have been generated.'
                : 'The approval token provided does not match any active program permission request.'}
            </p>
          </div>

          <div className="pt-2">
            <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              Powered by Munazzam Institutional Reporting & Analytics
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isFinalized = permission.status === 'approved' || permission.status === 'rejected';
  const isChangesRequired = permission.status === 'changes_required';

  // Dynamic organization name and logo resolution
  const orgDisplayName = organization?.name || permission.conductedBy || 'College Department / Students Union';
  const orgLogoSrc = organization?.logo || '';

  return (
    <div className="min-h-screen bg-slate-100 py-6 sm:py-10 px-3 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto space-y-5">
        
        {/* Main Document Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-8 shadow-sm border border-slate-200/90 space-y-6">
          
          {/* ==================== 1. NEW PROFESSIONAL HEADER ==================== */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            {/* Left: Organization Crest & Title */}
            <div className="flex items-center gap-3.5 sm:gap-4">
              {orgLogoSrc ? (
                <img
                  src={orgLogoSrc}
                  alt={orgDisplayName}
                  className="w-12 h-12 sm:w-14 sm:h-14 object-contain rounded-xl border border-slate-200 bg-white p-1 shadow-2xs shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-50 border border-slate-200 text-emerald-800 flex items-center justify-center shrink-0">
                  <Building className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-800" />
                </div>
              )}
              
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug truncate">
                  {orgDisplayName}
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-emerald-800">
                  College Program Permission
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  Official Institutional Approval Request
                </p>
              </div>
            </div>

            {/* Right: Current Status Badge */}
            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Current Status
              </span>
              <PermissionStatusBadge status={permission.status} size="md" />
            </div>
          </div>

          {/* ==================== 2. OUTCOME BANNER (IF FINALIZED OR CHANGES REQUIRED) ==================== */}
          {actionSuccess === 'approved' || (isFinalized && permission.status === 'approved') ? (
            <div className="p-4 rounded-xl bg-emerald-50/90 border border-emerald-200 flex items-start gap-3 text-emerald-950">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-bold text-emerald-900">
                  ✓ Permission Sanctioned & Officially Approved
                </h4>
                <p className="text-xs text-emerald-800">
                  This program has been officially approved for conduction by{' '}
                  <span className="font-bold">{permission.approvedBy || 'the Approving Authority'}</span>
                  {permission.approverDesignation ? ` (${permission.approverDesignation})` : ''}
                  {permission.approvedAt ? ` on ${formatDate(permission.approvedAt)}` : ''}.
                </p>
                {permission.approvalNotes && (
                  <div className="text-xs bg-white/90 p-2.5 rounded-lg border border-emerald-200/80 text-emerald-900 italic mt-1.5">
                    "{permission.approvalNotes}"
                  </div>
                )}
              </div>
            </div>
          ) : actionSuccess === 'rejected' || (isFinalized && permission.status === 'rejected') ? (
            <div className="p-4 rounded-xl bg-rose-50/90 border border-rose-200 flex items-start gap-3 text-rose-950">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-bold text-rose-900">
                  ✕ Permission Request Not Approved / Rejected
                </h4>
                <p className="text-xs text-rose-800">
                  This permission request was rejected
                  {permission.rejectedBy ? ` by ${permission.rejectedBy}` : ''}
                  {permission.approverDesignation ? ` (${permission.approverDesignation})` : ''}
                  {permission.rejectedAt ? ` on ${formatDate(permission.rejectedAt)}` : ''}.
                </p>
                {permission.rejectionReason && (
                  <div className="text-xs bg-white/90 p-2.5 rounded-lg border border-rose-200/80 text-rose-900 mt-1.5">
                    <span className="font-bold">Official Reason: </span>
                    {permission.rejectionReason}
                  </div>
                )}
              </div>
            </div>
          ) : actionSuccess === 'changes' || isChangesRequired ? (
            <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200 flex items-start gap-3 text-amber-950">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-bold text-amber-900">
                  ↻ Modifications Requested by Authority
                </h4>
                <p className="text-xs text-amber-800">
                  The organizers have been requested to update this proposal before final sanction.
                </p>
                {permission.changesRequiredNotes && (
                  <div className="text-xs bg-white/90 p-2.5 rounded-lg border border-amber-200/80 text-amber-900 mt-1.5">
                    <span className="font-bold">Required Adjustments: </span>
                    {permission.changesRequiredNotes}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* ==================== 3. PROFESSIONAL PROGRAM TITLE SECTION ==================== */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Program Title
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {permission.programName || 'Fin form'}
            </h2>
          </div>

          {/* ==================== 4. ESSENTIAL INFORMATION GRID ==================== */}
          {/* 
              Desktop: Balanced 3-column / 2-row layout.
              Row 1: Conducted By | Date | Time
              Row 2: Venue / Location | Target Audience
              (Category, Resource Person, and Objectives are REMOVED with zero gaps)
          */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {/* Card 1: Conducted By */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>Conducted By</span>
              </div>
              <div className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                {permission.conductedBy || orgDisplayName}
              </div>
            </div>

            {/* Card 2: Date */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date</span>
              </div>
              <div className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                {permission.date ? formatDate(permission.date) : 'Date Scheduled'}
              </div>
            </div>

            {/* Card 3: Time */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Time</span>
              </div>
              <div className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                {permission.timeFrom
                  ? `${permission.timeFrom} ${permission.timeTill ? `– ${permission.timeTill}` : ''}`
                  : 'Scheduled Time'}
              </div>
            </div>

            {/* Card 4: Venue / Location */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1 sm:col-span-1 md:col-span-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Venue / Location</span>
              </div>
              <div className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                {permission.venue || 'College Campus'}
              </div>
            </div>

            {/* Card 5: Target Audience */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1 sm:col-span-1 md:col-span-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Target Audience</span>
              </div>
              <div className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                {permission.audience || 'College Students & Faculty'}
              </div>
            </div>
          </div>

          {/* ==================== 5. SUBMISSION INFORMATION METADATA ==================== */}
          {permission.submittedBy && (
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  Submitted by: <strong className="text-slate-900 font-semibold">{permission.submittedBy.name}</strong>
                </span>
              </div>
              <div className="text-slate-500">
                Role: <span className="text-slate-800 font-semibold">{permission.submittedBy.designation || 'Program Coordinator'}</span>
              </div>
            </div>
          )}

          {permission.recommendedBy && (
            <div className="pt-2 flex items-center gap-2 text-xs text-emerald-900 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100">
              <Award className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                Recommended by: <strong className="font-semibold">{permission.recommendedBy.name}</strong>
                {permission.recommendedBy.designation ? ` (${permission.recommendedBy.designation})` : ''}
              </span>
            </div>
          )}
        </div>

        {/* ==================== 6. APPROVAL DECISION AREA ==================== */}
        {!isFinalized && !actionSuccess ? (
          <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-sm border border-slate-200/90 space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Approval Decision
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Please review the program information above before submitting your decision.
              </p>
            </div>

            {/* Approver Details Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Dr. Abdul Rahman"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Approving Role / Designation
                </label>
                <select
                  value={approverDesignation}
                  onChange={(e) => setApproverDesignation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="Principal">Principal</option>
                  <option value="Vice Principal">Vice Principal</option>
                  <option value="Head of Department (HOD)">Head of Department (HOD)</option>
                  <option value="Dean of Student Affairs">Dean of Student Affairs</option>
                  <option value="Staff Advisor">Staff Advisor</option>
                  <option value="Competent Authority">Competent Authority</option>
                </select>
              </div>
            </div>

            {/* Action Buttons: Desktop Horizontal / Mobile Stacked Full-Width */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {/* 1. Approve Button */}
              <button
                type="button"
                onClick={() => openModal('approve')}
                className="flex-1 min-h-[44px] py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer text-xs sm:text-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>✓ Approve Permission</span>
              </button>

              {/* 2. Request Changes Button */}
              <button
                type="button"
                onClick={() => openModal('changes')}
                className="flex-1 min-h-[44px] py-3 px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer text-xs sm:text-sm"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>↻ Request Changes</span>
              </button>

              {/* 3. Reject Button */}
              <button
                type="button"
                onClick={() => openModal('reject')}
                className="flex-1 min-h-[44px] py-3 px-4 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer text-xs sm:text-sm"
              >
                <XCircle className="w-4 h-4" />
                <span>✕ Reject Permission</span>
              </button>
            </div>
          </div>
        ) : (
          /* Decision Finalized Information Box */
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/90 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 mx-auto">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Permission Request Decision Finalized
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              This approval record is permanently registered in the institutional governance audit trail.
            </p>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer mt-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sanction Record</span>
            </button>
          </div>
        )}

        {/* ==================== 7. FOOTER ==================== */}
        <div className="text-center text-slate-500 text-xs py-4 space-y-0.5">
          <p className="font-semibold text-slate-600">Powered by Munazzam</p>
          <p className="text-[11px] text-slate-400">Institutional Reporting & Analytics</p>
        </div>
      </div>

      {/* ==================== CONFIRMATION MODALS ==================== */}

      {/* 1. APPROVE CONFIRMATION MODAL */}
      {activeModal === 'approve' && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 my-auto">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Approve Program Permission?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official sanction will be granted for this activity.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs space-y-0.5">
              <div className="font-bold text-emerald-950">{permission.programName}</div>
              <div className="text-emerald-800 text-[11px]">
                {formatDate(permission.date)} • {permission.venue || 'College Campus'}
              </div>
            </div>

            {submitErrorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{submitErrorMessage}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Optional Approval Remarks / Conditions
                </label>
                <textarea
                  rows={3}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="e.g., Sanctioned subject to college safety guidelines and timely event conclusion..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 focus:bg-white resize-none"
                />
              </div>

              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                Approving as: <strong className="text-slate-800">{approverName.trim() || approverDesignation}</strong> ({approverDesignation})
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                disabled={isSubmitting}
                className="flex-1 min-h-[40px] py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveSubmit}
                disabled={isSubmitting}
                className="flex-1 min-h-[40px] py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Sanctioning...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. REQUEST CHANGES MODAL */}
      {activeModal === 'changes' && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 my-auto">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">What changes are required?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  The organizers will be instructed to amend the request.
                </p>
              </div>
            </div>

            {submitErrorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{submitErrorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Enter Required Modifications <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={changesNotes}
                onChange={(e) => setChangesNotes(e.target.value)}
                placeholder="Specify the adjustments needed (e.g., Change venue to Auditorium B, adjust program timings)..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-amber-500 focus:bg-white resize-none"
              />
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                disabled={isSubmitting}
                className="flex-1 min-h-[40px] py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleChangesSubmit}
                disabled={isSubmitting || !changesNotes.trim()}
                className="flex-1 min-h-[40px] py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. REJECT PERMISSION MODAL */}
      {activeModal === 'reject' && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 my-auto">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Reject Program Permission?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  State the administrative reason for non-approval.
                </p>
              </div>
            </div>

            {submitErrorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{submitErrorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Rejection <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="State the official reason (e.g., Clash with institutional schedule, policy restriction)..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-rose-500 focus:bg-white resize-none"
              />
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                disabled={isSubmitting}
                className="flex-1 min-h-[40px] py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={isSubmitting || !rejectionReason.trim()}
                className="flex-1 min-h-[40px] py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
