import React from 'react';
import { BarChart3, Download, Printer } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ReportsView: React.FC = () => {
  const { incomes, expenses, loans, accounts, programs } = useApp();

  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  const borrowedLoans = loans.filter((l) => l.type === 'BORROWED');
  const lentLoans = loans.filter((l) => l.type === 'LENT');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold font-serif text-slate-900 tracking-tight">Financial Reports & Statements</h1>
          <p className="text-sm text-slate-500 mt-1">Comprehensive summary statements for income, expenses, programs, and loans.</p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-colors no-print"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Export PDF</span>
        </button>
      </div>

      {/* Summary Statements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income Report Summary */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-lg font-bold font-serif text-slate-900 border-b border-slate-100 pb-3">Income Statement Summary</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-600 font-medium">Total Inflows / Revenue:</span>
              <span className="font-bold text-emerald-700">₹{totalIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-600 font-medium">Total Income Transactions:</span>
              <span className="font-bold text-slate-900">{incomes.length} records</span>
            </div>
          </div>
        </div>

        {/* Expense Report Summary */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-lg font-bold font-serif text-slate-900 border-b border-slate-100 pb-3">Expense Statement Summary</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-600 font-medium">Total Outflows / Expenses:</span>
              <span className="font-bold text-rose-700">₹{totalExpense.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-600 font-medium">Total Expense Transactions:</span>
              <span className="font-bold text-slate-900">{expenses.length} records</span>
            </div>
          </div>
        </div>
      </div>

      {/* Program Financial Statements */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-lg font-bold font-serif text-slate-900 border-b border-slate-100 pb-3">Event / Program Financial Results</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Program Name</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Income</th>
                <th className="py-3 px-4 text-right">Expense</th>
                <th className="py-3 px-4 text-right">Net Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {programs.length > 0 ? (
                programs.map((prog) => {
                  const progIncome = incomes.filter((i) => i.program_id === prog.id).reduce((s, i) => s + i.amount, 0);
                  const progExpense = expenses.filter((e) => e.program_id === prog.id).reduce((s, e) => s + e.amount, 0);
                  const net = progIncome - progExpense;
                  return (
                    <tr key={prog.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{prog.name}</td>
                      <td className="py-3 px-4 text-slate-600">{prog.date}</td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-700">₹{progIncome.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-semibold text-rose-700">₹{progExpense.toLocaleString()}</td>
                      <td className={`py-3 px-4 text-right font-bold ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        ₹{net.toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No programs available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
