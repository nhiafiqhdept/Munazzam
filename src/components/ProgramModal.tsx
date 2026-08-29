import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  MapPin,
  Users,
  FileText,
  Upload,
  X,
  Check,
  Plus,
  Camera,
  Video,
} from 'lucide-react';
import { Program, ProgramMedia } from '../types';
import { useApp } from '../context/AppContext';
import {
  fileToDataUrl,
  DEFAULT_AUDIENCES,
  generateId,
} from '../utils/helpers';

interface ProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  programToEdit?: Program | null;
}

export const ProgramModal: React.FC<ProgramModalProps> = ({
  isOpen,
  onClose,
  programToEdit,
}) => {
  const { addProgram, updateProgram, addProgramMedia } = useApp();

  // Core required fields
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [audience, setAudience] = useState(DEFAULT_AUDIENCES[0]);
  const [customAudience, setCustomAudience] = useState('');
  const [isCustomAudience, setIsCustomAudience] = useState(false);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'completed' | 'upcoming' | 'ongoing'>('completed');
  const [attendanceCount, setAttendanceCount] = useState<number | ''>('');

  // Poster
  const [poster, setPoster] = useState(
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1000&auto=format&fit=crop&q=80'
  );
  const [posterTab, setPosterTab] = useState<'upload' | 'url'>('upload');
  const [customPosterUrl, setCustomPosterUrl] = useState('');
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);

  // Initial Proofs / Media for new program
  const [initialProofs, setInitialProofs] = useState<{ type: 'photo' | 'video' | 'document'; url: string; caption: string }[]>([]);
  const [proofType, setProofType] = useState<'photo' | 'video' | 'document'>('photo');
  const [proofUrl, setProofUrl] = useState('');
  const [proofCaption, setProofCaption] = useState('');
  const [proofUploadTab, setProofUploadTab] = useState<'upload' | 'url'>('upload');
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const [error, setError] = useState('');

  useEffect(() => {
    if (programToEdit) {
      setName(programToEdit.name);
      setDate(programToEdit.date);
      setTime(programToEdit.time || '');
      setPlace(programToEdit.place);
      if (DEFAULT_AUDIENCES.includes(programToEdit.audience)) {
        setAudience(programToEdit.audience);
        setIsCustomAudience(false);
        setCustomAudience('');
      } else {
        setIsCustomAudience(true);
        setCustomAudience(programToEdit.audience);
      }
      setDescription(programToEdit.description);
      setPoster(programToEdit.poster || '');
      setStatus(programToEdit.status || 'completed');
      setAttendanceCount(programToEdit.attendance_count || '');
      setInitialProofs([]);
    } else {
      setName('');
      setDate(new Date().toISOString().split('T')[0]);
      setTime('10:00 AM – 01:00 PM');
      setPlace('Main College Auditorium');
      setAudience(DEFAULT_AUDIENCES[0]);
      setIsCustomAudience(false);
      setCustomAudience('');
      setDescription('');
      setPoster('https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1000&auto=format&fit=crop&q=80');
      setStatus('completed');
      setAttendanceCount('');
      setInitialProofs([]);
    }
    setError('');
  }, [programToEdit, isOpen]);

  if (!isOpen) return null;

  const handlePosterFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPoster(true);
      setError('');
      const dataUrl = await fileToDataUrl(file);
      setPoster(dataUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to upload poster image.');
    } finally {
      setIsUploadingPoster(false);
    }
  };

  const handleProofFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingProof(true);
      setError('');
      const dataUrl = await fileToDataUrl(file);
      setProofUrl(dataUrl);
      if (!proofCaption) setProofCaption(file.name);
    } catch (err: any) {
      setError(err.message || 'Failed to upload proof file.');
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleAddProof = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofUrl.trim()) {
      setError('Please provide a file or URL for the proof.');
      return;
    }

    setInitialProofs((prev) => [
      ...prev,
      {
        type: proofType,
        url: proofUrl.trim(),
        caption: proofCaption.trim() || 'Documentation Proof',
      },
    ]);

    setProofUrl('');
    setProofCaption('');
    setError('');
  };

  const removeProof = (index: number) => {
    setInitialProofs((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a Program Name.');
      return;
    }
    if (!date) {
      setError('Please provide the date of the program.');
      return;
    }
    if (!place.trim()) {
      setError('Please specify where the program was held.');
      return;
    }

    const finalAudience = isCustomAudience ? customAudience.trim() : audience;
    if (!finalAudience) {
      setError('Please specify target audience (For Whom?).');
      return;
    }

    if (!description.trim()) {
      setError('Please provide a description of the program.');
      return;
    }

    const finalPoster = posterTab === 'url' && customPosterUrl ? customPosterUrl : poster;

    if (programToEdit) {
      updateProgram({
        id: programToEdit.id,
        name: name.trim(),
        date,
        time: time.trim(),
        place: place.trim(),
        audience: finalAudience,
        description: description.trim(),
        poster: finalPoster,
        status,
        attendance_count: attendanceCount === '' ? undefined : Number(attendanceCount),
      });

      // Add any new initial proofs if added during edit
      initialProofs.forEach((proof) => {
        addProgramMedia(programToEdit.id, {
          type: proof.type,
          url: proof.url,
          caption: proof.caption,
        });
      });
    } else {
      const newProgram = addProgram({
        name: name.trim(),
        date,
        time: time.trim(),
        place: place.trim(),
        audience: finalAudience,
        description: description.trim(),
        poster: finalPoster,
        status,
        attendance_count: attendanceCount === '' ? undefined : Number(attendanceCount),
        media: [],
      });

      // Add initial proofs
      initialProofs.forEach((proof) => {
        addProgramMedia(newProgram.id, {
          type: proof.type,
          url: proof.url,
          caption: proof.caption,
        });
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 my-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-serif">
              {programToEdit ? 'Edit Program Activity' : 'Record New Program & Activity'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Fill in activity details, venue, audience, poster, and documentation proofs.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Program Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Program Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Annual Fiqh Seminar on Modern Transactions"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              required
            />
          </div>

          {/* Date, Time & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Time Duration
              </label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="09:30 AM – 01:00 PM"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e: any) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white"
              >
                <option value="completed">Completed</option>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
              </select>
            </div>
          </div>

          {/* Place Held & Audience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Place Held <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="Main Auditorium, Central Block"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                For Whom? (Target Audience) <span className="text-rose-500">*</span>
              </label>
              <select
                value={isCustomAudience ? 'custom' : audience}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setIsCustomAudience(true);
                  } else {
                    setIsCustomAudience(false);
                    setAudience(e.target.value);
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white mb-2"
              >
                {DEFAULT_AUDIENCES.map((aud) => (
                  <option key={aud} value={aud}>
                    {aud}
                  </option>
                ))}
                <option value="custom">Other / Custom Audience...</option>
              </select>

              {isCustomAudience && (
                <input
                  type="text"
                  value={customAudience}
                  onChange={(e) => setCustomAudience(e.target.value)}
                  placeholder="e.g. Department Scholars & Research Fellows"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm"
                  required
                />
              )}
            </div>
          </div>

          {/* Attendance Count */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Attendance Count (Optional)
            </label>
            <input
              type="number"
              value={attendanceCount}
              onChange={(e) => setAttendanceCount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 150"
              className="w-full sm:w-1/2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Description & Report <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide comprehensive report of the program, key sessions, speakers, and outcomes..."
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              required
            />
          </div>

          {/* Program Poster */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Program Poster
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="w-24 h-32 rounded-xl bg-slate-900 overflow-hidden shrink-0 shadow-xs border border-slate-200 flex items-center justify-center">
                <img
                  src={posterTab === 'url' && customPosterUrl ? customPosterUrl : (poster || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80')}
                  alt="Poster preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80';
                  }}
                />
              </div>

              <div className="flex-1 space-y-3 w-full">
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPosterTab('upload')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                      posterTab === 'upload' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    Upload Image
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosterTab('url')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                      posterTab === 'url' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    Image URL
                  </button>
                </div>

                {posterTab === 'upload' ? (
                  <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-500 text-slate-700 text-xs font-semibold">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>{isUploadingPoster ? 'Uploading poster...' : 'Choose Poster File'}</span>
                    <input type="file" accept="image/*" onChange={handlePosterFileUpload} className="hidden" />
                  </label>
                ) : (
                  <input
                    type="url"
                    value={customPosterUrl}
                    onChange={(e) => setCustomPosterUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Photos / Proof & Videos / Proof section */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-serif">Documentation Proofs</h3>
              <p className="text-xs text-slate-500">Attach photos, video recordings, or official reports.</p>
            </div>

            {/* List of added initial proofs */}
            {initialProofs.length > 0 && (
              <div className="space-y-2">
                {initialProofs.map((proof, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      {proof.type === 'photo' && <Camera className="w-4 h-4 text-emerald-600 shrink-0" />}
                      {proof.type === 'video' && <Video className="w-4 h-4 text-blue-600 shrink-0" />}
                      {proof.type === 'document' && <FileText className="w-4 h-4 text-amber-600 shrink-0" />}
                      <span className="font-semibold text-slate-800 truncate">{proof.caption}</span>
                      <span className="text-slate-400 truncate">({proof.url})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProof(idx)}
                      className="text-rose-600 hover:text-rose-700 font-bold px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add proof inline form */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Proof Type
                  </label>
                  <select
                    value={proofType}
                    onChange={(e: any) => setProofType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="photo">Photograph</option>
                    <option value="video">Video / YouTube</option>
                    <option value="document">Document / PDF</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      File or URL
                    </label>
                    <div className="flex gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setProofUploadTab('upload')}
                        className={`px-2 py-0.5 rounded font-semibold ${
                          proofUploadTab === 'upload' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        Upload
                      </button>
                      <button
                        type="button"
                        onClick={() => setProofUploadTab('url')}
                        className={`px-2 py-0.5 rounded font-semibold ${
                          proofUploadTab === 'url' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        URL
                      </button>
                    </div>
                  </div>

                  {proofUploadTab === 'upload' ? (
                    <label className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-500 text-xs font-semibold text-slate-700">
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isUploadingProof ? 'Uploading...' : 'Choose File'}</span>
                      <input type="file" accept={proofType === 'photo' ? 'image/*' : '*'} onChange={handleProofFileUpload} className="hidden" />
                    </label>
                  ) : (
                    <input
                      type="url"
                      value={proofUrl}
                      onChange={(e) => setProofUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Caption / File Title
                </label>
                <input
                  type="text"
                  value={proofCaption}
                  onChange={(e) => setProofCaption(e.target.value)}
                  placeholder="e.g. Inaugural session photograph"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <button
                type="button"
                onClick={handleAddProof}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Attach Proof to List</span>
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs sm:text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{programToEdit ? 'Save Changes' : 'Save & Publish Program'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
