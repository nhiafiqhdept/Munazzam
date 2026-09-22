import React, { useState } from 'react';
import {
  Wallet,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Coins,
  ShieldCheck,
  Plus,
  ArrowLeftRight,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';

interface TreasuryDashboardViewProps {
  onOpenAddIncome: () => void;
  onOpenAddExpense: () => void;
  onOpenAddTransfer: () => void;
  onOpenAddLoan: () => void;
  onOpenAddAccount: () => void;
}

export const TreasuryDashboardView: React.FC<TreasuryDashboardViewProps> = ({
  onOpenAddIncome,
  onOpenAddExpense,
  onOpenAddTransfer,
  onOpenAddLoan,
  onOpenAddAccount,
}) => {
  const { accounts, incomes, expenses, transfers, loans, loanRepayments, programs, setActiveTab, isAdmin } = useApp();

  // Calculate balances for each account
  const getAccountBalance = (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return 0;
    let bal = acc.opening_balance;
    incomes.filter((i) => i.account_id === accountId).forEach((i) => (bal += i.amount));
    expenses.filter((e) => e.account_id === accountId).forEach((e) => (bal -= e.amount));
    transfers.filter((t) => t.to_account_id === accountId).forEach((t) => (bal += t.amount));
    transfers.filter((t) => t.from_account_id === accountId).forEach((t) => (bal -= t.amount));
    return bal;
  };

  const cashInHand = accounts
    .filter((a) => a.type === 'cash' && a.is_active)
    .reduce((sum, a) => sum + getAccountBalance(a.id), 0);

  const bankBalance = accounts
    .filter((a) => a.type !== 'cash' && a.is_active)
    .reduce((sum, a) => sum + getAccountBalance(a.id), 0);

  const totalAvailable = cashInHand + bankBalance;

  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  const moneyLent = loans
    .filter((l) => l.type === 'LENT' && l.status !== 'FULLY_RECOVERED')
    .reduce((sum, l) => sum + l.outstanding_amount, 0);

  const moneyBorrowed = loans
    .filter((l) => l.type === 'BORROWED' && l.status !== 'FULLY_PAID')
    .reduce((sum, l) => sum + l.outstanding_amount, 0);

  // Prepare monthly data for charts
  const monthlyMap: { [month: string]: { income: number; expense: number } } = {};
  incomes.forEach((inc) => {
    const m = inc.date.substring(0, 7); // YYYY-MM
    if (!monthlyMap[m]) monthlyMap[m] = { income: 0, expense: 0 };
    monthlyMap[m].income += inc.amount;
  });
  expenses.forEach((exp) => {
    const m = exp.date.substring(0, 7);
    if (!monthlyMap[m]) monthlyMap[m] = { income: 0, expense: 0 };
    monthlyMap[m].expense += exp.amount;
  });

  const monthlyChartData = Object.keys(monthlyMap)
    .sort()
    .map((m) => ({
      month: m,
      Income: monthlyMap[m].income,
      Expense: monthlyMap[m].expense,
    }));

  // Expense categories breakdown
  const catMap: { [cat: string]: number } = {};
  expenses.forEach((exp) => {
    catMap[exp.category] = (catMap[exp.category] || 0) + exp.amount;
  });
  const expensePieData = Object.keys(catMap).map((cat) => ({
    name: cat,
    value: catMap[cat],
  }));

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#64748b'];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100 shrink-0">
            <Landmark className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 tracking-tight">
                Treasury & Financial Operations
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/70 rounded-full">
                Active Ledger
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Real-time multi-account tracking, income, expenses, loans, and cashbook logs.
            </p>
          </div>
        </div>

        {/* Action Button Matrix: 2x2 on Mobile, Inline Row on Desktop */}
        {isAdmin && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
            <button
              id="treasury-record-income-btn"
              onClick={onOpenAddIncome}
              className="w-full px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4 text-emerald-200 shrink-0" />
              <span className="whitespace-nowrap">Record Income</span>
            </button>
            <button
              id="treasury-record-expense-btn"
              onClick={onOpenAddExpense}
              className="w-full px-3.5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4 text-rose-200 shrink-0" />
              <span className="whitespace-nowrap">Record Expense</span>
            </button>
            <button
              id="treasury-transfer-funds-btn"
              onClick={onOpenAddTransfer}
              className="w-full px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              <ArrowLeftRight className="w-4 h-4 text-slate-300 shrink-0" />
              <span className="whitespace-nowrap">Transfer Funds</span>
            </button>
            <button
              id="treasury-add-loan-btn"
              onClick={onOpenAddLoan}
              className="w-full px-3.5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Landmark className="w-4 h-4 text-amber-200 shrink-0" />
              <span className="whitespace-nowrap">Add Loan</span>
            </button>
          </div>
        )}
      </div>

      {/* Financial Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cash in Hand */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cash in Hand</p>
            <p className="text-2xl font-bold font-heading text-slate-900 mt-1">₹{cashInHand.toLocaleString()}</p>
            <p className="text-[11px] text-emerald-600 mt-1 font-medium">Physical currency</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        {/* Bank Account */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bank & Digital Accounts</p>
            <p className="text-2xl font-bold font-heading text-slate-900 mt-1">₹{bankBalance.toLocaleString()}</p>
            <p className="text-[11px] text-blue-600 mt-1 font-medium">Institutional deposits</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Total Available */}
        <div className="bg-emerald-900 text-white p-5 rounded-2xl shadow-md flex items-center justify-between relative group">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">Total Available Balance</p>
            <p className="text-2xl font-bold font-heading text-white mt-1">₹{totalAvailable.toLocaleString()}</p>
            <p className="text-[11px] text-emerald-300 mt-1 font-medium">Net liquid reserves</p>
            <p className="text-[10px] text-emerald-100/80 mt-1.5 leading-relaxed bg-emerald-950/40 p-1.5 rounded-lg border border-emerald-800/30">
              Loans are tracked separately and are not included in Total Available Balance.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-emerald-200 flex items-center justify-center shrink-0 ml-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Total Income & Expense */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-emerald-700 uppercase">Total Inflows</p>
              <p className="text-lg font-bold font-heading text-slate-900">₹{totalIncome.toLocaleString()}</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <hr className="border-slate-100 my-2" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-rose-700 uppercase">Total Outflows</p>
              <p className="text-lg font-bold font-heading text-slate-900">₹{totalExpense.toLocaleString()}</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Financial Summary (Loans & Receivables) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Money Lent (Receivables)</p>
            <p className="text-xl font-bold font-heading text-blue-700 mt-1">₹{moneyLent.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Outstanding amounts to recover</p>
          </div>
          <p className="text-[9px] text-slate-400 mt-2 italic border-t border-slate-100 pt-1.5">
            Tracked separately from available balance.
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Money Borrowed (Payables)</p>
            <p className="text-xl font-bold font-heading text-amber-700 mt-1">₹{moneyBorrowed.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Outstanding liabilities to repay</p>
          </div>
          <p className="text-[9px] text-slate-400 mt-2 italic border-t border-slate-100 pt-1.5">
            Tracked separately from available balance.
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase">Active Accounts</p>
          <p className="text-xl font-bold font-heading text-slate-900 mt-1">{accounts.filter(a => a.is_active).length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Managed deposit locations</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase">Net Surplus / Deficit</p>
          <p className={`text-xl font-bold font-heading mt-1 ${totalIncome - totalExpense >= 0 ? 'text-emerald-700' : 'text-rose-750'}`}>
            ₹{(totalIncome - totalExpense).toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Overall operational result</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Income vs Expense */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <h3 className="text-base font-bold font-heading text-slate-900 mb-4">Monthly Income vs Expenses</h3>
          {monthlyChartData.length > 0 ? (
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px', border: 'none' }}
                  />
                  <Legend />
                  <Bar dataKey="Income" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Expense" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
              No monthly financial data recorded yet.
            </div>
          )}
        </div>

        {/* Expense Category Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <h3 className="text-base font-bold font-heading text-slate-900 mb-4">Expense Categories Breakdown</h3>
          {expensePieData.length > 0 ? (
            <div className="w-full h-72 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensePieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    fontSize={11}
                  >
                    {expensePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px', border: 'none' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
              No expense records found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
