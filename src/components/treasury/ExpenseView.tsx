import React, { useState } from 'react';
import { ArrowUpRight, Plus, Search, Filter, Calendar, FileText, Trash2, Edit, Building2, Tag } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Expense } from '../../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface ExpenseViewProps {
  onOpenAddModal: () => void;
  onOpenEditModal: (item: Expense) => void;
}

export const ExpenseView: React.FC<ExpenseViewProps> = ({ onOpenAddModal, onOpenEditModal }) => {
  const { expenses, accounts, programs, deleteExpense, isAdmin } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedAccount, setSelectedAccount] = useState('ALL');
  const [itemToDelete, setItemToDelete] = useState<Expense | null>(null);

  const categories = Array.from(new Set(expenses.map((e) => e.category)));

  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch =
      exp.paid_to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || exp.category === selectedCategory;
    const matchesAcc = selectedAccount === 'ALL' || exp.account_id === selectedAccount;
    return matchesSearch && matchesCat && matchesAcc;
  });

  const totalFilteredExpense = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleDeleteConfirm = () => {
    if (itemToDelete) {
      deleteExpense(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Compact Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 tracking-tight">Expense Records</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
            Track all food, printing, transportation, venue, and miscellaneous spending.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={onOpenAddModal}
            className="w-full sm:w-auto px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Expense</span>
          </button>
        )}
      </div>

      {/* Redesigned Search & Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search payee, description, ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500 text-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <option key="ALL_CAT" value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <option key="ALL_ACC" value="ALL">All Accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>

          <div className="w-full sm:w-auto text-xs font-semibold text-slate-600 bg-rose-50/80 border border-rose-100 px-3 py-2 rounded-xl flex items-center justify-between sm:justify-start gap-2">
            <span>Total:</span>
            <span className="text-rose-700 font-bold text-sm">₹{totalFilteredExpense.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Mobile Card List (Visible below md) */}
      <div className="block md:hidden space-y-3">
        {filteredExpenses.length > 0 ? (
          filteredExpenses.map((exp) => {
            const acc = accounts.find((a) => a.id === exp.account_id);
            const prog = programs.find((p) => p.id === exp.program_id);
            return (
              <div key={exp.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {exp.date}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 break-words">{exp.paid_to}</h3>
                    {exp.reference_number && (
                      <span className="text-[10px] text-slate-400 font-normal">Ref: {exp.reference_number}</span>
                    )}
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 font-semibold text-[10px] shrink-0">
                    {exp.category}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Account</span>
                    <span className="font-medium text-slate-700">{acc?.name || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Program</span>
                    <span className="font-medium text-slate-700">{prog?.name || '—'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Amount</span>
                    <span className="text-base font-bold text-rose-700">-₹{exp.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenEditModal(exp)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => setItemToDelete(exp)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            No expense records match your filters.
          </div>
        )}
      </div>

      {/* Desktop Table View (Visible on md and above) */}
      <div className="hidden md:block bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Paid To / Payee</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4">Program</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((exp) => {
                  const acc = accounts.find((a) => a.id === exp.account_id);
                  const prog = programs.find((p) => p.id === exp.program_id);
                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap">{exp.date}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {exp.paid_to}
                        {exp.reference_number && (
                          <span className="block text-[10px] text-slate-400 font-normal">Ref: {exp.reference_number}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 font-semibold text-[10px]">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{acc?.name || 'Unknown Account'}</td>
                      <td className="py-3.5 px-4 text-slate-500">{prog?.name || '—'}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-rose-700 text-sm">
                        -₹{exp.amount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => onOpenEditModal(exp)}
                                className="px-2.5 py-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                title="Edit"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => setItemToDelete(exp)}
                                className="px-2.5 py-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No expense records match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={!!itemToDelete}
        title="Delete Expense Record"
        message="Are you sure you want to delete this expense record? The associated account balance will be automatically restored/increased."
        itemDetails={
          itemToDelete
            ? [
                { label: 'Payee / Paid To', value: itemToDelete.paid_to },
                { label: 'Amount', value: `-₹${itemToDelete.amount.toLocaleString()}` },
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
