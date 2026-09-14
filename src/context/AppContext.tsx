import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
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
  user: { id: string; email: string } | null;
  loginUser: (token: string, user: { id: string; email: string }) => void;
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
  const [token, setToken] = useState<string | null>(() => {
    const saved = localStorage.getItem('org_token');
    if (saved && saved.startsWith('local_')) {
      return null;
    }
    return saved;
  });
  const [user, setUser] = useState<{ id: string; email: string } | null>(() => {
    try {
      const saved = localStorage.getItem('org_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

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

  // Auto-migrate legacy localStorage data on initial load
  useEffect(() => {
    import('../utils/migration').then(({ syncLegacyLocalDataToServer }) => {
      syncLegacyLocalDataToServer();
    });
  }, []);

  const loginUser = (newToken: string, newUser: { id: string; email: string }) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('org_token', newToken);
    localStorage.setItem('org_user', JSON.stringify(newUser));
  };

  const logoutUser = () => {
    setToken(null);
    setUser(null);
    setOrganizations([]);
    setCurrentOrgId('');
    localStorage.removeItem('org_token');
    localStorage.removeItem('org_user');
  };

  const runAction = async <T extends unknown>(
    _localFn: any,
    apiFn: () => Promise<T>
  ): Promise<T> => {
    return await apiFn();
  };

  // Fetch organizations from shared cloud database
  const fetchOrganizations = useCallback(() => {
    if (!token) return;

    fetch('/api/organizations', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            logoutUser();
          }
          throw new Error('Failed to fetch organizations');
        }
        return res.json();
      })
      .then((data: Organization[]) => {
        setOrganizations(data);
        if (data.length > 0) {
          const savedOrgId = localStorage.getItem('current_org_id');
          if (savedOrgId && data.some((o) => o.id === savedOrgId)) {
            setCurrentOrgId(savedOrgId);
          } else {
            setCurrentOrgId(data[0].id);
          }
        } else {
          setCurrentOrgId('');
        }
      })
      .catch((err) => console.error('Fetch organizations error:', err));
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

  // Fetch entity data for currentOrgId from shared cloud database
  const fetchEntityData = useCallback(() => {
    if (!token || !currentOrgId) {
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

    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`/api/organizers?organization_id=${currentOrgId}`, { headers }).then((r) => r.json()),
      fetch(`/api/programs?organization_id=${currentOrgId}`, { headers }).then((r) => r.json()),
      fetch(`/api/accounts?organization_id=${currentOrgId}`, { headers }).then((r) => r.json()),
      fetch(`/api/incomes?organization_id=${currentOrgId}`, { headers }).then((r) => r.json()),
      fetch(`/api/expenses?organization_id=${currentOrgId}`, { headers }).then((r) => r.json()),
      fetch(`/api/loans?organization_id=${currentOrgId}`, { headers }).then((r) => r.json()),
      fetch(`/api/repayments?organization_id=${currentOrgId}`, { headers }).then((r) => r.json()),
      fetch(`/api/transfers?organization_id=${currentOrgId}`, { headers }).then((r) => r.json()),
      fetch(`/api/audit_logs?organization_id=${currentOrgId}`, { headers }).then((r) => r.json()),
    ])
      .then(([orgsData, progsData, accsData, incsData, expsData, loansData, repsData, transData, logsData]) => {
        setOrganizers(Array.isArray(orgsData) ? orgsData : []);
        setPrograms(Array.isArray(progsData) ? progsData : []);
        setAccounts(Array.isArray(accsData) ? accsData : []);
        setIncomes(Array.isArray(incsData) ? incsData : []);
        setExpenses(Array.isArray(expsData) ? expsData : []);
        setLoans(Array.isArray(loansData) ? loansData : []);
        setLoanRepayments(Array.isArray(repsData) ? repsData : []);
        setTransfers(Array.isArray(transData) ? transData : []);
        setAuditLogs(Array.isArray(logsData) ? logsData : []);
      })
      .catch((err) => console.error('Error fetching org data:', err));
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

  // Organization Actions
  const addOrganization = async (orgData: Omit<Organization, 'id' | 'created_at' | 'updated_at'>): Promise<Organization> => {
    return runAction(
      (db) => {
        const newOrg = db.addOrganization(orgData);
        setOrganizations((prev) => [...prev, newOrg]);
        setCurrentOrgId(newOrg.id);
        return newOrg;
      },
      async () => {
        const res = await fetch('/api/organizations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(orgData),
        });
        const newOrg = await res.json();
        setOrganizations((prev) => [...prev, newOrg]);
        setCurrentOrgId(newOrg.id);
        return newOrg;
      }
    );
  };

  const updateOrganization = async (orgData: Partial<Organization> & { id: string }) => {
    return runAction(
      (db) => {
        const updated = db.updateOrganization(orgData);
        setOrganizations((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      },
      async () => {
        const res = await fetch(`/api/organizations/${orgData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(orgData),
        });
        const updated = await res.json();
        setOrganizations((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      }
    );
  };

  const deleteOrganization = async (id: string) => {
    return runAction(
      (db) => {
        db.deleteOrganization(id);
        setOrganizations((prev) => {
          const filtered = prev.filter((o) => o.id !== id);
          if (currentOrgId === id) {
            setCurrentOrgId(filtered[0]?.id || '');
          }
          return filtered;
        });
      },
      async () => {
        await fetch(`/api/organizations/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrganizations((prev) => {
          const filtered = prev.filter((o) => o.id !== id);
          if (currentOrgId === id) {
            setCurrentOrgId(filtered[0]?.id || '');
          }
          return filtered;
        });
      }
    );
  };

  // Organizer Actions
  const addOrganizer = async (org: Omit<Organizer, 'id' | 'organization_id' | 'created_at' | 'updated_at'>): Promise<Organizer> => {
    return runAction(
      (db) => {
        const newOrg = db.addItem('local_organizers', org, currentOrgId, 'orgr');
        setOrganizers((prev) => [...prev, newOrg]);
        return newOrg;
      },
      async () => {
        const res = await fetch('/api/organizers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...org, organization_id: currentOrgId }),
        });
        const newOrg = await res.json();
        setOrganizers((prev) => [...prev, newOrg]);
        return newOrg;
      }
    );
  };

  const updateOrganizer = async (org: Partial<Organizer> & { id: string }) => {
    return runAction(
      (db) => {
        const updated = db.updateItem('local_organizers', org);
        setOrganizers((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      },
      async () => {
        const res = await fetch(`/api/organizers/${org.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(org),
        });
        const updated = await res.json();
        setOrganizers((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      }
    );
  };

  const deleteOrganizer = async (id: string) => {
    return runAction(
      (db) => {
        db.deleteItem('local_organizers', id);
        setOrganizers((prev) => prev.filter((o) => o.id !== id));
      },
      async () => {
        await fetch(`/api/organizers/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrganizers((prev) => prev.filter((o) => o.id !== id));
      }
    );
  };

  const reorderOrganizers = (reordered: Organizer[]) => {
    setOrganizers(reordered);
  };

  // Program Actions
  const addProgram = async (prog: Omit<Program, 'id' | 'organization_id' | 'created_at' | 'updated_at'>): Promise<Program> => {
    return runAction(
      (db) => {
        const newProg = db.addItem('local_programs', { ...prog, media: prog.media || [] }, currentOrgId, 'prog');
        setPrograms((prev) => [...prev, newProg]);
        return newProg;
      },
      async () => {
        const res = await fetch('/api/programs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...prog, organization_id: currentOrgId, media: prog.media || [] }),
        });
        const newProg = await res.json();
        setPrograms((prev) => [...prev, newProg]);
        return newProg;
      }
    );
  };

  const updateProgram = async (prog: Partial<Program> & { id: string }) => {
    return runAction(
      (db) => {
        const updated = db.updateItem('local_programs', prog);
        setPrograms((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      },
      async () => {
        const res = await fetch(`/api/programs/${prog.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(prog),
        });
        const updated = await res.json();
        setPrograms((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      }
    );
  };

  const deleteProgram = async (id: string) => {
    return runAction(
      (db) => {
        db.deleteItem('local_programs', id);
        setPrograms((prev) => prev.filter((p) => p.id !== id));
      },
      async () => {
        await fetch(`/api/programs/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        setPrograms((prev) => prev.filter((p) => p.id !== id));
      }
    );
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
    return runAction(
      (db) => {
        const newAcc = db.addItem('local_accounts', acc, currentOrgId, 'acc');
        setAccounts((prev) => [newAcc, ...prev]);
        return newAcc;
      },
      async () => {
        const res = await fetch('/api/accounts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...acc, organization_id: currentOrgId }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to add financial account.');
        }
        const newAcc = await res.json();
        setAccounts((prev) => [newAcc, ...prev]);
        return newAcc;
      }
    );
  };

  const updateAccount = async (acc: Partial<FinancialAccount> & { id: string }) => {
    return runAction(
      (db) => {
        const updated = db.updateItem('local_accounts', acc);
        setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      },
      async () => {
        const res = await fetch(`/api/accounts/${acc.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(acc),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to update account.');
        }
        const updated = await res.json();
        setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      }
    );
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

    return runAction(
      (db) => {
        db.deleteItem('local_accounts', id);
        setAccounts((prev) => prev.filter((a) => a.id !== id));
        return true;
      },
      async () => {
        const res = await fetch(`/api/accounts/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to delete account.');
        }
        setAccounts((prev) => prev.filter((a) => a.id !== id));
        return true;
      }
    );
  };

  // Income Actions
  const addIncome = async (inc: Omit<Income, 'id' | 'organization_id' | 'created_at' | 'updated_at'>): Promise<Income> => {
    return runAction(
      (db) => {
        const newInc = db.addItem('local_incomes', inc, currentOrgId, 'inc');
        setIncomes((prev) => [newInc, ...prev]);
        return newInc;
      },
      async () => {
        const res = await fetch('/api/incomes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...inc, organization_id: currentOrgId }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to record income.');
        }
        const newInc = await res.json();
        setIncomes((prev) => [newInc, ...prev]);
        return newInc;
      }
    );
  };

  const updateIncome = async (inc: Partial<Income> & { id: string }) => {
    return runAction(
      (db) => {
        const updated = db.updateItem('local_incomes', inc);
        setIncomes((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      },
      async () => {
        const res = await fetch(`/api/incomes/${inc.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(inc),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to update income record.');
        }
        const updated = await res.json();
        setIncomes((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      }
    );
  };

  const deleteIncome = async (id: string) => {
    return runAction(
      (db) => {
        db.deleteItem('local_incomes', id);
        setIncomes((prev) => prev.filter((i) => i.id !== id));
      },
      async () => {
        const res = await fetch(`/api/incomes/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to delete income record.');
        }
        setIncomes((prev) => prev.filter((i) => i.id !== id));
      }
    );
  };

  // Expense Actions
  const addExpense = async (exp: Omit<Expense, 'id' | 'organization_id' | 'created_at' | 'updated_at'>): Promise<Expense> => {
    return runAction(
      (db) => {
        const newExp = db.addItem('local_expenses', exp, currentOrgId, 'exp');
        setExpenses((prev) => [newExp, ...prev]);
        return newExp;
      },
      async () => {
        const res = await fetch('/api/expenses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...exp, organization_id: currentOrgId }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to record expense.');
        }
        const newExp = await res.json();
        setExpenses((prev) => [newExp, ...prev]);
        return newExp;
      }
    );
  };

  const updateExpense = async (exp: Partial<Expense> & { id: string }) => {
    return runAction(
      (db) => {
        const updated = db.updateItem('local_expenses', exp);
        setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      },
      async () => {
        const res = await fetch(`/api/expenses/${exp.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(exp),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to update expense record.');
        }
        const updated = await res.json();
        setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      }
    );
  };

  const deleteExpense = async (id: string) => {
    return runAction(
      (db) => {
        db.deleteItem('local_expenses', id);
        setExpenses((prev) => prev.filter((e) => e.id !== id));
      },
      async () => {
        const res = await fetch(`/api/expenses/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to delete expense record.');
        }
        setExpenses((prev) => prev.filter((e) => e.id !== id));
      }
    );
  };

  // Transfer Actions
  const addTransfer = async (tr: Omit<AccountTransfer, 'id' | 'organization_id' | 'created_at'>): Promise<AccountTransfer> => {
    return runAction(
      (db) => {
        const newTr = db.addItem('local_transfers', tr, currentOrgId, 'trsf');
        setTransfers((prev) => [newTr, ...prev]);
        return newTr;
      },
      async () => {
        const res = await fetch('/api/transfers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...tr, organization_id: currentOrgId }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to process transfer.');
        }
        const newTr = await res.json();
        setTransfers((prev) => [newTr, ...prev]);
        return newTr;
      }
    );
  };

  const deleteTransfer = async (id: string) => {
    return runAction(
      (db) => {
        db.deleteItem('local_transfers', id);
        setTransfers((prev) => prev.filter((t) => t.id !== id));
      },
      async () => {
        const res = await fetch(`/api/transfers/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to delete transfer.');
        }
        setTransfers((prev) => prev.filter((t) => t.id !== id));
      }
    );
  };

  // Loan Actions
  const addLoan = async (loan: Omit<Loan, 'id' | 'organization_id' | 'outstanding_amount' | 'status' | 'created_at' | 'updated_at'>): Promise<Loan> => {
    return runAction(
      (db) => {
        const newLoan = db.addItem(
          'local_loans',
          {
            ...loan,
            outstanding_amount: loan.original_amount,
            status: 'OUTSTANDING',
          },
          currentOrgId,
          'loan'
        );
        setLoans((prev) => [...prev, newLoan]);
        return newLoan;
      },
      async () => {
        const res = await fetch('/api/loans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...loan,
            organization_id: currentOrgId,
            outstanding_amount: loan.original_amount,
            status: 'OUTSTANDING',
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to save loan record.');
        }
        const newLoan = await res.json();
        setLoans((prev) => [...prev, newLoan]);
        return newLoan;
      }
    );
  };

  const updateLoan = async (loan: Partial<Loan> & { id: string }) => {
    return runAction(
      (db) => {
        const updated = db.updateItem('local_loans', loan);
        setLoans((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      },
      async () => {
        const res = await fetch(`/api/loans/${loan.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(loan),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to update loan.');
        }
        const updated = await res.json();
        setLoans((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      }
    );
  };

  const deleteLoan = async (id: string) => {
    return runAction(
      (db) => {
        db.deleteItem('local_loans', id);
        setLoans((prev) => prev.filter((l) => l.id !== id));
      },
      async () => {
        const res = await fetch(`/api/loans/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to delete loan.');
        }
        setLoans((prev) => prev.filter((l) => l.id !== id));
      }
    );
  };

  // Loan Repayment Actions
  const addLoanRepayment = async (rep: Omit<LoanRepayment, 'id' | 'organization_id' | 'created_at'>): Promise<LoanRepayment> => {
    const handleLocalRep = async (db: any) => {
      const newRep = db.addItem('local_repayments', rep, currentOrgId, 'rep');
      setLoanRepayments((prev) => [...prev, newRep]);

      // Update loan outstanding amount
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

    return runAction(
      (db) => handleLocalRep(db),
      async () => {
        const res = await fetch('/api/repayments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...rep, organization_id: currentOrgId }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to save repayment.');
        }
        const newRep = await res.json();
        setLoanRepayments((prev) => [...prev, newRep]);

        // Update loan outstanding amount
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
      }
    );
  };

  const deleteLoanRepayment = async (repId: string) => {
    const handleLocalDelete = async (db: any) => {
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

      db.deleteItem('local_repayments', repId);
      setLoanRepayments((prev) => prev.filter((r) => r.id !== repId));
    };

    return runAction(
      (db) => handleLocalDelete(db),
      async () => {
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

        const res = await fetch(`/api/repayments/${repId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to delete repayment.');
        }
        setLoanRepayments((prev) => prev.filter((r) => r.id !== repId));
      }
    );
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
