import { safeApiFetch } from './api';

export interface LocalMigrationData {
  users?: any[];
  organizations?: any[];
  organizers?: any[];
  programs?: any[];
  accounts?: any[];
  incomes?: any[];
  expenses?: any[];
  loans?: any[];
  repayments?: any[];
  transfers?: any[];
  audit_logs?: any[];
}

export function getLocalDataToMigrate(): LocalMigrationData | null {
  try {
    const keys = [
      'local_users',
      'local_organizations',
      'local_organizers',
      'local_programs',
      'local_accounts',
      'local_incomes',
      'local_expenses',
      'local_loans',
      'local_repayments',
      'local_transfers',
      'local_audit_logs',
    ];

    let hasData = false;
    const result: Record<string, any[]> = {};

    for (const key of keys) {
      const val = localStorage.getItem(key);
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const cleanKey = key.replace('local_', '');
            result[cleanKey] = parsed;
            hasData = true;
          }
        } catch {}
      }
    }

    return hasData ? (result as LocalMigrationData) : null;
  } catch {
    return null;
  }
}

export function clearLegacyLocalStorage() {
  try {
    const keys = [
      'local_users',
      'local_organizations',
      'local_organizers',
      'local_programs',
      'local_accounts',
      'local_incomes',
      'local_expenses',
      'local_loans',
      'local_repayments',
      'local_transfers',
      'local_audit_logs',
    ];
    for (const key of keys) {
      localStorage.removeItem(key);
    }
  } catch {}
}

export async function syncLegacyLocalDataToServer(): Promise<{ migrated: boolean; success: boolean }> {
  try {
    const data = getLocalDataToMigrate();
    if (!data) return { migrated: false, success: true };

    const res = await safeApiFetch('/api/migration/sync-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      clearLegacyLocalStorage();
      return { migrated: true, success: true };
    }
    return { migrated: false, success: false };
  } catch (err) {
    console.error('Migration error:', err);
    return { migrated: false, success: false };
  }
}
