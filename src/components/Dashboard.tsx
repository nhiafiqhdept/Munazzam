import React, { useMemo } from 'react';
import {
  Users,
  CalendarDays,
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
  TrendingDown,
  TrendingUp,
  Sparkles,
  Plus,
  Shield,
  Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ActiveTab } from '../types';
import { UpcomingProgramsCarousel } from './UpcomingProgramsCarousel';
import { getProgramEffectiveStatus, getRoleBadgeStyle } from '../utils/helpers';

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

  // Memoize financial and organizers calculations
  const { totalBalance, totalIncomes, totalExpenses, totalBorrowed, totalLent, activeAccountsCount, topOrganizers } = useMemo(() => {
    const incomesSum = incomes.reduce((sum, i) => sum + i.amount, 0);
    const expensesSum = expenses.reduce((sum, e) => sum + e.amount, 0);
    const openingSum = accounts.reduce((sum, a) => sum + a.opening_balance, 0);
    const balance = openingSum + incomesSum - expensesSum;

    const borrowed = loans
      .filter((l) => l.type === 'BORROWED')
      .reduce((sum, l) => sum + l.outstanding_amount, 0);

    const lent = loans
      .filter((l) => l.type === 'LENT')
      .reduce((sum, l) => sum + l.outstanding_amount, 0);

    const activeCount = accounts.filter((a) => a.is_active).length;
    const topOrgs = organizers.slice(0, 10);

    return {
      totalBalance: balance,
      totalIncomes: incomesSum,
      totalExpenses: expensesSum,
      totalBorrowed: borrowed,
      totalLent: lent,
      activeAccountsCount: activeCount,
      topOrganizers: topOrgs,
    };
  }, [incomes, expenses, accounts, loans, organizers]);

  // Derived program statistics for KPI strip
  const { todayProgramsCount, upcomingProgramsCount } = useMemo(() => {
    let today = 0;
    let upcoming = 0;
    programs.forEach((p) => {
      const status = getProgramEffectiveStatus(p);
      if (status === 'ongoing') today++;
      else if (status === 'upcoming') upcoming++;
    });
    return { todayProgramsCount: today, upcomingProgramsCount: upcoming };
  }, [programs]);

  // Four Quick-Navigation Module Cards in distinct Blue / Indigo / Cobalt / Amber tones
  const quickModules = [
    {
      id: 'programs' as ActiveTab,
      title: 'Programs & Activities',
      subtitle: 'Schedules, media & reports',
      icon: CalendarDays,
      tone: 'blue',
      cardBg: 'bg-white hover:bg-blue-50/40 border-blue-100 hover:border-blue-400',
      iconBg: 'bg-blue-600 text-white',
      badgeText: 'text-blue-600',
      arrowBg: 'text-blue-600 bg-blue-50',
    },
    {
      id: 'organizers' as ActiveTab,
      title: 'Organizers & Bearers',
      subtitle: 'Roles, profiles & faculty',
      icon: Users,
      tone: 'indigo',
      cardBg: 'bg-white hover:bg-indigo-50/40 border-indigo-100 hover:border-indigo-400',
      iconBg: 'bg-indigo-600 text-white',
      badgeText: 'text-indigo-600',
      arrowBg: 'text-indigo-600 bg-indigo-50',
    },
    {
      id: 'treasury-dashboard' as ActiveTab,
      title: 'Treasury & Accounts',
      subtitle: 'Ledgers, balances & loans',
      icon: Landmark,
      tone: 'navy',
      cardBg: 'bg-white hover:bg-sky-50/40 border-sky-100 hover:border-sky-400',
      iconBg: 'bg-[#0f1f4b] text-white',
      badgeText: 'text-[#1e3a8a]',
      arrowBg: 'text-[#1e3a8a] bg-sky-50',
    },
    isPublicView
      ? {
          id: 'student-points' as ActiveTab,
          title: 'Points & Awards',
          subtitle: 'Merit leaderboard & badges',
          icon: Trophy,
          tone: 'amber',
          cardBg: 'bg-white hover:bg-amber-50/40 border-amber-100 hover:border-amber-400',
          iconBg: 'bg-amber-500 text-slate-950',
          badgeText: 'text-amber-700',
          arrowBg: 'text-amber-700 bg-amber-50',
        }
      : {
          id: 'settings' as ActiveTab,
          title: 'Organization Profile',
          subtitle: 'Identity, motto & mission',
          icon: Building,
          tone: 'amber',
          cardBg: 'bg-white hover:bg-amber-50/40 border-amber-100 hover:border-amber-400',
          iconBg: 'bg-amber-500 text-slate-950',
          badgeText: 'text-amber-700',
          arrowBg: 'text-amber-700 bg-amber-50',
        },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-8 pb-16 lg:pb-12 max-w-7xl lg:max-w-[1400px] mx-auto">


      {/* ============================================================== */}
      {/* 1. UPCOMING PROGRAMS CAROUSEL (Hero Showcase Section - Top)   */}
      {/* ============================================================== */}
      <UpcomingProgramsCarousel
        programs={programs}
        onViewDetails={viewProgramDetails}
        onOpenAddProgram={onOpenAddProgram}
      />

      {/* ============================================================== */}
      {/* 2. DEEP NAVY WELCOME HERO BANNER (Desktop Only - Hidden Mobile)*/}
      {/* ============================================================== */}
      <section
        data-purpose="welcome-hero-banner"
        className="hidden md:block relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0f1f4b] via-[#1e3a8a] to-[#1d4ed8] text-white p-6 sm:p-8 lg:p-10 shadow-lg border border-blue-900/50"
      >
        {/* Decorative Grid Overlay */}
        <div
          className="absolute inset-0 opacity-[0.12] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Subtle Radial Amber Light Accent */}
        <div
          className="absolute right-0 top-0 w-80 h-80 rounded-full pointer-events-none opacity-20"
          style={{
            background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        {/* Content Container */}
        <div className="relative z-10 max-w-3xl space-y-3 sm:space-y-4">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/35 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Official Executive Portal &bull; {currentOrg.academic_year || 'Academic Year'}</span>
          </div>

          {/* Large Organization Name */}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight font-heading leading-tight drop-shadow-sm">
            {currentOrg.name}
          </h2>

          {/* Mission / Tagline Excerpt */}
          {currentOrg.tagline ? (
            <p className="text-amber-200/95 font-medium italic text-sm sm:text-base lg:text-lg leading-relaxed max-w-2xl drop-shadow-xs">
              &ldquo;{currentOrg.tagline}&rdquo;
            </p>
          ) : (
            <p className="text-blue-100/90 text-xs sm:text-sm lg:text-base leading-relaxed max-w-2xl">
              {currentOrg.about || currentOrg.description || 'Dedicated to institutional excellence, active student leadership, and impactful academic initiatives.'}
            </p>
          )}

          {/* Quick Metrics Badges in Banner */}
          <div className="pt-2 flex items-center gap-3 sm:gap-4 flex-wrap text-xs font-semibold text-blue-100/90">
            <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/15">
              <CalendarDays className="w-4 h-4 text-amber-300" />
              <span>{programs.length} Scheduled Events</span>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/15">
              <Users className="w-4 h-4 text-sky-300" />
              <span>{organizers.length} Bearers &amp; Coordinators</span>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/15">
              <Shield className="w-4 h-4 text-indigo-300" />
              <span>Verified Institution Profile</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. KPI / STAT STRIP (Clean White Rounded Cards with Soft Shadows)*/}
      {/* ============================================================== */}
      <section data-purpose="kpi-stat-strip">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {/* 1. Programs KPI */}
          <div
            onClick={() => setActiveTab('programs')}
            className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
                Programs
              </span>
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 border border-sky-100/90 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <CalendarDays className="w-4.5 h-4.5" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
                {programs.length}
              </p>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1 truncate">
                {todayProgramsCount > 0 ? (
                  <span className="text-amber-600 font-bold">{todayProgramsCount} Today</span>
                ) : (
                  <span>0 Today</span>
                )}
                {' '}&bull; {upcomingProgramsCount} Upcoming
              </p>
            </div>
          </div>

          {/* 2. Office Bearers KPI */}
          <div
            onClick={() => setActiveTab('organizers')}
            className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
                Office Bearers
              </span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/90 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Users className="w-4.5 h-4.5" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
                {organizers.length}
              </p>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1 truncate">
                Executive committee members
              </p>
            </div>
          </div>

          {/* 3. Available Balance KPI */}
          <div
            onClick={() => setActiveTab('treasury-dashboard')}
            className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-blue-400 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
                Treasury Balance
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1e3a8a] border border-blue-100/90 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Wallet className="w-4.5 h-4.5" />
              </div>
            </div>
            <div>
              <p className={`text-xl sm:text-2xl lg:text-3xl font-black font-heading tracking-tight truncate ${
                totalBalance < 0 ? 'text-rose-600' : 'text-slate-900'
              }`}>
                {totalBalance < 0 ? `-₹${Math.abs(totalBalance).toLocaleString('en-IN')}` : `₹${totalBalance.toLocaleString('en-IN')}`}
              </p>
              <p className="text-[11px] sm:text-xs font-medium mt-1 truncate">
                {totalBalance < 0 ? (
                  <span className="text-rose-600 font-bold">Deficit in treasury</span>
                ) : (
                  <span className="text-blue-700 font-semibold">Available surplus balance</span>
                )}
              </p>
            </div>
          </div>

          {/* 4. Active Accounts KPI */}
          <div
            onClick={() => setActiveTab('treasury-accounts')}
            className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-amber-300 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
                Active Accounts
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100/90 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Landmark className="w-4.5 h-4.5" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
                {activeAccountsCount}
              </p>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1 truncate">
                {accounts.length} total bank/cash accounts
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 5. FOUR QUICK-NAVIGATION MODULE CARDS (2x2 on Mobile, 4 Desktop)*/}
      {/* Distinct Blue / Indigo / Amber Tones, Clean White Cards        */}
      {/* ============================================================== */}
      <section className="space-y-3 sm:space-y-4" data-purpose="quick-navigation-modules">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 font-heading">
            QUICK NAVIGATION MODULES
          </h2>
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Direct access to core management workspaces
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
          {quickModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                onClick={() => setActiveTab(mod.id)}
                className={`bg-white rounded-2xl p-4 sm:p-5 lg:p-6 border shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group relative min-h-[140px] sm:min-h-[170px] ${mod.cardBg}`}
              >
                <div>
                  {/* Icon */}
                  <div
                    className={`w-11 h-11 sm:w-12 sm:h-12 lg:w-13 lg:h-13 rounded-2xl ${mod.iconBg} flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-105 transition-transform shadow-xs shrink-0`}
                  >
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>

                  {/* Title & Subtitle */}
                  <h3 className="text-xs sm:text-sm lg:text-base font-bold text-slate-900 group-hover:text-[#1e3a8a] transition-colors leading-snug line-clamp-2">
                    {mod.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-1 mt-1 hidden sm:block">
                    {mod.subtitle}
                  </p>
                </div>

                {/* Bottom Row / Arrow */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold mt-2">
                  <span className={`text-[11px] sm:text-xs font-bold ${mod.badgeText}`}>
                    Open
                  </span>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${mod.arrowBg} group-hover:translate-x-1 transition-transform`}>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================== */}
      {/* 6. TREASURY OVERVIEW                                           */}
      {/* Deep Navy / Royal Blue Palette, Amber Accents, NO Emerald Green*/}
      {/* ============================================================== */}
      <section
        className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 lg:p-8 shadow-2xs space-y-4 lg:space-y-6"
        data-purpose="treasury-overview-section"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 lg:pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center">
              <Landmark className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-xs lg:text-sm font-bold uppercase tracking-wider text-slate-600 font-heading">
                TREASURY OVERVIEW
              </h2>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Institutional balance, income streams, and expenditures
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('treasury-dashboard')}
            className="text-xs lg:text-sm font-bold text-[#1e3a8a] hover:text-[#1d4ed8] hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>Open Treasury</span>
            <ChevronRight className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </button>
        </div>

        {/* Available Balance - Deep Navy / Royal Blue Hero Card */}
        <div className="p-5 lg:p-7 bg-gradient-to-br from-[#0f1f4b] via-[#1e3a8a] to-[#1d4ed8] rounded-2xl text-white shadow-md relative overflow-hidden">
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-12 pointer-events-none">
            <Wallet className="w-28 h-28 lg:w-36 lg:h-36 text-white" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-blue-100 text-xs lg:text-sm font-semibold mb-1">
                <Wallet className="w-4 h-4 text-amber-300" />
                <span>Available Treasury Balance</span>
              </div>
              <p className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight font-heading mt-0.5 ${
                totalBalance < 0 ? 'text-rose-300' : 'text-white'
              }`}>
                {totalBalance < 0 ? `-₹${Math.abs(totalBalance).toLocaleString('en-IN')}` : `₹${totalBalance.toLocaleString('en-IN')}`}
              </p>
            </div>

            {totalBalance < 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/25 border border-rose-400/50 text-rose-200 text-xs font-bold self-start sm:self-auto">
                <TrendingDown className="w-4 h-4 text-rose-300" />
                <span>Deficit: ₹{Math.abs(totalBalance).toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Financial Summary Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-6">
          {/* Total Income (Royal Blue / Sky Blue theme - NO emerald) */}
          <div className="p-3.5 lg:p-5 bg-blue-50/80 rounded-xl lg:rounded-2xl border border-blue-100/90 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[11px] lg:text-xs font-bold text-blue-900 mb-1 lg:mb-2">
              <ArrowDownLeft className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-blue-600 shrink-0" />
              <span className="truncate">Total Income</span>
            </div>
            <p className="text-sm sm:text-base lg:text-2xl font-extrabold text-[#0f1f4b] font-heading">
              ₹{totalIncomes.toLocaleString('en-IN')}
            </p>
          </div>

          {/* Total Expenses */}
          <div className="p-3.5 lg:p-5 bg-rose-50/80 rounded-xl lg:rounded-2xl border border-rose-100/90 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[11px] lg:text-xs font-bold text-rose-800 mb-1 lg:mb-2">
              <ArrowUpRight className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-rose-600 shrink-0" />
              <span className="truncate">Total Expenses</span>
            </div>
            <p className="text-sm sm:text-base lg:text-2xl font-extrabold text-rose-950 font-heading">
              ₹{totalExpenses.toLocaleString('en-IN')}
            </p>
          </div>

          {/* Loan Borrowed */}
          <div
            onClick={() => setActiveTab('treasury-loans')}
            className="p-3.5 lg:p-5 bg-slate-50/80 rounded-xl lg:rounded-2xl border border-slate-200/90 flex flex-col justify-between cursor-pointer hover:bg-slate-100/70 transition-colors"
          >
            <div className="flex items-center gap-1.5 text-[11px] lg:text-xs font-bold text-slate-700 mb-1 lg:mb-2">
              <TrendingDown className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-slate-600 shrink-0" />
              <span className="truncate">Loan Borrowed</span>
            </div>
            <p className="text-sm sm:text-base lg:text-2xl font-extrabold text-slate-900 font-heading">
              ₹{totalBorrowed.toLocaleString('en-IN')}
            </p>
          </div>

          {/* Loan Lent (Warm Amber tone) */}
          <div
            onClick={() => setActiveTab('treasury-loans')}
            className="p-3.5 lg:p-5 bg-amber-50/80 rounded-xl lg:rounded-2xl border border-amber-100/90 flex flex-col justify-between cursor-pointer hover:bg-amber-100/70 transition-colors"
          >
            <div className="flex items-center gap-1.5 text-[11px] lg:text-xs font-bold text-amber-800 mb-1 lg:mb-2">
              <TrendingUp className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-amber-600 shrink-0" />
              <span className="truncate">Loan Lent</span>
            </div>
            <p className="text-sm sm:text-base lg:text-2xl font-extrabold text-amber-950 font-heading">
              ₹{totalLent.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Active Accounts Card (Sky-Blue / Indigo) */}
        <div
          onClick={() => setActiveTab('treasury-accounts')}
          className="p-4 lg:p-5 bg-sky-50/70 rounded-xl lg:rounded-2xl border border-sky-100/90 flex items-center justify-between cursor-pointer hover:bg-sky-100/80 transition-colors"
        >
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="w-9 h-9 lg:w-11 lg:h-11 rounded-full lg:rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <Landmark className="w-4.5 h-4.5 lg:w-5 lg:h-5" />
            </div>
            <div>
              <p className="text-[11px] lg:text-xs font-bold uppercase tracking-wider text-sky-800">
                Active Managed Accounts
              </p>
              <p className="text-sm sm:text-base lg:text-lg font-extrabold text-[#0f1f4b] font-heading">
                {activeAccountsCount} Active Accounts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[#1e3a8a] font-bold text-xs lg:text-sm">
            <span className="hidden sm:inline">View Accounts</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Bottom Treasury Action Row */}
        <div className="pt-3 lg:pt-4 border-t border-slate-100 flex items-center justify-between text-xs lg:text-sm text-slate-500 font-medium">
          <span>{accounts.length} Bank / Cash accounts registered</span>
          <button
            type="button"
            onClick={() => setActiveTab('treasury-ledger')}
            className="text-[#1e3a8a] hover:text-[#1d4ed8] font-bold hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>View Ledger</span>
            <ChevronRight className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </button>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 7. ORGANIZATION PROFILE & MISSION DETAILS                     */}
      {/* Restyled Navy Gradient Header Accent with Clean White Card Body*/}
      {/* ============================================================== */}
      {(currentOrg.tagline || currentOrg.academic_year || currentOrg.about || currentOrg.description || currentOrg.name) && (
        <section
          data-purpose="organization-profile-section"
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden"
        >
          {/* Navy Gradient Header Accent (#0f1f4b to #1d4ed8) consistent with dashboard hero */}
          <div className="relative overflow-hidden bg-gradient-to-r from-[#0f1f4b] via-[#1e3a8a] to-[#1d4ed8] text-white p-5 sm:p-6 lg:p-7">
            {/* Decorative Subtle Pattern */}
            <div
              className="absolute inset-0 opacity-[0.10] pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                backgroundSize: '18px 18px',
              }}
            />
            {/* Amber Glow Accent */}
            <div
              className="absolute right-0 top-0 w-64 h-64 rounded-full pointer-events-none opacity-20"
              style={{
                background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)',
                filter: 'blur(30px)',
              }}
            />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 text-amber-300 flex items-center justify-center shrink-0 shadow-sm font-heading font-black">
                  <Building className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base lg:text-lg font-black uppercase tracking-wider text-white font-heading">
                      ORGANIZATION PROFILE &amp; MISSION
                    </h2>
                    {currentOrg.academic_year && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/35 backdrop-blur-xs">
                        {currentOrg.academic_year}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-blue-100/80 font-medium mt-0.5">
                    Institutional charter, official motto, and contact details
                  </p>
                </div>
              </div>

              {/* Organization Name & Verified Profile Badges */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {currentOrg.name && (
                  <span className="inline-flex items-center bg-white/10 backdrop-blur-xs px-3 py-1 rounded-xl border border-white/15 text-white font-semibold text-xs truncate max-w-[240px]">
                    {currentOrg.name}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 bg-blue-500/20 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-blue-300/30 text-blue-100 font-semibold text-[11px] sm:text-xs">
                  <Shield className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                  <span>Verified Institution Profile</span>
                </span>
              </div>
            </div>
          </div>

          {/* Clean White Card Body */}
          <div className="p-5 sm:p-6 lg:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* Mission / About Area */}
              {(currentOrg.about || currentOrg.description) ? (
                <div className="md:col-span-2 space-y-2.5">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading">
                    About Organization &amp; Mission
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed text-justify whitespace-pre-line font-normal">
                    {currentOrg.about || currentOrg.description}
                  </p>
                </div>
              ) : (
                <div className="md:col-span-2 space-y-2.5">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading">
                    About Organization &amp; Mission
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed text-justify whitespace-pre-line font-normal">
                    Dedicated to institutional excellence, active student leadership, and impactful academic initiatives.
                  </p>
                </div>
              )}

              {/* Motto & Contact Information */}
              <div className="space-y-4">
                {currentOrg.tagline && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading">
                      Official Motto
                    </h4>
                    <p className="text-xs sm:text-sm font-semibold text-[#0f1f4b] italic bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-amber-50/50 px-4 py-3 rounded-xl border border-blue-200/70 leading-relaxed">
                      &ldquo;{currentOrg.tagline}&rdquo;
                    </p>
                  </div>
                )}

                {/* CONTACT INFORMATION with fiqhdeptnhia@gmail.com */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading">
                    Contact Information
                  </h4>
                  <div className="space-y-2 text-xs font-medium">
                    <div className="flex items-center gap-2.5 text-slate-600">
                      <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#1e3a8a] flex items-center justify-center shrink-0">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <a
                        href={`mailto:${currentOrg.email || 'fiqhdeptnhia@gmail.com'}`}
                        className="truncate hover:text-[#1d4ed8] transition-colors"
                      >
                        {currentOrg.email || 'fiqhdeptnhia@gmail.com'}
                      </a>
                    </div>
                    {currentOrg.website && (
                      <a
                        href={currentOrg.website.startsWith('http') ? currentOrg.website : `https://${currentOrg.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2.5 text-[#1e3a8a] hover:text-[#1d4ed8] transition-colors hover:underline"
                      >
                        <div className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                          <Globe className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate">{currentOrg.website}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 8. EXECUTIVE COMMITTEE & OFFICE BEARERS GRID                  */}
      {/* Matching New Card Language, Color-Coded Role Badges           */}
      {/* ============================================================== */}
      {organizers.length > 0 && (
        <section className="space-y-4 lg:space-y-5" data-purpose="executive-committee-grid">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 font-heading">
                Executive Committee &amp; Bearers
              </h2>
              <p className="text-xs lg:text-sm text-slate-500">
                Key office bearers and student coordinators
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('organizers')}
              className="text-xs lg:text-sm font-bold text-[#1e3a8a] hover:text-[#1d4ed8] flex items-center gap-1.5 hover:underline cursor-pointer bg-blue-50 px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl border border-blue-200/80 transition-colors"
            >
              <span>View All ({organizers.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 min-[440px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
            {topOrganizers.map((orgzr) => {
              const roleStyle = getRoleBadgeStyle(orgzr.position);
              return (
                <div
                  key={orgzr.id}
                  onClick={() => setActiveTab('organizers')}
                  className="bg-white rounded-2xl p-4 lg:p-5 text-center border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-400 transition-all duration-200 hover:-translate-y-1 cursor-pointer flex flex-col items-center justify-between group min-h-[190px] sm:min-h-[210px]"
                >
                  <div className="w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20 rounded-full p-0.5 bg-gradient-to-tr from-[#0f1f4b] via-[#1d4ed8] to-indigo-400 group-hover:scale-105 transition-transform duration-200 mb-2.5 overflow-hidden shrink-0 shadow-sm">
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

                  <div className="w-full flex-1 flex flex-col items-center justify-between">
                    <h3 className="text-xs lg:text-sm font-semibold sm:font-semibold text-slate-900 line-clamp-2 leading-tight group-hover:text-[#1d4ed8] transition-colors text-center w-full min-h-[28px] sm:min-h-0 flex items-center justify-center break-words">
                      {orgzr.name}
                    </h3>
                    <span
                      className={`inline-flex items-center justify-center text-[9px] sm:text-[10px] lg:text-xs font-bold px-2.5 py-0.5 lg:py-1 rounded-full mt-1.5 line-clamp-1 border shadow-2xs text-center max-w-full truncate ${roleStyle.badge}`}
                    >
                      {orgzr.position}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
