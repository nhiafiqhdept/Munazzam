import React, { useState, useEffect } from 'react';
import { BookOpen, Wallet, Coins } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const CashBookView: React.FC = () => {
  const { accounts, incomes, expenses, transfers, loans, loanRepayments } = useApp();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  useEffect(() => {
    if (accounts.length > 0 && (!selectedAccountId || !accounts.some((a) => a.id === selectedAccountId))) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  // Build chronological ledger for selected account
  let runningBalance = selectedAccount ? selectedAccount.opening_balance : 0;

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

    loans
      .filter((l) => l.type === 'BORROWED' && l.account_id === accId)
      .forEach((l) => {
        movements.push({
          id: l.id,
          date: l.date,
          description: `Loan Borrowed from ${l.person_or_organization}`,
          inAmt: l.original_amount,
          outAmt: 0,
        });
      });

    loanRepayments
      .filter((r) => r.account_id === accId && r.type === 'REPAY')
      .forEach((r) => {
        movements.push({
          id: r.id,
          date: r.date,
          description: `Loan Repayment`,
          inAmt: 0,
          outAmt: r.amount,
        });
      });

    loans
      .filter((l) => l.type === 'LENT' && l.account_id === accId)
      .forEach((l) => {
        movements.push({
          id: l.id,
          date: l.date,
          description: `Money Lent to ${l.person_or_organization}`,
          inAmt: 0,
          outAmt: l.original_amount,
        });
      });

    loanRepayments
      .filter((r) => r.account_id === accId && r.type === 'RECOVER')
      .forEach((r) => {
        movements.push({
          id: r.id,
          date: r.date,
          description: `Loan Recovery`,
          inAmt: r.amount,
          outAmt: 0,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold font-serif text-slate-900 tracking-tight">Account Cash & Bank Books</h1>
          <p className="text-sm text-slate-500 mt-1">Chronological ledger with automated running balance for each account.</p>
        </div>

        <select
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
        >
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name} ({acc.type.toUpperCase()})
            </option>
          ))}
        </select>
      </div>

      {selectedAccount && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-700 uppercase">Selected Account</span>
            <h3 className="text-lg font-bold font-serif text-slate-900">{selectedAccount.name}</h3>
            <p className="text-xs text-slate-500">Opening Balance: ₹{selectedAccount.opening_balance.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500 uppercase">Current Closing Balance</span>
            <p className="text-2xl font-bold font-serif text-emerald-700">
              ₹{(entries.length > 0 ? entries[entries.length - 1].balance : selectedAccount.opening_balance).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
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
                  <td colSpan={5} className="py-10 text-center text-slate-400">
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
