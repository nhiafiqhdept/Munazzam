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

export interface SP_PortalLinkRecord {
  id: string; // mainAccountId
  mainAccountId: string;
  mainAccountEmail: string;
  organizationId: string;
  pointsPortalId: string;
  secureToken: string;
  pointsPortalSlug?: string;
  pointsPortalUrl: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'not_generated' | 'disabled';
}

export interface SP_PortalTokenRecord {
  secureToken: string;
  mainAccountId: string;
  mainAccountEmail: string;
  portalId: string;
  portalName?: string;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

export function buildPortalUrl(secureToken: string): string {
  let origin = window.location.origin;
  if (origin.includes('ais-dev-')) {
    origin = origin.replace('ais-dev-', 'ais-pre-');
  }
  return `${origin}${window.location.pathname}?suborg=true&portal=${encodeURIComponent(secureToken)}`;
}

export function extractPortalToken(): string | null {
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const portalParam = searchParams.get('portal');
    if (portalParam && portalParam.trim()) {
      return portalParam.trim();
    }

    if (window.location.pathname.includes('/points-portal/')) {
      const parts = window.location.pathname.split('/points-portal/');
      if (parts[1] && parts[1].trim()) {
        return parts[1].split('/')[0].split('?')[0].trim();
      }
    }

    if (window.location.hash.includes('portal=')) {
      const hashParts = window.location.hash.split('portal=');
      if (hashParts.length > 1) {
        return hashParts[1].split('&')[0].trim();
      }
    }

    if (window.location.hash.includes('#points-portal/')) {
      const hashParts = window.location.hash.split('#points-portal/');
      if (hashParts.length > 1) {
        return hashParts[1].split('&')[0].split('?')[0].trim();
      }
    }
  } catch (e) {
    console.warn('Error extracting portal token', e);
  }
  return null;
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

export interface SP_Member {
  id: string;
  portalId: string;
  organizationId: string;
  name: string;
  studentId?: string;
  email?: string;
  contactDetails?: string;
  role?: string;
  totalPoints: number;
  approvedAchievementsCount: number;
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
  achieverId: string;
  achieverName: string;
  achieverStudentId?: string;
  responsiblePerson?: string; // Legacy field retained for backwards-compatibility
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
  achieverId?: string;
  achieverName?: string;
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
  members: SP_Member[];
  loading: boolean;
  
  initializePortal: (name: string) => Promise<void>;
  loginPortalUser: (email: string, password: string) => Promise<boolean>;
  logoutPortalUser: () => void;
  setPortalUserDirectly: (user: PortalUser | null) => void;
  
  createClassOrganization: (org: Omit<SP_Organization, 'id' | 'portalId' | 'totalPoints' | 'createdAt' | 'updatedAt'>, loginEmail: string, loginPass: string) => Promise<void>;
  updateClassOrganization: (id: string, updates: Partial<SP_Organization>, newPass?: string) => Promise<void>;
  
  addMember: (organizationId: string, name: string, studentId?: string, contactDetails?: string) => Promise<SP_Member>;
  updateMember: (id: string, updates: Partial<SP_Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  updateAchievementAchiever: (achievementId: string, achieverId: string, achieverName: string, achieverStudentId?: string) => Promise<void>;
  recalculateLeaderboardTotals: () => Promise<void>;

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
  
  // Account-Specific Points Portal Link Management
  portalLink: SP_PortalLinkRecord | null;
  portalLinkLoading: boolean;
  portalStatus: 'active' | 'not_generated' | 'disabled' | 'invalid' | 'missing' | 'loading';
  portalErrorMessage: string | null;
  generateAccountPortalLink: () => Promise<SP_PortalLinkRecord>;
  togglePortalLinkStatus: (status: 'active' | 'disabled') => Promise<void>;
  regenerateAccountPortalLink: () => Promise<SP_PortalLinkRecord>;
}

export const DEFAULT_PORTAL_ID = 'f7e7snzA9iP7lxUvhKrvaCLBlh62';

const PortalContext = createContext<PortalContextType | undefined>(undefined);

export const PortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useApp();
  
