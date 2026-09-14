import React, { useState } from 'react';
import { ArrowLeftRight, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AccountTransfer } from '../../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface TransfersViewProps {
  onOpenAddTransfer: () => void;
}

export const TransfersView: React.FC<TransfersViewProps> = ({ onOpenAddTransfer }) => {
  const { transfers, accounts, deleteTransfer, isAdmin } = useApp();
  const [itemToDelete, setItemToDelete] = useState<AccountTransfer | null>(null);

  const handleDeleteConfirm = () => {
    if (itemToDelete) {
      deleteTransfer(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">Account Transfers</h1>
          <p className="text-sm text-slate-500 mt-1">Move funds between organization accounts without affecting income or expenses.</p>
        </div>

        {isAdmin && (
          <button
            onClick={onOpenAddTransfer}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Transfer</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">From Account</th>
                <th className="py-3 px-4">To Account</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {transfers.length > 0 ? (
                transfers.map((tr) => {
                  const fromAcc = accounts.find((a) => a.id === tr.from_account_id);
                  const toAcc = accounts.find((a) => a.id === tr.to_account_id);
                  return (
                    <tr key={tr.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap">{tr.date}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{fromAcc?.name || 'Unknown'}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{toAcc?.name || 'Unknown'}</td>
                      <td className="py-3.5 px-4 text-slate-600">{tr.description || '—'}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 text-sm">₹{tr.amount.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-center">
                        {isAdmin && (
                          <button
                            onClick={() => setItemToDelete(tr)}
                            className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Transfer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No account transfers recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={!!itemToDelete}
        title="Delete Account Transfer"
        message="Are you sure you want to delete this account transfer? Both source and destination account balances will be restored to their pre-transfer states."
        itemDetails={
          itemToDelete
            ? [
                { label: 'From Account', value: accounts.find((a) => a.id === itemToDelete.from_account_id)?.name || 'Unknown' },
                { label: 'To Account', value: accounts.find((a) => a.id === itemToDelete.to_account_id)?.name || 'Unknown' },
                { label: 'Amount', value: `₹${itemToDelete.amount.toLocaleString()}` },
                { label: 'Date', value: itemToDelete.date },
              ]
            : []
        }
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};
