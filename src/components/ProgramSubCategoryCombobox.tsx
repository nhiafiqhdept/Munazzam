import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Plus, X, Layers } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ProgramSubCategoryComboboxProps {
  value: string;
  onChange: (subCategory: string) => void;
  categoryContext?: string;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
}

export const ProgramSubCategoryCombobox: React.FC<ProgramSubCategoryComboboxProps> = ({
  value,
  onChange,
  categoryContext,
  disabled = false,
  placeholder = 'Select or enter sub category...',
  id = 'program-subcategory-combobox-input',
}) => {
  const { programs } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal search term when external value changes
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // If user left untracked text, keep the typed text
        if (searchTerm.trim() !== (value || '').trim()) {
          onChange(searchTerm.trim());
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchTerm, value, onChange]);

  // Extract unique subcategories from existing programs in this account
  const availableSubCategories = useMemo(() => {
    const set = new Set<string>();
    programs.forEach((prog) => {
      const sub = (prog.subCategory || '').trim();
      if (sub) {
        set.add(sub);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [programs]);

  const trimmedQuery = searchTerm.trim().toLowerCase();

  // Filter existing subcategories based on search input
  const filteredSubCategories = availableSubCategories.filter((sub) =>
    sub.toLowerCase().includes(trimmedQuery)
  );

  const exactMatch = availableSubCategories.find(
    (sub) => sub.trim().toLowerCase() === trimmedQuery
  );

  const handleSelectSubCategory = (subCat: string) => {
    setSearchTerm(subCat);
    onChange(subCat);
    setIsOpen(false);
  };

  const handleClearSubCategory = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSearchTerm('');
    onChange('');
    setIsOpen(false);
  };

  const handleApplyCustomSubCategory = (name: string) => {
    const trimmed = name.trim();
    setSearchTerm(trimmed);
    onChange(trimmed);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSubCategories.length > 0 && exactMatch) {
        handleSelectSubCategory(exactMatch);
      } else if (filteredSubCategories.length === 1 && !exactMatch) {
        handleSelectSubCategory(filteredSubCategories[0]);
      } else if (searchTerm.trim().length > 0) {
        handleApplyCustomSubCategory(searchTerm);
      }
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative flex items-center">
        <div className="absolute left-3 text-slate-400 pointer-events-none">
          <Layers className="w-4 h-4" />
        </div>

        <input
          id={id}
          type="text"
          value={searchTerm}
          disabled={disabled}
          onChange={(e) => {
            const newVal = e.target.value;
            setSearchTerm(newVal);
            onChange(newVal);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-9 pr-16 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
          autoComplete="off"
        />

        <div className="absolute right-2 flex items-center gap-1">
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSubCategory}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              title="Clear sub category"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Toggle sub category list"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-emerald-600' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-white rounded-2xl border border-slate-200 shadow-xl max-h-60 overflow-y-auto p-1.5 space-y-1 animate-in fade-in-50 zoom-in-95">
          {/* Clear / Unassigned Option */}
          <button
            type="button"
            onClick={() => handleClearSubCategory()}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
              !value
                ? 'bg-slate-100 text-slate-800'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              <span>— No Sub Category (Optional) —</span>
            </span>
            {!value && <Check className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
          </button>

          {/* Use Custom Sub Category Action (if user typed something that is not an exact match) */}
          {searchTerm.trim().length > 0 && !exactMatch && (
            <button
              type="button"
              onClick={() => handleApplyCustomSubCategory(searchTerm)}
              className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">
                Use sub-category: <strong className="text-emerald-900 font-extrabold">&ldquo;{searchTerm.trim()}&rdquo;</strong>
              </span>
            </button>
          )}

          {/* List of Previously Used Sub Categories */}
          {filteredSubCategories.length > 0 ? (
            <div className="pt-1">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Known Sub-Categories ({filteredSubCategories.length})
              </div>
              {filteredSubCategories.map((sub) => {
                const isSelected = (value || '').trim().toLowerCase() === sub.trim().toLowerCase();
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => handleSelectSubCategory(sub)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/60'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="truncate">{sub}</span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          ) : (
            availableSubCategories.length === 0 && !searchTerm.trim() && (
              <div className="px-3 py-4 text-center text-xs text-slate-400">
                <p className="font-medium text-slate-500">No sub-categories recorded yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Type any custom sub-category in the field above to assign it.
                </p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};
