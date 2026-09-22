import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthScreen } from './components/AuthScreen';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { OrganizersView } from './components/OrganizersView';
import { ProgramsView } from './components/ProgramsView';
import { ProgramDetailsView } from './components/ProgramDetailsView';
import { OrgSettingsView } from './components/OrgSettingsView';
import { OnboardingModal } from './components/OnboardingModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { OrganizerModal } from './components/OrganizerModal';
import { ProgramModal } from './components/ProgramModal';
import { StudentPointsPortal } from './components/points/StudentPointsPortal';
import { SubWingProgramsPortal } from './components/SubWingProgramsPortal';

import { TreasuryNav } from './components/treasury/TreasuryNav';
import { TreasuryDashboardView } from './components/treasury/TreasuryDashboardView';
import { AccountsView } from './components/treasury/AccountsView';
import { IncomeView } from './components/treasury/IncomeView';
import { ExpenseView } from './components/treasury/ExpenseView';
import { LoansView } from './components/treasury/LoansView';
import { TransfersView } from './components/treasury/TransfersView';
import { LedgerView } from './components/treasury/LedgerView';
import { CashBookView } from './components/treasury/CashBookView';
import { ReportsView } from './components/treasury/ReportsView';
import { EventsView } from './components/treasury/EventsView';

import { IncomeModal } from './components/treasury/IncomeModal';
import { ExpenseModal } from './components/treasury/ExpenseModal';
import { AccountModal } from './components/treasury/AccountModal';
import { TransferModal } from './components/treasury/TransferModal';
import { LoanModal } from './components/treasury/LoanModal';
import { RepaymentModal } from './components/treasury/RepaymentModal';
import { Organizer, Program, FinancialAccount, Loan } from './types';
import { LogOut, AlertCircle } from 'lucide-react';
import { OfflineBanner } from './components/pwa/OfflineBanner';
import { QuotaBanner } from './components/pwa/QuotaBanner';
import { PublicPermissionApprovalView } from './components/permissions/PublicPermissionApprovalView';
import { ErrorBoundary } from './components/common/ErrorBoundary';

function extractPublicOrgSearchableName(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  const search = window.location.search;

  if (hash.includes('public_org=')) {
    const queryStr = hash.includes('?') ? hash.substring(hash.indexOf('?') + 1) : hash.substring(1);
    const params = new URLSearchParams(queryStr);
    const val = params.get('public_org');
    if (val) return decodeURIComponent(val);
  }
  if (search.includes('public_org=')) {
    const params = new URLSearchParams(search);
    const val = params.get('public_org');
    if (val) return decodeURIComponent(val);
  }
  return null;
}

