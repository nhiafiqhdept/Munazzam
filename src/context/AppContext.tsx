import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  or,
  onSnapshot,
  addDoc,
  deleteDoc,
  getDocFromServer,
} from 'firebase/firestore';
import { auth, db, cleanFirestorePayload } from '../lib/firebase';
import {
  AuthUser,
  Organization,
  Organizer,
  Program,
  ProgramCategory,
  ProgramMedia,
  ActiveTab,
  FinancialAccount,
  Income,
  Expense,
  AccountTransfer,
  Loan,
  LoanRepayment,
  AuditLog,
  SubWing,
  ProgramPermission,
  PermissionStatus,
  PermissionHistoryItem,
} from '../types';
import { determineProgramStatusByDate, getProgramEffectiveStatus } from '../utils/helpers';
import { generateSecurePermissionToken, getPublicApprovalUrl } from '../utils/permissionTokens';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path,
  };
  
  if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('exceeded')) {
    console.warn('Firestore Operation Paused (Quota Limit Exceeded):', JSON.stringify(errInfo));
    try {
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
    } catch {}
  } else {
    console.error('Firestore Operation Failed:', JSON.stringify(errInfo));
  }
}

interface AppContextType {
  token: string | null;
  user: AuthUser | null;
  authLoading: boolean;
  orgLoading: boolean;
  isAuthenticated: boolean;
  hasConfiguredOrg: boolean;
  loginUser: (token: string, user: AuthUser) => void;
  logoutUser: () => Promise<void>;
  isQuotaExceeded: boolean;
  isPublicView: boolean;
  exitPublicView: () => void;

  organizations: Organization[];
  currentOrg: Organization | undefined;
  currentOrgId: string;
  setCurrentOrgId: (id: string) => void;
  addOrganization: (orgData: Omit<Organization, 'id' | 'created_at' | 'updated_at'>) => Promise<Organization>;
  updateOrganization: (orgData: Partial<Organization> & { id: string }) => Promise<void>;
  deleteOrganization: (id: string) => Promise<void>;

