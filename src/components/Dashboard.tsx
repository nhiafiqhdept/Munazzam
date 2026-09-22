import React from 'react';
import {
  Users,
  CalendarDays,
  Settings,
  Landmark,
  Building,
  Mail,
  Globe,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  Trophy,
  Wallet,
  Coins,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ActiveTab } from '../types';
import { UpcomingProgramsCarousel } from './UpcomingProgramsCarousel';

interface DashboardProps {
  onOpenAddProgram: () => void;
  onOpenAddOrganizer: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenAddProgram, onOpenAddOrganizer }) => {
  const {
    currentOrg,
    programs,
    organizers,
    accounts,
    incomes,
    expenses,
    loans,
    setActiveTab,
    viewProgramDetails,
    isPublicView,
  } = useApp();

  if (!currentOrg) return null;

  // Calculate real balances from actual database state
  const totalIncomes = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalOpening = accounts.reduce((sum, a) => sum + a.opening_balance, 0);
  const totalBalance = totalOpening + totalIncomes - totalExpenses;

  const totalBorrowed = loans
    .filter((l) => l.type === 'BORROWED')
    .reduce((sum, l) => sum + l.outstanding_amount, 0);

  const totalLent = loans
    .filter((l) => l.type === 'LENT')
    .reduce((sum, l) => sum + l.outstanding_amount, 0);

  const activeAccountsCount = accounts.filter((a) => a.is_active).length;

  const topOrganizers = organizers.slice(0, 6);

  const quickModules = [
    {
      id: 'programs' as ActiveTab,
      title: 'Programs & Activities',
      icon: CalendarDays,
      bgTheme: 'bg-blue-50',
      textTheme: 'text-blue-600',
    },
    {
      id: 'organizers' as ActiveTab,
      title: 'Organizers & Office Bearers',
      icon: Users,
      bgTheme: 'bg-emerald-50',
      textTheme: 'text-emerald-600',
    },
    {
      id: 'treasury-dashboard' as ActiveTab,
      title: 'Treasury & Accounts',
      icon: Landmark,
      bgTheme: 'bg-amber-50',
      textTheme: 'text-amber-600',
    },
    isPublicView
      ? {
          id: 'student-points' as ActiveTab,
          title: 'Organization Profile',
          icon: Trophy,
          bgTheme: 'bg-teal-50',
          textTheme: 'text-teal-600',
        }
      : {
          id: 'settings' as ActiveTab,
          title: 'Organization Profile',
          icon: Building,
          bgTheme: 'bg-teal-50',
          textTheme: 'text-teal-600',
        },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-8 pb-16 lg:pb-12 max-w-7xl lg:max-w-[1400px] mx-auto">
      {/* 1. Upcoming Programs Carousel */}
      <UpcomingProgramsCarousel programs={programs} onViewDetails={viewProgramDetails} />

      {/* 2. Quick Navigation Modules */}
      <section className="space-y-3 lg:space-y-4" data-purpose="quick-navigation-modules">
        <h2 className="text-xs lg:text-sm font-bold uppercase tracking-wider text-slate-500 font-heading px-1">
          Quick Navigation Modules
        </h2>

        <div className="grid grid-cols-4 gap-2 sm:gap-4 lg:gap-6 overflow-x-auto pb-1">
          {quickModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                onClick={() => setActiveTab(mod.id)}
                className="bg-white rounded-xl sm:rounded-2xl lg:rounded-2xl p-2.5 sm:p-4 lg:p-6 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 cursor-pointer flex flex-col items-center lg:items-start text-center lg:text-left group relative min-w-[72px]"
              >
                {/* Large colourful icon */}
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full lg:rounded-2xl ${mod.bgTheme} ${mod.textTheme} flex items-center justify-center mb-2 lg:mb-4 group-hover:scale-105 transition-transform shadow-xs shrink-0`}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
                </div>

                {/* Navigation Name */}
                <h3 className="text-[10px] sm:text-xs lg:text-base font-semibold sm:font-bold text-slate-900 group-hover:text-emerald-800 transition-colors leading-tight line-clamp-2 mb-2 lg:mb-4 flex-1">
                  {mod.title}
                </h3>

                {/* Mobile Small Arrow Indicator */}
                <div className="lg:hidden w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-50 group-hover:bg-emerald-50 text-slate-400 group-hover:text-emerald-700 flex items-center justify-center transition-colors border border-slate-200/70">
                  <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>

                {/* Desktop Open -> text link */}
                <div className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-slate-500 group-hover:text-emerald-700 transition-colors">
                  <span>Open</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Treasury Overview */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 lg:p-8 shadow-2xs space-y-4 lg:space-y-6" data-purpose="treasury-overview-section">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 lg:pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-emerald-700" />
            <h2 className="text-xs lg:text-sm font-bold uppercase tracking-wider text-slate-500 font-heading">
              TREASURY OVERVIEW
            </h2>
          </div>
          <button
            onClick={() => setActiveTab('treasury-dashboard')}
            className="text-xs lg:text-sm font-bold text-emerald-700 hover:underline cursor-pointer flex items-center gap-0.5"
          >
            <span>Open Treasury</span>
            <ChevronRight className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </button>
        </div>

        {/* Available Balance - Hero Card */}
        <div className="p-5 lg:p-7 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl text-white shadow-md relative overflow-hidden">
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-15 pointer-events-none">
            <Wallet className="w-24 h-24 lg:w-32 lg:h-32 text-white" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-emerald-100 text-xs lg:text-sm font-semibold mb-1">
              <Wallet className="w-4 h-4" />
              <span>Available Balance</span>
            </div>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight font-heading mt-0.5">
              ₹{totalBalance.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Financial Summary Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-6">
          {/* Total Income */}
          <div className="p-3.5 lg:p-5 bg-emerald-50/80 rounded-xl lg:rounded-2xl border border-emerald-100/80 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[11px] lg:text-xs font-bold text-emerald-800 mb-1 lg:mb-2">
              <ArrowDownLeft className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-emerald-600 shrink-0" />
              <span className="truncate">Total Income</span>
            </div>
            <p className="text-sm sm:text-base lg:text-2xl font-extrabold text-emerald-900 font-heading">
              ₹{totalIncomes.toLocaleString('en-IN')}
            </p>
          </div>

          {/* Total Expenses */}
          <div className="p-3.5 lg:p-5 bg-rose-50/80 rounded-xl lg:rounded-2xl border border-rose-100/80 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[11px] lg:text-xs font-bold text-rose-800 mb-1 lg:mb-2">
              <ArrowUpRight className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-rose-600 shrink-0" />
              <span className="truncate">Total Expenses</span>
            </div>
            <p className="text-sm sm:text-base lg:text-2xl font-extrabold text-rose-900 font-heading">
              ₹{totalExpenses.toLocaleString('en-IN')}
            </p>
          </div>

          {/* Loan Borrowed */}
          <div 
            onClick={() => setActiveTab('treasury-loans')}
            className="p-3.5 lg:p-5 bg-blue-50/80 rounded-xl lg:rounded-2xl border border-blue-100/80 flex flex-col justify-between cursor-pointer hover:bg-blue-100/60 transition-colors"
          >
            <div className="flex items-center gap-1.5 text-[11px] lg:text-xs font-bold text-blue-800 mb-1 lg:mb-2">
              <TrendingDown className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-blue-600 shrink-0" />
              <span className="truncate">Loan Borrowed</span>
            </div>
            <p className="text-sm sm:text-base lg:text-2xl font-extrabold text-blue-900 font-heading">
              ₹{totalBorrowed.toLocaleString('en-IN')}
            </p>
          </div>

          {/* Loan Lent */}
          <div 
            onClick={() => setActiveTab('treasury-loans')}
            className="p-3.5 lg:p-5 bg-amber-50/80 rounded-xl lg:rounded-2xl border border-amber-100/80 flex flex-col justify-between cursor-pointer hover:bg-amber-100/60 transition-colors"
          >
            <div className="flex items-center gap-1.5 text-[11px] lg:text-xs font-bold text-amber-800 mb-1 lg:mb-2">
              <TrendingUp className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-amber-600 shrink-0" />
              <span className="truncate">Loan Lent</span>
            </div>
            <p className="text-sm sm:text-base lg:text-2xl font-extrabold text-amber-900 font-heading">
              ₹{totalLent.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Active Accounts Card */}
        <div
          onClick={() => setActiveTab('treasury-accounts')}
          className="p-4 lg:p-5 bg-cyan-50/60 rounded-xl lg:rounded-2xl border border-cyan-100/80 flex items-center justify-between cursor-pointer hover:bg-cyan-100/70 transition-colors"
        >
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="w-9 h-9 lg:w-11 lg:h-11 rounded-full lg:rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">
              <Landmark className="w-4.5 h-4.5 lg:w-5 lg:h-5" />
            </div>
            <div>
              <p className="text-[11px] lg:text-xs font-bold uppercase tracking-wider text-cyan-800">
                Active Accounts
              </p>
              <p className="text-sm sm:text-base lg:text-lg font-extrabold text-cyan-950 font-heading">
                {activeAccountsCount} Active Accounts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-cyan-700 font-bold text-xs lg:text-sm">
            <span className="hidden sm:inline">View Accounts</span>
            <ChevronRight className="w-4 h-4 text-cyan-600" />
          </div>
        </div>

        {/* Bottom Treasury Action Row */}
        <div className="pt-3 lg:pt-4 border-t border-slate-100 flex items-center justify-between text-xs lg:text-sm text-slate-500 font-medium">
          <span>{accounts.length} Bank / Cash accounts</span>
          <button
            onClick={() => setActiveTab('treasury-ledger')}
            className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>View Ledger</span>
            <ChevronRight className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </button>
        </div>
      </section>

      {/* 4. Organization Profile & Identity Details */}
      {(currentOrg.tagline || currentOrg.academic_year || currentOrg.about || currentOrg.description) && (
        <section className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Building className="w-5 h-5 text-emerald-700 shrink-0" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
              Organization Profile &amp; Mission
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(currentOrg.about || currentOrg.description) ? (
              <div className="md:col-span-2 space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  About Organization
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed text-justify whitespace-pre-line font-normal">
                  {currentOrg.about || currentOrg.description}
                </p>
              </div>
            ) : (
              <div className="md:col-span-2 flex items-center justify-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                Configure your About/Mission statement in settings to showcase here.
              </div>
            )}

            <div className="space-y-4">
              {currentOrg.tagline && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Official Motto
                  </h4>
                  <p className="text-xs sm:text-sm font-semibold text-emerald-900 italic bg-emerald-50/80 px-4 py-3 rounded-xl border border-emerald-200/60 leading-relaxed">
                    &quot;{currentOrg.tagline}&quot;
                  </p>
                </div>
              )}

              {(currentOrg.email || currentOrg.website) && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Contact Information
                  </h4>
                  <div className="space-y-2 text-xs font-medium">
                    {currentOrg.email && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate">{currentOrg.email}</span>
                      </div>
                    )}
                    {currentOrg.website && (
                      <a
                        href={currentOrg.website.startsWith('http') ? currentOrg.website : `https://${currentOrg.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-emerald-700 hover:text-emerald-800 transition-colors hover:underline"
                      >
                        <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate">{currentOrg.website}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 5. Executive Committee & Office Bearers */}
      {organizers.length > 0 && (
        <section className="space-y-4 lg:space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 font-heading">
                Executive Committee &amp; Bearers
              </h2>
              <p className="text-xs lg:text-sm text-slate-500">Key office bearers and faculty coordinators</p>
            </div>
            <button
              onClick={() => setActiveTab('organizers')}
              className="text-xs lg:text-sm font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline cursor-pointer bg-emerald-50 px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl border border-emerald-100 transition-colors"
            >
              <span>View All ({organizers.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
            {topOrganizers.map((orgzr) => (
              <div
                key={orgzr.id}
                onClick={() => setActiveTab('organizers')}
                className="bg-white rounded-2xl p-4 lg:p-5 text-center border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 cursor-pointer flex flex-col items-center group"
              >
                <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full p-0.5 bg-slate-100 border-2 border-slate-200 group-hover:border-emerald-500 transition-colors mb-2.5 lg:mb-3 overflow-hidden shrink-0 shadow-inner">
                  <img
                    src={
                      orgzr.photo ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'
                    }
                    alt={orgzr.name}
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';
                    }}
                  />
                </div>

                <h3 className="text-xs lg:text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-emerald-800 transition-colors">
                  {orgzr.name}
                </h3>
                <span className="text-[10px] lg:text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-md mt-1.5 line-clamp-1 border border-slate-200">
                  {orgzr.position}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
