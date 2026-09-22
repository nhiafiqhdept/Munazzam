import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
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

  const handleWhatsAppShare = () => {
    if (!permission) return;
    const currentUrl = window.location.href;
    const name = permission.approvedBy || '';
    const desig = permission.approverDesignation || '';
    const approverStr = (!name && !desig) ? 'Approved Authority' :
      (!name) ? desig :
      (!desig || name.toLowerCase() === desig.toLowerCase()) ? name : `${name} (${desig})`;

    const orgDisplayName = organization?.college_name || organization?.name || 'College Department';

    const text = `*College Program Permission*\n\n` +
      `✓ *Officially Approved*\n\n` +
      `*Program:* ${permission.programName || 'Untitled Program'}\n` +
      `*Conducted by:* ${permission.conductedBy || orgDisplayName}\n` +
      `*Date:* ${permission.date ? formatDate(permission.date) : 'Scheduled'}\n` +
      `*Time:* ${permission.timeFrom ? `${permission.timeFrom} ${permission.timeTill ? `– ${permission.timeTill}` : ''}` : 'Scheduled'}\n` +
      `*Venue:* ${permission.venue || 'College Campus'}\n` +
      `*Target Audience:* ${permission.audience || 'Students'}\n\n` +
      `*Approved by:* ${approverStr}\n` +
      `${permission.approvedAt ? `*Approval Date:* ${formatDate(permission.approvedAt)}\n\n` : '\n'}` +
      `*View Official Approval:*\n${currentUrl}\n\n` +
      `_Powered by Munazzam Institutional Reporting & Analytics_`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
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
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
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
        try {
          const q1 = query(
            collection(db, 'program_permissions'),
            where('approvalToken', '==', token)
          );
          const snap1 = await getDocs(q1);

          if (!snap1.empty) {
            const docSnap = snap1.docs[0];
            fetchedDocId = docSnap.id;
            fetchedPermData = docSnap.data();
          } else {
            const q2 = query(
              collection(db, 'program_permissions'),
              where('approval_token', '==', token)
            );
            const snap2 = await getDocs(q2);

            if (!snap2.empty) {
              const docSnap = snap2.docs[0];
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
        } catch (fsErr) {
          console.warn('Direct Firestore permission lookup error:', fsErr);
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
        time: fetchedPermData.time || fetchedPermData.timeFrom || '',
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
        // 1. Check accounts collection (where Munazzam profile is officially stored)
        try {
          const accDoc = await getDoc(doc(db, 'accounts', orgId));
          if (accDoc.exists()) {
            const data = accDoc.data();
            const profile = data.profile || data;
            setOrganization((prev) => ({
              ...prev,
              id: accDoc.id,
              name: profile.name || profile.organizationName || data.name || prev?.name || '',
              college_name: profile.college_name || profile.collegeName || prev?.college_name || '',
              logo: profile.logo || profile.photoURL || prev?.logo || '',
              tagline: profile.tagline || prev?.tagline || '',
            }));
            return;
          }
        } catch {}

        // 2. Check organizations collection as fallback
        try {
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
        } catch {}
      }
    } catch (orgErr) {
      console.warn('Could not load organization details:', orgErr);
    }
  };

  const handleApproveSubmit = async () => {
    if (!token) return;
    setIsSubmitting(true);
    setSubmitErrorMessage(null);
    const finalApproverName = approverName.trim() || approverDesignation;

    let apiSucceeded = false;
    let updatedPerm: any = null;

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

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const json = await res.json();
        if (json.success && json.permission) {
          apiSucceeded = true;
          updatedPerm = json.permission;
        }
      }
    } catch (apiErr) {
      console.warn('API action approval fallback to direct Firestore:', apiErr);
    }

    if (apiSucceeded && updatedPerm) {
      setPermission(updatedPerm);
      setActiveModal(null);
      setActionSuccess('approved');
      setIsSubmitting(false);
      return;
    }

    // Direct Firestore update fallback (essential for static deployments like Vercel)
    try {
      const targetDocId = docId || permission?.id || token;
      if (!targetDocId) throw new Error('No target document identified.');

      const now = new Date().toISOString();
      const historyItem: PermissionHistoryItem = {
        id: 'hist_' + Date.now(),
        timestamp: now,
        status: 'approved',
        action: 'Permission officially approved by college authority',
        actorName: finalApproverName,
        actorRole: approverDesignation,
        notes: approvalNotes.trim(),
      };

      const updateData: any = {
        status: 'approved',
        approvedBy: finalApproverName,
        approverDesignation: approverDesignation,
        approvedAt: now,
        approvalNotes: approvalNotes.trim(),
        approvalMethod: 'public_link',
        updatedAt: now,
        history: [...(permission?.history || []), historyItem],
      };

      await updateDoc(doc(db, 'program_permissions', targetDocId), updateData);

      if (permission?.programId) {
        await updateDoc(doc(db, 'programs', permission.programId), {
          permissionStatus: 'approved',
        }).catch(() => {});
      }

      setPermission((prev) => (prev ? { ...prev, ...updateData } : null));
      setActiveModal(null);
      setActionSuccess('approved');
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

    let apiSucceeded = false;
    let updatedPerm: any = null;

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

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const json = await res.json();
        if (json.success && json.permission) {
          apiSucceeded = true;
          updatedPerm = json.permission;
        }
      }
    } catch (apiErr) {
      console.warn('API action changes fallback to direct Firestore:', apiErr);
    }

    if (apiSucceeded && updatedPerm) {
      setPermission(updatedPerm);
      setActiveModal(null);
      setActionSuccess('changes');
      setIsSubmitting(false);
      return;
    }

    // Direct Firestore update fallback
    try {
      const targetDocId = docId || permission?.id || token;
      if (!targetDocId) throw new Error('No target document identified.');

      const now = new Date().toISOString();
      const historyItem: PermissionHistoryItem = {
        id: 'hist_' + Date.now(),
        timestamp: now,
        status: 'changes_required',
        action: 'Modifications requested by reviewing authority',
        actorName: finalReviewerName,
        actorRole: approverDesignation,
        notes: changesNotes.trim(),
      };

      const updateData: any = {
        status: 'changes_required',
        changesRequestedBy: finalReviewerName,
        approverDesignation: approverDesignation,
        changesRequestedAt: now,
        changesRequiredNotes: changesNotes.trim(),
        updatedAt: now,
        history: [...(permission?.history || []), historyItem],
      };

      await updateDoc(doc(db, 'program_permissions', targetDocId), updateData);

      if (permission?.programId) {
        await updateDoc(doc(db, 'programs', permission.programId), {
          permissionStatus: 'changes_required',
        }).catch(() => {});
      }

      setPermission((prev) => (prev ? { ...prev, ...updateData } : null));
      setActiveModal(null);
      setActionSuccess('changes');
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

    let apiSucceeded = false;
    let updatedPerm: any = null;

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

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const json = await res.json();
        if (json.success && json.permission) {
          apiSucceeded = true;
          updatedPerm = json.permission;
        }
      }
    } catch (apiErr) {
      console.warn('API action reject fallback to direct Firestore:', apiErr);
    }

    if (apiSucceeded && updatedPerm) {
      setPermission(updatedPerm);
      setActiveModal(null);
      setActionSuccess('rejected');
      setIsSubmitting(false);
      return;
    }

    // Direct Firestore update fallback
    try {
      const targetDocId = docId || permission?.id || token;
      if (!targetDocId) throw new Error('No target document identified.');

      const now = new Date().toISOString();
      const historyItem: PermissionHistoryItem = {
        id: 'hist_' + Date.now(),
        timestamp: now,
        status: 'rejected',
        action: 'Permission request rejected by authority',
        actorName: finalRejecterName,
        actorRole: approverDesignation,
        notes: rejectionReason.trim(),
      };

      const updateData: any = {
        status: 'rejected',
        rejectedBy: finalRejecterName,
        approverDesignation: approverDesignation,
        rejectedAt: now,
        rejectionReason: rejectionReason.trim(),
        updatedAt: now,
        history: [...(permission?.history || []), historyItem],
      };

      await updateDoc(doc(db, 'program_permissions', targetDocId), updateData);

      if (permission?.programId) {
        await updateDoc(doc(db, 'programs', permission.programId), {
          permissionStatus: 'rejected',
        }).catch(() => {});
      }

      setPermission((prev) => (prev ? { ...prev, ...updateData } : null));
      setActiveModal(null);
      setActionSuccess('rejected');
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
    <div className="min-h-[100dvh] bg-slate-50/70 py-4 sm:py-8 px-3 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="max-w-xl mx-auto space-y-4">
        
        {/* Main Compact Document Container */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
          
          {/* ==================== 1. HEADER AREA ==================== */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3.5 min-w-0">
              {orgLogoSrc ? (
                <img
                  src={orgLogoSrc}
                  alt={orgDisplayName}
                  className="w-10 h-10 sm:w-11 sm:h-11 object-contain rounded-xl border border-slate-200 bg-white p-1 shadow-2xs shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-50 border border-slate-200 text-emerald-800 flex items-center justify-center shrink-0">
                  <Building className="w-5 h-5 text-emerald-800" />
                </div>
              )}
              
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate leading-tight">
                  {orgDisplayName}
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-emerald-700 leading-tight mt-0.5">
                  College Program Permission
                </p>
              </div>
            </div>

            {/* Approved Badge */}
            {(isFinalized && permission.status === 'approved') || actionSuccess === 'approved' ? (
              <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-bold shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Approved</span>
              </div>
            ) : null}
          </div>

          {/* ==================== 2. OUTCOME BANNER (IF REJECTED OR CHANGES REQUIRED) ==================== */}
          {actionSuccess === 'rejected' || (isFinalized && permission.status === 'rejected') ? (
            <div className="p-3.5 rounded-xl bg-rose-50/85 border border-rose-200 flex items-start gap-2.5 text-rose-950">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-rose-900">
                  Permission Request Rejected
                </h4>
                <p className="text-xs text-rose-800">
                  Rejected{permission.rejectedBy ? ` by ${permission.rejectedBy}` : ''}
                  {permission.approverDesignation ? ` (${permission.approverDesignation})` : ''}
                  {permission.rejectedAt ? ` on ${formatDate(permission.rejectedAt)}` : ''}.
                </p>
                {permission.rejectionReason && (
                  <div className="text-xs bg-white/90 p-2 rounded-lg border border-rose-200 text-rose-900 mt-1">
                    <span className="font-bold">Reason: </span>
                    {permission.rejectionReason}
                  </div>
                )}
              </div>
            </div>
          ) : actionSuccess === 'changes' || isChangesRequired ? (
            <div className="p-3.5 rounded-xl bg-amber-50/85 border border-amber-200 flex items-start gap-2.5 text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-900">
                  Modifications Requested
                </h4>
                <p className="text-xs text-amber-800">
                  The organizers have been requested to adjust this proposal.
                </p>
                {permission.changesRequiredNotes && (
                  <div className="text-xs bg-white/90 p-2 rounded-lg border border-amber-200 text-amber-900 mt-1">
                    <span className="font-bold">Required Adjustments: </span>
                    {permission.changesRequiredNotes}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* ==================== 3. PROGRAM TITLE HIGHLIGHT ==================== */}
          <div className="bg-slate-50/90 border-l-4 border-emerald-600 px-3.5 py-2.5 rounded-r-xl space-y-0.5 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Program Title
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              {permission.programName || 'Untitled Program'}
            </h2>
          </div>

          {/* ==================== 4. COMPACT INFORMATION ROWS ==================== */}
          <div className="divide-y divide-slate-100/90">
            
            {/* Row: Conducted By */}
            <div className="py-2.5 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                <Building className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Conducted By
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                  {permission.conductedBy || orgDisplayName}
                </div>
              </div>
            </div>

            {/* Row: Date */}
            <div className="py-2.5 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Date
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                  {permission.date ? formatDate(permission.date) : 'Date Scheduled'}
                </div>
              </div>
            </div>

            {/* Row: Time */}
            <div className="py-2.5 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Time
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                  {permission.time ||
                    (permission.timeFrom
                      ? `${permission.timeFrom} ${permission.timeTill ? `– ${permission.timeTill}` : ''}`
                      : 'Scheduled Time')}
                </div>
              </div>
            </div>

            {/* Row: Venue */}
            <div className="py-2.5 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Venue / Location
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                  {permission.venue || 'College Campus'}
                </div>
              </div>
            </div>

            {/* Row: Target Audience */}
            <div className="py-2.5 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Target Audience
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                  {permission.audience || 'College Students & Faculty'}
                </div>
              </div>
            </div>
          </div>

          {/* Standalone WhatsApp Share Button (When Approved) */}
          {((isFinalized && permission.status === 'approved') || actionSuccess === 'approved') && (
            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="w-full min-h-[48px] py-3 px-4 bg-[#25D366] hover:bg-[#20ba5a] active:scale-[0.99] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer text-xs sm:text-sm"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span>Share via WhatsApp</span>
              </button>
            </div>
          )}
        </div>

        {/* ==================== 6. APPROVAL DECISION AREA (PENDING / REJECTED / CHANGES) ==================== */}
        {!isFinalized && !actionSuccess ? (
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
            <div className="border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900">
                Approval Decision
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Please review the program details above before submitting your official decision.
              </p>
            </div>

            {/* Approver Details Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Dr. Abdul Rahman"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Approving Role / Designation
                </label>
                <select
                  value={approverDesignation}
                  onChange={(e) => setApproverDesignation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition-all cursor-pointer"
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

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              {/* 1. Approve Button */}
              <button
                type="button"
                onClick={() => openModal('approve')}
                className="flex-1 min-h-[46px] py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer text-xs sm:text-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>✓ Approve Permission</span>
              </button>

              {/* 2. Request Changes Button */}
              <button
                type="button"
                onClick={() => openModal('changes')}
                className="flex-1 min-h-[46px] py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer text-xs sm:text-sm"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>↻ Request Changes</span>
              </button>

              {/* 3. Reject Button */}
              <button
                type="button"
                onClick={() => openModal('reject')}
                className="flex-1 min-h-[46px] py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer text-xs sm:text-sm"
              >
                <XCircle className="w-4 h-4" />
                <span>✕ Reject Permission</span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div className="text-center text-slate-400 text-xs py-2">
          <p className="font-semibold text-slate-500">Munazzam Institutional Reporting & Analytics</p>
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
