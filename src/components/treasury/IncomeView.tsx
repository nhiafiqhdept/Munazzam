import React, { useState } from 'react';
import { ArrowDownLeft, Plus, Search, Filter, Calendar, FileText, Trash2, Edit, Building2, Tag, RotateCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Income } from '../../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { TreasuryMonthFilter } from './TreasuryMonthFilter';
import { 
  TreasuryDateFilter, 
  getDefaultMonthKey, 
  matchTreasuryDateFilter, 
  sortByDateDesc,
  formatMonthLabel 
} from './treasuryDateUtils';

interface IncomeViewProps {
  onOpenAddModal: () => void;
  onOpenEditModal: (item: Income) => void;
}

export const IncomeView: React.FC<IncomeViewProps> = ({ onOpenAddModal, onOpenEditModal }) => {
  const { incomes, accounts, programs, deleteIncome, isAdmin } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedAccount, setSelectedAccount] = useState('ALL');
  const [itemToDelete, setItemToDelete] = useState<Income | null>(null);

  // Month and Date-based filter state
  const [dateFilter, setDateFilter] = useState<TreasuryDateFilter>({
    selectedMonth: getDefaultMonthKey(),
    dateFilterType: 'ALL',
    specificDate: '',
    startDate: '',
    endDate: '',
  });

  const categories = Array.from(new Set(incomes.map((i) => i.category)));

  // Filter and sort newest transactions first
  const dateFiltered = incomes.filter((inc) => matchTreasuryDateFilter(inc.date, dateFilter));
  const filteredIncomes = sortByDateDesc(
    dateFiltered.filter((inc) => {
      const matchesSearch =
        inc.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inc.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = selectedCategory === 'ALL' || inc.category === selectedCategory;
      const matchesAcc = selectedAccount === 'ALL' || inc.account_id === selectedAccount;
      return matchesSearch && matchesCat && matchesAcc;
    })
  );

  const totalFilteredIncome = filteredIncomes.reduce((sum, i) => sum + i.amount, 0);

  const handleDeleteConfirm = () => {
    if (itemToDelete) {
      deleteIncome(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  const handleResetToAllMonths = () => {
    setDateFilter({
      selectedMonth: 'ALL',
      dateFilterType: 'ALL',
      specificDate: '',
      startDate: '',
      endDate: '',
    });
    setSearchTerm('');
    setSelectedCategory('ALL');
    setSelectedAccount('ALL');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Compact Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 tracking-tight">Income Records</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
            Track all donations, sponsorships, registrations, and grants received.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={onOpenAddModal}
            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Income</span>
          </button>
        )}
      </div>

      {/* Month-Wise and Date-Based Filter with Monthly Summary */}
      <TreasuryMonthFilter
        filter={dateFilter}
        onChangeFilter={setDateFilter}
        highlightSection="income"
      />

      {/* Redesigned Search & Category/Account Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search source, description, ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800"
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

          <div className="w-full sm:w-auto text-xs font-semibold text-slate-600 bg-emerald-50/80 border border-emerald-100 px-3 py-2 rounded-xl flex items-center justify-between sm:justify-start gap-2">
            <span>Total:</span>
            <span className="text-emerald-700 font-bold text-sm">₹{totalFilteredIncome.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Mobile Card List (Visible below md) */}
      <div className="block md:hidden space-y-3">
        {filteredIncomes.length > 0 ? (
          filteredIncomes.map((inc) => {
            const acc = accounts.find((a) => a.id === inc.account_id);
            const prog = programs.find((p) => p.id === inc.program_id);
            return (
              <div key={inc.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {inc.date}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 break-words">{inc.source}</h3>
                    {inc.reference_number && (
                      <span className="text-[10px] text-slate-400 font-normal">Ref: {inc.reference_number}</span>
                    )}
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-semibold text-[10px] shrink-0">
                    {inc.category}
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
                    <span className="text-base font-bold text-emerald-700">+₹{inc.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenEditModal(inc)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => setItemToDelete(inc)}
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
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
              <Calendar className="w-5 h-5" />
            </div>
            <p className="font-bold text-slate-800 text-sm">No Income Records Found</p>
            <p className="text-slate-500 max-w-sm mx-auto">
              {dateFilter.selectedMonth === 'ALL'
                ? 'No income transactions match your current search and filters.'
                : `No income transactions recorded for ${formatMonthLabel(dateFilter.selectedMonth)}.`}
            </p>
            {dateFilter.selectedMonth !== 'ALL' && (
              <button
                type="button"
                onClick={handleResetToAllMonths}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>View All Months</span>
              </button>
            )}
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
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => onOpenEditModal(inc)}
                                className="px-2.5 py-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                title="Edit"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => setItemToDelete(inc)}
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
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    <p className="font-bold text-slate-800 text-sm mb-1">No Income Records Found</p>
                    <p className="text-slate-500 mb-3">
                      {dateFilter.selectedMonth === 'ALL'
                        ? 'No income transactions match your current search and filters.'
                        : `No income transactions recorded for ${formatMonthLabel(dateFilter.selectedMonth)}.`}
                    </p>
                    {dateFilter.selectedMonth !== 'ALL' && (
                      <button
                        type="button"
                        onClick={handleResetToAllMonths}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>View All Months</span>
                      </button>
                    )}
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
