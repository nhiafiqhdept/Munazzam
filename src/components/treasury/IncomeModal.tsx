import React, { useState, useEffect } from 'react';
import { X, ArrowDownLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Income } from '../../types';
import { CustomOptionField } from '../common/CustomOptionField';
import { DEFAULT_INCOME_CATEGORIES, resolveCustomSelectState } from '../../utils/customOptionUtils';

interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedProgramId?: string;
  incomeToEdit?: Income | null;
}

export const IncomeModal: React.FC<IncomeModalProps> = ({ isOpen, onClose, preselectedProgramId, incomeToEdit }) => {
  const { accounts, programs, addIncome, updateIncome } = useApp();
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [category, setCategory] = useState<string>('Donation');
  const [customCategory, setCustomCategory] = useState('');
  const [source, setSource] = useState('');
  const [description, setDescription] = useState('');
  const [programId, setProgramId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync selected account and category when modal opens or accounts/incomeToEdit change
  useEffect(() => {
    if (isOpen) {
      if (incomeToEdit) {
        setDate(incomeToEdit.date || new Date().toISOString().substring(0, 10));
        setAmount(incomeToEdit.amount ? incomeToEdit.amount.toString() : '');
        setAccountId(incomeToEdit.account_id || (accounts.length > 0 ? accounts[0].id : ''));
        
        // Resolve custom category state
        const resolved = resolveCustomSelectState(
          incomeToEdit.category,
          incomeToEdit.raw_category,
          incomeToEdit.custom_category,
          DEFAULT_INCOME_CATEGORIES
        );
        setCategory(resolved.selected);
        setCustomCategory(resolved.custom);

        setSource(incomeToEdit.source || '');
        setDescription(incomeToEdit.description || '');
        setProgramId(incomeToEdit.program_id || '');
        setReferenceNumber(incomeToEdit.reference_number || '');
      } else {
        setDate(new Date().toISOString().substring(0, 10));
        setAmount('');
        if (accounts.length > 0 && (!accountId || !accounts.some((a) => a.id === accountId))) {
          setAccountId(accounts[0].id);
        }
        setCategory('Donation');
        setCustomCategory('');
        setSource('');
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
  }, [isOpen, incomeToEdit, accounts, preselectedProgramId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanSource = source.trim();
    const parsedAmount = parseFloat(amount);

    if (!cleanSource) {
      setError('Please fill in source / received from name.');
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
      if (incomeToEdit) {
        await updateIncome({
          id: incomeToEdit.id,
          account_id: accountId,
          category: effectiveCategory,
          raw_category: isCustom ? 'Other' : category,
          custom_category: isCustom ? customCategory.trim() : undefined,
          program_id: programId || undefined,
          date,
          amount: parsedAmount,
          source: cleanSource,
          description: description.trim() || undefined,
          reference_number: referenceNumber.trim() || undefined,
        });
      } else {
        await addIncome({
          account_id: accountId,
          category: effectiveCategory,
          raw_category: isCustom ? 'Other' : category,
          custom_category: isCustom ? customCategory.trim() : undefined,
          program_id: programId || undefined,
          date,
          amount: parsedAmount,
          source: cleanSource,
          description: description.trim() || undefined,
          reference_number: referenceNumber.trim() || undefined,
          created_by: 'Treasurer',
        });
      }

      // Reset transient fields
      setSource('');
      setAmount('');
      setDescription('');
      setReferenceNumber('');
      setCustomCategory('');
      onClose();
    } catch (err: any) {
      console.error('Save Income Error:', err);
      setError(err?.message || 'Failed to save income record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-slate-900">
                {incomeToEdit ? 'Edit Income Record' : 'Record Income'}
              </h3>
              <p className="text-xs text-slate-500">
                {incomeToEdit ? 'Update income transaction details' : 'Add donation, sponsorship, or grant'}
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
                placeholder="e.g. 5000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Received Into Account *</label>
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
                {DEFAULT_INCOME_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {category === 'Other' && (
            <CustomOptionField
              id="income-custom-category-input"
              label="Enter Custom Category *"
              value={customCategory}
              onChange={setCustomCategory}
              placeholder="e.g. Workshop Sponsorship, Endowment Fund, Book Sale..."
              required
              autoFocus
            />
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Source / Received From *</label>
            <input
              type="text"
              required
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. Al-Barakah Foundation or Donor Name"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reference No / Receipt Ref</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. REC-102"
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
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? 'Saving...' : incomeToEdit ? 'Save Changes' : 'Save Income'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
