import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
  writeBatch,
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
  submissionsAllowed?: boolean;
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
  shortCode?: string;
  className: string;
  logo: string;
  description: string;
  leader: string;
  contactDetails: string;
  status: 'active' | 'inactive' | 'pending' | 'rejected';
  totalPoints: number;
  createdAt: string;
  updatedAt: string;
}

export interface SP_Category {
  id: string;
  portalId: string;
  name: string;
  defaultPoints: number;
  isRankBased?: boolean;
  rank1Points?: number;
  rank2Points?: number;
  rank3Points?: number;
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
  organizationName?: string;
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
  evaluationPeriodId?: string;
  evaluationPeriod?: string;
  rank?: '1st' | '2nd' | '3rd';
  rankBasedPoints?: boolean;
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
  type?: string;
  name?: string;
  size?: number;
  url?: string;
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
  evaluationPeriodId?: string;
  evaluationPeriod?: string;
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
  concludedAt?: string;
  conclusionDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AwardWinner {
  position: 1 | 2 | 3;
  organizationId?: string;
  organizationName?: string;
  achieverId?: string;
  studentId?: string;
  achieverName?: string;
  name?: string;
}

export interface SP_Award {
  id: string;
  portalId: string;
  name: string;
  description: string;
  evaluationPeriodId?: string;
  evaluationPeriod?: string;
  organizationId?: string;
  points?: number;
  recipientType?: 'class_organization' | 'individual';
  winnerOrganizationId?: string;
  winnerOrganizationName?: string;
  winners?: AwardWinner[];
  awardDate: string;
  certificateUrl?: string;
  notes?: string;
  createdAt: string;
}

/**
 * Robust helper to resolve an achievement's evaluation period ID.
 * Matches explicit evaluationPeriodId, period name, or dates against evaluation periods.
 */
export function getAchievementPeriodId(achievement: SP_Achievement, comps: SP_Competition[]): string | null {
  if (achievement.evaluationPeriodId) return achievement.evaluationPeriodId;
  if (achievement.evaluationPeriod) {
    const matched = comps.find(c => c.id === achievement.evaluationPeriod || c.name.toLowerCase().trim() === achievement.evaluationPeriod?.toLowerCase().trim());
    if (matched) return matched.id;
  }
  // Date range fallback
  const achDateStr = achievement.date || achievement.createdAt || achievement.submittedAt;
  if (achDateStr && comps.length > 0) {
    const achTime = new Date(achDateStr).getTime();
    if (!isNaN(achTime)) {
      const match = comps.find(c => {
        const startTime = new Date(c.startDate).getTime();
        const endTime = new Date(c.endDate).getTime();
        if (!isNaN(startTime) && !isNaN(endTime)) {
          return achTime >= startTime && achTime <= endTime + (24 * 60 * 60 * 1000);
        }
        return false;
      });
      if (match) return match.id;
    }
  }
  return null;
}

/**
 * Robust helper to resolve an award's evaluation period ID.
 */
export function getAwardPeriodId(award: SP_Award, comps: SP_Competition[]): string | null {
  if (award.evaluationPeriodId) return award.evaluationPeriodId;
  if (award.evaluationPeriod) {
    const matched = comps.find(c => c.id === award.evaluationPeriod || c.name.toLowerCase().trim() === award.evaluationPeriod?.toLowerCase().trim());
    if (matched) return matched.id;
  }
  if (award.awardDate && comps.length > 0) {
    const awardTime = new Date(award.awardDate).getTime();
    if (!isNaN(awardTime)) {
      const match = comps.find(c => {
        const startTime = new Date(c.startDate).getTime();
        const endTime = new Date(c.endDate).getTime();
        if (!isNaN(startTime) && !isNaN(endTime)) {
          return awardTime >= startTime && awardTime <= endTime + (24 * 60 * 60 * 1000);
        }
        return false;
      });
      if (match) return match.id;
    }
  }
  return null;
}

export function getAwardWinners(award: SP_Award): AwardWinner[] {
  if (award.winners && Array.isArray(award.winners) && award.winners.length > 0) {
    return [...award.winners].sort((a, b) => a.position - b.position);
  }
  if (award.winnerOrganizationId && award.winnerOrganizationName) {
    return [{
      position: 1,
      organizationId: award.winnerOrganizationId,
      organizationName: award.winnerOrganizationName,
      name: award.winnerOrganizationName
    }];
  }
  return [];
}

export function getWinnerDisplayName(winner: AwardWinner): string {
  return winner.achieverName || winner.name || winner.organizationName || 'Unknown Recipient';
}

export function getWinnerSubtext(winner: AwardWinner): string {
  const parts: string[] = [];
  if (winner.studentId) {
    parts.push(`ID: ${winner.studentId}`);
  }
  if (winner.organizationName && (winner.achieverName || winner.name)) {
    parts.push(winner.organizationName);
  }
  return parts.join(' · ');
}

export interface SP_Announcement {
  id: string;
  portalId: string;
  organizationId?: string;
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
  metadata?: Record<string, any>;
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

export interface SP_Rejection {
  id: string;
  portalId: string;
  organizationId: string;
  organizationName: string;
  userEmail: string;
  userId?: string;
  status: 'rejected';
  title: string;
  message: string;
  rejectedAt: string;
}

export interface RejectionInfo {
  isRejected: boolean;
  organizationName: string;
  title: string;
  message: string;
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
  rejections: SP_Rejection[];
  rejectionInfo: RejectionInfo | null;
  loading: boolean;
  
  clearRejectionInfo: () => void;
  toggleSubmissionsAllowed: (allowed: boolean) => Promise<void>;
  initializePortal: (name: string) => Promise<void>;
  loginPortalUser: (email: string, password: string) => Promise<boolean>;
  logoutPortalUser: () => void;
  setPortalUserDirectly: (user: PortalUser | null) => void;
  
  createClassOrganization: (org: Omit<SP_Organization, 'id' | 'portalId' | 'totalPoints' | 'createdAt' | 'updatedAt'>, loginEmail: string, loginPass: string) => Promise<void>;
  updateClassOrganization: (id: string, updates: Partial<SP_Organization>, newPass?: string) => Promise<void>;
  deleteClassOrganization: (id: string) => Promise<void>;
  rejectClassOrganization: (id: string, reason?: string) => Promise<void>;
  approveClassOrganization: (id: string) => Promise<void>;
  
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
  
  addCategory: (
    name: string,
    defaultPoints: number,
    isRankBased?: boolean,
    rank1Points?: number,
    rank2Points?: number,
    rank3Points?: number
  ) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  addCompetition: (name: string, start: string, end: string) => Promise<void>;
  updateCompetition: (id: string, name: string, start: string, end: string) => Promise<void>;
  completeCompetition: (id: string) => Promise<void>;
  
  addAward: (award: Omit<SP_Award, 'id' | 'portalId' | 'createdAt'>) => Promise<void>;
  updateAward: (awardId: string, updates: Partial<Omit<SP_Award, 'id' | 'portalId' | 'createdAt'>>) => Promise<void>;
  deleteAward: (awardId: string) => Promise<void>;
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

  // Portal user session (NSU Admin or Sub-Org Admin)
  const [portalUser, setPortalUser] = useState<PortalUser | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sp_portal_user');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });

