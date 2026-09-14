import React from 'react';
import {
  Home,
  Users,
  CalendarDays,
  Landmark,
  Settings,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ActiveTab } from '../types';

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    isActive: (tab: ActiveTab) => boolean;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      isActive: (tab) => tab === 'dashboard',
    },
    {
      id: 'organizers',
      label: 'Organizers',
      icon: Users,
      isActive: (tab) => tab === 'organizers',
    },
    {
      id: 'programs',
      label: 'Programs',
      icon: CalendarDays,
      isActive: (tab) => tab === 'programs' || tab === 'program_details' || tab === 'program-details',
    },
    {
      id: 'treasury-dashboard',
      label: 'Treasury',
      icon: Landmark,
      isActive: (tab) => tab.startsWith('treasury'),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      isActive: (tab) => tab === 'settings',
    },
  ];

  const handleTabClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav
      id="bottom-navigation-bar"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] no-print pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-auto px-2 pt-1.5">
        <div className="grid grid-cols-5 gap-1 items-center justify-between text-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.isActive(activeTab);

            return (
              <button
                key={item.id}
                id={`bottom-nav-${item.id}`}
                onClick={() => handleTabClick(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 cursor-pointer select-none group touch-manipulation ${
                  active
                    ? 'text-[#0B7A5A] font-bold'
                    : 'text-slate-400 hover:text-slate-600 font-medium'
                }`}
                aria-label={item.label}
              >
                <div
                  className={`relative flex items-center justify-center p-1.5 rounded-xl transition-all duration-200 ${
                    active
                      ? 'bg-emerald-50 text-[#0B7A5A] scale-105 shadow-2xs'
                      : 'group-active:scale-95 text-slate-400 group-hover:text-slate-600'
                  }`}
                >
                  <Icon className="w-5 h-5 sm:w-5 sm:h-5 stroke-[2.2]" />
                  {active && (
                    <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-[#0B7A5A]" />
                  )}
                </div>
                <span
                  className={`text-[10px] sm:text-[11px] tracking-tight mt-0.5 leading-tight transition-colors truncate w-full text-center ${
                    active ? 'text-[#0B7A5A] font-bold' : 'text-slate-500 font-medium'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
