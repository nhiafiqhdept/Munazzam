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
  CheckCircle2,
  Loader2,
  File,
  Trash2,
  Play,
  RefreshCw,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { Program, ProgramMedia } from '../types';
import { useApp } from '../context/AppContext';
import { ProgramCategoryCombobox } from './ProgramCategoryCombobox';
import { ProgramSubCategoryCombobox } from './ProgramSubCategoryCombobox';
import {
  fileToDataUrl,
  uploadFile,
  DEFAULT_AUDIENCES,
  generateId,
  determineProgramStatusByDate,
  getProgramEffectiveStatus,
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
  const { addProgram, updateProgram, addProgramMedia, deleteProgramMedia, programCategories, ensureCategoryExists } = useApp();

  // Core required fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [audience, setAudience] = useState(DEFAULT_AUDIENCES[0]);
  const [customAudience, setCustomAudience] = useState('');
  const [isCustomAudience, setIsCustomAudience] = useState(false);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'completed' | 'upcoming' | 'ongoing'>('completed');
  const [attendanceCount, setAttendanceCount] = useState<number | ''>('');
  const [resourcePerson, setResourcePerson] = useState('');

  // Poster - Default to empty string (no auto-generated or stock fallback posters)
  const [poster, setPoster] = useState('');
  const [posterTab, setPosterTab] = useState<'upload' | 'url'>('upload');
  const [customPosterUrl, setCustomPosterUrl] = useState('');
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [uploadProgressPoster, setUploadProgressPoster] = useState(0);

  const [initialProofs, setInitialProofs] = useState<{ id?: string; type: 'photo' | 'video' | 'document'; url: string; caption: string }[]>([]);

  // Queued files state for multiple upload support
  const [queuedFiles, setQueuedFiles] = useState<{
    id: string;
    file: File;
    name: string;
    size: number;
    type: 'photo' | 'video' | 'document';
    status: 'queued' | 'uploading' | 'completed' | 'failed';
    progress: number;
    url?: string;
    error?: string;
  }[]>([]);

  // Deletion confirmation state for existing proofs
  const [proofToDelete, setProofToDelete] = useState<{ index: number; caption: string } | null>(null);

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (programToEdit) {
      setName(programToEdit.name);
      
      // Resolve assigned category and ID
      let initialCatName = (programToEdit.category || '').trim();
      let initialCatId = programToEdit.category_id || '';
      if (initialCatId && !initialCatName) {
        const match = programCategories.find((c) => c.id === initialCatId);
        if (match) initialCatName = match.name;
      } else if (initialCatName && !initialCatId) {
        const match = programCategories.find((c) => (c.name || '').trim().toLowerCase() === initialCatName.toLowerCase());
        if (match) initialCatId = match.id;
      }
      setCategory(initialCatName);
      setCategoryId(initialCatId);
      setSubCategory(programToEdit.subCategory || '');

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
      setCustomPosterUrl(programToEdit.poster || '');
      setStatus(getProgramEffectiveStatus(programToEdit));
      setAttendanceCount(programToEdit.attendance_count || '');
      setResourcePerson(programToEdit.resourcePerson || '');
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
      const todayStr = new Date().toISOString().split('T')[0];
      setName('');
      setCategory('');
      setCategoryId('');
      setSubCategory('');
      setDate(todayStr);
      setTime('10:00 AM – 01:00 PM');
      setPlace('Main College Auditorium');
      setAudience(DEFAULT_AUDIENCES[0]);
      setIsCustomAudience(false);
      setCustomAudience('');
      setDescription('');
      setPoster('');
      setCustomPosterUrl('');
      setStatus(determineProgramStatusByDate(todayStr));
      setAttendanceCount('');
      setResourcePerson('');
      setInitialProofs([]);
    }
    setQueuedFiles([]);
    setProofToDelete(null);
    setError('');
    setSuccessMessage('');
    setIsSubmitting(false);
  }, [programToEdit, isOpen, programCategories]);

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

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video' | 'document') => {
    const selectedList = e.target.files;
    if (!selectedList || selectedList.length === 0) return;

    const newItems: typeof queuedFiles = [];
    let hasUnsupported = false;

    for (let i = 0; i < selectedList.length; i++) {
      const file = selectedList[i];

      // Validate file type
      let isValid = false;
      if (type === 'photo') {
        isValid = file.type.startsWith('image/');
      } else if (type === 'video') {
        isValid = file.type.startsWith('video/');
      } else if (type === 'document') {
        const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'];
        const lowerName = file.name.toLowerCase();
        const isAllowedExt = allowedExtensions.some(ext => lowerName.endsWith(ext));
        const isDocMime = file.type.startsWith('application/') || file.type.startsWith('text/') || file.type === 'application/pdf';
        isValid = isAllowedExt || isDocMime;
      }

      if (!isValid) {
        hasUnsupported = true;
        continue;
      }

      // Prevent duplicate video/photo/doc uploads based on filename and size
      const isDuplicateInQueue = queuedFiles.some(item => item.name === file.name && item.size === file.size);
      const isDuplicateInExisting = initialProofs.some(p => p.caption === file.name || p.url.includes(encodeURIComponent(file.name)));

      if (isDuplicateInQueue || isDuplicateInExisting) {
        continue;
      }

      const fileId = 'queued_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

      newItems.push({
        id: fileId,
        file,
        name: file.name,
        size: file.size,
        type,
        status: 'queued',
        progress: 0,
        url: URL.createObjectURL(file)
      });
    }

    if (hasUnsupported) {
      setError(`Some files were skipped because they have unsupported formats.`);
    }

    if (newItems.length > 0) {
      setQueuedFiles(prev => [...prev, ...newItems]);
    }
    // Clear value to allow picking same files again if deleted
    e.target.value = '';
  };

  // Auto upload effect
  useEffect(() => {
    if (!isOpen) return;
    const queuedItem = queuedFiles.find(item => item.status === 'queued');
    if (queuedItem) {
      const uploadWorker = async () => {
        // Mark as uploading immediately to avoid double calls
        setQueuedFiles(prev => prev.map(f => f.id === queuedItem.id ? { ...f, status: 'uploading', progress: 0 } : f));
        try {
          const serverUrl = await uploadFile(queuedItem.file, (percent) => {
            setQueuedFiles(prev => prev.map(f => f.id === queuedItem.id ? { ...f, progress: percent } : f));
          });
          setQueuedFiles(prev => prev.map(f => f.id === queuedItem.id ? { ...f, status: 'completed', progress: 100, url: serverUrl } : f));
        } catch (err: any) {
          setQueuedFiles(prev => prev.map(f => f.id === queuedItem.id ? { ...f, status: 'failed', error: err.message || 'Upload failed' } : f));
        }
      };
      uploadWorker();
    }
  }, [queuedFiles, isOpen]);

  if (!isOpen) return null;

  const handleRetryUpload = (id: string) => {
    setQueuedFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'queued', progress: 0, error: undefined } : f));
  };

  const handleRemoveQueuedFile = (id: string) => {
    setQueuedFiles(prev => {
      const match = prev.find(f => f.id === id);
      if (match?.url && match.url.startsWith('blob:')) {
        URL.revokeObjectURL(match.url);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const handleRequestDeleteExistingProof = (index: number) => {
    const target = initialProofs[index];
    if (target) {
      setProofToDelete({ index, caption: target.caption || 'this file' });
    }
  };

  const handleConfirmDeleteExistingProof = async () => {
    if (proofToDelete === null) return;
    const { index } = proofToDelete;
    const targetProof = initialProofs[index];
    
    // If we're editing an existing program and it has an ID, call the cloud deletion
    if (programToEdit && targetProof && targetProof.id) {
      try {
        await deleteProgramMedia(programToEdit.id, targetProof.id);
      } catch (err: any) {
        console.error('Failed to delete media from firestore:', err);
      }
    }

    setInitialProofs((prev) => prev.filter((_, idx) => idx !== index));
    setProofToDelete(null);
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

    const finalPoster = posterTab === 'url' ? customPosterUrl.trim() : poster.trim();

    const trimmedCategory = category.trim();
    let finalCategoryId = categoryId;
    let finalCategoryName = trimmedCategory;

    try {
      setIsSubmitting(true);
      setError('');
      setSuccessMessage('');

      // Check for any ongoing uploads
      const activeUploadsCount = queuedFiles.filter(f => f.status === 'queued' || f.status === 'uploading').length;
      if (activeUploadsCount > 0) {
        setError(`Please wait for ${activeUploadsCount} selected file(s) to finish uploading.`);
        setIsSubmitting(false);
        return;
      }

      // Check for failed uploads
      const failedUploadsCount = queuedFiles.filter(f => f.status === 'failed').length;
      if (failedUploadsCount > 0) {
        setError(`Please retry or remove the ${failedUploadsCount} failed upload(s) before saving.`);
        setIsSubmitting(false);
        return;
      }

      if (trimmedCategory) {
        try {
          const ensuredCat = await ensureCategoryExists(trimmedCategory);
          if (ensuredCat) {
            finalCategoryId = ensuredCat.id;
            finalCategoryName = ensuredCat.name;
          }
        } catch (catErr) {
          console.warn('Could not auto-ensure category document:', catErr);
        }
      } else {
        finalCategoryId = '';
        finalCategoryName = '';
      }

      const parsedAttendance = attendanceCount === '' ? 0 : Number(attendanceCount);

      const programData = {
        name: name.trim(),
        category_id: finalCategoryId || '',
        category: finalCategoryName || '',
        subCategory: subCategory.trim() || undefined,
        date,
        time: time.trim(),
        place: place.trim(),
        audience: finalAudience,
        description: description.trim(),
        poster: finalPoster || '',
        status,
        attendance_count: isNaN(parsedAttendance) ? 0 : parsedAttendance,
        resourcePerson: resourcePerson.trim(),
      };

      const formattedInitialMedia = initialProofs.map((p, idx) => ({
        id: p.id || 'med_' + Date.now() + '_' + idx,
        program_id: programToEdit ? programToEdit.id : '',
        type: p.type || 'photo',
        url: p.url || '',
        caption: p.caption || '',
        file_name: p.caption || '',
        created_at: new Date().toISOString(),
      }));

      // Add completed queued files to media
      const newlyUploadedMedia = queuedFiles
        .filter(f => f.status === 'completed')
        .map((f, idx) => ({
          id: 'med_' + Date.now() + '_new_' + idx + '_' + Math.random().toString(36).substr(2, 4),
          program_id: programToEdit ? programToEdit.id : '',
          type: f.type,
          url: f.url || '',
          caption: f.name,
          file_name: f.name,
          created_at: new Date().toISOString(),
        }));

      const finalMedia = [...formattedInitialMedia, ...newlyUploadedMedia];

      if (programToEdit) {
        await updateProgram({
          id: programToEdit.id,
          ...programData,
          media: finalMedia,
        });
        setSuccessMessage('Program changes saved & updated successfully!');
      } else {
        await addProgram({
          ...programData,
          media: finalMedia,
        });
        setSuccessMessage('Program uploaded & published successfully!');
      }

      setIsSubmitting(false);

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to save program to cloud database.');
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

        {successMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
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

          {/* Program Category (Optional Account Combobox) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Program Category <span className="text-slate-400 text-[10px] font-normal normal-case">(Optional)</span>
              </label>
              {category && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  {category}
                </span>
              )}
            </div>
            <ProgramCategoryCombobox
              value={category}
              onChange={(catName, catId) => {
                setCategory(catName);
                setCategoryId(catId || '');
              }}
            />
          </div>

          {/* Sub Category (Optional Account Combobox) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                SUB CATEGORY <span className="text-slate-400 text-[10px] font-normal normal-case">(Optional)</span>
              </label>
              {subCategory && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  {subCategory}
                </span>
              )}
            </div>
            <ProgramSubCategoryCombobox
              value={subCategory}
              onChange={(subCat) => setSubCategory(subCat)}
              categoryContext={category}
              placeholder="Select or enter sub category..."
            />
          </div>

          {/* Resource Person / Faculty (Optional) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              RESOURCE PERSON / FACULTY <span className="text-slate-400 text-[10px] font-normal normal-case">(OPTIONAL)</span>
            </label>
            <input
              type="text"
              value={resourcePerson}
              onChange={(e) => setResourcePerson(e.target.value)}
              placeholder="Enter presenter, speaker, faculty, or resource person name"
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
                onChange={(e) => {
                  const newDate = e.target.value;
                  setDate(newDate);
                  if (!programToEdit) {
                    setStatus(determineProgramStatusByDate(newDate));
                  }
                }}
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

          {/* Program Poster (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Program Poster <span className="text-slate-400 text-[10px] font-normal normal-case">(Optional)</span>
              </label>
              {(posterTab === 'url' ? customPosterUrl : poster) && (
                <button
                  type="button"
                  onClick={() => {
                    setPoster('');
                    setCustomPosterUrl('');
                  }}
                  className="px-2 py-0.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3 h-3 text-rose-600" />
                  <span>Remove Poster</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="w-24 h-32 rounded-xl overflow-hidden shrink-0 shadow-xs border border-slate-200 flex items-center justify-center bg-slate-100">
                {(posterTab === 'url' ? customPosterUrl : poster) ? (
                  <img
                    src={posterTab === 'url' ? customPosterUrl : poster}
                    alt="Poster preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-2">
                    <span className="text-[11px] font-medium text-slate-400 block">No Poster</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">(Uses Default)</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3 w-full">
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPosterTab('upload')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                      posterTab === 'upload' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    Upload Image
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosterTab('url')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                      posterTab === 'url' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    Image URL
                  </button>
                </div>

                {posterTab === 'upload' ? (
                  <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-500 text-slate-700 text-xs font-semibold transition-colors">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>{isUploadingPoster ? 'Uploading Poster...' : 'Choose Poster File'}</span>
                    <input type="file" accept="image/*" onChange={handlePosterFileUpload} className="hidden" />
                  </label>
                ) : (
                  <input
                    type="url"
                    value={customPosterUrl}
                    onChange={(e) => setCustomPosterUrl(e.target.value)}
                    placeholder="https://example.com/poster.jpg"
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

            {/* 1. Photo Proofs Section */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Photo Proofs</h4>
                </div>
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer text-[11px] font-semibold text-slate-700 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Choose Photo Files</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFilesSelected(e, 'photo')}
                    className="hidden"
                  />
                </label>
              </div>

              {/* A. Already Uploaded Photos */}
              {initialProofs.filter(p => p.type === 'photo').length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Already Uploaded</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {initialProofs.map((proof, idx) => proof.type === 'photo' ? (
                      <div key={`existing-photo-${idx}`} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-white group shadow-xs">
                        <img src={proof.url} alt={proof.caption} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                          <p className="text-[10px] text-white font-bold truncate w-full" title={proof.caption}>
                            {proof.caption}
                          </p>
                          <div className="flex justify-end gap-1.5">
                            <a
                              href={proof.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-lg backdrop-blur-xs transition-colors"
                              title="View full image"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleRequestDeleteExistingProof(idx)}
                              className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors"
                              title="Delete proof"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}

              {/* B. Newly Selected Photos Queue */}
              {queuedFiles.filter(f => f.type === 'photo').length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Uploads</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {queuedFiles.map((item) => item.type === 'photo' ? (
                      <div key={item.id} className="flex gap-3 p-2 bg-white rounded-xl border border-slate-200/80 shadow-xs relative">
                        <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                          <img src={item.url} alt="Local preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="pr-6">
                            <p className="text-xs font-bold text-slate-800 truncate" title={item.name}>{item.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{(item.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>

                          {/* Upload Progress/Status */}
                          <div className="w-full mt-1">
                            {item.status === 'uploading' && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-[8px] font-bold text-emerald-600">
                                  <span>Uploading...</span>
                                  <span>{item.progress}%</span>
                                </div>
                                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${item.progress}%` }} />
                                </div>
                              </div>
                            )}
                            {item.status === 'completed' && (
                              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Success</span>
                              </div>
                            )}
                            {item.status === 'failed' && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate" title={item.error}>{item.error || 'Upload failed'}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRetryUpload(item.id)}
                                  className="flex items-center gap-1 text-[10px] text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Retry
                                </button>
                              </div>
                            )}
                            {item.status === 'queued' && (
                              <p className="text-[10px] text-slate-400 font-bold">In Queue...</p>
                            )}
                          </div>
                        </div>

                        {/* Remove Action Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveQueuedFile(item.id)}
                          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Video Proofs Section */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Video Proofs</h4>
                </div>
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer text-[11px] font-semibold text-slate-700 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>Choose Video Files</span>
                  <input
                    type="file"
                    multiple
                    accept="video/*"
                    onChange={(e) => handleFilesSelected(e, 'video')}
                    className="hidden"
                  />
                </label>
              </div>

              {/* A. Already Uploaded Videos */}
              {initialProofs.filter(p => p.type === 'video').length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Already Uploaded</div>
                  <div className="space-y-2">
                    {initialProofs.map((proof, idx) => proof.type === 'video' ? (
                      <div key={`existing-video-${idx}`} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-xs">
                        <div className="flex items-center gap-2.5 truncate min-w-0 flex-1">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                            <Video className="w-4 h-4" />
                          </div>
                          <div className="truncate pr-4">
                            <span className="font-bold text-slate-800 block truncate">{proof.caption}</span>
                            <span className="text-[10px] text-slate-400 truncate block">Click view to watch on-demand</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={proof.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Watch Video"
                          >
                            <Play className="w-4 h-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRequestDeleteExistingProof(idx)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete proof"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}

              {/* B. Newly Selected Videos Queue */}
              {queuedFiles.filter(f => f.type === 'video').length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Uploads</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {queuedFiles.map((item) => item.type === 'video' ? (
                      <div key={item.id} className="flex gap-3 p-2 bg-white rounded-xl border border-slate-200/80 shadow-xs relative">
                        <div className="w-14 h-14 rounded-lg bg-slate-50 shrink-0 border border-slate-100 flex items-center justify-center">
                          <Video className="w-6 h-6 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="pr-6">
                            <p className="text-xs font-bold text-slate-800 truncate" title={item.name}>{item.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{(item.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>

                          {/* Upload Progress/Status */}
                          <div className="w-full mt-1">
                            {item.status === 'uploading' && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-[8px] font-bold text-blue-600">
                                  <span>Uploading...</span>
                                  <span>{item.progress}%</span>
                                </div>
                                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${item.progress}%` }} />
                                </div>
                              </div>
                            )}
                            {item.status === 'completed' && (
                              <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Success</span>
                              </div>
                            )}
                            {item.status === 'failed' && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate" title={item.error}>{item.error || 'Upload failed'}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRetryUpload(item.id)}
                                  className="flex items-center gap-1 text-[10px] text-blue-700 hover:text-blue-800 font-bold underline cursor-pointer"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Retry
                                </button>
                              </div>
                            )}
                            {item.status === 'queued' && (
                              <p className="text-[10px] text-slate-400 font-bold">In Queue...</p>
                            )}
                          </div>
                        </div>

                        {/* Remove Action Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveQueuedFile(item.id)}
                          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Document & PDF Proofs Section */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Document & PDF Proofs</h4>
                </div>
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer text-[11px] font-semibold text-slate-700 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-amber-600" />
                  <span>Choose Document Files</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf"
                    onChange={(e) => handleFilesSelected(e, 'document')}
                    className="hidden"
                  />
                </label>
              </div>

              {/* A. Already Uploaded Documents */}
              {initialProofs.filter(p => p.type === 'document').length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Already Uploaded</div>
                  <div className="space-y-2">
                    {initialProofs.map((proof, idx) => proof.type === 'document' ? (
                      <div key={`existing-doc-${idx}`} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-xs">
                        <div className="flex items-center gap-2.5 truncate min-w-0 flex-1">
                          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="truncate pr-4">
                            <span className="font-bold text-slate-800 block truncate">{proof.caption}</span>
                            <span className="text-[10px] text-slate-400 truncate block">Official uploaded report</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={proof.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Download / View Report"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRequestDeleteExistingProof(idx)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete proof"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}

              {/* B. Newly Selected Documents Queue */}
              {queuedFiles.filter(f => f.type === 'document').length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Uploads</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {queuedFiles.map((item) => item.type === 'document' ? (
                      <div key={item.id} className="flex gap-3 p-2 bg-white rounded-xl border border-slate-200/80 shadow-xs relative">
                        <div className="w-14 h-14 rounded-lg bg-slate-50 shrink-0 border border-slate-100 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="pr-6">
                            <p className="text-xs font-bold text-slate-800 truncate" title={item.name}>{item.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{(item.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>

                          {/* Upload Progress/Status */}
                          <div className="w-full mt-1">
                            {item.status === 'uploading' && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-[8px] font-bold text-amber-600">
                                  <span>Uploading...</span>
                                  <span>{item.progress}%</span>
                                </div>
                                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${item.progress}%` }} />
                                </div>
                              </div>
                            )}
                            {item.status === 'completed' && (
                              <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Success</span>
                              </div>
                            )}
                            {item.status === 'failed' && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate" title={item.error}>{item.error || 'Upload failed'}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRetryUpload(item.id)}
                                  className="flex items-center gap-1 text-[10px] text-amber-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Retry
                                </button>
                              </div>
                            )}
                            {item.status === 'queued' && (
                              <p className="text-[10px] text-slate-400 font-bold">In Queue...</p>
                            )}
                          </div>
                        </div>

                        {/* Remove Action Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveQueuedFile(item.id)}
                          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}
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
              disabled={isSubmitting || !!successMessage}
              className={`px-6 py-2.5 font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                successMessage
                  ? 'bg-emerald-800 text-white'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-80'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                  <span>Saving & Publishing...</span>
                </>
              ) : successMessage ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Uploaded & Published Successfully!</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{programToEdit ? 'Save Changes' : 'Save & Publish Program'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Custom Deletion Confirmation Modal Overlay */}
      {proofToDelete !== null && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-50 rounded-2xl text-rose-600 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-900 font-heading">Delete Proof Document</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to permanently delete <strong className="text-slate-800 break-all">"{proofToDelete.caption}"</strong>? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end text-xs font-bold pt-2">
              <button
                type="button"
                onClick={() => setProofToDelete(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteExistingProof}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
