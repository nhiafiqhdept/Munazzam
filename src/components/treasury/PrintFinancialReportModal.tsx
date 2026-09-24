import React from 'react';
import { Printer, X, FileText } from 'lucide-react';
import { Program, Income, Expense, Account, Organization } from '../../types';
import { formatDate } from '../../utils/helpers';
import { useApp } from '../../context/AppContext';

interface PrintFinancialReportModalProps {
  program: Program;
  incomes: Income[];
  expenses: Expense[];
  accounts: Account[];
  organization?: Organization;
  onClose: () => void;
}

export const PrintFinancialReportModal: React.FC<PrintFinancialReportModalProps> = ({
  program,
  incomes,
  expenses,
  accounts: _accounts,
  organization: organizationProp,
  onClose,
}) => {
  const { currentOrg } = useApp();
  const organization = organizationProp || currentOrg;

  const eventIncomes = incomes.filter((inc) => inc.program_id === program.id);
  const eventExpenses = expenses.filter((exp) => exp.program_id === program.id);
  const totalIncome = eventIncomes.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = eventExpenses.reduce((sum, e) => sum + e.amount, 0);
  const net = totalIncome - totalExpenses;
  const totalTransactions = eventIncomes.length + eventExpenses.length;
  const isProfit = net >= 0;

  const sanitizedProgramName = program.name.replace(/[^a-zA-Z0-9]/g, '_');

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const originalTitle = document.title;
    document.title = `Munazzam_${sanitizedProgramName}_Financial_Report`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible print:block print:h-auto">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body, html {
            background: white !important;
            color: black !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden !important;
          }
          .financial-report-print-area,
          .financial-report-print-area * {
            visibility: visible !important;
          }
          .financial-report-print-area {
            position: static !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: white !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .financial-report-section,
          .financial-summary,
          .financial-result,
          .financial-details {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto print:my-0 print:shadow-none print:rounded-none print:w-full print:h-auto print:overflow-visible print:block">
        {/* Top Bar Controls (Hidden during print) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">Program Financial Report Preview</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer pointer-events-auto"
            >
              <Printer className="w-4 h-4" />
              <span>Save as PDF / Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer pointer-events-auto"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Financial Document */}
        <div className="p-6 sm:p-12 space-y-6 text-slate-900 bg-white print:p-4 financial-report-print-area" id="printable-financial-report">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-5 financial-report-section">
            <div className="flex items-center gap-4">
              <img
                src={organization?.logo || 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200&auto=format&fit=crop&q=80'}
                alt="Org Logo"
                className="w-16 h-16 object-contain rounded-xl border border-slate-300 p-1"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200&auto=format&fit=crop&q=80';
                }}
              />
              <div>
                <h2 className="text-xl font-bold font-heading text-slate-900 tracking-tight">
                  {organization?.name || 'MUNAZZAM'}
                </h2>
                <p className="text-xs font-semibold text-emerald-800">{organization?.college_name || 'Institutional Reporting & Analytics'}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Academic Year: {organization?.academic_year || '2026-27'}</p>
              </div>
            </div>
            <div className="text-right text-xs text-slate-600 font-mono">
              <p className="font-bold text-slate-900">PROGRAM FINANCIAL REPORT</p>
              <p>Generated: {formatDate(new Date().toISOString())}</p>
            </div>
          </div>

          {/* Program Details Banner */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 financial-report-section">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
              Official Audit Report
            </span>
            <h1 className="text-xl font-bold text-slate-900 font-heading">{program.name}</h1>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Date & Time</span>
                <span className="font-semibold text-slate-800">{formatDate(program.date)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Place Held</span>
                <span className="font-semibold text-slate-800">{program.place || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">For Whom</span>
                <span className="font-semibold text-slate-800">{program.audience || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Resource Person</span>
                <span className="font-semibold text-slate-800">{program.resourcePerson || '—'}</span>
              </div>
            </div>
          </div>

          {/* Financial Summary Box */}
          <div className="space-y-3 financial-summary">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1.5">
              Financial Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-800 uppercase">Total Income</span>
                <p className="text-lg font-extrabold text-emerald-700 mt-0.5">₹{totalIncome.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                <span className="text-[10px] font-bold text-rose-800 uppercase">Total Expenses</span>
                <p className="text-lg font-extrabold text-rose-700 mt-0.5">₹{totalExpenses.toLocaleString()}</p>
              </div>
              <div className={`p-3 rounded-xl border ${isProfit ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                <span className={`text-[10px] font-bold uppercase ${isProfit ? 'text-emerald-800' : 'text-rose-800'}`}>Net Result</span>
                <p className={`text-lg font-extrabold mt-0.5 ${isProfit ? 'text-emerald-800' : 'text-rose-800'}`}>
                  {isProfit ? '+' : ''}₹{net.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <span className="text-[10px] font-bold text-blue-800 uppercase">Total Transactions</span>
                <p className="text-lg font-extrabold text-blue-700 mt-0.5">{totalTransactions}</p>
              </div>
            </div>
          </div>

          {/* Income Details Table (Source, Category, Amount) */}
          <div className="space-y-2 financial-details">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1.5">
              Income Details ({eventIncomes.length} records)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <th className="py-2 px-3">Source / Received From</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {eventIncomes.length > 0 ? (
                    eventIncomes.map((inc) => (
                      <tr key={inc.id}>
                        <td className="py-2 px-3 font-semibold text-slate-900">{inc.source}</td>
                        <td className="py-2 px-3 text-slate-700">{inc.category}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">+₹{inc.amount.toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-slate-400 italic">No income transactions recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg font-bold text-xs">
              <span>TOTAL INCOME:</span>
              <span className="text-emerald-700">₹{totalIncome.toLocaleString()}</span>
            </div>
          </div>

          {/* Expense Details Table (Paid To, Category, Amount) */}
          <div className="space-y-2 financial-details">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1.5">
              Expense Details ({eventExpenses.length} records)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <th className="py-2 px-3">Paid To</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {eventExpenses.length > 0 ? (
                    eventExpenses.map((exp) => (
                      <tr key={exp.id}>
                        <td className="py-2 px-3 font-semibold text-slate-900">{exp.paid_to}</td>
                        <td className="py-2 px-3 text-slate-700">{exp.category}</td>
                        <td className="py-2 px-3 text-right font-bold text-rose-700">-₹{exp.amount.toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-slate-400 italic">No expense transactions recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg font-bold text-xs">
              <span>TOTAL EXPENSES:</span>
              <span className="text-rose-700">₹{totalExpenses.toLocaleString()}</span>
            </div>
          </div>

          {/* Final Calculation Block */}
          <div className="bg-slate-900 text-white p-4 rounded-xl space-y-1.5 text-xs financial-result">
            <h4 className="font-bold text-sm tracking-wider uppercase text-slate-300 border-b border-slate-800 pb-1 mb-2">
              Financial Result Calculation
            </h4>
            <div className="flex justify-between">
              <span>Total Income</span>
              <span className="font-bold text-emerald-400">₹{totalIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>− Total Expenses</span>
              <span className="font-bold text-rose-400">₹{totalExpenses.toLocaleString()}</span>
            </div>
            <div className="border-t border-slate-800 pt-2 flex justify-between font-extrabold text-sm">
              <span>= Net Result ({isProfit ? 'Surplus' : 'Deficit'})</span>
              <span className={isProfit ? 'text-emerald-400' : 'text-rose-400'}>
                {isProfit ? '+' : ''}₹{net.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-500 financial-report-section">
            <p>Munazzam Institutional Reporting System • Certified Official Document</p>
          </div>
        </div>
      </div>
    </div>
  );
};
