import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Plus, X, Tag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProgramCategory } from '../types';

interface ProgramCategoryComboboxProps {
  value: string;
  onChange: (categoryName: string, categoryId?: string) => void;
  disabled?: boolean;
}

export const ProgramCategoryCombobox: React.FC<ProgramCategoryComboboxProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const { programCategories, ensureCategoryExists } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [isCreating, setIsCreating] = useState(false);
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

  const trimmedQuery = searchTerm.trim().toLowerCase();
  
  // Filter account-specific categories
  const filteredCategories = programCategories.filter((cat) =>
    (cat.name || '').toLowerCase().includes(trimmedQuery)
  );

  const exactMatch = programCategories.find(
    (cat) => (cat.name || '').trim().toLowerCase() === trimmedQuery
  );

  const handleSelectCategory = (cat: ProgramCategory) => {
    setSearchTerm(cat.name);
    onChange(cat.name, cat.id);
    setIsOpen(false);
  };

  const handleClearCategory = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSearchTerm('');
    onChange('', '');
    setIsOpen(false);
  };

  const handleCreateNewCategory = async (nameToCreate: string) => {
    const trimmed = nameToCreate.trim();
    if (!trimmed) return;

    try {
      setIsCreating(true);
      const newCat = await ensureCategoryExists(trimmed);
      if (newCat) {
        setSearchTerm(newCat.name);
        onChange(newCat.name, newCat.id);
      } else {
        setSearchTerm(trimmed);
        onChange(trimmed, '');
      }
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to create category:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCategories.length > 0 && exactMatch) {
        handleSelectCategory(exactMatch);
      } else if (filteredCategories.length === 1 && !exactMatch) {
        handleSelectCategory(filteredCategories[0]);
      } else if (searchTerm.trim().length > 0 && !exactMatch) {
        handleCreateNewCategory(searchTerm);
      }
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative flex items-center">
        <div className="absolute left-3 text-slate-400 pointer-events-none">
          <Tag className="w-4 h-4" />
        </div>

        <input
          id="program-category-combobox-input"
          type="text"
          value={searchTerm}
          disabled={disabled}
          onChange={(e) => {
            const newVal = e.target.value;
            setSearchTerm(newVal);
            onChange(newVal, '');
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Select category or type to create new..."
          className="w-full pl-9 pr-16 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
          autoComplete="off"
        />

        <div className="absolute right-2 flex items-center gap-1">
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearCategory}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              title="Clear category"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Toggle category list"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-white rounded-2xl border border-slate-200 shadow-xl max-h-60 overflow-y-auto p-1.5 space-y-1 animate-in fade-in-50 zoom-in-95">
          {/* No Category Option */}
          <button
            type="button"
            onClick={() => handleClearCategory()}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
              !value ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              <span>— No Category (Unassigned) —</span>
            </span>
            {!value && <Check className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
          </button>

          {/* Create New Category Action (if query is typed and no exact match exists) */}
          {searchTerm.trim().length > 0 && !exactMatch && (
            <button
              type="button"
              onClick={() => handleCreateNewCategory(searchTerm)}
              disabled={isCreating}
              className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">
                Create &amp; select: <strong className="text-emerald-900 font-extrabold">&ldquo;{searchTerm.trim()}&rdquo;</strong>
              </span>
            </button>
          )}

          {/* List of Existing Categories for this Account */}
          {filteredCategories.length > 0 ? (
            <div className="pt-1">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Account Categories ({filteredCategories.length})
              </div>
              {filteredCategories.map((cat) => {
                const isSelected = (value || '').trim().toLowerCase() === (cat.name || '').trim().toLowerCase();
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/60'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          ) : (
            programCategories.length === 0 && !searchTerm.trim() && (
              <div className="px-3 py-4 text-center text-xs text-slate-400">
                <p className="font-medium text-slate-500">No categories created yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Type any category name in the box above to create and save one for your account.
                </p>
              </div>
            )
          )}

          {filteredCategories.length === 0 && searchTerm.trim().length > 0 && exactMatch && (
            <div className="px-3 py-2 text-center text-xs text-slate-400">
              No additional categories found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
