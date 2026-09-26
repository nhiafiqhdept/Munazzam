import React, { useMemo, useState } from 'react';
import { 
  Calendar, ChevronLeft, ChevronRight, Filter, X, ArrowDownLeft, ArrowUpRight, 
  Landmark, RotateCcw, Clock, Check, Sparkles, TrendingUp
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  TreasuryDateFilter, 
  formatMonthLabel, 
  getAdjacentMonth, 
  extractAvailableMonths, 
  matchTreasuryDateFilter,
  saveDefaultMonthKey
} from './treasuryDateUtils';

interface TreasuryMonthFilterProps {
  filter: TreasuryDateFilter;
  onChangeFilter: (newFilter: TreasuryDateFilter) => void;
  title?: string;
  subtitle?: string;
  highlightSection?: 'income' | 'expense' | 'loans';
}

export const TreasuryMonthFilter: React.FC<TreasuryMonthFilterProps> = ({
  filter,
  onChangeFilter,
  title,
  subtitle,
  highlightSection
}) => {
  const { incomes, expenses, loans, loanRepayments } = useApp();
  const [showDatePicker, setShowDatePicker] = useState<boolean>(filter.dateFilterType !== 'ALL');

  // All months with activity
  const availableMonths = useMemo(() => {
    return extractAvailableMonths(incomes, expenses, loans, loanRepayments);
  }, [incomes, expenses, loans, loanRepayments]);

  const currentMonthKey = new Date().toISOString().substring(0, 7);

  // Month navigation handlers
  const handlePrevMonth = () => {
    const prev = getAdjacentMonth(filter.selectedMonth, -1);
    saveDefaultMonthKey(prev);
    onChangeFilter({
      ...filter,
      selectedMonth: prev,
      dateFilterType: 'ALL',
      specificDate: '',
      startDate: '',
      endDate: ''
    });
  };

  const handleNextMonth = () => {
    const next = getAdjacentMonth(filter.selectedMonth, 1);
    saveDefaultMonthKey(next);
    onChangeFilter({
      ...filter,
      selectedMonth: next,
      dateFilterType: 'ALL',
      specificDate: '',
      startDate: '',
      endDate: ''
    });
  };

  const handleSelectMonth = (mKey: string) => {
    saveDefaultMonthKey(mKey);
    onChangeFilter({
      ...filter,
      selectedMonth: mKey,
      dateFilterType: 'ALL',
      specificDate: '',
      startDate: '',
      endDate: ''
    });
  };

  const handleResetFilters = () => {
    onChangeFilter({
      ...filter,
      dateFilterType: 'ALL',
      specificDate: '',
      startDate: '',
      endDate: ''
    });
    setShowDatePicker(false);
  };

  // Monthly summary calculations for the active filter
  const summary = useMemo(() => {
    const matchedIncomes = incomes.filter((i) => matchTreasuryDateFilter(i.date, filter));
    const matchedExpenses = expenses.filter((e) => matchTreasuryDateFilter(e.date, filter));
    const matchedLoans = loans.filter((l) => matchTreasuryDateFilter(l.date, filter));

    const totalIncome = matchedIncomes.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = matchedExpenses.reduce((sum, e) => sum + e.amount, 0);

    const borrowedLoans = matchedLoans.filter((l) => l.type === 'BORROWED');
    const lentLoans = matchedLoans.filter((l) => l.type === 'LENT');

    const totalLoansBorrowed = borrowedLoans.reduce((sum, l) => sum + l.original_amount, 0);
    const outstandingBorrowed = borrowedLoans.reduce((sum, l) => sum + l.outstanding_amount, 0);

    const totalLoansLent = lentLoans.reduce((sum, l) => sum + l.original_amount, 0);
    const outstandingLent = lentLoans.reduce((sum, l) => sum + l.outstanding_amount, 0);

    const netCashflow = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      totalLoansBorrowed,
      outstandingBorrowed,
      totalLoansLent,
      outstandingLent,
      netCashflow,
      incomesCount: matchedIncomes.length,
      expensesCount: matchedExpenses.length,
      loansCount: matchedLoans.length,
    };
  }, [incomes, expenses, loans, filter]);

  const isDateFiltered = filter.dateFilterType !== 'ALL' && (Boolean(filter.specificDate) || Boolean(filter.startDate) || Boolean(filter.endDate));

  return (
    <div className="space-y-3.5" id="treasury-month-filter-container">
      {/* 1. Main Month Navigation Card */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Month selector controls with Previous / Next arrows */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-50 border border-slate-200/90 rounded-xl p-1 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevMonth}
                disabled={filter.selectedMonth === 'ALL'}
                title="Previous Month"
                className="p-1.5 sm:p-2 text-slate-600 hover:text-emerald-700 hover:bg-white rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="relative inline-flex items-center px-2">
                <Calendar className="w-3.5 h-3.5 text-emerald-700 mr-2 shrink-0" />
                <select
                  value={filter.selectedMonth}
                  onChange={(e) => handleSelectMonth(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm font-bold text-slate-900 border-none outline-none cursor-pointer pr-4 appearance-none hover:text-emerald-800 transition-colors"
                  aria-label="Select Evaluation or Financial Month"
                >
                  <option value="ALL">All Months (Lifetime)</option>
                  <optgroup label="Available Months">
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {formatMonthLabel(m)} {m === currentMonthKey ? '• Current' : ''}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <div className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-slate-400">
                  <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                disabled={filter.selectedMonth === 'ALL'}
                title="Next Month"
                className="p-1.5 sm:p-2 text-slate-600 hover:text-emerald-700 hover:bg-white rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick jump to current month if on past/future month */}
            {filter.selectedMonth !== currentMonthKey && filter.selectedMonth !== 'ALL' && (
              <button
                type="button"
                onClick={() => handleSelectMonth(currentMonthKey)}
                className="px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
                title="Jump to Current Month"
              >
                Go to Current Month
              </button>
            )}
          </div>

          {/* Date Filter Toggle & Active state banner */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                showDatePicker || isDateFiltered
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/20'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-emerald-700" />
              <span>{isDateFiltered ? 'Date Filtered' : 'Filter by Date'}</span>
            </button>

            {isDateFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                title="Reset Date Filters to Full Month"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Expandable Date-Based Filtering Form */}
        {showDatePicker && (
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/90 space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Date Range Filter
              </span>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => onChangeFilter({ ...filter, dateFilterType: 'ALL', specificDate: '', startDate: '', endDate: '' })}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                    filter.dateFilterType === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Full Month
                </button>
                <button
                  type="button"
                  onClick={() => onChangeFilter({ ...filter, dateFilterType: 'SPECIFIC' })}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                    filter.dateFilterType === 'SPECIFIC' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Single Date
                </button>
                <button
                  type="button"
                  onClick={() => onChangeFilter({ ...filter, dateFilterType: 'RANGE' })}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                    filter.dateFilterType === 'RANGE' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Date Range
                </button>
              </div>
            </div>

            {/* Inputs based on type */}
            {filter.dateFilterType === 'SPECIFIC' && (
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-xs font-medium text-slate-600">Select Date:</label>
                <input
                  type="date"
                  value={filter.specificDate}
                  onChange={(e) => onChangeFilter({ ...filter, specificDate: e.target.value })}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {filter.specificDate && (
                  <button
                    type="button"
                    onClick={() => onChangeFilter({ ...filter, specificDate: '' })}
                    className="p-1 text-slate-400 hover:text-slate-700"
                    title="Clear"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {filter.dateFilterType === 'RANGE' && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-600">From:</span>
                  <input
                    type="date"
                    value={filter.startDate}
                    onChange={(e) => onChangeFilter({ ...filter, startDate: e.target.value })}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-600">To:</span>
                  <input
                    type="date"
                    value={filter.endDate}
                    onChange={(e) => onChangeFilter({ ...filter, endDate: e.target.value })}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {(filter.startDate || filter.endDate) && (
                  <button
                    type="button"
                    onClick={() => onChangeFilter({ ...filter, startDate: '', endDate: '' })}
                    className="p-1 text-slate-400 hover:text-slate-700"
                    title="Clear Range"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Monthly Financial Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5" id="treasury-month-summary-grid">
        {/* Card 1: Total Income */}
        <div 
          className={`p-3 sm:p-3.5 rounded-2xl border transition-all ${
            highlightSection === 'income' 
              ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs' 
              : 'bg-white border-slate-200 shadow-2xs hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Total Income
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-100/80 border border-emerald-200 flex items-center justify-center text-emerald-800 shrink-0">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <span className="text-base sm:text-lg font-black text-emerald-700 tracking-tight block truncate">
              +₹{summary.totalIncome.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {summary.incomesCount} record{summary.incomesCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Card 2: Total Expenses */}
        <div 
          className={`p-3 sm:p-3.5 rounded-2xl border transition-all ${
            highlightSection === 'expense' 
              ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-500/20 shadow-xs' 
              : 'bg-white border-slate-200 shadow-2xs hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Total Expenses
            </span>
            <div className="w-6 h-6 rounded-lg bg-rose-100/80 border border-rose-200 flex items-center justify-center text-rose-800 shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <span className="text-base sm:text-lg font-black text-rose-700 tracking-tight block truncate">
              -₹{summary.totalExpenses.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {summary.expensesCount} record{summary.expensesCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Card 3: Loans Borrowed (Payables) */}
        <div 
          className={`p-3 sm:p-3.5 rounded-2xl border transition-all ${
            highlightSection === 'loans' 
              ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-500/20 shadow-xs' 
              : 'bg-white border-slate-200 shadow-2xs hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Loans Borrowed
            </span>
            <div className="w-6 h-6 rounded-lg bg-amber-100/80 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
              <Landmark className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <span className="text-base sm:text-lg font-black text-amber-800 tracking-tight block truncate">
              ₹{summary.totalLoansBorrowed.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-rose-600 block truncate">
              ₹{summary.outstandingBorrowed.toLocaleString()} outstanding
            </span>
          </div>
        </div>

        {/* Card 4: Loans Lent (Receivables) */}
        <div 
          className={`p-3 sm:p-3.5 rounded-2xl border transition-all ${
            highlightSection === 'loans' 
              ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-500/20 shadow-xs' 
              : 'bg-white border-slate-200 shadow-2xs hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Loans Lent
            </span>
            <div className="w-6 h-6 rounded-lg bg-blue-100/80 border border-blue-200 flex items-center justify-center text-blue-800 shrink-0">
              <Landmark className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <span className="text-base sm:text-lg font-black text-blue-800 tracking-tight block truncate">
              ₹{summary.totalLoansLent.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-blue-600 block truncate">
              ₹{summary.outstandingLent.toLocaleString()} receivable
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
