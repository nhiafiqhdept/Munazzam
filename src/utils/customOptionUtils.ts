/**
 * Shared constants and helper utilities for GLOBAL "Other -> Add Custom Option" feature
 * across all forms and views in Munazzam.
 */

export const DEFAULT_INCOME_CATEGORIES = [
  'Donation',
  'Membership Fee',
  'Sponsorship',
  'Program Registration',
  'Fundraising',
  'Contribution',
  'Grant',
  'Other',
] as const;

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Food',
  'Printing',
  'Transportation',
  'Decoration',
  'Venue',
  'Stationery',
  'Equipment',
  'Honorarium',
  'Advertisement',
  'Accommodation',
  'Miscellaneous',
  'Other',
] as const;

export const DEFAULT_LOAN_PURPOSES = [
  'Program Advance',
  'Operational Advance',
  'Emergency Relief',
  'Equipment Purchase',
  'Travel Advance',
  'Venue Booking Advance',
  'Personal Loan',
  'Other',
] as const;

export const DEFAULT_TRANSFER_REASONS = [
  'Account Rebalancing',
  'Cash Withdrawal',
  'Bank Deposit',
  'Petty Cash Top-up',
  'Event Budget Allocation',
  'Emergency Transfer',
  'Other',
] as const;

export const DEFAULT_ACCOUNT_TYPES = [
  { value: 'cash', label: 'Cash in Hand' },
  { value: 'bank', label: 'Bank Account' },
  { value: 'upi', label: 'UPI / Digital' },
  { value: 'emergency', label: 'Emergency Fund' },
  { value: 'other', label: 'Other Account' },
] as const;

export const DEFAULT_ORGANIZER_POSITIONS_WITH_OTHER = [
  'President',
  'Vice President',
  'General Secretary',
  'Joint Secretary',
  'Treasurer',
  'Coordinator',
  'Media Coordinator',
  'Academic Secretary',
  'Cultural Secretary',
  'Public Relations Officer',
  'Executive Member',
  'Other',
] as const;

export const DEFAULT_AUDIENCES_WITH_OTHER = [
  'All Students',
  'Department Students',
  'First Year Students',
  'Faculty & Teachers',
  'Organization Members',
  'Academic Community',
  'General Public',
  'Other',
] as const;

/**
 * Checks if a selected value corresponds to the "Other" option.
 */
export function isOtherValue(val: string | undefined | null): boolean {
  if (!val) return false;
  const normalized = val.trim().toLowerCase();
  return (
    normalized === 'other' ||
    normalized === 'custom' ||
    normalized === 'other / custom...' ||
    normalized === 'other account' ||
    normalized === 'other / custom'
  );
}

/**
 * Resolves the initial state of a dropdown with custom 'Other' support.
 * Useful when opening edit modals where existing records may have custom strings.
 */
export function resolveCustomSelectState(
  currentValue?: string,
  rawOption?: string,
  customValue?: string,
  presets: readonly string[] = []
): { selected: string; custom: string; isOther: boolean } {
  // If explicitly flagged with raw_category === 'Other' or has custom_category
  if (isOtherValue(rawOption) || (customValue && customValue.trim())) {
    return {
      selected: 'Other',
      custom: customValue?.trim() || (currentValue !== 'Other' ? currentValue || '' : ''),
      isOther: true,
    };
  }

  // If currentValue is 'Other'
  if (isOtherValue(currentValue)) {
    return {
      selected: 'Other',
      custom: customValue?.trim() || '',
      isOther: true,
    };
  }

  // If currentValue exists and is part of the presets (excluding 'Other')
  if (currentValue && presets.length > 0) {
    const isPreset = presets.some(
      (p) => !isOtherValue(p) && p.toLowerCase().trim() === currentValue.toLowerCase().trim()
    );
    if (isPreset) {
      return {
        selected: currentValue,
        custom: '',
        isOther: false,
      };
    }

    // It's a custom value saved directly into the field!
    return {
      selected: 'Other',
      custom: currentValue,
      isOther: true,
    };
  }

  // Fallback to first preset or empty
  return {
    selected: presets[0] || '',
    custom: '',
    isOther: isOtherValue(presets[0]),
  };
}

/**
 * Resolves the effective display name for a record with potential custom option.
 */
export function getEffectiveDisplayValue(
  primaryValue?: string,
  customValue?: string,
  rawOption?: string,
  fallback = 'Uncategorized'
): string {
  if (customValue && customValue.trim()) {
    return customValue.trim();
  }
  if (primaryValue && !isOtherValue(primaryValue)) {
    return primaryValue.trim();
  }
  if (rawOption && !isOtherValue(rawOption)) {
    return rawOption.trim();
  }
  return fallback;
}
