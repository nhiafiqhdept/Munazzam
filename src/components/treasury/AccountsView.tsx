import React, { useState } from 'react';
import { Wallet, Landmark, Coins, Plus, Edit, Trash2, Smartphone, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FinancialAccount, FinancialAccountType } from '../../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface AccountsViewProps {
  onOpenAddModal: () => void;
  onOpenEditModal: (acc: FinancialAccount) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({ onOpenAddModal, onOpenEditModal }) => {
  const { accounts, deleteAccount, incomes, expenses, transfers, isAdmin } = useApp();
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

  const getAccountTheme = (type: FinancialAccountType) => {
    switch (type) {
      case 'cash':
        return {
          bgIcon: 'bg-emerald-100 text-emerald-800',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          cardAccent: 'hover:border-emerald-400 bg-gradient-to-br from-white via-white to-emerald-50/30',
          balanceColor: 'text-emerald-700',
        };
      case 'bank':
        return {
          bgIcon: 'bg-blue-100 text-blue-800',
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          cardAccent: 'hover:border-blue-400 bg-gradient-to-br from-white via-white to-blue-50/30',
          balanceColor: 'text-blue-700',
        };
      case 'upi':
        return {
          bgIcon: 'bg-indigo-100 text-indigo-800',
          badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          cardAccent: 'hover:border-indigo-400 bg-gradient-to-br from-white via-white to-indigo-50/30',
          balanceColor: 'text-indigo-700',
        };
      case 'emergency':
        return {
          bgIcon: 'bg-amber-100 text-amber-800',
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          cardAccent: 'hover:border-amber-400 bg-gradient-to-br from-white via-white to-amber-50/30',
          balanceColor: 'text-amber-700',
        };
      default:
        return {
          bgIcon: 'bg-slate-100 text-slate-800',
          badge: 'bg-slate-50 text-slate-700 border-slate-200',
          cardAccent: 'hover:border-slate-400 bg-gradient-to-br from-white via-white to-slate-50/30',
          balanceColor: 'text-slate-700',
        };
    }
  };

  const getAccountIcon = (type: FinancialAccountType) => {
    switch (type) {
      case 'cash':
        return <Coins className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'bank':
        return <Landmark className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'upi':
        return <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'emergency':
        return <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />;
      default:
        return <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />;
    }
  };

  return (
    <div className="space-y-3 sm:space-y-5">
      {/* Compact Financial Accounts Header (No description, minimal padding) */}
      <div className="flex items-center justify-between gap-3 bg-white px-4 py-3 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <h1 className="text-lg sm:text-2xl font-bold font-heading text-slate-900 tracking-tight">Financial Accounts</h1>

        {isAdmin && (
          <button
            onClick={onOpenAddModal}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Account</span>
          </button>
        )}
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
        {accounts.map((acc) => {
          const currentBal = getAccountBalance(acc.id);
          const theme = getAccountTheme(acc.type);
          return (
            <div
              key={acc.id}
              className={`rounded-2xl p-3.5 sm:p-4 border shadow-2xs flex flex-col justify-between transition-all ${theme.cardAccent} ${
                acc.is_active ? 'border-slate-200' : 'border-slate-200 bg-slate-50/60 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${theme.bgIcon}`}>
                    {getAccountIcon(acc.type)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${theme.badge}`}>
                      {getAccountTypeLabel(acc.type)}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        acc.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {acc.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5">
                  <h3 className="text-sm sm:text-base font-bold font-heading text-slate-900 break-words">{acc.name}</h3>
                  {acc.description && (
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 leading-relaxed">{acc.description}</p>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Opening:</span>
                  <span className="font-semibold text-slate-700">₹{acc.opening_balance.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Current Balance:</span>
                  <span className={`text-base sm:text-lg font-bold font-heading ${theme.balanceColor}`}>₹{currentBal.toLocaleString()}</span>
                </div>

                {isAdmin && (
                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-50/80">
                    <button
                      onClick={() => onOpenEditModal(acc)}
                      className="px-2.5 py-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setAccountToDelete(acc)}
                      className="px-2.5 py-1 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
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
