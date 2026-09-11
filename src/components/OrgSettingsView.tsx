import React, { useState, useEffect } from 'react';
import {
  Building2,
  Upload,
  Check,
  Save,
  Download,
  FileCode,
  Shield,
  PlusCircle,
  Sparkles,
  GraduationCap,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fileToDataUrl, uploadFile } from '../utils/helpers';

interface OrgSettingsViewProps {
  onOpenNewOrgModal: () => void;
}

export const OrgSettingsView: React.FC<OrgSettingsViewProps> = ({ onOpenNewOrgModal }) => {
  const { currentOrg, updateOrganization, exportDataAsJson, importDataFromJson, isAdmin } = useApp();

  const [name, setName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [tagline, setTagline] = useState('');
  const [about, setAbout] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [logo, setLogo] = useState('');
  const [logoTab, setLogoTab] = useState<'upload' | 'url'>('upload');
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (currentOrg) {
      setName(currentOrg.name);
      setCollegeName(currentOrg.college_name);
      setTagline(currentOrg.tagline || '');
      setAbout(currentOrg.about || '');
      setAcademicYear(currentOrg.academic_year || '');
      setLogo(currentOrg.logo);
    }
  }, [currentOrg]);

  if (!currentOrg) return null;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setErrorMsg('');
      const url = await uploadFile(file, (percent) => setUploadProgress(percent));
      setLogo(url);
      setLogoTab('upload');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload logo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim() || !collegeName.trim()) {
      setErrorMsg('Organization name and College name are required.');
      return;
    }

    try {
      setIsSaving(true);
      const finalLogo = logoTab === 'url' && customLogoUrl.trim() ? customLogoUrl.trim() : logo;

      updateOrganization({
        id: currentOrg.id,
        name: name.trim(),
        college_name: collegeName.trim(),
        tagline: tagline.trim(),
        about: about.trim(),
        academic_year: academicYear.trim(),
        logo: finalLogo,
      });

      // If custom logo URL was used, update local logo state as well
      if (logoTab === 'url' && customLogoUrl.trim()) {
        setLogo(customLogoUrl.trim());
        setCustomLogoUrl('');
      }

      setSuccessMsg('Profile changes saved successfully.');
      setTimeout(() => {
        setSuccessMsg('');
      }, 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save profile changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    const jsonStr = exportDataAsJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentOrg.name.toLowerCase().replace(/\s+/g, '_')}_activities_backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const res = importDataFromJson(content);
        if (res.success) {
          setSuccessMsg('Data imported and restored successfully!');
        } else {
          setErrorMsg(res.error || 'Failed to parse backup JSON file.');
        }
      } catch (err) {
        setErrorMsg('Invalid backup file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
              <Building2 className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">
              Organization Profile & Institutional Settings
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage academic entity identity, branding logos, session notes, and database backups.
          </p>
        </div>

        <button
          onClick={onOpenNewOrgModal}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-emerald-400" />
          <span>Set Up New Organization</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile Settings Form */}
        <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 pb-3 border-b border-slate-100">
            Institutional Identity & Information
          </h2>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Logo */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Official Crest / Logo
              </label>
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 p-1.5 shrink-0 shadow-2xs flex items-center justify-center">
                  <img
                    src={(logoTab === 'url' && customLogoUrl) ? customLogoUrl : (logo || 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200&auto=format&fit=crop&q=80')}
                    alt="Logo"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200&auto=format&fit=crop&q=80';
                    }}
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setLogoTab('upload')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                        logoTab === 'upload' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoTab('url')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                        logoTab === 'url' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      Image URL
                    </button>
                  </div>

                  {logoTab === 'upload' ? (
                    <label className="flex items-center justify-center gap-2 px-3.5 py-2 bg-white border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-500 text-slate-700 text-xs font-semibold">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>{isUploading ? `Uploading (${uploadProgress}%)...` : 'Choose Logo Image'}</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  ) : (
                    <input
                      type="url"
                      value={customLogoUrl}
                      onChange={(e) => setCustomLogoUrl(e.target.value)}
                      placeholder="https://example.com/crest.png"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Organization Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Organization Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white"
              />
            </div>

            {/* College / Institution */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                College / Institution Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white"
              />
            </div>

            {/* Tagline & Academic Session */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Motto / Tagline
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Advancing Islamic Jurisprudence..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Academic Year / Term
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="e.g. 2026–2027"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white"
                />
              </div>
            </div>

            {/* About */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                About / Mission Description
              </label>
              <textarea
                rows={4}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-900 focus:bg-white resize-y"
              />
            </div>

            {isAdmin && (
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-xs flex items-center gap-2 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            )}
          </form>
        </div>

        {/* Right Sidebar: Backup & Multi-Org Tools */}
        <div className="lg:col-span-4 space-y-6">
          {/* Backup Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Data Backup & Export
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Export all programs, categories, seasons, and organizers into a standalone JSON file for safety or accreditation records.
            </p>

            <button
              onClick={handleExport}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export Full Organization JSON</span>
            </button>

            {isAdmin && (
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Restore / Import Data
                </label>
                <label className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 border border-dashed border-slate-300 hover:border-emerald-600 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span>Select Backup JSON File</span>
                  <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                </label>
              </div>
            )}
          </div>

          {/* Module Notice */}
          <div className="bg-amber-50/70 p-5 rounded-3xl border border-amber-200 text-xs space-y-2 text-amber-900">
            <div className="flex items-center gap-1.5 font-bold">
              <Info className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Treasurer / Finance Notice</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              As per instructions, the Treasurer and Financial accounting modules are decoupled and will be integrated as a specialized ledger submodule in the next development cycle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
