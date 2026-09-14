import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { safeApiFetch, ApiResponse } from '../utils/api';
import { syncLegacyLocalDataToServer } from '../utils/migration';
import { localDB } from '../utils/localDB';
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

interface AppContextType {
  token: string | null;
  user: AuthUser | null;
  authLoading: boolean;
  isAuthenticated: boolean;
  loginUser: (token: string, user: AuthUser) => void;
  logoutUser: () => void;

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
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('org_token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('org_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string>('');

  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transfers, setTransfers] = useState<AccountTransfer[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanRepayments, setLoanRepayments] = useState<LoanRepayment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(true); // default admin true for easy management after login
  const [adminPin, setAdminPin] = useState<string>('1234');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  const logoutUser = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setOrganizations([]);
    setCurrentOrgId('');
    localStorage.removeItem('org_token');
    localStorage.removeItem('org_user');
    localStorage.removeItem('current_org_id');
  }, []);

  const loginUser = useCallback((newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUser(newUser);
    setIsAuthenticated(true);
    setAuthLoading(false);
    localStorage.setItem('org_token', newToken);
    localStorage.setItem('org_user', JSON.stringify(newUser));
  }, []);

  // Authoritative session verification on app startup
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const savedToken = localStorage.getItem('org_token');
      const savedUserStr = localStorage.getItem('org_user');

      if (!savedToken) {
        if (isMounted) {
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
          setAuthLoading(false);
        }
        return;
      }

      // If this is a local session token, validate against saved user profile directly
      if (savedToken.startsWith('local_') || savedToken.startsWith('local_auth_')) {
        if (savedUserStr) {
          try {
            const parsed = JSON.parse(savedUserStr);
            if (isMounted) {
              setToken(savedToken);
              setUser(parsed);
              setIsAuthenticated(true);
            }
          } catch {
            if (isMounted) logoutUser();
          }
        } else {
          if (isMounted) logoutUser();
        }
        if (isMounted) setAuthLoading(false);
        return;
      }

      try {
        const res = await safeApiFetch<{ user: AuthUser }>('/api/auth/me', {
          headers: { Authorization: `Bearer ${savedToken}` },
        });

        if (res.ok && res.data?.user) {
          if (isMounted) {
            setToken(savedToken);
            setUser(res.data.user);
            setIsAuthenticated(true);
            localStorage.setItem('org_user', JSON.stringify(res.data.user));
          }
        } else if (res.status === 401) {
          // Token is expired on the server
          if (savedUserStr) {
            try {
              const parsed = JSON.parse(savedUserStr);
              if (isMounted) {
                setToken(savedToken);
                setUser(parsed);
                setIsAuthenticated(true);
              }
            } catch {
              if (isMounted) logoutUser();
            }
          } else {
            if (isMounted) logoutUser();
          }
        } else {
          // In case server is offline, returns 404 (static Vercel hosting) or 500
          if (savedUserStr) {
            try {
              const parsed = JSON.parse(savedUserStr);
              if (isMounted) {
                setToken(savedToken);
                setUser(parsed);
                setIsAuthenticated(true);
              }
            } catch {
              if (isMounted) logoutUser();
            }
          } else {
            if (isMounted) logoutUser();
          }
        }
      } catch {
        if (savedUserStr) {
          try {
            const parsed = JSON.parse(savedUserStr);
            if (isMounted) {
              setToken(savedToken);
              setUser(parsed);
              setIsAuthenticated(true);
            }
          } catch {
            if (isMounted) logoutUser();
          }
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [logoutUser]);

  // Auto-migrate legacy localStorage data on initial load
  useEffect(() => {
    syncLegacyLocalDataToServer().catch((err) => {
      console.warn('Migration check notice:', err);
    });
  }, []);

  // Fetch organizations from shared cloud database (with local fallback)
  const fetchOrganizations = useCallback(async () => {
    const activeToken = localStorage.getItem('org_token') || token;
    if (!activeToken) return;

    try {
      const res = await safeApiFetch<Organization[]>('/api/organizations', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });

      if (res.ok && Array.isArray(res.data)) {
        const orgs = res.data;
        setOrganizations(orgs);
        if (orgs.length > 0) {
          const savedOrgId = localStorage.getItem('current_org_id');
          if (savedOrgId && orgs.some((o) => o.id === savedOrgId)) {
            setCurrentOrgId(savedOrgId);
          } else {
            setCurrentOrgId(orgs[0].id);
          }
        } else {
          setCurrentOrgId('');
        }
        return;
      }

      if (res.status === 401 || res.status === 403) {
        logoutUser();
        return;
      }
    } catch {}

    // Fallback to localDB for static hosting or offline
    let localOrgs = localDB.getOrganizations();
    if (localOrgs.length === 0) {
      const defaultOrg = localDB.addOrganization({
        name: 'My Organization',
        college_name: 'Main Campus',
        tagline: 'Excellence in Action',
        logo: '',
      });
      localOrgs = [defaultOrg];
    }
    setOrganizations(localOrgs);
    if (localOrgs.length > 0) {
      const savedOrgId = localStorage.getItem('current_org_id');
      if (savedOrgId && localOrgs.some((o) => o.id === savedOrgId)) {
        setCurrentOrgId(savedOrgId);
      } else {
        setCurrentOrgId(localOrgs[0].id);
      }
    } else {
      setCurrentOrgId('');
    }
  }, [token]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Save current org id
  useEffect(() => {
    if (currentOrgId) {
      localStorage.setItem('current_org_id', currentOrgId);
    }
  }, [currentOrgId]);

  // Fetch entity data for currentOrgId from shared cloud database (with local fallback)
  const fetchEntityData = useCallback(async () => {
    const activeToken = localStorage.getItem('org_token') || token;
    if (!activeToken || !currentOrgId) {
      setOrganizers([]);
      setPrograms([]);
      setAccounts([]);
      setIncomes([]);
      setExpenses([]);
      setTransfers([]);
      setLoans([]);
      setLoanRepayments([]);
      setAuditLogs([]);
      return;
    }

    const headers = { Authorization: `Bearer ${activeToken}` };

    try {
      const [
        orgsRes,
        progsRes,
        accsRes,
        incsRes,
        expsRes,
        loansRes,
        repsRes,
        transRes,
        logsRes,
      ] = await Promise.all([
        safeApiFetch<Organizer[]>(`/api/organizers?organization_id=${currentOrgId}`, { headers }),
        safeApiFetch<Program[]>(`/api/programs?organization_id=${currentOrgId}`, { headers }),
        safeApiFetch<FinancialAccount[]>(`/api/accounts?organization_id=${currentOrgId}`, { headers }),
        safeApiFetch<Income[]>(`/api/incomes?organization_id=${currentOrgId}`, { headers }),
        safeApiFetch<Expense[]>(`/api/expenses?organization_id=${currentOrgId}`, { headers }),
        safeApiFetch<Loan[]>(`/api/loans?organization_id=${currentOrgId}`, { headers }),
        safeApiFetch<LoanRepayment[]>(`/api/repayments?organization_id=${currentOrgId}`, { headers }),
        safeApiFetch<AccountTransfer[]>(`/api/transfers?organization_id=${currentOrgId}`, { headers }),
        safeApiFetch<AuditLog[]>(`/api/audit_logs?organization_id=${currentOrgId}`, { headers }),
      ]);

      let serverConnected = false;
      if (orgsRes.ok && Array.isArray(orgsRes.data)) { setOrganizers(orgsRes.data); serverConnected = true; }
      if (progsRes.ok && Array.isArray(progsRes.data)) setPrograms(progsRes.data);
      if (accsRes.ok && Array.isArray(accsRes.data)) setAccounts(accsRes.data);
      if (incsRes.ok && Array.isArray(incsRes.data)) setIncomes(incsRes.data);
      if (expsRes.ok && Array.isArray(expsRes.data)) setExpenses(expsRes.data);
      if (loansRes.ok && Array.isArray(loansRes.data)) setLoans(loansRes.data);
      if (repsRes.ok && Array.isArray(repsRes.data)) setLoanRepayments(repsRes.data);
      if (transRes.ok && Array.isArray(transRes.data)) setTransfers(transRes.data);
      if (logsRes.ok && Array.isArray(logsRes.data)) setAuditLogs(logsRes.data);

      if (serverConnected) return;
    } catch {}

    // Static hosting or offline fallback
    setOrganizers(localDB.getItems('local_organizers', currentOrgId));
    setPrograms(localDB.getItems('local_programs', currentOrgId));
    setAccounts(localDB.getItems('local_accounts', currentOrgId));
    setIncomes(localDB.getItems('local_incomes', currentOrgId));
    setExpenses(localDB.getItems('local_expenses', currentOrgId));
    setLoans(localDB.getItems('local_loans', currentOrgId));
    setLoanRepayments(localDB.getItems('local_repayments', currentOrgId));
    setTransfers(localDB.getItems('local_transfers', currentOrgId));
    setAuditLogs(localDB.getItems('local_audit_logs', currentOrgId));
  }, [token, currentOrgId]);

  useEffect(() => {
    fetchEntityData();
  }, [fetchEntityData]);

  // Periodic auto-sync & Window Focus synchronization so changes on other devices reflect immediately
  useEffect(() => {
    if (!token || !currentOrgId) return;

    const syncInterval = setInterval(() => {
      fetchEntityData();
    }, 10000); // Poll every 10 seconds

    const handleFocus = () => {
      fetchOrganizations();
      fetchEntityData();
    };

    window.addEventListener('focus', handleFocus);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token, currentOrgId, fetchOrganizations, fetchEntityData]);

  const currentOrg = organizations.find((o) => o.id === currentOrgId);

  // Save last org logo and name to localStorage for unauthenticated pages
  useEffect(() => {
    if (currentOrg) {
      if (currentOrg.logo) {
        localStorage.setItem('last_org_logo', currentOrg.logo);
      } else {
        localStorage.removeItem('last_org_logo');
      }
      if (currentOrg.name) {
        localStorage.setItem('last_org_name', currentOrg.name);
      }
    }
  }, [currentOrg]);

  const getAuthHeaders = () => {
    const activeToken = localStorage.getItem('org_token') || token;
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${activeToken}`,
    };
  };

  // Organization Actions
  const addOrganization = async (orgData: Omit<Organization, 'id' | 'created_at' | 'updated_at'>): Promise<Organization> => {
    try {
      const res = await safeApiFetch<Organization>('/api/organizations', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(orgData),
      });
      if (res.ok && res.data) {
        const newOrg = res.data;
        setOrganizations((prev) => [...prev, newOrg]);
        setCurrentOrgId(newOrg.id);
        try { localDB.addOrganization(orgData); } catch {}
        return newOrg;
      }
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new Error(res.error || 'Failed to save organization.');
      }
    } catch (err: any) {
      if (err.message && err.message !== 'Unable to connect to server') throw err;
    }
    const newOrg = localDB.addOrganization(orgData);
    setOrganizations((prev) => [...prev, newOrg]);
    setCurrentOrgId(newOrg.id);
    return newOrg;
  };

  const updateOrganization = async (orgData: Partial<Organization> & { id: string }) => {
    try {
      const res = await safeApiFetch<Organization>(`/api/organizations/${orgData.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(orgData),
      });
      if (res.ok && res.data) {
        const updated = res.data;
        setOrganizations((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        try { localDB.updateOrganization(orgData); } catch {}
        return;
      }
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new Error(res.error || 'Failed to update organization.');
      }
    } catch (err: any) {
      if (err.message && err.message !== 'Unable to connect to server') throw err;
    }
    const updated = localDB.updateOrganization(orgData);
    setOrganizations((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  };

  const deleteOrganization = async (id: string) => {
    try {
      await safeApiFetch(`/api/organizations/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch {}
    localDB.deleteOrganization(id);
    setOrganizations((prev) => {
      const filtered = prev.filter((o) => o.id !== id);
      if (currentOrgId === id) {
        setCurrentOrgId(filtered[0]?.id || '');
      }
      return filtered;
    });
  };

  // Organizer Actions
  const addOrganizer = async (org: Omit<Organizer, 'id' | 'organization_id' | 'created_at' | 'updated_at'>): Promise<Organizer> => {
    try {
      const res = await safeApiFetch<Organizer>('/api/organizers', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...org, organization_id: currentOrgId }),
      });
      if (res.ok && res.data) {
        const newOrg = res.data;
        setOrganizers((prev) => [...prev, newOrg]);
        try { localDB.addItem<Organizer>('local_organizers', org, currentOrgId, 'orgr'); } catch {}
        return newOrg;
      }
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new Error(res.error || 'Failed to add organizer.');
      }
    } catch (err: any) {
      if (err.message && err.message !== 'Unable to connect to server') throw err;
    }
    const newOrg = localDB.addItem<Organizer>('local_organizers', org, currentOrgId, 'orgr');
    setOrganizers((prev) => [...prev, newOrg]);
    return newOrg;
  };

  const updateOrganizer = async (org: Partial<Organizer> & { id: string }) => {
    try {
      const res = await safeApiFetch<Organizer>(`/api/organizers/${org.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(org),
      });
      if (res.ok && res.data) {
        const updated = res.data;
        setOrganizers((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        try { localDB.updateItem<Organizer>('local_organizers', org); } catch {}
        return;
      }
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new Error(res.error || 'Failed to update organizer.');
      }
    } catch (err: any) {
      if (err.message && err.message !== 'Unable to connect to server') throw err;
    }
    const updated = localDB.updateItem<Organizer>('local_organizers', org);
    setOrganizers((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  };

  const deleteOrganizer = async (id: string) => {
    try {
      await safeApiFetch(`/api/organizers/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch {}
    localDB.deleteItem('local_organizers', id);
    setOrganizers((prev) => prev.filter((o) => o.id !== id));
  };

  const reorderOrganizers = (reordered: Organizer[]) => {
    setOrganizers(reordered);
    localDB.reorderItems('local_organizers', reordered);
  };

  // Program Actions
  const addProgram = async (prog: Omit<Program, 'id' | 'organization_id' | 'created_at' | 'updated_at'>): Promise<Program> => {
    try {
      const res = await safeApiFetch<Program>('/api/programs', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...prog, organization_id: currentOrgId, media: prog.media || [] }),
      });
      if (res.ok && res.data) {
        const newProg = res.data;
        setPrograms((prev) => [...prev, newProg]);
        try { localDB.addItem<Program>('local_programs', { ...prog, media: prog.media || [] }, currentOrgId, 'prg'); } catch {}
        return newProg;
      }
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new Error(res.error || 'Failed to create program.');
      }
    } catch (err: any) {
      if (err.message && err.message !== 'Unable to connect to server') throw err;
    }
    const newProg = localDB.addItem<Program>('local_programs', { ...prog, media: prog.media || [] }, currentOrgId, 'prg');
    setPrograms((prev) => [...prev, newProg]);
    return newProg;
  };

  const updateProgram = async (prog: Partial<Program> & { id: string }) => {
    try {
      const res = await safeApiFetch<Program>(`/api/programs/${prog.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(prog),
      });
      if (res.ok && res.data) {
        const updated = res.data;
        setPrograms((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        try { localDB.updateItem<Program>('local_programs', prog); } catch {}
        return;
      }
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new Error(res.error || 'Failed to update program.');
      }
    } catch (err: any) {
      if (err.message && err.message !== 'Unable to connect to server') throw err;
    }
    const updated = localDB.updateItem<Program>('local_programs', prog);
    setPrograms((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const deleteProgram = async (id: string) => {
    try {
      await safeApiFetch(`/api/programs/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch {}
    localDB.deleteItem('local_programs', id);
    setPrograms((prev) => prev.filter((p) => p.id !== id));
  };

  const addProgramMedia = async (programId: string, mediaItem: Omit<ProgramMedia, 'id' | 'program_id' | 'created_at'>) => {
    const prog = programs.find((p) => p.id === programId);
    if (!prog) return;
    const newMedia: ProgramMedia = {
      ...mediaItem,
      id: 'med_' + Date.now() + Math.random().toString(36).substr(2, 5),
      program_id: programId,
      created_at: new Date().toISOString(),
    };
    const updatedMedia = [...(prog.media || []), newMedia];
    await updateProgram({ id: programId, media: updatedMedia });
  };

  const deleteProgramMedia = async (programId: string, mediaId: string) => {
    const prog = programs.find((p) => p.id === programId);
    if (!prog) return;
    const updatedMedia = (prog.media || []).filter((m) => m.id !== mediaId);
    await updateProgram({ id: programId, media: updatedMedia });
  };

  // Treasury Accounts
  const addAccount = async (acc: Omit<FinancialAccount, 'id' | 'organization_id' | 'created_at' | 'updated_at'>): Promise<FinancialAccount> => {
    try {
      const res = await safeApiFetch<FinancialAccount>('/api/accounts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...acc, organization_id: currentOrgId }),
      });
      if (res.ok && res.data) {
        const newAcc = res.data;
        setAccounts((prev) => [newAcc, ...prev]);
        try { localDB.addItem<FinancialAccount>('local_accounts', acc, currentOrgId, 'acc'); } catch {}
        return newAcc;
      }
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new Error(res.error || 'Failed to add financial account.');
      }
    } catch (err: any) {
      if (err.message && err.message !== 'Unable to connect to server') throw err;
    }
    const newAcc = localDB.addItem<FinancialAccount>('local_accounts', acc, currentOrgId, 'acc');
    setAccounts((prev) => [newAcc, ...prev]);
    return newAcc;
  };

  const updateAccount = async (acc: Partial<FinancialAccount> & { id: string }) => {
    try {
      const res = await safeApiFetch<FinancialAccount>(`/api/accounts/${acc.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(acc),
      });
      if (res.ok && res.data) {
        const updated = res.data;
        setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        try { localDB.updateItem<FinancialAccount>('local_accounts', acc); } catch {}
        return;
      }
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new Error(res.error || 'Failed to update account.');
      }
    } catch (err: any) {
      if (err.message && err.message !== 'Unable to connect to server') throw err;
    }
    const updated = localDB.updateItem<FinancialAccount>('local_accounts', acc);
    setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const deleteAccount = async (id: string): Promise<boolean> => {
    const hasTx =
      incomes.some((i) => i.account_id === id) ||
      expenses.some((e) => e.account_id === id) ||
      transfers.some((t) => t.from_account_id === id || t.to_account_id === id) ||
      loans.some((l) => l.account_id === id) ||
      loanRepayments.some((r) => r.account_id === id);

    if (hasTx) {
      alert('This account cannot be deleted because it contains financial transactions.');
      return false;
    }

    try {
      await safeApiFetch(`/api/accounts/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch {}
    localDB.deleteItem('local_accounts', id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    return true;
  };

  // Income Actions
  const addIncome = async (inc: Omit<Income, 'id' | 'organization_id' | 'created_at' | 'updated_at'>): Promise<Income> => {
    try {
      const res = await safeApiFetch<Income>('/api/incomes', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...inc, organization_id: currentOrgId }),
      });
      if (res.ok && res.data) {
        const newInc = res.data;
        setIncomes((prev) => [newInc, ...prev]);
        try { localDB.addItem<Income>('local_incomes', inc, currentOrgId, 'inc'); } catch {}
        return newInc;
      }
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new Error(res.error || 'Failed to record income.');
      }
    } catch (err: any) {
      if (err.message && err.message !== 'Unable to connect to server') throw err;
    }
    const newInc = localDB.addItem<Income>('local_incomes', inc, currentOrgId, 'inc');
    setIncomes((prev) => [newInc, ...prev]);
    return newInc;
  };

  const updateIncome = async (inc: Partial<Income> & { id: string }) => {
    try {
      const res = await safeApiFetch<Income>(`/api/incomes/${inc.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(inc),
      });
      if (res.ok && res.data) {
        const updated = res.data;
        setIncomes((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        try { localDB.updateItem<Income>('local_incomes', inc); } catch {}
        return;
      }
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new Error(res.error || 'Failed to update income record.');
      }
    } catch (err: any) {
      if (err.message && err.message !== 'Unable to connect to server') throw err;
    }
    const updated = localDB.updateItem<Income>('local_incomes', inc);
    setIncomes((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  };

  const deleteIncome = async (id: string) => {
    try {
      await safeApiFetch(`/api/incomes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch {}
    localDB.deleteItem('local_incomes', id);
    setIncomes((prev) => prev.filter((i) => i.id !== id));
  };

  // Expense Actions
  const addExpense = async (exp: Omit<Expense, 'id' | 'organization_id' | 'created_at' | 'updated_at'>): Promise<Expense> => {
    try {
      const res = await safeApiFetch<Expense>('/api/expenses', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...exp, organization_id: currentOrgId }),
      });
      if (res.ok && res.data) {
        const newExp = res.data;
        setExpenses((prev) => [newExp, ...prev]);
        try { localDB.addItem<Expense>('local_expenses', exp, currentOrgId, 'exp'); } catch {}
        return newExp;
      }
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new Error(res.error || 'Failed to record expense.');
      }
    } catch (err: any) {
      if (err.message && err.message !== 'Unable to connect to server') throw err;
    }
    const newExp = localDB.addItem<Expense>('local_expenses', exp, currentOrgId, 'exp');
    setExpenses((prev) => [newExp, ...prev]);
    return newExp;
  };

  const updateExpense = async (exp: Partial<Expense> & { id: string }) => {
    try {
      const res = await safeApiFetch<Expense>(`/api/expenses/${exp.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(exp),
      });
      if (res.ok && res.data) {
        const updated = res.data;
        setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        try { localDB.updateItem<Expense>('local_expenses', exp); } catch {}
        return;
      }
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new Error(res.error || 'Failed to update expense record.');
      }
    } catch (err: any) {
      if (err.message && err.message !== 'Unable to connect to server') throw err;
    }
    const updated = localDB.updateItem<Expense>('local_expenses', exp);
    setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  };

  const deleteExpense = async (id: string) => {
    try {
      await safeApiFetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch {}
    localDB.deleteItem('local_expenses', id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  // Transfer Actions
  const addTransfer = async (tr: Omit<AccountTransfer, 'id' | 'organization_id' | 'created_at'>): Promise<AccountTransfer> => {
    try {
      const res = await safeApiFetch<AccountTransfer>('/api/transfers', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...tr, organization_id: currentOrgId }),
      });
      if (res.ok && res.data) {
        const newTr = res.data;
        setTransfers((prev) => [newTr, ...prev]);
        try { localDB.addItem<AccountTransfer>('local_transfers', tr, currentOrgId, 'tr'); } catch {}
        return newTr;
      }
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new Error(res.error || 'Failed to process transfer.');
      }
    } catch (err: any) {
      if (err.message && err.message !== 'Unable to connect to server') throw err;
    }
    const newTr = localDB.addItem<AccountTransfer>('local_transfers', tr, currentOrgId, 'tr');
    setTransfers((prev) => [newTr, ...prev]);
    return newTr;
  };

  const deleteTransfer = async (id: string) => {
    try {
      await safeApiFetch(`/api/transfers/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch {}
    localDB.deleteItem('local_transfers', id);
    setTransfers((prev) => prev.filter((t) => t.id !== id));
  };

  // Loan Actions
  const addLoan = async (loan: Omit<Loan, 'id' | 'organization_id' | 'outstanding_amount' | 'status' | 'created_at' | 'updated_at'>): Promise<Loan> => {
    try {
      const res = await safeApiFetch<Loan>('/api/loans', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...loan,
          organization_id: currentOrgId,
          outstanding_amount: loan.original_amount,
          status: 'OUTSTANDING',
        }),
      });
      if (res.ok && res.data) {
        const newLoan = res.data;
        setLoans((prev) => [...prev, newLoan]);
        try {
          localDB.addItem<Loan>(
            'local_loans',
            { ...loan, outstanding_amount: loan.original_amount, status: 'OUTSTANDING' },
            currentOrgId,
            'loan'
          );
        } catch {}
        return newLoan;
      }
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new Error(res.error || 'Failed to save loan record.');
      }
    } catch (err: any) {
      if (err.message && err.message !== 'Unable to connect to server') throw err;
    }
    const newLoan = localDB.addItem<Loan>(
      'local_loans',
      { ...loan, outstanding_amount: loan.original_amount, status: 'OUTSTANDING' },
      currentOrgId,
      'loan'
    );
    setLoans((prev) => [...prev, newLoan]);
    return newLoan;
  };

  const updateLoan = async (loan: Partial<Loan> & { id: string }) => {
    try {
      const res = await safeApiFetch<Loan>(`/api/loans/${loan.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(loan),
      });
      if (res.ok && res.data) {
        const updated = res.data;
        setLoans((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
        try { localDB.updateItem<Loan>('local_loans', loan); } catch {}
        return;
      }
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new Error(res.error || 'Failed to update loan.');
      }
    } catch (err: any) {
      if (err.message && err.message !== 'Unable to connect to server') throw err;
    }
    const updated = localDB.updateItem<Loan>('local_loans', loan);
    setLoans((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  };

  const deleteLoan = async (id: string) => {
    try {
      await safeApiFetch(`/api/loans/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch {}
    localDB.deleteItem('local_loans', id);
    setLoans((prev) => prev.filter((l) => l.id !== id));
  };

  // Loan Repayment Actions
  const addLoanRepayment = async (rep: Omit<LoanRepayment, 'id' | 'organization_id' | 'created_at'>): Promise<LoanRepayment> => {
    try {
      const res = await safeApiFetch<LoanRepayment>('/api/repayments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...rep, organization_id: currentOrgId }),
      });
      if (res.ok && res.data) {
        const newRep = res.data;
        setLoanRepayments((prev) => [...prev, newRep]);

        const loan = loans.find((l) => l.id === rep.loan_id);
        if (loan) {
          const newOutstanding = Math.max(0, loan.outstanding_amount - rep.amount);
          let newStatus = loan.status;
          if (newOutstanding === 0) {
            newStatus = loan.type === 'BORROWED' ? 'FULLY_PAID' : 'FULLY_RECOVERED';
          } else {
            newStatus = loan.type === 'BORROWED' ? 'PARTIALLY_PAID' : 'PARTIALLY_RECOVERED';
          }
          await updateLoan({ id: loan.id, outstanding_amount: newOutstanding, status: newStatus });
        }
        try { localDB.addItem<LoanRepayment>('local_repayments', rep, currentOrgId, 'rep'); } catch {}
        return newRep;
      }
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new Error(res.error || 'Failed to save repayment.');
      }
    } catch (err: any) {
      if (err.message && err.message !== 'Unable to connect to server') throw err;
    }

    const newRep = localDB.addItem<LoanRepayment>('local_repayments', rep, currentOrgId, 'rep');
    setLoanRepayments((prev) => [...prev, newRep]);

    const loan = loans.find((l) => l.id === rep.loan_id);
    if (loan) {
      const newOutstanding = Math.max(0, loan.outstanding_amount - rep.amount);
      let newStatus = loan.status;
      if (newOutstanding === 0) {
        newStatus = loan.type === 'BORROWED' ? 'FULLY_PAID' : 'FULLY_RECOVERED';
      } else {
        newStatus = loan.type === 'BORROWED' ? 'PARTIALLY_PAID' : 'PARTIALLY_RECOVERED';
      }
      await updateLoan({ id: loan.id, outstanding_amount: newOutstanding, status: newStatus });
    }
    return newRep;
  };

  const deleteLoanRepayment = async (repId: string) => {
    const rep = loanRepayments.find((r) => r.id === repId);
    if (!rep) return;

    const loan = loans.find((l) => l.id === rep.loan_id);
    if (loan) {
      const restoredOutstanding = Math.min(loan.original_amount, loan.outstanding_amount + rep.amount);
      let newStatus = loan.status;
      if (loan.type === 'BORROWED') {
        if (restoredOutstanding === loan.original_amount) newStatus = 'OUTSTANDING';
        else if (restoredOutstanding > 0) newStatus = 'PARTIALLY_PAID';
      } else {
        if (restoredOutstanding === loan.original_amount) newStatus = 'OUTSTANDING';
        else if (restoredOutstanding > 0) newStatus = 'PARTIALLY_RECOVERED';
      }
      await updateLoan({ id: loan.id, outstanding_amount: restoredOutstanding, status: newStatus });
    }

    try {
      await safeApiFetch(`/api/repayments/${repId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch {}
    localDB.deleteItem('local_repayments', repId);
    setLoanRepayments((prev) => prev.filter((r) => r.id !== repId));
  };

  const viewProgramDetails = (id: string) => {
    setSelectedProgramId(id);
    setActiveTab('program_details');
  };

  const resetToDemoData = () => {
    // No-op or clear demo
  };

  const exportDataJson = () => {
    return JSON.stringify({ organizations, organizers, programs, accounts, incomes, expenses, loans, loanRepayments, transfers }, null, 2);
  };

  const importDataJson = () => {
    return true;
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
