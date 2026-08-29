import React, { useState } from 'react';
import { Landmark, Plus, CheckCircle2, AlertCircle, RefreshCw, Eye, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Loan, LoanRepayment } from '../../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface LoansViewProps {
  onOpenAddLoan: () => void;
  onOpenRepayment: (loan: Loan) => void;
}

export const LoansView: React.FC<LoansViewProps> = ({ onOpenAddLoan, onOpenRepayment }) => {
  const { loans, loanRepayments, accounts, deleteLoan, deleteLoanRepayment, isAdmin } = useApp();
  const [activeTab, setActiveTab] = useState<'BORROWED' | 'LENT' | 'REPAYMENTS'>('BORROWED');
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);
  const [repaymentToDelete, setRepaymentToDelete] = useState<LoanRepayment | null>(null);

  const filteredLoans = loans.filter((l) => l.type === activeTab);

  const handleDeleteLoanConfirm = () => {
    if (loanToDelete) {
      deleteLoan(loanToDelete.id);
      setLoanToDelete(null);
    }
  };

  const handleDeleteRepaymentConfirm = () => {
    if (repaymentToDelete) {
      deleteLoanRepayment(repaymentToDelete.id);
      setRepaymentToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold font-serif text-slate-900 tracking-tight">Loans & Advances</h1>
          <p className="text-sm text-slate-500 mt-1">Manage borrowed funds (payables), money lent (receivables), and repayment histories.</p>
        </div>

        {isAdmin && (
          <button
            onClick={onOpenAddLoan}
            className="px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Loan</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('BORROWED')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'BORROWED' ? 'bg-amber-700 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Money Borrowed (Payables)
        </button>
        <button
          onClick={() => setActiveTab('LENT')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'LENT' ? 'bg-blue-700 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Money Lent (Receivables)
        </button>
        <button
          onClick={() => setActiveTab('REPAYMENTS')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'REPAYMENTS' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Repayments & Recoveries History ({loanRepayments.length})
        </button>
      </div>

      {/* Content Table */}
      {activeTab === 'REPAYMENTS' ? (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Associated Loan Party</th>
                  <th className="py-3 px-4">Account</th>
                  <th className="py-3 px-4">Notes / Remarks</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loanRepayments.length > 0 ? (
                  loanRepayments.map((rep) => {
                    const loan = loans.find((l) => l.id === rep.loan_id);
                    const acc = accounts.find((a) => a.id === rep.account_id);
                    const isRepay = rep.type === 'REPAY';
                    return (
                      <tr key={rep.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap">{rep.date}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                              isRepay ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {isRepay ? 'Loan Repayment' : 'Loan Recovery'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{loan?.person_or_organization || 'Unknown Party'}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">{acc?.name || 'Unknown Account'}</td>
                        <td className="py-3.5 px-4 text-slate-500">{rep.notes || '—'}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 text-sm">₹{rep.amount.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-center">
                          {isAdmin && (
                            <button
                              onClick={() => setRepaymentToDelete(rep)}
                              className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Repayment"
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
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No loan repayments or recoveries recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">{activeTab === 'BORROWED' ? 'Borrowed From' : 'Lent To'}</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4">Account</th>
                  <th className="py-3 px-4 text-right">Original Amount</th>
                  <th className="py-3 px-4 text-right">Outstanding</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLoans.length > 0 ? (
                  filteredLoans.map((loan) => {
                    const acc = accounts.find((a) => a.id === loan.account_id);
                    const isComplete = loan.outstanding_amount === 0;
                    return (
                      <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap">{loan.date}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{loan.person_or_organization}</td>
                        <td className="py-3.5 px-4 text-slate-600">{loan.purpose}</td>
                        <td className="py-3.5 px-4 text-slate-500">{acc?.name || '—'}</td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-700">₹{loan.original_amount.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-rose-700 text-sm">₹{loan.outstanding_amount.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              isComplete
                                ? 'bg-emerald-100 text-emerald-800'
                                : loan.status === 'PARTIALLY_PAID' || loan.status === 'PARTIALLY_RECOVERED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {loan.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {!isComplete && isAdmin && (
                              <button
                                onClick={() => onOpenRepayment(loan)}
                                className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-[11px] flex items-center gap-1"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>{activeTab === 'BORROWED' ? 'Repay' : 'Recover'}</span>
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => setLoanToDelete(loan)}
                                className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No loan records found for this category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Loan Modal */}
      <DeleteConfirmModal
        isOpen={!!loanToDelete}
        title="Delete Loan Record"
        message="Are you sure you want to delete this loan record? All associated repayments and balance effects will be reversed."
        itemDetails={
          loanToDelete
            ? [
                { label: 'Party', value: loanToDelete.person_or_organization },
                { label: 'Original Amount', value: `₹${loanToDelete.original_amount.toLocaleString()}` },
                { label: 'Outstanding', value: `₹${loanToDelete.outstanding_amount.toLocaleString()}` },
                { label: 'Purpose', value: loanToDelete.purpose },
              ]
            : []
        }
        onClose={() => setLoanToDelete(null)}
        onConfirm={handleDeleteLoanConfirm}
      />

      {/* Delete Repayment Modal */}
      <DeleteConfirmModal
        isOpen={!!repaymentToDelete}
        title="Delete Repayment Record"
        message="Are you sure you want to delete this repayment/recovery record? The loan outstanding balance will be restored by this amount."
        itemDetails={
          repaymentToDelete
            ? [
                { label: 'Amount', value: `₹${repaymentToDelete.amount.toLocaleString()}` },
                { label: 'Type', value: repaymentToDelete.type === 'REPAY' ? 'Repayment' : 'Recovery' },
                { label: 'Date', value: repaymentToDelete.date },
              ]
            : []
        }
        onClose={() => setRepaymentToDelete(null)}
        onConfirm={handleDeleteRepaymentConfirm}
      />
    </div>
  );
};
