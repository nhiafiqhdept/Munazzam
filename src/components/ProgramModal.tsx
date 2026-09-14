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
  Link,
} from 'lucide-react';
import { Program, ProgramMedia } from '../types';
import { useApp } from '../context/AppContext';
import {
  fileToDataUrl,
  uploadFile,
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
  const { addProgram, updateProgram, addProgramMedia, deleteProgramMedia } = useApp();

  // Core required fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
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
  const [uploadProgressPoster, setUploadProgressPoster] = useState(0);

  const [initialProofs, setInitialProofs] = useState<{ id?: string; type: 'photo' | 'video' | 'document'; url: string; caption: string }[]>([]);

  // Photos Proof State
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgressPhoto, setUploadProgressPhoto] = useState(0);

  // Video Proof State
  const [videoUrl, setVideoUrl] = useState('');
  const [videoCaption, setVideoCaption] = useState('');
  const [videoTab, setVideoTab] = useState<'upload' | 'url'>('upload');
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadProgressVideo, setUploadProgressVideo] = useState(0);

  // Document Proof State
  const [docUrl, setDocUrl] = useState('');
  const [docCaption, setDocCaption] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadProgressDoc, setUploadProgressDoc] = useState(0);

  const [error, setError] = useState('');

  useEffect(() => {
    if (programToEdit) {
      setName(programToEdit.name);
      setCategory(programToEdit.category || '');
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
      // Load existing media into initialProofs for management
      if (programToEdit.media) {
        setInitialProofs(programToEdit.media.map(m => ({
          id: m.id, // Keep ID to identify existing media
          type: m.type as any,
          url: m.url,
          caption: m.caption || m.file_name || 'Proof'
        })));
      } else {
        setInitialProofs([]);
      }
    } else {
      setName('');
      setCategory('');
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
      setUploadProgressPoster(0);
      setError('');
      const url = await uploadFile(file, (percent) => setUploadProgressPoster(percent));
      setPoster(url);
    } catch (err: any) {
      setError(err.message || 'Failed to upload poster image.');
    } finally {
      setIsUploadingPoster(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingPhoto(true);
      setUploadProgressPhoto(0);
      setError('');
      const url = await uploadFile(file, (percent) => setUploadProgressPhoto(percent));
      setPhotoUrl(url);
      if (!photoCaption) setPhotoCaption(file.name);
    } catch (err: any) {
      setError(err.message || 'Photo upload failed.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingVideo(true);
      setUploadProgressVideo(0);
      setError('');
      const url = await uploadFile(file, (percent) => setUploadProgressVideo(percent));
      setVideoUrl(url);
      if (!videoCaption) setVideoCaption(file.name);
    } catch (err: any) {
      setError(err.message || 'Video upload failed.');
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingDoc(true);
      setUploadProgressDoc(0);
      setError('');
      const url = await uploadFile(file, (percent) => setUploadProgressDoc(percent));
      setDocUrl(url);
      if (!docCaption) setDocCaption(file.name);
    } catch (err: any) {
      setError(err.message || 'Document upload failed.');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const addPhotoProof = () => {
    if (!photoUrl) {
      setError('Please upload or provide a photo URL.');
      return;
    }
    setInitialProofs(prev => [...prev, { type: 'photo', url: photoUrl, caption: photoCaption || 'Photo Proof' }]);
    setPhotoUrl('');
    setPhotoCaption('');
  };

  const addVideoProof = () => {
    if (!videoUrl) {
      setError('Please upload or provide a video URL.');
      return;
    }
    setInitialProofs(prev => [...prev, { type: 'video', url: videoUrl, caption: videoCaption || 'Video Proof' }]);
    setVideoUrl('');
    setVideoCaption('');
  };

  const addDocProof = () => {
    if (!docUrl) {
      setError('Please upload or provide a document URL.');
      return;
    }
    setInitialProofs(prev => [...prev, { type: 'document', url: docUrl, caption: docCaption || 'Document Proof' }]);
    setDocUrl('');
    setDocCaption('');
  };

  const removeProof = (index: number) => {
    setInitialProofs((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    const programData = {
      name: name.trim(),
      category: category.trim(),
      date,
      time: time.trim(),
      place: place.trim(),
      audience: finalAudience,
      description: description.trim(),
      poster: finalPoster,
      status,
      attendance_count: attendanceCount === '' ? undefined : Number(attendanceCount),
    };

    try {
      if (programToEdit) {
        await updateProgram({
          id: programToEdit.id,
          ...programData,
        });

        // Manage Media Changes
        const existingMedia = programToEdit.media || [];
        const currentMediaIds = initialProofs.filter(p => p.id).map(p => p.id);
        
        // 1. Identify and delete removed media
        const mediaToDelete = existingMedia.filter(m => !currentMediaIds.includes(m.id));
        for (const m of mediaToDelete) {
          await deleteProgramMedia(programToEdit.id, m.id);
        }

        // 2. Identify and add new media
        const mediaToAdd = initialProofs.filter(p => !p.id);
        for (const m of mediaToAdd) {
          await addProgramMedia(programToEdit.id, {
            type: m.type,
            url: m.url,
            caption: m.caption,
            file_name: m.caption,
          });
        }
      } else {
        const newProgram = await addProgram({
          ...programData,
          media: [],
        });

        // Add initial proofs
        for (const proof of initialProofs) {
          await addProgramMedia(newProgram.id, {
            type: proof.type,
            url: proof.url,
            caption: proof.caption,
            file_name: proof.caption,
          });
        }
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save program.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 my-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-heading">
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

          {/* Program Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              PROGRAM CATEGORY
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Enter program category"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
                    <span>{isUploadingPoster ? `Uploading (${uploadProgressPoster}%)...` : 'Choose Poster File'}</span>
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

          {/* Documentation Proofs Section */}
          <div className="space-y-6 pt-6 border-t border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-heading">Documentation Proofs</h3>
              <p className="text-xs text-slate-500">Attach photos, video recordings, and official reports to document the activity.</p>
            </div>

            {/* 1. Photo Proofs Card */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                <Camera className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Photo Proofs</h4>
              </div>

              {/* Display existing photos */}
              {initialProofs.filter(p => p.type === 'photo').length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pb-2">
                  {initialProofs.map((proof, idx) => proof.type === 'photo' ? (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-white group">
                      <img src={proof.url} alt={proof.caption} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1">
                        <p className="text-[8px] text-white font-bold truncate w-full text-center mb-1">{proof.caption}</p>
                        <button 
                          type="button" 
                          onClick={() => removeProof(idx)}
                          className="p-1 bg-rose-600 text-white rounded-md hover:bg-rose-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : null)}
                </div>
              )}

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-500 text-xs font-semibold text-slate-700">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>{isUploadingPhoto ? `Uploading (${uploadProgressPhoto}%)...` : 'Choose Photo File'}</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  <input
                    type="text"
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                    placeholder="Photo Caption (e.g. Stage Event)"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={addPhotoProof}
                  disabled={!photoUrl}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Attach Photo</span>
                </button>
              </div>
            </div>

            {/* 2. Video Proofs Card */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                <Video className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Video Proofs</h4>
              </div>

              {/* Display existing videos */}
              {initialProofs.filter(p => p.type === 'video').length > 0 && (
                <div className="space-y-2 pb-2">
                  {initialProofs.map((proof, idx) => proof.type === 'video' ? (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200 text-[11px]">
                      <div className="flex items-center gap-2 truncate">
                        <Video className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-bold text-slate-800 truncate">{proof.caption}</span>
                        <span className="text-slate-400 truncate hidden sm:inline">({proof.url})</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeProof(idx)}
                        className="text-rose-600 hover:bg-rose-50 p-1 rounded-md"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : null)}
                </div>
              )}

              <div className="space-y-3">
                <div className="flex gap-2 text-[10px] mb-1">
                  <button
                    type="button"
                    onClick={() => setVideoTab('upload')}
                    className={`px-3 py-1 rounded-lg font-bold ${videoTab === 'upload' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}
                  >
                    Upload Video
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoTab('url')}
                    className={`px-3 py-1 rounded-lg font-bold ${videoTab === 'url' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}
                  >
                    YouTube / Link
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {videoTab === 'upload' ? (
                    <label className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-500 text-xs font-semibold text-slate-700">
                      <Upload className="w-4 h-4 text-blue-600" />
                      <span>{isUploadingVideo ? `Uploading (${uploadProgressVideo}%)...` : 'Choose Video File'}</span>
                      <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                    </label>
                  ) : (
                    <div className="relative">
                      <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="YouTube / Video URL"
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                  )}
                  <input
                    type="text"
                    value={videoCaption}
                    onChange={(e) => setVideoCaption(e.target.value)}
                    placeholder="Video Title (e.g. Keynote Speech)"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={addVideoProof}
                  disabled={!videoUrl}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Attach Video</span>
                </button>
              </div>
            </div>

            {/* 3. Document & PDF Proofs Card */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                <FileText className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Document & PDF Proofs</h4>
              </div>

              {/* Display existing documents */}
              {initialProofs.filter(p => p.type === 'document').length > 0 && (
                <div className="space-y-2 pb-2">
                  {initialProofs.map((proof, idx) => proof.type === 'document' ? (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200 text-[11px]">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="font-bold text-slate-800 truncate">{proof.caption}</span>
                        <span className="text-slate-400 truncate hidden sm:inline">({proof.url.split('/').pop()})</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeProof(idx)}
                        className="text-rose-600 hover:bg-rose-50 p-1 rounded-md"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : null)}
                </div>
              )}

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-amber-500 text-xs font-semibold text-slate-700">
                    <Upload className="w-4 h-4 text-amber-600" />
                    <span>{isUploadingDoc ? `Uploading (${uploadProgressDoc}%)...` : 'Choose Doc / PDF'}</span>
                    <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={handleDocUpload} className="hidden" />
                  </label>
                  <input
                    type="text"
                    value={docCaption}
                    onChange={(e) => setDocCaption(e.target.value)}
                    placeholder="Document Title (e.g. Program Report)"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={addDocProof}
                  disabled={!docUrl}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Attach Document</span>
                </button>
              </div>
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
