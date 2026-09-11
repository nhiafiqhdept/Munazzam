import React, { useState, useEffect, useRef } from 'react';
import { User, Shield, Mail, Phone, Upload, X, Check, Image as ImageIcon, Crop } from 'lucide-react';
import { Organizer } from '../types';
import { useApp } from '../context/AppContext';
import { fileToDataUrl, DEFAULT_POSITIONS } from '../utils/helpers';
import { ImageCropModal } from './ImageCropModal';

interface OrganizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizerToEdit?: Organizer | null;
}

export const OrganizerModal: React.FC<OrganizerModalProps> = ({
  isOpen,
  onClose,
  organizerToEdit,
}) => {
  const { addOrganizer, updateOrganizer } = useApp();

  const [name, setName] = useState('');
  const [selectedPosition, setSelectedPosition] = useState(DEFAULT_POSITIONS[0]);
  const [customPosition, setCustomPosition] = useState('');
  const [isCustomPos, setIsCustomPos] = useState(false);
  const [photo, setPhoto] = useState(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'
  );
  const [photoTab, setPhotoTab] = useState<'upload' | 'url'>('upload');
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  // Crop Modal States
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [tempImageForCrop, setTempImageForCrop] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (organizerToEdit) {
      setName(organizerToEdit.name);
      if (DEFAULT_POSITIONS.includes(organizerToEdit.position)) {
        setSelectedPosition(organizerToEdit.position);
        setIsCustomPos(false);
        setCustomPosition('');
      } else {
        setIsCustomPos(true);
        setCustomPosition(organizerToEdit.position);
      }
      setPhoto(organizerToEdit.photo);
      setEmail(organizerToEdit.email || '');
      setPhone(organizerToEdit.phone || '');
      setBio(organizerToEdit.bio || '');
      setAcademicYear(organizerToEdit.academic_year || '');
      setDisplayOrder(organizerToEdit.display_order || 1);
    } else {
      setName('');
      setSelectedPosition(DEFAULT_POSITIONS[0]);
      setIsCustomPos(false);
      setCustomPosition('');
      setPhoto('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80');
      setEmail('');
      setPhone('');
      setBio('');
      setAcademicYear('');
      setDisplayOrder(1);
    }
    setError('');
    setCustomPhotoUrl('');
  }, [organizerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File validation
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WebP, etc.).');
      return;
    }

    try {
      setIsUploading(true);
      setError('');
      const dataUrl = await fileToDataUrl(file);
      setTempImageForCrop(dataUrl);
      setIsCropModalOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to process image file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOpenCropForUrl = () => {
    if (!customPhotoUrl.trim()) {
      setError('Please enter an image URL first.');
      return;
    }
    setError('');
    setTempImageForCrop(customPhotoUrl.trim());
    setIsCropModalOpen(true);
  };

  const handleOpenCropForExisting = () => {
    const currentImg = photoTab === 'url' && customPhotoUrl ? customPhotoUrl : photo;
    if (!currentImg) return;
    setError('');
    setTempImageForCrop(currentImg);
    setIsCropModalOpen(true);
  };

  const handleCropSave = (croppedResult: string) => {
    setPhoto(croppedResult);
    setCustomPhotoUrl('');
    setPhotoTab('upload');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide the organizer full name.');
      return;
    }

    const finalPosition = isCustomPos ? customPosition.trim() : selectedPosition;
    if (!finalPosition) {
      setError('Please specify a position.');
      return;
    }

    const finalPhoto = photoTab === 'url' && customPhotoUrl ? customPhotoUrl : photo;

    if (organizerToEdit) {
      updateOrganizer({
        id: organizerToEdit.id,
        name: name.trim(),
        position: finalPosition,
        photo: finalPhoto,
        email: email.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        academic_year: academicYear.trim(),
        display_order: Number(displayOrder) || 1,
      });
    } else {
      addOrganizer({
        name: name.trim(),
        position: finalPosition,
        photo: finalPhoto,
        email: email.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        academic_year: academicYear.trim(),
        display_order: Number(displayOrder) || 1,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        id="organizer-modal"
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-100">
                {organizerToEdit ? 'Edit Organizer / Bearer' : 'Add New Organizer'}
              </h3>
              <p className="text-xs text-slate-400">Office bearer & executive profile</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Photo Uploader */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Organizer Photo
            </label>
            <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="relative group shrink-0">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-600 shadow-xs bg-white">
                  <img
                    src={
                      (photoTab === 'url' && customPhotoUrl)
                        ? customPhotoUrl
                        : (photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80')
                    }
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleOpenCropForExisting}
                  className="absolute inset-0 bg-slate-900/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                  title="Crop / Adjust Photo"
                >
                  <Crop className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setPhotoTab('upload')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                        photoTab === 'upload' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoTab('url')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                        photoTab === 'url' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      Image URL
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenCropForExisting}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition-colors"
                  >
                    <Crop className="w-3 h-3" />
                    <span>Crop Photo</span>
                  </button>
                </div>

                {photoTab === 'upload' ? (
                  <label className="flex items-center justify-center gap-2 px-3 py-1.5 bg-white border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-500 text-slate-700 text-xs font-medium transition-colors">
                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isUploading ? 'Processing...' : 'Choose Photo File'}</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={customPhotoUrl}
                      onChange={(e) => setCustomPhotoUrl(e.target.value)}
                      placeholder="https://example.com/photo.jpg"
                      className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleOpenCropForUrl}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shrink-0 flex items-center gap-1"
                    >
                      <Crop className="w-3 h-3" />
                      <span>Crop URL</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Name & Position */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="organizer-name-input"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Muhammad Abdullah"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Position Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Position / Designation <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomPos(!isCustomPos)}
                className="text-[11px] text-emerald-700 font-semibold hover:underline"
              >
                {isCustomPos ? 'Choose from standard list' : '+ Enter custom position'}
              </button>
            </div>

            {isCustomPos ? (
              <input
                type="text"
                required
                value={customPosition}
                onChange={(e) => setCustomPosition(e.target.value)}
                placeholder="e.g. Academic Council Chairman"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            ) : (
              <select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {DEFAULT_POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Academic Batch & Display Order */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Batch / Year
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g. Final Year Scholar"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Display Order
              </label>
              <input
                type="number"
                min={1}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Short Bio / Portfolio Note
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Responsibilities, academic focus, or past executive experience..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              id="submit-organizer-btn"
              type="submit"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{organizerToEdit ? 'Save Changes' : 'Add Organizer'}</span>
            </button>
          </div>
        </form>

        {/* Image Crop & Adjust Modal */}
        <ImageCropModal
          isOpen={isCropModalOpen}
          imageSrc={tempImageForCrop}
          onClose={() => setIsCropModalOpen(false)}
          onCropComplete={handleCropSave}
        />
      </div>
    </div>
  );
};
