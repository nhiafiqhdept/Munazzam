import React, { useState } from 'react';
import { Wallet, Landmark, Coins, Plus, Edit, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FinancialAccount, FinancialAccountType } from '../../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface AccountsViewProps {
  onOpenAddModal: () => void;
  onOpenEditModal: (acc: FinancialAccount) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({ onOpenAddModal, onOpenEditModal }) => {
  const { accounts, deleteAccount, incomes, expenses, transfers, loans, loanRepayments, isAdmin } = useApp();
  const [accountToDelete, setAccountToDelete] = useState<FinancialAccount | null>(null);

  const handleDeleteConfirm = () => {
    if (accountToDelete) {
      deleteAccount(accountToDelete.id);
      setAccountToDelete(null);
    }
  };

  const getAccountBalance = (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return 0;
    let bal = acc.opening_balance;
    incomes.filter((i) => i.account_id === accountId).forEach((i) => (bal += i.amount));
    expenses.filter((e) => e.account_id === accountId).forEach((e) => (bal -= e.amount));
    transfers.filter((t) => t.to_account_id === accountId).forEach((t) => (bal += t.amount));
    transfers.filter((t) => t.from_account_id === accountId).forEach((t) => (bal -= t.amount));
    loans.filter((l) => l.type === 'BORROWED' && l.account_id === accountId).forEach((l) => (bal += l.original_amount));
    loanRepayments.filter((r) => r.account_id === accountId && r.type === 'REPAY').forEach((r) => (bal -= r.amount));
    loans.filter((l) => l.type === 'LENT' && l.account_id === accountId).forEach((l) => (bal -= l.original_amount));
    loanRepayments.filter((r) => r.account_id === accountId && r.type === 'RECOVER').forEach((r) => (bal += r.amount));
    return bal;
  };

  const getAccountTypeLabel = (type: FinancialAccountType) => {
    switch (type) {
      case 'cash':
        return 'Cash in Hand';
      case 'bank':
        return 'Bank Account';
      case 'upi':
        return 'UPI / Digital';
      case 'emergency':
        return 'Emergency Fund';
      default:
        return 'Other Account';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold font-serif text-slate-900 tracking-tight">Financial Accounts</h1>
          <p className="text-sm text-slate-500 mt-1">Manage physical cash chests, bank deposits, and digital UPI ledgers.</p>
        </div>

        {isAdmin && (
          <button
            onClick={onOpenAddModal}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Account</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((acc) => {
          const currentBal = getAccountBalance(acc.id);
          return (
            <div
              key={acc.id}
              className={`bg-white rounded-3xl p-6 border shadow-xs flex flex-col justify-between transition-all ${
                acc.is_active ? 'border-slate-200 hover:border-emerald-500' : 'border-slate-200 bg-slate-50/60 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    {acc.type === 'cash' ? <Coins className="w-6 h-6" /> : <Landmark className="w-6 h-6" />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        acc.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {acc.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                    {getAccountTypeLabel(acc.type)}
                  </span>
                  <h3 className="text-lg font-bold font-serif text-slate-900 mt-0.5">{acc.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{acc.description || 'No description provided.'}</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Opening Balance:</span>
                  <span className="font-semibold text-slate-700">₹{acc.opening_balance.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 uppercase">Current Balance:</span>
                  <span className="text-xl font-bold font-serif text-emerald-700">₹{currentBal.toLocaleString()}</span>
                </div>

                {isAdmin && (
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => onOpenEditModal(acc)}
                      className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setAccountToDelete(acc)}
                      className="p-2 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <DeleteConfirmModal
        isOpen={!!accountToDelete}
        title="Delete Financial Account"
        message="Are you sure you want to delete this financial account? Accounts containing transaction history cannot be deleted (deactivate them instead)."
        itemDetails={
          accountToDelete
            ? [
                { label: 'Account Name', value: accountToDelete.name },
                { label: 'Type', value: accountToDelete.type.toUpperCase() },
                { label: 'Opening Balance', value: `₹${accountToDelete.opening_balance.toLocaleString()}` },
                { label: 'Current Balance', value: `₹${getAccountBalance(accountToDelete.id).toLocaleString()}` },
              ]
            : []
        }
        onClose={() => setAccountToDelete(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};
