import React, { useState, useMemo } from 'react';
import {
  FolderTree,
  Layers,
  Plus,
  ArrowRight,
  ArrowLeft,
  MoreVertical,
  Edit2,
  Trash2,
  Search,
  X,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProgramCategory, ProgramSubCategory } from '../types';

type ViewMode = 'hub' | 'categories' | 'subcategories';

export const ProgramCategorySettings: React.FC = () => {
  const {
    programCategories,
    programSubCategories,
    addProgramCategory,
    updateProgramCategory,
    deleteProgramCategory,
    addProgramSubCategory,
    updateProgramSubCategory,
    deleteProgramSubCategory,
  } = useApp();

  // Navigation View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('hub');

  // Search & Filter States
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [subSearchQuery, setSubSearchQuery] = useState('');

  // Three-dot popover menu tracking (id of category or subcategory)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Common Modal / Form States
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Add Category Modal
  const [isAddCatOpen, setIsAddCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // 2. Edit Category Modal
  const [catToEdit, setCatToEdit] = useState<ProgramCategory | null>(null);
  const [editCatName, setEditCatName] = useState('');

  // 3. Delete Category Modal
  const [catToDelete, setCatToDelete] = useState<ProgramCategory | null>(null);

  // 4. Add Subcategory Modal
  const [isAddSubOpen, setIsAddSubOpen] = useState(false);
  const [selectedParentCatId, setSelectedParentCatId] = useState('');
  const [newSubName, setNewSubName] = useState('');

  // 5. Edit Subcategory Modal
  const [subToEdit, setSubToEdit] = useState<ProgramSubCategory | null>(null);
  const [editSubParentCatId, setEditSubParentCatId] = useState('');
  const [editSubName, setEditSubName] = useState('');

  // 6. Delete Subcategory Modal
  const [subToDelete, setSubToDelete] = useState<ProgramSubCategory | null>(null);

  // Toggle three-dot menu
  const toggleMenu = (id: string) => {
    setOpenMenuId((prev) => (prev === id ? null : id));
  };

  // Helper map for parent category lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    programCategories.forEach((c) => {
      map.set(c.id, c.name);
    });
    return map;
  }, [programCategories]);

  // Subcategory count per category
  const subCountPerCat = useMemo(() => {
    const counts: Record<string, number> = {};
    programSubCategories.forEach((s) => {
      counts[s.category_id] = (counts[s.category_id] || 0) + 1;
    });
    return counts;
  }, [programSubCategories]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    const query = catSearchQuery.trim().toLowerCase();
    if (!query) return programCategories;
    return programCategories.filter((c) => (c.name || '').toLowerCase().includes(query));
  }, [programCategories, catSearchQuery]);

  // Filtered subcategories
  const filteredSubCategories = useMemo(() => {
    let list = programSubCategories;
    if (categoryFilter !== 'all') {
      list = list.filter((s) => s.category_id === categoryFilter);
    }
    const query = subSearchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter((s) => {
        const parentName = categoryMap.get(s.category_id) || '';
        return (
          (s.name || '').toLowerCase().includes(query) ||
          parentName.toLowerCase().includes(query)
        );
      });
    }
    return list;
  }, [programSubCategories, categoryFilter, subSearchQuery, categoryMap]);

  // Handlers for Category CRUD
  const handleOpenAddCat = () => {
    setNewCatName('');
    setModalError('');
    setIsAddCatOpen(true);
    setOpenMenuId(null);
  };

  const handleSaveAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setModalError('Category name cannot be empty.');
      return;
    }
    try {
      setIsSubmitting(true);
      setModalError('');
      await addProgramCategory(trimmed);
      setIsAddCatOpen(false);
      setNewCatName('');
    } catch (err: any) {
      setModalError(err?.message || 'Failed to add category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditCat = (cat: ProgramCategory) => {
    setCatToEdit(cat);
    setEditCatName(cat.name);
    setModalError('');
    setOpenMenuId(null);
  };

  const handleSaveEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catToEdit) return;
    const trimmed = editCatName.trim();
    if (!trimmed) {
      setModalError('Category name cannot be empty.');
      return;
    }
    try {
      setIsSubmitting(true);
      setModalError('');
      await updateProgramCategory(catToEdit.id, trimmed);
      setCatToEdit(null);
      setEditCatName('');
    } catch (err: any) {
      setModalError(err?.message || 'Failed to update category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!catToDelete) return;
    try {
      setIsSubmitting(true);
      await deleteProgramCategory(catToDelete.id);
      setCatToDelete(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers for Subcategory CRUD
  const handleOpenAddSub = (defaultParentId?: string) => {
    const parentId =
      defaultParentId ||
      (categoryFilter !== 'all' ? categoryFilter : programCategories[0]?.id ?? '');
    setSelectedParentCatId(parentId);
    setNewSubName('');
    setModalError('');
    setIsAddSubOpen(true);
    setOpenMenuId(null);
  };

  const handleSaveAddSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSubName.trim();
    if (!trimmed) {
      setModalError('Subcategory name cannot be empty.');
      return;
    }
    if (!selectedParentCatId) {
      setModalError('Please select a parent category.');
      return;
    }
    try {
      setIsSubmitting(true);
      setModalError('');
      await addProgramSubCategory(trimmed, selectedParentCatId);
      setIsAddSubOpen(false);
      setNewSubName('');
    } catch (err: any) {
      setModalError(err?.message || 'Failed to add subcategory.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditSub = (sub: ProgramSubCategory) => {
    setSubToEdit(sub);
    setEditSubParentCatId(sub.category_id);
    setEditSubName(sub.name);
    setModalError('');
    setOpenMenuId(null);
  };

  const handleSaveEditSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subToEdit) return;
    const trimmed = editSubName.trim();
    if (!trimmed) {
      setModalError('Subcategory name cannot be empty.');
      return;
    }
    if (!editSubParentCatId) {
      setModalError('Parent category is required.');
      return;
    }
    try {
      setIsSubmitting(true);
      setModalError('');
      await updateProgramSubCategory(subToEdit.id, trimmed, editSubParentCatId);
      setSubToEdit(null);
      setEditSubName('');
    } catch (err: any) {
      setModalError(err?.message || 'Failed to update subcategory.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteSubCategory = async () => {
    if (!subToDelete) return;
    try {
      setIsSubmitting(true);
      await deleteProgramSubCategory(subToDelete.id);
      setSubToDelete(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-3.5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5 max-w-4xl mx-auto relative">
      {/* Invisible backdrop to dismiss any open three-dot menu */}
      {openMenuId && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setOpenMenuId(null)}
          aria-hidden="true"
        />
      )}

      {/* ========================================================= */}
      {/* 1. MAIN LANDING PAGE (HUB): TWO PROMINENT ACTION CARDS    */}
      {/* ========================================================= */}
      {viewMode === 'hub' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 shadow-2xs">
                <FolderTree className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading tracking-tight">
                  Categories &amp; Subcategories
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <span>{programCategories.length} Categories</span>
                  <span>&bull;</span>
                  <span>{programSubCategories.length} Subcategories</span>
                </div>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
              <button
                type="button"
                onClick={handleOpenAddCat}
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Add Category</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenAddSub()}
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-900 hover:bg-[#1e3a8a] text-white font-bold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Add Subcategory</span>
              </button>
            </div>
          </div>

          {/* TWO COMPACT ACTION CARDS (2x1 Grid on Mobile & Desktop) */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
            {/* CARD 1: Categories (Left) */}
            <div
              onClick={() => setViewMode('categories')}
              className="bg-white hover:bg-emerald-50/20 border-2 border-emerald-100 hover:border-emerald-500 rounded-2xl p-3 sm:p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-[110px] sm:min-h-[135px]"
            >
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                    <FolderTree className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-700" />
                  </div>
                  <span className="text-base sm:text-2xl font-extrabold font-heading text-emerald-800 tracking-tight">
                    {programCategories.length}
                  </span>
                </div>

                <div className="mt-2 sm:mt-2.5">
                  <h3 className="text-xs sm:text-sm lg:text-base font-bold text-slate-900 group-hover:text-emerald-800 transition-colors leading-tight truncate">
                    Categories
                  </h3>
                </div>
              </div>

              <div className="pt-2 sm:pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-emerald-700 group-hover:text-emerald-800 mt-2">
                <span>Manage &rarr;</span>
                <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* CARD 2: Subcategories (Right) */}
            <div
              onClick={() => setViewMode('subcategories')}
              className="bg-white hover:bg-blue-50/20 border-2 border-blue-100 hover:border-[#1e3a8a] rounded-2xl p-3 sm:p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-[110px] sm:min-h-[135px]"
            >
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 border border-blue-200 text-[#1e3a8a] flex items-center justify-center shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                    <Layers className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#1e3a8a]" />
                  </div>
                  <span className="text-base sm:text-2xl font-extrabold font-heading text-blue-900 tracking-tight">
                    {programSubCategories.length}
                  </span>
                </div>

                <div className="mt-2 sm:mt-2.5">
                  <h3 className="text-xs sm:text-sm lg:text-base font-bold text-slate-900 group-hover:text-[#1e3a8a] transition-colors leading-tight truncate">
                    Subcategories
                  </h3>
                </div>
              </div>

              <div className="pt-2 sm:pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-[#1e3a8a] group-hover:text-blue-900 mt-2">
                <span>Manage &rarr;</span>
                <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. DEDICATED CATEGORIES MANAGEMENT PAGE                   */}
      {/* ========================================================= */}
      {viewMode === 'categories' && (
        <div className="space-y-4 sm:space-y-5 animate-in fade-in-50">
          {/* Top Bar with Back Button, Title, Count & Add Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode('hub')}
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                title="Back to Hub"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                    Categories
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {programCategories.length} Total
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Manage primary categories for event recording and filtering.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenAddCat}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer self-stretch sm:self-auto shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Add Category</span>
            </button>
          </div>

          {/* Search Bar if multiple categories */}
          {programCategories.length > 3 && (
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={catSearchQuery}
                onChange={(e) => setCatSearchQuery(e.target.value)}
                placeholder="Search categories..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          )}

          {/* Categories List */}
          <div className="space-y-2">
            {filteredCategories.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <FolderTree className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-medium text-slate-600">
                  {catSearchQuery ? 'No categories match your search.' : 'No categories found.'}
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddCat}
                  className="px-3 py-1.5 bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Category</span>
                </button>
              </div>
            ) : (
              filteredCategories.map((cat, idx) => {
                const menuKey = `cat_${cat.id}`;
                const isMenuOpen = openMenuId === menuKey;
                const subCount = subCountPerCat[cat.id] || 0;

                return (
                  <div
                    key={`cat_row_${cat.id || idx}_${idx}`}
                    className="p-3.5 sm:px-4 sm:py-3.5 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-xl flex items-center justify-between gap-3 transition shadow-2xs relative"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm break-words leading-snug">
                          {cat.name}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                          ({subCount} {subCount === 1 ? 'subcategory' : 'subcategories'})
                        </span>
                      </div>
                    </div>

                    {/* Three-Dot Menu */}
                    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        aria-label="Category options"
                        onClick={() => toggleMenu(menuKey)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-32 animate-in fade-in-50 zoom-in-95">
                          <button
                            type="button"
                            onClick={() => handleOpenEditCat(cat)}
                            className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-700 flex items-center gap-2 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCatToDelete(cat);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. DEDICATED SUBCATEGORIES MANAGEMENT PAGE                */}
      {/* ========================================================= */}
      {viewMode === 'subcategories' && (
        <div className="space-y-4 sm:space-y-5 animate-in fade-in-50">
          {/* Top Bar with Back Button, Title, Count & Add Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode('hub')}
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                title="Back to Hub"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                    Subcategories
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200">
                    {programSubCategories.length} Total
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Manage subcategories linked under their parent categories.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenAddSub()}
              className="px-4 py-2.5 bg-slate-900 hover:bg-[#1e3a8a] text-white font-bold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer self-stretch sm:self-auto shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Add Subcategory</span>
            </button>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Category Filter Dropdown */}
            <div className="sm:w-64 relative shrink-0">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Filter className="w-3.5 h-3.5" />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] cursor-pointer"
              >
                <option value="all">All Categories ({programSubCategories.length})</option>
                {programCategories.map((c, idx) => {
                  const count = subCountPerCat[c.id] || 0;
                  return (
                    <option key={`sub_filter_${c.id || idx}_${idx}`} value={c.id}>
                      {c.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Subcategory Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={subSearchQuery}
                onChange={(e) => setSubSearchQuery(e.target.value)}
                placeholder="Search subcategory name or parent..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]"
              />
            </div>
          </div>

          {/* Subcategories List */}
          <div className="space-y-2">
            {filteredSubCategories.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-medium text-slate-600">
                  {subSearchQuery || categoryFilter !== 'all'
                    ? 'No subcategories match the selected filter.'
                    : 'No subcategories found.'}
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenAddSub()}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-[#1e3a8a] text-white text-xs font-bold rounded-xl transition cursor-pointer inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Subcategory</span>
                </button>
              </div>
            ) : (
              filteredSubCategories.map((sub, idx) => {
                const subMenuKey = `sub_${sub.id}`;
                const isMenuOpen = openMenuId === subMenuKey;
                const parentName = categoryMap.get(sub.category_id) || 'Unassigned Parent';

                return (
                  <div
                    key={`sub_row_${sub.id || idx}_${idx}`}
                    className="p-3.5 sm:px-4 sm:py-3 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-xl flex items-center justify-between gap-3 transition shadow-2xs relative"
                  >
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900 text-xs sm:text-sm break-words leading-snug">
                          {sub.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/80 whitespace-nowrap">
                          {parentName}
                        </span>
                      </div>
                    </div>

                    {/* Three-Dot Menu */}
                    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        aria-label="Subcategory options"
                        onClick={() => toggleMenu(subMenuKey)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-32 animate-in fade-in-50 zoom-in-95">
                          <button
                            type="button"
                            onClick={() => handleOpenEditSub(sub)}
                            className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-700 flex items-center gap-2 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSubToDelete(sub);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALS / FORMS (Compact, Dedicated, Non-Permanent)        */}
      {/* ========================================================= */}

      {/* 1. ADD CATEGORY MODAL */}
      {isAddCatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 font-heading">Add Category</h3>
              <button
                type="button"
                onClick={() => setIsAddCatOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAddCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => {
                    setNewCatName(e.target.value);
                    if (modalError) setModalError('');
                  }}
                  placeholder="e.g. Academic, Cultural, Sports..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCatOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newCatName.trim()}
                  className="flex-1 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. EDIT CATEGORY MODAL */}
      {catToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 font-heading">Edit Category</h3>
              <button
                type="button"
                onClick={() => setCatToEdit(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editCatName}
                  onChange={(e) => {
                    setEditCatName(e.target.value);
                    if (modalError) setModalError('');
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCatToEdit(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !editCatName.trim()}
                  className="flex-1 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. DELETE CATEGORY CONFIRMATION DIALOG */}
      {catToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="space-y-1.5 text-center">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Delete &ldquo;{catToDelete.name}&rdquo;?
              </h3>
              <p className="text-xs text-slate-500">
                This action is permanent and will delete all subcategories linked to this category.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCatToDelete(null)}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                disabled={isSubmitting}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. ADD SUBCATEGORY MODAL */}
      {isAddSubOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 font-heading">Add Subcategory</h3>
              <button
                type="button"
                onClick={() => setIsAddSubOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAddSubCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Parent Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedParentCatId}
                  onChange={(e) => {
                    setSelectedParentCatId(e.target.value);
                    if (modalError) setModalError('');
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]"
                  required
                >
                  <option value="" disabled>Select parent category...</option>
                  {programCategories.map((c, idx) => (
                    <option key={`sub_modal_cat_${c.id || idx}_${idx}`} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Subcategory Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSubName}
                  onChange={(e) => {
                    setNewSubName(e.target.value);
                    if (modalError) setModalError('');
                  }}
                  placeholder="e.g. Seminar, Workshop, Symposium..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddSubOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newSubName.trim() || !selectedParentCatId}
                  className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-[#1e3a8a] text-white font-bold text-xs rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. EDIT SUBCATEGORY MODAL */}
      {subToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 font-heading">Edit Subcategory</h3>
              <button
                type="button"
                onClick={() => setSubToEdit(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditSubCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Parent Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editSubParentCatId}
                  onChange={(e) => {
                    setEditSubParentCatId(e.target.value);
                    if (modalError) setModalError('');
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]"
                  required
                >
                  {programCategories.map((c, idx) => (
                    <option key={`edit_sub_parent_${c.id || idx}_${idx}`} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Subcategory Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editSubName}
                  onChange={(e) => {
                    setEditSubName(e.target.value);
                    if (modalError) setModalError('');
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubToEdit(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !editSubName.trim() || !editSubParentCatId}
                  className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-[#1e3a8a] text-white font-bold text-xs rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DELETE SUBCATEGORY CONFIRMATION DIALOG */}
      {subToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="space-y-1.5 text-center">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Delete &ldquo;{subToDelete.name}&rdquo;?
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete this subcategory?
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSubToDelete(null)}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSubCategory}
                disabled={isSubmitting}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
