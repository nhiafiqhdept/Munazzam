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
import { LogOut } from 'lucide-react';
import { OfflineBanner } from './components/pwa/OfflineBanner';
import { QuotaBanner } from './components/pwa/QuotaBanner';

const MainLayout: React.FC = () => {
  const { currentOrg, organizations, activeTab, logoutUser, user, hasConfiguredOrg } = useApp();

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
    setOrganizerToEdit(null);
    setIsOrganizerModalOpen(true);
  };

  const handleOpenEditOrganizer = (organizer: Organizer) => {
    setOrganizerToEdit(organizer);
    setIsOrganizerModalOpen(true);
  };

  const handleOpenAddProgram = () => {
    setProgramToEdit(null);
    setIsProgramModalOpen(true);
  };

  const handleOpenEditProgram = (program: Program) => {
    setProgramToEdit(program);
    setIsProgramModalOpen(true);
  };

  const isTreasuryTab = activeTab.startsWith('treasury');

  if (!hasConfiguredOrg) {
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

      {/* Treasury Sub-Navigation if in treasury section */}
      {isTreasuryTab && <TreasuryNav />}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 sm:pb-32">
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

        {activeTab === 'settings' && (
          <OrgSettingsView
            onOpenNewOrgModal={() => setIsOnboardingOpen(true)}
            onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
          />
        )}

        {/* Treasury Views */}
        {activeTab === 'treasury-dashboard' && (
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

        {activeTab === 'treasury-accounts' && (
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

        {activeTab === 'treasury-income' && (
          <IncomeView
            onOpenAddModal={() => setIsIncomeModalOpen(true)}
            onViewTransaction={() => {}}
          />
        )}

        {activeTab === 'treasury-expenses' && (
          <ExpenseView
            onOpenAddModal={() => setIsExpenseModalOpen(true)}
            onViewTransaction={() => {}}
          />
        )}

        {activeTab === 'treasury-loans' && (
          <LoansView
            onOpenAddLoan={() => setIsLoanModalOpen(true)}
            onOpenRepayment={(loan) => {
              setRepaymentLoan(loan);
              setIsRepaymentModalOpen(true);
            }}
          />
        )}

        {activeTab === 'treasury-transfers' && (
          <TransfersView onOpenAddTransfer={() => setIsTransferModalOpen(true)} />
        )}

        {activeTab === 'treasury-events' && <EventsView />}

        {activeTab === 'treasury-ledger' && <LedgerView />}

        {activeTab === 'treasury-cashbook' && <CashBookView />}

        {activeTab === 'treasury-reports' && <ReportsView />}

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
              Academic Organization Program Management & Treasury System • Multi-Account Financial Control
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-600 font-medium">Logged in as: <strong className="text-slate-900">{user?.username || user?.email}</strong></span>
            <button
              onClick={logoutUser}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl text-xs flex items-center gap-1 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
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
    </div>
  );
};

const AuthenticatedApp: React.FC = () => {
  const { token, user, authLoading, orgLoading, loginUser } = useApp();

  const isSuborgPortal = window.location.search.includes('suborg=true') || 
                         window.location.hash.includes('suborg=true') || 
                         window.location.search.includes('reg=') || 
                         window.location.hash.includes('reg=');

  const isSubwingPortal = window.location.search.includes('subwing=true') || 
                          window.location.hash.includes('subwing=true');

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
  return (
    <AppProvider>
      <AuthenticatedApp />
    </AppProvider>
  );
}

export default App;
