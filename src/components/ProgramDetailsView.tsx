import React, { useState } from 'react';
import {
  CalendarDays,
  MapPin,
  Users,
  Camera,
  Video,
  FileText,
  Plus,
  Trash2,
  Edit2,
  ArrowLeft,
  Printer,
  Upload,
  Link as LinkIcon,
  Clock,
  Play,
  Download,
  X,
  Film,
} from 'lucide-react';
import { Program, ProgramMedia } from '../types';
import { useApp } from '../context/AppContext';
import {
  formatDate,
  formatFullDate,
  extractYouTubeEmbedUrl,
  extractYouTubeVideoId,
  isYouTubeUrl,
  getVideoFilename,
  fileToDataUrl,
} from '../utils/helpers';
import { MediaGalleryModal } from './MediaGalleryModal';
import { PrintActivityReport } from './PrintActivityReport';
import { ConfirmModal } from './ConfirmModal';

interface VideoCardProps {
  video: ProgramMedia;
  onPlay: (video: ProgramMedia) => void;
  onDelete?: (id: string) => void;
  isAdmin?: boolean;
  onDownload: (url: string, filename: string) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onPlay, onDelete, isAdmin, onDownload }) => {
  const isYT = isYouTubeUrl(video.url);
  const ytId = extractYouTubeVideoId(video.url);
  const ytThumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;
  const fileName = getVideoFilename(video.url, video.caption);
  const [videoError, setVideoError] = useState(false);

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-2xs hover:shadow-md transition-all duration-300 group flex flex-col justify-between">
      {/* Video Thumbnail Box */}
      <div 
        className="relative aspect-video bg-slate-950 overflow-hidden cursor-pointer select-none group"
        onClick={() => onPlay(video)}
      >
        {isYT && ytThumb ? (
          <img 
            src={ytThumb} 
            alt={video.caption || 'YouTube Video'} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setVideoError(true)}
          />
        ) : !videoError ? (
          <video
            src={`${video.url}#t=0.5`}
            preload="metadata"
            muted
            playsInline
            onError={() => setVideoError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 text-center">
            <Video className="w-10 h-10 text-slate-600 mb-2" />
            <span className="text-xs text-slate-400 font-medium">Video Preview</span>
          </div>
        )}

        {/* Play Overlay */}
        <div className="absolute inset-0 bg-slate-950/30 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-600/90 group-hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform backdrop-blur-xs border border-white/20">
            <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-white ml-0.5" />
          </div>
        </div>

        {/* Format Badge */}
        <div className="absolute top-2.5 left-2.5">
          <span className="bg-slate-900/80 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg backdrop-blur-xs border border-white/10 flex items-center gap-1">
            <Film className="w-3 h-3 text-emerald-400" />
            {isYT ? 'YouTube' : 'Uploaded Video'}
          </span>
        </div>
      </div>

      {/* Card Info & Actions */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
            {video.caption || 'Program Video Recording'}
          </h4>
          <p className="text-[11px] text-slate-500 font-mono truncate mt-1 flex items-center gap-1">
            <Video className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{fileName}</span>
          </p>
        </div>

        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold gap-2">
          {/* Download Action */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload(video.url, fileName);
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            title="Download original video file"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Download</span>
          </button>

          {/* Delete Action */}
          {isAdmin && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(video.id);
              }}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1 font-semibold text-xs"
              title="Remove video"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface ProgramDetailsViewProps {
  onOpenEditModal: (program: Program) => void;
}

export const ProgramDetailsView: React.FC<ProgramDetailsViewProps> = ({ onOpenEditModal }) => {
  const {
    currentOrg,
    programs,
    selectedProgramId,
    setActiveTab,
    deleteProgram,
    addProgramMedia,
    deleteProgramMedia,
    isAdmin,
    incomes,
    expenses,
  } = useApp();

  // Find program
  const program = programs.find((p) => p.id === selectedProgramId) || programs[0];

  // Calculate financial summary if admin
  const eventIncomes = incomes.filter((inc) => inc.program_id === program?.id);
  const eventExpenses = expenses.filter((exp) => exp.program_id === program?.id);
  const totalIncome = eventIncomes.reduce((sum, inc) => sum + inc.amount, 0);
  const totalExpenses = eventExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const net = totalIncome - totalExpenses;

  // Media modals and uploaders
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [activePlayingVideo, setActivePlayingVideo] = useState<ProgramMedia | null>(null);
  const [showPrintReport, setShowPrintReport] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleDownloadVideo = async (url: string, filename: string) => {
    try {
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'video.mp4';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Fetch failed');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || 'video.mp4';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.download = filename || 'video.mp4';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Add Proof state
  const [showAddMediaModal, setShowAddMediaModal] = useState(false);
  const [mediaType, setMediaType] = useState<'photo' | 'video' | 'document'>('photo');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaUploadTab, setMediaUploadTab] = useState<'upload' | 'url'>('upload');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState('');

  const openAddMedia = (type: 'photo' | 'video' | 'document') => {
    setMediaType(type);
    setMediaUrl('');
    setMediaCaption('');
    setMediaError('');
    setShowAddMediaModal(true);
  };

  if (!program || !currentOrg) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
        <p className="text-slate-500">Program not found or selected.</p>
        <button
          onClick={() => setActiveTab('programs')}
          className="mt-4 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold"
        >
          Return to Programs List
        </button>
      </div>
    );
  }

  const photoList = (program.media || []).filter((m) => m.type === 'photo');
  const videoList = (program.media || []).filter((m) => m.type === 'video');
  const documentList = (program.media || []).filter((m) => m.type === 'document' || m.type === 'link');

  const handleMediaFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingMedia(true);
      setMediaError('');
      const dataUrl = await fileToDataUrl(file);
      setMediaUrl(dataUrl);
      if (!mediaCaption) setMediaCaption(file.name);
    } catch (err: any) {
      setMediaError(err.message || 'File upload failed.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleSaveMedia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl.trim()) {
      setMediaError('Please provide a file or URL.');
      return;
    }

    addProgramMedia(program.id, {
      type: mediaType,
      url: mediaUrl.trim(),
      caption: mediaCaption.trim() || undefined,
      file_name: mediaCaption.trim() || undefined,
    });

    setMediaUrl('');
    setMediaCaption('');
    setShowAddMediaModal(false);
    setMediaError('');
  };

  const openPhotoLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-16">
      {/* --- DESKTOP TOP BAR (Unchanged) --- */}
      <div className="hidden md:flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <button
          onClick={() => setActiveTab('programs')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Programs</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPrintReport(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-semibold shadow-xs"
            title="Generate and print official activity report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Official Report</span>
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => onOpenEditModal(program)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Record</span>
              </button>

              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                title="Delete Program"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* --- MOBILE TOP BAR (Redesigned) --- */}
      <div className="md:hidden space-y-4 px-1">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-2">
          <button
            onClick={() => setActiveTab('programs')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 text-[11px] font-bold rounded-xl transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPrintReport(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-white rounded-xl text-[11px] font-semibold"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Report</span>
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={() => onOpenEditModal(program)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-[11px] font-bold"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="p-2 text-rose-600 bg-rose-50 rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 1. HERO POSTER & PROGRAM BANNER (Desktop) */}
      <div className="hidden md:block bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-slate-800 text-white relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Large Poster Display */}
          <div className="lg:col-span-5 relative bg-slate-950 min-h-[300px] lg:min-h-[440px] flex items-center justify-center overflow-hidden">
            <img
              src={program.poster || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1000&auto=format&fit=crop&q=80'}
              alt={program.name}
              className="w-full h-full object-cover max-h-[500px]"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1000&auto=format&fit=crop&q=80';
              }}
            />
          </div>

          {/* Program Key Details */}
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Badges Ribbon */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                  {program.status || 'Completed'}
                </span>
                {program.category && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {program.category}
                  </span>
                )}
              </div>

              {/* Title & Category */}
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-heading tracking-tight text-white leading-tight">
                  {program.name}
                </h1>
                {program.category && (
                  <p className="text-xs sm:text-sm font-semibold text-emerald-400/90 mt-1 uppercase tracking-wider">
                    {program.category}
                  </p>
                )}
              </div>

              {/* Metadata Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <p className="text-slate-400 font-medium">Date & Time</p>
                    <p className="font-bold text-white mt-0.5">
                      {formatFullDate(program.date)}
                      {program.time && <span className="block text-slate-300">{program.time}</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                  <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <p className="text-slate-400 font-medium">Place Held</p>
                    <p className="font-bold text-white mt-0.5 truncate">{program.place}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                  <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <p className="text-slate-400 font-medium">For Whom? (Audience)</p>
                    <p className="font-bold text-white mt-0.5">{program.audience}</p>
                  </div>
                </div>

                {typeof program.attendance_count === 'number' && program.attendance_count > 0 && (
                  <div className="flex items-center gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                    <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="text-xs">
                      <p className="text-slate-400 font-medium">Attendance</p>
                      <p className="font-bold text-white mt-0.5">{program.attendance_count} Attendees</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Proof Stats */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-4">
                <span>📷 {photoList.length} Photos</span>
                <span>🎥 {videoList.length} Videos</span>
                <span>📄 {documentList.length} Docs/Links</span>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowAddMediaModal(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Proof</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 1. HERO CARD (Mobile Redesign) */}
      <div className="md:hidden bg-white rounded-[20px] border border-slate-200 shadow-sm overflow-hidden flex flex-col mx-1">
        {/* Mobile Poster */}
        <div className="aspect-[16/10] bg-slate-100 overflow-hidden">
          <img
            src={program.poster || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80'}
            alt={program.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Mobile Banner Info */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">
                {program.status || 'Completed'}
              </span>
              {program.category && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                  {program.category}
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight flex items-center gap-2">
              <span>📷 {photoList.length}</span>
              <span>🎥 {videoList.length}</span>
              <span>📄 {documentList.length}</span>
            </div>
          </div>

          <div>
            <h1 className="text-xl font-bold font-heading text-slate-900 leading-tight">
              {program.name}
            </h1>
            {program.category && (
              <p className="text-xs font-semibold text-emerald-700 mt-1 uppercase tracking-wider">
                {program.category}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            <div className="flex items-center gap-2 text-slate-600">
              <CalendarDays className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold">{formatDate(program.date)} • {program.time || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold truncate">{program.place}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold">{program.audience}</span>
            </div>
            {program.attendance_count ? (
              <div className="flex items-center gap-2 text-slate-600">
                <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-xs font-semibold">{program.attendance_count} Attendees</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 2. PROGRAM DESCRIPTION / REPORT */}
      <div className="bg-white p-6 md:p-8 rounded-[18px] md:rounded-3xl border border-slate-200 shadow-2xs space-y-4 mx-1">
        <h2 className="text-base md:text-lg font-bold text-slate-900 font-heading pb-2 border-b border-slate-100 flex items-center gap-2">
          <span>Program Description & Report</span>
        </h2>
        <div className="text-slate-700 text-sm md:text-base leading-relaxed whitespace-pre-line font-sans">
          {program.description}
        </div>
      </div>

      {/* 4. DOCUMENTATION PROOFS & GALLERY (Desktop) */}
      <div className="hidden md:block space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-heading">Documentation & Media Proofs</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Photographs, attendance sheets, video recordings, and official documents.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowAddMediaModal(true)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Proof Item</span>
            </button>
          )}
        </div>

        {/* Photos Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-600" />
            <span>Photographs ({photoList.length})</span>
          </h3>

          {photoList.length === 0 ? (
            <div className="bg-slate-50 rounded-2xl p-6 text-center border border-slate-200 text-xs text-slate-500">
              No photographs uploaded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {photoList.map((photo, idx) => (
                <div key={photo.id} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-2xs group flex flex-col">
                  <div className="relative h-48 bg-slate-900 cursor-pointer overflow-hidden" onClick={() => openPhotoLightbox(idx)}>
                    <img src={photo.url} alt={photo.caption || 'Photo'} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-3 py-1 bg-slate-900/80 text-white text-xs rounded-xl backdrop-blur-xs font-semibold">View Fullscreen</span>
                    </div>
                  </div>
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                    <p className="text-xs text-slate-700 font-medium leading-snug">{photo.caption || 'Untitled Photograph'}</p>
                    {isAdmin && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                        <button onClick={() => deleteProgramMedia(program.id, photo.id)} className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold">
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Videos Section */}
        <div className="space-y-3 pt-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Video className="w-4 h-4 text-emerald-600" />
            <span>Video Recordings ({videoList.length})</span>
          </h3>
          {videoList.length === 0 ? (
            <div className="bg-slate-50 rounded-2xl p-6 text-center border border-slate-200 text-xs text-slate-500">No video recordings added yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videoList.map((vid) => (
                <VideoCard
                  key={vid.id}
                  video={vid}
                  onPlay={setActivePlayingVideo}
                  onDelete={(id) => deleteProgramMedia(program.id, id)}
                  isAdmin={isAdmin}
                  onDownload={handleDownloadVideo}
                />
              ))}
            </div>
          )}
        </div>

        {/* Documents Section */}
        <div className="space-y-3 pt-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Documents & Reports ({documentList.length})</span>
          </h3>
          {documentList.length === 0 ? (
            <div className="bg-slate-50 rounded-2xl p-6 text-center border border-slate-200 text-xs text-slate-500">No official documents attached.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {documentList.map((doc) => (
                <div key={doc.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl shrink-0"><FileText className="w-5 h-5" /></div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{doc.caption || 'Official Document'}</h4>
                      <a href={doc.url} target="_blank" rel="noreferrer" className="text-[11px] text-emerald-700 hover:underline truncate block">{doc.url}</a>
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => deleteProgramMedia(program.id, doc.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- MOBILE DOCUMENTATION & MEDIA (Redesigned) --- */}
      <div className="md:hidden space-y-6 mx-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900 font-heading">Documentation & Media</h2>
          <p className="text-[11px] text-slate-500">Official evidence and multimedia coverage.</p>
        </div>

        {/* Mobile Photographs Section */}
        <div className="bg-white rounded-[18px] border border-slate-200 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>Photographs ({photoList.length})</span>
            </h3>
            {isAdmin && (
              <button 
                onClick={() => openAddMedia('photo')}
                className="text-emerald-700 text-[10px] font-bold uppercase tracking-wide flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Photo
              </button>
            )}
          </div>
          
          {photoList.length === 0 ? (
            <div className="py-4 text-center text-[10px] text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No photos uploaded.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {photoList.map((photo, idx) => (
                <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden border border-slate-100 shadow-sm" onClick={() => openPhotoLightbox(idx)}>
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  {isAdmin && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteProgramMedia(program.id, photo.id); }}
                      className="absolute top-1.5 right-1.5 p-1.5 bg-rose-600 text-white rounded-lg shadow-md"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile Videos Section */}
        <div className="bg-white rounded-[18px] border border-slate-200 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Video className="w-4 h-4 text-emerald-600" />
              <span>Video Recordings ({videoList.length})</span>
            </h3>
            {isAdmin && (
              <button 
                onClick={() => openAddMedia('video')}
                className="text-emerald-700 text-[10px] font-bold uppercase tracking-wide flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Video
              </button>
            )}
          </div>

          {videoList.length === 0 ? (
            <div className="py-4 text-center text-[10px] text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No videos added.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {videoList.map((vid) => (
                <VideoCard
                  key={vid.id}
                  video={vid}
                  onPlay={setActivePlayingVideo}
                  onDelete={(id) => deleteProgramMedia(program.id, id)}
                  isAdmin={isAdmin}
                  onDownload={handleDownloadVideo}
                />
              ))}
            </div>
          )}
        </div>

        {/* Mobile Documents Section */}
        <div className="bg-white rounded-[18px] border border-slate-200 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>Documents & Reports ({documentList.length})</span>
            </h3>
            {isAdmin && (
              <button 
                onClick={() => openAddMedia('document')}
                className="text-amber-700 text-[10px] font-bold uppercase tracking-wide flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Doc
              </button>
            )}
          </div>

          {documentList.length === 0 ? (
            <div className="py-4 text-center text-[10px] text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No reports uploaded.
            </div>
          ) : (
            <div className="space-y-3">
              {documentList.map((doc) => (
                <div key={doc.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0"><FileText className="w-4 h-4" /></div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">{doc.caption || 'Document Proof'}</p>
                      <p className="text-[10px] text-amber-600 truncate mt-0.5">Official Document</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => deleteProgramMedia(program.id, doc.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FINANCIAL SUMMARY (Admin/Treasurer) */}
      {isAdmin && (
        <div className="bg-white p-6 md:p-8 rounded-[18px] md:rounded-3xl border border-slate-200 shadow-2xs space-y-4 mx-1">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-base md:text-lg font-bold text-slate-900 font-heading">
              Financial Summary
            </h2>
            <span className="text-[9px] md:text-[10px] uppercase font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md tracking-wider">
              Treasurer View
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col">
              <span className="text-[10px] md:text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">Income</span>
              <span className="text-lg font-extrabold text-emerald-700 font-sans">₹{totalIncome.toLocaleString()}</span>
              <span className="text-[9px] text-slate-400 mt-0.5 font-medium">{eventIncomes.length} trx</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col">
              <span className="text-[10px] md:text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">Expenses</span>
              <span className="text-lg font-extrabold text-rose-700 font-sans">₹{totalExpenses.toLocaleString()}</span>
              <span className="text-[9px] text-slate-400 mt-0.5 font-medium">{eventExpenses.length} trx</span>
            </div>

            <div className={`p-4 rounded-2xl border flex flex-col ${net >= 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
              <span className="text-[10px] md:text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">{net >= 0 ? 'Net Surplus' : 'Net Deficit'}</span>
              <span className={`text-lg font-extrabold font-sans ${net >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                {net >= 0 ? '+' : ''}₹{net.toLocaleString()}
              </span>
              <span className={`text-[9px] font-bold mt-0.5 ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {net >= 0 ? 'SURPLUS' : 'DEFICIT'}
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end md:justify-end">
            <button
              onClick={() => setActiveTab('treasury-events')}
              className="w-full md:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              View Financial Details
            </button>
          </div>
        </div>
      )}

      {/* Add Proof Modal */}
      {showAddMediaModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Add Documentation Proof</h3>
              <button
                onClick={() => setShowAddMediaModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                ✕
              </button>
            </div>

            {mediaError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                {mediaError}
              </div>
            )}

            <form onSubmit={handleSaveMedia} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Proof Type
                </label>
                <select
                  value={mediaType}
                  onChange={(e: any) => setMediaType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium"
                >
                  <option value="photo">Photograph</option>
                  <option value="video">Video Recording / YouTube Link</option>
                  <option value="document">Document / PDF / Report Link</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Source / File
                  </label>
                  <div className="flex gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setMediaUploadTab('upload')}
                      className={`px-2 py-0.5 rounded font-semibold ${
                        mediaUploadTab === 'upload' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaUploadTab('url')}
                      className={`px-2 py-0.5 rounded font-semibold ${
                        mediaUploadTab === 'url' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Direct URL
                    </button>
                  </div>
                </div>

                {mediaUploadTab === 'upload' ? (
                  <label className="flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-emerald-500 transition-colors">
                    <Upload className="w-6 h-6 text-emerald-600 mb-2" />
                    <span className="text-xs font-semibold text-slate-700">
                      {isUploadingMedia ? 'Processing file...' : 'Click to choose file'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">Images, PDFs, or documents</span>
                    <input
                      type="file"
                      accept={mediaType === 'photo' ? 'image/*' : '*'}
                      onChange={handleMediaFileUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder={
                      mediaType === 'video'
                        ? 'https://www.youtube.com/watch?v=...'
                        : 'https://example.com/document.pdf'
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm"
                  />
                )}
              </div>

              {mediaUrl && mediaUploadTab === 'upload' && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center justify-between">
                  <span className="truncate">File ready to save</span>
                  <span className="font-bold">✓ Attached</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Caption / Description
                </label>
                <input
                  type="text"
                  value={mediaCaption}
                  onChange={(e) => setMediaCaption(e.target.value)}
                  placeholder="e.g. Chief Guest addressing the audience"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMediaModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 shadow-xs"
                >
                  Save Proof
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {activePlayingVideo && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={() => setActivePlayingVideo(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-white gap-3">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <Video className="w-5 h-5 text-emerald-400 shrink-0" />
                <h3 className="font-bold text-xs sm:text-sm md:text-base truncate">
                  {activePlayingVideo.caption || 'Video Recording'}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownloadVideo(activePlayingVideo.url, getVideoFilename(activePlayingVideo.url, activePlayingVideo.caption))}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                  title="Download Original Video"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Download Video</span>
                </button>
                <button
                  onClick={() => setActivePlayingVideo(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video Player Box */}
            <div className="p-2 sm:p-4 bg-black flex items-center justify-center min-h-[220px] sm:min-h-[400px]">
              {isYouTubeUrl(activePlayingVideo.url) ? (
                extractYouTubeEmbedUrl(activePlayingVideo.url) ? (
                  <iframe
                    src={`${extractYouTubeEmbedUrl(activePlayingVideo.url)}&autoplay=1`}
                    title={activePlayingVideo.caption || 'YouTube Video'}
                    className="w-full aspect-video rounded-xl border border-slate-800 shadow-2xl"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    Unable to play YouTube link directly. <a href={activePlayingVideo.url} target="_blank" rel="noreferrer" className="text-emerald-400 underline">Open link in new tab</a>
                  </div>
                )
              ) : (
                <video
                  controls
                  autoPlay
                  playsInline
                  src={activePlayingVideo.url}
                  className="w-full max-h-[75vh] rounded-xl shadow-2xl bg-black"
                >
                  Your browser does not support playing this video format natively.
                </video>
              )}
            </div>

            {/* Footer info */}
            <div className="p-3 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-slate-400 text-[11px]">
              <span className="truncate max-w-[250px] sm:max-w-md font-mono text-[10px]">
                {getVideoFilename(activePlayingVideo.url, activePlayingVideo.caption)}
              </span>
              <span className="uppercase tracking-wider font-bold text-[9px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/50 px-2 py-0.5 rounded-md shrink-0 ml-2">
                {isYouTubeUrl(activePlayingVideo.url) ? 'YouTube Stream' : 'Original Video File'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && photoList.length > 0 && (
        <MediaGalleryModal
          mediaList={photoList}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/* Official Print Activity Report */}
      {showPrintReport && (
        <PrintActivityReport program={program} organization={currentOrg} org={currentOrg} onClose={() => setShowPrintReport(false)} />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Delete Program Activity"
        message={`Are you sure you want to permanently delete "${program.name}" and all attached documentation proofs?`}
        confirmText="Yes, Delete Record"
        onConfirm={() => {
          deleteProgram(program.id);
          setActiveTab('programs');
        }}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
};
