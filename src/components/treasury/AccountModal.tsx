import React, { useState, useEffect } from 'react';
import { X, Wallet } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FinancialAccount, FinancialAccountType } from '../../types';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingAccount?: FinancialAccount | null;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, editingAccount }) => {
  const { addAccount, updateAccount } = useApp();
  const [name, setName] = useState('');
  const [type, setType] = useState<FinancialAccountType>('bank');
  const [openingBalance, setOpeningBalance] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingAccount) {
      setName(editingAccount.name);
      setType(editingAccount.type);
      setOpeningBalance(editingAccount.opening_balance.toString());
      setDescription(editingAccount.description || '');
      setIsActive(editingAccount.is_active);
    } else {
      setName('');
      setType('bank');
      setOpeningBalance('0');
      setDescription('');
      setIsActive(true);
    }
  }, [editingAccount, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Account name is required.');
      return;
    }

    if (editingAccount) {
      updateAccount({
        id: editingAccount.id,
        name: name.trim(),
        type,
        opening_balance: Number(openingBalance) || 0,
        description: description.trim() || undefined,
        is_active: isActive,
      });
    } else {
      addAccount({
        name: name.trim(),
        type,
        opening_balance: Number(openingBalance) || 0,
        description: description.trim() || undefined,
        is_active: isActive,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-slate-900">
                {editingAccount ? 'Edit Account' : 'Add Financial Account'}
              </h3>
              <p className="text-xs text-slate-500">Configure deposit chest or bank account</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Account Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. State Bank Current A/C"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as FinancialAccountType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option value="cash">Cash in Hand</option>
                <option value="bank">Bank Account</option>
                <option value="upi">UPI / Digital</option>
                <option value="emergency">Emergency Fund</option>
                <option value="other">Other Account</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Balance (₹)</label>
              <input
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Account details or bank branch info..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <label htmlFor="isActive" className="text-xs font-semibold text-slate-700">
              Account is Active
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              {editingAccount ? 'Update Account' : 'Save Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
