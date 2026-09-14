import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Settings,
  X,
  Landmark,
  ShieldCheck,
  Lock,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Calendar,
  FileText,
  BookOpen,
  BarChart3,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  LogOut,
  PlusCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ActiveTab } from '../types';
import { DEFAULT_ORG_LOGO } from '../utils/helpers';

interface NavigationProps {
  isMenuOpen: boolean;
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenAdminLogin: () => void;
  onOpenNewOrgModal?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  isMenuOpen,
  setIsMenuOpen,
  onOpenAdminLogin,
  onOpenNewOrgModal,
}) => {
  const {
    activeTab,
    setActiveTab,
    programs,
    organizers,
    currentOrg,
    organizations,
    currentOrgId,
    setCurrentOrgId,
    isAdmin,
    setIsAdmin,
    user,
    logoutUser,
  } = useApp();

  const [treasuryExpanded, setTreasuryExpanded] = useState(false);

  const navItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }>; count?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'organizers', label: 'Organizers', icon: Users, count: organizers.length },
    { id: 'programs', label: 'Programs', icon: CalendarDays, count: programs.length },
  ];

  const treasurySubItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'treasury-dashboard', label: 'Treasury Dashboard', icon: LayoutDashboard },
    { id: 'treasury-accounts', label: 'Accounts', icon: Wallet },
    { id: 'treasury-income', label: 'Income', icon: ArrowDownLeft },
    { id: 'treasury-expenses', label: 'Expenses', icon: ArrowUpRight },
    { id: 'treasury-loans', label: 'Loans', icon: Landmark },
    { id: 'treasury-transfers', label: 'Account Transfers', icon: ArrowLeftRight },
    { id: 'treasury-events', label: 'Events', icon: Calendar },
    { id: 'treasury-ledger', label: 'Transactions Ledger', icon: FileText },
    { id: 'treasury-cashbook', label: 'Cash & Bank Books', icon: BookOpen },
    { id: 'treasury-reports', label: 'Financial Reports', icon: BarChart3 },
  ];

  const handleTabClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    setIsMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* 1. Desktop Navigation Bar (Unchanged desktop layout) */}
      <nav className="hidden md:block bg-slate-900 text-slate-200 sticky top-16 sm:top-[73px] z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-13">
            <div className="flex items-center space-x-1 overflow-x-auto py-1 scrollbar-none">
              {[
                { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
                { id: 'organizers' as ActiveTab, label: 'Organizers', icon: Users, count: organizers.length },
                { id: 'programs' as ActiveTab, label: 'Programs', icon: CalendarDays, count: programs.length },
                { id: 'treasury-dashboard' as ActiveTab, label: 'Treasury', icon: Landmark },
                { id: 'settings' as ActiveTab, label: 'Settings', icon: Settings },
              ].map((item) => {
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
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
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
          </div>
        </div>
      </nav>

      {/* 2. Mobile Navigation Drawer / Slide-out Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Subtle Dimmed Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-150"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Container (Positioned on the Right, ~82-88% width on mobile) */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
            <div className="w-[86vw] max-w-[320px] sm:max-w-sm bg-white shadow-xl border-l border-slate-200/90 flex flex-col z-50 h-full overflow-hidden animate-in slide-in-from-right duration-200">
              {/* Organization Header */}
              <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 p-0.5 shrink-0 flex items-center justify-center overflow-hidden shadow-2xs">
                    <img
                      src={currentOrg?.logo || DEFAULT_ORG_LOGO}
                      alt=""
                      className="w-full h-full object-contain rounded-md"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_ORG_LOGO;
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight break-words font-heading line-clamp-2">
                      {currentOrg?.name || 'Academic Portal'}
                    </h3>
                    <p className="text-[10.5px] text-slate-500 font-medium leading-tight truncate mt-0.5">
                      {currentOrg?.college_name || 'Organization Portal'}
                    </p>
                  </div>
                </div>

                <button
                  id="close-nav-drawer-btn"
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer shrink-0"
                  aria-label="Close navigation menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Navigation Scroll Area */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 py-3 space-y-4">
                {/* Primary Menu Section */}
                <div className="space-y-1">
                  <p className="px-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Menu
                  </p>

                  {/* Standard Nav Items: Dashboard, Organizers, Programs */}
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      activeTab === item.id ||
                      (activeTab === 'program_details' && item.id === 'programs');
                    return (
                      <button
                        key={item.id}
                        id={`drawer-nav-${item.id}`}
                        onClick={() => handleTabClick(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-2 border-emerald-600 shadow-2xs'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-700' : 'text-slate-500'}`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {typeof item.count === 'number' && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Expandable Treasury Item */}
                  <div className="pt-0.5">
                    <div
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                        activeTab.startsWith('treasury')
                          ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-2 border-emerald-600'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div
                        className="flex items-center gap-2.5 flex-1 min-w-0"
                        onClick={() => handleTabClick('treasury-dashboard')}
                      >
                        <Landmark
                          className={`w-4 h-4 shrink-0 ${
                            activeTab.startsWith('treasury') ? 'text-emerald-700' : 'text-slate-500'
                          }`}
                        />
                        <span className="truncate">Treasury</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTreasuryExpanded((prev) => !prev);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-md transition-colors"
                        aria-label="Toggle Treasury sub-menu"
                      >
                        {treasuryExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Treasury Submenu List (Compact) */}
                    {treasuryExpanded && (
                      <div className="pl-2.5 pr-1 py-1 space-y-0.5 border-l border-slate-200 ml-4.5 my-1">
                        {treasurySubItems.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubActive = activeTab === subItem.id;
                          return (
                            <button
                              key={subItem.id}
                              onClick={() => handleTabClick(subItem.id)}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer text-left ${
                                isSubActive
                                  ? 'bg-emerald-100/80 text-emerald-900 font-semibold'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              <SubIcon
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isSubActive ? 'text-emerald-700' : 'text-slate-400'
                                }`}
                              />
                              <span className="truncate">{subItem.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Settings Item (Positioned right after Treasury) */}
                  <button
                    id="drawer-nav-settings"
                    onClick={() => handleTabClick('settings')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                      activeTab === 'settings'
                        ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-2 border-emerald-600 shadow-2xs'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Settings
                        className={`w-4 h-4 shrink-0 ${
                          activeTab === 'settings' ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      />
                      <span className="truncate">Settings</span>
                    </div>
                  </button>
                </div>

                {/* Admin & Account Section */}
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <p className="px-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Admin & Account
                  </p>

                  {/* Admin Mode Card / Login */}
                  {isAdmin ? (
                    <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>Admin Mode</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-200/70 text-emerald-800 rounded-md font-semibold">
                          Active
                        </span>
                      </div>

                      <p className="text-[11px] text-emerald-800/90 leading-tight">
                        Full administrative access active
                      </p>

                      <button
                        onClick={() => {
                          setIsAdmin(false);
                          setIsMenuOpen(false);
                        }}
                        className="w-full py-1.5 px-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Lock / Switch to Visitor Mode</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      id="drawer-admin-login-btn"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenAdminLogin();
                      }}
                      className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl font-medium text-xs border border-slate-200/80 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-slate-200/70 text-slate-700 rounded-lg">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-900">Admin Login</p>
                          <p className="text-[10.5px] text-slate-500 font-normal">
                            Unlock editing access
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  )}

                  {/* Account Information & Logout */}
                  {user && (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Account
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-slate-700 font-medium break-all flex-1 min-w-0">
                          {user.username || user.email}
                        </p>
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            logoutUser();
                          }}
                          className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer shrink-0"
                          title="Sign Out"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Organization Switcher (If multiple organizations exist) */}
                {organizations.length > 1 && (
                  <div className="border-t border-slate-100 pt-3 space-y-1.5">
                    <p className="px-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Switch Organization
                    </p>
                    <div className="space-y-1">
                      {organizations.map((org) => (
                        <button
                          key={org.id}
                          onClick={() => {
                            setCurrentOrgId(org.id);
                            setIsMenuOpen(false);
                          }}
                          className={`w-full px-2.5 py-1.5 text-left flex items-center gap-2 text-xs rounded-lg transition-colors cursor-pointer ${
                            org.id === currentOrgId
                              ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200/60'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <img
                            src={org.logo || DEFAULT_ORG_LOGO}
                            alt=""
                            className="w-4 h-4 rounded-sm object-cover border border-slate-200 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = DEFAULT_ORG_LOGO;
                            }}
                          />
                          <span className="truncate flex-1 font-medium">{org.name}</span>
                        </button>
                      ))}

                      {onOpenNewOrgModal && (
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            onOpenNewOrgModal();
                          }}
                          className="w-full mt-1.5 py-1.5 px-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Add Organization</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