  // Active portal ID resolution (isolated per account or URL token or cached sub-org user)
  const [activePortalId, setActivePortalId] = useState<string>(() => {
    if (user?.id) return user.id;
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sp_portal_user');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.portalId) return parsed.portalId;
        }
      } catch {}
    }
    return '';
  });

  // Master account ID is strictly the resolved activePortalId or user.id or portalUser's parent portalId
  const masterAccountId = user?.id || activePortalId || portalUser?.portalId || (typeof window !== 'undefined' ? (() => {
    try {
      const c = localStorage.getItem('sp_portal_user');
      return c ? JSON.parse(c).portalId : '';
    } catch { return ''; }
  })() : '');

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

      // 2. If unauthenticated public or sub-org visitor: check token from URL or existing portalUser session
      setPortalLinkLoading(false);
      const token = extractPortalToken();
      const params = new URLSearchParams(window.location.search);
      const regParam = params.get('reg');

      if (!token && !regParam) {
        let savedPortalId = portalUser?.portalId;
        if (!savedPortalId && typeof window !== 'undefined') {
          try {
            const cached = localStorage.getItem('sp_portal_user');
            if (cached) {
              const p = JSON.parse(cached);
              savedPortalId = p?.portalId;
            }
          } catch {}
        }

        if (savedPortalId) {
          if (!isCancelled) {
            setActivePortalId(savedPortalId);
            setPortalStatus('active');
            setPortalErrorMessage(null);
            setLoading(false);
          }
          return;
        }

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
  
  const [portal, setPortal] = useState<SP_Portal | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedUser = localStorage.getItem('sp_portal_user');
        const pId = user?.id || (cachedUser ? JSON.parse(cachedUser).portalId : '');
        if (pId) {
          const cachedSub = localStorage.getItem(`sp_submissions_allowed_${pId}`);
          if (cachedSub !== null) {
            return {
              id: pId,
              name: 'Student Points Management',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              submissionsAllowed: cachedSub !== 'false',
            };
          }
        }
      } catch {}
    }
    return null;
  });
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
  const [rejections, setRejections] = useState<SP_Rejection[]>([]);
  const [rejectionInfo, setRejectionInfo] = useState<RejectionInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const clearRejectionInfo = () => {
    setRejectionInfo(null);
    logoutPortalUser();
  };

  // Load Saved Sub-Org Admin session if present
  useEffect(() => {
    try {
      const cached = localStorage.getItem('sp_portal_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        setPortalUser(parsed);
        if (parsed?.portalId) {
          setActivePortalId(prev => prev || parsed.portalId);
          setPortalStatus('active');
          setPortalErrorMessage(null);
        }
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
        const allowed = data.submissionsAllowed !== false;
        try {
          localStorage.setItem(`sp_submissions_allowed_${masterAccountId}`, String(allowed));
        } catch {}
        setPortal({
          id: masterAccountId,
          name: data.name || 'NSU Portal',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          submissionsAllowed: allowed,
        });

        // If logged in as master user, set portalUser as nsu_admin ONLY if not explicitly logged out and no sub-org user cached
        const isExplicitLoggedOut = sessionStorage.getItem('sp_explicit_logout') === 'true';
        const hasCachedSubOrgUser = !!localStorage.getItem('sp_portal_user');

        if (isAuthenticated && !isExplicitLoggedOut && !hasCachedSubOrgUser) {
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
        const now = new Date().toISOString();
        const allowed = true;
        try {
          localStorage.setItem(`sp_submissions_allowed_${masterAccountId}`, 'true');
        } catch {}
        setPortal({
          id: masterAccountId,
          name: 'NSU Student Points Management',
          createdAt: now,
          updatedAt: now,
          submissionsAllowed: allowed,
        });
        if (user?.id && user.id === masterAccountId) {
          setDoc(doc(db, 'sp_portals', masterAccountId), cleanFirestorePayload({
            id: masterAccountId,
            name: 'NSU Student Points Management',
            submissionsAllowed: true,
            createdAt: now,
            updatedAt: now
          }), { merge: true }).catch(() => {});
        }
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `sp_portals/${masterAccountId}`);
      setLoading(false);
    });

    // 2. Real-time Subscriptions for Portal Data & Organization Isolation
    const isSubOrg = portalUser?.role === 'sub_org_admin' && portalUser?.organizationId;
    const orgConstraint = isSubOrg ? [where('organizationId', '==', portalUser.organizationId)] : [];

    // Rejections snapshot listener & security enforcer
    const qRej = query(collection(db, 'sp_rejections'), where('portalId', '==', masterAccountId));
    const unsubRej = onSnapshot(qRej, (snap) => {
      const list: SP_Rejection[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as SP_Rejection));
      setRejections(list);

      // Security Check: If current session belongs to a rejected org/user, revoke access immediately
      if (portalUser) {
        const matchingRej = list.find(r =>
          (portalUser.organizationId && r.organizationId === portalUser.organizationId) ||
          (portalUser.email && r.userEmail && r.userEmail.toLowerCase() === portalUser.email.toLowerCase())
        );
        if (matchingRej) {
          setPortalUser(null);
          localStorage.removeItem('sp_portal_user');
          sessionStorage.clear();
          setRejectionInfo({
            isRejected: true,
            organizationName: matchingRej.organizationName,
            title: matchingRej.title || 'Admin Rejected Your Class Organization',
            message: matchingRej.message || `Your class organization '${matchingRej.organizationName}' has been rejected by the administrator.\n\nPlease contact the administrator if you believe this was a mistake.`
          });
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sp_rejections');
    });

    const qOrgs = query(collection(db, 'sp_organizations'), where('portalId', '==', masterAccountId));
    const unsubOrgs = onSnapshot(qOrgs, (snap) => {
      const list: SP_Organization[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as SP_Organization));
      setOrganizations(list.sort((a, b) => b.totalPoints - a.totalPoints));

      if (portalUser?.organizationId) {
        const currentOrg = list.find(o => o.id === portalUser.organizationId);
        if (currentOrg && (currentOrg.status as string) === 'rejected') {
          setPortalUser(null);
          localStorage.removeItem('sp_portal_user');
          sessionStorage.clear();
          setRejectionInfo({
            isRejected: true,
            organizationName: currentOrg.name || 'Organization',
            title: 'Admin Rejected Your Class Organization',
            message: `Your class organization '${currentOrg.name}' has been rejected by the administrator.\n\nPlease contact the administrator if you believe this was a mistake.`
          });
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sp_organizations');
    });

    const qMembers = query(collection(db, 'sp_members'), where('portalId', '==', masterAccountId), ...orgConstraint);
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

    const qAchs = query(collection(db, 'sp_achievements'), where('portalId', '==', masterAccountId), ...orgConstraint);
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

    const qMed = query(collection(db, 'sp_media'), where('portalId', '==', masterAccountId), ...orgConstraint);
    const unsubMed = onSnapshot(qMed, (snap) => {
      const list: SP_Media[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as SP_Media));
      setMediaAttachments(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sp_media');
    });

    const qTx = query(collection(db, 'sp_transactions'), where('portalId', '==', masterAccountId), ...orgConstraint);
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

    // Auto-reconcile totals once masterAccountId is connected (throttled to once per 5 minutes per session)
    if (masterAccountId) {
      const lastReconcileKey = `sp_last_reconcile_${masterAccountId}`;
      const lastReconcile = sessionStorage.getItem(lastReconcileKey);
      const nowTime = Date.now();
      if (!lastReconcile || nowTime - Number(lastReconcile) > 300000) {
        sessionStorage.setItem(lastReconcileKey, String(nowTime));
        recalculateLeaderboardTotals().catch((err) => console.warn('Auto reconciliation error', err));
      }
    }

    return () => {
      unsubPortal();
      unsubOrgs();
      unsubRej();
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
  }, [masterAccountId, isAuthenticated, user?.id, portalUser?.role, portalUser?.organizationId, portalUser?.email]);

  // Auto-reconciliation routine to purge existing orphaned/rejected organization records from Firestore
  useEffect(() => {
    if (!masterAccountId) return;
    if (organizations.length === 0 && members.length === 0) return;

    const activeOrgIds = new Set(
      organizations
        .filter(o => o.status === 'active' || (o.status as string) === 'approved')
        .map(o => o.id)
    );

    const rejectedOrgIds = new Set(
      organizations
        .filter(o => (o.status as string) === 'rejected')
        .map(o => o.id)
    );

    // Collect rejections table entries
    rejections.forEach(r => {
      if (r.organizationId) rejectedOrgIds.add(r.organizationId);
    });

    // Identify members belonging to rejected or deleted/non-existent organizations
    const orphanedMembers = members.filter(m => {
      if (!m.organizationId) return true;
      const isRejected = rejectedOrgIds.has(m.organizationId);
      const isApproved = activeOrgIds.has(m.organizationId);
      return isRejected || !isApproved;
    });

    if (orphanedMembers.length > 0) {
      const invalidOrgIds = Array.from(new Set(
        members
          .filter(m => !activeOrgIds.has(m.organizationId))
          .map(m => m.organizationId)
          .filter(Boolean)
      ));

      if (invalidOrgIds.length > 0) {
        (async () => {
          const scopedCollections = [
            'sp_members',
            'sp_achievements',
            'sp_media',
            'sp_transactions',
            'sp_notifications',
            'sp_announcements',
            'sp_registration_links',
            'sp_users',
            'sp_categories',
            'sp_competitions'
          ];

          const refsToDelete: any[] = [];

          for (const orgId of invalidOrgIds) {
            for (const colName of scopedCollections) {
              try {
                const q = query(collection(db, colName), where('organizationId', '==', orgId));
                const snap = await getDocs(q);
                snap.docs.forEach(d => {
                  if (!refsToDelete.some(r => r.path === d.ref.path)) {
                    refsToDelete.push(d.ref);
                  }
                });
              } catch (err) {
                console.warn(`Error querying ${colName} for orphaned org ${orgId}:`, err);
              }
            }
          }

          if (refsToDelete.length > 0) {
            const CHUNK_SIZE = 400;
            for (let i = 0; i < refsToDelete.length; i += CHUNK_SIZE) {
              const chunk = refsToDelete.slice(i, i + CHUNK_SIZE);
              const batch = writeBatch(db);
              chunk.forEach(ref => batch.delete(ref));
              await batch.commit().catch(e => console.warn('Error purging orphaned records:', e));
            }
          }

          const invalidSet = new Set(invalidOrgIds);
          setMembers(prev => prev.filter(m => !invalidSet.has(m.organizationId)));
          setAchievements(prev => prev.filter(a => !invalidSet.has(a.organizationId)));
          setTransactions(prev => prev.filter(t => !invalidSet.has(t.organizationId)));
          setMediaAttachments(prev => prev.filter(m => !invalidSet.has(m.organizationId)));
        })();
      }
    }
  }, [masterAccountId, organizations, members, rejections]);

  // Compute active members belonging ONLY to active/approved class organizations
  const activeMembers = useMemo(() => {
    const activeOrgIds = new Set(
      organizations
        .filter(o => o.status === 'active' || (o.status as string) === 'approved')
        .map(o => o.id)
    );

    return members.filter(m => activeOrgIds.has(m.organizationId));
  }, [members, organizations]);

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
      const approvedAchs: SP_Achievement[] = [];
      const approvedAchMap: { [achId: string]: SP_Achievement } = {};

      snapAchs.forEach((d) => {
        const data = { id: d.id, ...d.data() } as SP_Achievement;
        if (data.status === 'Approved') {
          const pts = Number(data.awardedPoints) || 0;
          approvedAchs.push(data);
          approvedAchMap[data.id] = data;

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

      // Synchronize transactions with approved achievements
      const qTx = query(collection(db, 'sp_transactions'), where('portalId', '==', masterAccountId));
      const snapTx = await getDocs(qTx);
      const txByAchId: { [achId: string]: string[] } = {};

      for (const tDoc of snapTx.docs) {
        const tData = tDoc.data() as SP_Transaction;
        const achId = tData.achievementId;
        if (!achId || !approvedAchMap[achId]) {
          // If transaction has no valid approved achievement, remove it
          await deleteDoc(tDoc.ref);
        } else {
          if (!txByAchId[achId]) {
            txByAchId[achId] = [];
          }
          txByAchId[achId].push(tDoc.id);

          const matchingAch = approvedAchMap[achId];
          const expectedPts = Number(matchingAch.awardedPoints) || 0;
          // If there are duplicate transactions for the same achievement, keep only the first one
          if (txByAchId[achId].length > 1) {
            await deleteDoc(tDoc.ref);
          } else if (tData.points !== expectedPts || tData.status !== 'active') {
            await updateDoc(tDoc.ref, cleanFirestorePayload({
              points: expectedPts,
              status: 'active',
              organizationId: matchingAch.organizationId || '',
              achieverId: matchingAch.achieverId || 'unassigned',
              achieverName: matchingAch.achieverName || 'Achiever',
              updatedAt: now
            }));
          }
        }
      }

      // If an approved achievement has awardedPoints > 0 and no transaction, create one
      for (const ach of approvedAchs) {
        const pts = Number(ach.awardedPoints) || 0;
        if (pts > 0 && (!txByAchId[ach.id] || txByAchId[ach.id].length === 0)) {
          const txId = generateId('sp_tx');
          const txObj: SP_Transaction = {
            id: txId,
            portalId: masterAccountId,
            organizationId: ach.organizationId,
            achieverId: ach.achieverId || 'unassigned',
            achieverName: ach.achieverName || 'Achiever',
            achievementId: ach.id,
            categoryId: ach.categoryId,
            points: pts,
            type: 'award',
            reason: `Approved achievement: "${ach.title}" for ${ach.achieverName || 'Achiever'}`,
            awardedBy: portalUser?.id || 'admin',
            status: 'active',
            createdAt: ach.updatedAt || now,
            updatedAt: now
          };
          await setDoc(doc(db, 'sp_transactions', txId), cleanFirestorePayload(txObj));
        }
      }

      // Update members in Firestore
      const qMembers = query(collection(db, 'sp_members'), where('portalId', '==', masterAccountId));
      const snapMembers = await getDocs(qMembers);
      for (const mDoc of snapMembers.docs) {
        const totals = memberTotals[mDoc.id] || { points: 0, count: 0 };
        const currentData = mDoc.data();
        if (currentData.totalPoints !== totals.points || currentData.approvedAchievementsCount !== totals.count) {
          await updateDoc(mDoc.ref, cleanFirestorePayload({
            totalPoints: totals.points,
            approvedAchievementsCount: totals.count,
            updatedAt: now
          }));
        }
      }

      // Update organizations in Firestore
      const qOrgs = query(collection(db, 'sp_organizations'), where('portalId', '==', masterAccountId));
      const snapOrgs = await getDocs(qOrgs);
      for (const oDoc of snapOrgs.docs) {
        const totals = orgTotals[oDoc.id] || { points: 0, count: 0 };
        const currentData = oDoc.data();
        if (currentData.totalPoints !== totals.points) {
          await updateDoc(oDoc.ref, cleanFirestorePayload({
            totalPoints: totals.points,
            updatedAt: now
          }));
        }
      }
    } catch (e: any) {
      if (e?.message?.includes('Quota exceeded') || e?.code === 'resource-exhausted') {
        console.warn('Firestore free tier quota limit reached for recalculating totals. Skipping reconciliation until limits reset.');
      } else {
        console.error('Error recalculating totals', e);
      }
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

  // Helper to check if current session has Admin authorization
  const isAdminAuthorized = useCallback(() => {
    if (user?.id && masterAccountId && user.id === masterAccountId) return true;
    if (portalUser?.role === 'super_admin' || portalUser?.role === 'nsu_admin') return true;
    return false;
  }, [user?.id, masterAccountId, portalUser?.role]);

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

    // Check if account/email or org has been rejected for this portal
    try {
      const qRej = query(
        collection(db, 'sp_rejections'), 
        where('portalId', '==', targetPortalId), 
        where('userEmail', '==', cleanEmail)
      );
      const rejSnap = await getDocs(qRej);
      if (!rejSnap.empty) {
        const rejData = rejSnap.docs[0].data();
        setPortalUser(null);
        localStorage.removeItem('sp_portal_user');
        sessionStorage.clear();
        setRejectionInfo({
          isRejected: true,
          organizationName: rejData.organizationName || 'Class Organization',
          title: rejData.title || 'Admin Rejected Your Class Organization',
          message: rejData.message || `Your class organization '${rejData.organizationName}' has been rejected by the administrator.\n\nPlease contact the administrator if you believe this was a mistake.`
        });
        return false;
      }
    } catch (e) {
      console.warn('Error checking rejection record on login:', e);
    }

    // Check sp_users collection scoped to targetPortalId
    let snap = targetPortalId 
      ? await getDocs(query(collection(db, 'sp_users'), where('portalId', '==', targetPortalId), where('email', '==', cleanEmail)))
      : await getDocs(query(collection(db, 'sp_users'), where('email', '==', cleanEmail)));

    if (snap.empty && targetPortalId) {
      snap = await getDocs(query(collection(db, 'sp_users'), where('portalId', '==', targetPortalId), where('email', '==', email.trim())));
    }

    if (snap.empty) {
      // Fallback for legacy users without portalId or when targetPortalId isn't fully initialized
      const globalSnap = await getDocs(query(collection(db, 'sp_users'), where('email', '==', cleanEmail)));
      if (!globalSnap.empty) {
        const validDoc = globalSnap.docs.find(d => {
          const dat = d.data();
          return !targetPortalId || !dat.portalId || dat.portalId === targetPortalId;
        });
        if (validDoc) {
          const userData = validDoc.data();
          if (userData.status === 'inactive') {
            throw new Error('This account has been disabled.');
          }
          const match = bcrypt.compareSync(password, userData.passwordHash);
          if (!match) return false;

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
          try {
            sessionStorage.removeItem('sp_explicit_logout');
          } catch {}
          if (userData.portalId) {
            setActivePortalId(userData.portalId);
          }
          await logPortalAction('USER_LOGIN', `Logged in: ${userData.email}`).catch(() => {});
          return true;
        }
      }
      return false;
    }

    const userDoc = snap.docs[0];
    const userData = userDoc.data();
    
    if (userData.status === 'inactive') {
      throw new Error('This account has been disabled.');
    }

    if (userData.organizationId) {
      try {
        const qRejOrg = query(
          collection(db, 'sp_rejections'), 
          where('portalId', '==', targetPortalId), 
          where('organizationId', '==', userData.organizationId)
        );
        const rejOrgSnap = await getDocs(qRejOrg);
        if (!rejOrgSnap.empty) {
          const rejData = rejOrgSnap.docs[0].data();
          setPortalUser(null);
          localStorage.removeItem('sp_portal_user');
          sessionStorage.clear();
          setRejectionInfo({
            isRejected: true,
            organizationName: rejData.organizationName || 'Class Organization',
            title: rejData.title || 'Admin Rejected Your Class Organization',
            message: rejData.message || `Your class organization '${rejData.organizationName}' has been rejected by the administrator.\n\nPlease contact the administrator if you believe this was a mistake.`
          });
          return false;
        }
      } catch (e) {
        console.warn('Error checking org rejection on login:', e);
      }
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
    try {
      sessionStorage.removeItem('sp_explicit_logout');
    } catch {}
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
    try {
      localStorage.removeItem('sp_portal_user');
      sessionStorage.removeItem('sp_portal_user');
      sessionStorage.setItem('sp_explicit_logout', 'true');
    } catch (e) {
      console.warn('Error clearing session on logout:', e);
    }
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

    // Check if email already registered in sp_users for this portal
    let existingCheck = await getDocs(query(collection(db, 'sp_users'), where('portalId', '==', targetPortalId), where('email', '==', cleanEmail)));
    if (existingCheck.empty) {
      existingCheck = await getDocs(query(collection(db, 'sp_users'), where('portalId', '==', targetPortalId), where('email', '==', loginEmail.trim())));
    }
    if (!existingCheck.empty) {
      throw new Error(`An account with email "${loginEmail}" already exists in this organization. Please choose a different email or log in.`);
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

    // If pending, notify admin
    if (orgObj.status === 'pending') {
      const adminNotId = generateId('sp_not');
      const adminNotDoc = {
        id: adminNotId,
        portalId: targetPortalId,
        organizationId: 'master_admin',
        title: 'New Class Organization Pending Approval',
        message: `${org.name} has registered and is waiting for confirmation.`,
        isRead: false,
        createdAt: now,
        metadata: {
          type: 'pending_organization',
          orgId: orgId,
          orgName: org.name,
          leader: org.leader || '',
          className: org.className || '',
          registeredAt: now
        }
      };
      await setDoc(doc(db, 'sp_notifications', adminNotId), cleanFirestorePayload(adminNotDoc)).catch(() => {});
      setNotifications(prev => [adminNotDoc as any, ...prev]);
    }

    // Optimistically update local organizations state so UI updates immediately
    setOrganizations(prev => {
      if (prev.some(o => o.id === orgId)) return prev;
      return [...prev, orgObj];
    });

    // Log Action
    await logPortalAction('CREATE_ORGANIZATION', `Created class organization "${org.name}" with login "${cleanEmail}" (Status: ${orgObj.status})`).catch(() => {});
  };

  // 4. Update Class Org details or password
  const updateClassOrganization = async (id: string, updates: Partial<SP_Organization>, newPass?: string) => {
    if (!masterAccountId) return;
    const now = new Date().toISOString();

    const authorizedAsAdmin = isAdminAuthorized();
    if (!authorizedAsAdmin) {
      if (!portalUser || portalUser.organizationId !== id) {
        throw new Error('Forbidden: You can only update your own organization profile.');
      }
      // Strip privileged fields that non-admins cannot touch
      const sanitizedUpdates = { ...updates };
      delete (sanitizedUpdates as any).status;
      delete (sanitizedUpdates as any).totalPoints;
      delete (sanitizedUpdates as any).portalId;
      delete (sanitizedUpdates as any).id;
      updates = sanitizedUpdates;
    }

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

  const deleteClassOrganization = async (id: string) => {
    if (!masterAccountId) {
      throw new Error('No master account connected.');
    }
    if (!isAdminAuthorized()) {
      throw new Error('Forbidden: Administrative privileges required to delete a class organization.');
    }
    
    // 1. Fetch organization details for audit logging
    const orgDocRef = doc(db, 'sp_organizations', id);
    const orgSnap = await getDoc(orgDocRef);
    const orgName = orgSnap.exists() ? (orgSnap.data()?.name || id) : id;

    // 2. Fetch all achievement IDs belonging to this org so we can also clear their media attachments
    const qAchs = query(
      collection(db, 'sp_achievements'),
      where('organizationId', '==', id)
    );
    const achsSnap = await getDocs(qAchs);
    const achievementIds = achsSnap.docs.map(d => d.id);

    // 3. Collect all document references across all organization-scoped collections
    const refsToDelete: any[] = [];

    // Add achievements
    achsSnap.docs.forEach(d => refsToDelete.push(d.ref));

    // Scoped collections by organizationId
    const scopedCollections = [
      'sp_members',
      'sp_media',
      'sp_transactions',
      'sp_notifications',
      'sp_announcements',
      'sp_awards',
      'sp_registration_links',
      'sp_users',
      'sp_categories',
      'sp_competitions'
    ];

    for (const colName of scopedCollections) {
      try {
        const q = query(
          collection(db, colName),
          where('organizationId', '==', id)
        );
        const snap = await getDocs(q);
        snap.docs.forEach(d => {
          if (!refsToDelete.some(r => r.path === d.ref.path)) {
            refsToDelete.push(d.ref);
          }
        });
      } catch (err) {
        console.warn(`Error collecting from ${colName} for org ${id}:`, err);
      }
    }

    // Also delete any media linked via achievementId if not already captured
    if (achievementIds.length > 0) {
      for (let i = 0; i < achievementIds.length; i += 10) {
        const achIdChunk = achievementIds.slice(i, i + 10);
        try {
          const qMed = query(
            collection(db, 'sp_media'),
            where('portalId', '==', masterAccountId),
            where('achievementId', 'in', achIdChunk)
          );
          const medSnap = await getDocs(qMed);
          medSnap.docs.forEach(d => {
            if (!refsToDelete.some(r => r.path === d.ref.path)) {
              refsToDelete.push(d.ref);
            }
          });
        } catch (e) {
          console.warn('Error querying media for achievements:', e);
        }
      }
    }

    // Add the organization document itself
    refsToDelete.push(orgDocRef);

    // 4. Batch delete in safe chunks of 400 (Firestore limit is 500)
    const CHUNK_SIZE = 400;
    for (let i = 0; i < refsToDelete.length; i += CHUNK_SIZE) {
      const chunk = refsToDelete.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(ref => batch.delete(ref));
      await batch.commit();
    }

    // 5. Update local context state optimistically
    setOrganizations(prev => prev.filter(o => o.id !== id));
    setAchievements(prev => prev.filter(a => a.organizationId !== id));
    setMembers(prev => prev.filter(m => m.organizationId !== id));
    setTransactions(prev => prev.filter(t => t.organizationId !== id));
    setMediaAttachments(prev => prev.filter(m => m.organizationId !== id));
    setNotifications(prev => prev.filter(n => n.organizationId !== id));
    setAnnouncements(prev => prev.filter(a => a.organizationId !== id));

    // 6. Recalculate leaderboard totals and balances
    await recalculateLeaderboardTotals();

    // 7. Log audit trail
    await logPortalAction('DELETE_ORGANIZATION', `Permanently deleted class organization "${orgName}" and all associated data.`);
  };

  const rejectClassOrganization = async (id: string, reason?: string) => {
    const targetPortalId = masterAccountId || activePortalId;
    if (!targetPortalId) {
      throw new Error('No active Points Portal connected.');
    }
    if (!isAdminAuthorized()) {
      throw new Error('Forbidden: Administrative privileges required to reject a class organization.');
    }

    const now = new Date().toISOString();

    // 1. Fetch organization document to get details
    const orgDocRef = doc(db, 'sp_organizations', id);
    const orgSnap = await getDoc(orgDocRef);
    const orgData = orgSnap.exists() ? orgSnap.data() : null;
    const orgName = orgData?.name || id;

    // 2. Fetch associated user account in sp_users
    let userEmail = '';
    let userId = '';
    try {
      const qUsers = query(
        collection(db, 'sp_users'),
        where('portalId', '==', targetPortalId),
        where('organizationId', '==', id)
      );
      const userSnap = await getDocs(qUsers);
      if (!userSnap.empty) {
        userEmail = (userSnap.docs[0].data().email || '').trim().toLowerCase();
        userId = userSnap.docs[0].id;
      }
    } catch (e) {
      console.warn('Error fetching user for org rejection:', e);
    }

    // 3. Create persistent rejection access record in sp_rejections
    const rejectionId = `sp_rej_${id}`;
    const rejectionRecord: SP_Rejection = {
      id: rejectionId,
      portalId: targetPortalId,
      organizationId: id,
      organizationName: orgName,
      userEmail: userEmail,
      userId: userId,
      status: 'rejected',
      title: 'Admin Rejected Your Class Organization',
      message: reason || `Your class organization '${orgName}' has been rejected by the administrator.\n\nPlease contact the administrator if you believe this was a mistake.`,
      rejectedAt: now
    };
    await setDoc(doc(db, 'sp_rejections', rejectionId), cleanFirestorePayload(rejectionRecord));

    // 4. Update status in sp_organizations to 'rejected'
    if (orgSnap.exists()) {
      await updateDoc(orgDocRef, {
        status: 'rejected',
        updatedAt: now
      });
    }

    // 5. Collect and delete all organization-owned private data
    const qAchs = query(
      collection(db, 'sp_achievements'),
      where('organizationId', '==', id)
    );
    const achsSnap = await getDocs(qAchs);
    const achievementIds = achsSnap.docs.map(d => d.id);

    const refsToDelete: any[] = [];
    achsSnap.docs.forEach(d => refsToDelete.push(d.ref));

    const scopedCollections = [
      'sp_members',
      'sp_media',
      'sp_transactions',
      'sp_notifications',
      'sp_announcements',
      'sp_awards',
      'sp_registration_links',
      'sp_users',
      'sp_categories',
      'sp_competitions'
    ];

    for (const colName of scopedCollections) {
      try {
        const q = query(
          collection(db, colName),
          where('organizationId', '==', id)
        );
        const snap = await getDocs(q);
        snap.docs.forEach(d => {
          if (!refsToDelete.some(r => r.path === d.ref.path)) {
            refsToDelete.push(d.ref);
          }
        });
      } catch (err) {
        console.warn(`Error collecting from ${colName} for org ${id}:`, err);
      }
    }

    if (achievementIds.length > 0) {
      for (let i = 0; i < achievementIds.length; i += 10) {
        const achIdChunk = achievementIds.slice(i, i + 10);
        try {
          const qMed = query(
            collection(db, 'sp_media'),
            where('portalId', '==', targetPortalId),
            where('achievementId', 'in', achIdChunk)
          );
          const medSnap = await getDocs(qMed);
          medSnap.docs.forEach(d => {
            if (!refsToDelete.some(r => r.path === d.ref.path)) {
              refsToDelete.push(d.ref);
            }
          });
        } catch (e) {
          console.warn('Error querying media for achievements:', e);
        }
      }
    }

    // Delete collected refs in chunks of 400
    const CHUNK_SIZE = 400;
    for (let i = 0; i < refsToDelete.length; i += CHUNK_SIZE) {
      const chunk = refsToDelete.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(ref => batch.delete(ref));
      await batch.commit();
    }

    // 6. Revoke active session if matching
    if (portalUser) {
      const matchesOrg = portalUser.organizationId === id;
      const matchesEmail = userEmail && portalUser.email && portalUser.email.toLowerCase() === userEmail.toLowerCase();
      if (matchesOrg || matchesEmail) {
        setPortalUser(null);
        localStorage.removeItem('sp_portal_user');
        sessionStorage.clear();
        setRejectionInfo({
          isRejected: true,
          organizationName: orgName,
          title: rejectionRecord.title,
          message: rejectionRecord.message
        });
      }
    }

    // 7. Optimistically update local context states
    setOrganizations(prev => prev.map(o => o.id === id ? { ...o, status: 'rejected' as any } : o));
    setRejections(prev => [...prev.filter(r => r.id !== rejectionId), rejectionRecord]);
    setAchievements(prev => prev.filter(a => a.organizationId !== id));
    setMembers(prev => prev.filter(m => m.organizationId !== id));
    setTransactions(prev => prev.filter(t => t.organizationId !== id));
    setMediaAttachments(prev => prev.filter(m => m.organizationId !== id));
    setNotifications(prev => prev.filter(n => n.organizationId !== id));

    await recalculateLeaderboardTotals();
    await logPortalAction('REJECT_ORGANIZATION', `Rejected class organization "${orgName}" and revoked all portal access.`);
  };

  const approveClassOrganization = async (id: string) => {
    if (!masterAccountId) {
      throw new Error('No master account connected.');
    }
    if (!isAdminAuthorized()) {
      throw new Error('Forbidden: Administrative privileges required to approve a class organization.');
    }
    const now = new Date().toISOString();

    // 1. Fetch organization details
    const orgDocRef = doc(db, 'sp_organizations', id);
    const orgSnap = await getDoc(orgDocRef);
    const orgName = orgSnap.exists() ? (orgSnap.data()?.name || id) : id;

    // 2. Update status in Firestore
    await updateDoc(orgDocRef, { 
      status: 'active',
      updatedAt: now
    });

    // 3. Clear/resolve pending notification for admin
    try {
      const qNot = query(
        collection(db, 'sp_notifications'),
        where('portalId', '==', masterAccountId),
        where('organizationId', '==', 'master_admin')
      );
      const notSnap = await getDocs(qNot);
      const batch = writeBatch(db);
      let hasDeletions = false;
      notSnap.docs.forEach(d => {
        const dData = d.data();
        if (dData.metadata?.orgId === id || dData.message?.includes(orgName)) {
          batch.delete(d.ref);
          hasDeletions = true;
        }
      });
      if (hasDeletions) {
        await batch.commit();
      }
    } catch (err) {
      console.warn('Error clearing admin notification:', err);
    }

    // 4. Send welcome/approval notification to the sub-org
    const notId = generateId('sp_not');
    await setDoc(doc(db, 'sp_notifications', notId), cleanFirestorePayload({
      id: notId,
      portalId: masterAccountId,
      organizationId: id,
      title: 'Organization Approved!',
      message: `Your class organization "${orgName}" has been approved by the Admin. You can continue submitting achievements and tracking your points!`,
      isRead: false,
      createdAt: now
    })).catch(() => {});

    // 5. Update local state
    setOrganizations(prev => prev.map(o => o.id === id ? { ...o, status: 'active', updatedAt: now } : o));
    setNotifications(prev => prev.filter(n => !(n.organizationId === 'master_admin' && (n.metadata?.orgId === id || n.message?.includes(orgName)))));

    // 6. Log audit action
    await logPortalAction('APPROVE_ORGANIZATION', `Approved class organization "${orgName}" (ID: ${id})`);
  };

  // 5. Sub Org Admin Submit Achievement
  const submitAchievement = async (
    achievement: Omit<SP_Achievement, 'id' | 'portalId' | 'organizationId' | 'status' | 'awardedPoints' | 'reviewerId' | 'reviewNotes' | 'submittedAt' | 'createdAt' | 'updatedAt'>,
    files: { fileUrl: string; name: string; size: number; type: 'photo' | 'video' | 'document' }[]
  ) => {
    if (!masterAccountId || !portalUser || !portalUser.organizationId) return;

    if (portal?.submissionsAllowed === false) {
      throw new Error('Achievement submissions are currently closed by the administrator.');
    }

    // Double-check live Firestore portal state to strictly prevent bypass or race conditions
    try {
      const livePortalSnap = await getDoc(doc(db, 'sp_portals', masterAccountId));
      if (livePortalSnap.exists() && livePortalSnap.data().submissionsAllowed === false) {
        throw new Error('Achievement submissions are currently closed by the administrator.');
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Achievement submissions are currently closed')) {
        throw err;
      }
    }

    const achId = generateId('sp_ach');
    const now = new Date().toISOString();

    // Ensure member exists or register automatically if new achiever name is supplied
    let finalAchieverId = achievement.achieverId;
    let finalAchieverName = achievement.achieverName;
    let finalAchieverStudentId = achievement.achieverStudentId || '';

    if (!finalAchieverId || finalAchieverId === 'new' || finalAchieverId === 'unassigned') {
      if (finalAchieverName && finalAchieverName.trim() && finalAchieverName !== 'Achiever Not Assigned') {
        const newMember = await addMember(portalUser.organizationId, finalAchieverName, finalAchieverStudentId);
        finalAchieverId = newMember.id;
        finalAchieverName = newMember.name;
        finalAchieverStudentId = newMember.studentId || '';
      } else {
        finalAchieverId = 'unassigned';
        finalAchieverName = '';
        finalAchieverStudentId = '';
      }
    }

    const activeComp = competitions.find(c => c.status === 'active');
    if (!activeComp) {
      throw new Error('Achievement submissions are unavailable: No active Evaluation Period is currently running.');
    }

    const achObj: SP_Achievement = {
      ...achievement,
      achieverId: finalAchieverId,
      achieverName: finalAchieverName,
      achieverStudentId: finalAchieverStudentId,
      evaluationPeriodId: activeComp.id,
      evaluationPeriod: activeComp.name,
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

    if (!isAdminAuthorized()) {
      const existing = achievements.find(a => a.id === id);
      if (!existing || existing.organizationId !== portalUser.organizationId) {
        throw new Error('Forbidden: You cannot modify achievements belonging to another organization.');
      }
      if (existing.status === 'Approved') {
        throw new Error('Forbidden: Approved achievements cannot be modified.');
      }
      const safeUpdates = { ...updates };
      delete (safeUpdates as any).status;
      delete (safeUpdates as any).awardedPoints;
      delete (safeUpdates as any).reviewerId;
      delete (safeUpdates as any).organizationId;
      delete (safeUpdates as any).portalId;
      updates = safeUpdates;
    }

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

    if (!isAdminAuthorized()) {
      const existing = achievements.find(a => a.id === id);
      if (!existing || existing.organizationId !== portalUser?.organizationId) {
        throw new Error('Forbidden: You cannot delete achievements belonging to another organization.');
      }
      if (existing.status === 'Approved') {
        throw new Error('Forbidden: Approved achievements cannot be deleted.');
      }
    }
    
    // Delete Achievement Doc
    await deleteDoc(doc(db, 'sp_achievements', id));

    // Delete associated Media
    const q = query(collection(db, 'sp_media'), where('achievementId', '==', id));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      await deleteDoc(doc(db, 'sp_media', d.id));
    }

    // Delete associated Transactions
    const qTx = query(collection(db, 'sp_transactions'), where('achievementId', '==', id));
    const snapTx = await getDocs(qTx);
    for (const d of snapTx.docs) {
      await deleteDoc(doc(db, 'sp_transactions', d.id));
    }

    await logPortalAction('DELETE_ACHIEVEMENT', `Deleted achievement and associated media of ID: ${id}`);
    await recalculateLeaderboardTotals();
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
    if (!isAdminAuthorized()) {
      throw new Error('Forbidden: Administrative privileges required to review achievements and award points.');
    }
    const now = new Date().toISOString();

    // 1. Get original achievement to fetch organization and achiever info
    const achRef = doc(db, 'sp_achievements', id);
    const achSnap = await getDoc(achRef);
    if (!achSnap.exists()) return;
    
    const ach = achSnap.data() as SP_Achievement;
    const orgId = ach.organizationId;
    const achieverId = ach.achieverId;
    const achieverName = ach.achieverName || 'Achiever';
    const finalAwardedPoints = status === 'Approved' ? Math.max(0, Number(points) || 0) : 0;

    // 2. Update Achievement Status and awarded points
    await updateDoc(achRef, cleanFirestorePayload({
      status,
      awardedPoints: finalAwardedPoints,
      reviewerId: portalUser.id,
      reviewNotes: notes,
      baseAwardedPoints: baseAwardedPoints !== undefined ? baseAwardedPoints : null,
      bonusPoints: bonusPoints !== undefined ? bonusPoints : null,
      deductionPoints: deductionPoints !== undefined ? deductionPoints : null,
      updatedAt: now
    }));

    // 3. Reconcile transactions for this achievement
    const qTx = query(
      collection(db, 'sp_transactions'),
      where('portalId', '==', masterAccountId),
      where('achievementId', '==', id)
    );
    const snapTx = await getDocs(qTx);

    if (status === 'Approved' && finalAwardedPoints > 0) {
      if (!snapTx.empty) {
        // Update first transaction
        const firstDoc = snapTx.docs[0];
        await updateDoc(firstDoc.ref, cleanFirestorePayload({
          points: finalAwardedPoints,
          organizationId: orgId,
          achieverId: achieverId,
          achieverName: achieverName,
          categoryId: ach.categoryId,
          status: 'active',
          reason: `Approved achievement: "${ach.title}" for ${achieverName}`,
          awardedBy: portalUser.id,
          updatedAt: now
        }));
        // Remove any redundant duplicates
        for (let i = 1; i < snapTx.docs.length; i++) {
          await deleteDoc(snapTx.docs[i].ref);
        }
      } else {
        const txId = generateId('sp_tx');
        const txObj: SP_Transaction = {
          id: txId,
          portalId: masterAccountId,
          organizationId: orgId,
          achieverId: achieverId || 'unassigned',
          achieverName: achieverName,
          achievementId: id,
          categoryId: ach.categoryId,
          points: finalAwardedPoints,
          type: 'award',
          reason: `Approved achievement: "${ach.title}" for ${achieverName}`,
          awardedBy: portalUser.id,
          status: 'active',
          createdAt: now,
          updatedAt: now
        };
        await setDoc(doc(db, 'sp_transactions', txId), cleanFirestorePayload(txObj));
      }
    } else {
      // Non-approved or 0-point achievement: cancel / delete existing transactions
      for (const tDoc of snapTx.docs) {
        await deleteDoc(tDoc.ref);
      }
    }

    // 4. Recalculate all member and organization totals atomically
    await recalculateLeaderboardTotals();

    await logPortalAction('REVIEW_ACHIEVEMENT', `Reviewed achievement "${ach.title}" for ${achieverName} - Status: ${status}, Points: ${finalAwardedPoints}`);

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
  const addCategory = async (
    name: string,
    defaultPoints: number,
    isRankBased?: boolean,
    rank1Points?: number,
    rank2Points?: number,
    rank3Points?: number
  ) => {
    if (!masterAccountId) return;
    if (!isAdminAuthorized()) {
      throw new Error('Forbidden: Administrative privileges required to create point categories.');
    }
    const catId = generateId('sp_cat');
    const now = new Date().toISOString();

    await setDoc(doc(db, 'sp_categories', catId), cleanFirestorePayload({
      id: catId,
      portalId: masterAccountId,
      name,
      defaultPoints,
      isRankBased: !!isRankBased,
      rank1Points: isRankBased ? (Number(rank1Points) || 5) : null,
      rank2Points: isRankBased ? (Number(rank2Points) || 3) : null,
      rank3Points: isRankBased ? (Number(rank3Points) || 1) : null,
      createdAt: now,
      updatedAt: now
    }));

    await logPortalAction('ADD_CATEGORY', `Added point category: "${name}" with ${isRankBased ? 'rank-based points (1st:' + rank1Points + ', 2nd:' + rank2Points + ', 3rd:' + rank3Points + ')' : defaultPoints + ' default points'}`);
  };

  const deleteCategory = async (id: string) => {
    if (!masterAccountId) {
      throw new Error('Master account is not connected.');
    }
    if (!isAdminAuthorized()) {
      throw new Error('Forbidden: Administrative privileges required to delete custom point categories.');
    }
    try {
      // Optimistic update
      setCategories(prev => prev.filter(c => c.id !== id));
      await deleteDoc(doc(db, 'sp_categories', id));
      await logPortalAction('DELETE_CATEGORY', `Deleted point category ID: ${id}`);
    } catch (e) {
      console.error('Error deleting category', e);
      throw e;
    }
  };

  // 10. Competitions / Evaluations
  const addCompetition = async (name: string, start: string, end: string) => {
    if (!masterAccountId) return;
    if (!isAdminAuthorized()) {
      throw new Error('Forbidden: Administrative privileges required to add evaluation periods.');
    }
    const compId = generateId('sp_comp');
    const now = new Date().toISOString();

    // Prevent overlapping active periods: conclude any existing active periods in Firestore
    const qActiveComp = query(
      collection(db, 'sp_competitions'),
      where('portalId', '==', masterAccountId),
      where('status', '==', 'active')
    );
    const snapActive = await getDocs(qActiveComp);
    for (const d of snapActive.docs) {
      await updateDoc(d.ref, cleanFirestorePayload({
        status: 'completed',
        updatedAt: now
      }));
    }

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

    await logPortalAction('ADD_COMPETITION', `Started new active evaluation period: "${name}" (${start} to ${end}) and concluded previous active period(s)`);
  };

  const updateCompetition = async (id: string, name: string, startDate: string, endDate: string) => {
    if (!masterAccountId) return;
    if (!isAdminAuthorized()) {
      throw new Error('Forbidden: Administrative privileges required to update evaluation periods.');
    }
    const now = new Date().toISOString();

    await updateDoc(doc(db, 'sp_competitions', id), cleanFirestorePayload({
      name,
      startDate,
      endDate,
      updatedAt: now
    }));

    await logPortalAction('UPDATE_COMPETITION', `Updated evaluation period ID: ${id}`);
  };

  const completeCompetition = async (id: string) => {
    if (!masterAccountId) return;
    if (!isAdminAuthorized()) {
      throw new Error('Forbidden: Administrative privileges required to conclude evaluation periods.');
    }
    const now = new Date().toISOString();

    await updateDoc(doc(db, 'sp_competitions', id), cleanFirestorePayload({
      status: 'concluded',
      conclusionDate: now,
      concludedAt: now,
      updatedAt: now
    }));

    await logPortalAction('COMPLETE_COMPETITION', `Concluded evaluation period ID: ${id}`);
  };

  const toggleSubmissionsAllowed = async (allowed: boolean) => {
    if (!masterAccountId) {
      console.error('toggleSubmissionsAllowed: masterAccountId is missing!');
      throw new Error('Points Portal master account identifier is missing.');
    }
    if (!isAdminAuthorized()) {
      throw new Error('Forbidden: Administrative privileges required to change submission settings.');
    }

    const now = new Date().toISOString();
    const portalRef = doc(db, 'sp_portals', masterAccountId);

    await setDoc(portalRef, cleanFirestorePayload({
      id: masterAccountId,
      name: portal?.name || 'NSU Student Points Management',
      submissionsAllowed: allowed,
      updatedAt: now
    }), { merge: true });

    // Instantly update local state optimistically
    setPortal(prev => prev ? { ...prev, submissionsAllowed: allowed } : {
      id: masterAccountId,
      name: 'NSU Student Points Management',
      submissionsAllowed: allowed,
      createdAt: now,
      updatedAt: now
    });

    try {
      localStorage.setItem(`sp_submissions_allowed_${masterAccountId}`, String(allowed));
    } catch {}

    await logPortalAction(
      'TOGGLE_SUBMISSIONS',
      `Achievement submissions turned ${allowed ? 'ON' : 'OFF'} by administrator`
    ).catch(() => {});
  };

  // 11. Awards
  const addAward = async (award: Omit<SP_Award, 'id' | 'portalId' | 'createdAt'>) => {
    if (!masterAccountId) return;
    if (!isAdminAuthorized()) {
      throw new Error('Forbidden: Administrative privileges required to confer awards.');
    }
    const awardId = generateId('sp_award');
    const now = new Date().toISOString();
    const recipientType = award.recipientType || 'class_organization';

    const activeComp = competitions.find(c => c.status === 'active');
    const resolvedPeriodId = award.evaluationPeriodId || (award.evaluationPeriod ? competitions.find(c => c.id === award.evaluationPeriod || c.name.toLowerCase().trim() === award.evaluationPeriod?.toLowerCase().trim())?.id : undefined) || activeComp?.id;
    const resolvedPeriodName = award.evaluationPeriod || (resolvedPeriodId ? competitions.find(c => c.id === resolvedPeriodId)?.name : undefined) || activeComp?.name;

    const winnersList = award.winners && award.winners.length > 0
      ? award.winners
      : (award.winnerOrganizationId && award.winnerOrganizationName 
          ? [{ position: 1 as const, organizationId: award.winnerOrganizationId, organizationName: award.winnerOrganizationName, name: award.winnerOrganizationName }]
          : []);

    const primaryWinner = winnersList[0];
    const winnerOrgId = primaryWinner?.organizationId || award.winnerOrganizationId || '';
    const winnerOrgName = primaryWinner?.organizationName || award.winnerOrganizationName || '';

    await setDoc(doc(db, 'sp_awards', awardId), cleanFirestorePayload({
      id: awardId,
      portalId: masterAccountId,
      createdAt: now,
      ...award,
      evaluationPeriodId: resolvedPeriodId,
      evaluationPeriod: resolvedPeriodName,
      recipientType,
      winnerOrganizationId: winnerOrgId,
      winnerOrganizationName: winnerOrgName,
      winners: winnersList
    }));

    const winnersNames = winnersList.map(w => `${w.position === 1 ? '1st' : w.position === 2 ? '2nd' : '3rd'}: ${getWinnerDisplayName(w)}`).join(', ');
    await logPortalAction('AWARD_CONFERRED', `Conferred award "${award.name}" (${recipientType === 'individual' ? 'Individual' : 'Class Organization'}) to ${winnersNames}`);

    // Create alert for each Winner Org
    for (const w of winnersList) {
      if (!w.organizationId) continue;
      const notId = generateId('sp_not');
      const posLabel = w.position === 1 ? '1st Winner 🥇' : w.position === 2 ? '2nd Winner 🥈' : '3rd Winner 🥉';
      await setDoc(doc(db, 'sp_notifications', notId), cleanFirestorePayload({
        id: notId,
        portalId: masterAccountId,
        organizationId: w.organizationId,
        title: `Award Conferred! ${posLabel}`,
        message: `Outstanding! ${recipientType === 'individual' ? `${getWinnerDisplayName(w)} from your class organization` : 'Your class organization'} has won ${posLabel} for the award: "${award.name}". ${award.description ? `"${award.description}"` : ''}`,
        isRead: false,
        createdAt: now
      }));
    }
  };

  const updateAward = async (awardId: string, updates: Partial<Omit<SP_Award, 'id' | 'portalId' | 'createdAt'>>) => {
    if (!masterAccountId) return;
    if (!isAdminAuthorized()) {
      throw new Error('Forbidden: Administrative privileges required to update awards.');
    }
    await updateDoc(doc(db, 'sp_awards', awardId), cleanFirestorePayload(updates));
    await logPortalAction('UPDATE_AWARD', `Updated award ID: ${awardId}`);
  };

  const deleteAward = async (awardId: string) => {
    if (!masterAccountId) return;
    if (!isAdminAuthorized()) {
      throw new Error('Forbidden: Administrative privileges required to delete awards.');
    }
    await deleteDoc(doc(db, 'sp_awards', awardId));
    await logPortalAction('DELETE_AWARD', `Deleted award ID: ${awardId}`);
  };

  // 12. Announcements
  const addAnnouncement = async (title: string, content: string) => {
    if (!masterAccountId) return;
    if (!isAdminAuthorized()) {
      throw new Error('Forbidden: Administrative privileges required to publish announcements.');
    }
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

    // Check if email already registered in sp_users for this portal
    let emailCheckSnap = await getDocs(query(collection(db, 'sp_users'), where('portalId', '==', targetPortalId), where('email', '==', cleanEmail)));
    if (emailCheckSnap.empty) {
      emailCheckSnap = await getDocs(query(collection(db, 'sp_users'), where('portalId', '==', targetPortalId), where('email', '==', loginEmail.trim())));
    }
    if (!emailCheckSnap.empty) {
      throw new Error('An account with this email address is already registered in this organization.');
    }

    const orgId = generateId('sp_org');
    const now = new Date().toISOString();

    const orgObj: SP_Organization = {
      id: orgId,
      portalId: targetPortalId,
      totalPoints: 0,
      createdAt: now,
      updatedAt: now,
      ...orgData,
      status: 'pending'
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

    // Create Admin notification for pending confirmation
    const adminNotId = generateId('sp_not');
    const adminNotDoc = {
      id: adminNotId,
      portalId: targetPortalId,
      organizationId: 'master_admin',
      title: 'New Class Organization Pending Approval',
      message: `${orgData.name} has registered using the shared registration code and is waiting for confirmation.`,
      isRead: false,
      createdAt: now,
      metadata: {
        type: 'pending_organization',
        orgId: orgId,
        orgName: orgData.name,
        leader: orgData.leader || '',
        className: orgData.className || '',
        registeredAt: now
      }
    };
    await setDoc(doc(db, 'sp_notifications', adminNotId), cleanFirestorePayload(adminNotDoc)).catch(() => {});
    setNotifications(prev => [adminNotDoc as any, ...prev]);

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
      members: activeMembers,
      rejections,
      rejectionInfo,
      loading,
      
      clearRejectionInfo,
      toggleSubmissionsAllowed,
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
      deleteClassOrganization,
      rejectClassOrganization,
      approveClassOrganization,
      
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
      updateCompetition,
      completeCompetition,
      
      addAward,
      updateAward,
      deleteAward,
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
