import React, { useState, useEffect } from 'react';
import { X, Landmark, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LoanType } from '../../types';

interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoanModal: React.FC<LoanModalProps> = ({ isOpen, onClose }) => {
  const { accounts, addLoan } = useApp();
  const [type, setType] = useState<LoanType>('BORROWED');
  const [personOrOrg, setPersonOrOrg] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [accountId, setAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize account ID when modal opens or when accounts list changes
  useEffect(() => {
    if (isOpen) {
      if (accounts.length > 0 && (!accountId || !accounts.some((a) => a.id === accountId))) {
        setAccountId(accounts[0].id);
      }
      setError('');
      setSuccessMessage('');
    }
  }, [isOpen, accounts]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const cleanPersonOrOrg = personOrOrg.trim();
    const cleanPurpose = purpose.trim();
    const parsedAmount = parseFloat(amount);

    if (!cleanPersonOrOrg) {
      setError('Please enter the person or organization.');
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    if (!accountId || !accounts.some((a) => a.id === accountId)) {
      setError('Please select an account.');
      return;
    }

    if (!cleanPurpose) {
      setError('Please enter the purpose.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addLoan({
        type,
        person_or_organization: cleanPersonOrOrg,
        original_amount: parsedAmount,
        date,
        due_date: dueDate || undefined,
        purpose: cleanPurpose,
        account_id: accountId,
        description: description.trim() || undefined,
        created_by: 'Treasurer',
      });

      setSuccessMessage('Loan recorded successfully.');

      // Reset transient fields
      setPersonOrOrg('');
      setAmount('');
      setPurpose('');
      setDescription('');
      setDueDate('');

      setTimeout(() => {
        setIsSubmitting(false);
        setSuccessMessage('');
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Save Loan Error:', err);
      setError(err?.message || 'Failed to save loan record.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-slate-900">Add Loan or Advance</h3>
              <p className="text-xs text-slate-500">Record money borrowed or lent out</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">{error}</div>}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Loan Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as LoanType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                <option value="BORROWED">Money Borrowed (Payable)</option>
                <option value="LENT">Money Lent (Receivable)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account *</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                {!accountId && <option value="">-- Select Account --</option>}
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {type === 'BORROWED' ? 'Borrowed From (Person/Org) *' : 'Lent To (Person/Org) *'}
            </label>
            <input
              type="text"
              required
              value={personOrOrg}
              onChange={(e) => setPersonOrOrg(e.target.value)}
              placeholder="e.g. NSU or Abdullah"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Original Amount (₹) *</label>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date (Optional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose *</label>
              <input
                type="text"
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. berde"
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
              placeholder="Additional loan terms..."
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
              className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? 'Saving...' : 'Save Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

