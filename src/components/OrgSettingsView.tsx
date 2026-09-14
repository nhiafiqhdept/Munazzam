import React, { useState, useEffect } from 'react';
import {
  Building2,
  Upload,
  Trash2,
  Check,
  Save,
  Download,
  FileCode,
  LogOut,
  User,
  Image as ImageIcon,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { uploadFile, DEFAULT_ORG_LOGO } from '../utils/helpers';

interface OrgSettingsViewProps {
  onOpenNewOrgModal?: () => void;
  onOpenAdminLogin?: () => void;
}

export const OrgSettingsView: React.FC<OrgSettingsViewProps> = ({
  onOpenNewOrgModal,
  onOpenAdminLogin,
}) => {
  const {
    currentOrg,
    updateOrganization,
    exportDataAsJson,
    importDataFromJson,
    isAdmin,
    setIsAdmin,
    user,
    logoutUser,
    organizations,
    currentOrgId,
    setCurrentOrgId,
  } = useApp();

  const [name, setName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [tagline, setTagline] = useState('');
  const [about, setAbout] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [logo, setLogo] = useState('');
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
      setErrorMsg('');
      const url = await uploadFile(file);
      setLogo(url);
      
      // Auto save updated logo to current organization immediately
      if (currentOrg) {
        updateOrganization({
          id: currentOrg.id,
          name: currentOrg.name,
          college_name: currentOrg.college_name,
          tagline: currentOrg.tagline,
          about: currentOrg.about,
          academic_year: currentOrg.academic_year,
          logo: url,
        });
      }
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

      updateOrganization({
        id: currentOrg.id,
        name: name.trim(),
        college_name: collegeName.trim(),
        tagline: tagline.trim(),
        about: about.trim(),
        academic_year: academicYear.trim(),
        logo: logo,
      });

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
    <div className="space-y-6 pb-20">
      {/* Settings Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="p-2 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
            <Building2 className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">
              Settings & Preferences
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage organization profile, institutional identity, user account session, and database backups.
            </p>
          </div>
        </div>
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

                {/* Actions & Description */}
                <div className="flex-1 w-full space-y-3 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl cursor-pointer text-xs font-bold transition-all shadow-xs active:scale-[0.98]">
                      <Upload className="w-4 h-4" />
                      <span>{isUploading ? 'Uploading Logo...' : logo ? 'Replace Logo' : 'Upload Organization Logo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </label>

                    {logo && (
                      <button
                        type="button"
                        onClick={() => {
                          setLogo('');
                          if (currentOrg) {
                            updateOrganization({
                              id: currentOrg.id,
                              name: currentOrg.name,
                              college_name: currentOrg.college_name,
                              tagline: currentOrg.tagline,
                              about: currentOrg.about,
                              academic_year: currentOrg.academic_year,
                              logo: '',
                            });
                          }
                        }}
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
                  placeholder="e.g. Advancing Academic Excellence..."
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

        {/* Right Sidebar: Backup Tools */}
        <div className="lg:col-span-4 space-y-6">
          {/* Organization Switcher Card (when multiple exist) */}
          {organizations.length > 1 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Switch Organization
                </h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Switch active profile between your existing organizations.
              </p>

              <div className="space-y-2">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => setCurrentOrgId(org.id)}
                    className={`w-full p-3 text-left rounded-2xl border transition-all flex items-center gap-3 cursor-pointer ${
                      org.id === currentOrgId
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <img
                      src={org.logo || DEFAULT_ORG_LOGO}
                      alt=""
                      className="w-8 h-8 rounded-xl object-contain bg-white p-0.5 border border-slate-200 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_ORG_LOGO;
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">{org.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{org.college_name}</p>
                    </div>
                    {org.id === currentOrgId && (
                      <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Backup Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Data Backup & Export
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Export all programs, organizers, and treasury accounts into a standalone JSON backup file.
            </p>

            <button
              onClick={handleExport}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
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
        </div>
      </div>

      {/* Bottom Sign Out Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
            <User className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Signed in as {user?.username || user?.email}</p>
            <p className="text-[11px] text-slate-500">Active account session</p>
          </div>
        </div>

        <button
          onClick={logoutUser}
          className="w-full sm:w-auto px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

