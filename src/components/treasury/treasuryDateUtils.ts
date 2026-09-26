/**
 * Utility functions for Month-based and Date-based Treasury features
 */

export interface TreasuryDateFilter {
  selectedMonth: string; // 'YYYY-MM' or 'ALL'
  dateFilterType: 'ALL' | 'SPECIFIC' | 'RANGE';
  specificDate: string; // 'YYYY-MM-DD'
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
}

export function getDefaultMonthKey(): string {
  // Try to read saved month or fallback to current local month
  try {
    const saved = localStorage.getItem('munazzam_treasury_month');
    if (saved && (saved === 'ALL' || /^\d{4}-\d{2}$/.test(saved))) {
      return saved;
    }
  } catch {
    // ignore
  }
  return new Date().toISOString().substring(0, 7);
}

export function saveDefaultMonthKey(monthKey: string): void {
  try {
    localStorage.setItem('munazzam_treasury_month', monthKey);
  } catch {
    // ignore
  }
}

export function getMonthKeyFromDate(dateStr: string): string {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}/.test(dateStr)) {
    return dateStr.substring(0, 7);
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function formatMonthLabel(monthKey: string): string {
  if (!monthKey || monthKey === 'ALL') return 'All Months';
  const parts = monthKey.split('-');
  if (parts.length < 2) return monthKey;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const d = new Date(year, month, 1);
  if (isNaN(d.getTime())) return monthKey;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function getAdjacentMonth(monthKey: string, delta: number): string {
  let [y, m] = (monthKey === 'ALL' ? new Date().toISOString().substring(0, 7) : monthKey).split('-').map(Number);
  if (!y || !m) {
    const now = new Date();
    y = now.getFullYear();
    m = now.getMonth() + 1;
  }
  const date = new Date(y, m - 1 + delta, 1);
  const newY = date.getFullYear();
  const newM = String(date.getMonth() + 1).padStart(2, '0');
  return `${newY}-${newM}`;
}

export function matchTreasuryDateFilter(
  itemDateStr: string,
  filter: TreasuryDateFilter
): boolean {
  if (!itemDateStr) return false;
  const itemDate = itemDateStr.substring(0, 10);

  // 1. If specific date is active
  if (filter.dateFilterType === 'SPECIFIC') {
    if (!filter.specificDate) return true;
    return itemDate === filter.specificDate;
  }

  // 2. If custom date range is active
  if (filter.dateFilterType === 'RANGE') {
    if (filter.startDate && itemDate < filter.startDate) return false;
    if (filter.endDate && itemDate > filter.endDate) return false;
    return true;
  }

  // 3. Month-based filter
  if (filter.selectedMonth === 'ALL') return true;
  const monthKey = getMonthKeyFromDate(itemDate);
  return monthKey === filter.selectedMonth;
}

export function sortByDateDesc<T extends { date: string; created_at?: string; id?: string }>(records: T[]): T[] {
  return [...records].sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    if (dateA !== dateB) {
      return dateB.localeCompare(dateA);
    }
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (timeA !== timeB) {
      return timeB - timeA;
    }
    return (b.id || '').localeCompare(a.id || '');
  });
}

export function extractAvailableMonths(
  incomes: { date: string }[],
  expenses: { date: string }[],
  loans: { date: string }[],
  repayments: { date: string }[]
): string[] {
  const currentMonthKey = new Date().toISOString().substring(0, 7);
  const set = new Set<string>();
  set.add(currentMonthKey);

  const add = (d?: string) => {
    if (!d) return;
    const key = getMonthKeyFromDate(d);
    if (key && /^\d{4}-\d{2}$/.test(key)) {
      set.add(key);
    }
  };

  incomes.forEach((i) => add(i.date));
  expenses.forEach((e) => add(e.date));
  loans.forEach((l) => add(l.date));
  repayments.forEach((r) => add(r.date));

  return Array.from(set).sort((a, b) => b.localeCompare(a));
}
