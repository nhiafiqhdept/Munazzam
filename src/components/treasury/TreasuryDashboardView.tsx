import React from 'react';
import {
  Wallet,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Coins,
  ShieldCheck,
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
}) => {
  const { accounts, incomes, expenses, transfers, loans, isAdmin } = useApp();

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

  const netSurplus = totalIncome - totalExpense;

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
    <div className="space-y-2 sm:space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-2.5 pb-2.5 sm:pb-3 border-b border-slate-100">
          <div className="p-1.5 sm:p-2 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100/80 shrink-0">
            <Landmark className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
          </div>
          <h2 className="text-sm sm:text-lg font-bold font-heading text-slate-900 tracking-tight">
            Treasury & Financial Operations
          </h2>
        </div>

        {/* Action Button Matrix: 2x2 on Mobile, Inline Row on Desktop */}
        {isAdmin && (
          <div className="grid grid-cols-2 gap-2 pt-2.5 sm:pt-4">
            <button
              id="treasury-record-income-btn"
              onClick={onOpenAddIncome}
              className="w-full h-[42px] sm:h-11 px-3 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 text-emerald-900 font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-start gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-2xs"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-200/60 text-emerald-800 flex items-center justify-center shrink-0">
                <ArrowDownLeft className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">Record Income</span>
            </button>
            <button
              id="treasury-record-expense-btn"
              onClick={onOpenAddExpense}
              className="w-full h-[42px] sm:h-11 px-3 bg-rose-50 hover:bg-rose-100/70 border border-rose-200 text-rose-900 font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-start gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-2xs"
            >
              <div className="w-6 h-6 rounded-lg bg-rose-200/60 text-rose-800 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">Record Expense</span>
            </button>
            <button
              id="treasury-transfer-funds-btn"
              onClick={onOpenAddTransfer}
              className="w-full h-[42px] sm:h-11 px-3 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-slate-900 font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-start gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-2xs"
            >
              <div className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">Transfer Funds</span>
            </button>
            <button
              id="treasury-add-loan-btn"
              onClick={onOpenAddLoan}
              className="w-full h-[42px] sm:h-11 px-3 bg-amber-50 hover:bg-amber-100/70 border border-amber-200 text-amber-900 font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-start gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-2xs"
            >
              <div className="w-6 h-6 rounded-lg bg-amber-200/60 text-amber-800 flex items-center justify-center shrink-0">
                <Coins className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">Add Loan</span>
            </button>
          </div>
        )}
      </div>

      {/* Financial Summary Cards Grid: Compact 2x2 on Mobile, 4-col on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Cash in Hand */}
        <div className="bg-emerald-50/70 border border-emerald-200/70 p-3 sm:p-5 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-800">Cash in Hand</p>
            <p className="text-base sm:text-2xl font-bold font-heading text-slate-900 mt-0.5 sm:mt-1">
              ₹{cashInHand.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-[11px] text-emerald-700 mt-0.5 sm:mt-1 font-medium">Physical currency</p>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Coins className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Bank & Digital Accounts */}
        <div className="bg-blue-50/70 border border-blue-200/70 p-3 sm:p-5 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-800">Bank & Digital</p>
            <p className="text-base sm:text-2xl font-bold font-heading text-slate-900 mt-0.5 sm:mt-1">
              ₹{bankBalance.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-[11px] text-blue-700 mt-0.5 sm:mt-1 font-medium">Institutional</p>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Total Available Balance (Spans full 2 cols on mobile) */}
        <div className="col-span-2 bg-emerald-950 text-white p-3.5 sm:p-5 rounded-2xl shadow-md flex items-center justify-between relative group">
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-200">
              Total Available Balance
            </p>
            <p className="text-xl sm:text-2xl font-bold font-heading text-white mt-0.5 sm:mt-1">
              ₹{totalAvailable.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-[11px] text-emerald-300 mt-0.5 font-medium">Net liquid reserves</p>
            <p className="hidden sm:block text-[10px] text-emerald-100/80 mt-1.5 leading-relaxed bg-emerald-900/50 p-1.5 rounded-lg border border-emerald-800/40">
              Loans are tracked separately and are not included in Total Available Balance.
            </p>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-800 text-emerald-200 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Total Inflows */}
        <div className="bg-teal-50/70 border border-teal-200/70 p-3 sm:p-5 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-teal-800">Total Inflows</p>
            <p className="text-base sm:text-2xl font-bold font-heading text-slate-900 mt-0.5 sm:mt-1">
              ₹{totalIncome.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-[11px] text-teal-700 mt-0.5 sm:mt-1 font-medium">All income received</p>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Total Outflows */}
        <div className="bg-rose-50/70 border border-rose-200/70 p-3 sm:p-5 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-800">Total Outflows</p>
            <p className="text-base sm:text-2xl font-bold font-heading text-slate-900 mt-0.5 sm:mt-1">
              ₹{totalExpense.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-[11px] text-rose-700 mt-0.5 sm:mt-1 font-medium">All expenses paid</p>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <TrendingDown className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Money Lent (Receivables) */}
        <div className="bg-indigo-50/70 border border-indigo-200/70 p-3 sm:p-5 rounded-2xl shadow-2xs flex flex-col justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-800">
              Money Lent (Receivables)
            </p>
            <p className="text-base sm:text-xl font-bold font-heading text-indigo-900 mt-0.5 sm:mt-1">
              ₹{moneyLent.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-[11px] text-indigo-700 mt-0.5">Amounts to recover</p>
          </div>
        </div>

        {/* Money Borrowed (Payables) */}
        <div className="bg-amber-50/70 border border-amber-200/70 p-3 sm:p-5 rounded-2xl shadow-2xs flex flex-col justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-800">
              Money Borrowed (Payables)
            </p>
            <p className="text-base sm:text-xl font-bold font-heading text-amber-900 mt-0.5 sm:mt-1">
              ₹{moneyBorrowed.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-[11px] text-amber-700 mt-0.5">Liabilities to repay</p>
          </div>
        </div>

        {/* Active Accounts */}
        <div className="bg-cyan-50/70 border border-cyan-200/70 p-3 sm:p-5 rounded-2xl shadow-2xs flex flex-col justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-cyan-800">Active Accounts</p>
            <p className="text-base sm:text-xl font-bold font-heading text-cyan-900 mt-0.5 sm:mt-1">
              {accounts.filter((a) => a.is_active).length}
            </p>
            <p className="text-[10px] sm:text-[11px] text-cyan-700 mt-0.5">Managed deposit locations</p>
          </div>
        </div>

        {/* Net Surplus / Deficit (Spans full 2 cols on mobile when needed, or fits 2x2 nicely) */}
        <div
          className={`p-3 sm:p-5 rounded-2xl shadow-2xs flex flex-col justify-between border ${
            netSurplus >= 0
              ? 'bg-emerald-50/70 border-emerald-200/70 text-emerald-950'
              : 'bg-rose-50/70 border-rose-200/70 text-rose-950'
          }`}
        >
          <div>
            <p
              className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                netSurplus >= 0 ? 'text-emerald-800' : 'text-rose-800'
              }`}
            >
              Net Surplus / Deficit
            </p>
            <p
              className={`text-base sm:text-xl font-bold font-heading mt-0.5 sm:mt-1 ${
                netSurplus >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              ₹{netSurplus.toLocaleString()}
            </p>
            <p
              className={`text-[10px] sm:text-[11px] mt-0.5 ${
                netSurplus >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              Operational result
            </p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {/* Monthly Income vs Expense */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xs">
          <h3 className="text-sm sm:text-base font-bold font-heading text-slate-900 mb-3">
            Monthly Income vs Expenses
          </h3>
          {monthlyChartData.length > 0 ? (
            <div className="w-full h-52 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
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
            <div className="h-36 sm:h-72 flex flex-col items-center justify-center text-slate-400 text-xs sm:text-sm gap-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-4">
              <FileText className="w-8 h-8 text-slate-300" />
              <p>No monthly financial data recorded yet.</p>
            </div>
          )}
        </div>

        {/* Expense Category Breakdown */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xs">
          <h3 className="text-sm sm:text-base font-bold font-heading text-slate-900 mb-3">
            Expense Categories Breakdown
          </h3>
          {expensePieData.length > 0 ? (
            <div className="w-full h-52 sm:h-72 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensePieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    fontSize={10}
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
            <div className="h-36 sm:h-72 flex flex-col items-center justify-center text-slate-400 text-xs sm:text-sm gap-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-4">
              <FileText className="w-8 h-8 text-slate-300" />
              <p>No expense records found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