  // Account-Specific Portal Link and Access States
  const [portalLink, setPortalLink] = useState<SP_PortalLinkRecord | null>(null);
  const [portalLinkLoading, setPortalLinkLoading] = useState<boolean>(true);
  const [portalStatus, setPortalStatus] = useState<'active' | 'not_generated' | 'disabled' | 'invalid' | 'missing' | 'loading'>('loading');
  const [portalErrorMessage, setPortalErrorMessage] = useState<string | null>(null);

  // Active portal ID resolution (isolated per account or URL token)
  const [activePortalId, setActivePortalId] = useState<string>(() => {
    if (user?.id) return user.id;
    return '';
  });

  // Master account ID is strictly the resolved activePortalId or user.id
  const masterAccountId = user?.id || activePortalId;

  // Resolve portal access and account link
  useEffect(() => {
    let isCancelled = false;

    async function resolvePortalAccess() {
      // 1. If authenticated as main Munazzam account
      if (user?.id) {
        const accountId = user.id;
        setActivePortalId(accountId);
        setPortalStatus('active');
        setPortalErrorMessage(null);
        setPortalLinkLoading(true);

        try {
          const linkSnap = await getDoc(doc(db, 'sp_portal_links', accountId));
          if (!isCancelled) {
            if (linkSnap.exists()) {
              const data = linkSnap.data() as SP_PortalLinkRecord;
              const expectedUrl = buildPortalUrl(data.secureToken);
              data.pointsPortalUrl = expectedUrl;
              setPortalLink(data);
            } else {
              // Legacy migration for original NHIA account
              if (accountId === DEFAULT_PORTAL_ID) {
                const now = new Date().toISOString();
                const secureToken = 'ptk_nhia_points_f7e7';
                const linkUrl = buildPortalUrl(secureToken);
                const initialRecord: SP_PortalLinkRecord = {
                  id: accountId,
                  mainAccountId: accountId,
                  mainAccountEmail: user.email || 'nhiafiqhdept@gmail.com',
                  organizationId: accountId,
                  pointsPortalId: accountId,
                  secureToken,
                  pointsPortalSlug: secureToken,
                  pointsPortalUrl: linkUrl,
                  createdAt: now,
                  updatedAt: now,
                  status: 'active'
                };
                await setDoc(doc(db, 'sp_portal_links', accountId), cleanFirestorePayload(initialRecord));
                await setDoc(doc(db, 'sp_portal_tokens', secureToken), cleanFirestorePayload({
                  secureToken,
                  mainAccountId: accountId,
                  mainAccountEmail: user.email || 'nhiafiqhdept@gmail.com',
                  portalId: accountId,
                  portalName: 'NSU Student Points Management',
                  status: 'active',
                  createdAt: now,
                  updatedAt: now
                }));
                await setDoc(doc(db, 'sp_portal_tokens', accountId), cleanFirestorePayload({
                  secureToken: accountId,
                  mainAccountId: accountId,
                  mainAccountEmail: user.email || 'nhiafiqhdept@gmail.com',
                  portalId: accountId,
                  portalName: 'NSU Student Points Management',
                  status: 'active',
                  createdAt: now,
                  updatedAt: now
                }));
                setPortalLink(initialRecord);
              } else {
                setPortalLink(null);
              }
            }
          }
        } catch (err: any) {
          console.warn('Error fetching sp_portal_links for account:', err);
          if (!isCancelled) setPortalLink(null);
        } finally {
          if (!isCancelled) setPortalLinkLoading(false);
        }
        return;
      }

      // 2. If unauthenticated public or sub-org visitor: check token from URL
      setPortalLinkLoading(false);
      const token = extractPortalToken();
      const params = new URLSearchParams(window.location.search);
      const regParam = params.get('reg');

      if (!token && !regParam) {
        if (!isCancelled) {
          setActivePortalId('');
          setPortalStatus('missing');
          setPortalErrorMessage('No Points Portal identifier was provided in the link.');
          setLoading(false);
        }
        return;
      }

      if (token) {
        try {
          const tokenSnap = await getDoc(doc(db, 'sp_portal_tokens', token));
          if (!isCancelled) {
            if (tokenSnap.exists()) {
              const tData = tokenSnap.data();
              if (tData.status === 'disabled') {
                setPortalStatus('disabled');
                setPortalErrorMessage('This Points Portal has been temporarily disabled by its administrator.');
                setLoading(false);
                return;
              }
              const pId = tData.portalId || tData.pointsPortalId;
              if (pId) {
                setActivePortalId(pId);
                setPortalStatus('active');
                setPortalErrorMessage(null);
              } else {
                setPortalStatus('invalid');
                setPortalErrorMessage('Points Portal configuration is invalid.');
                setLoading(false);
              }
            } else {
              // Backward compatibility: check if token directly matches a legacy portalId in sp_portals
              const portalSnap = await getDoc(doc(db, 'sp_portals', token));
              if (portalSnap.exists()) {
                setActivePortalId(token);
                setPortalStatus('active');
                setPortalErrorMessage(null);
              } else {
                setPortalStatus('invalid');
                setPortalErrorMessage('This Points Portal link is invalid, unrecognized, or has expired.');
                setLoading(false);
              }
            }
          }
        } catch (err) {
          console.warn('Error verifying portal token:', err);
          if (!isCancelled) {
            setPortalStatus('invalid');
            setPortalErrorMessage('Could not verify Points Portal token.');
            setLoading(false);
          }
        }
      } else if (regParam) {
        try {
          const regSnap = await getDoc(doc(db, 'sp_registration_links', regParam));
          if (!isCancelled && regSnap.exists() && regSnap.data().portalId) {
            setActivePortalId(regSnap.data().portalId);
            setPortalStatus('active');
            setPortalErrorMessage(null);
          } else if (!isCancelled) {
            setPortalStatus('invalid');
            setPortalErrorMessage('This registration invite link is invalid or has expired.');
            setLoading(false);
          }
        } catch (e) {
          if (!isCancelled) {
            setPortalStatus('invalid');
            setPortalErrorMessage('Could not verify registration invite.');
            setLoading(false);
          }
        }
      }
    }

    resolvePortalAccess();

    return () => {
      isCancelled = true;
    };
  }, [user?.id, user?.email]);
  
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
  const [members, setMembers] = useState<SP_Member[]>([]);
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

