import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  Search,
  Filter,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  FileText,
  Trash2,
  ChevronLeft,
  DollarSign,
  AlertCircle,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Program, Income, Expense } from '../../types';
import { IncomeModal } from './IncomeModal';
import { ExpenseModal } from './ExpenseModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';

export const EventsView: React.FC = () => {
  const {
    programs,
    incomes,
    expenses,
    accounts,
    deleteIncome,
    deleteExpense,
    isAdmin,
    selectedProgramId,
    setSelectedProgramId,
  } = useApp();

  // Selected event for details page
  const [selectedEventId, setSelectedEventId] = useState<string | null>(selectedProgramId);

  React.useEffect(() => {
    if (selectedProgramId) {
      setSelectedEventId(selectedProgramId);
    }
  }, [selectedProgramId]);

  // Filter/Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [placeFilter, setPlaceFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [financialFilter, setFinancialFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'PROFIT' | 'DEFICIT' | 'NONE'>('ALL');

  // Modal open states
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'statement' | 'report'>('statement');

  // Deletion tracking
  const [incomeToDelete, setIncomeToDelete] = useState<Income | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Retrieve current active program if viewed
  const currentEvent = programs.find((p) => p.id === selectedEventId);

  // Calculate statistics for a single program
  const getEventStats = (progId: string) => {
    const eventIncomes = incomes.filter((inc) => inc.program_id === progId);
    const eventExpenses = expenses.filter((exp) => exp.program_id === progId);

    const totalIncome = eventIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    const totalExpenses = eventExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const net = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      net,
      incomeCount: eventIncomes.length,
      expenseCount: eventExpenses.length,
      incomes: eventIncomes,
      expenses: eventExpenses,
    };
  };

  // Filter list of events
  const filteredEvents = programs.filter((prog) => {
    const stats = getEventStats(prog.id);

    const matchesName = prog.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlace = prog.place.toLowerCase().includes(placeFilter.toLowerCase());
    const matchesDate = !dateFilter || prog.date === dateFilter;

    let matchesFinancial = true;
    if (financialFilter === 'INCOME') {
      matchesFinancial = stats.totalIncome > 0;
    } else if (financialFilter === 'EXPENSE') {
      matchesFinancial = stats.totalExpenses > 0;
    } else if (financialFilter === 'PROFIT') {
      matchesFinancial = stats.net > 0;
    } else if (financialFilter === 'DEFICIT') {
      matchesFinancial = stats.net < 0;
    } else if (financialFilter === 'NONE') {
      matchesFinancial = stats.totalIncome === 0 && stats.totalExpenses === 0;
    }

    return matchesName && matchesPlace && matchesDate && matchesFinancial;
  });

  const handleBackToList = () => {
    setSelectedEventId(null);
    setSelectedProgramId(null);
    setActiveTab('statement');
  };

  // Render list of programs/events
  const renderEventsList = () => {
    if (programs.length === 0) {
      return (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-xl mx-auto my-12 space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Calendar className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold font-serif text-slate-900">No programs available</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Create a program first to start tracking event finances. Program details and budgets will connect automatically.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
          <div>
            <h1 className="text-2xl font-bold font-serif text-slate-900 tracking-tight">Events Financial Tracker</h1>
            <p className="text-sm text-slate-500 mt-1">
              Select any existing academic or public program to view ledger accounts, surplus calculations, and detailed receipts.
            </p>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search by name */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by program name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Filter by place */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by location/place..."
                value={placeFilter}
                onChange={(e) => setPlaceFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Filter by date */}
            <div>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-700"
              />
            </div>

            {/* Financial State Filter */}
            <div>
              <select
                value={financialFilter}
                onChange={(e) => setFinancialFilter(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">All Financial States</option>
                <option value="INCOME">Events with Income</option>
                <option value="EXPENSE">Events with Expenses</option>
                <option value="PROFIT">Events with Surplus (Profit)</option>
                <option value="DEFICIT">Events with Deficit</option>
                <option value="NONE">No Financial Records Yet</option>
              </select>
            </div>
          </div>
        </div>

        {/* List Grid */}
        {filteredEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
            No events match your selected filters. Try broadening your criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredEvents.map((prog) => {
              const stats = getEventStats(prog.id);
              const isProfit = stats.net >= 0;

              return (
                <div
                  key={prog.id}
                  className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col"
                >
                  {/* Poster or visual header */}
                  <div className="h-40 bg-slate-100 relative overflow-hidden shrink-0 border-b border-slate-100">
                    {prog.poster ? (
                      <img
                        src={prog.poster}
                        alt={prog.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1.5 bg-gradient-to-br from-slate-50 to-slate-100">
                        <Calendar className="w-8 h-8 text-slate-300" />
                        <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">No Program Poster</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 px-2.5 py-1 bg-white/95 backdrop-blur-xs rounded-lg text-[10px] font-bold shadow-2xs text-slate-700">
                      {prog.date}
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h2 className="font-bold text-base font-serif text-slate-900 line-clamp-1">
                        {prog.name}
                      </h2>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{prog.place || 'Unspecified Venue'}</span>
                      </p>
                    </div>

                    {/* Financial stats row */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-500 font-medium block mb-0.5">Income</span>
                        <span className="font-bold text-emerald-700 text-sm">
                          ₹{stats.totalIncome.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block mb-0.5">Expenses</span>
                        <span className="font-bold text-rose-700 text-sm">
                          ₹{stats.totalExpenses.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block mb-0.5">Net Result</span>
                        <span className={`font-extrabold text-sm flex items-center gap-0.5 ${isProfit ? 'text-emerald-800' : 'text-rose-800'}`}>
                          {isProfit ? '+' : ''}₹{stats.net.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Counts and action */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                      <div className="text-[10px] text-slate-400 space-y-0.5">
                        <span className="block">{stats.incomeCount} Income transactions</span>
                        <span className="block">{stats.expenseCount} Expense transactions</span>
                      </div>

                      <button
                        onClick={() => setSelectedEventId(prog.id)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                      >
                        <span>View Event</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Render detail view for a specific program
  const renderEventDetails = () => {
    if (!currentEvent) return null;

    const stats = getEventStats(currentEvent.id);
    const isProfit = stats.net >= 0;

    // Categorized items
    const incomeCategories: { [cat: string]: number } = {};
    stats.incomes.forEach((inc) => {
      incomeCategories[inc.category] = (incomeCategories[inc.category] || 0) + inc.amount;
    });

    const expenseCategories: { [cat: string]: number } = {};
    stats.expenses.forEach((exp) => {
      expenseCategories[exp.category] = (expenseCategories[exp.category] || 0) + exp.amount;
    });

    return (
      <div className="space-y-6">
        {/* Breadcrumb / Back Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleBackToList}
            className="p-2 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-600 transition-colors"
            title="Back to list"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-xs text-slate-500 font-semibold">
            Events Tracker / <span className="text-slate-900 font-bold">{currentEvent.name}</span>
          </div>
        </div>

        {/* Poster + Header details */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs flex flex-col md:flex-row">
          {currentEvent.poster && (
            <div className="w-full md:w-64 h-48 md:h-auto shrink-0 border-r border-slate-100 relative">
              <img
                src={currentEvent.poster}
                alt={currentEvent.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold font-serif text-slate-900 leading-snug">
                {currentEvent.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <strong>Date:</strong> {currentEvent.date}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <strong>Place:</strong> {currentEvent.place}
                </span>
                {currentEvent.audience && (
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-slate-400" />
                    <strong>Audience:</strong> {currentEvent.audience}
                  </span>
                )}
              </div>
            </div>

            {/* Navigation Tabs (Statement vs Report) */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setActiveTab('statement')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'statement'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Financial Statement
              </button>
              <button
                onClick={() => setActiveTab('report')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'report'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Financial Report Card
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'statement' ? (
          <>
            {/* Cards Overview of current event */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Income card */}
              <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-2xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Total Event Income</span>
                    <span className="text-2xl font-extrabold text-emerald-800 block mt-1">
                      ₹{stats.totalIncome.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <ArrowDownLeft className="w-6 h-6" />
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                  <span>Inflow count:</span>
                  <span className="font-bold text-slate-700">{stats.incomeCount} transaction(s)</span>
                </div>
              </div>

              {/* Expense card */}
              <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-2xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Total Event Expenses</span>
                    <span className="text-2xl font-extrabold text-rose-800 block mt-1">
                      ₹{stats.totalExpenses.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center">
                    <ArrowUpRight className="w-6 h-6" />
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                  <span>Outflow count:</span>
                  <span className="font-bold text-slate-700">{stats.expenseCount} transaction(s)</span>
                </div>
              </div>

              {/* Net Surplus / Deficit card */}
              <div className={`border p-5 rounded-3xl shadow-2xs relative overflow-hidden ${
                isProfit
                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50/50 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                      {isProfit ? 'Net Surplus' : 'Net Deficit'}
                    </span>
                    <span className={`text-2xl font-extrabold block mt-1 ${isProfit ? 'text-emerald-800' : 'text-rose-800'}`}>
                      {isProfit ? '+' : ''}₹{stats.net.toLocaleString()}
                    </span>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    isProfit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {isProfit ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                  </div>
                </div>
                <div className="text-[10px] font-medium mt-4 pt-3 border-t border-slate-200/50 flex items-center justify-between">
                  <span>Financial Status:</span>
                  <span className={`font-bold ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {isProfit ? 'SURPLUS' : 'DEFICIT'}
                  </span>
                </div>
              </div>
            </div>

            {/* Income Section */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xs">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold font-serif text-base text-slate-900">Event Income Streams</h3>
                  <p className="text-xs text-slate-500">Receipt records linked to this program.</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setIsIncomeModalOpen(true)}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-950 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Income</span>
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Source / Received From</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Account</th>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                      {isAdmin && <th className="py-2.5 px-4 text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {stats.incomes.length > 0 ? (
                      stats.incomes.map((inc) => {
                        const acc = accounts.find((a) => a.id === inc.account_id);
                        return (
                          <tr key={inc.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{inc.date}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">
                              {inc.source}
                              {inc.reference_number && (
                                <span className="block text-[9px] text-slate-400 font-normal">Ref: {inc.reference_number}</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold text-[10px]">
                                {inc.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">{acc?.name || 'Unknown'}</td>
                            <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{inc.description || '—'}</td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-700 text-xs whitespace-nowrap">
                              +₹{inc.amount.toLocaleString()}
                            </td>
                            {isAdmin && (
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => setIncomeToDelete(inc)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete Income"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={isAdmin ? 7 : 6} className="py-8 px-4 text-center text-slate-400 text-xs italic">
                          No income transactions recorded for this event yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Total Income Stream:</span>
                <span className="text-emerald-700 text-sm font-extrabold">₹{stats.totalIncome.toLocaleString()}</span>
              </div>
            </div>

            {/* Expense Section */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xs">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold font-serif text-base text-slate-900">Event Expenditures</h3>
                  <p className="text-xs text-slate-500">Invoices and payment records linked to this program.</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setIsExpenseModalOpen(true)}
                    className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 active:bg-rose-950 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Expense</span>
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Paid To</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Account</th>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                      {isAdmin && <th className="py-2.5 px-4 text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {stats.expenses.length > 0 ? (
                      stats.expenses.map((exp) => {
                        const acc = accounts.find((a) => a.id === exp.account_id);
                        return (
                          <tr key={exp.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{exp.date}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">
                              {exp.paid_to}
                              {exp.reference_number && (
                                <span className="block text-[9px] text-slate-400 font-normal">Ref: {exp.reference_number}</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 font-semibold text-[10px]">
                                {exp.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">{acc?.name || 'Unknown'}</td>
                            <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{exp.description || '—'}</td>
                            <td className="py-3 px-4 text-right font-bold text-rose-700 text-xs whitespace-nowrap">
                              -₹{exp.amount.toLocaleString()}
                            </td>
                            {isAdmin && (
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => setExpenseToDelete(exp)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete Expense"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={isAdmin ? 7 : 6} className="py-8 px-4 text-center text-slate-400 text-xs italic">
                          No expenses recorded for this event yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Total Expenditure Stream:</span>
                <span className="text-rose-700 text-sm font-extrabold">₹{stats.totalExpenses.toLocaleString()}</span>
              </div>
            </div>
          </>
        ) : (
          /* Report Card View */
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs p-8 max-w-2xl mx-auto space-y-8 font-sans">
            <div className="text-center space-y-1">
              <h2 className="text-xs font-extrabold tracking-wider text-slate-400 uppercase">Event Financial Report</h2>
              <h3 className="text-xl font-bold font-serif text-slate-900">{currentEvent.name}</h3>
              <p className="text-xs text-slate-500">Date: {currentEvent.date} • Venue: {currentEvent.place}</p>
            </div>

            <hr className="border-dashed border-slate-200" />

            {/* Income Streams */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Incomes</h4>
              <div className="space-y-1.5 text-xs text-slate-700">
                {Object.keys(incomeCategories).length > 0 ? (
                  Object.entries(incomeCategories).map(([cat, total]) => (
                    <div key={cat} className="flex justify-between items-center py-1">
                      <span>{cat}</span>
                      <span className="font-bold">₹{total.toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 italic text-center py-2">No income streams logged.</div>
                )}
                <div className="flex justify-between items-center py-2 border-t border-slate-100 font-bold text-slate-900 mt-2">
                  <span>Total Income</span>
                  <span>₹{stats.totalIncome.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <hr className="border-dashed border-slate-200" />

            {/* Expenses */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Expenses</h4>
              <div className="space-y-1.5 text-xs text-slate-700">
                {Object.keys(expenseCategories).length > 0 ? (
                  Object.entries(expenseCategories).map(([cat, total]) => (
                    <div key={cat} className="flex justify-between items-center py-1">
                      <span>{cat}</span>
                      <span className="font-bold">₹{total.toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 italic text-center py-2">No expenses logged.</div>
                )}
                <div className="flex justify-between items-center py-2 border-t border-slate-100 font-bold text-slate-900 mt-2">
                  <span>Total Expenses</span>
                  <span>₹{stats.totalExpenses.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <hr className="border-dashed border-slate-200" />

            {/* Summary */}
            <div className={`p-4 rounded-2xl border ${
              isProfit
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50/50 border-rose-200 text-rose-900'
            } flex justify-between items-center text-xs font-bold`}>
              <span>{isProfit ? 'NET SURPLUS' : 'NET DEFICIT'}</span>
              <span className="text-base font-extrabold">
                {isProfit ? '+' : ''}₹{stats.net.toLocaleString()}
              </span>
            </div>

            <div className="text-center">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs inline-flex items-center gap-2 no-print"
              >
                <FileText className="w-4 h-4" />
                <span>Print Report</span>
              </button>
            </div>
          </div>
        )}

        {/* Modals for recording income/expense linked to the event */}
        <IncomeModal
          isOpen={isIncomeModalOpen}
          onClose={() => setIsIncomeModalOpen(false)}
          preselectedProgramId={currentEvent.id}
        />
        <ExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          preselectedProgramId={currentEvent.id}
        />

        {/* Delete confirms */}
        {incomeToDelete && (
          <DeleteConfirmModal
            isOpen={true}
            title="Delete Income Record"
            message={`Are you sure you want to delete the income of ₹${incomeToDelete.amount.toLocaleString()} received from "${incomeToDelete.source}"? This will update the corresponding account balance.`}
            itemDetails={[
              { label: 'Received From', value: incomeToDelete.source },
              { label: 'Amount', value: `₹${incomeToDelete.amount.toLocaleString()}` },
              { label: 'Date', value: incomeToDelete.date },
            ]}
            onClose={() => setIncomeToDelete(null)}
            onConfirm={async () => {
              await deleteIncome(incomeToDelete.id);
            }}
          />
        )}

        {expenseToDelete && (
          <DeleteConfirmModal
            isOpen={true}
            title="Delete Expense Record"
            message={`Are you sure you want to delete the expense of ₹${expenseToDelete.amount.toLocaleString()} paid to "${expenseToDelete.paid_to}"? This will restore the account balance.`}
            itemDetails={[
              { label: 'Paid To', value: expenseToDelete.paid_to },
              { label: 'Amount', value: `₹${expenseToDelete.amount.toLocaleString()}` },
              { label: 'Date', value: expenseToDelete.date },
            ]}
            onClose={() => setExpenseToDelete(null)}
            onConfirm={async () => {
              await deleteExpense(expenseToDelete.id);
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div className="pb-12">
      {selectedEventId ? renderEventDetails() : renderEventsList()}
    </div>
  );
};
