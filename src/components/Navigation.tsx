import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Settings,
  Menu,
  X,
  Landmark,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ActiveTab } from '../types';

interface NavigationProps {
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  mobileMenuOpen: controlledMobileMenuOpen,
  setMobileMenuOpen: controlledSetMobileMenuOpen,
}) => {
  const { activeTab, setActiveTab, programs, organizers } = useApp();
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = React.useState(false);

  const mobileMenuOpen = controlledMobileMenuOpen !== undefined ? controlledMobileMenuOpen : internalMobileMenuOpen;
  const setMobileMenuOpen = controlledSetMobileMenuOpen || setInternalMobileMenuOpen;

  const navItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }>; count?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'organizers', label: 'Organizers', icon: Users, count: organizers.length },
    { id: 'programs', label: 'Programs', icon: CalendarDays, count: programs.length },
    { id: 'treasury-dashboard', label: 'Treasury', icon: Landmark },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleTabClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="bg-slate-900 text-slate-200 sticky top-16 sm:top-[73px] z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-13">
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1 overflow-x-auto py-1 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                activeTab === item.id ||
                (activeTab === 'program_details' && item.id === 'programs') ||
                (item.id === 'treasury-dashboard' && activeTab.startsWith('treasury'));
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => handleTabClick(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-xs font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-200' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {typeof item.count === 'number' && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? 'bg-emerald-900/80 text-emerald-200' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile menu trigger */}
          <div className="flex items-center justify-between w-full md:hidden">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <span className="capitalize">{activeTab.replace('_', ' ')}</span>
            </div>

            <button
              id="mobile-nav-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-800 space-y-1 animate-in slide-in-from-top-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                activeTab === item.id ||
                (activeTab === 'program_details' && item.id === 'programs') ||
                (item.id === 'treasury-dashboard' && activeTab.startsWith('treasury'));
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-emerald-700 text-white font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-emerald-400" />
                    <span>{item.label}</span>
                  </div>
                  {typeof item.count === 'number' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
};