const MainLayout: React.FC = () => {
  const { currentOrg, organizations, activeTab, logoutUser, user, hasConfiguredOrg, isPublicView, exitPublicView } = useApp();

  // Modal open states
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  // Organizer modal state
  const [isOrganizerModalOpen, setIsOrganizerModalOpen] = useState(false);
  const [organizerToEdit, setOrganizerToEdit] = useState<Organizer | null>(null);

  // Program modal state
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [programToEdit, setProgramToEdit] = useState<Program | null>(null);

  // Treasury Modal States
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<FinancialAccount | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isRepaymentModalOpen, setIsRepaymentModalOpen] = useState(false);
  const [repaymentLoan, setRepaymentLoan] = useState<Loan | null>(null);

  const handleOpenAddOrganizer = () => {
    if (isPublicView) return;
    setOrganizerToEdit(null);
    setIsOrganizerModalOpen(true);
  };

  const handleOpenEditOrganizer = (organizer: Organizer) => {
    if (isPublicView) return;
    setOrganizerToEdit(organizer);
    setIsOrganizerModalOpen(true);
  };

  const handleOpenAddProgram = () => {
    if (isPublicView) return;
    setProgramToEdit(null);
    setIsProgramModalOpen(true);
  };

  const handleOpenEditProgram = (program: Program) => {
    if (isPublicView) return;
    setProgramToEdit(program);
    setIsProgramModalOpen(true);
  };

  const isTreasuryTab = activeTab.startsWith('treasury');

  if (!hasConfiguredOrg && !isPublicView) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-between items-center p-6 text-white relative">
        <div className="w-full max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 p-1 border border-emerald-500/20 flex items-center justify-center">
              <img src="/icon.svg" alt="Munazzam" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = '/icon-192x192.png'; }} />
            </div>
            <span className="font-bold tracking-tight text-white font-heading text-sm">Munazzam</span>
          </div>
          <button
            onClick={logoutUser}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1.5 cursor-pointer bg-rose-500/10 border border-rose-500/20 px-3.5 py-1.5 rounded-xl active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout ({user?.username || user?.email})</span>
          </button>
        </div>

        <OnboardingModal isOpen={true} isInitialSetup={true} />

        <div className="text-center text-xs text-slate-500 max-w-sm mt-8">
          &copy; {new Date().getFullYear()} Munazzam. All rights reserved.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans relative">
      {/* Top Header */}
      <Header
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
      />

      {/* Persistent Bottom Navigation Bar */}
      <Navigation />

      {/* Treasury Sub-Navigation if in treasury section and not public view */}
      {isTreasuryTab && !isPublicView && <TreasuryNav />}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl lg:max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 sm:pb-32 lg:pb-16">
        {activeTab === 'dashboard' && (
          <Dashboard
            onOpenAddProgram={handleOpenAddProgram}
            onOpenAddOrganizer={handleOpenAddOrganizer}
          />
        )}

        {activeTab === 'organizers' && (
          <OrganizersView
            onOpenAddModal={handleOpenAddOrganizer}
            onOpenEditModal={handleOpenEditOrganizer}
          />
        )}

        {activeTab === 'programs' && (
          <ProgramsView
            onOpenAddModal={handleOpenAddProgram}
            onOpenEditModal={handleOpenEditProgram}
          />
        )}

        {(activeTab === 'program_details' || activeTab === 'program-details') && (
          <ProgramDetailsView onOpenEditModal={handleOpenEditProgram} />
        )}

        {activeTab === 'settings' && !isPublicView && (
          <OrgSettingsView
            onOpenNewOrgModal={() => setIsOnboardingOpen(true)}
            onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
          />
        )}

        {/* Treasury Views */}
        {(activeTab === 'treasury-dashboard' || (isPublicView && isTreasuryTab)) && (
          <TreasuryDashboardView
            onOpenAddIncome={() => setIsIncomeModalOpen(true)}
            onOpenAddExpense={() => setIsExpenseModalOpen(true)}
            onOpenAddTransfer={() => setIsTransferModalOpen(true)}
            onOpenAddLoan={() => setIsLoanModalOpen(true)}
            onOpenAddAccount={() => {
              setAccountToEdit(null);
              setIsAccountModalOpen(true);
            }}
          />
        )}

        {activeTab === 'treasury-accounts' && !isPublicView && (
          <AccountsView
            onOpenAddModal={() => {
              setAccountToEdit(null);
              setIsAccountModalOpen(true);
            }}
            onOpenEditModal={(acc) => {
              setAccountToEdit(acc);
              setIsAccountModalOpen(true);
            }}
          />
        )}

        {activeTab === 'treasury-income' && !isPublicView && (
          <IncomeView
            onOpenAddModal={() => setIsIncomeModalOpen(true)}
            onViewTransaction={() => {}}
          />
        )}

        {activeTab === 'treasury-expenses' && !isPublicView && (
          <ExpenseView
            onOpenAddModal={() => setIsExpenseModalOpen(true)}
            onViewTransaction={() => {}}
          />
        )}

        {activeTab === 'treasury-loans' && !isPublicView && (
          <LoansView
            onOpenAddLoan={() => setIsLoanModalOpen(true)}
            onOpenRepayment={(loan) => {
              setRepaymentLoan(loan);
              setIsRepaymentModalOpen(true);
            }}
          />
        )}

        {activeTab === 'treasury-transfers' && !isPublicView && (
          <TransfersView onOpenAddTransfer={() => setIsTransferModalOpen(true)} />
        )}

        {activeTab === 'treasury-events' && !isPublicView && <EventsView />}

        {activeTab === 'treasury-ledger' && !isPublicView && <LedgerView />}

        {activeTab === 'treasury-cashbook' && !isPublicView && <CashBookView />}

        {activeTab === 'treasury-reports' && !isPublicView && <ReportsView />}

        {activeTab === 'student-points' && <StudentPointsPortal />}
      </main>

      {/* Institutional Academic Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-8 text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 space-y-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-slate-700">
              {currentOrg?.name} • {currentOrg?.college_name}
            </p>
            <p className="text-[11px] text-slate-400">
              {isPublicView
                ? 'Munazzam Academic Platform • Public Directory & Read-Only Workspace'
                : 'Academic Organization Program Management & Treasury System • Multi-Account Financial Control'}
            </p>
          </div>
          {isPublicView ? (
            <div className="flex items-center gap-3">
              <span className="text-slate-600 font-medium">Mode: <strong className="text-emerald-700">Public Read-Only</strong></span>
              <button
                onClick={exitPublicView}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit to Sign In</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-slate-600 font-medium">Logged in as: <strong className="text-slate-900">{user?.username || user?.email}</strong></span>
              <button
                onClick={logoutUser}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </footer>

      {/* Modals - Only active when not in public view */}
      {!isPublicView && (
        <>
          <OnboardingModal
            isOpen={isOnboardingOpen}
            onClose={() => setIsOnboardingOpen(false)}
            isInitialSetup={organizations.length === 0}
          />

          <AdminLoginModal
            isOpen={isAdminLoginOpen}
            onClose={() => setIsAdminLoginOpen(false)}
          />

          <OrganizerModal
            isOpen={isOrganizerModalOpen}
            onClose={() => {
              setIsOrganizerModalOpen(false);
              setOrganizerToEdit(null);
            }}
            organizerToEdit={organizerToEdit}
          />

          <ProgramModal
            isOpen={isProgramModalOpen}
            onClose={() => {
              setIsProgramModalOpen(false);
              setProgramToEdit(null);
            }}
            programToEdit={programToEdit}
          />

          {/* Treasury Modals */}
          <IncomeModal isOpen={isIncomeModalOpen} onClose={() => setIsIncomeModalOpen(false)} />
          <ExpenseModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} />
          <AccountModal
            isOpen={isAccountModalOpen}
            onClose={() => {
              setIsAccountModalOpen(false);
              setAccountToEdit(null);
            }}
            editingAccount={accountToEdit}
          />
          <TransferModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} />
          <LoanModal isOpen={isLoanModalOpen} onClose={() => setIsLoanModalOpen(false)} />
          <RepaymentModal
            isOpen={isRepaymentModalOpen}
            onClose={() => {
              setIsRepaymentModalOpen(false);
              setRepaymentLoan(null);
            }}
            loan={repaymentLoan}
          />
        </>
      )}
    </div>
  );
};

