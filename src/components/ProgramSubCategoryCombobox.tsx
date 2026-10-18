import React, { useState, useMemo } from 'react';
import { ChevronDown, Check, Plus, X, Layers, Search, FolderTree } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ProgramSubCategoryComboboxProps {
  value: string;
  onChange: (subCategory: string) => void;
  categoryId?: string;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
}

export const ProgramSubCategoryCombobox: React.FC<ProgramSubCategoryComboboxProps> = ({
  value,
  onChange,
  categoryId,
  disabled = false,
  placeholder = 'Select subcategory...',
  id = 'program-subcategory-combobox-input',
}) => {
  const { programSubCategories } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Extract unique subcategories filtered by categoryId
  const availableSubCategories = useMemo(() => {
    return programSubCategories
      .filter((sub) => !categoryId || sub.category_id === categoryId)
      .map((sub) => sub.name)
      .filter((name, index, self) => self.indexOf(name) === index) // unique
      .sort((a, b) => a.localeCompare(b));
  }, [programSubCategories, categoryId]);

  const trimmedQuery = searchTerm.trim().toLowerCase();

  const filteredSubCategories = availableSubCategories.filter((sub) =>
    sub.toLowerCase().includes(trimmedQuery)
  );

  const exactMatch = availableSubCategories.find(
    (sub) => sub.trim().toLowerCase() === trimmedQuery
  );

  const handleSelectSubCategory = (subCat: string) => {
    onChange(subCat);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClearSubCategory = () => {
    onChange('');
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleApplyCustomSubCategory = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative w-full">
      {/* Trigger Button / Input Field */}
      <button
        type="button"
        id={id}
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
          <Layers className="w-4 h-4 text-slate-400 shrink-0" />
          <span className={`truncate ${!value ? 'text-slate-400 font-normal' : 'text-slate-900 font-semibold'}`}>
            {value || placeholder}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleClearSubCategory();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              title="Clear subcategory"
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
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 font-heading">
                    Select Subcategory
                  </h3>
                  <p className="text-xs text-slate-500">
                    Choose from linked subcategories or enter custom
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
                  placeholder="Search subcategories or type new..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  autoFocus
                />
              </div>
            </div>

            {/* Scrollable Options List */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2">
              {/* Unassigned Option */}
              <button
                type="button"
                onClick={() => handleClearSubCategory()}
                className={`w-full text-left px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  !value
                    ? 'bg-indigo-50/80 text-indigo-700 border border-indigo-200'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                }`}
              >
                <span className="flex items-center gap-3 truncate">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                  <span className="truncate">— No Subcategory —</span>
                </span>
                {!value && <Check className="w-4 h-4 text-indigo-700 shrink-0 ml-2" />}
              </button>

              {/* Use Custom Subcategory Action */}
              {searchTerm.trim().length > 0 && !exactMatch && (
                <button
                  type="button"
                  onClick={() => handleApplyCustomSubCategory(searchTerm)}
                  className="w-full text-left px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-bold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center justify-between transition-colors cursor-pointer shadow-2xs"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Plus className="w-4 h-4 text-indigo-700 shrink-0" />
                    <span className="truncate">
                      Use subcategory: <strong className="font-extrabold">&ldquo;{searchTerm.trim()}&rdquo;</strong>
                    </span>
                  </span>
                  <span className="text-xs font-bold bg-indigo-700 text-white px-2.5 py-1 rounded-lg shrink-0 ml-2">
                    Select
                  </span>
                </button>
              )}

              {/* Existing Subcategories List */}
              {filteredSubCategories.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Linked Subcategories ({filteredSubCategories.length})
                  </div>
                  {filteredSubCategories.map((sub, idx) => {
                    const isSelected = (value || '').trim().toLowerCase() === sub.trim().toLowerCase();
                    return (
                      <button
                        key={`sub_opt_${sub}_${idx}`}
                        type="button"
                        onClick={() => handleSelectSubCategory(sub)}
                        className={`w-full text-left px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 text-indigo-700 font-bold border-2 border-indigo-600 shadow-2xs'
                            : 'bg-slate-50/80 hover:bg-slate-100 text-slate-800 border border-slate-200/80'
                        }`}
                      >
                        <span className="flex items-center gap-3 truncate">
                          <Layers className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-700' : 'text-slate-400'}`} />
                          <span className="truncate">{sub}</span>
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-indigo-700 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {filteredSubCategories.length === 0 && !searchTerm.trim() && (
                <div className="py-12 text-center space-y-2">
                  <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No subcategories found for this category</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Type any custom subcategory name above to use it.
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
