import React, { useRef, useState } from 'react';
import { Printer, Download, X, Building2, CheckCircle2, ShieldCheck, Calendar, Clock, MapPin, Users, UserCheck, FileText, Share2, QrCode } from 'lucide-react';
import { ProgramPermission, Program } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../utils/helpers';
import { QRCodeView } from './QRCodeView';
import { SharePermissionModal } from './SharePermissionModal';
import { buildWhatsAppShareMessage, openWhatsAppShare, getPublicApprovalUrl } from '../../utils/permissionTokens';

interface PrintableApprovalRequestProps {
  permission: ProgramPermission;
  program?: Program;
  onClose: () => void;
}

export const PrintableApprovalRequest: React.FC<PrintableApprovalRequestProps> = ({
  permission,
  program,
  onClose,
}) => {
  const { currentOrg } = useApp();
  const printContentRef = useRef<HTMLDivElement>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleQuickWhatsApp = () => {
    const msg = buildWhatsAppShareMessage(permission);
    openWhatsAppShare(msg);
  };

  const formattedDate = permission.date ? formatDate(permission.date) : 'N/A';
  const orgName = currentOrg?.name || 'STUDENTS UNION';
  const collegeName = currentOrg?.college_name || 'COLLEGE / CAMPUS';
  const publicApprovalUrl = permission.approvalToken ? getPublicApprovalUrl(permission.approvalToken) : '';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Header Bar - Hidden on Print */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-snug">Official Approval Request Document</h3>
              <p className="text-xs text-slate-400">Formal A4 printable permission dossier for college administration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleQuickWhatsApp}
              className="px-3.5 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Share via WhatsApp"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.174L2 22l4.981-1.309A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.25c-1.636 0-3.153-.497-4.417-1.352l-.316-.214-2.955.775.789-2.88-.236-.376C4.043 14.898 3.5 13.5 3.5 12c0-4.687 3.813-8.5 8.5-8.5s8.5 3.813 8.5 8.5-3.813 8.5-8.5 8.5z" />
              </svg>
              <span>WhatsApp</span>
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
              title="Share Link & QR"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-12 print:p-0 bg-slate-50 print:bg-white flex justify-center">
          <div
            ref={printContentRef}
            className="w-full max-w-[210mm] bg-white p-8 sm:p-12 border border-slate-200 shadow-xs print:shadow-none print:border-none print:p-6 text-slate-900 font-sans"
            style={{ minHeight: '297mm' }}
          >
            {/* Institution Letterhead */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center space-y-1">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest">
                <Building2 className="w-4 h-4 text-slate-700" />
                <span>{collegeName}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                {orgName}
              </h1>
              {currentOrg?.tagline && (
                <p className="text-xs text-slate-500 italic font-medium">{currentOrg.tagline}</p>
              )}
            </div>

            {/* Document Header & Metadata Bar */}
            <div className="text-center mb-6">
              <div className="inline-block bg-slate-900 text-white font-extrabold text-sm sm:text-base px-6 py-1.5 uppercase tracking-wider rounded-md">
                APPROVAL REQUEST FOR UNION PROGRAM
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-600 font-semibold mt-3 px-2 border-b border-slate-200 pb-2">
                <span>Ref No: PERM-{permission.id ? permission.id.slice(-6).toUpperCase() : 'PENDING'}</span>
                <span>Date of Request: {permission.createdAt ? formatDate(permission.createdAt) : formattedDate}</span>
                <span>Target Authority: <strong className="text-slate-900">{permission.approvingAuthority || 'Principal'}</strong></span>
              </div>
            </div>

            {/* Formal Salutation */}
            <div className="text-xs text-slate-800 space-y-1 mb-6">
              <p className="font-bold">To,</p>
              <p className="font-semibold text-slate-900">The {permission.approvingAuthority || 'Principal'},</p>
              <p className="text-slate-700">{collegeName}</p>
              <p className="pt-2 font-medium">
                <strong>Subject:</strong> Formal Permission & Sanction Request to conduct "<strong>{permission.programName}</strong>"
              </p>
              <p className="pt-1 text-slate-700 text-[11px] leading-relaxed">
                Respected Sir/Madam, we hereby request your kind permission and approval to organize the following program conducted under the auspices of <strong>{permission.conductedBy || orgName}</strong>. The detailed program particulars are furnished below for your perusal:
              </p>
            </div>

            {/* Core Program Particulars Table */}
            <div className="border border-slate-300 rounded-lg overflow-hidden mb-6 text-xs">
              <div className="bg-slate-100 font-bold px-3 py-2 border-b border-slate-300 text-slate-900 uppercase tracking-wider text-[11px] flex items-center justify-between">
                <span>Program Particulars</span>
                <span className="text-[10px] font-semibold text-slate-600">Form Ref #PRG-{permission.programId ? permission.programId.slice(-4).toUpperCase() : '01'}</span>
              </div>
              <div className="divide-y divide-slate-200">
                {/* 1. Program Title */}
                <div className="grid grid-cols-12 p-2.5">
                  <div className="col-span-4 font-bold text-slate-700">PROGRAM TITLE:</div>
                  <div className="col-span-8 font-extrabold text-slate-900 text-sm">{permission.programName}</div>
                </div>

                {/* 2. Conducted By */}
                <div className="grid grid-cols-12 p-2.5 bg-slate-50/50">
                  <div className="col-span-4 font-bold text-slate-700">CONDUCTED BY:</div>
                  <div className="col-span-8 font-semibold text-slate-900">{permission.conductedBy || orgName}</div>
                </div>

                {/* 3. Category & Sub Category (if available) */}
                {(permission.category || permission.subCategory) && (
                  <div className="grid grid-cols-12 p-2.5">
                    <div className="col-span-4 font-bold text-slate-700">CATEGORY / TYPE:</div>
                    <div className="col-span-8 font-medium text-slate-900">
                      {permission.category}
                      {permission.subCategory ? ` — (${permission.subCategory})` : ''}
                    </div>
                  </div>
                )}

                {/* 4. Date */}
                <div className="grid grid-cols-12 p-2.5 bg-slate-50/50">
                  <div className="col-span-4 font-bold text-slate-700">DATE OF EVENT:</div>
                  <div className="col-span-8 font-bold text-slate-900">{formattedDate}</div>
                </div>

                {/* 5. Time Schedule */}
                {(permission.timeFrom || permission.timeTill) && (
                  <div className="grid grid-cols-12 p-2.5">
                    <div className="col-span-4 font-bold text-slate-700">TIME SCHEDULE:</div>
                    <div className="col-span-8 font-medium text-slate-900">
                      {permission.timeFrom ? `From: ${permission.timeFrom}` : ''}
                      {permission.timeTill ? ` Till: ${permission.timeTill}` : ''}
                    </div>
                  </div>
                )}

                {/* 6. Venue */}
                <div className="grid grid-cols-12 p-2.5 bg-slate-50/50">
                  <div className="col-span-4 font-bold text-slate-700">VENUE / LOCATION:</div>
                  <div className="col-span-8 font-bold text-slate-900">{permission.venue || 'College Campus'}</div>
                </div>

                {/* 7. Target Audience */}
                <div className="grid grid-cols-12 p-2.5">
                  <div className="col-span-4 font-bold text-slate-700">FOR WHOM / AUDIENCE:</div>
                  <div className="col-span-8 font-medium text-slate-900">{permission.audience || 'Students'}</div>
                </div>

                {/* 8. Resource Person / Faculty (Cleanly omitted if empty) */}
                {permission.resourcePerson && permission.resourcePerson.trim() !== '' && (
                  <div className="grid grid-cols-12 p-2.5 bg-slate-50/50">
                    <div className="col-span-4 font-bold text-slate-700">RESOURCE PERSON / FACULTY:</div>
                    <div className="col-span-8 font-bold text-slate-900">{permission.resourcePerson}</div>
                  </div>
                )}

                {/* 9. Expected Attendance (Cleanly omitted if empty) */}
                {permission.expectedAttendance && Number(permission.expectedAttendance) > 0 && (
                  <div className="grid grid-cols-12 p-2.5">
                    <div className="col-span-4 font-bold text-slate-700">EXPECTED ATTENDANCE:</div>
                    <div className="col-span-8 font-semibold text-slate-900">{permission.expectedAttendance} Participants</div>
                  </div>
                )}

                {/* 10. Description / Purpose (Cleanly omitted if empty) */}
                {permission.description && permission.description.trim() !== '' && (
                  <div className="grid grid-cols-12 p-2.5 bg-slate-50/50">
                    <div className="col-span-4 font-bold text-slate-700">OBJECTIVE / DESCRIPTION:</div>
                    <div className="col-span-8 text-slate-800 leading-relaxed font-normal">{permission.description}</div>
                  </div>
                )}

                {/* 11. Additional Permission Notes */}
                {permission.permissionNotes && permission.permissionNotes.trim() !== '' && (
                  <div className="grid grid-cols-12 p-2.5">
                    <div className="col-span-4 font-bold text-slate-700">SPECIAL REQUIREMENTS:</div>
                    <div className="col-span-8 text-slate-800 italic font-medium">{permission.permissionNotes}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Tri-Partite Signature Blocks */}
            <div className="mt-8 space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                {/* 1. SUBMITTED BY */}
                <div className="border border-slate-300 rounded-lg p-3.5 bg-slate-50/40 text-xs">
                  <div className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-300 pb-1.5 mb-2 flex items-center justify-between">
                    <span>1. SUBMITTED BY</span>
                    <span className="text-[10px] text-slate-500 font-normal">Organizer</span>
                  </div>
                  <div className="space-y-1.5 text-[11px] text-slate-800">
                    <div>
                      <span className="font-bold text-slate-600">Name: </span>
                      <span className="font-bold text-slate-900">{permission.submittedBy?.name || '__________________________'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-600">Designation: </span>
                      <span className="font-semibold text-slate-800">{permission.submittedBy?.designation || 'Program Coordinator'}</span>
                    </div>
                    <div className="pt-6 border-b border-dashed border-slate-300"></div>
                    <div className="flex justify-between pt-1 text-[10px] text-slate-500">
                      <span>Signature:</span>
                      <span>Date: {permission.submittedBy?.date ? formatDate(permission.submittedBy.date) : '____/____/2026'}</span>
                    </div>
                  </div>
                </div>

                {/* 2. RECOMMENDED BY */}
                <div className="border border-slate-300 rounded-lg p-3.5 bg-slate-50/40 text-xs">
                  <div className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-300 pb-1.5 mb-2 flex items-center justify-between">
                    <span>2. RECOMMENDED BY</span>
                    <span className="text-[10px] text-slate-500 font-normal">Faculty / Staff Advisor</span>
                  </div>
                  <div className="space-y-1.5 text-[11px] text-slate-800">
                    <div>
                      <span className="font-bold text-slate-600">Name: </span>
                      <span className="font-bold text-slate-900">{permission.recommendedBy?.name || '__________________________'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-600">Designation: </span>
                      <span className="font-semibold text-slate-800">{permission.recommendedBy?.designation || 'Faculty Coordinator'}</span>
                    </div>
                    <div className="pt-6 border-b border-dashed border-slate-300"></div>
                    <div className="flex justify-between pt-1 text-[10px] text-slate-500">
                      <span>Signature:</span>
                      <span>Date: {permission.recommendedBy?.date ? formatDate(permission.recommendedBy.date) : '____/____/2026'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. PERMISSION / APPROVAL OF COMPETENT AUTHORITY */}
              <div className="border-2 border-slate-800 rounded-lg p-4 bg-white text-xs">
                <div className="font-extrabold text-slate-900 uppercase tracking-wider text-[12px] border-b border-slate-300 pb-2 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>3. PERMISSION / SANCTION OF COMPETENT AUTHORITY</span>
                  </span>
                  <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {permission.approvingAuthority || 'Principal'}
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-7 space-y-2 text-[11px]">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-700">Official Decision:</span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1 font-bold">
                          <input
                            type="checkbox"
                            checked={permission.status === 'approved'}
                            readOnly
                            className="rounded text-emerald-600"
                          />
                          <span className={permission.status === 'approved' ? 'text-emerald-700 font-black' : 'text-slate-600'}>
                            SANCTIONED / APPROVED
                          </span>
                        </label>
                        <label className="flex items-center gap-1 font-bold">
                          <input
                            type="checkbox"
                            checked={permission.status === 'rejected'}
                            readOnly
                            className="rounded text-rose-600"
                          />
                          <span className={permission.status === 'rejected' ? 'text-rose-700 font-black' : 'text-slate-600'}>
                            REJECTED
                          </span>
                        </label>
                      </div>
                    </div>

                    {permission.approvalNotes && (
                      <div className="bg-emerald-50 border border-emerald-200 p-2 rounded text-[11px] text-emerald-900">
                        <strong className="font-bold">Conditions / Remarks:</strong> {permission.approvalNotes}
                      </div>
                    )}

                    {permission.rejectionReason && (
                      <div className="bg-rose-50 border border-rose-200 p-2 rounded text-[11px] text-rose-900">
                        <strong className="font-bold">Reason for Rejection:</strong> {permission.rejectionReason}
                      </div>
                    )}

                    {permission.changesRequiredNotes && (
                      <div className="bg-orange-50 border border-orange-200 p-2 rounded text-[11px] text-orange-900">
                        <strong className="font-bold">Changes Required:</strong> {permission.changesRequiredNotes}
                      </div>
                    )}
                  </div>

                  <div className="col-span-5 flex flex-col justify-end text-right text-[11px] space-y-1">
                    <div className="h-12 border-b border-dashed border-slate-400 flex items-center justify-center">
                      {permission.status === 'approved' && (
                        <div className="border-2 border-emerald-600 text-emerald-700 px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-wider transform -rotate-3 opacity-90">
                          SEAL OF APPROVAL
                        </div>
                      )}
                    </div>
                    <p className="font-bold text-slate-900 pt-1">
                      {permission.approvedBy || permission.approvingAuthority || 'Principal / Competent Authority'}
                    </p>
                    <p className="text-[10px] text-slate-500">Signature & Official Seal</p>
                    <p className="text-[10px] text-slate-500">
                      Date: {permission.approvedAt ? formatDate(permission.approvedAt) : '____/____/2026'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Footer & Digital Verification QR */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
              <div className="space-y-0.5 text-left">
                <p className="font-bold text-slate-700">Munazzam Unified Campus Activity Management System</p>
                <p className="text-slate-400">Generated on {new Date().toLocaleDateString('en-GB')} • Official Institutional Dossier</p>
                {permission.approvalToken && (
                  <p className="text-[9px] text-slate-400 font-mono">
                    Token Ref: {permission.approvalToken.substring(0, 16)}...
                  </p>
                )}
              </div>

              {publicApprovalUrl && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-xl">
                  <div className="w-12 h-12 bg-white p-0.5 rounded border border-slate-200 flex items-center justify-center">
                    <QRCodeView value={publicApprovalUrl} size={44} />
                  </div>
                  <div className="text-right">
                    <span className="font-black text-slate-800 text-[10px] block uppercase tracking-wider">
                      Scan to Verify
                    </span>
                    <span className="text-[9px] text-slate-400 block">
                      Digital Principal Portal
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <SharePermissionModal
          permission={permission}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};