// Check if current URL represents a public College Permission route
function isPublicCollegePermissionRoute(): boolean {
  if (typeof window === 'undefined') return false;

  const href = window.location.href || '';
  const pathname = window.location.pathname || '';
  const search = window.location.search || '';
  const hash = window.location.hash || '';

  return (
    pathname.includes('/public/college-permission') ||
    pathname.includes('/permission/') ||
    hash.includes('/public/college-permission') ||
    hash.includes('/permission/') ||
    href.includes('cpt_') ||
    search.includes('permission_token=') ||
    hash.includes('permission_token=')
  );
}

// Extract public permission token from URL before initialization
function extractPublicPermissionToken(): string | null {
  if (typeof window === 'undefined') return null;

  const href = window.location.href || '';
  const pathname = window.location.pathname || '';
  const search = window.location.search || '';
  const hash = window.location.hash || '';

  // 1. Direct path matching: /public/college-permission/<token>
  const publicPathPrefix = '/public/college-permission/';
  if (pathname.includes(publicPathPrefix)) {
    const raw = pathname.substring(pathname.indexOf(publicPathPrefix) + publicPathPrefix.length);
    const token = raw.split('/')[0].split('?')[0].split('#')[0];
    if (token && token.trim()) {
      return decodeURIComponent(token.trim());
    }
  }

  // 2. Comprehensive regex match for standard Munazzam permission tokens (cpt_...)
  const cptMatch = href.match(/(cpt_[a-zA-Z0-9_-]+)/);
  if (cptMatch && cptMatch[1]) {
    return cptMatch[1].trim();
  }

  // 3. Fallback path matching: /permission/<token>
  const permPathPrefix = '/permission/';
  if (pathname.includes(permPathPrefix) && !pathname.includes('/public/college-permission/')) {
    const raw = pathname.substring(pathname.indexOf(permPathPrefix) + permPathPrefix.length);
    const token = raw.split('/')[0].split('?')[0].split('#')[0];
    if (token && token.trim()) {
      return decodeURIComponent(token.trim());
    }
  }

  // 4. Hash-based route: #/public/college-permission/<token>
  if (hash.includes(publicPathPrefix)) {
    const raw = hash.substring(hash.indexOf(publicPathPrefix) + publicPathPrefix.length);
    const token = raw.split('/')[0].split('?')[0].split('#')[0];
    if (token && token.trim()) {
      return decodeURIComponent(token.trim());
    }
  }

  // 5. Query param: ?permission_token=<token> or ?token=<token>
  if (search.includes('permission_token=') || search.includes('token=')) {
    const params = new URLSearchParams(search);
    const token = params.get('permission_token') || params.get('token');
    if (token && token.trim()) {
      return token.trim();
    }
  }

  // 6. Hash query param: #...permission_token=<token>
  if (hash.includes('permission_token=') || hash.includes('token=')) {
    const hashQuery = hash.includes('?') ? hash.substring(hash.indexOf('?') + 1) : hash.substring(1);
    const params = new URLSearchParams(hashQuery);
    const token = params.get('permission_token') || params.get('token');
    if (token && token.trim()) {
      return token.trim();
    }
  }

  return null;
}

