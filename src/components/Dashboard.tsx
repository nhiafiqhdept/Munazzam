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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDate, DEFAULT_ORG_LOGO } from '../utils/helpers';
import { ActiveTab } from '../types';

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
    <div className="space-y-6 pb-12">
      {/* 1. Compact Statistics Summary (4 Clean Cards) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Programs */}
        <div
          onClick={() => setActiveTab('programs')}
          className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Total Programs</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{programs.length}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {programs.length === 1
                ? '1 recorded activity'
                : programs.length > 0
                ? `${programs.length} recorded activities`
                : 'No programs recorded'}
            </p>
          </div>
        </div>

        {/* Organizers */}
        <div
          onClick={() => setActiveTab('organizers')}
          className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Organizers</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{organizers.length}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {organizers.length === 1
                ? '1 office bearer'
                : organizers.length > 0
                ? `${organizers.length} office bearers`
                : 'No office bearers'}
            </p>
          </div>
        </div>

        {/* Treasury Balance */}
        <div
          onClick={() => setActiveTab('treasury-dashboard')}
          className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Treasury Balance</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 tracking-tight truncate">
              ₹{totalBalance.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">Available funds</p>
          </div>
        </div>

        {/* Media & Proofs */}
        <div
          onClick={() => setActiveTab('programs')}
          className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Media & Proofs</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{totalMediaCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {totalMediaCount === 1
                ? '1 proof attached'
                : totalMediaCount > 0
                ? `${totalMediaCount} photos & documents`
                : 'No media attached'}
            </p>
          </div>
        </div>
      </section>

      {/* 3. Optional Organization Profile / About Section */}
      {currentOrg.description && currentOrg.description.trim().length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <Building className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              About the Organization
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {currentOrg.description}
          </p>

          {(currentOrg.email || currentOrg.website) && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-600 flex-wrap">
              {currentOrg.email && (
                <span className="flex items-center gap-1.5 text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentOrg.email}</span>
                </span>
              )}
              {currentOrg.website && (
                <a
                  href={currentOrg.website.startsWith('http') ? currentOrg.website : `https://${currentOrg.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-emerald-700 hover:underline"
                >
                  <Globe className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{currentOrg.website}</span>
                </a>
              )}
            </div>
          )}
        </section>
      )}

      {/* 4. Recent Programs Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 font-heading">
            Recent Programs & Activities
          </h2>
          <button
            onClick={() => setActiveTab('programs')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>View All Programs ({programs.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {programs.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/90 shadow-2xs">
            <CalendarDays className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">No programs recorded yet.</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Record upcoming seminars, conferences, and student events.
            </p>
            {isAdmin && (
              <button
                onClick={onOpenAddProgram}
                className="mt-3.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Program</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentPrograms.map((prog) => (
              <div
                key={prog.id}
                id={`program-card-${prog.id}`}
                className="bg-white rounded-xl overflow-hidden border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors flex flex-col justify-between"
              >
                <div>
                  {/* Poster Image */}
                  <div
                    className="relative h-40 bg-slate-100 overflow-hidden cursor-pointer"
                    onClick={() => viewProgramDetails(prog.id)}
                  >
                    <img
                      src={
                        prog.poster ||
                        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80'
                      }
                      alt={prog.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80';
                      }}
                    />
                    {prog.media && prog.media.length > 0 && (
                      <span className="absolute top-2.5 right-2.5 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-900/80 text-white backdrop-blur-xs flex items-center gap-1">
                        <Camera className="w-3 h-3 text-slate-300" />
                        <span>{prog.media.length}</span>
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(prog.date)}</span>
                    </div>

                    <h3
                      onClick={() => viewProgramDetails(prog.id)}
                      className="text-sm font-bold text-slate-900 font-heading line-clamp-2 hover:text-emerald-700 cursor-pointer transition-colors leading-snug"
                    >
                      {prog.name}
                    </h3>

                    {prog.place && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{prog.place}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <span className="text-[11px] font-medium text-slate-600 truncate max-w-[150px]">
                    {prog.audience || 'General'}
                  </span>
                  <button
                    onClick={() => viewProgramDetails(prog.id)}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Program</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Treasury Overview & Quick Modules Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Treasury Financial Summary Box */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-slate-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Treasury Overview
                </h2>
              </div>
              <button
                onClick={() => setActiveTab('treasury-dashboard')}
                className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
              >
                Open Treasury →
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[11px] font-medium text-slate-500">Available Balance</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">
                  ₹{totalBalance.toLocaleString('en-IN')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-800">
                    <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                    <span>Income</span>
                  </div>
                  <p className="text-sm font-bold text-emerald-900 mt-0.5">
                    ₹{totalIncomes.toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="p-2.5 bg-rose-50/60 rounded-xl border border-rose-100">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-rose-800">
                    <ArrowUpRight className="w-3 h-3 text-rose-600" />
                    <span>Expenses</span>
                  </div>
                  <p className="text-sm font-bold text-rose-900 mt-0.5">
                    ₹{totalExpenses.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{accounts.length} Accounts managed</span>
            <button
              onClick={() => setActiveTab('treasury-ledger')}
              className="text-slate-700 hover:text-slate-900 font-medium hover:underline cursor-pointer"
            >
              View Ledger
            </button>
          </div>
        </section>

        {/* Quick Access Navigation */}
        <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Navigation Modules
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickModules.map((mod) => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.id}
                  onClick={() => setActiveTab(mod.id)}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60 transition-colors cursor-pointer flex items-start gap-3 group"
                >
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-700 shrink-0 group-hover:bg-emerald-50 group-hover:text-emerald-800 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition-colors truncate">
                        {mod.title}
                      </h3>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                      {mod.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* 6. Executive Committee / Organizers Section (If any exist) */}
      {organizers.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 font-heading">
              Executive Committee & Bearers
            </h2>
            <button
              onClick={() => setActiveTab('organizers')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>View All ({organizers.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {topOrganizers.map((orgzr) => (
              <div
                key={orgzr.id}
                onClick={() => setActiveTab('organizers')}
                className="bg-white rounded-xl p-3.5 text-center border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer flex flex-col items-center"
              >
                <div className="w-14 h-14 rounded-full p-0.5 bg-slate-100 border border-slate-200 mb-2 overflow-hidden shrink-0">
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

                <h3 className="text-xs font-bold text-slate-900 line-clamp-1">
                  {orgzr.name}
                </h3>
                <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md mt-1 line-clamp-1 border border-slate-200">
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
