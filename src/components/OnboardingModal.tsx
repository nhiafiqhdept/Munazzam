import React, { useState } from 'react';
import { Building2, GraduationCap, Upload, Check, Sparkles, Image as ImageIcon, School, Globe, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fileToDataUrl, SAMPLE_ORG_LOGOS } from '../utils/helpers';

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
  const { addOrganization, organizations, setShowOnboarding } = useApp();

  const [name, setName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [tagline, setTagline] = useState('');
  const [establishedYear, setEstablishedYear] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [logo, setLogo] = useState(SAMPLE_ORG_LOGOS[0].url);
  const [logoTab, setLogoTab] = useState<'preset' | 'upload' | 'url'>('preset');
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError('');
      const dataUrl = await fileToDataUrl(file);
      setLogo(dataUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to upload image. Please choose a valid image file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleApplyPresetOrg = (type: 'fiqh' | 'union' | 'clean') => {
    if (type === 'fiqh') {
      setName('Department of Fiqh and Usul al-Fiqh');
      setCollegeName('Darul Huda Islamic Academy');
      setTagline('Fostering Scholarly Inquiry and Juristic Excellence');
      setEstablishedYear('2012');
      setDescription('Academic department steering jurisprudential workshops, research symposiums, and legal colloquiums.');
      setEmail('fiqhdept@dhiu.edu');
      setLogo(SAMPLE_ORG_LOGOS[1].url);
    } else if (type === 'union') {
      setName('Noorul Huda Students Union');
      setCollegeName('Noorul Huda Academic Campus');
      setTagline('Empowering Student Voices, Leadership, and Creativity');
      setEstablishedYear('2008');
      setDescription('Central student representative union conducting annual arts festivals, campus debates, and community welfare programs.');
      setEmail('union@noorulhuda.edu');
      setLogo(SAMPLE_ORG_LOGOS[2].url);
    } else {
      setName('');
      setCollegeName('');
      setTagline('');
      setEstablishedYear(new Date().getFullYear().toString());
      setDescription('');
      setEmail('');
      setLogo(SAMPLE_ORG_LOGOS[0].url);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide an organization name.');
      return;
    }
    if (!collegeName.trim()) {
      setError('Please provide the college or institution name.');
      return;
    }

    const finalLogo = logoTab === 'url' && customLogoUrl ? customLogoUrl : logo;

    addOrganization({
      name: name.trim(),
      college_name: collegeName.trim(),
      logo: finalLogo,
      tagline: tagline.trim(),
      established_year: establishedYear.trim(),
      description: description.trim(),
      email: email.trim(),
      website: website.trim(),
    });

    setShowOnboarding(false);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        id="onboarding-setup-modal"
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <School className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">
                {isInitialSetup ? 'Welcome to Academic Org Manager' : 'New Organization'}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
                {isInitialSetup ? 'Set Up Organization Profile' : 'Add Another Organization'}
              </h2>
            </div>
          </div>
          <p className="text-sm text-slate-300 max-w-lg mt-1">
            Configure your student union, academic department, or student council profile to document programs and activities.
          </p>

          {/* Quick presets helper */}
          <div className="mt-4 pt-4 border-t border-slate-700/60 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Quick Starters:
            </span>
            <button
              type="button"
              onClick={() => handleApplyPresetOrg('fiqh')}
              className="text-xs px-2.5 py-1 bg-slate-800/90 hover:bg-slate-700 text-emerald-300 rounded-lg border border-slate-700 transition-colors"
            >
              Dept of Fiqh
            </button>
            <button
              type="button"
              onClick={() => handleApplyPresetOrg('union')}
              className="text-xs px-2.5 py-1 bg-slate-800/90 hover:bg-slate-700 text-sky-300 rounded-lg border border-slate-700 transition-colors"
            >
              Noorul Huda Students Union
            </button>
            <button
              type="button"
              onClick={() => handleApplyPresetOrg('clean')}
              className="text-xs px-2.5 py-1 bg-slate-800/90 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
            >
              Fresh Blank Form
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {/* Core Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
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
              Organization Logo / Crest
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              {/* Preview */}
              <div className="w-20 h-20 rounded-2xl bg-white p-1 border-2 border-emerald-500 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={(logoTab === 'url' && customLogoUrl) ? customLogoUrl : (logo || SAMPLE_ORG_LOGOS[0].url)}
                  alt="Logo Preview"
                  className="w-full h-full object-contain rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = SAMPLE_ORG_LOGOS[0].url;
                  }}
                />
              </div>

              {/* Selector options */}
              <div className="flex-1 w-full space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <button
                    type="button"
                    onClick={() => setLogoTab('preset')}
                    className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors ${
                      logoTab === 'preset' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Preset Crests
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoTab('upload')}
                    className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors ${
                      logoTab === 'upload' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Upload Image
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoTab('url')}
                    className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors ${
                      logoTab === 'url' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Image URL
                  </button>
                </div>

                {logoTab === 'preset' && (
                  <div className="flex items-center gap-2">
                    {SAMPLE_ORG_LOGOS.map((sample) => (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => setLogo(sample.url)}
                        className={`p-1.5 rounded-xl border-2 transition-all ${
                          logo === sample.url ? 'border-emerald-600 bg-white shadow-xs' : 'border-slate-200 hover:border-slate-300'
                        }`}
                        title={sample.name}
                      >
                        <img src={sample.url} alt={sample.name} className="w-10 h-10 object-cover rounded-lg" />
                      </button>
                    ))}
                  </div>
                )}

                {logoTab === 'upload' && (
                  <div>
                    <label className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-500 text-slate-700 text-xs font-semibold hover:bg-emerald-50/50 transition-colors">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>{isUploading ? 'Processing Image...' : 'Click to Upload Logo File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-500 mt-1">Supports PNG, JPG, WebP, SVG (Max 5MB)</p>
                  </div>
                )}

                {logoTab === 'url' && (
                  <div>
                    <input
                      type="url"
                      value={customLogoUrl}
                      onChange={(e) => setCustomLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                )}
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
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            {!isInitialSetup && organizations.length > 0 && (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              id="submit-onboarding-btn"
              type="submit"
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-xl transition-all shadow-md flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{isInitialSetup ? 'Complete Setup & Launch Dashboard' : 'Save Organization'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
