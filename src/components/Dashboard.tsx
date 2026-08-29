import React from 'react';
import {
  Users,
  CalendarDays,
  Settings,
  PlusCircle,
  Clock,
  MapPin,
  UserCheck,
  ChevronRight,
  Sparkles,
  Camera,
  ArrowUpRight,
  Landmark,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDate, CATEGORY_COLORS, SAMPLE_ORG_LOGOS } from '../utils/helpers';
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

  const latestProgram = programs[0];
  const totalMediaCount = programs.reduce((sum, p) => sum + (p.media?.length || 0), 0);

  // Calculate total available balance across accounts
  const totalIncomes = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalOpening = accounts.reduce((sum, a) => sum + a.opening_balance, 0);
  const totalBalance = totalOpening + totalIncomes - totalExpenses;

  const quickAccessCards: {
    id: ActiveTab;
    title: string;
    description: string;
    icon: React.FC<{ className?: string }>;
    count: string | number;
    color: string;
    btnLabel: string;
  }[] = [
    {
      id: 'organizers',
      title: 'Organizers & Office Bearers',
      description: 'Manage leadership board, presidential desk, secretaries, and coordinators.',
      icon: Users,
      count: organizers.length,
      color: 'from-blue-600 to-sky-700',
      btnLabel: 'View Organizers',
    },
    {
      id: 'programs',
      title: 'Programs & Activities',
      description: 'Record upcoming & completed seminars, workshops, and department events.',
      icon: CalendarDays,
      count: programs.length,
      color: 'from-emerald-700 to-teal-800',
      btnLabel: 'Manage Programs',
    },
    {
      id: 'treasury-dashboard',
      title: 'Treasury & Finance',
      description: 'Monitor cash in hand, bank balances, incomes, expenses, loans, and ledgers.',
      icon: Landmark,
      count: `₹${totalBalance.toLocaleString('en-IN')}`,
      color: 'from-amber-600 to-orange-700',
      btnLabel: 'Open Treasury',
    },
    {
      id: 'settings',
      title: 'Organization Settings',
      description: 'Configure organization crest, college details, data backup, and security.',
      icon: Settings,
      count: 'Config',
      color: 'from-slate-700 to-slate-900',
      btnLabel: 'Configure',
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Academic Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white shadow-xl border border-slate-700/60 p-6 sm:p-10">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-10 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-5 max-w-3xl">
            {/* Crest */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white p-2 border-2 border-emerald-400 shadow-xl shrink-0 flex items-center justify-center overflow-hidden">
              <img
                src={currentOrg.logo || SAMPLE_ORG_LOGOS[0].url}
                alt={currentOrg.name}
                className="w-full h-full object-contain rounded-2xl"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = SAMPLE_ORG_LOGOS[0].url;
                }}
              />
            </div>

            {/* Info */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Official Activity & Program Documentation</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight font-serif text-white leading-tight">
                {currentOrg.name}
              </h1>

              <p className="text-sm sm:text-base font-medium text-emerald-300">
                {currentOrg.college_name}
                {currentOrg.established_year && (
                  <span className="text-slate-400 ml-2 font-normal">
                    (Est. {currentOrg.established_year})
                  </span>
                )}
              </p>

              {currentOrg.tagline && (
                <p className="text-xs sm:text-sm text-slate-300 italic max-w-2xl font-serif">
                  "{currentOrg.tagline}"
                </p>
              )}
            </div>
          </div>

          {/* Quick Action Buttons for Admin */}
          {isAdmin && (
            <div className="flex flex-wrap sm:flex-col gap-2.5 shrink-0 w-full sm:w-auto">
              <button
                id="hero-add-program-btn"
                onClick={onOpenAddProgram}
                className="flex-1 sm:flex-initial px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add New Program</span>
              </button>

              <button
                id="hero-add-organizer-btn"
                onClick={onOpenAddOrganizer}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-semibold rounded-2xl transition-all flex items-center justify-center gap-2 text-xs"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Add Organizer</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. Key Statistics Ribbon */}
        <div className="mt-8 pt-6 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-800/60 backdrop-blur-xs rounded-2xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <CalendarDays className="w-4 h-4 text-emerald-400" />
              <span>Total Programs</span>
            </div>
            <p className="text-2xl font-bold text-white mt-1">{programs.length}</p>
            <p className="text-[11px] text-emerald-400 mt-0.5 font-medium">Recorded Activities</p>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-xs rounded-2xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <Users className="w-4 h-4 text-sky-400" />
              <span>Organizers</span>
            </div>
            <p className="text-2xl font-bold text-white mt-1">{organizers.length}</p>
            <p className="text-[11px] text-sky-400 mt-0.5 font-medium">Executive Bearers</p>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-xs rounded-2xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <Landmark className="w-4 h-4 text-amber-400" />
              <span>Treasury Balance</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white mt-1 truncate">
              ₹{totalBalance.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-amber-300 mt-0.5 font-medium truncate">Available Funds</p>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-xs rounded-2xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <Camera className="w-4 h-4 text-purple-400" />
              <span>Media & Proofs</span>
            </div>
            <p className="text-2xl font-bold text-white mt-1">{totalMediaCount}</p>
            <p className="text-[11px] text-purple-400 mt-0.5 font-medium">Photos, Videos, Docs</p>
          </div>
        </div>
      </section>

      {/* 3. Quick-Access Navigation Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-serif">Quick Access Modules</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Navigate to core organization modules and management portals.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickAccessCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                id={`quick-access-${card.id}`}
                onClick={() => setActiveTab(card.id)}
                className="group relative bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-500/50 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className={`p-3 rounded-2xl bg-gradient-to-br ${card.color} text-white shadow-xs group-hover:scale-105 transition-transform`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                      {card.count}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{card.description}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700 group-hover:text-emerald-800">
                  <span>{card.btnLabel}</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Latest Program Spotlight & Recent Activities */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-serif">Recent Programs & Activities</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Latest documented seminars, symposiums, workshops, and competitions.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('programs')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
          >
            <span>View All Programs ({programs.length})</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {programs.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300">
            <CalendarDays className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Programs Recorded Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Start by recording your organization's first seminar, workshop, or student competition.
            </p>
            {isAdmin && (
              <button
                onClick={onOpenAddProgram}
                className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                + Add First Program
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.slice(0, 3).map((prog) => {
              return (
                <div
                  key={prog.id}
                  id={`program-card-${prog.id}`}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-2xs hover:shadow-lg transition-all flex flex-col group"
                >
                  {/* Poster Image */}
                  <div className="relative h-48 sm:h-52 bg-slate-900 overflow-hidden cursor-pointer" onClick={() => viewProgramDetails(prog.id)}>
                    <img
                      src={prog.poster || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80'}
                      alt={prog.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                    {/* Proof count badge */}
                    {prog.media && prog.media.length > 0 && (
                      <span className="absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-xs text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        <span>{prog.media.length} Proofs</span>
                      </span>
                    )}

                    {/* Date on image */}
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <p className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDate(prog.date)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3
                        onClick={() => viewProgramDetails(prog.id)}
                        className="text-base font-bold text-slate-900 font-serif leading-snug hover:text-emerald-700 cursor-pointer transition-colors line-clamp-2"
                      >
                        {prog.name}
                      </h3>

                      <div className="mt-2.5 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{prog.place}</span>
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {prog.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        For: {prog.audience}
                      </span>
                      <button
                        onClick={() => viewProgramDetails(prog.id)}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 group-hover:underline"
                      >
                        <span>View Details</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Executive Committee / Organizers Spotlight */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-serif">Executive Committee & Bearers</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Active office bearers, coordinators, and leadership desk.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('organizers')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
          >
            <span>View All Organizers ({organizers.length})</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {organizers.slice(0, 6).map((orgzr) => (
            <div
              key={orgzr.id}
              className="bg-white rounded-2xl p-4 text-center border border-slate-200/90 shadow-2xs hover:shadow-md transition-all group flex flex-col items-center"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 bg-slate-100 border-2 border-emerald-500/40 mb-3 overflow-hidden shadow-xs group-hover:scale-105 transition-transform">
                <img
                  src={orgzr.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'}
                  alt={orgzr.name}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';
                  }}
                />
              </div>

              <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                {orgzr.name}
              </h4>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1 border border-emerald-200/60 line-clamp-1">
                {orgzr.position}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
