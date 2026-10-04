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
  Sparkles,
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
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { Program, SubWing } from '../types';
import bcrypt from 'bcryptjs';
import { determineProgramStatusByDate, getProgramEffectiveStatus } from '../utils/helpers';

/**
 * Bulletproof password verification helper for Sub-Wings
 * Supports bcrypt hashed passwords, plain text fallbacks, and variations
 */
function verifySubWingPassword(passwordInput: string, data: any): boolean {
  if (!passwordInput || !data) return false;
  const raw = passwordInput;
  const trimmed = passwordInput.trim();

  const hash = data.passwordHash || data.password_hash || data.hash || '';
  const plain = data.password || data.pass || data.plainPassword || '';

  // 1. Direct plain match
  if (plain && (plain === raw || plain === trimmed)) {
    return true;
  }
  if (hash && (hash === raw || hash === trimmed)) {
    return true;
  }

  // 2. Bcrypt comparison
  if (
    hash &&
    typeof hash === 'string' &&
    (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$'))
  ) {
    try {
      if (bcrypt.compareSync(raw, hash)) return true;
    } catch {}
    try {
      if (bcrypt.compareSync(trimmed, hash)) return true;
    } catch {}
  }

  return false;
}

export const SubWingProgramsPortal: React.FC = () => {
  // Read organization ID or portal slug from url
  const getPortalIdFromUrl = (): string => {
    const params = new URLSearchParams(window.location.search);

    // 1. Standard parameters
    const portal = params.get('portal');
    if (portal && portal.trim()) return portal.trim();

    const portalIdParam = params.get('portalId');
    if (portalIdParam && portalIdParam.trim()) return portalIdParam.trim();

    const subwingParam = params.get('subwing');
    if (subwingParam && subwingParam.trim() && subwingParam.trim() !== 'true') {
      return subwingParam.trim();
    }

    const org = params.get('org') || params.get('orgId') || params.get('accountId') || params.get('acc');
    if (org && org.trim()) return org.trim();

    // 2. Hash parameters
    if (window.location.hash) {
      const hash = window.location.hash;
      if (hash.includes('portal=')) {
        const parts = hash.split('portal=');
        if (parts[1]) return parts[1].split('&')[0].trim();
      }
      if (hash.includes('subwing=')) {
        const parts = hash.split('subwing=');
        if (parts[1] && parts[1].split('&')[0].trim() !== 'true') {
          return parts[1].split('&')[0].trim();
        }
      }
      if (hash.includes('org=')) {
        const parts = hash.split('org=');
        if (parts[1]) return parts[1].split('&')[0].trim();
      }
    }

    // 3. Regex matching for swp_ portal pattern
    const match = window.location.href.match(/portal=(swp_[a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];

    const matchFallback = window.location.href.match(/(swp_[a-zA-Z0-9_-]+)/);
    if (matchFallback && matchFallback[1]) return matchFallback[1];

    // 4. Stored session / local storage fallback
    const lastPortal = localStorage.getItem('subwing_last_portal') || sessionStorage.getItem('subwing_last_portal');
    if (lastPortal && lastPortal.trim()) return lastPortal.trim();

    return '';
  };

  const portalId = getPortalIdFromUrl();

  const [orgName, setOrgName] = useState<string>('Main Organization');
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
    let isMounted = true;

    const fetchOrg = async () => {
      try {
        const queryTerm = portalId ? portalId.trim() : '';
        const upperQuery = queryTerm.toUpperCase();
        let foundAccountId: string | null = null;
        let foundOrgName = '';
        let foundPortalStatus = 'active';

        if (queryTerm) {
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

          // 2. Query sub_wing_portals by accountId
          if (!foundAccountId) {
            try {
              const qPortals = query(
                collection(db, 'sub_wing_portals'),
                where('accountId', '==', queryTerm),
                limit(1)
              );
              const qPortalsSnap = await getDocs(qPortals);
              if (!qPortalsSnap.empty) {
                const pData = qPortalsSnap.docs[0].data();
                foundPortalStatus = pData.status || 'active';
                foundAccountId = pData.accountId || queryTerm;
              }
            } catch (e) {}
          }

          // 3. Direct account lookup
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

          // 4. Public organization directory lookup
          if (!foundAccountId) {
            try {
              const pubSnap = await getDoc(doc(db, 'public_organizations', upperQuery));
              if (pubSnap.exists()) {
                const pubData = pubSnap.data();
                foundAccountId = pubData.accountId || pubData.id || null;
                foundOrgName = pubData.name || pubData.profile?.name || '';
              } else {
                const pubSnapDirect = await getDoc(doc(db, 'public_organizations', queryTerm));
                if (pubSnapDirect.exists()) {
                  const pubData = pubSnapDirect.data();
                  foundAccountId = pubData.accountId || pubData.id || null;
                  foundOrgName = pubData.name || pubData.profile?.name || '';
                }
              }
            } catch (e) {}
          }

          // 5. Query accounts by profile.searchableName
          if (!foundAccountId) {
            try {
              const qAcc = query(
                collection(db, 'accounts'),
                where('profile.searchableName', '==', upperQuery),
                limit(1)
              );
              const snap = await getDocs(qAcc);
              if (!snap.empty) {
                const docSnap = snap.docs[0];
                foundAccountId = docSnap.id;
                const data = docSnap.data();
                foundOrgName = data.profile?.name || data.name || '';
              }
            } catch (e) {}
          }
        }

        // 6. Global fallback if still not resolved: load first public organization
        if (!foundAccountId) {
          try {
            const pubOrgsSnap = await getDocs(query(collection(db, 'public_organizations'), limit(1)));
            if (!pubOrgsSnap.empty) {
              const firstOrg = pubOrgsSnap.docs[0].data();
              foundAccountId = firstOrg.accountId || pubOrgsSnap.docs[0].id;
              foundOrgName = firstOrg.name || firstOrg.profile?.name || '';
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
                foundOrgName =
                  data.profile?.name || data.name || data.organizationName || 'Main Organization';
              }
            } catch {}
          }
          setOrgName(foundOrgName || 'Main Organization');
        } else {
          // Even without a specific parent org resolved yet, allow portal rendering for login/registration
          setPortalExists(true);
          setPortalStatus('active');
          setOrgName('Munazzam Organization');
        }
      } catch (err) {
        console.error('Error fetching parent organization:', err);
        if (isMounted) {
          setPortalExists(true);
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
      localStorage.getItem(`subwing_user_${portalId}`) ||
      sessionStorage.getItem('subwing_user_current') ||
      localStorage.getItem('subwing_user_current');

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
                const pKey = portalId || freshData.portalId || 'current';
                sessionStorage.setItem(`subwing_user_${pKey}`, JSON.stringify(freshData));
                localStorage.setItem(`subwing_user_${pKey}`, JSON.stringify(freshData));
                sessionStorage.setItem('subwing_user_current', JSON.stringify(freshData));
                localStorage.setItem('subwing_user_current', JSON.stringify(freshData));
              } else {
                setLoggedInSubWing(null);
                sessionStorage.removeItem(`subwing_user_${portalId}`);
                localStorage.removeItem(`subwing_user_${portalId}`);
                sessionStorage.removeItem('subwing_user_current');
                localStorage.removeItem('subwing_user_current');
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
        sessionStorage.removeItem('subwing_user_current');
        localStorage.removeItem('subwing_user_current');
      }
    }
  }, [portalId]);

  // Real-time listener for Sub-Wing's own submitted programs
  useEffect(() => {
    if (!loggedInSubWing) return;

    setProgramsLoading(true);
    const targetAccountId = resolvedAccountId || loggedInSubWing.accountId || loggedInSubWing.portalId || portalId;
    
    // Query programs submitted by this sub-wing
    const q = query(
      collection(db, 'programs'),
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
            organization_id: targetAccountId || d.accountId || '',
            name: d.name || '',
            date: d.date || '',
            description: d.description || '',
            place: d.place || 'Sub-Wing Proposal',
            audience: d.audience || 'Members',
            poster: d.poster || '',
            media: d.media || [],
            status: getProgramEffectiveStatus({
              date: d.date,
              status: d.status,
              subWingId: d.subWingId,
              subWingStatus: d.subWingStatus,
            }),
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
    const rawEmail = loginEmail.trim();
    const cleanPassword = loginPassword;

    if (!cleanEmail || !cleanPassword) {
      setAuthError('Please enter both your login email and password.');
      return;
    }

    setAuthError(null);
    setAuthLoading(true);

    const targetAccountId = resolvedAccountId || portalId;

    try {
      // 1. First attempt: Query sub_wings collection by lowercase email
      let matchedDocs: any[] = [];
      const q = query(
        collection(db, 'sub_wings'),
        where('email', '==', cleanEmail)
      );
      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        matchedDocs = querySnap.docs;
      } else if (rawEmail !== cleanEmail) {
        // 2. Second attempt: Query by exact raw email in case of case-sensitive legacy records
        const qRaw = query(
          collection(db, 'sub_wings'),
          where('email', '==', rawEmail)
        );
        const querySnapRaw = await getDocs(qRaw);
        if (!querySnapRaw.empty) {
          matchedDocs = querySnapRaw.docs;
        }
      }

      // 3. Third attempt: In-memory case-insensitive match over sub_wings if query returned empty
      if (matchedDocs.length === 0) {
        try {
          const allSnap = await getDocs(collection(db, 'sub_wings'));
          matchedDocs = allSnap.docs.filter((d) => {
            const storedEmail = (d.data().email || '').toString().trim().toLowerCase();
            return storedEmail === cleanEmail;
          });
        } catch (e) {
          console.warn('In-memory sub-wing lookup fallback:', e);
        }
      }

      if (matchedDocs.length === 0) {
        setAuthError(
          `No Sub-Wing account found registered with email "${rawEmail}". Please check your email or click "Register" below to create an account.`
        );
        setAuthLoading(false);
        return;
      }

      // Match the sub-wing belonging to this parent organization or choose the primary record
      let matchedDoc = matchedDocs.find((docSnap) => {
        const d = docSnap.data();
        return (
          d.accountId === targetAccountId ||
          d.portalId === portalId ||
          d.portalId === targetAccountId ||
          d.accountId === portalId ||
          (!targetAccountId && !portalId)
        );
      });

      if (!matchedDoc) {
        // If not matched strictly to targetAccountId but records exist for this email, accept the first valid record
        matchedDoc = matchedDocs[0];
      }

      const swData = matchedDoc.data() as SubWing;
      swData.id = matchedDoc.id;

      // Safe password verification using comprehensive helper
      const passwordMatches = verifySubWingPassword(cleanPassword, swData);

      if (!passwordMatches) {
        setAuthError('Incorrect password. Please verify your password and try again.');
        setAuthLoading(false);
        return;
      }

      if (swData.status === 'rejected') {
        setAuthError(
          'This Sub-Wing account has been deactivated by the organization administrator. Please contact your organization administrator.'
        );
        setAuthLoading(false);
        return;
      }

      // Auto-update resolved account ID and org name if not yet set
      if (swData.accountId && !resolvedAccountId) {
        setResolvedAccountId(swData.accountId);
        try {
          const accDoc = await getDoc(doc(db, 'accounts', swData.accountId));
          if (accDoc.exists()) {
            const accData = accDoc.data();
            const name =
              accData.profile?.name || accData.name || accData.organizationName || orgName;
            setOrgName(name);
          }
        } catch {}
      }

      // Successfully authenticated
      const pKey = portalId || swData.portalId || swData.accountId || 'current';
      localStorage.setItem('subwing_last_portal', pKey);
      sessionStorage.setItem(`subwing_user_${pKey}`, JSON.stringify(swData));
      localStorage.setItem(`subwing_user_${pKey}`, JSON.stringify(swData));
      sessionStorage.setItem('subwing_user_current', JSON.stringify(swData));
      localStorage.setItem('subwing_user_current', JSON.stringify(swData));

      setRegSuccess(false);
      setLoggedInSubWing(swData);
      setAuthError(null);
    } catch (err: any) {
      console.error('Login error:', err);
      setAuthError(
        err?.message || 'A network error occurred while signing in. Please check your internet connection and try again.'
      );
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
    const rawEmail = regEmail.trim();
    const cleanPassword = regPassword.trim();
    const cleanContact = regContact.trim();
    const cleanDesc = regDescription.trim();

    if (!cleanName || !cleanPresident || !cleanEmail || !cleanPassword) {
      setRegError('Please fill in all required (*) fields: Sub-Wing Name, President Name, Login Email, and Password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setRegError('Please provide a valid email address (e.g., englishwing@domain.com).');
      return;
    }

    if (cleanPassword.length < 6) {
      setRegError('Password must be at least 6 characters long.');
      return;
    }

    setRegError(null);
    setAuthLoading(true);

    let targetAccountId = resolvedAccountId || portalId;

    // If target account ID is still missing, lookup the default organization
    if (!targetAccountId) {
      try {
        const pubSnap = await getDocs(query(collection(db, 'public_organizations'), limit(1)));
        if (!pubSnap.empty) {
          targetAccountId = pubSnap.docs[0].data().accountId || pubSnap.docs[0].id;
        }
      } catch {}
    }

    try {
      // Check if email is already registered in this organization
      let isDuplicate = false;
      const q = query(
        collection(db, 'sub_wings'),
        where('email', '==', cleanEmail)
      );
      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        isDuplicate = querySnap.docs.some((d) => {
          const data = d.data();
          return (
            !targetAccountId ||
            data.accountId === targetAccountId ||
            data.portalId === portalId ||
            data.portalId === targetAccountId ||
            data.accountId === portalId
          );
        });
      }

      if (!isDuplicate && rawEmail !== cleanEmail) {
        const qRaw = query(
          collection(db, 'sub_wings'),
          where('email', '==', rawEmail)
        );
        const qRawSnap = await getDocs(qRaw);
        if (!qRawSnap.empty) {
          isDuplicate = true;
        }
      }

      if (isDuplicate) {
        setRegError('An account with this email is already registered. Please click "Sign In" to log in with your password.');
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

      const now = new Date().toISOString();
      const payload = cleanFirestorePayload({
        portalId: portalId || targetAccountId || 'portal',
        accountId: targetAccountId || 'main',
        name: cleanName,
        president: cleanPresident,
        contactDetails: cleanContact,
        email: cleanEmail,
        passwordHash: hash,
        description: cleanDesc,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      });

      const docRef = await addDoc(collection(db, 'sub_wings'), payload);

      // Auto login newly registered sub-wing immediately
      const createdSubWing: SubWing = {
        id: docRef.id,
        portalId: payload.portalId,
        accountId: payload.accountId,
        name: payload.name,
        president: payload.president,
        contactDetails: payload.contactDetails,
        email: payload.email,
        passwordHash: payload.passwordHash,
        description: payload.description,
        status: payload.status,
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
      };

      const pKey = portalId || payload.portalId || 'current';
      localStorage.setItem('subwing_last_portal', pKey);
      sessionStorage.setItem(`subwing_user_${pKey}`, JSON.stringify(createdSubWing));
      localStorage.setItem(`subwing_user_${pKey}`, JSON.stringify(createdSubWing));
      sessionStorage.setItem('subwing_user_current', JSON.stringify(createdSubWing));
      localStorage.setItem('subwing_user_current', JSON.stringify(createdSubWing));

      setLoggedInSubWing(createdSubWing);
      setRegSuccess(true);
      setRegError(null);

      // Reset registration form
      setRegName('');
      setRegPresident('');
      setRegContact('');
      setRegEmail('');
      setRegPassword('');
      setRegDescription('');
    } catch (err: any) {
      console.error('Registration error:', err);
      setRegError(
        err?.message || 'Failed to complete registration. Please check your network connection and try again.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  // Submit new program proposal
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
      const targetAccountId =
        resolvedAccountId ||
        loggedInSubWing.accountId ||
        loggedInSubWing.portalId ||
        portalId ||
        'main';

      const payload = cleanFirestorePayload({
        accountId: targetAccountId,
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
      console.error('Error submitting program proposal:', err);
      setFormError(err?.message || 'Failed to submit program proposal. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleLogout = () => {
    const pKey = portalId || loggedInSubWing?.portalId || 'current';
    sessionStorage.removeItem(`subwing_user_${pKey}`);
    localStorage.removeItem(`subwing_user_${pKey}`);
    sessionStorage.removeItem('subwing_user_current');
    localStorage.removeItem('subwing_user_current');
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

  if (portalStatus !== 'active') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 font-heading">Portal Unavailable</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            This Sub-Wing registration portal is currently paused or inactive. Please contact your organization administrator.
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
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <p className="text-xs text-slate-500 font-semibold">Total Submitted</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{totalSubmitted}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Pending Review
            </p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{totalPending}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Approved
            </p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{totalApproved}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Rejected
            </p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{totalRejected}</p>
          </div>
        </div>

        {/* Add Program Modal */}
        {isAddProgramOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Submit Program Proposal</h3>
                    <p className="text-xs text-slate-500">
                      Submit for approval by {orgName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddProgramOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  ✕
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
                  <label className="text-xs font-bold text-slate-700">PROGRAM TITLE *</label>
                  <input
                    type="text"
                    required
                    value={progName}
                    onChange={(e) => setProgName(e.target.value)}
                    placeholder="e.g. Annual Symposium on Leadership"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      CATEGORY
                    </label>
                    <input
                      type="text"
                      value={progCategory}
                      onChange={(e) => setProgCategory(e.target.value)}
                      placeholder="e.g. Workshop, Academic, Cultural"
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
                    className="flex-1 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    {formSubmitting ? 'Submitting...' : 'Submit Program Proposal'}
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
                  Click the button in the header to submit your first program proposal to {orgName}.
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
                        <span className="font-bold block text-slate-400 text-[9px] uppercase tracking-wider">
                          Time
                        </span>
                        <span className="font-semibold text-slate-800">{prog.time || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-bold block text-slate-400 text-[9px] uppercase tracking-wider">
                          Target Audience
                        </span>
                        <span className="font-semibold text-slate-800 truncate block" title={prog.audience}>
                          {prog.audience || 'N/A'}
                        </span>
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
            <p className="text-xs text-slate-500">Partner Organization: {orgName}</p>
          </div>
        </div>

        {/* View Switch */}
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

        {activeView === 'login' ? (
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
                placeholder="subwing@domain.com"
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
