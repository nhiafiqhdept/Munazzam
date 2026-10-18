import React, { useState, useEffect } from 'react';
import { ChevronDown, Check, Plus, X, Tag, Search, FolderTree } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Sync internal value or search
  useEffect(() => {
    // Keep internal search clean when modal opens
  }, [isOpen]);

  const trimmedQuery = searchTerm.trim().toLowerCase();
  
  // Filter categories
  const filteredCategories = programCategories.filter((cat) =>
    (cat.name || '').toLowerCase().includes(trimmedQuery)
  );

  const exactMatch = programCategories.find(
    (cat) => (cat.name || '').trim().toLowerCase() === trimmedQuery
  );

  const handleSelectCategory = (cat: ProgramCategory) => {
    onChange(cat.name, cat.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClearCategory = () => {
    onChange('', '');
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCreateNewCategory = async (nameToCreate: string) => {
    const trimmed = nameToCreate.trim();
    if (!trimmed) return;

    try {
      setIsCreating(true);
      const newCat = await ensureCategoryExists(trimmed);
      if (newCat) {
        onChange(newCat.name, newCat.id);
      } else {
        onChange(trimmed, '');
      }
      setIsOpen(false);
      setSearchTerm('');
    } catch (err) {
      console.error('Failed to create category:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative w-full">
      {/* Trigger Button / Input Field */}
      <button
        type="button"
        id="program-category-combobox-trigger"
        onClick={() => {
          if (!disabled) {
            setSearchTerm('');
            setIsOpen(true);
          }
        }}
        disabled={disabled}
        className="w-full flex items-center justify-between px-3.5 py-2.5 sm:py-3 bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/90 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-all shadow-2xs cursor-pointer text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Tag className="w-4 h-4 text-slate-400 shrink-0" />
          <span className={`truncate ${!value ? 'text-slate-400 font-normal' : 'text-slate-900 font-semibold'}`}>
            {value || 'Select category...'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleClearCategory();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              title="Clear category"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>
      </button>

      {/* Organizer Post - Style Full Selection Modal / Panel Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#1e3a8a]">
                  <FolderTree className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 font-heading">
                    Select Category
                  </h3>
                  <p className="text-xs text-slate-500">
                    Choose from organization categories or create a new one
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search categories or type new..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]"
                  autoFocus
                />
              </div>
            </div>

            {/* Scrollable Options List */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2">
              {/* Unassigned Option */}
              <button
                type="button"
                onClick={() => handleClearCategory()}
                className={`w-full text-left px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  !value
                    ? 'bg-blue-50/80 text-[#1e3a8a] border border-blue-200'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                }`}
              >
                <span className="flex items-center gap-3 truncate">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                  <span className="truncate">Unassigned (No Category)</span>
                </span>
                {!value && <Check className="w-4 h-4 text-[#1e3a8a] shrink-0 ml-2" />}
              </button>

              {/* Create New Category Action */}
              {searchTerm.trim().length > 0 && !exactMatch && (
                <button
                  type="button"
                  onClick={() => handleCreateNewCategory(searchTerm)}
                  disabled={isCreating}
                  className="w-full text-left px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center justify-between transition-colors cursor-pointer shadow-2xs"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Plus className="w-4 h-4 text-[#1e3a8a] shrink-0" />
                    <span className="truncate">
                      Create &amp; Save: <strong className="font-extrabold">&ldquo;{searchTerm.trim()}&rdquo;</strong>
                    </span>
                  </span>
                  <span className="text-xs font-bold bg-[#1e3a8a] text-white px-2.5 py-1 rounded-lg shrink-0 ml-2">
                    Create
                  </span>
                </button>
              )}

              {/* Existing Categories List */}
              {filteredCategories.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Available Categories ({filteredCategories.length})
                  </div>
                  {filteredCategories.map((cat, idx) => {
                    const isSelected = (value || '').trim().toLowerCase() === (cat.name || '').trim().toLowerCase();
                    return (
                      <button
                        key={`cat_opt_${cat.id || idx}_${idx}`}
                        type="button"
                        onClick={() => handleSelectCategory(cat)}
                        className={`w-full text-left px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 text-[#1e3a8a] font-bold border-2 border-[#1e3a8a] shadow-2xs'
                            : 'bg-slate-50/80 hover:bg-slate-100 text-slate-800 border border-slate-200/80'
                        }`}
                      >
                        <span className="flex items-center gap-3 truncate">
                          <Tag className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#1e3a8a]' : 'text-slate-400'}`} />
                          <span className="truncate">{cat.name}</span>
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-[#1e3a8a] shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {filteredCategories.length === 0 && !searchTerm.trim() && programCategories.length === 0 && (
                <div className="py-12 text-center space-y-2">
                  <Tag className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No categories created yet</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Type a category name above to create and save it instantly.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
