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
import { ProgramThumbnail } from '../ProgramCard';
import { IncomeModal } from './IncomeModal';
import { ExpenseModal } from './ExpenseModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { PrintFinancialReportModal } from './PrintFinancialReportModal';

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
    viewProgramDetails,
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
  const [showPrintReportModal, setShowPrintReportModal] = useState(false);
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

    // REQUIRED: Must have at least one income or expense transaction
    const hasFinancialActivity = stats.incomeCount > 0 || stats.expenseCount > 0;
    if (!hasFinancialActivity) return false;

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

  // Render list of programs/events (Level 1)
  const renderEventsList = () => {
    return (
      <div className="space-y-3 sm:space-y-4 max-w-2xl mx-auto px-2 sm:px-4">
        {/* Header Summary */}
        <div className="flex items-center justify-between bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold font-heading text-slate-900 tracking-tight">
                Events Financial Tracker
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Select a program to view its financial ledger and statements.
              </p>
            </div>
          </div>
        </div>

        {/* Search Panel */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search program..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 h-10 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* List of Compact Program Cards */}
        {filteredEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 text-center max-w-md mx-auto my-6 space-y-3 shadow-xs">
            <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center mx-auto text-emerald-600">
              <Calendar className="w-6 h-6" />
            </div>
            <h2 className="text-base sm:text-lg font-bold font-heading text-slate-900">No Financial Activity Yet</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
              Programs will appear here once income or expense transactions are recorded.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEvents.map((prog) => (
              <div
                key={prog.id}
                onClick={() => setSelectedEventId(prog.id)}
                className="bg-white hover:bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-2xs flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h2 className="font-bold text-xs sm:text-sm font-heading text-slate-900 truncate">
                    {prog.name}
                  </h2>
                </div>
                <div className="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-emerald-700 group-hover:text-white text-slate-600 flex items-center justify-center font-bold text-sm transition-all shrink-0 ml-3">
                  ›
                </div>
              </div>
            ))}
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

    return (
      <div className="space-y-3 sm:space-y-4 max-w-4xl mx-auto px-2 sm:px-4">
        {/* Top Bar: Breadcrumb + Save as PDF Button */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={handleBackToList}
              className="p-2 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-600 transition-colors shrink-0 cursor-pointer"
              title="Back to list"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div className="text-xs text-slate-500 font-semibold truncate">
              Events / <span className="text-slate-900 font-bold truncate">{currentEvent.name}</span>
            </div>
          </div>

          <button
            onClick={() => setShowPrintReportModal(true)}
            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
            title="Generate Official Program Financial Report PDF"
          >
            <FileText className="w-4 h-4 text-emerald-100" />
            <span className="hidden sm:inline">Save as PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>

        {/* Program Header Card (Thumbnail + Metadata) */}
        <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xs flex flex-col sm:flex-row">
          <div className="w-full sm:w-48 h-32 sm:h-auto bg-slate-900 shrink-0 relative flex items-center justify-center p-3 border-b sm:border-b-0 sm:border-r border-slate-100">
            <ProgramThumbnail program={currentEvent} className="w-full h-full object-cover rounded-xl shadow-xs" />
          </div>
          <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <h1 className="text-base sm:text-xl font-bold font-heading text-slate-900 leading-snug">
                {currentEvent.name}
              </h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span><strong>Date:</strong> {currentEvent.date}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate"><strong>Place:</strong> {currentEvent.place || '—'}</span>
                </span>
                {currentEvent.audience && (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate"><strong>For Whom:</strong> {currentEvent.audience}</span>
                  </span>
                )}
                {currentEvent.resourcePerson && (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate"><strong>Resource Person:</strong> {currentEvent.resourcePerson}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Financial Dashboard — 2×2 Grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          {/* Total Income */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Income</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <ArrowDownLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-base sm:text-xl font-extrabold text-emerald-700">₹{stats.totalIncome.toLocaleString()}</span>
              <p className="text-[10px] text-slate-400 mt-0.5">{stats.incomeCount} transaction(s)</p>
            </div>
          </div>

          {/* Total Expenses */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Expenses</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-base sm:text-xl font-extrabold text-rose-700">₹{stats.totalExpenses.toLocaleString()}</span>
              <p className="text-[10px] text-slate-400 mt-0.5">{stats.expenseCount} transaction(s)</p>
            </div>
          </div>

          {/* Net Result */}
          <div className={`p-3.5 sm:p-4 rounded-2xl border shadow-2xs flex flex-col justify-between ${isProfit ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' : 'bg-rose-50/50 border-rose-200 text-rose-900'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isProfit ? 'text-emerald-800' : 'text-rose-800'}`}>
                {isProfit ? 'Net Surplus' : 'Net Deficit'}
              </span>
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center ${isProfit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {isProfit ? <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-base sm:text-xl font-extrabold ${isProfit ? 'text-emerald-800' : 'text-rose-800'}`}>
                {isProfit ? '+' : ''}₹{stats.net.toLocaleString()}
              </span>
              <p className={`text-[10px] font-bold mt-0.5 ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isProfit ? 'SURPLUS' : 'DEFICIT'}
              </p>
            </div>
          </div>

          {/* Transactions Count */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transactions</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-base sm:text-xl font-extrabold text-blue-800">{stats.incomeCount + stats.expenseCount}</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Total linked logs</p>
            </div>
          </div>
        </div>

        {/* Income Streams Section */}
        <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xs">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold font-heading text-sm sm:text-base text-slate-900">Event Income Streams</h3>
              <p className="text-[11px] text-slate-500">Receipt records linked to this program.</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setIsIncomeModalOpen(true)}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Income</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {stats.incomes.length > 0 ? (
              stats.incomes.map((inc) => {
                const acc = accounts.find((a) => a.id === inc.account_id);
                return (
                  <div key={inc.id} className="p-3.5 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-slate-500 font-mono">{inc.date}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold text-[10px]">
                          {inc.category}
                        </span>
                        {acc && (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {acc.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {inc.source}
                      </p>
                      {inc.description && (
                        <p className="text-[11px] text-slate-500 truncate">{inc.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div>
                        <span className="text-xs sm:text-sm font-extrabold text-emerald-700 block">
                          +₹{inc.amount.toLocaleString()}
                        </span>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => setIncomeToDelete(inc)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Delete Income"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 px-4 text-center text-slate-400 text-xs italic">
                No income transactions recorded for this program yet.
              </div>
            )}
          </div>

          <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Total Income Stream:</span>
            <span className="text-emerald-700 text-sm font-extrabold">₹{stats.totalIncome.toLocaleString()}</span>
          </div>
        </div>

        {/* Expense Streams Section */}
        <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xs">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold font-heading text-sm sm:text-base text-slate-900">Event Expenditures</h3>
              <p className="text-[11px] text-slate-500">Invoices and payment records linked to this program.</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Expense</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {stats.expenses.length > 0 ? (
              stats.expenses.map((exp) => {
                const acc = accounts.find((a) => a.id === exp.account_id);
                return (
                  <div key={exp.id} className="p-3.5 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-slate-500 font-mono">{exp.date}</span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 font-semibold text-[10px]">
                          {exp.category}
                        </span>
                        {acc && (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {acc.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {exp.paid_to}
                      </p>
                      {exp.description && (
                        <p className="text-[11px] text-slate-500 truncate">{exp.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div>
                        <span className="text-xs sm:text-sm font-extrabold text-rose-700 block">
                          -₹{exp.amount.toLocaleString()}
                        </span>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => setExpenseToDelete(exp)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 px-4 text-center text-slate-400 text-xs italic">
                No expense transactions recorded for this program yet.
              </div>
            )}
          </div>

          <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Total Expenditure Stream:</span>
            <span className="text-rose-700 text-sm font-extrabold">₹{stats.totalExpenses.toLocaleString()}</span>
          </div>
        </div>

        {/* Print / Save as PDF Modal */}
        {showPrintReportModal && (
          <PrintFinancialReportModal
            program={currentEvent}
            incomes={incomes}
            expenses={expenses}
            accounts={accounts}
            onClose={() => setShowPrintReportModal(false)}
          />
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
