import React, { useState, useEffect } from 'react';
import { Building2, Search, Calendar, Users, Award, FileText, LogOut, ArrowLeft, Shield } from 'lucide-react';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Organization, Program, Organizer } from '../types';

interface PublicOrganizationViewProps {
  searchableName: string;
}

export const PublicOrganizationView: React.FC<PublicOrganizationViewProps> = ({ searchableName }) => {
  const [org, setOrg] = useState<Organization | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'programs' | 'organizers'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        setLoading(true);
        setError('');
        const queryTerm = searchableName.trim().toUpperCase();
        let foundOrg: Organization | null = null;
        let foundOrgId = '';

        // 1. Check public_organizations directory first
        try {
          const pubDocSnap = await getDoc(doc(db, 'public_organizations', queryTerm));
          if (pubDocSnap.exists()) {
            const pData = pubDocSnap.data();
            foundOrgId = pData.accountId || '';
            foundOrg = {
              id: foundOrgId,
              name: pData.name || 'Organization',
              college_name: pData.college_name || 'Main Campus',
              logo: pData.logo || '',
              tagline: pData.tagline || '',
              established_year: pData.established_year || '',
              description: pData.description || '',
              email: pData.email || '',
              website: pData.website || '',
              about: pData.about || '',
              academic_year: pData.academic_year || '',
              searchableName: queryTerm,
              created_at: pData.createdAt || pData.created_at || '',
              updated_at: pData.updatedAt || pData.updated_at || '',
            };
          }
        } catch (e) {
          console.warn('public_organizations fetch failed:', e);
        }

        // 2. Fallback to accounts collection scan
        if (!foundOrg) {
          try {
            const querySnapshot = await getDocs(collection(db, 'accounts'));
            for (const docSnap of querySnapshot.docs) {
              const accData = docSnap.data();
              const profile = accData.profile || {};
              const sName = (profile.searchableName || '').trim().toUpperCase();
              if (sName === queryTerm) {
                foundOrgId = docSnap.id;
                foundOrg = {
                  id: docSnap.id,
                  name: profile.name || 'Organization',
                  college_name: profile.college_name || 'Main Campus',
                  logo: profile.logo || '',
                  tagline: profile.tagline || '',
                  established_year: profile.established_year || '',
                  description: profile.description || '',
                  email: profile.email || accData.email || '',
                  website: profile.website || '',
                  about: profile.about || '',
                  academic_year: profile.academic_year || '',
                  searchableName: sName,
                  created_at: accData.createdAt || '',
                  updated_at: accData.updatedAt || '',
                };
                break;
              }
            }
          } catch (e) {
            console.warn('accounts fetch failed:', e);
          }
        }

        if (!foundOrg || !foundOrgId) {
          setError('Organization not found in Public View.');
          setLoading(false);
          return;
        }

        setOrg(foundOrg);

        // Fetch programs for this organization (supports both accountId and organization_id)
        const progList: Program[] = [];
        try {
          const progQuery = query(collection(db, 'programs'), where('accountId', '==', foundOrgId));
          const progSnap = await getDocs(progQuery);
          progSnap.forEach((d) => {
            progList.push({ id: d.id, ...d.data() } as Program);
          });
          if (progList.length === 0) {
            const fallbackQuery = query(collection(db, 'programs'), where('organization_id', '==', foundOrgId));
            const fallbackSnap = await getDocs(fallbackQuery);
            fallbackSnap.forEach((d) => {
              progList.push({ id: d.id, ...d.data() } as Program);
            });
          }
        } catch (pErr) {
          console.warn('Error fetching public programs:', pErr);
        }
        setPrograms(progList.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()));

        // Fetch organizers for this organization (supports both accountId and organization_id)
        const orgList: Organizer[] = [];
        try {
          const orgQuery = query(collection(db, 'organizers'), where('accountId', '==', foundOrgId));
          const orgSnap = await getDocs(orgQuery);
          orgSnap.forEach((d) => {
            orgList.push({ id: d.id, ...d.data() } as Organizer);
          });
          if (orgList.length === 0) {
            const fallbackQuery = query(collection(db, 'organizers'), where('organization_id', '==', foundOrgId));
            const fallbackSnap = await getDocs(fallbackQuery);
            fallbackSnap.forEach((d) => {
              orgList.push({ id: d.id, ...d.data() } as Organizer);
            });
          }
        } catch (oErr) {
          console.warn('Error fetching public organizers:', oErr);
        }
        setOrganizers(orgList.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));

      } catch (err) {
        console.error('Error loading public organization data:', err);
        setError('Failed to load public organization data.');
      } finally {
        setLoading(false);
      }
    };

    if (searchableName) {
      fetchPublicData();
    }
  }, [searchableName]);

  const handleReturnToLogin = () => {
    window.location.hash = '';
    window.location.search = '';
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-950 p-2.5 border border-emerald-500/35 shadow-2xl flex items-center justify-center">
            <img src="/icon-192x192.png" alt="Munazzam" className="w-full h-full object-contain rounded-xl" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold font-heading text-white tracking-tight">Public View</h2>
            <p className="text-xs text-slate-400">Loading organization records...</p>
          </div>
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mt-2" />
        </div>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl mx-auto flex items-center justify-center border border-rose-100">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Organization Not Found</h2>
          <p className="text-xs text-slate-500">{error || 'The requested organization could not be found.'}</p>
          <button
            onClick={handleReturnToLogin}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Sign In</span>
          </button>
        </div>
      </div>
    );
  }

  const filteredPrograms = programs.filter((p) =>
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.place || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* PUBLIC VIEW BANNER */}
      <div className="bg-emerald-800 text-white px-4 py-2 text-xs font-bold flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-emerald-700 rounded text-[10px] uppercase tracking-wider font-extrabold border border-emerald-600">
            Public View
          </span>
          <span className="truncate">Browsing read-only records for <strong>{org.name}</strong> ({org.searchableName})</span>
        </div>
        <button
          onClick={handleReturnToLogin}
          className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit to Login</span>
        </button>
      </div>

      {/* Hero / Org Profile Header */}
      <div className="bg-white border-b border-slate-200 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-slate-100 border border-slate-200 p-3 shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
            {org.logo ? (
              <img src={org.logo} alt={org.name} className="w-full h-full object-contain" />
            ) : (
              <Building2 className="w-12 h-12 text-slate-400" />
            )}
          </div>
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 rounded-md text-xs font-bold border border-emerald-200">
                {org.searchableName}
              </span>
              <span className="text-xs text-slate-500 font-medium">{org.college_name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 tracking-tight">
              {org.name}
            </h1>
            {org.tagline && (
              <p className="text-sm font-medium text-emerald-700 italic">"{org.tagline}"</p>
            )}
            {org.about && (
              <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed mt-2">
                {org.about}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Overview & Stats
          </button>
          <button
            onClick={() => setActiveTab('programs')}
            className={`py-4 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'programs'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Programs & Activities ({programs.length})
          </button>
          <button
            onClick={() => setActiveTab('organizers')}
            className={`py-4 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'organizers'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Organizers & Faculty ({organizers.length})
          </button>
        </div>
      </div>

      {/* Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center font-bold">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Programs</span>
                  <h3 className="text-2xl font-bold text-slate-900 font-heading">{programs.length}</h3>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-50 text-purple-700 rounded-2xl flex items-center justify-center font-bold">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Organizers</span>
                  <h3 className="text-2xl font-bold text-slate-900 font-heading">{organizers.length}</h3>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center font-bold">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Academic Term</span>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">{org.academic_year || 'Current Term'}</h3>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Institution Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block font-semibold text-xs mb-1">Organization Name</span>
                  <span className="font-bold text-slate-800">{org.name}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block font-semibold text-xs mb-1">College / Institution</span>
                  <span className="font-bold text-slate-800">{org.college_name}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block font-semibold text-xs mb-1">Searchable Code</span>
                  <span className="font-bold text-slate-800">{org.searchableName}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block font-semibold text-xs mb-1">Contact Email</span>
                  <span className="font-bold text-slate-800">{org.email || 'Not provided'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'programs' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-slate-900 font-heading">Public Programs & Activities</h2>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search programs..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {filteredPrograms.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-700">No programs found</p>
                <p className="text-xs text-slate-400 mt-1">This organization has not published any matching programs yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPrograms.map((prog) => (
                  <div key={prog.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 rounded-md text-[10px] font-bold uppercase tracking-wider">
                        {prog.category || 'General'}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">{prog.date}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 font-heading line-clamp-2">{prog.name}</h3>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{prog.description}</p>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>📍 {prog.place}</span>
                      {prog.attendance_count && <span>👥 {prog.attendance_count} attendees</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'organizers' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 font-heading">Organizers & Faculty Committee</h2>
            {organizers.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-700">No organizers listed</p>
                <p className="text-xs text-slate-400 mt-1">No organizers have been added for this organization yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {organizers.map((orgMember) => (
                  <div key={orgMember.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {orgMember.photo ? (
                        <img src={orgMember.photo} alt={orgMember.name} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{orgMember.name}</h3>
                      <p className="text-xs font-semibold text-emerald-700 mt-0.5">{orgMember.position}</p>
                      {orgMember.bio && <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{orgMember.bio}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} {org.name} &bull; Powered by Munazzam Public View
      </footer>
    </div>
  );
};