const AuthenticatedApp: React.FC = () => {
  const { token, user, authLoading, orgLoading, loginUser, isPublicView, organizations, exitPublicView } = useApp();

  const isSuborgPortal = window.location.search.includes('suborg=true') || 
                         window.location.hash.includes('suborg=true') || 
                         window.location.search.includes('reg=') || 
                         window.location.hash.includes('reg=');

  const isSubwingPortal = window.location.search.includes('subwing=true') || 
                          window.location.hash.includes('subwing=true') ||
                          window.location.search.includes('portal=swp_') ||
                          window.location.hash.includes('portal=swp_') ||
                          window.location.search.includes('swp_') ||
                          window.location.hash.includes('swp_');

  if ((authLoading || orgLoading) && !isSuborgPortal && !isSubwingPortal) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-950 p-2.5 border border-emerald-500/30 shadow-2xl flex items-center justify-center">
            <img 
              src="/icon-192x192.png" 
              alt="Munazzam" 
              className="w-full h-full object-contain rounded-xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/icon.svg';
              }} 
            />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold font-heading text-white tracking-tight">Munazzam</h2>
            <p className="text-xs text-slate-400">Organization & Recordkeeping Platform</p>
          </div>
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mt-2" />
        </div>
      </div>
    );
  }

  if (isSuborgPortal) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-2 xs:p-3 sm:p-6 lg:p-8">
        <OfflineBanner />
        <QuotaBanner />
        <div className="w-full max-w-7xl mx-auto">
          <StudentPointsPortal />
        </div>
      </div>
    );
  }

  if (isSubwingPortal) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-2 xs:p-3 sm:p-6 lg:p-8">
        <OfflineBanner />
        <QuotaBanner />
        <div className="w-full max-w-7xl mx-auto">
          <SubWingProgramsPortal />
        </div>
      </div>
    );
  }

  if (isPublicView) {
    if (organizations.length === 0) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-md shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold font-heading text-slate-900">Organization Not Found</h2>
            <p className="text-xs text-slate-500">The requested organization could not be located in the public directory.</p>
            <button
              onClick={exitPublicView}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
            >
              Return to Login & Search
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <OfflineBanner />
        <QuotaBanner />
        <MainLayout />
      </>
    );
  }

  if (!token || !user) {
    return (
      <>
        <OfflineBanner />
        <QuotaBanner />
        <AuthScreen
          onLoginSuccess={(newToken, newUser) => {
            loginUser(newToken, newUser);
          }}
        />
      </>
    );
  }

  return (
    <>
      <OfflineBanner />
      <QuotaBanner />
      <MainLayout />
    </>
  );
};

export function App() {
  const isPublicRoute = isPublicCollegePermissionRoute();
  const publicPermissionToken = extractPublicPermissionToken();
  const publicOrgSearchableName = extractPublicOrgSearchableName();

  if (publicOrgSearchableName) {
    return (
      <ErrorBoundary fallbackTitle="Munazzam Public Workspace">
        <AppProvider isPublicView={true} publicOrgQuery={publicOrgSearchableName}>
          <AuthenticatedApp />
        </AppProvider>
      </ErrorBoundary>
    );
  }

  // Bypasses all authentication, AppProvider, and protected route checks for public College Permission review
  if (isPublicRoute || publicPermissionToken) {
    return (
      <ErrorBoundary fallbackTitle="College Permission Review Portal">
        <OfflineBanner />
        <PublicPermissionApprovalView token={publicPermissionToken || ''} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AppProvider>
        <AuthenticatedApp />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
