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
  onOpenAdminLogin?: () => void;
  onOpenNewOrgModal?: () => void;
  onOpenOnboarding?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewOrgModal,
  onOpenOnboarding,
}) => {
  const handleOpenNewOrg = onOpenNewOrgModal || onOpenOnboarding || (() => {});
  const { currentOrg, organizations, currentOrgId, setCurrentOrgId } =
    useApp();
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);

  if (!currentOrg) return null;

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs backdrop-blur-md bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-start sm:items-center justify-between py-2.5 sm:py-3.5 gap-3 sm:gap-4">
          {/* Main Brand Identity Section */}
          <div className="flex items-start gap-3 sm:gap-3.5 min-w-0 flex-1">
            {/* Organization Logo */}
            <div className="relative group shrink-0 mt-0.5 sm:mt-0">
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-slate-50 border-2 border-emerald-600/30 p-1 shadow-xs flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105">
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
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-sm sm:text-lg md:text-xl font-bold text-slate-900 tracking-tight font-heading leading-snug break-words">
                  {currentOrg.name}
                </h1>

                {/* Multi-Org Switcher dropdown button */}
                {organizations.length > 1 && (
                  <div className="relative shrink-0 inline-flex items-center">
                    <button
                      id="org-switcher-dropdown-btn"
                      onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
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
                            className={`w-full px-3 py-2.5 text-left flex items-center gap-2.5 text-xs transition-colors cursor-pointer ${
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
                            className="w-full py-1.5 px-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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

              <div className="flex items-center gap-1.5 flex-wrap text-xs sm:text-sm text-slate-600 font-medium leading-snug">
                <span className="text-emerald-800 font-semibold break-words">{currentOrg.college_name}</span>
                {currentOrg.established_year && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 text-xs">
                      Est. {currentOrg.established_year}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Upper Right Corner: Academic Year / Session Pill */}
          {currentOrg.academic_year && (
            <div className="flex items-center shrink-0 pt-0.5">
              <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-full text-[11px] sm:text-xs font-bold tracking-tight">
                {currentOrg.academic_year}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

