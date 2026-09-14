import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  getDocFromServer,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import {
  AuthUser,
  Organization,
  Organizer,
  Program,
  ProgramMedia,
  ActiveTab,
  FinancialAccount,
  Income,
  Expense,
  AccountTransfer,
  Loan,
  LoanRepayment,
  AuditLog,
} from '../types';

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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path,
  };
  console.error('Firestore Operation Failed:', JSON.stringify(errInfo));
}

interface AppContextType {
  token: string | null;
  user: AuthUser | null;
  authLoading: boolean;
  isAuthenticated: boolean;
  loginUser: (token: string, user: AuthUser) => void;
  logoutUser: () => Promise<void>;

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
  addProgram: (prog: Omit<Program, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => Promise<Program>;
  updateProgram: (prog: Partial<Program> & { id: string }) => Promise<void>;
  deleteProgram: (id: string) => Promise<void>;
  addProgramMedia: (programId: string, mediaItem: Omit<ProgramMedia, 'id' | 'program_id' | 'created_at'>) => Promise<void>;
  deleteProgramMedia: (programId: string, mediaId: string) => Promise<void>;

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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string>('');

  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [programs, setPrograms] = useState<Program[]>(() => {
    try {
      const cached = localStorage.getItem('local_programs');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transfers, setTransfers] = useState<AccountTransfer[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanRepayments, setLoanRepayments] = useState<LoanRepayment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(true);
  const [adminPin, setAdminPin] = useState<string>('1234');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

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
              },
            });
          }
        } catch (err) {
          console.error('Error handling Firebase auth state:', err);
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
        };
        setOrganizations([orgObj]);
        setCurrentOrgId(uid);

        if (profile.logo) localStorage.setItem('last_org_logo', profile.logo);
        if (profile.name) localStorage.setItem('last_org_name', profile.name);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `accounts/${uid}`));

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
      setOrganizers(list.sort((a, b) => a.display_order - b.display_order));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'organizers'));

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
          category: d.category || '',
          date: d.date || '',
          time: d.time || '',
          place: d.place || '',
          audience: d.audience || '',
          description: d.description || '',
          poster: d.poster || '',
          media: d.media || [],
          status: d.status || 'completed',
          attendance_count: d.attendance_count || 0,
          created_at: d.created_at || '',
          updated_at: d.updated_at || '',
        });
      });
      list.sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
      setPrograms(list);
      try {
        localStorage.setItem('local_programs', JSON.stringify(list));
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
    }, (err) => handleFirestoreError(err, OperationType.GET, 'repayments'));

    return () => {
      unsubOrg();
      unsubOrganizers();
      unsubPrograms();
      unsubAccounts();
      unsubIncomes();
      unsubExpenses();
      unsubTransfers();
      unsubLoans();
      unsubRepayments();
    };
  }, [user?.id, isAuthenticated]);

  const currentOrg = organizations.find((o) => o.id === currentOrgId) || organizations[0];

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
      },
    });
  };

  const deleteOrganization = async () => {
    // No-op for main account org
  };

  // Organizer Mutations
  const addOrganizer = async (organizer: Omit<Organizer, 'id' | 'organization_id' | 'created_at' | 'updated_at'>): Promise<Organizer> => {
    if (!user?.id) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'organizers'), {
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
    return {
      id: docRef.id,
      organization_id: user.id,
      ...organizer,
      created_at: now,
      updated_at: now,
    };
  };

  const updateOrganizer = async (organizer: Partial<Organizer> & { id: string }) => {
    if (!user?.id) return;
    const now = new Date().toISOString();
    const docRef = doc(db, 'organizers', organizer.id);
    const { id, organization_id, ...updates } = organizer;
    await updateDoc(docRef, {
      ...updates,
      updated_at: now,
    });
  };

  const deleteOrganizer = async (id: string) => {
    await deleteDoc(doc(db, 'organizers', id));
  };

  const reorderOrganizers = (reordered: Organizer[]) => {
    setOrganizers(reordered);
    reordered.forEach(async (item, idx) => {
      await updateDoc(doc(db, 'organizers', item.id), { display_order: idx + 1 });
    });
  };

  // Program Mutations
  const addProgram = async (prog: Omit<Program, 'id' | 'organization_id' | 'created_at' | 'updated_at'>): Promise<Program> => {
    const now = new Date().toISOString();
    const uid = user?.id || 'main_account';
    const tempId = 'prog_' + Date.now();
    const newProg: Program = {
      id: tempId,
      organization_id: uid,
      name: prog.name,
      category: prog.category || 'General',
      date: prog.date || now.split('T')[0],
      time: prog.time || '',
      place: prog.place || '',
      audience: prog.audience || 'Students',
      description: prog.description || '',
      poster: prog.poster || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1000&auto=format&fit=crop&q=80',
      media: prog.media || [],
      status: prog.status || 'completed',
      attendance_count: prog.attendance_count || 0,
      created_at: now,
      updated_at: now,
    };

    // Immediate optimistic update to React state and localStorage
    setPrograms((prev) => {
      const updated = [newProg, ...prev.filter((p) => p.id !== tempId)];
      try {
        localStorage.setItem('local_programs', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (user?.id) {
      try {
        const docRef = await addDoc(collection(db, 'programs'), {
          accountId: user.id,
          name: newProg.name,
          category: newProg.category,
          date: newProg.date,
          time: newProg.time,
          place: newProg.place,
          audience: newProg.audience,
          description: newProg.description,
          poster: newProg.poster,
          media: newProg.media,
          status: newProg.status,
          attendance_count: newProg.attendance_count,
          created_at: now,
          updated_at: now,
        });

        const savedProg: Program = { ...newProg, id: docRef.id };
        setPrograms((prev) => {
          const updated = prev.map((p) => (p.id === tempId ? savedProg : p));
          try {
            localStorage.setItem('local_programs', JSON.stringify(updated));
          } catch {}
          return updated;
        });
        return savedProg;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'programs');
      }
    }
    return newProg;
  };

  const updateProgram = async (prog: Partial<Program> & { id: string }) => {
    const now = new Date().toISOString();
    setPrograms((prev) => {
      const updated = prev.map((p) => (p.id === prog.id ? { ...p, ...prog, updated_at: now } : p));
      try {
        localStorage.setItem('local_programs', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (user?.id) {
      try {
        const docRef = doc(db, 'programs', prog.id);
        const { id, organization_id, ...updates } = prog;
        await updateDoc(docRef, {
          ...updates,
          updated_at: now,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `programs/${prog.id}`);
      }
    }
  };

  const deleteProgram = async (id: string) => {
    setPrograms((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem('local_programs', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (user?.id) {
      try {
        await deleteDoc(doc(db, 'programs', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `programs/${id}`);
      }
    }
  };

  const addProgramMedia = async (programId: string, mediaItem: Omit<ProgramMedia, 'id' | 'program_id' | 'created_at'>) => {
    const targetProg = programs.find((p) => p.id === programId);
    if (!targetProg) return;

    const newMedia: ProgramMedia = {
      id: 'med_' + Date.now(),
      program_id: programId,
      ...mediaItem,
      created_at: new Date().toISOString(),
    };

    const updatedMedia = [...(targetProg.media || []), newMedia];
    await updateProgram({ id: programId, media: updatedMedia });
  };

  const deleteProgramMedia = async (programId: string, mediaId: string) => {
    const targetProg = programs.find((p) => p.id === programId);
    if (!targetProg) return;

    const updatedMedia = (targetProg.media || []).filter((m) => m.id !== mediaId);
    await updateProgram({ id: programId, media: updatedMedia });
  };

  // Financial Account Mutations
  const addAccount = async (acc: Omit<FinancialAccount, 'id' | 'organization_id' | 'created_at' | 'updated_at'>): Promise<FinancialAccount> => {
    if (!user?.id) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'financial_accounts'), {
      accountId: user.id,
      name: acc.name,
      type: acc.type || 'cash',
      opening_balance: Number(acc.opening_balance || 0),
      description: acc.description || '',
      is_active: acc.is_active !== false,
      created_at: now,
      updated_at: now,
    });
    return {
      id: docRef.id,
      organization_id: user.id,
      ...acc,
      created_at: now,
      updated_at: now,
    };
  };

  const updateAccount = async (acc: Partial<FinancialAccount> & { id: string }) => {
    if (!user?.id) return;
    const now = new Date().toISOString();
    const docRef = doc(db, 'financial_accounts', acc.id);
    const { id, organization_id, ...updates } = acc;
    await updateDoc(docRef, {
      ...updates,
      updated_at: now,
    });
  };

  const deleteAccount = async (id: string): Promise<boolean> => {
    await deleteDoc(doc(db, 'financial_accounts', id));
    return true;
  };

  // Income Mutations
  const addIncome = async (inc: Omit<Income, 'id' | 'organization_id' | 'created_at' | 'updated_at'>): Promise<Income> => {
    if (!user?.id) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'incomes'), {
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
    return {
      id: docRef.id,
      organization_id: user.id,
      ...inc,
      created_at: now,
      updated_at: now,
    };
  };

  const updateIncome = async (inc: Partial<Income> & { id: string }) => {
    if (!user?.id) return;
    const now = new Date().toISOString();
    const docRef = doc(db, 'incomes', inc.id);
    const { id, organization_id, ...updates } = inc;
    await updateDoc(docRef, {
      ...updates,
      updated_at: now,
    });
  };

  const deleteIncome = async (id: string) => {
    await deleteDoc(doc(db, 'incomes', id));
  };

  // Expense Mutations
  const addExpense = async (exp: Omit<Expense, 'id' | 'organization_id' | 'created_at' | 'updated_at'>): Promise<Expense> => {
    if (!user?.id) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'expenses'), {
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
    return {
      id: docRef.id,
      organization_id: user.id,
      ...exp,
      created_at: now,
      updated_at: now,
    };
  };

  const updateExpense = async (exp: Partial<Expense> & { id: string }) => {
    if (!user?.id) return;
    const now = new Date().toISOString();
    const docRef = doc(db, 'expenses', exp.id);
    const { id, organization_id, ...updates } = exp;
    await updateDoc(docRef, {
      ...updates,
      updated_at: now,
    });
  };

  const deleteExpense = async (id: string) => {
    await deleteDoc(doc(db, 'expenses', id));
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

  return (
    <AppContext.Provider
      value={{
        token,
        user,
        authLoading,
        isAuthenticated,
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
        addProgram,
        updateProgram,
        deleteProgram,
        addProgramMedia,
        deleteProgramMedia,

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
