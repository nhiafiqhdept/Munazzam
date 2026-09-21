import React from 'react';
import {
  Users,
  CalendarDays,
  Settings,
  PlusCircle,
  Clock,
  MapPin,
  ChevronRight,
  Camera,
  ArrowUpRight,
  Landmark,
  FileText,
  Building,
  Mail,
  Globe,
  Wallet,
  ArrowDownLeft,
  Sparkles,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDate, DEFAULT_ORG_LOGO } from '../utils/helpers';
import { ActiveTab } from '../types';
import { ProgramCard } from './ProgramCard';

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
    setActiveTab,
    viewProgramDetails,
    isAdmin,
  } = useApp();

  if (!currentOrg) return null;

  const totalMediaCount = programs.reduce((sum, p) => sum + (p.media?.length || 0), 0);

  // Calculate real balances from actual database state
  const totalIncomes = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalOpening = accounts.reduce((sum, a) => sum + a.opening_balance, 0);
  const totalBalance = totalOpening + totalIncomes - totalExpenses;

  const recentPrograms = programs.slice(0, 3);
  const topOrganizers = organizers.slice(0, 6);

  const quickModules: {
    id: ActiveTab;
    title: string;
    description: string;
    icon: React.FC<{ className?: string }>;
    count: string | number;
    btnLabel: string;
  }[] = [
    {
      id: 'programs',
      title: 'Programs & Activities',
      description: 'Manage seminars, workshops, symposiums, and event documentations.',
      icon: CalendarDays,
      count: programs.length,
      btnLabel: 'View Programs',
    },
    {
      id: 'organizers',
      title: 'Organizers & Office Bearers',
      description: 'Executive council, faculty coordinators, and student leaders.',
      icon: Users,
      count: organizers.length,
      btnLabel: 'View Organizers',
    },
    {
      id: 'treasury-dashboard',
      title: 'Treasury & Accounts',
      description: 'Cash in hand, bank balances, financial ledgers, and transaction logs.',
      icon: Landmark,
      count: `₹${totalBalance.toLocaleString('en-IN')}`,
      btnLabel: 'Open Treasury',
    },
    {
      id: 'settings',
      title: 'Organization Profile',
      description: 'Update organization credentials, academic identity, and data backups.',
      icon: Settings,
      count: 'Settings',
      btnLabel: 'Configure',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 max-w-7xl mx-auto">
      {/* 1. Google Stitch Inspired Organization Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#071B2C] via-[#1A2341] to-[#0A2E36] rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-950/40">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/3 -mb-16 w-60 h-60 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-start sm:items-center gap-4 sm:gap-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md p-2 border border-white/20 shadow-inner flex items-center justify-center shrink-0 overflow-hidden">
            <img
              src={currentOrg.logo || DEFAULT_ORG_LOGO}
              alt={currentOrg.name}
              className="w-full h-full object-contain rounded-xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = DEFAULT_ORG_LOGO;
              }}
            />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Active Workspace
              </span>
              {currentOrg.academic_year && (
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 border border-white/10">
                  {currentOrg.academic_year}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold font-heading tracking-tight text-white truncate">
              {currentOrg.name}
            </h1>
            {currentOrg.college_name && (
              <p className="text-xs sm:text-sm text-indigo-200/90 font-medium flex items-center gap-1.5">
                <Building className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">{currentOrg.college_name}</span>
              </p>
            )}
          </div>
        </div>

        {currentOrg.tagline && (
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-xs sm:text-sm text-slate-300 italic">
            <span className="text-emerald-400 font-semibold not-italic">Motto:</span>
            <span>"{currentOrg.tagline}"</span>
          </div>
        )}
      </section>

      {/* 2. Key Statistics / KPI Cards (Stitch M3 Grid) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Programs */}
        <div
          onClick={() => setActiveTab('programs')}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Programs</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 transition-colors">
              <CalendarDays className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
              {programs.length}
            </p>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>{programs.length === 1 ? '1 recorded activity' : `${programs.length} total activities`}</span>
            </p>
          </div>
        </div>

        {/* Organizers */}
        <div
          onClick={() => setActiveTab('organizers')}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Organizers</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 group-hover:bg-blue-100 transition-colors">
              <Users className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
              {organizers.length}
            </p>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>{organizers.length === 1 ? '1 office bearer' : `${organizers.length} office bearers`}</span>
            </p>
          </div>
        </div>

        {/* Treasury Balance */}
        <div
          onClick={() => setActiveTab('treasury-dashboard')}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Treasury Balance</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 group-hover:bg-amber-100 transition-colors">
              <Landmark className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading truncate">
              ₹{totalBalance.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-slate-500 mt-1 truncate font-medium">Available funds in accounts</p>
          </div>
        </div>

        {/* Media & Proofs */}
        <div
          onClick={() => setActiveTab('programs')}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md hover:border-purple-300 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Media & Proofs</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 group-hover:bg-purple-100 transition-colors">
              <Camera className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
              {totalMediaCount}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {totalMediaCount === 1 ? '1 proof attached' : `${totalMediaCount} photos & docs`}
            </p>
          </div>
        </div>
      </section>

      {/* 3. Recent Programs & Activities */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
              Recent Programs & Activities
            </h2>
            <p className="text-xs text-slate-500">Latest recorded events and activity documentations</p>
          </div>
          <button
            onClick={() => setActiveTab('programs')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline cursor-pointer bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 transition-colors"
          >
            <span>View All ({programs.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {programs.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200/90 shadow-2xs">
            <CalendarDays className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-800">No programs recorded yet.</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Record upcoming seminars, conferences, and student events to build your organization history.
            </p>
            {isAdmin && (
              <button
                onClick={onOpenAddProgram}
                className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-md cursor-pointer inline-flex items-center gap-1.5 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Program</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentPrograms.map((prog) => (
              <ProgramCard
                key={prog.id}
                program={prog}
                onViewDetails={viewProgramDetails}
                wingFallback={currentOrg.name}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. Treasury Overview & Quick Modules Grid (Stitch 2-Column layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Treasury Financial Summary Box */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-emerald-700" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
                  Treasury Overview
                </h2>
              </div>
              <button
                onClick={() => setActiveTab('treasury-dashboard')}
                className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>Open Treasury</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                <p className="text-xs font-semibold text-slate-500">Available Balance</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1 font-heading">
                  ₹{totalBalance.toLocaleString('en-IN')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800">
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Total Income</span>
                  </div>
                  <p className="text-sm sm:text-base font-extrabold text-emerald-900 mt-1 font-heading">
                    ₹{totalIncomes.toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-100">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-800">
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                    <span>Total Expenses</span>
                  </div>
                  <p className="text-sm sm:text-base font-extrabold text-rose-900 mt-1 font-heading">
                    ₹{totalExpenses.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{accounts.length} Bank / Cash accounts</span>
            <button
              onClick={() => setActiveTab('treasury-ledger')}
              className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>View Ledger</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* Quick Access Navigation Modules */}
        <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
              Quick Navigation Modules
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickModules.map((mod) => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.id}
                  onClick={() => setActiveTab(mod.id)}
                  className="p-4 rounded-xl border border-slate-200/80 hover:border-emerald-300 bg-white hover:bg-emerald-50/20 transition-all duration-200 cursor-pointer flex items-start gap-3.5 group shadow-2xs"
                >
                  <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-xs">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition-colors truncate">
                        {mod.title}
                      </h3>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:text-emerald-700 transition-all" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed font-medium">
                      {mod.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* 5. Organization Profile & Identity Details */}
      {(currentOrg.tagline || currentOrg.academic_year || currentOrg.about || currentOrg.description) && (
        <section className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Building className="w-5 h-5 text-emerald-700 shrink-0" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
              Organization Profile & Mission
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
                    "{currentOrg.tagline}"
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

      {/* 6. Executive Committee & Office Bearers */}
      {organizers.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                Executive Committee & Bearers
              </h2>
              <p className="text-xs text-slate-500">Key office bearers and faculty coordinators</p>
            </div>
            <button
              onClick={() => setActiveTab('organizers')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline cursor-pointer bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 transition-colors"
            >
              <span>View All ({organizers.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {topOrganizers.map((orgzr) => (
              <div
                key={orgzr.id}
                onClick={() => setActiveTab('organizers')}
                className="bg-white rounded-2xl p-4 text-center border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 cursor-pointer flex flex-col items-center group"
              >
                <div className="w-16 h-16 rounded-full p-0.5 bg-slate-100 border-2 border-slate-200 group-hover:border-emerald-500 transition-colors mb-2.5 overflow-hidden shrink-0 shadow-inner">
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

                <h3 className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-emerald-800 transition-colors">
                  {orgzr.name}
                </h3>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md mt-1.5 line-clamp-1 border border-slate-200">
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
