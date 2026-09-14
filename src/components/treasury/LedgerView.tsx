import React, { useState } from 'react';
import { FileText, Search, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Landmark } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const LedgerView: React.FC = () => {
  const { incomes, expenses, transfers, loans, loanRepayments, accounts, programs } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  // Combine all financial movements into a unified ledger list
  const ledgerItems = [
    ...incomes.map((i) => ({
      id: i.id,
      date: i.date,
      type: 'Income' as const,
      description: `${i.category} from ${i.source} (${i.description || ''})`,
      accountName: accounts.find((a) => a.id === i.account_id)?.name || 'Unknown',
      amount: i.amount,
      amountFormatted: `+₹${i.amount.toLocaleString()}`,
      badgeColor: 'bg-emerald-100 text-emerald-800',
    })),
    ...expenses.map((e) => ({
      id: e.id,
      date: e.date,
      type: 'Expense' as const,
      description: `${e.category} paid to ${e.paid_to} (${e.description || ''})`,
      accountName: accounts.find((a) => a.id === e.account_id)?.name || 'Unknown',
      amount: e.amount,
      amountFormatted: `-₹${e.amount.toLocaleString()}`,
      badgeColor: 'bg-rose-100 text-rose-800',
    })),
    ...transfers.map((t) => {
      const fromAcc = accounts.find((a) => a.id === t.from_account_id)?.name || '';
      const toAcc = accounts.find((a) => a.id === t.to_account_id)?.name || '';
      return {
        id: t.id,
        date: t.date,
        type: 'Transfer' as const,
        description: `Transfer from ${fromAcc} to ${toAcc} (${t.description || ''})`,
        accountName: `${fromAcc} → ${toAcc}`,
        amount: t.amount,
        amountFormatted: `₹${t.amount.toLocaleString()}`,
        badgeColor: 'bg-slate-200 text-slate-800',
      };
    }),
    ...loans.map((l) => ({
      id: l.id,
      date: l.date,
      type: l.type === 'BORROWED' ? ('Loan Borrowed' as const) : ('Money Lent' as const),
      description: `${l.purpose} (${l.person_or_organization})`,
      accountName: accounts.find((a) => a.id === l.account_id)?.name || 'Unknown',
      amount: l.original_amount,
      amountFormatted: `₹${l.original_amount.toLocaleString()}`,
      badgeColor: l.type === 'BORROWED' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800',
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredLedger = ledgerItems.filter((item) => {
    const matchesSearch =
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.accountName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'ALL' || item.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <h1 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">Central Financial Transactions Ledger</h1>
        <p className="text-sm text-slate-500 mt-1">Chronological audit trail of all money movements across accounts.</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search ledger description or account..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">All Transaction Types</option>
            <option value="Income">Income</option>
            <option value="Expense">Expense</option>
            <option value="Transfer">Transfer</option>
            <option value="Loan Borrowed">Loan Borrowed</option>
            <option value="Money Lent">Money Lent</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Transaction Type</th>
                <th className="py-3 px-4">Description / Particulars</th>
                <th className="py-3 px-4">Account(s)</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLedger.length > 0 ? (
                filteredLedger.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap">{item.date}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${item.badgeColor}`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{item.description}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">{item.accountName}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 text-sm">{item.amountFormatted}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No transactions found in ledger.
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
