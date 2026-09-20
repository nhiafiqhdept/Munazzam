import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Send, Save, Building2, User, Clock, MapPin, Users, Calendar, AlertCircle } from 'lucide-react';
import { Program, ProgramPermission, PermissionStatus } from '../../types';
import { useApp } from '../../context/AppContext';

interface PermissionRequestModalProps {
  program: Program;
  existingPermission?: ProgramPermission;
  onClose: () => void;
  onSuccess?: () => void;
}

const DEFAULT_AUTHORITY_OPTIONS = [
  'Principal',
  'Faculty Coordinator',
  'HOD',
  'Dean',
  'Vice Principal',
  'Staff Advisor',
  'Other Competent Authority',
];

export const PermissionRequestModal: React.FC<PermissionRequestModalProps> = ({
  program,
  existingPermission,
  onClose,
  onSuccess,
}) => {
  const { currentOrg, requestProgramPermission, updateProgramPermission, user } = useApp();

  // Parsing time from program.time if available (e.g. "10:00 AM - 1:00 PM" or "10:00 AM")
  const defaultTimeFrom = () => {
    if (existingPermission?.timeFrom) return existingPermission.timeFrom;
    if (program.time) {
      const parts = program.time.split('-');
      return parts[0]?.trim() || '';
    }
    return '10:00 AM';
  };

  const defaultTimeTill = () => {
    if (existingPermission?.timeTill) return existingPermission.timeTill;
    if (program.time) {
      const parts = program.time.split('-');
      return parts[1]?.trim() || '';
    }
    return '1:00 PM';
  };

  const defaultConductedBy = () => {
    if (existingPermission?.conductedBy) return existingPermission.conductedBy;
    if (program.subWingName) return program.subWingName;
    return currentOrg?.name || 'Students Union';
  };

  const [programName, setProgramName] = useState(existingPermission?.programName || program.name);
  const [conductedBy, setConductedBy] = useState(defaultConductedBy());
  const [category, setCategory] = useState(existingPermission?.category || program.category || '');
  const [subCategory, setSubCategory] = useState(existingPermission?.subCategory || program.subCategory || '');
  const [date, setDate] = useState(existingPermission?.date || program.date);
  const [timeFrom, setTimeFrom] = useState(defaultTimeFrom());
  const [timeTill, setTimeTill] = useState(defaultTimeTill());
  const [venue, setVenue] = useState(existingPermission?.venue || program.place || '');
  const [audience, setAudience] = useState(existingPermission?.audience || program.audience || 'Students');
  const [resourcePerson, setResourcePerson] = useState(existingPermission?.resourcePerson || program.resourcePerson || '');
  const [expectedAttendance, setExpectedAttendance] = useState<string>(
    existingPermission?.expectedAttendance ? String(existingPermission.expectedAttendance) : program.attendance_count ? String(program.attendance_count) : ''
  );
  const [description, setDescription] = useState(existingPermission?.description || program.description || '');
  const [permissionNotes, setPermissionNotes] = useState(existingPermission?.permissionNotes || '');

  // Authority Configuration
  const [selectedAuthority, setSelectedAuthority] = useState<string>(
    existingPermission?.approvingAuthority && !DEFAULT_AUTHORITY_OPTIONS.includes(existingPermission.approvingAuthority)
      ? 'Other Competent Authority'
      : existingPermission?.approvingAuthority || 'Principal'
  );
  const [customAuthority, setCustomAuthority] = useState<string>(
    existingPermission?.approvingAuthority && !DEFAULT_AUTHORITY_OPTIONS.includes(existingPermission.approvingAuthority)
      ? existingPermission.approvingAuthority
      : ''
  );

  // Submitter details
  const [submitterName, setSubmitterName] = useState(
    existingPermission?.submittedBy?.name || user?.username || 'Union General Secretary'
  );
  const [submitterDesignation, setSubmitterDesignation] = useState(
    existingPermission?.submittedBy?.designation || 'Program Coordinator'
  );

  // Recommender details
  const [recommenderName, setRecommenderName] = useState(existingPermission?.recommendedBy?.name || '');
  const [recommenderDesignation, setRecommenderDesignation] = useState(
    existingPermission?.recommendedBy?.designation || 'Faculty Advisor'
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finalApprovingAuthority =
    selectedAuthority === 'Other Competent Authority' && customAuthority.trim()
      ? customAuthority.trim()
      : selectedAuthority;

  const handleSubmit = async (targetStatus: PermissionStatus) => {
    if (!programName.trim()) {
      setError('Program title is required.');
      return;
    }
    if (!date) {
      setError('Date is required.');
      return;
    }
    if (!venue.trim()) {
      setError('Venue/place is required.');
      return;
    }

    setLoading(true);
    setError(null);

    const now = new Date().toISOString();
    const submissionData = {
      programId: program.id,
      organizationId: currentOrg?.id || 'main_org',
      programName: programName.trim(),
      conductedBy: conductedBy.trim(),
      category: category.trim(),
      subCategory: subCategory.trim(),
      date,
      timeFrom: timeFrom.trim(),
      timeTill: timeTill.trim(),
      venue: venue.trim(),
      audience: audience.trim(),
      resourcePerson: resourcePerson.trim(),
      expectedAttendance: expectedAttendance ? Number(expectedAttendance) : undefined,
      description: description.trim(),
      permissionNotes: permissionNotes.trim(),
      approvingAuthority: finalApprovingAuthority,
      status: targetStatus,
      submittedBy: {
        name: submitterName.trim(),
        designation: submitterDesignation.trim(),
        date: now,
      },
      recommendedBy: recommenderName.trim()
        ? {
            name: recommenderName.trim(),
            designation: recommenderDesignation.trim(),
            date: now,
          }
        : undefined,
    };

    try {
      if (existingPermission?.id) {
        const isResubmission = existingPermission.status === 'changes_required';
        await updateProgramPermission(
          existingPermission.id,
          submissionData,
          {
            action: isResubmission
              ? `Resubmitted for approval after addressing requested changes`
              : targetStatus === 'draft'
              ? 'Updated draft permission request'
              : 'Permission request submitted for college approval',
            actorName: submitterName.trim(),
            actorRole: submitterDesignation.trim(),
            notes: permissionNotes.trim(),
          }
        );
      } else {
        await requestProgramPermission(submissionData);
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Error submitting permission request:', err);
      setError(err?.message || 'Failed to submit permission request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {existingPermission ? 'Edit / Resubmit Permission Request' : 'Approval Request for College Program'}
              </h3>
              <p className="text-xs text-slate-400">
                Official permission dossier for competent college authorities
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {existingPermission?.status === 'changes_required' && existingPermission.changesRequiredNotes && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-900">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <span>Changes Requested by Authority:</span>
              </div>
              <p className="text-xs text-orange-800 pl-5 leading-relaxed font-medium">
                "{existingPermission.changesRequiredNotes}"
              </p>
            </div>
          )}

          {/* Section: Authority Configuration */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Approving Authority <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Select Authority Role</label>
                <select
                  value={selectedAuthority}
                  onChange={(e) => setSelectedAuthority(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {DEFAULT_AUTHORITY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAuthority === 'Other Competent Authority' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Specify Custom Title</label>
                  <input
                    type="text"
                    value={customAuthority}
                    onChange={(e) => setCustomAuthority(e.target.value)}
                    placeholder="e.g. Director of Student Affairs"
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section: Program Information Pre-populated */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <span>Program Information</span>
              <span className="text-[10px] text-slate-500 font-normal lowercase">(auto-populated from program record)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Program Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Conducted By</label>
                <input
                  type="text"
                  value={conductedBy}
                  onChange={(e) => setConductedBy(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Program Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Academic, Cultural, Sports"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sub Category (Optional)</label>
                <input
                  type="text"
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  placeholder="e.g. Workshop, Seminar"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Date of Event <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Time From</label>
                <input
                  type="text"
                  value={timeFrom}
                  onChange={(e) => setTimeFrom(e.target.value)}
                  placeholder="e.g. 10:00 AM"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Time Till</label>
                <input
                  type="text"
                  value={timeTill}
                  onChange={(e) => setTimeTill(e.target.value)}
                  placeholder="e.g. 1:00 PM"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Venue / Place <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. Main Auditorium / Seminar Hall"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience / For Whom</label>
                <input
                  type="text"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g. All College Students, Department Members"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Resource Person / Faculty (Optional)</label>
                <input
                  type="text"
                  value={resourcePerson}
                  onChange={(e) => setResourcePerson(e.target.value)}
                  placeholder="e.g. Dr. Ahmed Khan, Keynote Speaker"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expected Attendance</label>
                <input
                  type="number"
                  value={expectedAttendance}
                  onChange={(e) => setExpectedAttendance(e.target.value)}
                  placeholder="e.g. 150"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Program Description / Objective</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly state the educational or organizational objective of this program..."
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Special Requirements / Logistics Notes</label>
                <textarea
                  rows={2}
                  value={permissionNotes}
                  onChange={(e) => setPermissionNotes(e.target.value)}
                  placeholder="e.g. Projector & mic required in Auditorium, power backup needed, guest vehicle parking"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section: Signatory Details */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Signatory Particulars (For Printable Document)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Submitter Name</label>
                <input
                  type="text"
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Submitter Designation</label>
                <input
                  type="text"
                  value={submitterDesignation}
                  onChange={(e) => setSubmitterDesignation(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Recommending Faculty Name (Optional)</label>
                <input
                  type="text"
                  value={recommenderName}
                  onChange={(e) => setRecommenderName(e.target.value)}
                  placeholder="e.g. Prof. Shamsudheen"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Recommender Designation</label>
                <input
                  type="text"
                  value={recommenderDesignation}
                  onChange={(e) => setRecommenderDesignation(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit('draft')}
              className="flex-1 sm:flex-initial px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Save as Draft</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit('pending')}
              className="flex-1 sm:flex-initial px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Submitting...' : 'Submit for Approval'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
