import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarDays,
  Plus,
  ArrowRight,
  User,
  Mail,
  Lock,
  Phone,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  LogOut,
  Info,
  Calendar,
  Layers,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { db, cleanFirestorePayload } from '../lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { Program, SubWing } from '../types';
import bcrypt from 'bcryptjs';
import { determineProgramStatusByDate, getProgramEffectiveStatus } from '../utils/helpers';

export const SubWingProgramsPortal: React.FC = () => {
  // Read organization ID from url: ?subwing=true&portal=orgId
  const getPortalIdFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const portal = params.get('portal');
    if (portal && portal.trim()) {
      return portal.trim();
    }

    if (window.location.hash.includes('portal=')) {
      const hashParts = window.location.hash.split('portal=');
      if (hashParts.length > 1) {
        return hashParts[1].split('&')[0].trim();
      }
    }

    // Try finding any swp_ pattern in search or hash
    const match = window.location.href.match(/portal=(swp_[a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return match[1];
    }
    const matchFallback = window.location.href.match(/(swp_[a-zA-Z0-9_-]+)/);
    if (matchFallback && matchFallback[1]) {
      return matchFallback[1];
    }

    return '';
  };

  const portalId = getPortalIdFromUrl();

  const [orgName, setOrgName] = useState<string>('');
  const [orgLoading, setOrgLoading] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<'login' | 'register'>('login');

  const [resolvedAccountId, setResolvedAccountId] = useState<string>('');
  const [portalStatus, setPortalStatus] = useState<string>('active');
  const [portalExists, setPortalExists] = useState<boolean>(true);

  // Auth States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Registration States
  const [regName, setRegName] = useState('');
  const [regPresident, setRegPresident] = useState('');
  const [regContact, setRegContact] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDescription, setRegDescription] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);

  // Session State
  const [loggedInSubWing, setLoggedInSubWing] = useState<SubWing | null>(null);

  // Dashboard States
  const [submittedPrograms, setSubmittedPrograms] = useState<Program[]>([]);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [isAddProgramOpen, setIsAddProgramOpen] = useState(false);

  // Add Program Form States
  const [progName, setProgName] = useState('');
  const [progCategory, setProgCategory] = useState('');
  const [progSubCategory, setProgSubCategory] = useState('');
  const [progDate, setProgDate] = useState('');
  const [progTime, setProgTime] = useState('');
  const [progAudience, setProgAudience] = useState('');
  const [progDesc, setProgDesc] = useState('');
  const [progResourcePerson, setProgResourcePerson] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Fetch Parent Organization Details
  useEffect(() => {
    if (!portalId) {
      setOrgLoading(false);
      return;
    }

    let isMounted = true;

    const fetchOrg = async () => {
      try {
        const queryTerm = portalId.trim();
        const upperQuery = queryTerm.toUpperCase();
        let foundAccountId: string | null = null;
        let foundOrgName = '';
        let foundPortalStatus = 'active';

        // 1. Resolve portal document from sub_wing_portals collection
        try {
          const portalDoc = await getDoc(doc(db, 'sub_wing_portals', queryTerm));
          if (portalDoc.exists()) {
            const pData = portalDoc.data();
            foundPortalStatus = pData.status || 'active';
            if (pData.accountId) {
              foundAccountId = pData.accountId;
            }
          }
        } catch (e) {
          console.warn('sub_wing_portals lookup check:', e);
        }

        // 2. Direct account lookup if not resolved
        if (!foundAccountId) {
          try {
            const accDoc = await getDoc(doc(db, 'accounts', queryTerm));
            if (accDoc.exists()) {
              foundAccountId = queryTerm;
              const data = accDoc.data();
              foundOrgName = data.profile?.name || data.name || data.organizationName || '';
            }
          } catch (e) {}
        }

        // 3. Public organization directory lookup
        if (!foundAccountId) {
          try {
            const pubSnap = await getDoc(doc(db, 'public_organizations', upperQuery));
            if (pubSnap.exists()) {
              const pubData = pubSnap.data();
              foundAccountId = pubData.accountId || pubData.id || null;
              foundOrgName = pubData.name || pubData.profile?.name || '';
            }
          } catch (e) {}
        }

        // 4. Query accounts by profile.searchableName
        if (!foundAccountId) {
          try {
            const qAcc = query(collection(db, 'accounts'), where('profile.searchableName', '==', upperQuery));
            const snap = await getDocs(qAcc);
            if (!snap.empty) {
              const docSnap = snap.docs[0];
              foundAccountId = docSnap.id;
              const data = docSnap.data();
              foundOrgName = data.profile?.name || data.name || '';
            }
          } catch (e) {}
        }

        if (!isMounted) return;

        if (foundAccountId) {
          setResolvedAccountId(foundAccountId);
          setPortalExists(true);
          setPortalStatus(foundPortalStatus);

          // If org name not yet loaded, fetch the account profile
          if (!foundOrgName) {
            try {
              const orgDoc = await getDoc(doc(db, 'accounts', foundAccountId));
              if (orgDoc.exists()) {
                const data = orgDoc.data();
                foundOrgName = data.profile?.name || data.name || data.organizationName || 'Main Organization';
              }
            } catch {}
          }
          setOrgName(foundOrgName || 'Main Organization');
        } else {
          setPortalExists(false);
          setOrgName('Main Organization');
        }
      } catch (err) {
        console.error('Error fetching parent organization:', err);
        if (isMounted) {
          setOrgName('Main Organization');
        }
      } finally {
        if (isMounted) {
          setOrgLoading(false);
        }
      }
    };

    fetchOrg();

    return () => {
      isMounted = false;
    };
  }, [portalId]);

  // Handle Session persistence
  useEffect(() => {
    const saved =
      sessionStorage.getItem(`subwing_user_${portalId}`) ||
      localStorage.getItem(`subwing_user_${portalId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as SubWing;
        if (parsed && parsed.id) {
          setLoggedInSubWing(parsed);
          // Fetch fresh status from DB
          const verifyStatus = async () => {
            try {
              const swDoc = await getDoc(doc(db, 'sub_wings', parsed.id));
              if (swDoc.exists()) {
                const freshData = swDoc.data() as SubWing;
                freshData.id = swDoc.id;
                setLoggedInSubWing(freshData);
                sessionStorage.setItem(`subwing_user_${portalId}`, JSON.stringify(freshData));
                localStorage.setItem(`subwing_user_${portalId}`, JSON.stringify(freshData));
              } else {
                setLoggedInSubWing(null);
                sessionStorage.removeItem(`subwing_user_${portalId}`);
                localStorage.removeItem(`subwing_user_${portalId}`);
              }
            } catch (err) {
              console.warn('Sub-wing session refresh note:', err);
            }
          };
          verifyStatus();
        }
      } catch {
        sessionStorage.removeItem(`subwing_user_${portalId}`);
        localStorage.removeItem(`subwing_user_${portalId}`);
      }
    }
  }, [portalId]);

  // Real-time listener for Sub-Wing's own submitted programs
  useEffect(() => {
    if (!loggedInSubWing) return;

    setProgramsLoading(true);
    const targetAccountId = resolvedAccountId || portalId;
    const q = query(
      collection(db, 'programs'),
      where('accountId', '==', targetAccountId),
      where('subWingId', '==', loggedInSubWing.id)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Program[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            organization_id: targetAccountId,
            name: d.name || '',
            date: d.date || '',
            description: d.description || '',
            place: d.place || 'Sub-Wing Proposal',
            audience: d.audience || 'Members',
            poster: d.poster || '',
            media: d.media || [],
            status: getProgramEffectiveStatus({ date: d.date, status: d.status, subWingId: d.subWingId, subWingStatus: d.subWingStatus }),
            attendance_count: d.attendance_count || 0,
            created_at: d.created_at || '',
            updated_at: d.updated_at || '',
            subWingId: d.subWingId,
            subWingName: d.subWingName,
            subWingStatus: d.subWingStatus,
            submittedByEmail: d.submittedByEmail,
            submittedAt: d.submittedAt,
            resourcePerson: d.resourcePerson || '',
          });
        });
        list.sort(
          (a, b) =>
            new Date(b.submittedAt || b.created_at || b.date).getTime() -
            new Date(a.submittedAt || a.created_at || a.date).getTime()
        );
        setSubmittedPrograms(list);
        setProgramsLoading(false);
      },
      (err) => {
        console.error('Error listening to sub-wing programs:', err);
        setProgramsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [loggedInSubWing, portalId, resolvedAccountId]);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = loginEmail.trim().toLowerCase();
    const cleanPassword = loginPassword;

    if (!cleanEmail || !cleanPassword) {
      setAuthError('Please enter both your email address and password.');
      return;
    }

    setAuthError(null);
    setAuthLoading(true);

    const targetAccountId = resolvedAccountId || portalId;

    try {
      // Find sub-wing by email
      const q = query(
        collection(db, 'sub_wings'),
        where('email', '==', cleanEmail)
      );

      const querySnap = await getDocs(q);
      if (querySnap.empty) {
        setAuthError(`No sub-wing account found with email "${cleanEmail}". Please check your email or register.`);
        setAuthLoading(false);
        return;
      }

      // Match the sub-wing belonging to this parent organization
      const matchedDoc = querySnap.docs.find((docSnap) => {
        const d = docSnap.data();
        return (
          d.accountId === targetAccountId ||
          d.portalId === portalId ||
          d.portalId === targetAccountId ||
          d.accountId === portalId ||
          !d.accountId // legacy record
        );
      });

      if (!matchedDoc) {
        setAuthError(
          `This email is registered under another organization portal. Please verify you are using the link provided by ${orgName || 'your organization'}.`
        );
        setAuthLoading(false);
        return;
      }

      const swData = matchedDoc.data() as SubWing;
      swData.id = matchedDoc.id;

      // Safe password verification
      let passwordMatches = false;
      if (swData.passwordHash && typeof swData.passwordHash === 'string') {
        try {
          if (
            swData.passwordHash.startsWith('$2a$') ||
            swData.passwordHash.startsWith('$2b$') ||
            swData.passwordHash.startsWith('$2y$')
          ) {
            passwordMatches = bcrypt.compareSync(cleanPassword, swData.passwordHash);
          } else {
            passwordMatches =
              cleanPassword === swData.passwordHash || cleanPassword === (swData as any).password;
          }
        } catch {
          passwordMatches =
            cleanPassword === swData.passwordHash || cleanPassword === (swData as any).password;
        }
      } else if ((swData as any).password) {
        passwordMatches = cleanPassword === (swData as any).password;
      }

      if (!passwordMatches) {
        setAuthError('Incorrect password. Please verify your password and try again.');
        setAuthLoading(false);
        return;
      }

      if (swData.status === 'rejected') {
        setAuthError('This sub-wing account was deactivated by the organization administrator.');
        setAuthLoading(false);
        return;
      }

      // Successfully authenticated
      setRegSuccess(false);
      setLoggedInSubWing(swData);
      sessionStorage.setItem(`subwing_user_${portalId}`, JSON.stringify(swData));
      localStorage.setItem(`subwing_user_${portalId}`, JSON.stringify(swData));
    } catch (err: any) {
      console.error('Login error:', err);
      setAuthError(err?.message || 'Login failed. Please check your network connection and try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Registration handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = regName.trim();
    const cleanPresident = regPresident.trim();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanPassword = regPassword;
    const cleanContact = regContact.trim();
    const cleanDesc = regDescription.trim();

    if (!cleanName || !cleanPresident || !cleanEmail || !cleanPassword) {
      setRegError('Please fill in all required (*) fields: Name, President, Email, and Password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setRegError('Please provide a valid email address (e.g., department@domain.com).');
      return;
    }

    if (cleanPassword.length < 6) {
      setRegError('Password must be at least 6 characters long.');
      return;
    }

    setRegError(null);
    setAuthLoading(true);

    const targetAccountId = resolvedAccountId || portalId;

    try {
      // Check if email already registered in this organization
      const q = query(
        collection(db, 'sub_wings'),
        where('email', '==', cleanEmail)
      );
      const querySnap = await getDocs(q);
      const duplicateDoc = querySnap.docs.find((d) => {
        const data = d.data();
        return (
          data.accountId === targetAccountId ||
          data.portalId === portalId ||
          data.portalId === targetAccountId ||
          data.accountId === portalId
        );
      });

      if (duplicateDoc) {
        setRegError('An account with this email is already registered with this organization. Please sign in instead.');
        setAuthLoading(false);
        return;
      }

      // Hash Password using bcryptjs safely
      let hash = '';
      try {
        hash = bcrypt.hashSync(cleanPassword, 10);
      } catch {
        hash = cleanPassword;
      }

      const payload = cleanFirestorePayload({
        portalId: portalId || targetAccountId,
        accountId: targetAccountId,
        name: cleanName,
        president: cleanPresident,
        contactDetails: cleanContact,
        email: cleanEmail,
        passwordHash: hash,
        description: cleanDesc,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const docRef = await addDoc(collection(db, 'sub_wings'), payload);

      // Auto login newly registered sub-wing immediately
      const createdSubWing: SubWing = {
        id: docRef.id,
        portalId: payload.portalId,
        name: payload.name,
        president: payload.president,
        contactDetails: payload.contactDetails,
        email: payload.email,
        passwordHash: payload.passwordHash,
        description: payload.description,
        status: payload.status,
        createdAt: payload.createdAt,
      };

      setLoggedInSubWing(createdSubWing);
      sessionStorage.setItem(`subwing_user_${portalId}`, JSON.stringify(createdSubWing));
      localStorage.setItem(`subwing_user_${portalId}`, JSON.stringify(createdSubWing));

      setRegSuccess(true);
      // Reset registration form
      setRegName('');
      setRegPresident('');
      setRegContact('');
      setRegEmail('');
      setRegPassword('');
      setRegDescription('');
    } catch (err: any) {
      console.error('Registration error:', err);
      setRegError(err?.message || 'Failed to complete registration. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Submit new program
  const handleSubmitProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progName.trim() || !progDate.trim() || !progTime.trim() || !progAudience.trim()) {
      setFormError('All fields marked with * are required.');
      return;
    }

    if (!loggedInSubWing) return;

    setFormError(null);
    setFormSubmitting(true);

    try {
      const payload = cleanFirestorePayload({
        accountId: resolvedAccountId || portalId, // maps to organization's loading id
        name: progName.trim(),
        category: progCategory.trim() || undefined,
        subCategory: progSubCategory.trim() || undefined,
        date: progDate,
        time: progTime.trim(),
        place: 'Sub-Wing Proposal',
        audience: progAudience.trim(),
        description: progDesc.trim(),
        poster: '',
        media: [],
        status: determineProgramStatusByDate(progDate),
        attendance_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        subWingId: loggedInSubWing.id,
        subWingName: loggedInSubWing.name,
        subWingStatus: 'pending',
        submittedByEmail: loggedInSubWing.email,
        submittedAt: new Date().toISOString(),
        resourcePerson: progResourcePerson.trim(),
      });

      await addDoc(collection(db, 'programs'), payload);

      // Reset Form
      setProgName('');
      setProgCategory('');
      setProgSubCategory('');
      setProgDate('');
      setProgTime('');
      setProgAudience('');
      setProgDesc('');
      setProgResourcePerson('');
      setIsAddProgramOpen(false);
    } catch (err: any) {
      console.error('Error submitting program:', err);
      setFormError(err?.message || 'Failed to submit program proposal. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(`subwing_user_${portalId}`);
    localStorage.removeItem(`subwing_user_${portalId}`);
    setLoggedInSubWing(null);
    setLoginEmail('');
    setLoginPassword('');
    setAuthError(null);
    setRegSuccess(false);
  };

  // Statistics calculation
  const totalSubmitted = submittedPrograms.length;
  const totalPending = submittedPrograms.filter((p) => p.subWingStatus === 'pending').length;
  const totalApproved = submittedPrograms.filter((p) => p.subWingStatus === 'approved').length;
  const totalRejected = submittedPrograms.filter((p) => p.subWingStatus === 'rejected').length;

  if (!portalId || !portalExists) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 bg-rose-50 text-rose-700 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 font-heading">Portal Not Found</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            The sub-wing program portal link is invalid or has expired. Please check with your Main Organization Administrator.
          </p>
        </div>
      </div>
    );
  }

  if (portalStatus !== 'active') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 font-heading">Portal Unavailable</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            This Sub-Wing registration portal is currently unavailable.
          </p>
        </div>
      </div>
    );
  }

  if (orgLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Loading Sub-Wing Portal...</p>
      </div>
    );
  }

  // Render Logged-In Sub-Wing Dashboard Workspace
  if (loggedInSubWing) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Registration Success Banner */}
        {regSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 shadow-xs animate-fadeIn">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-emerald-900 leading-none">
                Registration Successful!
              </p>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Your Sub-Wing partner account has been created and you are now signed in. You can begin submitting program proposals immediately.
              </p>
            </div>
          </div>
        )}

        {/* Pending Banner */}
        {loggedInSubWing.status === 'pending' && !regSuccess && (
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-amber-900 leading-none">
                Account Status: Pending Admin Review
              </p>
              <p className="text-xs text-amber-700/90 leading-relaxed">
                Your sub-wing account is currently awaiting administrative approval from the <strong>{orgName}</strong> administrator. You can still create and submit new program proposals, view their review status, and manage your active drafts while your account review is in progress.
              </p>
            </div>
          </div>
        )}

        {/* Header Block */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100/80 shrink-0 shadow-2xs">
              <Layers className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-emerald-700" />
            </div>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-200/60 text-emerald-800 rounded-md text-[10px] font-bold tracking-tight">
                🟢 Sub-Wing Partner Portal
              </span>
              <h1 className="text-base sm:text-xl font-bold text-slate-900 font-heading leading-tight truncate mt-0.5">
                {loggedInSubWing.name}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Partner of {orgName} • President: {loggedInSubWing.president}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddProgramOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Program Proposal</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              title="Logout Portal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Statistics Widgets */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200">
            <p className="text-xs text-slate-500 font-semibold">Total Submitted</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{totalSubmitted}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200">
            <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Pending Review
            </p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{totalPending}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200">
            <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Approved
            </p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{totalApproved}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200">
            <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Rejected
            </p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{totalRejected}</p>
          </div>
        </div>

        {/* List / Modal */}
        {isAddProgramOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-lg space-y-5"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 font-heading">
                  New Program Proposal
                </h3>
                <button
                  onClick={() => setIsAddProgramOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitProgram} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">PROGRAM NAME *</label>
                  <input
                    type="text"
                    required
                    value={progName}
                    onChange={(e) => setProgName(e.target.value)}
                    placeholder="Enter program/activity name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      PROGRAM CATEGORY
                    </label>
                    <input
                      type="text"
                      value={progCategory}
                      onChange={(e) => setProgCategory(e.target.value)}
                      placeholder="e.g. Academic, Cultural, Sports..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      SUB CATEGORY
                    </label>
                    <input
                      type="text"
                      value={progSubCategory}
                      onChange={(e) => setProgSubCategory(e.target.value)}
                      placeholder="Select or enter sub category..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">PROPOSED DATE *</label>
                    <input
                      type="date"
                      required
                      value={progDate}
                      onChange={(e) => setProgDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">TIME *</label>
                    <input
                      type="time"
                      required
                      value={progTime}
                      onChange={(e) => setProgTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">TARGET AUDIENCE *</label>
                  <input
                    type="text"
                    required
                    value={progAudience}
                    onChange={(e) => setProgAudience(e.target.value)}
                    placeholder="e.g. All Students, Degree Students, Staff..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">RESOURCE PERSON / FACULTY</label>
                  <input
                    type="text"
                    value={progResourcePerson}
                    onChange={(e) => setProgResourcePerson(e.target.value)}
                    placeholder="Enter presenter, speaker, faculty, or resource person name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">DESCRIPTION</label>
                  <textarea
                    rows={4}
                    value={progDesc}
                    onChange={(e) => setProgDesc(e.target.value)}
                    placeholder="Describe program objectives, audience, and execution plan..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddProgramOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs transition-colors"
                  >
                    {formSubmitting ? 'Submitting...' : 'Submit Program'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Submitted proposals list */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-slate-400" />
            <span>My Submission History</span>
          </h2>

          {programsLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : submittedPrograms.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
              <div>
                <p className="text-sm font-bold text-slate-800">No proposals submitted yet</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-0.5">
                  Click the button in the header to submit your first program proposal to the Main Organization.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {submittedPrograms.map((prog) => (
                <div
                  key={prog.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {prog.date}
                      </span>
                      {prog.subWingStatus === 'pending' && (
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                          🟡 Pending Review
                        </span>
                      )}
                      {prog.subWingStatus === 'approved' && (
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                          🟢 Approved
                        </span>
                      )}
                      {prog.subWingStatus === 'rejected' && (
                        <span className="px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">
                          🔴 Rejected
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">{prog.name}</h3>
                    
                    {(prog.category || prog.subCategory) && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {prog.category && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-[10px] font-semibold">
                            {prog.category}
                          </span>
                        )}
                        {prog.subCategory && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            {prog.subCategory}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <div>
                        <span className="font-bold block text-slate-400 text-[9px] uppercase tracking-wider">Time</span>
                        <span className="font-semibold text-slate-800">{prog.time || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-bold block text-slate-400 text-[9px] uppercase tracking-wider">Target Audience</span>
                        <span className="font-semibold text-slate-800 truncate block" title={prog.audience}>{prog.audience || 'N/A'}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line line-clamp-3">
                      {prog.description || 'No description provided.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // PORTAL LOGIN AND REGISTRATION SCREEN
  return (
    <div className="max-w-md w-full mx-auto my-4 sm:my-8">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-8 space-y-5 sm:space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center shadow-xs">
            <CalendarDays className="w-8 h-8 text-emerald-700 stroke-[2]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold font-heading text-slate-900">
              Sub-Wing Program Portal
            </h2>
            <p className="text-xs text-slate-500">Partner: {orgName}</p>
          </div>
        </div>

        {/* View Switch */}
        {!regSuccess && (
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/60 text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveView('login');
                setAuthError(null);
                setRegError(null);
              }}
              className={`py-2 px-1 font-semibold rounded-xl text-center transition-all cursor-pointer ${
                activeView === 'login'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/40 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('register');
                setAuthError(null);
                setRegError(null);
              }}
              className={`py-2 px-1 font-semibold rounded-xl text-center transition-all cursor-pointer ${
                activeView === 'register'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/40 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Register
            </button>
          </div>
        )}

        {regSuccess ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-5 text-center space-y-4"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-slate-900">Registration Submitted!</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your sub-wing profile has been sent to the administrator. After review and approval, you can sign in to submit programs.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setRegSuccess(false);
                setActiveView('login');
              }}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Go to Sign In
            </button>
          </motion.div>
        ) : activeView === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Login Email
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="email@organization.org"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Password
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              {authLoading ? 'Signing In...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
            {regError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                Sub-Wing Name *
              </label>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="e.g. Youth Wing, Arts & Culture"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                President / Responsible Person *
              </label>
              <input
                type="text"
                required
                value={regPresident}
                onChange={(e) => setRegPresident(e.target.value)}
                placeholder="President's full name"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Contact Details
              </label>
              <input
                type="text"
                value={regContact}
                onChange={(e) => setRegContact(e.target.value)}
                placeholder="Phone number, telegram, etc."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Login Email *
              </label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="subwing@domain.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Password *
              </label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Password (minimum 6 characters)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Description
              </label>
              <textarea
                rows={3}
                value={regDescription}
                onChange={(e) => setRegDescription(e.target.value)}
                placeholder="Briefly describe the sub-wing's objective and core activities..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              {authLoading ? 'Registering...' : 'Register as Partner'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};
