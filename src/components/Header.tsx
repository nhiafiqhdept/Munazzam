import React, { useState } from 'react';
import {
  ChevronDown,
  PlusCircle,
  Menu,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DEFAULT_ORG_LOGO } from '../utils/helpers';

interface HeaderProps {
  onOpenAdminLogin: () => void;
  onOpenNewOrgModal?: () => void;
  onOpenOnboarding?: () => void;
  isMenuOpen: boolean;
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewOrgModal,
  onOpenOnboarding,
  isMenuOpen,
  setIsMenuOpen,
}) => {
  const handleOpenNewOrg = onOpenNewOrgModal || onOpenOnboarding || (() => {});
  const { currentOrg, organizations, currentOrgId, setCurrentOrgId } =
    useApp();
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);

  if (!currentOrg) return null;

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs backdrop-blur-md bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 sm:py-4 gap-3 sm:gap-4">
          {/* Main Brand Identity Section */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            {/* Organization Logo */}
            <div className="relative group shrink-0">
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-slate-50 border-2 border-emerald-600/30 p-1 shadow-xs flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105">
                <img
                  src={currentOrg.logo || DEFAULT_ORG_LOGO}
                  alt={`${currentOrg.name} Logo`}
                  className="w-full h-full object-contain rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_ORG_LOGO;
                  }}
                />
              </div>
            </div>

            {/* Organization & Institution Name */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-base sm:text-xl font-bold text-slate-900 truncate tracking-tight font-heading leading-tight">
                  {currentOrg.name}
                </h1>

                {/* Multi-Org Switcher dropdown button */}
                {organizations.length > 1 && (
                  <div className="relative shrink-0">
                    <button
                      id="org-switcher-dropdown-btn"
                      onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                      title="Switch Organization"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {showOrgDropdown && (
                      <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                        <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                          Switch Organization
                        </div>
                        {organizations.map((org) => (
                          <button
                            key={org.id}
                            onClick={() => {
                              setCurrentOrgId(org.id);
                              setShowOrgDropdown(false);
                            }}
                            className={`w-full px-3 py-2.5 text-left flex items-center gap-2.5 text-xs transition-colors ${
                              org.id === currentOrgId
                                ? 'bg-emerald-50 text-emerald-900 font-semibold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <img
                              src={org.logo || DEFAULT_ORG_LOGO}
                              alt=""
                              className="w-6 h-6 rounded-md object-cover border border-slate-200"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = DEFAULT_ORG_LOGO;
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{org.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{org.college_name}</p>
                            </div>
                          </button>
                        ))}
                        <div className="pt-2 mt-1 border-t border-slate-100 px-2">
                          <button
                            onClick={() => {
                              setShowOrgDropdown(false);
                              handleOpenNewOrg();
                            }}
                            className="w-full py-1.5 px-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Add New Organization</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600 font-medium">
                <span className="text-emerald-700 font-semibold truncate">{currentOrg.college_name}</span>
                {currentOrg.established_year && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 text-xs hidden sm:inline">
                      Est. {currentOrg.established_year}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Upper Right Corner: Hamburger Menu [☰] ONLY */}
          <div className="flex items-center shrink-0">
            {/* Hamburger / Menu toggle button */}
            <button
              id="header-menu-toggle-btn"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className={`p-2 sm:p-2.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-center ${
                isMenuOpen
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-200/80 bg-white'
              }`}
              title={isMenuOpen ? 'Close Menu' : 'Open Navigation Menu'}
              aria-label={isMenuOpen ? 'Close Menu' : 'Open Navigation Menu'}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

