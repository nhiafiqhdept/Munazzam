import React from 'react';
import { Printer, X, FileText } from 'lucide-react';
import { Program, Organization } from '../types';
import { formatDate } from '../utils/helpers';
import { renderReportMarkdown } from '../utils/reportGenerator';
import { useApp } from '../context/AppContext';

interface PrintActivityReportProps {
  program: Program;
  organization?: Organization;
  org?: Organization;
  onClose: () => void;
}

export const PrintActivityReport: React.FC<PrintActivityReportProps> = ({
  program,
  organization: organizationProp,
  org,
  onClose,
}) => {
  const { currentOrg } = useApp();
  const organization = organizationProp || org || currentOrg;

  const handlePrint = () => {
    window.print();
  };

  const photoProofs = (program.media || []).filter((m) => m.type === 'photo');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden my-8 print:my-0 print:shadow-none print:rounded-none print:w-full">
        {/* Print Top Bar Controls (Hidden during print) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">Official Academic Activity Record</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Document Layout */}
        <div className="p-8 sm:p-12 space-y-6 text-slate-900 bg-white" id="printable-activity-sheet">
          {/* Institutional Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-6">
            <div className="flex items-center gap-4">
              <img
                src={organization?.logo || 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200&auto=format&fit=crop&q=80'}
                alt="Org Logo"
                className="w-20 h-20 object-contain rounded-xl border border-slate-300 p-1"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200&auto=format&fit=crop&q=80';
                }}
              />
              <div>
                <h1 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
                  {organization?.name || 'Organization'}
                </h1>
                <p className="text-sm font-semibold text-emerald-800">{organization?.college_name || ''}</p>
                {organization?.tagline && (
                  <p className="text-xs text-slate-500 italic mt-0.5">{organization.tagline}</p>
                )}
              </div>
            </div>
            <div className="text-right text-xs text-slate-600 font-mono">
              <p className="font-bold text-slate-900">ACTIVITY REPORT</p>
              <p>Doc ID: {program.id.toUpperCase()}</p>
              <p>Generated: {formatDate(new Date().toISOString())}</p>
            </div>
          </div>

          {/* Program Title Banner */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                PROGRAM TITLE
              </span>
              <div className="flex gap-2">
                {program.subWingName && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                    Sub-Wing: {program.subWingName}
                  </span>
                )}
                {program.category && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-md">
                    Category: {program.category}
                  </span>
                )}
                {program.subCategory && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-md">
                    Sub-Category: {program.subCategory}
                  </span>
                )}
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading mt-1">
              {program.name}
            </h2>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium block">Date & Time</span>
              <span className="font-bold text-slate-900 mt-1 block">
                {formatDate(program.date)}
                {program.time ? ` (${program.time})` : ''}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium block">Venue / Location</span>
              <span className="font-bold text-slate-900 mt-1 block">{program.place}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium block">Beneficiary / Audience</span>
              <span className="font-bold text-slate-900 mt-1 block">{program.audience}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium block">Attendance</span>
              <span className="font-bold text-slate-900 mt-1 block">
                {program.attendance_count ? `${program.attendance_count} Attendees` : 'Recorded in Minutes'}
              </span>
            </div>
          </div>

          {/* Resource Person / Faculty */}
          {program.resourcePerson && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-500 font-bold uppercase tracking-wider block mb-1">
                Resource Person / Faculty
              </span>
              <p className="text-sm font-bold text-slate-900">{program.resourcePerson}</p>
            </div>
          )}

          {/* Keynote / Presenter */}
          {program.presenter_name && (
            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs">
              <span className="text-emerald-900 font-bold uppercase tracking-wider block mb-1">
                Resource Person / Keynote Speaker
              </span>
              <p className="text-sm font-bold text-slate-900">{program.presenter_name}</p>
              {program.presenter_designation && (
                <p className="text-slate-600 mt-0.5">{program.presenter_designation}</p>
              )}
            </div>
          )}

          {/* Description / Summary */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Detailed Activity Summary & Proceedings
            </h3>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed">
              {renderReportMarkdown(program.description)}
            </div>
          </div>

          {/* Photographic Evidence / Proofs */}
          {photoProofs.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Photographic Documentation & Proof
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photoProofs.slice(0, 3).map((ph, idx) => (
                  <div key={idx} className="rounded-xl overflow-hidden border border-slate-300">
                    <img src={ph.url} alt="" className="w-full h-32 object-cover" />
                    {ph.caption && (
                      <p className="p-1.5 text-[10px] text-slate-600 bg-slate-50 border-t border-slate-200 truncate">
                        {ph.caption}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formal Sign-off Section for Academic Submissions */}
          <div className="pt-10 mt-8 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              <div className="h-12 flex items-end justify-center">
                <span className="italic text-slate-400 text-[11px]">[Verified Signature]</span>
              </div>
              <p className="font-bold text-slate-900 border-t border-slate-400 pt-1">General Secretary</p>
              <p className="text-[10px] text-slate-500">{organization?.name || ''}</p>
            </div>

            <div>
              <div className="h-12 flex items-end justify-center">
                <span className="italic text-slate-400 text-[11px]">[Verified Signature]</span>
              </div>
              <p className="font-bold text-slate-900 border-t border-slate-400 pt-1">President</p>
              <p className="text-[10px] text-slate-500">{organization?.name || ''}</p>
            </div>

            <div>
              <div className="h-12 flex items-end justify-center">
                <span className="italic text-slate-400 text-[11px]">[Verified Stamp]</span>
              </div>
              <p className="font-bold text-slate-900 border-t border-slate-400 pt-1">Staff Advisor / HOD</p>
              <p className="text-[10px] text-slate-500">{organization?.college_name || ''}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
