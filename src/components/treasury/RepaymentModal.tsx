import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Loan } from '../../types';

interface RepaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
}

export const RepaymentModal: React.FC<RepaymentModalProps> = ({ isOpen, onClose, loan }) => {
  const { accounts, addLoanRepayment } = useApp();
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && loan) {
      setAmount(loan.outstanding_amount.toString());
      if (accounts.length > 0 && (!accountId || !accounts.some((a) => a.id === accountId))) {
        setAccountId(accounts[0].id);
      }
      setError('');
    }
  }, [isOpen, loan, accounts]);

  if (!isOpen || !loan) return null;

  const isBorrowed = loan.type === 'BORROWED';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const repaymentAmt = parseFloat(amount);
    if (isNaN(repaymentAmt) || repaymentAmt <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    if (repaymentAmt > loan.outstanding_amount) {
      setError(`Repayment amount cannot exceed outstanding balance of ₹${loan.outstanding_amount.toLocaleString()}`);
      return;
    }

    if (!accountId || !accounts.some((a) => a.id === accountId)) {
      setError('Please select a valid account.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addLoanRepayment({
        loan_id: loan.id,
        account_id: accountId,
        date,
        amount: repaymentAmt,
        type: isBorrowed ? 'REPAY' : 'RECOVER',
        notes: notes.trim() || undefined,
        created_by: 'Treasurer',
      });

      setNotes('');
      onClose();
    } catch (err: any) {
      console.error('Save Repayment Error:', err);
      setError(err?.message || 'Failed to record repayment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-slate-900">
                {isBorrowed ? 'Repay Loan' : 'Recover Loan'}
              </h3>
              <p className="text-xs text-slate-500">
                {loan.person_or_organization} — Outstanding: ₹{loan.outstanding_amount.toLocaleString()}
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">{error}</div>}

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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹) *</label>
              <input
                type="number"
                required
                step="any"
                min="0.01"
                max={loan.outstanding_amount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700"
              />
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Remarks</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Payment reference or notes..."
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
              {isSubmitting ? 'Processing...' : `Confirm ${isBorrowed ? 'Repayment' : 'Recovery'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