  organizers: Organizer[];
  allOrganizers: Organizer[];
  addOrganizer: (organizer: Omit<Organizer, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => Promise<Organizer>;
  updateOrganizer: (organizer: Partial<Organizer> & { id: string }) => Promise<void>;
  deleteOrganizer: (id: string) => Promise<void>;
  reorderOrganizers: (reordered: Organizer[]) => void;

  programs: Program[];
  allPrograms: Program[];
  programCategories: ProgramCategory[];
  addProgram: (prog: Omit<Program, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => Promise<Program>;
  updateProgram: (prog: Partial<Program> & { id: string }) => Promise<void>;
  deleteProgram: (id: string) => Promise<void>;
  addProgramMedia: (programId: string, mediaItem: Omit<ProgramMedia, 'id' | 'program_id' | 'created_at'>) => Promise<void>;
  deleteProgramMedia: (programId: string, mediaId: string) => Promise<void>;
  addProgramCategory: (name: string) => Promise<ProgramCategory>;
  ensureCategoryExists: (name: string) => Promise<ProgramCategory | null>;
  subWings: SubWing[];
  subWingPrograms: Program[];
  setSubWings: React.Dispatch<React.SetStateAction<SubWing[]>>;

  // College Program Permissions
  programPermissions: ProgramPermission[];
  allProgramPermissions: ProgramPermission[];
  getProgramPermission: (programId: string) => ProgramPermission | undefined;
  requestProgramPermission: (perm: Omit<ProgramPermission, 'id' | 'createdAt' | 'updatedAt' | 'history'>) => Promise<ProgramPermission>;
  updateProgramPermission: (
    id: string,
    updates: Partial<ProgramPermission>,
    historyAction?: { action: string; actorName: string; actorRole: string; notes?: string }
  ) => Promise<void>;
  recommendProgramPermission: (id: string, recommenderName: string, designation: string, notes?: string) => Promise<void>;
  approveProgramPermission: (id: string, approverName: string, notes?: string) => Promise<void>;
  rejectProgramPermission: (id: string, rejecterName: string, reason: string) => Promise<void>;
  requestPermissionChanges: (id: string, reviewerName: string, notes: string) => Promise<void>;
  generatePermissionApprovalToken: (permissionId: string) => Promise<{ token: string; url: string }>;
  deleteProgramPermission: (id: string) => Promise<void>;

  // Treasury State & Methods
  accounts: FinancialAccount[];
  allAccounts: FinancialAccount[];
  addAccount: (acc: Omit<FinancialAccount, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => Promise<FinancialAccount>;
  updateAccount: (acc: Partial<FinancialAccount> & { id: string }) => Promise<void>;
  deleteAccount: (id: string) => Promise<boolean>;

  incomes: Income[];
  allIncomes: Income[];
  addIncome: (inc: Omit<Income, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => Promise<Income>;
  updateIncome: (inc: Partial<Income> & { id: string }) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;

  expenses: Expense[];
  allExpenses: Expense[];
  addExpense: (exp: Omit<Expense, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => Promise<Expense>;
  updateExpense: (exp: Partial<Expense> & { id: string }) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  transfers: AccountTransfer[];
  allTransfers: AccountTransfer[];
  addTransfer: (tr: Omit<AccountTransfer, 'id' | 'organization_id' | 'created_at'>) => Promise<AccountTransfer>;
  deleteTransfer: (id: string) => Promise<void>;

  loans: Loan[];
  allLoans: Loan[];
  addLoan: (loan: Omit<Loan, 'id' | 'organization_id' | 'outstanding_amount' | 'status' | 'created_at' | 'updated_at'>) => Promise<Loan>;
  updateLoan: (loan: Partial<Loan> & { id: string }) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;

  loanRepayments: LoanRepayment[];
  allLoanRepayments: LoanRepayment[];
  addLoanRepayment: (rep: Omit<LoanRepayment, 'id' | 'organization_id' | 'created_at'>) => Promise<LoanRepayment>;
  deleteLoanRepayment: (id: string) => Promise<void>;

  auditLogs: AuditLog[];
  allAuditLogs: AuditLog[];

  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedProgramId: string | null;
  setSelectedProgramId: (id: string | null) => void;
  viewProgramDetails: (id: string) => void;

  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  adminPin: string;
  setAdminPin: (pin: string) => void;

  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  resetToDemoData: () => void;
  exportDataJson: () => string;
  importDataJson: (jsonStr: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{
  children: React.ReactNode;
  isPublicView?: boolean;
  publicOrgQuery?: string | null;
}> = ({ children, isPublicView = false, publicOrgQuery = null }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(!isPublicView);
  const [orgLoading, setOrgLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState<boolean>(false);

  // Set up event listener for quota exceeded
  useEffect(() => {
    const handleQuota = () => {
      setIsQuotaExceeded(true);
    };
    window.addEventListener('firestore-quota-exceeded', handleQuota);
    return () => {
      window.removeEventListener('firestore-quota-exceeded', handleQuota);
    };
  }, []);

  const [organizations, setOrganizations] = useState<Organization[]>(() => {
    try {
      const cached = localStorage.getItem('local_organizations');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [currentOrgId, setCurrentOrgId] = useState<string>(() => {
    return localStorage.getItem('local_currentOrgId') || '';
  });

  const [organizers, setOrganizers] = useState<Organizer[]>(() => {
    try {
      const cached = localStorage.getItem('local_organizers');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [programs, setPrograms] = useState<Program[]>(() => {
    try {
      const cached = localStorage.getItem('local_programs');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [subWingPrograms, setSubWingPrograms] = useState<Program[]>([]);
  const [subWings, setSubWings] = useState<SubWing[]>([]);
  const [programCategories, setProgramCategories] = useState<ProgramCategory[]>(() => {
    try {
      const cached = localStorage.getItem('local_categories');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [accounts, setAccounts] = useState<FinancialAccount[]>(() => {
    try {
      const cached = localStorage.getItem('local_accounts');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [incomes, setIncomes] = useState<Income[]>(() => {
    try {
      const cached = localStorage.getItem('local_incomes');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const cached = localStorage.getItem('local_expenses');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [transfers, setTransfers] = useState<AccountTransfer[]>(() => {
    try {
      const cached = localStorage.getItem('local_transfers');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loans, setLoans] = useState<Loan[]>(() => {
    try {
      const cached = localStorage.getItem('local_loans');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loanRepayments, setLoanRepayments] = useState<LoanRepayment[]>(() => {
    try {
      const cached = localStorage.getItem('local_repayments');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const cached = localStorage.getItem('local_auditLogs');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [programPermissions, setProgramPermissions] = useState<ProgramPermission[]>(() => {
    try {
      const cached = localStorage.getItem('local_permissions');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [isAdminState, setIsAdminState] = useState<boolean>(!isPublicView);
  const isAdmin = !isPublicView && isAdminState;
  const setIsAdmin = useCallback((val: boolean) => {
    if (!isPublicView) {
      setIsAdminState(val);
    }
  }, [isPublicView]);

  const [adminPin, setAdminPin] = useState<string>('1234');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  const exitPublicView = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.hash = '';
      const url = new URL(window.location.href);
      url.searchParams.delete('public_org');
      url.searchParams.delete('public_org_id');
      window.location.href = url.origin + url.pathname;
    }
  }, []);

  // Connection test per skill requirements
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error('Firestore connection offline check:', error.message);
        }
      }
    }
    testConnection();
  }, []);

  // Public View Data Synchronizer
  useEffect(() => {
    if (!isPublicView || !publicOrgQuery) return;

    let isMounted = true;
    setOrgLoading(true);

    const loadPublicOrgData = async () => {
      try {
        const queryTerm = publicOrgQuery.trim();
        const upperQuery = queryTerm.toUpperCase();
        let targetAccountId: string | null = null;
        let initialOrgData: any = null;

        // 1. Check in public_organizations index doc
        try {
          const pubSnap = await getDoc(doc(db, 'public_organizations', upperQuery));
          if (pubSnap.exists()) {
            const data = pubSnap.data();
            targetAccountId = data.accountId || data.id || null;
            initialOrgData = data;
          }
        } catch (e) {
          console.warn('public_organizations check failed:', e);
        }

        // 2. Direct account ID lookup
        if (!targetAccountId) {
          try {
            const accSnap = await getDoc(doc(db, 'accounts', queryTerm));
            if (accSnap.exists()) {
              targetAccountId = queryTerm;
              const p = accSnap.data()?.profile || {};
              initialOrgData = {
                accountId: queryTerm,
                name: p.name || 'Organization',
                college_name: p.college_name || 'Main Campus',
                logo: p.logo || '',
                tagline: p.tagline || '',
                established_year: p.established_year || '',
                description: p.description || '',
                email: p.email || accSnap.data()?.email || '',
                website: p.website || '',
                about: p.about || '',
                academic_year: p.academic_year || '',
                searchableName: p.searchableName || queryTerm,
              };
            }
          } catch (e) {}
        }

        // 3. Query accounts collection for searchableName
        if (!targetAccountId) {
          try {
            const qAcc = query(collection(db, 'accounts'), where('profile.searchableName', '==', upperQuery));
            const snap = await getDocs(qAcc);
            if (!snap.empty) {
              const docSnap = snap.docs[0];
              targetAccountId = docSnap.id;
              const p = docSnap.data()?.profile || {};
              initialOrgData = {
                accountId: docSnap.id,
                name: p.name || 'Organization',
                college_name: p.college_name || 'Main Campus',
                logo: p.logo || '',
                tagline: p.tagline || '',
                established_year: p.established_year || '',
                description: p.description || '',
                email: p.email || docSnap.data()?.email || '',
                website: p.website || '',
                about: p.about || '',
                academic_year: p.academic_year || '',
                searchableName: p.searchableName || queryTerm,
              };
            }
          } catch (e) {}
        }

        if (!targetAccountId) {
          if (isMounted) {
            setOrganizations([]);
            setOrgLoading(false);
          }
          return;
        }

        const orgObj: Organization = {
          id: targetAccountId,
          name: initialOrgData?.name || 'Organization',
          college_name: initialOrgData?.college_name || 'Main Campus',
          logo: initialOrgData?.logo || '',
          tagline: initialOrgData?.tagline || '',
          established_year: initialOrgData?.established_year || '',
          description: initialOrgData?.description || '',
          email: initialOrgData?.email || '',
          website: initialOrgData?.website || '',
          about: initialOrgData?.about || '',
          academic_year: initialOrgData?.academic_year || '',
          searchableName: initialOrgData?.searchableName || upperQuery,
          created_at: initialOrgData?.createdAt || new Date().toISOString(),
          updated_at: initialOrgData?.updatedAt || new Date().toISOString(),
          isInitialized: true,
        };

        if (isMounted) {
          setOrganizations([orgObj]);
          setCurrentOrgId(targetAccountId);
        }

        // Fetch Organizers for this org
        try {
          const qOrg = query(collection(db, 'organizers'), where('accountId', '==', targetAccountId));
          const orgSnap = await getDocs(qOrg);
          const list: Organizer[] = [];
          orgSnap.forEach((docSnap) => {
            const d = docSnap.data();
            list.push({
              id: docSnap.id,
              organization_id: targetAccountId!,
              name: d.name || '',
              photo: d.photo || '',
              position: d.position || '',
              display_order: d.display_order ?? 0,
              email: d.email || '',
              phone: d.phone || '',
              bio: d.bio || '',
              academic_year: d.academic_year || '',
              created_at: d.created_at || '',
              updated_at: d.updated_at || '',
            });
          });
          list.sort((a, b) => a.display_order - b.display_order);
          if (isMounted) setOrganizers(list);
        } catch (err) {
          console.warn('Error loading public organizers:', err);
        }

        // Fetch Program Categories
        try {
          const qCat = query(collection(db, 'program_categories'), where('accountId', '==', targetAccountId));
          const catSnap = await getDocs(qCat);
          const list: ProgramCategory[] = [];
          catSnap.forEach((docSnap) => {
            const d = docSnap.data();
            list.push({
              id: docSnap.id,
              organization_id: targetAccountId!,
              name: d.name || '',
              created_at: d.createdAt || d.created_at || '',
              updated_at: d.updatedAt || d.updated_at || '',
            });
          });
          list.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
          if (isMounted) setProgramCategories(list);
        } catch (err) {
          console.warn('Error loading public categories:', err);
        }

        // Fetch Programs (Official only)
        try {
          const qProg = query(collection(db, 'programs'), where('accountId', '==', targetAccountId));
          const progSnap = await getDocs(qProg);
          const list: Program[] = [];
          progSnap.forEach((docSnap) => {
            const d = docSnap.data();
            // In public view, omit unapproved proposals
            if (d.subWingId && d.subWingStatus !== 'approved') return;

            list.push({
              id: docSnap.id,
              organization_id: targetAccountId!,
              name: d.name || '',
              category_id: d.categoryId || d.category_id || '',
              category: d.category || '',
              subCategory: d.subCategory || d.sub_category || '',
              date: d.date || '',
              time: d.time || '',
              place: d.place || '',
              audience: d.audience || '',
              description: d.description || '',
              poster: d.poster || '',
              media: d.media || [],
              status: getProgramEffectiveStatus({ date: d.date, status: d.status, subWingId: d.subWingId, subWingStatus: d.subWingStatus }),
              attendance_count: d.attendance_count || 0,
              created_at: d.created_at || d.createdAt || '',
              updated_at: d.updated_at || d.updatedAt || '',
              subWingId: d.subWingId || undefined,
              subWingName: d.subWingName || undefined,
              subWingStatus: d.subWingStatus || undefined,
              submittedByEmail: d.submittedByEmail || undefined,
              submittedAt: d.submittedAt || d.submitted_at || undefined,
              resourcePerson: d.resourcePerson || '',
              permissionStatus: d.permissionStatus || 'not_requested',
              permissionId: d.permissionId || undefined,
            });
          });
          list.sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
          if (isMounted) {
            setPrograms(list);
            setSubWingPrograms([]);
          }
        } catch (err) {
          console.warn('Error loading public programs:', err);
        }

        // Fetch Financial Accounts (Read-Only for Treasury Dashboard)
        try {
          const qAccs = query(collection(db, 'financial_accounts'), where('accountId', '==', targetAccountId));
          const accSnap = await getDocs(qAccs);
          const list: FinancialAccount[] = [];
          accSnap.forEach((docSnap) => {
            const d = docSnap.data();
            list.push({
              id: docSnap.id,
              organization_id: targetAccountId!,
              name: d.name || '',
              type: d.type || 'cash',
              opening_balance: Number(d.opening_balance || 0),
              description: d.description || '',
              is_active: d.is_active !== false,
              created_at: d.created_at || '',
              updated_at: d.updated_at || '',
            });
          });
          if (isMounted) setAccounts(list);
        } catch (err) {
          console.warn('Error loading public accounts:', err);
        }

        // Fetch Incomes
        try {
          const qInc = query(collection(db, 'incomes'), where('accountId', '==', targetAccountId));
          const incSnap = await getDocs(qInc);
          const list: Income[] = [];
          incSnap.forEach((docSnap) => {
            const d = docSnap.data();
            list.push({
              id: docSnap.id,
              organization_id: targetAccountId!,
              account_id: d.account_id || '',
              category: d.category || 'General',
              source: d.source || '',
              date: d.date || '',
              amount: Number(d.amount || 0),
              description: d.description || '',
              receipt: d.receipt || d.proof || '',
              reference_number: d.reference_number || d.receipt_no || '',
              program_id: d.program_id || '',
              created_by: d.created_by || '',
              created_at: d.created_at || '',
              updated_at: d.updated_at || '',
            });
          });
          if (isMounted) setIncomes(list);
        } catch (err) {
          console.warn('Error loading public incomes:', err);
        }

        // Fetch Expenses
        try {
          const qExp = query(collection(db, 'expenses'), where('accountId', '==', targetAccountId));
          const expSnap = await getDocs(qExp);
          const list: Expense[] = [];
          expSnap.forEach((docSnap) => {
            const d = docSnap.data();
            list.push({
              id: docSnap.id,
              organization_id: targetAccountId!,
              account_id: d.account_id || '',
              category: d.category || 'General',
              date: d.date || '',
              amount: Number(d.amount || 0),
              description: d.description || '',
              receipt: d.receipt || d.proof || '',
              reference_number: d.reference_number || d.bill_no || '',
              program_id: d.program_id || '',
              paid_to: d.paid_to || '',
              created_by: d.created_by || '',
              created_at: d.created_at || '',
              updated_at: d.updated_at || '',
            });
          });
          if (isMounted) setExpenses(list);
        } catch (err) {
          console.warn('Error loading public expenses:', err);
        }

        // Fetch Transfers
        try {
          const qTr = query(collection(db, 'transfers'), where('accountId', '==', targetAccountId));
          const trSnap = await getDocs(qTr);
          const list: AccountTransfer[] = [];
          trSnap.forEach((docSnap) => {
            const d = docSnap.data();
            list.push({
              id: docSnap.id,
              organization_id: targetAccountId!,
              from_account_id: d.from_account_id || '',
              to_account_id: d.to_account_id || '',
              amount: Number(d.amount || 0),
              date: d.date || '',
              description: d.description || d.notes || '',
              reference_number: d.reference_number || '',
              created_by: d.created_by || '',
              created_at: d.created_at || '',
            });
          });
          if (isMounted) setTransfers(list);
        } catch (err) {}

        // Fetch Loans
        try {
          const qLoans = query(collection(db, 'loans'), where('accountId', '==', targetAccountId));
          const loanSnap = await getDocs(qLoans);
          const list: Loan[] = [];
          loanSnap.forEach((docSnap) => {
            const d = docSnap.data();
            list.push({
              id: docSnap.id,
              organization_id: targetAccountId!,
              type: d.type || 'LENT',
              person_or_organization: d.person_or_organization || d.person_name || '',
              original_amount: Number(d.original_amount || 0),
              outstanding_amount: Number(d.outstanding_amount || 0),
              date: d.date || '',
              due_date: d.due_date || '',
              purpose: d.purpose || d.description || '',
              account_id: d.account_id || '',
              description: d.description || '',
              proof: d.proof || '',
              status: d.status || 'OUTSTANDING',
              created_by: d.created_by || '',
              created_at: d.created_at || '',
              updated_at: d.updated_at || '',
            });
          });
          if (isMounted) setLoans(list);
        } catch (err) {}

        // Fetch Repayments
        try {
          const qRep = query(collection(db, 'repayments'), where('accountId', '==', targetAccountId));
          const repSnap = await getDocs(qRep);
          const list: LoanRepayment[] = [];
          repSnap.forEach((docSnap) => {
            const d = docSnap.data();
            list.push({
              id: docSnap.id,
              loan_id: d.loan_id || '',
              organization_id: targetAccountId!,
              account_id: d.account_id || '',
              date: d.date || '',
              amount: Number(d.amount || 0),
              type: d.type || 'REPAY',
              description: d.description || '',
              proof: d.proof || '',
              created_by: d.created_by || '',
              created_at: d.created_at || '',
            });
          });
          if (isMounted) setLoanRepayments(list);
        } catch (err) {}
      } catch (err) {
        console.error('Error during public organization load:', err);
      } finally {
        if (isMounted) {
          setOrgLoading(false);
        }
      }
    };

    loadPublicOrgData();

    return () => {
      isMounted = false;
    };
  }, [isPublicView, publicOrgQuery]);

  // Connection test per skill requirements
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error('Firestore connection offline check:', error.message);
        }
      }
    }
    testConnection();
  }, []);

  // Central Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          const authUser: AuthUser = {
            id: firebaseUser.uid,
            username: firebaseUser.email ? firebaseUser.email.split('@')[0] : 'admin',
            email: firebaseUser.email || '',
            role: 'admin',
          };

          localStorage.setItem('org_token', idToken);
          setToken(idToken);
          setUser(authUser);
          setIsAuthenticated(true);

          // Verify/create account document in Firestore
          const accountRef = doc(db, 'accounts', firebaseUser.uid);
          const docSnap = await getDoc(accountRef);
          if (!docSnap.exists()) {
            const now = new Date().toISOString();
            await setDoc(accountRef, {
              accountId: firebaseUser.uid,
              email: firebaseUser.email,
              createdAt: now,
              updatedAt: now,
              status: 'active',
              profile: {
                name: 'My Organization',
                college_name: 'Main Campus',
                tagline: 'Excellence in Action',
                logo: '',
                email: firebaseUser.email,
                isInitialized: false,
              },
            });
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('exceeded')) {
            console.warn('Error handling Firebase auth state (Quota Exceeded):', err);
            try {
              window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
            } catch {}
          } else {
            console.error('Error handling Firebase auth state:', err);
          }
        } finally {
          setAuthLoading(false);
        }
      } else {
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setOrganizations([]);
        setCurrentOrgId('');
        setOrganizers([]);
        setPrograms([]);
        setAccounts([]);
        setIncomes([]);
        setExpenses([]);
        setTransfers([]);
        setLoans([]);
        setLoanRepayments([]);
        setAuditLogs([]);
        setAuthLoading(false);
        setOrgLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginUser = useCallback((newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUser(newUser);
    setIsAuthenticated(true);
    setAuthLoading(false);
  }, []);

  const logoutUser = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Firebase SignOut failed:', err);
    }
    // Clean local user-specific caches
    try {
      localStorage.removeItem('local_programs');
      localStorage.removeItem('org_token');
      localStorage.removeItem('last_org_name');
      localStorage.removeItem('last_org_logo');
    } catch (e) {
      console.warn('Could not clear local storage on logout:', e);
    }

    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setOrganizations([]);
    setCurrentOrgId('');
    setOrganizers([]);
    setPrograms([]);
    setProgramCategories([]);
    setAccounts([]);
    setIncomes([]);
    setExpenses([]);
    setTransfers([]);
    setLoans([]);
    setLoanRepayments([]);
    setAuditLogs([]);
  }, []);

  // Real-time Firestore Sync for Authenticated User
  useEffect(() => {
    if (!user?.id || !isAuthenticated) return;

    const uid = user.id;

    // 1. Account Profile
    const unsubOrg = onSnapshot(doc(db, 'accounts', uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const profile = data.profile || {};
        const isInitialized = profile.isInitialized ?? (profile.name && profile.name !== 'My Organization' && profile.name !== '');
        const orgObj: Organization = {
          id: uid,
          name: profile.name || 'My Organization',
          college_name: profile.college_name || 'Main Campus',
          logo: profile.logo || '',
          tagline: profile.tagline || '',
          established_year: profile.established_year || '',
          description: profile.description || '',
          email: profile.email || data.email || user.email || '',
          website: profile.website || '',
          created_at: data.createdAt || new Date().toISOString(),
          updated_at: data.updatedAt || new Date().toISOString(),
          isInitialized: isInitialized,
          about: profile.about || '',
          academic_year: profile.academic_year || '',
          searchableName: profile.searchableName || '',
        };
        setOrganizations([orgObj]);
        setCurrentOrgId(uid);

        try {
          localStorage.setItem('local_organizations', JSON.stringify([orgObj]));
          localStorage.setItem('local_currentOrgId', uid);
        } catch {}

        if (profile.logo) localStorage.setItem('last_org_logo', profile.logo);
        if (profile.name) localStorage.setItem('last_org_name', profile.name);

        if (profile.searchableName) {
          const sName = profile.searchableName.trim().toUpperCase();
          setDoc(doc(db, 'public_organizations', sName), {
            accountId: uid,
            searchableName: sName,
            name: profile.name || 'Organization',
            college_name: profile.college_name || 'Main Campus',
            tagline: profile.tagline || '',
            logo: profile.logo || '',
            established_year: profile.established_year || '',
            description: profile.description || '',
            email: profile.email || data.email || user.email || '',
            website: profile.website || '',
            about: profile.about || '',
            academic_year: profile.academic_year || '',
            updatedAt: data.updatedAt || new Date().toISOString(),
          }, { merge: true }).catch(() => {});
        }
      }
      setOrgLoading(false);
    }, (err) => {
      setOrgLoading(false);
      handleFirestoreError(err, OperationType.GET, `accounts/${uid}`);
    });

    // 2. Organizers
    const qOrganizers = query(collection(db, 'organizers'), where('accountId', '==', uid));
    const unsubOrganizers = onSnapshot(qOrganizers, (snapshot) => {
      const list: Organizer[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          organization_id: uid,
          name: d.name || '',
          photo: d.photo || '',
          position: d.position || '',
          display_order: d.display_order ?? 0,
          email: d.email || '',
          phone: d.phone || '',
          bio: d.bio || '',
          academic_year: d.academic_year || '',
          created_at: d.created_at || '',
          updated_at: d.updated_at || '',
        });
      });
      const sortedList = list.sort((a, b) => a.display_order - b.display_order);
      setOrganizers(sortedList);
      try {
        localStorage.setItem('local_organizers', JSON.stringify(sortedList));
      } catch {}
    }, (err) => handleFirestoreError(err, OperationType.GET, 'organizers'));

    // 2.5 Program Categories
    const qCategories = query(collection(db, 'program_categories'), where('accountId', '==', uid));
    const unsubCategories = onSnapshot(qCategories, (snapshot) => {
      const list: ProgramCategory[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          organization_id: uid,
          name: d.name || '',
          created_at: d.createdAt || d.created_at || '',
          updated_at: d.updatedAt || d.updated_at || '',
        });
      });
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
      setProgramCategories(list);
      try {
        localStorage.setItem('local_categories', JSON.stringify(list));
      } catch {}
    }, (err) => handleFirestoreError(err, OperationType.GET, 'program_categories'));

    // 3. Programs
    const qPrograms = query(collection(db, 'programs'), where('accountId', '==', uid));
    const unsubPrograms = onSnapshot(qPrograms, (snapshot) => {
      const list: Program[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          organization_id: uid,
          name: d.name || '',
          category_id: d.categoryId || d.category_id || '',
          category: d.category || '',
          subCategory: d.subCategory || d.sub_category || '',
          date: d.date || '',
          time: d.time || '',
          place: d.place || '',
          audience: d.audience || '',
          description: d.description || '',
          poster: d.poster || '',
          media: d.media || [],
          status: getProgramEffectiveStatus({ date: d.date, status: d.status, subWingId: d.subWingId, subWingStatus: d.subWingStatus }),
          attendance_count: d.attendance_count || 0,
          created_at: d.created_at || d.createdAt || '',
          updated_at: d.updated_at || d.updatedAt || '',
          subWingId: d.subWingId || undefined,
          subWingName: d.subWingName || undefined,
          subWingStatus: d.subWingStatus || undefined,
          submittedByEmail: d.submittedByEmail || undefined,
          submittedAt: d.submittedAt || d.submitted_at || undefined,
          resourcePerson: d.resourcePerson || '',
          permissionStatus: d.permissionStatus || 'not_requested',
          permissionId: d.permissionId || undefined,
        });
      });
      list.sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
      
      const officialList = list.filter((p) => !p.subWingId || p.subWingStatus === 'approved');
      const subWingList = list.filter((p) => p.subWingId);
      
      setPrograms(officialList);
      setSubWingPrograms(subWingList);
      try {
        localStorage.setItem('local_programs', JSON.stringify(officialList));
      } catch {}
    }, (err) => handleFirestoreError(err, OperationType.GET, 'programs'));

    // 4. Accounts
    const qAccounts = query(collection(db, 'financial_accounts'), where('accountId', '==', uid));
    const unsubAccounts = onSnapshot(qAccounts, (snapshot) => {
      const list: FinancialAccount[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          organization_id: uid,
          name: d.name || '',
          type: d.type || 'cash',
          opening_balance: Number(d.opening_balance || 0),
          description: d.description || '',
          is_active: d.is_active !== false,
          created_at: d.created_at || '',
          updated_at: d.updated_at || '',
        });
      });
      setAccounts(list);
      try {
        localStorage.setItem('local_accounts', JSON.stringify(list));
      } catch {}
    }, (err) => handleFirestoreError(err, OperationType.GET, 'financial_accounts'));

    // 5. Incomes
    const qIncomes = query(collection(db, 'incomes'), where('accountId', '==', uid));
    const unsubIncomes = onSnapshot(qIncomes, (snapshot) => {
      const list: Income[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          organization_id: uid,
          account_id: d.account_id || '',
          category: d.category || '',
          program_id: d.program_id || '',
          date: d.date || '',
          amount: Number(d.amount || 0),
          source: d.source || '',
          description: d.description || '',
          receipt: d.receipt || '',
          reference_number: d.reference_number || '',
          created_by: d.created_by || '',
          created_at: d.created_at || '',
          updated_at: d.updated_at || '',
        });
      });
      setIncomes(list);
      try {
        localStorage.setItem('local_incomes', JSON.stringify(list));
      } catch {}
    }, (err) => handleFirestoreError(err, OperationType.GET, 'incomes'));

    // 6. Expenses
    const qExpenses = query(collection(db, 'expenses'), where('accountId', '==', uid));
    const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
      const list: Expense[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          organization_id: uid,
          account_id: d.account_id || '',
          category: d.category || '',
          program_id: d.program_id || '',
          date: d.date || '',
          amount: Number(d.amount || 0),
          paid_to: d.paid_to || '',
          description: d.description || '',
          receipt: d.receipt || '',
          reference_number: d.reference_number || '',
          created_by: d.created_by || '',
          created_at: d.created_at || '',
          updated_at: d.updated_at || '',
        });
      });
      setExpenses(list);
      try {
        localStorage.setItem('local_expenses', JSON.stringify(list));
      } catch {}
    }, (err) => handleFirestoreError(err, OperationType.GET, 'expenses'));

    // 7. Transfers
    const qTransfers = query(collection(db, 'transfers'), where('accountId', '==', uid));
    const unsubTransfers = onSnapshot(qTransfers, (snapshot) => {
      const list: AccountTransfer[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          organization_id: uid,
          from_account_id: d.from_account_id || '',
          to_account_id: d.to_account_id || '',
          amount: Number(d.amount || 0),
          date: d.date || '',
          description: d.description || '',
          reference_number: d.reference_number || '',
          created_by: d.created_by || '',
          created_at: d.created_at || '',
        });
      });
      setTransfers(list);
      try {
        localStorage.setItem('local_transfers', JSON.stringify(list));
      } catch {}
    }, (err) => handleFirestoreError(err, OperationType.GET, 'transfers'));

    // 8. Loans
    const qLoans = query(collection(db, 'loans'), where('accountId', '==', uid));
    const unsubLoans = onSnapshot(qLoans, (snapshot) => {
      const list: Loan[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          organization_id: uid,
          type: d.type || 'BORROWED',
          person_or_organization: d.person_or_organization || '',
          original_amount: Number(d.original_amount || 0),
          outstanding_amount: Number(d.outstanding_amount || 0),
          date: d.date || '',
          due_date: d.due_date || '',
          purpose: d.purpose || '',
          account_id: d.account_id || '',
          description: d.description || '',
          proof: d.proof || '',
          status: d.status || 'OUTSTANDING',
          created_by: d.created_by || '',
          created_at: d.created_at || '',
          updated_at: d.updated_at || '',
        });
      });
      setLoans(list);
      try {
        localStorage.setItem('local_loans', JSON.stringify(list));
      } catch {}
    }, (err) => handleFirestoreError(err, OperationType.GET, 'loans'));

    // 9. Repayments
    const qRepayments = query(collection(db, 'repayments'), where('accountId', '==', uid));
    const unsubRepayments = onSnapshot(qRepayments, (snapshot) => {
      const list: LoanRepayment[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          loan_id: d.loan_id || '',
          organization_id: uid,
          account_id: d.account_id || '',
          date: d.date || '',
          amount: Number(d.amount || 0),
          type: d.type || 'REPAY',
          description: d.description || '',
          proof: d.proof || '',
          created_by: d.created_by || '',
          created_at: d.created_at || '',
        });
      });
      setLoanRepayments(list);
      try {
        localStorage.setItem('local_repayments', JSON.stringify(list));
      } catch {}
    }, (err) => handleFirestoreError(err, OperationType.GET, 'repayments'));

    // 10. Sub-Wings
    const qSubWings = query(
      collection(db, 'sub_wings'),
      or(
        where('portalId', '==', uid),
        where('accountId', '==', uid)
      )
    );
    const unsubSubWings = onSnapshot(qSubWings, (snapshot) => {
      const list: SubWing[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          portalId: d.portalId || '',
          name: d.name || '',
          president: d.president || d.leader || '',
          contactDetails: d.contactDetails || d.contact_details || '',
          email: d.email || '',
          passwordHash: d.passwordHash || d.password_hash || '',
          description: d.description || '',
          status: d.status || 'pending',
          createdAt: d.createdAt || d.created_at || '',
        });
      });
      setSubWings(list);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'sub_wings'));

    // 11. Program Permissions
    const qPermissions = query(
      collection(db, 'program_permissions'),
      or(
        where('accountId', '==', uid),
        where('organizationId', '==', uid)
      )
    );
    const unsubProgramPermissions = onSnapshot(qPermissions, (snapshot) => {
      const list: ProgramPermission[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          programId: d.programId || '',
          organizationId: d.organizationId || d.accountId || uid,
          programName: d.programName || '',
          conductedBy: d.conductedBy || '',
          category: d.category || '',
          subCategory: d.subCategory || '',
          date: d.date || '',
          timeFrom: d.timeFrom || '',
          timeTill: d.timeTill || '',
          venue: d.venue || '',
          audience: d.audience || 'Students',
          resourcePerson: d.resourcePerson || '',
          expectedAttendance: d.expectedAttendance ? Number(d.expectedAttendance) : undefined,
          description: d.description || '',
          permissionNotes: d.permissionNotes || '',
          approvingAuthority: d.approvingAuthority || 'Principal',
          status: d.status || 'pending',
          submittedBy: d.submittedBy || undefined,
          recommendedBy: d.recommendedBy || undefined,
          approvedBy: d.approvedBy || undefined,
          approvedAt: d.approvedAt || undefined,
          approvalNotes: d.approvalNotes || undefined,
          approvalMethod: d.approvalMethod || undefined,
          approverDesignation: d.approverDesignation || undefined,
          rejectedBy: d.rejectedBy || undefined,
          rejectedAt: d.rejectedAt || undefined,
          rejectionReason: d.rejectionReason || undefined,
          changesRequestedBy: d.changesRequestedBy || undefined,
          changesRequestedAt: d.changesRequestedAt || undefined,
          changesRequiredNotes: d.changesRequiredNotes || undefined,
          approvalToken: d.approvalToken || undefined,
          tokenCreatedAt: d.tokenCreatedAt || undefined,
          tokenExpiresAt: d.tokenExpiresAt || undefined,
          tokenRevoked: Boolean(d.tokenRevoked),
          history: d.history || [],
          createdAt: d.createdAt || d.created_at || new Date().toISOString(),
          updatedAt: d.updatedAt || d.updated_at || new Date().toISOString(),
        });
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setProgramPermissions(list);
      try {
        localStorage.setItem('local_permissions', JSON.stringify(list));
      } catch {}
    }, (err) => handleFirestoreError(err, OperationType.GET, 'program_permissions'));

    return () => {
      unsubOrg();
      unsubOrganizers();
      unsubCategories();
      unsubPrograms();
      unsubAccounts();
      unsubIncomes();
      unsubExpenses();
      unsubTransfers();
      unsubLoans();
      unsubRepayments();
      unsubSubWings();
      unsubProgramPermissions();
    };
  }, [user?.id, isAuthenticated]);

  const currentOrg = organizations.find((o) => o.id === currentOrgId) || organizations[0] || {
    id: user?.id || 'offline_org',
    name: localStorage.getItem('last_org_name') || 'My Organization',
    college_name: 'Main Campus',
    logo: localStorage.getItem('last_org_logo') || '',
    tagline: 'Excellence in Action',
    established_year: '',
    description: '',
    email: user?.email || '',
    website: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Organization Mutations
  const addOrganization = async (orgData: Omit<Organization, 'id' | 'created_at' | 'updated_at'>): Promise<Organization> => {
    if (!user?.id) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const accountRef = doc(db, 'accounts', user.id);
    await updateDoc(accountRef, {
      updatedAt: now,
      profile: {
        name: orgData.name,
        college_name: orgData.college_name,
        tagline: orgData.tagline || '',
        logo: orgData.logo || '',
        established_year: orgData.established_year || '',
        description: orgData.description || '',
        email: orgData.email || user.email || '',
        website: orgData.website || '',
        about: orgData.about || '',
        academic_year: orgData.academic_year || '',
      },
    });
    return {
      id: user.id,
      ...orgData,
      created_at: now,
      updated_at: now,
    };
  };

  const updateOrganization = async (orgData: Partial<Organization> & { id: string }) => {
    if (!user?.id) return;
    const now = new Date().toISOString();
    const accountRef = doc(db, 'accounts', user.id);

    const newSearchableName = orgData.searchableName !== undefined
      ? orgData.searchableName.trim().toUpperCase()
      : (currentOrg?.searchableName || '');

    if (newSearchableName) {
      // 1. Direct O(1) check in public_organizations
      try {
        const pubSnap = await getDoc(doc(db, 'public_organizations', newSearchableName));
        if (pubSnap.exists()) {
          const pData = pubSnap.data();
          if (pData.accountId && pData.accountId !== user.id) {
            throw new Error('That searchable name is already in use. Please choose another.');
          }
        }
      } catch (pubErr: any) {
        if (pubErr.message?.includes('already in use')) throw pubErr;
      }

      // 2. Fallback check across accounts if permitted
      try {
        const querySnapshot = await getDocs(collection(db, 'accounts'));
        for (const docSnap of querySnapshot.docs) {
          if (docSnap.id !== user.id) {
            const accData = docSnap.data();
            const existingSearchName = (accData.profile?.searchableName || '').trim().toUpperCase();
            if (existingSearchName === newSearchableName) {
              throw new Error('That searchable name is already in use. Please choose another.');
            }
          }
        }
      } catch (accErr: any) {
        if (accErr.message?.includes('already in use')) throw accErr;
        console.warn('Accounts uniqueness check bypassed or restricted:', accErr);
      }
    }

    await updateDoc(accountRef, {
      updatedAt: now,
      profile: {
        name: orgData.name ?? currentOrg?.name,
        college_name: orgData.college_name ?? currentOrg?.college_name,
        tagline: orgData.tagline ?? currentOrg?.tagline,
        logo: orgData.logo ?? currentOrg?.logo,
        established_year: orgData.established_year ?? currentOrg?.established_year,
        description: orgData.description ?? currentOrg?.description,
        email: orgData.email ?? currentOrg?.email,
        website: orgData.website ?? currentOrg?.website,
        about: orgData.about ?? currentOrg?.about ?? '',
        academic_year: orgData.academic_year ?? currentOrg?.academic_year ?? '',
        searchableName: newSearchableName,
      },
    });

    if (newSearchableName) {
      try {
        await setDoc(doc(db, 'public_organizations', newSearchableName), {
          accountId: user.id,
          searchableName: newSearchableName,
          name: orgData.name ?? currentOrg?.name ?? 'Organization',
          college_name: orgData.college_name ?? currentOrg?.college_name ?? 'Main Campus',
          tagline: orgData.tagline ?? currentOrg?.tagline ?? '',
          logo: orgData.logo ?? currentOrg?.logo ?? '',
          established_year: orgData.established_year ?? currentOrg?.established_year ?? '',
          description: orgData.description ?? currentOrg?.description ?? '',
          email: orgData.email ?? currentOrg?.email ?? '',
          website: orgData.website ?? currentOrg?.website ?? '',
          about: orgData.about ?? currentOrg?.about ?? '',
          academic_year: orgData.academic_year ?? currentOrg?.academic_year ?? '',
          updatedAt: now,
        }, { merge: true });

        const oldSearchableName = (currentOrg?.searchableName || '').trim().toUpperCase();
        if (oldSearchableName && oldSearchableName !== newSearchableName) {
          await deleteDoc(doc(db, 'public_organizations', oldSearchableName)).catch(() => {});
        }
      } catch (err) {
        console.warn('Could not sync to public_organizations:', err);
      }
    }
  };

  const deleteOrganization = async () => {
    // No-op for main account org
  };

  // Organizer Mutations
  const addOrganizer = async (organizer: Omit<Organizer, 'id' | 'organization_id' | 'created_at' | 'updated_at'>): Promise<Organizer> => {
    if (!user?.id) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const generatedId = 'org_' + Date.now();
    const newOrganizer: Organizer = {
      id: generatedId,
      organization_id: user.id,
      ...organizer,
      created_at: now,
      updated_at: now,
    };

    setOrganizers((prev) => {
      const updated = [...prev, newOrganizer];
      try {
        localStorage.setItem('local_organizers', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await addDoc(collection(db, 'organizers'), {
        accountId: user.id,
        name: organizer.name,
        position: organizer.position,
        display_order: organizer.display_order ?? organizers.length + 1,
        photo: organizer.photo || '',
        email: organizer.email || '',
        phone: organizer.phone || '',
        bio: organizer.bio || '',
        academic_year: organizer.academic_year || '',
        created_at: now,
        updated_at: now,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'organizers');
    }
    return newOrganizer;
  };

  const updateOrganizer = async (organizer: Partial<Organizer> & { id: string }) => {
    if (!user?.id) return;
    const now = new Date().toISOString();

    setOrganizers((prev) => {
      const updated = prev.map((o) => o.id === organizer.id ? { ...o, ...organizer, updated_at: now } : o);
      try {
        localStorage.setItem('local_organizers', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      const docRef = doc(db, 'organizers', organizer.id);
      const { id, organization_id, ...updates } = organizer;
      await updateDoc(docRef, {
        ...updates,
        updated_at: now,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `organizers/${organizer.id}`);
    }
  };

  const deleteOrganizer = async (id: string) => {
    setOrganizers((prev) => {
      const updated = prev.filter((o) => o.id !== id);
      try {
        localStorage.setItem('local_organizers', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await deleteDoc(doc(db, 'organizers', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `organizers/${id}`);
    }
  };

  const reorderOrganizers = (reordered: Organizer[]) => {
    setOrganizers(reordered);
    reordered.forEach(async (item, idx) => {
      await updateDoc(doc(db, 'organizers', item.id), { display_order: idx + 1 });
    });
  };

  // Category Operations
  const ensureCategoryExists = async (categoryName: string): Promise<ProgramCategory | null> => {
    const trimmed = (categoryName || '').trim();
    if (!trimmed) return null;

    // Check if category already exists in memory (case-insensitive and trimmed)
    const existing = programCategories.find(
      (c) => (c.name || '').trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    if (!user?.id) {
      const tempCat: ProgramCategory = {
        id: 'cat_' + Date.now(),
        organization_id: 'guest',
        name: trimmed,
        created_at: now,
        updated_at: now,
      };
      setProgramCategories((prev) => [...prev, tempCat]);
      return tempCat;
    }

    try {
      const docRef = await addDoc(collection(db, 'program_categories'), {
        accountId: user.id,
        name: trimmed,
        createdAt: now,
        updatedAt: now,
      });
      const newCat: ProgramCategory = {
        id: docRef.id,
        organization_id: user.id,
        name: trimmed,
        created_at: now,
        updated_at: now,
      };
      setProgramCategories((prev) => {
        if (prev.some((c) => c.id === newCat.id || (c.name || '').trim().toLowerCase() === trimmed.toLowerCase())) {
          return prev;
        }
        const next = [...prev, newCat];
        return next.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
      });
      return newCat;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'program_categories');
      throw err;
    }
  };

  const addProgramCategory = async (name: string): Promise<ProgramCategory> => {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      throw new Error('Category name cannot be empty.');
    }
    const result = await ensureCategoryExists(trimmed);
    if (!result) {
      throw new Error('Failed to create category.');
    }
    return result;
  };

  // Program Mutations
  const addProgram = async (prog: Omit<Program, 'id' | 'organization_id' | 'created_at' | 'updated_at'>): Promise<Program> => {
    if (!user?.id) {
      throw new Error('You must be logged in to record a program.');
    }
    const now = new Date().toISOString();
    const uid = user.id;

    // Resolve category and category_id
    let resolvedCategoryId = prog.category_id || '';
    let resolvedCategoryName = (prog.category || '').trim();

    if (resolvedCategoryId && !resolvedCategoryName) {
      const match = programCategories.find((c) => c.id === resolvedCategoryId);
      if (match) resolvedCategoryName = match.name;
    } else if (resolvedCategoryName && !resolvedCategoryId) {
      const match = programCategories.find((c) => (c.name || '').trim().toLowerCase() === resolvedCategoryName.toLowerCase());
      if (match) {
        resolvedCategoryId = match.id;
        resolvedCategoryName = match.name;
      }
    }

    const formattedMedia = (prog.media || []).map((m, idx) => ({
      id: m.id || 'med_' + Date.now() + '_' + idx,
      program_id: '',
      type: m.type || 'photo',
      url: m.url || '',
      caption: m.caption || '',
      file_name: m.file_name || m.caption || '',
      created_at: m.created_at || now,
    }));

    const rawData = {
      accountId: uid,
      name: (prog.name || '').trim(),
      categoryId: resolvedCategoryId || '',
      category: resolvedCategoryName || '',
      subCategory: (prog.subCategory || '').trim() || '',
      date: prog.date || now.split('T')[0],
      time: prog.time || '',
      place: (prog.place || '').trim(),
      audience: prog.audience || 'Students',
      description: (prog.description || '').trim(),
      poster: prog.poster || '',
      media: formattedMedia,
      status: prog.status || determineProgramStatusByDate(prog.date || now.split('T')[0]),
      attendance_count: prog.attendance_count !== undefined && !isNaN(Number(prog.attendance_count)) ? Number(prog.attendance_count) : 0,
      resourcePerson: (prog.resourcePerson || '').trim(),
      created_at: now,
      updated_at: now,
    };

    const payload = cleanFirestorePayload(rawData);

    try {
      const docRef = await addDoc(collection(db, 'programs'), payload);

      const savedProg: Program = {
        id: docRef.id,
        organization_id: uid,
        name: rawData.name,
        category_id: rawData.categoryId || undefined,
        category: rawData.category || undefined,
        subCategory: rawData.subCategory || undefined,
        date: rawData.date,
        time: rawData.time,
        place: rawData.place,
        audience: rawData.audience,
        description: rawData.description,
        poster: rawData.poster,
        media: formattedMedia.map((m) => ({ ...m, program_id: docRef.id })),
        status: rawData.status,
        attendance_count: rawData.attendance_count,
        resourcePerson: rawData.resourcePerson,
        created_at: now,
        updated_at: now,
      };

      setPrograms((prev) => {
        const filtered = prev.filter((p) => p.id !== docRef.id);
        const updated = [savedProg, ...filtered];
        try {
          localStorage.setItem('local_programs', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      return savedProg;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'programs');
      throw err;
    }
  };

  const updateProgram = async (prog: Partial<Program> & { id: string }) => {
    if (!user?.id) {
      throw new Error('You must be logged in to update a program.');
    }
    const now = new Date().toISOString();

    // Resolve category and category_id if updated
    let resolvedCategoryId = prog.category_id;
    let resolvedCategoryName = prog.category !== undefined ? (prog.category || '').trim() : undefined;

    if (resolvedCategoryId && resolvedCategoryName === undefined) {
      const match = programCategories.find((c) => c.id === resolvedCategoryId);
      if (match) resolvedCategoryName = match.name;
    } else if (resolvedCategoryName && resolvedCategoryId === undefined) {
      const match = programCategories.find((c) => (c.name || '').trim().toLowerCase() === resolvedCategoryName!.toLowerCase());
      if (match) {
        resolvedCategoryId = match.id;
        resolvedCategoryName = match.name;
      }
    }

    const updatesToApply: Record<string, any> = {
      updated_at: now,
    };

    if (prog.name !== undefined) updatesToApply.name = (prog.name || '').trim();
    if (prog.date !== undefined) updatesToApply.date = prog.date;
    if (prog.time !== undefined) updatesToApply.time = prog.time;
    if (prog.place !== undefined) updatesToApply.place = (prog.place || '').trim();
    if (prog.audience !== undefined) updatesToApply.audience = prog.audience;
    if (prog.description !== undefined) updatesToApply.description = (prog.description || '').trim();
    if (prog.poster !== undefined) updatesToApply.poster = prog.poster;
    if (prog.media !== undefined) updatesToApply.media = prog.media;
    if (prog.status !== undefined) updatesToApply.status = prog.status;
    if (prog.resourcePerson !== undefined) updatesToApply.resourcePerson = (prog.resourcePerson || '').trim();
    if (prog.subCategory !== undefined) updatesToApply.subCategory = (prog.subCategory || '').trim() || '';
    if (prog.attendance_count !== undefined) {
      updatesToApply.attendance_count = isNaN(Number(prog.attendance_count)) ? 0 : Number(prog.attendance_count);
    }
    if (resolvedCategoryId !== undefined) {
      updatesToApply.categoryId = resolvedCategoryId || '';
      updatesToApply.category_id = resolvedCategoryId || '';
    }
    if (resolvedCategoryName !== undefined) {
      updatesToApply.category = resolvedCategoryName || '';
    }

    const payload = cleanFirestorePayload(updatesToApply);

    setPrograms((prev) => {
      const updated = prev.map((p) => (p.id === prog.id ? { ...p, ...prog, updated_at: now } : p));
      try {
        localStorage.setItem('local_programs', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      const docRef = doc(db, 'programs', prog.id);
      await updateDoc(docRef, payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `programs/${prog.id}`);
      throw err;
    }
  };

  const deleteProgram = async (id: string) => {
    if (!user?.id) throw new Error('Not authenticated');

    setPrograms((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem('local_programs', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await deleteDoc(doc(db, 'programs', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `programs/${id}`);
      throw err;
    }
  };

  const addProgramMedia = async (programId: string, mediaItem: Omit<ProgramMedia, 'id' | 'program_id' | 'created_at'>) => {
    if (!user?.id) throw new Error('Not authenticated');

    const now = new Date().toISOString();
    const newMedia: ProgramMedia = {
      id: 'med_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      program_id: programId,
      type: mediaItem.type || 'photo',
      url: mediaItem.url || '',
      caption: mediaItem.caption || '',
      file_name: mediaItem.file_name || mediaItem.caption || '',
      created_at: now,
    };

    const docRef = doc(db, 'programs', programId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const currentData = docSnap.data();
      const existingMedia: ProgramMedia[] = currentData.media || [];
      const updatedMedia = [...existingMedia, newMedia];
      await updateDoc(docRef, cleanFirestorePayload({ media: updatedMedia, updated_at: now }));

      setPrograms((prev) => {
        return prev.map((p) => (p.id === programId ? { ...p, media: updatedMedia, updated_at: now } : p));
      });
    }
  };

  const deleteProgramMedia = async (programId: string, mediaId: string) => {
    if (!user?.id) throw new Error('Not authenticated');

    const now = new Date().toISOString();
    const docRef = doc(db, 'programs', programId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const currentData = docSnap.data();
      const existingMedia: ProgramMedia[] = currentData.media || [];
      const updatedMedia = existingMedia.filter((m) => m.id !== mediaId);
      await updateDoc(docRef, cleanFirestorePayload({ media: updatedMedia, updated_at: now }));

      setPrograms((prev) => {
        return prev.map((p) => (p.id === programId ? { ...p, media: updatedMedia, updated_at: now } : p));
      });
    }
  };

  // Program Permissions Mutation Handlers
  const getProgramPermission = (programId: string): ProgramPermission | undefined => {
    return programPermissions.find((p) => p.programId === programId);
  };

  const requestProgramPermission = async (
    perm: Omit<ProgramPermission, 'id' | 'createdAt' | 'updatedAt' | 'history'>
  ): Promise<ProgramPermission> => {
    if (!user?.id) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const autoToken = perm.approvalToken || generateSecurePermissionToken();

    const historyItem: PermissionHistoryItem = {
      id: 'hist_' + Date.now(),
      timestamp: now,
      status: perm.status || 'pending',
      action: perm.status === 'draft' ? 'Permission request saved as draft' : 'Permission request submitted for college approval',
      actorName: perm.submittedBy?.name || user.email || 'Organizer',
      actorRole: perm.submittedBy?.designation || 'Program Coordinator',
      notes: perm.permissionNotes || '',
    };

    const rawData = {
      ...perm,
      approvalToken: autoToken,
      tokenCreatedAt: now,
      tokenExpiresAt: expiresAt,
      tokenRevoked: false,
      organizationId: user.id,
      accountId: user.id,
      status: perm.status || 'pending',
      history: [historyItem],
      createdAt: now,
      updatedAt: now,
    };

    const payload = cleanFirestorePayload(rawData);

    try {
      const docRef = await addDoc(collection(db, 'program_permissions'), payload);
      const savedPerm: ProgramPermission = {
        ...rawData,
        id: docRef.id,
      };

      setProgramPermissions((prev) => [savedPerm, ...prev.filter((p) => p.id !== docRef.id)]);
      try {
        localStorage.setItem(
          'local_permissions',
          JSON.stringify([savedPerm, ...programPermissions.filter((p) => p.id !== docRef.id)])
        );
      } catch {}

      // Sync with Program record
      if (perm.programId) {
        await updateDoc(doc(db, 'programs', perm.programId), {
          permissionStatus: perm.status || 'pending',
          permissionId: docRef.id,
        }).catch((err) => console.warn('Could not update program permission status:', err));

        setPrograms((prev) =>
          prev.map((p) =>
            p.id === perm.programId
              ? { ...p, permissionStatus: perm.status || 'pending', permissionId: docRef.id }
              : p
          )
        );
      }

      return savedPerm;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'program_permissions');
      throw err;
    }
  };

  const updateProgramPermission = async (
    id: string,
    updates: Partial<ProgramPermission>,
    historyAction?: { action: string; actorName: string; actorRole: string; notes?: string }
  ) => {
    if (!user?.id) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const target = programPermissions.find((p) => p.id === id);
    let updatedHistory = target?.history || [];

    if (historyAction) {
      const historyItem: PermissionHistoryItem = {
        id: 'hist_' + Date.now(),
        timestamp: now,
        status: updates.status || target?.status || 'pending',
        action: historyAction.action,
        actorName: historyAction.actorName,
        actorRole: historyAction.actorRole,
        notes: historyAction.notes || '',
      };
      updatedHistory = [...updatedHistory, historyItem];
    }

    const payload = cleanFirestorePayload({
      ...updates,
      history: updatedHistory,
      updatedAt: now,
    });

    setProgramPermissions((prev) => {
      const updated = prev.map((p) =>
        p.id === id ? { ...p, ...updates, history: updatedHistory, updatedAt: now } : p
      );
      try {
        localStorage.setItem('local_permissions', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await updateDoc(doc(db, 'program_permissions', id), payload);

      // Sync status to program
      const programId = updates.programId || target?.programId;
      if (programId && updates.status) {
        await updateDoc(doc(db, 'programs', programId), {
          permissionStatus: updates.status,
        }).catch(() => {});

        setPrograms((prev) =>
          prev.map((p) => (p.id === programId ? { ...p, permissionStatus: updates.status } : p))
        );
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `program_permissions/${id}`);
      throw err;
    }
  };

  const recommendProgramPermission = async (
    id: string,
    recommenderName: string,
    designation: string,
    notes?: string
  ) => {
    const now = new Date().toISOString();
    await updateProgramPermission(
      id,
      {
        status: 'recommended',
        recommendedBy: {
          name: recommenderName,
          designation: designation || 'Faculty Coordinator',
          date: now,
          notes: notes || '',
        },
      },
      {
        action: `Recommended by ${designation || 'Faculty Coordinator'} (${recommenderName})`,
        actorName: recommenderName,
        actorRole: designation || 'Faculty Coordinator',
        notes,
      }
    );
  };

  const approveProgramPermission = async (
    id: string,
    approverName: string,
    notes?: string
  ) => {
    const now = new Date().toISOString();
    await updateProgramPermission(
      id,
      {
        status: 'approved',
        approvedBy: approverName,
        approvedAt: now,
        approvalNotes: notes || '',
      },
      {
        action: `Approved by ${approverName}`,
        actorName: approverName,
        actorRole: 'Approving Authority',
        notes,
      }
    );
  };

  const rejectProgramPermission = async (
    id: string,
    rejecterName: string,
    reason: string
  ) => {
    const now = new Date().toISOString();
    await updateProgramPermission(
      id,
      {
        status: 'rejected',
        rejectedBy: rejecterName,
        rejectedAt: now,
        rejectionReason: reason,
      },
      {
        action: `Rejected by ${rejecterName} - Reason: ${reason}`,
        actorName: rejecterName,
        actorRole: 'Approving Authority',
        notes: reason,
      }
    );
  };

  const requestPermissionChanges = async (
    id: string,
    reviewerName: string,
    notes: string
  ) => {
    const now = new Date().toISOString();
    await updateProgramPermission(
      id,
      {
        status: 'changes_required',
        changesRequestedBy: reviewerName,
        changesRequestedAt: now,
        changesRequiredNotes: notes,
      },
      {
        action: `Changes requested by ${reviewerName} - Notes: ${notes}`,
        actorName: reviewerName,
        actorRole: 'Reviewing Authority',
        notes,
      }
    );
  };

  const generatePermissionApprovalToken = async (
    permissionId: string
  ): Promise<{ token: string; url: string }> => {
    const newToken = generateSecurePermissionToken();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    await updateProgramPermission(
      permissionId,
      {
        approvalToken: newToken,
        tokenCreatedAt: now,
        tokenExpiresAt: expiresAt,
        tokenRevoked: false,
      },
      {
        action: 'Public Principal approval link generated',
        actorName: user?.email || 'Admin',
        actorRole: 'Administrative Authority',
        notes: 'Secure WhatsApp / Public approval link generated',
      }
    );

    return {
      token: newToken,
      url: getPublicApprovalUrl(newToken),
    };
  };

  const deleteProgramPermission = async (id: string) => {
    if (!user?.id) throw new Error('Not authenticated');
    const target = programPermissions.find((p) => p.id === id);
    try {
      await deleteDoc(doc(db, 'program_permissions', id));
      setProgramPermissions((prev) => {
        const filtered = prev.filter((p) => p.id !== id);
        try {
          localStorage.setItem('local_permissions', JSON.stringify(filtered));
        } catch {}
        return filtered;
      });

      if (target?.programId) {
        await updateDoc(doc(db, 'programs', target.programId), {
          permissionStatus: 'not_requested',
          permissionId: null,
        }).catch(() => {});

        setPrograms((prev) =>
          prev.map((p) =>
            p.id === target.programId
              ? { ...p, permissionStatus: 'not_requested', permissionId: undefined }
              : p
          )
        );
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `program_permissions/${id}`);
      throw err;
    }
  };

  // Financial Account Mutations
  const addAccount = async (acc: Omit<FinancialAccount, 'id' | 'organization_id' | 'created_at' | 'updated_at'>): Promise<FinancialAccount> => {
    if (!user?.id) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const generatedId = 'acc_' + Date.now();
    const newAccount: FinancialAccount = {
      id: generatedId,
      organization_id: user.id,
      name: acc.name,
      type: acc.type || 'cash',
      opening_balance: Number(acc.opening_balance || 0),
      description: acc.description || '',
      is_active: acc.is_active !== false,
      created_at: now,
      updated_at: now,
    };

    setAccounts((prev) => {
      const updated = [newAccount, ...prev];
      try {
        localStorage.setItem('local_accounts', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await addDoc(collection(db, 'financial_accounts'), {
        accountId: user.id,
        name: acc.name,
        type: acc.type || 'cash',
        opening_balance: Number(acc.opening_balance || 0),
        description: acc.description || '',
        is_active: acc.is_active !== false,
        created_at: now,
        updated_at: now,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'financial_accounts');
    }
    return newAccount;
  };

  const updateAccount = async (acc: Partial<FinancialAccount> & { id: string }) => {
    if (!user?.id) return;
    const now = new Date().toISOString();

    setAccounts((prev) => {
      const updated = prev.map((a) => a.id === acc.id ? { ...a, ...acc, updated_at: now } : a);
      try {
        localStorage.setItem('local_accounts', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      const docRef = doc(db, 'financial_accounts', acc.id);
      const { id, organization_id, ...updates } = acc;
      await updateDoc(docRef, {
        ...updates,
        updated_at: now,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `financial_accounts/${acc.id}`);
    }
  };

  const deleteAccount = async (id: string): Promise<boolean> => {
    setAccounts((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      try {
        localStorage.setItem('local_accounts', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await deleteDoc(doc(db, 'financial_accounts', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `financial_accounts/${id}`);
    }
    return true;
  };

  // Income Mutations
  const addIncome = async (inc: Omit<Income, 'id' | 'organization_id' | 'created_at' | 'updated_at'>): Promise<Income> => {
    if (!user?.id) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const generatedId = 'inc_' + Date.now();
    const newIncome: Income = {
      id: generatedId,
      organization_id: user.id,
      account_id: inc.account_id,
      category: inc.category,
      program_id: inc.program_id || '',
      date: inc.date,
      amount: Number(inc.amount),
      source: inc.source,
      description: inc.description || '',
      receipt: inc.receipt || '',
      reference_number: inc.reference_number || '',
      created_by: user.email || 'admin',
      created_at: now,
      updated_at: now,
    };

    setIncomes((prev) => {
      const updated = [newIncome, ...prev];
      try {
        localStorage.setItem('local_incomes', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await addDoc(collection(db, 'incomes'), {
        accountId: user.id,
        account_id: inc.account_id,
        category: inc.category,
        program_id: inc.program_id || '',
        date: inc.date,
        amount: Number(inc.amount),
        source: inc.source,
        description: inc.description || '',
        receipt: inc.receipt || '',
        reference_number: inc.reference_number || '',
        created_by: user.email || 'admin',
        created_at: now,
        updated_at: now,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'incomes');
    }
    return newIncome;
  };

  const updateIncome = async (inc: Partial<Income> & { id: string }) => {
    if (!user?.id) return;
    const now = new Date().toISOString();

    setIncomes((prev) => {
      const updated = prev.map((i) => i.id === inc.id ? { ...i, ...inc, updated_at: now } : i);
      try {
        localStorage.setItem('local_incomes', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      const docRef = doc(db, 'incomes', inc.id);
      const { id, organization_id, ...updates } = inc;
      await updateDoc(docRef, {
        ...updates,
        updated_at: now,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `incomes/${inc.id}`);
    }
  };

  const deleteIncome = async (id: string) => {
    setIncomes((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      try {
        localStorage.setItem('local_incomes', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await deleteDoc(doc(db, 'incomes', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `incomes/${id}`);
    }
  };

  // Expense Mutations
  const addExpense = async (exp: Omit<Expense, 'id' | 'organization_id' | 'created_at' | 'updated_at'>): Promise<Expense> => {
    if (!user?.id) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const generatedId = 'exp_' + Date.now();
    const newExpense: Expense = {
      id: generatedId,
      organization_id: user.id,
      account_id: exp.account_id,
      category: exp.category,
      program_id: exp.program_id || '',
      date: exp.date,
      amount: Number(exp.amount),
      paid_to: exp.paid_to,
      description: exp.description || '',
      receipt: exp.receipt || '',
      reference_number: exp.reference_number || '',
      created_by: user.email || 'admin',
      created_at: now,
      updated_at: now,
    };

    setExpenses((prev) => {
      const updated = [newExpense, ...prev];
      try {
        localStorage.setItem('local_expenses', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await addDoc(collection(db, 'expenses'), {
        accountId: user.id,
        account_id: exp.account_id,
        category: exp.category,
        program_id: exp.program_id || '',
        date: exp.date,
        amount: Number(exp.amount),
        paid_to: exp.paid_to,
        description: exp.description || '',
        receipt: exp.receipt || '',
        reference_number: exp.reference_number || '',
        created_by: user.email || 'admin',
        created_at: now,
        updated_at: now,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'expenses');
    }
    return newExpense;
  };

  const updateExpense = async (exp: Partial<Expense> & { id: string }) => {
    if (!user?.id) return;
    const now = new Date().toISOString();

    setExpenses((prev) => {
      const updated = prev.map((e) => e.id === exp.id ? { ...e, ...exp, updated_at: now } : e);
      try {
        localStorage.setItem('local_expenses', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      const docRef = doc(db, 'expenses', exp.id);
      const { id, organization_id, ...updates } = exp;
      await updateDoc(docRef, {
        ...updates,
        updated_at: now,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `expenses/${exp.id}`);
    }
  };

  const deleteExpense = async (id: string) => {
    setExpenses((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      try {
        localStorage.setItem('local_expenses', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `expenses/${id}`);
    }
  };

  // Transfer Mutations
  const addTransfer = async (tr: Omit<AccountTransfer, 'id' | 'organization_id' | 'created_at'>): Promise<AccountTransfer> => {
    if (!user?.id) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'transfers'), {
      accountId: user.id,
      from_account_id: tr.from_account_id,
      to_account_id: tr.to_account_id,
      amount: Number(tr.amount),
      date: tr.date,
      description: tr.description || '',
      reference_number: tr.reference_number || '',
      created_by: user.email || 'admin',
      created_at: now,
    });
    return {
      id: docRef.id,
      organization_id: user.id,
      ...tr,
      created_at: now,
    };
  };

  const deleteTransfer = async (id: string) => {
    await deleteDoc(doc(db, 'transfers', id));
  };

  // Loan Mutations
  const addLoan = async (loan: Omit<Loan, 'id' | 'organization_id' | 'outstanding_amount' | 'status' | 'created_at' | 'updated_at'>): Promise<Loan> => {
    if (!user?.id) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'loans'), {
      accountId: user.id,
      type: loan.type,
      person_or_organization: loan.person_or_organization,
      original_amount: Number(loan.original_amount),
      outstanding_amount: Number(loan.original_amount),
      date: loan.date,
      due_date: loan.due_date || '',
      purpose: loan.purpose,
      account_id: loan.account_id,
      description: loan.description || '',
      proof: loan.proof || '',
      status: 'OUTSTANDING',
      created_by: user.email || 'admin',
      created_at: now,
      updated_at: now,
    });
    return {
      id: docRef.id,
      organization_id: user.id,
      outstanding_amount: Number(loan.original_amount),
      status: 'OUTSTANDING',
      ...loan,
      created_at: now,
      updated_at: now,
    };
  };

  const updateLoan = async (loan: Partial<Loan> & { id: string }) => {
    if (!user?.id) return;
    const now = new Date().toISOString();
    const docRef = doc(db, 'loans', loan.id);
    const { id, organization_id, ...updates } = loan;
    await updateDoc(docRef, {
      ...updates,
      updated_at: now,
    });
  };

  const deleteLoan = async (id: string) => {
    await deleteDoc(doc(db, 'loans', id));
  };

  // Loan Repayment Mutations
  const addLoanRepayment = async (rep: Omit<LoanRepayment, 'id' | 'organization_id' | 'created_at'>): Promise<LoanRepayment> => {
    if (!user?.id) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'repayments'), {
      accountId: user.id,
      loan_id: rep.loan_id,
      account_id: rep.account_id,
      date: rep.date,
      amount: Number(rep.amount),
      type: rep.type,
      description: rep.description || '',
      proof: rep.proof || '',
      created_by: user.email || 'admin',
      created_at: now,
    });

    // Recalculate loan outstanding amount
    const targetLoan = loans.find((l) => l.id === rep.loan_id);
    if (targetLoan) {
      const newOutstanding = Math.max(0, targetLoan.outstanding_amount - Number(rep.amount));
      let newStatus = targetLoan.status;
      if (newOutstanding === 0) {
        newStatus = rep.type === 'REPAY' ? 'FULLY_PAID' : 'FULLY_RECOVERED';
      } else {
        newStatus = rep.type === 'REPAY' ? 'PARTIALLY_PAID' : 'PARTIALLY_RECOVERED';
      }
      await updateLoan({
        id: rep.loan_id,
        outstanding_amount: newOutstanding,
        status: newStatus,
      });
    }

    return {
      id: docRef.id,
      organization_id: user.id,
      ...rep,
      created_at: now,
    };
  };

  const deleteLoanRepayment = async (id: string) => {
    await deleteDoc(doc(db, 'repayments', id));
  };

  const viewProgramDetails = (id: string) => {
    setSelectedProgramId(id);
    setActiveTab('program_details');
  };

  const resetToDemoData = () => {
    // Demo reset not applicable in Firebase production mode
  };

  const exportDataJson = () => {
    return JSON.stringify(
      {
        organization: currentOrg,
        organizers,
        programCategories,
        programs,
        accounts,
        incomes,
        expenses,
        transfers,
        loans,
        loanRepayments,
      },
      null,
      2
    );
  };

  const importDataJson = () => {
    return false;
  };

  const hasConfiguredOrg = organizations.length > 0 && organizations.some((o) => o.isInitialized);

  return (
    <AppContext.Provider
      value={{
        token,
        user,
        authLoading,
        orgLoading,
        isAuthenticated,
        hasConfiguredOrg,
        loginUser,
        logoutUser,

        organizations,
        currentOrg,
        currentOrgId,
        setCurrentOrgId,
        addOrganization,
        updateOrganization,
        deleteOrganization,

        organizers,
        allOrganizers: organizers,
        addOrganizer,
        updateOrganizer,
        deleteOrganizer,
        reorderOrganizers,

        programs,
        allPrograms: programs,
        programCategories,
        addProgram,
        updateProgram,
        deleteProgram,
        addProgramMedia,
        deleteProgramMedia,
        addProgramCategory,
        ensureCategoryExists,
        subWings,
        subWingPrograms,
        setSubWings,

        accounts,
        allAccounts: accounts,
        addAccount,
        updateAccount,
        deleteAccount,

        incomes,
        allIncomes: incomes,
        addIncome,
        updateIncome,
        deleteIncome,

        expenses,
        allExpenses: expenses,
        addExpense,
        updateExpense,
        deleteExpense,

        transfers,
        allTransfers: transfers,
        addTransfer,
        deleteTransfer,

        loans,
        allLoans: loans,
        addLoan,
        updateLoan,
        deleteLoan,

        loanRepayments,
        allLoanRepayments: loanRepayments,
        addLoanRepayment,
        deleteLoanRepayment,

        auditLogs,
        allAuditLogs: auditLogs,

        // Program Permissions
        programPermissions,
        allProgramPermissions: programPermissions,
        getProgramPermission,
        requestProgramPermission,
        updateProgramPermission,
        recommendProgramPermission,
        approveProgramPermission,
        rejectProgramPermission,
        requestPermissionChanges,
        generatePermissionApprovalToken,
        deleteProgramPermission,

        activeTab,
        setActiveTab,
        selectedProgramId,
        setSelectedProgramId,
        viewProgramDetails,

        isAdmin,
        setIsAdmin,
        adminPin,
        setAdminPin,

        showOnboarding,
        setShowOnboarding,
        resetToDemoData,
        exportDataJson,
        importDataJson,
        isQuotaExceeded,
        isPublicView,
        exitPublicView,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
