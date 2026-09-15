import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  orderBy,
  limit
} from 'firebase/firestore';
import { db, cleanFirestorePayload } from '../lib/firebase';
import { useApp, OperationType, handleFirestoreError } from './AppContext';
import { generateId } from '../utils/helpers';
import bcrypt from 'bcryptjs';

// Custom Portal User Session Type
export interface PortalUser {
  id: string;
  portalId: string;
  organizationId: string | null;
  email: string;
  role: 'super_admin' | 'nsu_admin' | 'sub_org_admin' | 'viewer';
  name: string;
  status: 'active' | 'inactive';
}

export interface SP_User {
  id: string;
  portalId: string;
  organizationId: string | null;
  email: string;
  passwordHash: string;
  role: 'super_admin' | 'nsu_admin' | 'sub_org_admin' | 'viewer';
  name: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface SP_Portal {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SP_RegistrationLink {
  id: string;
  portalId: string;
  label: string;
  status: 'pending' | 'completed';
  organizationId: string | null;
  createdAt: string;
  completedAt?: string;
}

export interface SP_Organization {
  id: string;
  portalId: string;
  name: string;
  className: string;
  logo: string;
  description: string;
  leader: string;
  contactDetails: string;
  status: 'active' | 'inactive';
  totalPoints: number;
  createdAt: string;
  updatedAt: string;
}

export interface SP_Category {
  id: string;
  portalId: string;
  name: string;
  defaultPoints: number;
  createdAt: string;
  updatedAt: string;
}

export interface SP_Achievement {
  id: string;
  portalId: string;
  organizationId: string;
  title: string;
  programName: string;
  categoryId: string;
  date: string;
  place: string;
  description: string;
  participantsCount: number;
  responsiblePerson: string;
  requestedPoints: number;
  additionalNotes: string;
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Returned for Correction';
  reviewNotes: string;
  awardedPoints: number;
  reviewerId: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  baseAwardedPoints?: number;
  bonusPoints?: number;
  deductionPoints?: number;
}

export interface SP_Media {
  id: string;
  portalId: string;
  achievementId: string;
  organizationId: string;
  accountId: string;
  proofType: 'photo' | 'video' | 'document';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface SP_Transaction {
  id: string;
  portalId: string;
  organizationId: string;
  achievementId?: string;
  categoryId?: string;
  points: number;
  type: 'award' | 'bonus' | 'deduction' | 'correction';
  reason: string;
  awardedBy: string;
  status: 'active' | 'locked';
  createdAt: string;
  updatedAt: string;
}

export interface SP_Competition {
  id: string;
  portalId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'draft';
  createdAt: string;
  updatedAt: string;
}

export interface SP_Award {
  id: string;
  portalId: string;
  name: string;
  description: string;
  evaluationPeriod: string;
  winnerOrganizationId: string;
  winnerOrganizationName: string;
  awardDate: string;
  certificateUrl: string;
  notes: string;
  createdAt: string;
}

export interface SP_Announcement {
  id: string;
  portalId: string;
  title: string;
  content: string;
  publishedBy: string;
  createdAt: string;
}

export interface SP_Notification {
  id: string;
  portalId: string;
  userId?: string;
  organizationId?: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface SP_AuditLog {
  id: string;
  portalId: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  timestamp: string;
}

interface PortalContextType {
  portal: SP_Portal | null;
  portalUser: PortalUser | null;
  organizations: SP_Organization[];
  categories: SP_Category[];
  achievements: SP_Achievement[];
  mediaAttachments: SP_Media[];
  transactions: SP_Transaction[];
  competitions: SP_Competition[];
  awards: SP_Award[];
  announcements: SP_Announcement[];
  notifications: SP_Notification[];
  auditLogs: SP_AuditLog[];
  registrationLinks: SP_RegistrationLink[];
  loading: boolean;
  
  initializePortal: (name: string) => Promise<void>;
  loginPortalUser: (email: string, password: string) => Promise<boolean>;
  logoutPortalUser: () => void;
  setPortalUserDirectly: (user: PortalUser | null) => void;
  
  createClassOrganization: (org: Omit<SP_Organization, 'id' | 'portalId' | 'totalPoints' | 'createdAt' | 'updatedAt'>, loginEmail: string, loginPass: string) => Promise<void>;
  updateClassOrganization: (id: string, updates: Partial<SP_Organization>, newPass?: string) => Promise<void>;
  
  submitAchievement: (achievement: Omit<SP_Achievement, 'id' | 'portalId' | 'organizationId' | 'status' | 'awardedPoints' | 'reviewerId' | 'reviewNotes' | 'submittedAt' | 'createdAt' | 'updatedAt'>, files: { fileUrl: string; name: string; size: number; type: 'photo' | 'video' | 'document' }[]) => Promise<void>;
  updateAchievement: (id: string, updates: Partial<SP_Achievement>, filesToAppend?: { fileUrl: string; name: string; size: number; type: 'photo' | 'video' | 'document' }[], fileIdsToDelete?: string[]) => Promise<void>;
  deleteAchievement: (id: string) => Promise<void>;
  
  reviewAchievement: (
    id: string, 
    status: SP_Achievement['status'], 
    points: number, 
    notes: string, 
    baseAwardedPoints?: number, 
    bonusPoints?: number, 
    deductionPoints?: number
  ) => Promise<void>;
  
  addCategory: (name: string, defaultPoints: number) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  addCompetition: (name: string, start: string, end: string) => Promise<void>;
  completeCompetition: (id: string) => Promise<void>;
  
  addAward: (award: Omit<SP_Award, 'id' | 'portalId' | 'createdAt'>) => Promise<void>;
  addAnnouncement: (title: string, content: string) => Promise<void>;
  markNotificationsAsRead: () => Promise<void>;
  
  logPortalAction: (action: string, details: string) => Promise<void>;
  generateRegistrationLink: (label?: string) => Promise<string>;
  getRegistrationLinkStatus: (linkId: string) => Promise<{ status: 'pending' | 'completed' | 'not_found'; organizationId: string | null; label: string } | null>;
  registerSubOrganization: (linkId: string, orgData: Omit<SP_Organization, 'id' | 'portalId' | 'totalPoints' | 'createdAt' | 'updatedAt'>, loginEmail: string, loginPass: string) => Promise<void>;
}

export const DEFAULT_PORTAL_ID = 'f7e7snzA9iP7lxUvhKrvaCLBlh62';

const PortalContext = createContext<PortalContextType | undefined>(undefined);

export const PortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useApp();
  
  // A portal is tied to the master account ID (the user.id or active master portal ID)
  const [activePortalId, setActivePortalId] = useState<string>(() => {
    return user?.id || localStorage.getItem('sp_portal_id') || DEFAULT_PORTAL_ID;
  });

  useEffect(() => {
    if (user?.id) {
      setActivePortalId(user.id);
      localStorage.setItem('sp_portal_id', user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    getDoc(doc(db, 'sp_portals', 'default')).then((snap) => {
      if (snap.exists() && snap.data()?.activePortalId) {
        const pId = snap.data().activePortalId;
        if (!user?.id) {
          setActivePortalId(pId);
          localStorage.setItem('sp_portal_id', pId);
        }
      }
    }).catch((e) => console.warn('Could not fetch default portal config', e));
  }, [user?.id]);

  const masterAccountId = user?.id || activePortalId || DEFAULT_PORTAL_ID;
  
  const [portal, setPortal] = useState<SP_Portal | null>(null);
  const [portalUser, setPortalUser] = useState<PortalUser | null>(null);
  const [organizations, setOrganizations] = useState<SP_Organization[]>([]);
  const [categories, setCategories] = useState<SP_Category[]>([]);
  const [achievements, setAchievements] = useState<SP_Achievement[]>([]);
  const [mediaAttachments, setMediaAttachments] = useState<SP_Media[]>([]);
  const [transactions, setTransactions] = useState<SP_Transaction[]>([]);
  const [competitions, setCompetitions] = useState<SP_Competition[]>([]);
  const [awards, setAwards] = useState<SP_Award[]>([]);
  const [announcements, setAnnouncements] = useState<SP_Announcement[]>([]);
  const [notifications, setNotifications] = useState<SP_Notification[]>([]);
  const [auditLogs, setAuditLogs] = useState<SP_AuditLog[]>([]);
  const [registrationLinks, setRegistrationLinks] = useState<SP_RegistrationLink[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load Saved Sub-Org Admin session if present
  useEffect(() => {
    try {
      const cached = localStorage.getItem('sp_portal_user');
      if (cached) {
        setPortalUser(JSON.parse(cached));
      }
    } catch (e) {
      console.warn('Could not load cached portal user', e);
    }
  }, []);

  // Sync portal info and tables when masterAccountId is available
  useEffect(() => {
    if (!masterAccountId) {
      setPortal(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Get or listen to portal document
    const unsubPortal = onSnapshot(doc(db, 'sp_portals', masterAccountId), async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setPortal({
          id: masterAccountId,
          name: data.name || 'NSU Portal',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });

        // If logged in as master user, also set portalUser as the nsu_admin
        if (isAuthenticated) {
          const adminUser: PortalUser = {
            id: masterAccountId,
            portalId: masterAccountId,
            organizationId: null,
            email: user?.email || 'admin@nsu.edu',
            role: 'nsu_admin',
            name: 'NSU Super Admin',
            status: 'active'
          };
          setPortalUser(adminUser);
        }
      } else {
        setPortal({
          id: masterAccountId,
          name: 'NSU Student Points Management',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `sp_portals/${masterAccountId}`);
      setLoading(false);
    });

    // 2. Real-time Subscriptions for Portal Data
    const qOrgs = query(collection(db, 'sp_organizations'), where('portalId', '==', masterAccountId));
    const unsubOrgs = onSnapshot(qOrgs, (snap) => {
      const list: SP_Organization[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as SP_Organization));
      setOrganizations(list.sort((a, b) => b.totalPoints - a.totalPoints));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sp_organizations');
    });

    const qCats = query(collection(db, 'sp_categories'), where('portalId', '==', masterAccountId));
    const unsubCats = onSnapshot(qCats, (snap) => {
      const list: SP_Category[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as SP_Category));
      setCategories(list.sort((a, b) => a.name.localeCompare(b.name)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sp_categories');
    });

    const qAchs = query(collection(db, 'sp_achievements'), where('portalId', '==', masterAccountId));
    const unsubAchs = onSnapshot(qAchs, (snap) => {
      const list: SP_Achievement[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as SP_Achievement));
      setAchievements(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sp_achievements');
    });

    const qMed = query(collection(db, 'sp_media'), where('portalId', '==', masterAccountId));
    const unsubMed = onSnapshot(qMed, (snap) => {
      const list: SP_Media[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as SP_Media));
      setMediaAttachments(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sp_media');
    });

    const qTx = query(collection(db, 'sp_transactions'), where('portalId', '==', masterAccountId));
    const unsubTx = onSnapshot(qTx, (snap) => {
      const list: SP_Transaction[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as SP_Transaction));
      setTransactions(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sp_transactions');
    });

    const qComp = query(collection(db, 'sp_competitions'), where('portalId', '==', masterAccountId));
    const unsubComp = onSnapshot(qComp, (snap) => {
      const list: SP_Competition[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as SP_Competition));
      setCompetitions(list.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sp_competitions');
    });

    const qAward = query(collection(db, 'sp_awards'), where('portalId', '==', masterAccountId));
    const unsubAward = onSnapshot(qAward, (snap) => {
      const list: SP_Award[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as SP_Award));
      setAwards(list.sort((a, b) => new Date(b.awardDate).getTime() - new Date(a.awardDate).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sp_awards');
    });

    const qAnn = query(collection(db, 'sp_announcements'), where('portalId', '==', masterAccountId));
    const unsubAnn = onSnapshot(qAnn, (snap) => {
      const list: SP_Announcement[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as SP_Announcement));
      setAnnouncements(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sp_announcements');
    });

    const qNot = query(collection(db, 'sp_notifications'), where('portalId', '==', masterAccountId));
    const unsubNot = onSnapshot(qNot, (snap) => {
      const list: SP_Notification[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as SP_Notification));
      setNotifications(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sp_notifications');
    });

    const qLogs = query(collection(db, 'sp_audit_logs'), where('portalId', '==', masterAccountId));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      const list: SP_AuditLog[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as SP_AuditLog));
      setAuditLogs(list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sp_audit_logs');
    });

    const qRegs = query(collection(db, 'sp_registration_links'), where('portalId', '==', masterAccountId));
    const unsubRegs = onSnapshot(qRegs, (snap) => {
      const list: SP_RegistrationLink[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as SP_RegistrationLink));
      setRegistrationLinks(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sp_registration_links');
    });

    return () => {
      unsubPortal();
      unsubOrgs();
      unsubCats();
      unsubAchs();
      unsubMed();
      unsubTx();
      unsubComp();
      unsubAward();
      unsubAnn();
      unsubNot();
      unsubLogs();
      unsubRegs();
    };
  }, [masterAccountId, isAuthenticated, user]);

  // Logger helper
  const logPortalAction = useCallback(async (action: string, details: string) => {
    if (!masterAccountId || !portalUser) return;
    const logId = generateId('sp_log');
    const logObj: SP_AuditLog = {
      id: logId,
      portalId: masterAccountId,
      userId: portalUser.id,
      username: portalUser.name || portalUser.email,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    await setDoc(doc(db, 'sp_audit_logs', logId), cleanFirestorePayload(logObj));
  }, [masterAccountId, portalUser]);

  // 1. Initialize Portal
  const initializePortal = async (name: string) => {
    if (!masterAccountId) return;
    const now = new Date().toISOString();
    const portalObj: SP_Portal = {
      id: masterAccountId,
      name,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(db, 'sp_portals', masterAccountId), cleanFirestorePayload(portalObj));

    // Create default categories
    const defaults = [
      { name: 'Program Conducted', points: 20 },
      { name: 'Guest Lecture', points: 15 },
      { name: 'Social Impact Achievement', points: 30 },
      { name: 'Academic Achievement', points: 25 },
      { name: 'Cultural Event Winner', points: 10 },
    ];
    for (const d of defaults) {
      const catId = generateId('sp_cat');
      await setDoc(doc(db, 'sp_categories', catId), cleanFirestorePayload({
        id: catId,
        portalId: masterAccountId,
        name: d.name,
        defaultPoints: d.points,
        createdAt: now,
        updatedAt: now,
      }));
    }

    // Set portalUser as Admin
    const adminUser: PortalUser = {
      id: masterAccountId,
      portalId: masterAccountId,
      organizationId: null,
      email: user?.email || 'admin@nsu.edu',
      role: 'nsu_admin',
      name: 'Super Admin',
      status: 'active'
    };
    setPortalUser(adminUser);
    localStorage.setItem('sp_portal_user', JSON.stringify(adminUser));
    
    // Log Audit Action
    await setDoc(doc(db, 'sp_audit_logs', generateId('sp_log')), cleanFirestorePayload({
      id: generateId('sp_log'),
      portalId: masterAccountId,
      userId: masterAccountId,
      username: 'Super Admin',
      action: 'INITIALIZE_PORTAL',
      details: `Initialized Points Portal with name "${name}"`,
      timestamp: now
    }));
  };

  // 2. Portal User Authentication
  const loginPortalUser = async (email: string, password: string): Promise<boolean> => {
    const targetPortalId = masterAccountId || activePortalId || DEFAULT_PORTAL_ID;
    const cleanEmail = email.trim().toLowerCase();

    // Check if Admin password bypass (for simplicity and offline mode)
    if (user?.email && cleanEmail === user.email.toLowerCase() && password === '1234') {
      const admin: PortalUser = {
        id: targetPortalId,
        portalId: targetPortalId,
        organizationId: null,
        email: email,
        role: 'nsu_admin',
        name: 'Super Admin',
        status: 'active'
      };
      setPortalUser(admin);
      localStorage.setItem('sp_portal_user', JSON.stringify(admin));
      return true;
    }

    // Check sp_users collection (support case-insensitive match and exact match)
    let snap = await getDocs(query(collection(db, 'sp_users'), where('email', '==', cleanEmail)));
    if (snap.empty) {
      snap = await getDocs(query(collection(db, 'sp_users'), where('email', '==', email.trim())));
    }
    if (snap.empty) return false;

    const userDoc = snap.docs[0];
    const userData = userDoc.data();
    
    if (userData.status === 'inactive') {
      throw new Error('This account has been disabled.');
    }

    // Verify Password using bcrypt
    const match = bcrypt.compareSync(password, userData.passwordHash);
    if (!match) return false;

    const loggedUser: PortalUser = {
      id: userData.id,
      portalId: userData.portalId || targetPortalId,
      organizationId: userData.organizationId || null,
      email: userData.email,
      role: userData.role as any,
      name: userData.name,
      status: userData.status as any,
    };

    setPortalUser(loggedUser);
    localStorage.setItem('sp_portal_user', JSON.stringify(loggedUser));
    if (userData.portalId) {
      localStorage.setItem('sp_portal_id', userData.portalId);
      setActivePortalId(userData.portalId);
    }
    await logPortalAction('USER_LOGIN', `Logged in: ${userData.email}`).catch(() => {});
    return true;
  };

  const logoutPortalUser = () => {
    if (portalUser) {
      logPortalAction('USER_LOGOUT', `Logged out: ${portalUser.email}`).catch(() => {});
    }
    setPortalUser(null);
    localStorage.removeItem('sp_portal_user');
  };

  const setPortalUserDirectly = (user: PortalUser | null) => {
    setPortalUser(user);
    if (user) {
      localStorage.setItem('sp_portal_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('sp_portal_user');
    }
  };

  // 3. Super Admin / Direct CRUD: Create Class Org
  const createClassOrganization = async (
    org: Omit<SP_Organization, 'id' | 'portalId' | 'totalPoints' | 'createdAt' | 'updatedAt'>,
    loginEmail: string,
    loginPass: string
  ) => {
    const targetPortalId = masterAccountId || activePortalId || DEFAULT_PORTAL_ID;
    const cleanEmail = loginEmail.trim().toLowerCase();

    // Check if email already registered in sp_users
    let existingCheck = await getDocs(query(collection(db, 'sp_users'), where('email', '==', cleanEmail)));
    if (existingCheck.empty) {
      existingCheck = await getDocs(query(collection(db, 'sp_users'), where('email', '==', loginEmail.trim())));
    }
    if (!existingCheck.empty) {
      throw new Error(`An account with email "${loginEmail}" already exists. Please choose a different email or log in.`);
    }

    const orgId = generateId('sp_org');
    const now = new Date().toISOString();

    const orgObj: SP_Organization = {
      id: orgId,
      portalId: targetPortalId,
      totalPoints: 0,
      createdAt: now,
      updatedAt: now,
      ...org
    };

    // Save Organization
    await setDoc(doc(db, 'sp_organizations', orgId), cleanFirestorePayload(orgObj));

    // Hash Password for User Account
    const passwordHash = bcrypt.hashSync(loginPass, 10);
    const userId = generateId('sp_usr');

    const userObj: SP_User = {
      id: userId,
      portalId: targetPortalId,
      organizationId: orgId,
      email: cleanEmail,
      passwordHash,
      role: 'sub_org_admin',
      name: org.name,
      status: 'active',
      createdAt: now,
      updatedAt: now
    };

    // Save User Credentials
    await setDoc(doc(db, 'sp_users', userId), cleanFirestorePayload(userObj));

    // Create a Welcome Notification for them
    const notId = generateId('sp_not');
    await setDoc(doc(db, 'sp_notifications', notId), cleanFirestorePayload({
      id: notId,
      portalId: targetPortalId,
      organizationId: orgId,
      title: 'Welcome to Points Portal!',
      message: `Your class organization "${org.name}" has been successfully added. Start submitting achievements to earn points!`,
      isRead: false,
      createdAt: now
    }));

    // Optimistically update local organizations state so UI updates immediately
    setOrganizations(prev => {
      if (prev.some(o => o.id === orgId)) return prev;
      return [...prev, orgObj];
    });

    // Log Action
    await logPortalAction('CREATE_ORGANIZATION', `Created class organization "${org.name}" with login "${cleanEmail}"`).catch(() => {});
  };

  // 4. Update Class Org details or password
  const updateClassOrganization = async (id: string, updates: Partial<SP_Organization>, newPass?: string) => {
    if (!masterAccountId) return;
    const now = new Date().toISOString();

    await updateDoc(doc(db, 'sp_organizations', id), cleanFirestorePayload({
      ...updates,
      updatedAt: now
    }));

    if (newPass) {
      // Find the user for this org
      const q = query(collection(db, 'sp_users'), where('portalId', '==', masterAccountId), where('organizationId', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const userId = snap.docs[0].id;
        const passwordHash = bcrypt.hashSync(newPass, 10);
        await updateDoc(doc(db, 'sp_users', userId), cleanFirestorePayload({
          passwordHash,
          updatedAt: now
        }));
      }
    }

    await logPortalAction('UPDATE_ORGANIZATION', `Updated details for organization: ${updates.name || id}`);
  };

  // 5. Sub Org Admin Submit Achievement
  const submitAchievement = async (
    achievement: Omit<SP_Achievement, 'id' | 'portalId' | 'organizationId' | 'status' | 'awardedPoints' | 'reviewerId' | 'reviewNotes' | 'submittedAt' | 'createdAt' | 'updatedAt'>,
    files: { fileUrl: string; name: string; size: number; type: 'photo' | 'video' | 'document' }[]
  ) => {
    if (!masterAccountId || !portalUser || !portalUser.organizationId) return;

    const achId = generateId('sp_ach');
    const now = new Date().toISOString();

    const achObj: SP_Achievement = {
      ...achievement,
      id: achId,
      portalId: masterAccountId,
      organizationId: portalUser.organizationId,
      status: 'Submitted',
      awardedPoints: 0,
      reviewerId: '',
      reviewNotes: '',
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    // Save Achievement Submission
    await setDoc(doc(db, 'sp_achievements', achId), cleanFirestorePayload(achObj));

    // Save Media attachments
    for (const f of files) {
      const medId = generateId('sp_med');
      const medObj: SP_Media = {
        id: medId,
        portalId: masterAccountId,
        achievementId: achId,
        organizationId: portalUser.organizationId,
        accountId: portalUser.id,
        proofType: f.type,
        fileName: f.name,
        fileUrl: f.fileUrl,
        fileSize: f.size,
        mimeType: f.type === 'photo' ? 'image/*' : f.type === 'video' ? 'video/*' : 'application/pdf',
        uploadedAt: now
      };
      await setDoc(doc(db, 'sp_media', medId), cleanFirestorePayload(medObj));
    }

    await logPortalAction('SUBMIT_ACHIEVEMENT', `Submitted achievement: "${achievement.title}" with ${files.length} proofs`);

    // Notify Super Admin
    const notId = generateId('sp_not');
    await setDoc(doc(db, 'sp_notifications', notId), cleanFirestorePayload({
      id: notId,
      portalId: masterAccountId,
      title: 'New Achievement Submitted',
      message: `Organization "${portalUser.name}" submitted a new achievement: "${achievement.title}". Needs point review.`,
      isRead: false,
      createdAt: now
    }));
  };

  // 6. Update Achievement (Edit pending/Draft, upload more media, delete specific media)
  const updateAchievement = async (
    id: string, 
    updates: Partial<SP_Achievement>,
    filesToAppend?: { fileUrl: string; name: string; size: number; type: 'photo' | 'video' | 'document' }[],
    fileIdsToDelete?: string[]
  ) => {
    if (!masterAccountId || !portalUser) return;
    const now = new Date().toISOString();

    // Update main fields
    await updateDoc(doc(db, 'sp_achievements', id), cleanFirestorePayload({
      ...updates,
      updatedAt: now
    }));

    // Handle deletions
    if (fileIdsToDelete && fileIdsToDelete.length > 0) {
      for (const fId of fileIdsToDelete) {
        await deleteDoc(doc(db, 'sp_media', fId));
      }
    }

    // Handle appends
    if (filesToAppend && filesToAppend.length > 0) {
      for (const f of filesToAppend) {
        const medId = generateId('sp_med');
        const medObj: SP_Media = {
          id: medId,
          portalId: masterAccountId,
          achievementId: id,
          organizationId: portalUser.organizationId || '',
          accountId: portalUser.id,
          proofType: f.type,
          fileName: f.name,
          fileUrl: f.fileUrl,
          fileSize: f.size,
          mimeType: f.type === 'photo' ? 'image/*' : f.type === 'video' ? 'video/*' : 'application/pdf',
          uploadedAt: now
        };
        await setDoc(doc(db, 'sp_media', medId), cleanFirestorePayload(medObj));
      }
    }

    await logPortalAction('UPDATE_ACHIEVEMENT', `Edited achievement id: ${id}`);
  };

  // 7. Delete Achievement (DRAFTS or returned only)
  const deleteAchievement = async (id: string) => {
    if (!masterAccountId) return;
    
    // Delete Achievement Doc
    await deleteDoc(doc(db, 'sp_achievements', id));

    // Delete associated Media
    const q = query(collection(db, 'sp_media'), where('achievementId', '==', id));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      await deleteDoc(doc(db, 'sp_media', d.id));
    }

    await logPortalAction('DELETE_ACHIEVEMENT', `Deleted achievement and associated media of ID: ${id}`);
  };

  // 8. Super Admin Point Award / Reject / Correction Review
  const reviewAchievement = async (
    id: string, 
    status: SP_Achievement['status'], 
    points: number, 
    notes: string,
    baseAwardedPoints?: number,
    bonusPoints?: number,
    deductionPoints?: number
  ) => {
    if (!masterAccountId || !portalUser) return;
    const now = new Date().toISOString();

    // 1. Get original achievement to fetch organization info
    const achRef = doc(db, 'sp_achievements', id);
    const achSnap = await getDoc(achRef);
    if (!achSnap.exists()) return;
    
    const ach = achSnap.data() as SP_Achievement;
    const orgId = ach.organizationId;

    // 2. Update Achievement Status and awarded points
    await updateDoc(achRef, cleanFirestorePayload({
      status,
      awardedPoints: status === 'Approved' ? points : 0,
      reviewerId: portalUser.id,
      reviewNotes: notes,
      baseAwardedPoints: baseAwardedPoints !== undefined ? baseAwardedPoints : null,
      bonusPoints: bonusPoints !== undefined ? bonusPoints : null,
      deductionPoints: deductionPoints !== undefined ? deductionPoints : null,
      updatedAt: now
    }));

    // 3. Handle Point Transaction
    if (status === 'Approved') {
      const txId = generateId('sp_tx');
      const txObj: SP_Transaction = {
        id: txId,
        portalId: masterAccountId,
        organizationId: orgId,
        achievementId: id,
        categoryId: ach.categoryId,
        points: points,
        type: 'award',
        reason: `Approved achievement: "${ach.title}"`,
        awardedBy: portalUser.id,
        status: 'active',
        createdAt: now,
        updatedAt: now
      };
      await setDoc(doc(db, 'sp_transactions', txId), cleanFirestorePayload(txObj));

      // Recalculate and update the organization's total points in real-time
      const orgRef = doc(db, 'sp_organizations', orgId);
      const orgSnap = await getDoc(orgRef);
      if (orgSnap.exists()) {
        const orgData = orgSnap.data();
        const currentTotal = orgData.totalPoints || 0;
        await updateDoc(orgRef, {
          totalPoints: currentTotal + points,
          updatedAt: now
        });
      }
    }

    await logPortalAction('REVIEW_ACHIEVEMENT', `Reviewed achievement "${ach.title}" - Status: ${status}, Points: ${points}`);

    // Create Notification for the class org
    const notId = generateId('sp_not');
    await setDoc(doc(db, 'sp_notifications', notId), cleanFirestorePayload({
      id: notId,
      portalId: masterAccountId,
      organizationId: orgId,
      title: status === 'Approved' ? 'Achievement Approved! 🎉' : 'Achievement Status Update',
      message: status === 'Approved' 
        ? `Congratulations! Your achievement "${ach.title}" has been approved. +${points} points awarded.`
        : `Your achievement "${ach.title}" has been reviewed. Status: ${status}. Notes: ${notes}`,
      isRead: false,
      createdAt: now
    }));
  };

  // 9. Categories Management
  const addCategory = async (name: string, defaultPoints: number) => {
    if (!masterAccountId) return;
    const catId = generateId('sp_cat');
    const now = new Date().toISOString();

    await setDoc(doc(db, 'sp_categories', catId), cleanFirestorePayload({
      id: catId,
      portalId: masterAccountId,
      name,
      defaultPoints,
      createdAt: now,
      updatedAt: now
    }));

    await logPortalAction('ADD_CATEGORY', `Added point category: "${name}" with default ${defaultPoints} points`);
  };

  const deleteCategory = async (id: string) => {
    if (!masterAccountId) return;
    await deleteDoc(doc(db, 'sp_categories', id));
    await logPortalAction('DELETE_CATEGORY', `Deleted category ID: ${id}`);
  };

  // 10. Competitions / Evaluations
  const addCompetition = async (name: string, start: string, end: string) => {
    if (!masterAccountId) return;
    const compId = generateId('sp_comp');
    const now = new Date().toISOString();

    await setDoc(doc(db, 'sp_competitions', compId), cleanFirestorePayload({
      id: compId,
      portalId: masterAccountId,
      name,
      startDate: start,
      endDate: end,
      status: 'active',
      createdAt: now,
      updatedAt: now
    }));

    await logPortalAction('ADD_COMPETITION', `Started new evaluation period: "${name}" (${start} to ${end})`);
  };

  const completeCompetition = async (id: string) => {
    if (!masterAccountId) return;
    const now = new Date().toISOString();

    await updateDoc(doc(db, 'sp_competitions', id), cleanFirestorePayload({
      status: 'completed',
      updatedAt: now
    }));

    await logPortalAction('COMPLETE_COMPETITION', `Concluded evaluation period ID: ${id}`);
  };

  // 11. Awards
  const addAward = async (award: Omit<SP_Award, 'id' | 'portalId' | 'createdAt'>) => {
    if (!masterAccountId) return;
    const awardId = generateId('sp_award');
    const now = new Date().toISOString();

    await setDoc(doc(db, 'sp_awards', awardId), cleanFirestorePayload({
      id: awardId,
      portalId: masterAccountId,
      createdAt: now,
      ...award
    }));

    await logPortalAction('AWARD_ORGANIZATION', `Conferred award "${award.name}" to ${award.winnerOrganizationName}`);

    // Create alert for Winner Org
    const notId = generateId('sp_not');
    await setDoc(doc(db, 'sp_notifications', notId), cleanFirestorePayload({
      id: notId,
      portalId: masterAccountId,
      organizationId: award.winnerOrganizationId,
      title: 'Award Conferred! 🏆',
      message: `Outstanding! Your class organization has won the award: "${award.name}". "${award.description}"`,
      isRead: false,
      createdAt: now
    }));
  };

  // 12. Announcements
  const addAnnouncement = async (title: string, content: string) => {
    if (!masterAccountId) return;
    const annId = generateId('sp_ann');
    const now = new Date().toISOString();

    await setDoc(doc(db, 'sp_announcements', annId), cleanFirestorePayload({
      id: annId,
      portalId: masterAccountId,
      title,
      content,
      publishedBy: 'NSU Super Admin',
      createdAt: now
    }));

    await logPortalAction('ADD_ANNOUNCEMENT', `Published announcement: "${title}"`);

    // Create system notification for all sub-organizations
    const notId = generateId('sp_not');
    await setDoc(doc(db, 'sp_notifications', notId), cleanFirestorePayload({
      id: notId,
      portalId: masterAccountId,
      title: `Announcement: ${title}`,
      message: content.length > 100 ? `${content.substring(0, 97)}...` : content,
      isRead: false,
      createdAt: now
    }));
  };

  // 14. Registration Link Helper: Generate
  const generateRegistrationLink = async (label?: string): Promise<string> => {
    if (!masterAccountId) throw new Error('Portal not loaded');
    const linkId = generateId('reg');
    const now = new Date().toISOString();
    
    const linkObj: SP_RegistrationLink = {
      id: linkId,
      portalId: masterAccountId,
      label: label || `Sub-Org Registration Slot #${registrationLinks.length + 1}`,
      status: 'pending',
      organizationId: null,
      createdAt: now
    };
    
    await setDoc(doc(db, 'sp_registration_links', linkId), cleanFirestorePayload(linkObj));
    await logPortalAction('GENERATE_REG_LINK', `Generated new sub-organization registration link with ID: ${linkId}`);
    return linkId;
  };

  // 15. Registration Link Helper: Status Lookup
  const getRegistrationLinkStatus = async (linkId: string): Promise<{ status: 'pending' | 'completed' | 'not_found'; organizationId: string | null; label: string } | null> => {
    if (!masterAccountId) return null;
    try {
      const snap = await getDoc(doc(db, 'sp_registration_links', linkId));
      if (!snap.exists()) {
        return { status: 'not_found', organizationId: null, label: '' };
      }
      const data = snap.data();
      return {
        status: data.status,
        organizationId: data.organizationId || null,
        label: data.label || ''
      };
    } catch (e) {
      console.error('Error fetching registration link status', e);
      return null;
    }
  };

  // 16. Registration Link Helper: Register Sub-Organization
  const registerSubOrganization = async (
    linkId: string, 
    orgData: Omit<SP_Organization, 'id' | 'portalId' | 'totalPoints' | 'createdAt' | 'updatedAt'>, 
    loginEmail: string, 
    loginPass: string
  ) => {
    const targetPortalId = masterAccountId || activePortalId || DEFAULT_PORTAL_ID;
    const cleanEmail = loginEmail.trim().toLowerCase();
    
    // Check if the link exists and is not used
    const linkRef = doc(db, 'sp_registration_links', linkId);
    const linkSnap = await getDoc(linkRef);
    if (!linkSnap.exists()) {
      throw new Error('This registration link is invalid or has expired.');
    }
    const linkData = linkSnap.data() as SP_RegistrationLink;
    if (linkData.status === 'completed') {
      throw new Error('This registration link has already been used to register an organization.');
    }

    // Check if email already registered in sp_users
    let emailCheckSnap = await getDocs(query(collection(db, 'sp_users'), where('email', '==', cleanEmail)));
    if (emailCheckSnap.empty) {
      emailCheckSnap = await getDocs(query(collection(db, 'sp_users'), where('email', '==', loginEmail.trim())));
    }
    if (!emailCheckSnap.empty) {
      throw new Error('An account with this email address is already registered.');
    }

    const orgId = generateId('sp_org');
    const now = new Date().toISOString();

    const orgObj: SP_Organization = {
      id: orgId,
      portalId: targetPortalId,
      totalPoints: 0,
      createdAt: now,
      updatedAt: now,
      ...orgData
    };

    // Save Organization
    await setDoc(doc(db, 'sp_organizations', orgId), cleanFirestorePayload(orgObj));

    // Hash Password for User Account
    const passwordHash = bcrypt.hashSync(loginPass, 10);
    const userId = generateId('sp_usr');

    const userObj: SP_User = {
      id: userId,
      portalId: targetPortalId,
      organizationId: orgId,
      email: cleanEmail,
      passwordHash,
      role: 'sub_org_admin',
      name: orgData.name,
      status: 'active',
      createdAt: now,
      updatedAt: now
    };

    // Save User Credentials
    await setDoc(doc(db, 'sp_users', userId), cleanFirestorePayload(userObj));

    // Connect link to organization
    await updateDoc(linkRef, {
      status: 'completed',
      organizationId: orgId,
      completedAt: now
    });

    // Create a Welcome Notification for them
    const notId = generateId('sp_not');
    await setDoc(doc(db, 'sp_notifications', notId), cleanFirestorePayload({
      id: notId,
      portalId: targetPortalId,
      organizationId: orgId,
      title: 'Welcome to Points Portal!',
      message: `Your class organization "${orgData.name}" has been successfully added via shared registration link. Start submitting achievements to earn points!`,
      isRead: false,
      createdAt: now
    }));

    // Optimistically update local organizations state so UI updates immediately
    setOrganizations(prev => {
      if (prev.some(o => o.id === orgId)) return prev;
      return [...prev, orgObj];
    });

    // Log Action as SYSTEM/INVITED
    await setDoc(doc(db, 'sp_audit_logs', generateId('sp_log')), cleanFirestorePayload({
      id: generateId('sp_log'),
      portalId: targetPortalId,
      userId: userId,
      username: cleanEmail,
      action: 'REGISTER_ORGANIZATION',
      details: `Registered class organization "${orgData.name}" (Class: ${orgData.className}) via invite link ID: ${linkId}`,
      timestamp: now
    })).catch(() => {});
  };

  // 13. Clear Notifications
  const markNotificationsAsRead = async () => {
    if (!masterAccountId) return;
    
    // Filter unread notifications in our local state
    const unread = notifications.filter((n) => !n.isRead);
    for (const n of unread) {
      await updateDoc(doc(db, 'sp_notifications', n.id), { isRead: true });
    }
  };

  return (
    <PortalContext.Provider value={{
      portal,
      portalUser,
      organizations,
      categories,
      achievements,
      mediaAttachments,
      transactions,
      competitions,
      awards,
      announcements,
      notifications,
      auditLogs,
      registrationLinks,
      loading,
      
      initializePortal,
      loginPortalUser,
      logoutPortalUser,
      setPortalUserDirectly,
      
      createClassOrganization,
      updateClassOrganization,
      
      submitAchievement,
      updateAchievement,
      deleteAchievement,
      reviewAchievement,
      
      addCategory,
      deleteCategory,
      
      addCompetition,
      completeCompetition,
      
      addAward,
      addAnnouncement,
      markNotificationsAsRead,
      logPortalAction,
      generateRegistrationLink,
      getRegistrationLinkStatus,
      registerSubOrganization
    }}>
      {children}
    </PortalContext.Provider>
  );
};

export const usePortal = () => {
  const context = useContext(PortalContext);
  if (context === undefined) {
    throw new Error('usePortal must be used within a PortalProvider');
  }
  return context;
};
