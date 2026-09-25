import React, { useState, useEffect } from 'react';
import { BookOpen, Wallet, Coins, Calendar, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const CashBookView: React.FC = () => {
  const { accounts, incomes, expenses, transfers } = useApp();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  useEffect(() => {
    if (accounts.length > 0 && (!selectedAccountId || !accounts.some((a) => a.id === selectedAccountId))) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  // Build chronological ledger for selected account
  interface BookEntry {
    id: string;
    date: string;
    description: string;
    receipt: number; // money in
    payment: number; // money out
    balance: number;
  }

  const entries: BookEntry[] = [];

  if (selectedAccount) {
    const accId = selectedAccount.id;

    // Collect all movements affecting this account
    const movements: { date: string; description: string; inAmt: number; outAmt: number; id: string }[] = [];

    incomes
      .filter((i) => i.account_id === accId)
      .forEach((i) => {
        movements.push({
          id: i.id,
          date: i.date,
          description: `Income: ${i.category} (${i.source})`,
          inAmt: i.amount,
          outAmt: 0,
        });
      });

    expenses
      .filter((e) => e.account_id === accId)
      .forEach((e) => {
        movements.push({
          id: e.id,
          date: e.date,
          description: `Expense: ${e.category} (${e.paid_to})`,
          inAmt: 0,
          outAmt: e.amount,
        });
      });

    transfers
      .filter((t) => t.to_account_id === accId)
      .forEach((t) => {
        const fromAccName = accounts.find((a) => a.id === t.from_account_id)?.name || 'Account';
        movements.push({
          id: t.id,
          date: t.date,
          description: `Transfer In from ${fromAccName}`,
          inAmt: t.amount,
          outAmt: 0,
        });
      });

    transfers
      .filter((t) => t.from_account_id === accId)
      .forEach((t) => {
        const toAccName = accounts.find((a) => a.id === t.to_account_id)?.name || 'Account';
        movements.push({
          id: t.id,
          date: t.date,
          description: `Transfer Out to ${toAccName}`,
          inAmt: 0,
          outAmt: t.amount,
        });
      });

    // Sort chronologically
    movements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let bal = selectedAccount.opening_balance;
    movements.forEach((m) => {
      bal = bal + m.inAmt - m.outAmt;
      entries.push({
        id: m.id,
        date: m.date,
        description: m.description,
        receipt: m.inAmt,
        payment: m.outAmt,
        balance: bal,
      });
    });
  }

  const closingBalance = entries.length > 0 ? entries[entries.length - 1].balance : selectedAccount?.opening_balance || 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Compact Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 tracking-tight">Account Cash & Bank Books</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
            Chronological ledger with automated running balance.
          </p>
        </div>

        <select
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
        >
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name} ({acc.type.toUpperCase()})
            </option>
          ))}
        </select>
      </div>

      {/* Colorful Selected Account Summary Card */}
      {selectedAccount && (
        <div className="bg-gradient-to-br from-emerald-50/80 via-white to-white p-4 sm:p-5 rounded-2xl border border-emerald-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
              <Coins className="w-3.5 h-3.5" />
              <span>Selected Account Summary</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold font-heading text-slate-900">{selectedAccount.name}</h3>
            <p className="text-xs text-slate-500 font-medium">
              Opening Balance: <span className="text-slate-700 font-semibold">₹{selectedAccount.opening_balance.toLocaleString()}</span>
            </p>
          </div>
          <div className="sm:text-right bg-white/80 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-emerald-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Current Closing Balance</span>
            <p className="text-xl sm:text-2xl font-bold font-heading text-emerald-700 mt-0.5">
              ₹{closingBalance.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Mobile Card List View (< md) */}
      <div className="block md:hidden space-y-3">
        {/* Compact Opening Balance Card */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-500">Opening Balance Entry</span>
          <span className="text-slate-900 font-bold">₹{selectedAccount?.opening_balance.toLocaleString()}</span>
        </div>

        {entries.length > 0 ? (
          entries.map((en) => (
            <div key={en.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {en.date}
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 break-words">{en.description}</h4>
                </div>
                {en.receipt > 0 ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] shrink-0 flex items-center gap-1">
                    <ArrowDownLeft className="w-3 h-3" />
                    Receipt
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 font-bold text-[10px] shrink-0 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" />
                    Payment
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    {en.receipt > 0 ? 'Receipt Amount' : 'Payment Amount'}
                  </span>
                  <span
                    className={`font-bold text-sm ${
                      en.receipt > 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {en.receipt > 0 ? `+₹${en.receipt.toLocaleString()}` : `-₹${en.payment.toLocaleString()}`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Running Balance</span>
                  <span className="font-bold text-sm text-slate-900">₹{en.balance.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs shadow-2xs">
            No transactions recorded for this account.
          </div>
        )}
      </div>

      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description / Particulars</th>
                <th className="py-3 px-4 text-right">Receipt (In+)</th>
                <th className="py-3 px-4 text-right">Payment (Out-)</th>
                <th className="py-3 px-4 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              <tr className="bg-slate-50/50 font-semibold">
                <td className="py-3 px-4">—</td>
                <td className="py-3 px-4 text-slate-700 font-bold">Opening Balance</td>
                <td className="py-3 px-4 text-right">—</td>
                <td className="py-3 px-4 text-right">—</td>
                <td className="py-3 px-4 text-right font-bold text-slate-900">₹{selectedAccount?.opening_balance.toLocaleString()}</td>
              </tr>
              {entries.length > 0 ? (
                entries.map((en) => (
                  <tr key={en.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap">{en.date}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{en.description}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-700">
                      {en.receipt > 0 ? `+₹${en.receipt.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-rose-700">
                      {en.payment > 0 ? `-₹${en.payment.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">₹{en.balance.toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No transactions recorded for this account.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
