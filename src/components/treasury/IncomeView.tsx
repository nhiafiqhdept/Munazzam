import React, { useState } from 'react';
import { ArrowDownLeft, Plus, Search, Filter, Calendar, FileText, Trash2, Eye } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Income } from '../../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface IncomeViewProps {
  onOpenAddModal: () => void;
  onViewTransaction: (type: 'income', item: Income) => void;
}

export const IncomeView: React.FC<IncomeViewProps> = ({ onOpenAddModal, onViewTransaction }) => {
  const { incomes, accounts, programs, deleteIncome, isAdmin } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedAccount, setSelectedAccount] = useState('ALL');
  const [itemToDelete, setItemToDelete] = useState<Income | null>(null);

  const categories = Array.from(new Set(incomes.map((i) => i.category)));

  const filteredIncomes = incomes.filter((inc) => {
    const matchesSearch =
      inc.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || inc.category === selectedCategory;
    const matchesAcc = selectedAccount === 'ALL' || inc.account_id === selectedAccount;
    return matchesSearch && matchesCat && matchesAcc;
  });

  const totalFilteredIncome = filteredIncomes.reduce((sum, i) => sum + i.amount, 0);

  const handleDeleteConfirm = () => {
    if (itemToDelete) {
      deleteIncome(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">Income Records</h1>
          <p className="text-sm text-slate-500 mt-1">Track all donations, sponsorships, registrations, and grants received.</p>
        </div>

        {isAdmin && (
          <button
            onClick={onOpenAddModal}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Income</span>
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by source, description, ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">All Accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>

          <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">
            Total: <span className="text-emerald-700 font-bold">₹{totalFilteredIncome.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Income Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Source / Received From</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4">Program</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredIncomes.length > 0 ? (
                filteredIncomes.map((inc) => {
                  const acc = accounts.find((a) => a.id === inc.account_id);
                  const prog = programs.find((p) => p.id === inc.program_id);
                  return (
                    <tr key={inc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap">{inc.date}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {inc.source}
                        {inc.reference_number && (
                          <span className="block text-[10px] text-slate-400 font-normal">Ref: {inc.reference_number}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-semibold text-[10px]">
                          {inc.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{acc?.name || 'Unknown Account'}</td>
                      <td className="py-3.5 px-4 text-slate-500">{prog?.name || '—'}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-700 text-sm">
                        +₹{inc.amount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onViewTransaction('income', inc)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setItemToDelete(inc)}
                              className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No income records match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={!!itemToDelete}
        title="Delete Income Record"
        message="Are you sure you want to delete this income record? The associated account balance will be automatically reduced."
        itemDetails={
          itemToDelete
            ? [
                { label: 'Source', value: itemToDelete.source },
                { label: 'Amount', value: `+₹${itemToDelete.amount.toLocaleString()}` },
                { label: 'Date', value: itemToDelete.date },
                { label: 'Category', value: itemToDelete.category },
                { label: 'Account', value: accounts.find((a) => a.id === itemToDelete.account_id)?.name || 'Unknown' },
              ]
            : []
        }
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};
