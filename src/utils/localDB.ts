import {
  Organization,
  Organizer,
  Program,
  FinancialAccount,
  Income,
  Expense,
  AccountTransfer,
  Loan,
  LoanRepayment,
  AuditLog,
} from '../types';

// Simple helper to generate unique IDs
const genId = (prefix: string) => `${prefix}_${Math.random().toString(36).substring(2, 11)}`;

export const localRegister = async (email: string, password: string) => {
  const usersStr = localStorage.getItem('local_users') || '[]';
  const users = JSON.parse(usersStr);

  if (users.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Username already exists in local database.');
  }

  const newUser = {
    id: genId('usr'),
    email: email,
    password: password, // simple storage for demo/local fallback
  };

  users.push(newUser);
  localStorage.setItem('local_users', JSON.stringify(users));

  const token = `local_token_${newUser.id}`;
  const responseUser = { id: newUser.id, email: newUser.email };

  return { token, user: responseUser };
};

export const localLogin = async (email: string, password: string) => {
  const usersStr = localStorage.getItem('local_users') || '[]';
  const users = JSON.parse(usersStr);

  const found = users.find(
    (u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!found) {
    throw new Error('Invalid username or password in local database.');
  }

  const token = `local_token_${found.id}`;
  const responseUser = { id: found.id, email: found.email };

  return { token, user: responseUser };
};

// Generic LocalStorage helper for entities
const getList = <T>(key: string): T[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveList = <T>(key: string, list: T[]) => {
  localStorage.setItem(key, JSON.stringify(list));
};

export const localDB = {
  // Organizations
  getOrganizations: (): Organization[] => {
    return getList<Organization>('local_organizations');
  },
  addOrganization: (orgData: Omit<Organization, 'id' | 'created_at' | 'updated_at'>): Organization => {
    const list = getList<Organization>('local_organizations');
    const newOrg: Organization = {
      ...orgData,
      id: genId('org'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    list.push(newOrg);
    saveList('local_organizations', list);
    return newOrg;
  },
  updateOrganization: (orgData: Partial<Organization> & { id: string }): Organization => {
    const list = getList<Organization>('local_organizations');
    const index = list.findIndex((o) => o.id === orgData.id);
    if (index === -1) throw new Error('Organization not found in local database');
    const updated = {
      ...list[index],
      ...orgData,
      updated_at: new Date().toISOString(),
    } as Organization;
    list[index] = updated;
    saveList('local_organizations', list);
    return updated;
  },
  deleteOrganization: (id: string) => {
    const list = getList<Organization>('local_organizations');
    const filtered = list.filter((o) => o.id !== id);
    saveList('local_organizations', filtered);
  },

  // Generic CRUD for children components
  getItems: <T extends { id: string; organization_id: string }>(key: string, orgId: string): T[] => {
    const list = getList<T>(key);
    return list.filter((item) => item.organization_id === orgId);
  },

  addItem: <T extends { id: string; organization_id: string; created_at?: string; updated_at?: string }>(
    key: string,
    item: Omit<T, 'id' | 'created_at' | 'updated_at'>,
    orgId: string,
    prefix: string
  ): T => {
    const list = getList<T>(key);
    const newItem = {
      ...item,
      id: genId(prefix),
      organization_id: orgId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as T;
    list.unshift(newItem);
    saveList(key, list);
    return newItem;
  },

  updateItem: <T extends { id: string; updated_at?: string }>(key: string, item: Partial<T> & { id: string }): T => {
    const list = getList<T>(key);
    const index = list.findIndex((x) => x.id === item.id);
    if (index === -1) throw new Error(`Item not found in local database: ${key}`);
    const updated = {
      ...list[index],
      ...item,
      updated_at: new Date().toISOString(),
    } as unknown as T;
    list[index] = updated;
    saveList(key, list);
    return updated;
  },

  deleteItem: <T extends { id: string }>(key: string, id: string) => {
    const list = getList<T>(key);
    const filtered = list.filter((x) => x.id !== id);
    saveList(key, filtered);
  },

  reorderItems: <T>(key: string, reordered: T[]) => {
    saveList(key, reordered);
  },
};
