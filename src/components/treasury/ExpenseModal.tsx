import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Expense } from '../../types';
import { CustomOptionField } from '../common/CustomOptionField';
import { DEFAULT_EXPENSE_CATEGORIES, resolveCustomSelectState } from '../../utils/customOptionUtils';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedProgramId?: string;
  expenseToEdit?: Expense | null;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose, preselectedProgramId, expenseToEdit }) => {
  const { accounts, programs, addExpense, updateExpense } = useApp();
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [category, setCategory] = useState<string>('Food');
  const [customCategory, setCustomCategory] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [description, setDescription] = useState('');
  const [programId, setProgramId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync selected account when modal opens or accounts/expenseToEdit change
  useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        setDate(expenseToEdit.date || new Date().toISOString().substring(0, 10));
        setAmount(expenseToEdit.amount ? expenseToEdit.amount.toString() : '');
        setAccountId(expenseToEdit.account_id || (accounts.length > 0 ? accounts[0].id : ''));
        
        // Resolve custom category state
        const resolved = resolveCustomSelectState(
          expenseToEdit.category,
          expenseToEdit.raw_category,
          expenseToEdit.custom_category,
          DEFAULT_EXPENSE_CATEGORIES
        );
        setCategory(resolved.selected);
        setCustomCategory(resolved.custom);

        setPaidTo(expenseToEdit.paid_to || '');
        setDescription(expenseToEdit.description || '');
        setProgramId(expenseToEdit.program_id || '');
        setReferenceNumber(expenseToEdit.reference_number || '');
      } else {
        setDate(new Date().toISOString().substring(0, 10));
        setAmount('');
        if (accounts.length > 0 && (!accountId || !accounts.some((a) => a.id === accountId))) {
          setAccountId(accounts[0].id);
        }
        setCategory('Food');
        setCustomCategory('');
        setPaidTo('');
        setDescription('');
        if (preselectedProgramId) {
          setProgramId(preselectedProgramId);
        } else {
          setProgramId('');
        }
        setReferenceNumber('');
      }
      setError('');
    }
  }, [isOpen, expenseToEdit, accounts, preselectedProgramId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPaidTo = paidTo.trim();
    const parsedAmount = parseFloat(amount);

    if (!cleanPaidTo) {
      setError('Please enter payee / paid to name.');
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (!accountId || !accounts.some((a) => a.id === accountId)) {
      setError('Please select a valid account.');
      return;
    }

    if (category === 'Other' && !customCategory.trim()) {
      setError('Please enter a custom category name.');
      return;
    }

    const isCustom = category === 'Other';
    const effectiveCategory = isCustom ? customCategory.trim() : category;

    setIsSubmitting(true);
    try {
      if (expenseToEdit) {
        await updateExpense({
          id: expenseToEdit.id,
          account_id: accountId,
          category: effectiveCategory,
          raw_category: isCustom ? 'Other' : category,
          custom_category: isCustom ? customCategory.trim() : undefined,
          program_id: programId || undefined,
          date,
          amount: parsedAmount,
          paid_to: cleanPaidTo,
          description: description.trim() || undefined,
          reference_number: referenceNumber.trim() || undefined,
        });
      } else {
        await addExpense({
          account_id: accountId,
          category: effectiveCategory,
          raw_category: isCustom ? 'Other' : category,
          custom_category: isCustom ? customCategory.trim() : undefined,
          program_id: programId || undefined,
          date,
          amount: parsedAmount,
          paid_to: cleanPaidTo,
          description: description.trim() || undefined,
          reference_number: referenceNumber.trim() || undefined,
          created_by: 'Treasurer',
        });
      }

      // Reset transient fields
      setPaidTo('');
      setAmount('');
      setDescription('');
      setReferenceNumber('');
      setCustomCategory('');
      onClose();
    } catch (err: any) {
      console.error('Save Expense Error:', err);
      setError(err?.message || 'Failed to save expense record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-slate-900">
                {expenseToEdit ? 'Edit Expense Record' : 'Record Expense'}
              </h3>
              <p className="text-xs text-slate-500">
                {expenseToEdit ? 'Update expense transaction details' : 'Log organizational spending or bills'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹) *</label>
              <input
                type="number"
                required
                step="any"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 2500"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Paid From Account *</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                {!accountId && <option key="default_acc" value="">-- Select Account --</option>}
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => {
                  const val = e.target.value;
                  setCategory(val);
                  if (val !== 'Other') {
                    setCustomCategory('');
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                {DEFAULT_EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {category === 'Other' && (
            <CustomOptionField
              id="expense-custom-category-input"
              label="Enter Custom Category *"
              value={customCategory}
              onChange={setCustomCategory}
              placeholder="e.g. Stage Lighting, Guest Momento, Security Services..."
              required
              autoFocus
            />
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Paid To / Payee *</label>
            <input
              type="text"
              required
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
              placeholder="e.g. Catering Services or Printer"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Link Program (Optional)</label>
              <select
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option key="none_prog" value="">— None —</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bill / Reference No</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. BILL-992"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Additional details..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? 'Saving...' : expenseToEdit ? 'Save Changes' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
