export type UserRole = 'admin' | 'public';

export interface AuthUser {
  id: string;
  username: string;
  name?: string;
  email?: string;
  role?: UserRole;
  created_at?: string;
}

export interface Organization {
  id: string;
  name: string;
  college_name: string;
  logo: string;
  tagline?: string;
  established_year?: string;
  description?: string;
  email?: string;
  website?: string;
  created_at: string;
  updated_at: string;
  isInitialized?: boolean;
  about?: string;
  academic_year?: string;
  searchableName?: string;
}

export interface Organizer {
  id: string;
  organization_id: string;
  name: string;
  photo: string;
  position: string;
  display_order: number;
  email?: string;
  phone?: string;
  bio?: string;
  academic_year?: string;
  created_at: string;
  updated_at: string;
}

export type MediaType = 'photo' | 'video' | 'document' | 'link';

export interface ProgramMedia {
  id: string;
  program_id: string;
  type: MediaType;
  url: string;
  caption?: string;
  file_name?: string;
  created_at: string;
}

export interface ProgramCategory {
  id: string;
  organization_id: string; // matches accountId
  name: string;
  created_at: string;
  updated_at: string;
}

export type PermissionStatus =
  | 'not_requested'
  | 'draft'
  | 'pending'
  | 'recommended'
  | 'changes_required'
  | 'approved'
  | 'rejected';

export type ApprovingAuthorityRole =
  | 'Principal'
  | 'Faculty Coordinator'
  | 'HOD'
  | 'Dean'
  | 'Other Competent Authority';

export interface PermissionHistoryItem {
  id: string;
  timestamp: string;
  status: PermissionStatus;
  action: string;
  actorName: string;
  actorRole: string;
  notes?: string;
}

export interface ProgramPermission {
  id: string;
  programId: string;
  organizationId: string;
  programName: string;
  conductedBy: string;
  category?: string;
  subCategory?: string;
  date: string;
  time?: string;
  timeFrom?: string;
  timeTill?: string;
  venue: string;
  audience: string;
  resourcePerson?: string;
  expectedAttendance?: number;
  description: string;
  permissionNotes?: string;
  approvingAuthority: string;
  status: PermissionStatus;
  
  submittedBy?: {
    name: string;
    designation: string;
    date: string;
  };

  recommendedBy?: {
    name: string;
    designation: string;
    date: string;
    notes?: string;
  };

  approvedBy?: string;
  approvedAt?: string;
  approvalNotes?: string;
  approvalMethod?: 'in_app' | 'public_link';
  approverDesignation?: string;
  
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  
  changesRequestedBy?: string;
  changesRequestedAt?: string;
  changesRequiredNotes?: string;

  // Secure Token for Public Principal Review
  approvalToken?: string;
  tokenCreatedAt?: string;
  tokenExpiresAt?: string;
  tokenRevoked?: boolean;

  history: PermissionHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Program {
  id: string;
  organization_id: string;
  name: string;
  category_id?: string;
  category?: string;
  subCategory?: string;
  date: string; // YYYY-MM-DD
  time?: string;
  place: string;
  audience: string; // e.g. "Students", "Teachers", "Public", "Department Students"
  description: string;
  poster: string;
  media: ProgramMedia[];
  status?: 'completed' | 'upcoming';
  attendance_count?: number;
  created_at: string;
  updated_at: string;
  subWingId?: string;
  subWingName?: string;
  subWingStatus?: 'pending' | 'approved' | 'rejected';
  submittedByEmail?: string;
  submittedAt?: string;
  resourcePerson?: string;
  presenter_name?: string;
  presenter_designation?: string;
  permissionStatus?: PermissionStatus;
  permissionId?: string;
}

export interface SubWing {
  id: string;
  portalId: string; // matches main organization accountId
  name: string;
  president: string; // President / Responsible Person
  contactDetails: string;
  email: string;
  passwordHash: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'organizers'
  | 'programs'
  | 'program-permissions'
  | 'settings'
  | 'program_details'
  | 'program-details'
  | 'treasury'
  | 'treasury-dashboard'
  | 'treasury-accounts'
  | 'treasury-income'
  | 'treasury-expenses'
  | 'treasury-loans'
  | 'treasury-transfers'
  | 'treasury-events'
  | 'treasury-ledger'
  | 'treasury-cashbook'
  | 'treasury-reports'
  | 'student-points';

export type FinancialAccountType = 'cash' | 'bank' | 'upi' | 'emergency' | 'other';

export interface FinancialAccount {
  id: string;
  organization_id: string;
  name: string;
  type: FinancialAccountType;
  opening_balance: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type Account = FinancialAccount;

export interface Income {
  id: string;
  organization_id: string;
  account_id: string;
  category: string;
  program_id?: string;
  date: string;
  amount: number;
  source: string;
  description?: string;
  receipt?: string;
  reference_number?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  organization_id: string;
  account_id: string;
  category: string;
  program_id?: string;
  date: string;
  amount: number;
  paid_to: string;
  description?: string;
  receipt?: string;
  reference_number?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AccountTransfer {
  id: string;
  organization_id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  date: string;
  description?: string;
  reference_number?: string;
  created_by?: string;
  created_at: string;
}

export type LoanType = 'BORROWED' | 'LENT';

export type LoanStatus = 'OUTSTANDING' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'PARTIALLY_RECOVERED' | 'FULLY_RECOVERED';

export interface Loan {
  id: string;
  organization_id: string;
  type: LoanType;
  person_or_organization: string;
  original_amount: number;
  outstanding_amount: number;
  date: string;
  due_date?: string;
  purpose: string;
  account_id: string;
  description?: string;
  proof?: string;
  status: LoanStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface LoanRepayment {
  id: string;
  loan_id: string;
  organization_id: string;
  account_id: string;
  date: string;
  amount: number;
  type: 'REPAY' | 'RECOVER';
  description?: string;
  notes?: string;
  proof?: string;
  created_by?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  details: string;
  performed_by: string;
  timestamp: string;
}

export interface AppState {
  organizations: Organization[];
  currentOrgId: string;
  organizers: Organizer[];
  programs: Program[];
  isAdmin: boolean;
  adminPin: string;
  isPublicView?: boolean;
}
