import React from 'react';
import {
  LayoutDashboard,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Landmark,
  FileText,
  BookOpen,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ActiveTab } from '../../types';

export const TreasuryNav: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  const treasuryTabs: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'treasury-dashboard', label: 'Treasury Dashboard', icon: LayoutDashboard },
    { id: 'treasury-accounts', label: 'Accounts', icon: Wallet },
    { id: 'treasury-income', label: 'Income', icon: ArrowDownLeft },
    { id: 'treasury-expenses', label: 'Expenses', icon: ArrowUpRight },
    { id: 'treasury-loans', label: 'Loans (Borrowed/Lent)', icon: Landmark },
    { id: 'treasury-transfers', label: 'Account Transfers', icon: ArrowLeftRight },
    { id: 'treasury-events', label: 'Events', icon: Calendar },
    { id: 'treasury-ledger', label: 'Transactions Ledger', icon: FileText },
    { id: 'treasury-cashbook', label: 'Cash & Bank Books', icon: BookOpen },
    { id: 'treasury-reports', label: 'Financial Reports', icon: BarChart3 },
  ];

  const handleTabClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-white border-b border-slate-200 shadow-2xs mb-6 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
          {treasuryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-200' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