    const qMembers = query(collection(db, 'sp_members'), where('portalId', '==', masterAccountId));
    const unsubMembers = onSnapshot(qMembers, (snap) => {
      const list: SP_Member[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as SP_Member));
      setMembers(list.sort((a, b) => b.totalPoints - a.totalPoints));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sp_members');
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
      snap.forEach((d) => {
        const item = { id: d.id, ...d.data() } as SP_Achievement;
        // Fallback for historical/legacy records
        if (!item.achieverId || !item.achieverName) {
          item.achieverId = item.achieverId || 'unassigned';
          item.achieverName = item.achieverName || 'Achiever Not Assigned';
          item.achieverStudentId = item.achieverStudentId || '';
        }
        list.push(item);
      });
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
      unsubMembers();
      unsubTx();
      unsubComp();
      unsubAward();
      unsubAnn();
      unsubNot();
      unsubLogs();
      unsubRegs();
    };
  }, [masterAccountId, isAuthenticated, user]);

  // Achiever & Member Management Methods
  const addMember = async (organizationId: string, name: string, studentId?: string, contactDetails?: string): Promise<SP_Member> => {
    if (!masterAccountId) throw new Error('No portal master account');
    const memberId = generateId('sp_mem');
    const now = new Date().toISOString();
    const newMember: SP_Member = {
      id: memberId,
      portalId: masterAccountId,
      organizationId,
      name: name.trim(),
      studentId: (studentId || '').trim(),
      contactDetails: (contactDetails || '').trim(),
      totalPoints: 0,
      approvedAchievementsCount: 0,
      createdAt: now,
      updatedAt: now
    };
    await setDoc(doc(db, 'sp_members', memberId), cleanFirestorePayload(newMember));
    await logPortalAction('ADD_MEMBER', `Added achiever member "${newMember.name}" (${newMember.studentId || 'No ID'})`);
    return newMember;
  };

  const updateMember = async (id: string, updates: Partial<SP_Member>) => {
    if (!masterAccountId) return;
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'sp_members', id), cleanFirestorePayload({
      ...updates,
      updatedAt: now
    }));
    await logPortalAction('UPDATE_MEMBER', `Updated achiever member ID: ${id}`);
  };

  const deleteMember = async (id: string) => {
    if (!masterAccountId) return;
    await deleteDoc(doc(db, 'sp_members', id));
    await logPortalAction('DELETE_MEMBER', `Deleted member ID: ${id}`);
  };

  const updateAchievementAchiever = async (achievementId: string, achieverId: string, achieverName: string, achieverStudentId?: string) => {
    if (!masterAccountId) return;
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'sp_achievements', achievementId), cleanFirestorePayload({
      achieverId,
      achieverName,
      achieverStudentId: achieverStudentId || '',
      updatedAt: now
    }));
    // Recalculate totals across system
    await recalculateLeaderboardTotals();
    await logPortalAction('UPDATE_ACHIEVEMENT_ACHIEVER', `Assigned achiever "${achieverName}" to achievement ${achievementId}`);
  };

  const recalculateLeaderboardTotals = async () => {
    if (!masterAccountId) return;
    try {
      const now = new Date().toISOString();
      const qAchs = query(collection(db, 'sp_achievements'), where('portalId', '==', masterAccountId));
      const snapAchs = await getDocs(qAchs);
      
      const memberTotals: { [memberId: string]: { points: number; count: number } } = {};
      const orgTotals: { [orgId: string]: { points: number; count: number } } = {};

      snapAchs.forEach((d) => {
        const data = d.data() as SP_Achievement;
        if (data.status === 'Approved') {
          const pts = Number(data.awardedPoints) || 0;
          if (data.achieverId && data.achieverId !== 'unassigned') {
            if (!memberTotals[data.achieverId]) memberTotals[data.achieverId] = { points: 0, count: 0 };
            memberTotals[data.achieverId].points += pts;
            memberTotals[data.achieverId].count += 1;
          }
          if (data.organizationId) {
            if (!orgTotals[data.organizationId]) orgTotals[data.organizationId] = { points: 0, count: 0 };
            orgTotals[data.organizationId].points += pts;
            orgTotals[data.organizationId].count += 1;
          }
        }
      });

      // Update members in Firestore
      const qMembers = query(collection(db, 'sp_members'), where('portalId', '==', masterAccountId));
      const snapMembers = await getDocs(qMembers);
      for (const mDoc of snapMembers.docs) {
        const totals = memberTotals[mDoc.id] || { points: 0, count: 0 };
        await updateDoc(mDoc.ref, {
          totalPoints: totals.points,
          approvedAchievementsCount: totals.count,
          updatedAt: now
        });
      }

      // Update organizations in Firestore
      const qOrgs = query(collection(db, 'sp_organizations'), where('portalId', '==', masterAccountId));
      const snapOrgs = await getDocs(qOrgs);
      for (const oDoc of snapOrgs.docs) {
        const totals = orgTotals[oDoc.id] || { points: 0, count: 0 };
        await updateDoc(oDoc.ref, {
          totalPoints: totals.points,
          updatedAt: now
        });
      }
    } catch (e) {
      console.error('Error recalculating totals', e);
    }
  };

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
    const targetPortalId = masterAccountId || activePortalId;
    const cleanEmail = email.trim().toLowerCase();

    // Check if Admin password bypass (for simplicity and offline mode)
    if (user?.email && cleanEmail === user.email.toLowerCase() && password === '1234') {
      const admin: PortalUser = {
        id: targetPortalId || user.id,
        portalId: targetPortalId || user.id,
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

    // Verify user belongs to this active portal (if an active portal is specified)
    if (targetPortalId && userData.portalId && userData.portalId !== targetPortalId) {
      throw new Error('This account does not belong to the currently active Points Portal.');
    }

    const resolvedPortalId = userData.portalId || targetPortalId || '';
    const loggedUser: PortalUser = {
      id: userData.id,
      portalId: resolvedPortalId,
      organizationId: userData.organizationId || null,
      email: userData.email,
      role: userData.role as any,
      name: userData.name,
      status: userData.status as any,
    };

    setPortalUser(loggedUser);
    localStorage.setItem('sp_portal_user', JSON.stringify(loggedUser));
    if (userData.portalId) {
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
    const targetPortalId = masterAccountId || activePortalId;
    if (!targetPortalId) {
      throw new Error('Cannot create an organization without an active Points Portal ID.');
    }
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

    // Ensure member exists or register automatically if new achiever name is supplied
    let finalAchieverId = achievement.achieverId;
    let finalAchieverName = achievement.achieverName;
    let finalAchieverStudentId = achievement.achieverStudentId || '';

    if (!finalAchieverId || finalAchieverId === 'new') {
      if (finalAchieverName && finalAchieverName.trim()) {
        const newMember = await addMember(portalUser.organizationId, finalAchieverName, finalAchieverStudentId);
        finalAchieverId = newMember.id;
        finalAchieverName = newMember.name;
        finalAchieverStudentId = newMember.studentId || '';
      } else {
        finalAchieverId = 'unassigned';
        finalAchieverName = 'Achiever Not Assigned';
      }
    }

    const achObj: SP_Achievement = {
      ...achievement,
      achieverId: finalAchieverId,
      achieverName: finalAchieverName,
      achieverStudentId: finalAchieverStudentId,
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

    await logPortalAction('SUBMIT_ACHIEVEMENT', `Submitted achievement: "${achievement.title}" for ${finalAchieverName} with ${files.length} proofs`);

    // Notify Super Admin
    const notId = generateId('sp_not');
    await setDoc(doc(db, 'sp_notifications', notId), cleanFirestorePayload({
      id: notId,
      portalId: masterAccountId,
      title: 'New Achievement Submitted',
      message: `Organization "${portalUser.name}" submitted a new achievement for "${finalAchieverName}": "${achievement.title}". Needs point review.`,
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

    // 1. Get original achievement to fetch organization and achiever info
    const achRef = doc(db, 'sp_achievements', id);
    const achSnap = await getDoc(achRef);
    if (!achSnap.exists()) return;
    
    const ach = achSnap.data() as SP_Achievement;
    const orgId = ach.organizationId;
    const achieverId = ach.achieverId;
    const achieverName = ach.achieverName || 'Achiever';

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
        achieverId: achieverId,
        achieverName: achieverName,
        achievementId: id,
        categoryId: ach.categoryId,
        points: points,
        type: 'award',
        reason: `Approved achievement: "${ach.title}" for ${achieverName}`,
        awardedBy: portalUser.id,
        status: 'active',
        createdAt: now,
        updatedAt: now
      };
      await setDoc(doc(db, 'sp_transactions', txId), cleanFirestorePayload(txObj));

      // Recalculate member points
      if (achieverId && achieverId !== 'unassigned') {
        const memRef = doc(db, 'sp_members', achieverId);
        const memSnap = await getDoc(memRef);
        if (memSnap.exists()) {
          const memData = memSnap.data();
          await updateDoc(memRef, {
            totalPoints: (memData.totalPoints || 0) + points,
            approvedAchievementsCount: (memData.approvedAchievementsCount || 0) + 1,
            updatedAt: now
          });
        }
      }

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

    await logPortalAction('REVIEW_ACHIEVEMENT', `Reviewed achievement "${ach.title}" for ${achieverName} - Status: ${status}, Points: ${points}`);

    // Create Notification for the class org
    const notId = generateId('sp_not');
    await setDoc(doc(db, 'sp_notifications', notId), cleanFirestorePayload({
      id: notId,
      portalId: masterAccountId,
      organizationId: orgId,
      title: status === 'Approved' ? 'Achievement Approved! 🎉' : 'Achievement Status Update',
      message: status === 'Approved' 
        ? `Congratulations! Achievement "${ach.title}" for ${achieverName} has been approved. +${points} points awarded.`
        : `Achievement "${ach.title}" for ${achieverName} has been reviewed. Status: ${status}. Notes: ${notes}`,
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

    const targetPortalId = linkData.portalId || masterAccountId || activePortalId;
    if (!targetPortalId) {
      throw new Error('Could not identify the Points Portal associated with this registration link.');
    }
    const cleanEmail = loginEmail.trim().toLowerCase();

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

  // 17. Account-Specific Points Portal Link Management
  const generateAccountPortalLink = async (): Promise<SP_PortalLinkRecord> => {
    if (!user?.id) {
      throw new Error('You must be signed in to your Munazzam account to generate a Points Portal link.');
    }

    const accountId = user.id;
    const accountEmail = user.email || '';

    // Generate secure, unique token (24 hex characters)
    const array = new Uint8Array(12);
    crypto.getRandomValues(array);
    const randomHex = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
    const secureToken = `ptk_${randomHex}`;
    const publicUrl = buildPortalUrl(secureToken);
    const now = new Date().toISOString();

    const linkRecord: SP_PortalLinkRecord = {
      id: accountId,
      mainAccountId: accountId,
      mainAccountEmail: accountEmail,
      organizationId: accountId,
      pointsPortalId: accountId,
      secureToken,
      pointsPortalSlug: secureToken,
      pointsPortalUrl: publicUrl,
      createdAt: now,
      updatedAt: now,
      status: 'active'
    };

    const tokenRecord: SP_PortalTokenRecord = {
      secureToken,
      mainAccountId: accountId,
      mainAccountEmail: accountEmail,
      portalId: accountId,
      portalName: portal?.name || 'Student Points Management',
      status: 'active',
      createdAt: now,
      updatedAt: now
    };

    // 1. Write to sp_portal_links/{accountId}
    await setDoc(doc(db, 'sp_portal_links', accountId), cleanFirestorePayload(linkRecord));

    // 2. Write to sp_portal_tokens/{secureToken}
    await setDoc(doc(db, 'sp_portal_tokens', secureToken), cleanFirestorePayload(tokenRecord));

    // 3. Ensure sp_portals/{accountId} exists
    const pSnap = await getDoc(doc(db, 'sp_portals', accountId));
    if (!pSnap.exists()) {
      await setDoc(doc(db, 'sp_portals', accountId), {
        id: accountId,
        name: 'Student Points Management',
        createdAt: now,
        updatedAt: now
      });
    }

    // 4. Update accounts/{accountId}
    try {
      await updateDoc(doc(db, 'accounts', accountId), {
        pointsPortal: {
          pointsPortalId: accountId,
          secureToken,
          pointsPortalUrl: publicUrl,
          status: 'active',
          updatedAt: now
        }
      });
    } catch (e) {
      console.warn('Could not update accounts record with pointsPortal info', e);
    }

    setPortalLink(linkRecord);
    return linkRecord;
  };

  const togglePortalLinkStatus = async (newStatus: 'active' | 'disabled') => {
    if (!user?.id || !portalLink) return;
    const now = new Date().toISOString();
    const updated: SP_PortalLinkRecord = {
      ...portalLink,
      status: newStatus,
      updatedAt: now
    };

    await updateDoc(doc(db, 'sp_portal_links', user.id), {
      status: newStatus,
      updatedAt: now
    });

    if (portalLink.secureToken) {
      try {
        await updateDoc(doc(db, 'sp_portal_tokens', portalLink.secureToken), {
          status: newStatus,
          updatedAt: now
        });
      } catch (e) {
        console.warn('Could not update sp_portal_tokens status', e);
      }
    }

    try {
      await updateDoc(doc(db, 'accounts', user.id), {
        'pointsPortal.status': newStatus,
        'pointsPortal.updatedAt': now
      });
    } catch (e) {
      console.warn('Could not update accounts status', e);
    }

    setPortalLink(updated);
  };

  const regenerateAccountPortalLink = async (): Promise<SP_PortalLinkRecord> => {
    if (!user?.id) throw new Error('Must be signed in to regenerate link');
    if (portalLink?.secureToken) {
      try {
        await deleteDoc(doc(db, 'sp_portal_tokens', portalLink.secureToken));
      } catch (e) {
        console.warn('Could not delete previous token doc', e);
      }
    }
    return generateAccountPortalLink();
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
      members,
      loading,
      
      portalLink,
      portalLinkLoading,
      portalStatus,
      portalErrorMessage,
      generateAccountPortalLink,
      togglePortalLinkStatus,
      regenerateAccountPortalLink,
      
      initializePortal,
      loginPortalUser,
      logoutPortalUser,
      setPortalUserDirectly,
      
      createClassOrganization,
      updateClassOrganization,
      
      addMember,
      updateMember,
      deleteMember,
      updateAchievementAchiever,
      recalculateLeaderboardTotals,

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
