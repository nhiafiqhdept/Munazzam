import React, { useState } from 'react';
import { Building2, GraduationCap, Upload, Trash2, Check, Image as ImageIcon, School, Globe, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fileToDataUrl, uploadFile, optimizeImageFile, isImageFile } from '../utils/helpers';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose?: () => void;
  isInitialSetup?: boolean;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  isInitialSetup = false,
}) => {
  const { addOrganization, organizations, setShowOnboarding, user, hasConfiguredOrg } = useApp();

  const [name, setName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [tagline, setTagline] = useState('');
  const [establishedYear, setEstablishedYear] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [logo, setLogo] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleDoItLater = () => {
    if (user?.id) {
      try {
        localStorage.setItem(`munazzam_skipped_onboarding_${user.id}`, 'true');
      } catch {}
    }
    setShowOnboarding(false);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isImageFile(file)) {
      setError('Please choose a valid image file (PNG, WebP, JPEG) for the logo.');
      return;
    }

    try {
      setIsUploading(true);
      setError('');

      // Optimize logo with transparency preservation (Max 1200px, WebP/PNG, target ~500 KB)
      const optimized = await optimizeImageFile(file, {
        maxDimension: 1200,
        targetMaxSizeBytes: 500 * 1024,
        preserveTransparency: true,
      });

      // Preview immediately using optimized image
      setLogo(optimized.dataUrl);

      // Upload optimized file
      const url = await uploadFile(optimized.file);
      if (url) {
        setLogo(url);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload image. Please choose a valid image file.');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!name.trim()) {
      setError('Please provide an organization name.');
      return;
    }
    if (!collegeName.trim()) {
      setError('Please provide the college or institution name.');
      return;
    }

    try {
      setIsSaving(true);
      await addOrganization({
        name: name.trim(),
        college_name: collegeName.trim(),
        logo: logo,
        tagline: tagline.trim(),
        established_year: establishedYear.trim(),
        description: description.trim(),
        email: email.trim(),
        website: website.trim(),
      });
      setShowOnboarding(false);
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save organization.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200 py-8 sm:py-12 md:py-16">
      <div
         id="onboarding-setup-modal"
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <School className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">
                NEW ORGANIZATION
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
                Add Organization
              </h2>
            </div>
          </div>
          <p className="text-sm text-slate-300 max-w-lg mt-2 leading-relaxed">
            Configure your student union, academic department, or student council profile to document programs and activities.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 pt-8 sm:pt-10 space-y-7">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {/* Core Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Organization Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="org-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Department of Fiqh and Usul al-Fiqh"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-medium text-sm"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                College / Institution Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <GraduationCap className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="org-college-input"
                  type="text"
                  required
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  placeholder="e.g. Darul Huda Islamic Academy"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-medium text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Motto / Tagline <span className="text-slate-400 text-xs font-normal">(Optional)</span>
              </label>
              <input
                id="org-tagline-input"
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Scholarly Inquiry and Juristic Excellence"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Established Year <span className="text-slate-400 text-xs font-normal">(Optional)</span>
              </label>
              <input
                id="org-est-year-input"
                type="text"
                value={establishedYear}
                onChange={(e) => setEstablishedYear(e.target.value)}
                placeholder="e.g. 2012"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-sm"
              />
            </div>
          </div>

          {/* Logo Selection Section */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              ORGANIZATION LOGO / CREST
            </label>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80">
              {/* Preview */}
              <div className="w-24 h-24 rounded-2xl bg-white p-2 border border-slate-200 shadow-xs flex flex-col items-center justify-center overflow-hidden shrink-0 relative group">
                {logo ? (
                  <img
                    src={logo}
                    alt="Logo Preview"
                    className="w-full h-full object-contain rounded-xl"
                  />
                ) : (
                  <div className="flex flex-col items-center text-center text-slate-400">
                    <ImageIcon className="w-8 h-8 mb-1 text-slate-300" />
                    <span className="text-[10px] font-medium text-slate-400">No Logo</span>
                  </div>
                )}
              </div>

              {/* Selector options / Upload Area */}
              <div className="flex-1 w-full space-y-3 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl cursor-pointer text-xs font-bold transition-all shadow-xs active:scale-[0.98]">
                    <Upload className="w-4 h-4" />
                    <span>{isUploading ? 'Uploading Logo...' : logo ? 'Replace Logo' : 'Upload Organization Logo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>

                  {logo && (
                    <button
                      type="button"
                      onClick={() => setLogo('')}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Remove Logo</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Upload a custom crest or logo from your device. Supports JPG, PNG, and WebP images.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Official Email <span className="text-slate-400 text-xs font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@organization.edu"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Website Link <span className="text-slate-400 text-xs font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://organization.edu"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 w-full">
            <div>
              {hasConfiguredOrg && (
                <button
                  id="onboarding-do-it-later-btn"
                  type="button"
                  onClick={handleDoItLater}
                  className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 rounded-xl transition-all border border-transparent hover:border-slate-200 text-center cursor-pointer active:scale-95"
                >
                  Do It Later
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto justify-end">
              {onClose && hasConfiguredOrg && (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-center disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
              <button
                id="submit-onboarding-btn"
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-700/60 text-white font-semibold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>{isSaving ? 'Creating...' : 'Save Organization'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
