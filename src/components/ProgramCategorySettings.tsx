import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronRight, AlertCircle, FolderTree, Tag, Layers } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProgramCategory } from '../types';

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

  // Modal States
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  
  const [isAddSubModalOpen, setIsAddSubModalOpen] = useState(false);
  const [selectedParentCatId, setSelectedParentCatId] = useState('');
  const [newSubName, setNewSubName] = useState('');

  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editing Category state
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');

  // Editing Subcategory state
  const [editingSubCatId, setEditingSubCatId] = useState<string | null>(null);
  const [editSubCatName, setEditSubCatName] = useState('');

  // Category to confirm deletion
  const [deleteConfirmCat, setDeleteConfirmCat] = useState<ProgramCategory | null>(null);

  // Expanded categories map (defaults all expanded)
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCollapse = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handleOpenAddSub = (catId?: string) => {
    setSelectedParentCatId(catId || (programCategories[0]?.id ?? ''));
    setNewSubName('');
    setModalError('');
    setIsAddSubModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setModalError('Category name cannot be empty.');
      return;
    }
    setModalError('');
    try {
      setIsSubmitting(true);
      await addProgramCategory(trimmed);
      setNewCatName('');
      setIsAddCatModalOpen(false);
    } catch (err: any) {
      setModalError(err?.message || 'Failed to create category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSubCategory = async (e: React.FormEvent) => {
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
    setModalError('');
    try {
      setIsSubmitting(true);
      await addProgramSubCategory(trimmed, selectedParentCatId);
      setNewSubName('');
      setIsAddSubModalOpen(false);
    } catch (err: any) {
      setModalError(err?.message || 'Failed to create subcategory.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCatEdit = async (catId: string) => {
    const trimmed = editCatName.trim();
    if (!trimmed) return;
    try {
      await updateProgramCategory(catId, trimmed);
      setEditingCatId(null);
      setEditCatName('');
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!deleteConfirmCat) return;
    try {
      await deleteProgramCategory(deleteConfirmCat.id);
      setDeleteConfirmCat(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSaveSubCatEdit = async (subId: string) => {
    const trimmed = editSubCatName.trim();
    if (!trimmed) return;
    try {
      await updateProgramSubCategory(subId, trimmed);
      setEditingSubCatId(null);
      setEditSubCatName('');
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleDeleteSubCategory = async (subId: string) => {
    try {
      await deleteProgramSubCategory(subId);
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5 max-w-4xl mx-auto">
      {/* Header & Primary Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
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

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              setNewCatName('');
              setModalError('');
              setIsAddCatModalOpen(true);
            }}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenAddSub()}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-900 hover:bg-[#1e3a8a] text-white font-bold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subcategory</span>
          </button>
        </div>
      </div>

      {/* Categories Expandable Cards List */}
      <div className="space-y-3">
        {programCategories.length === 0 ? (
          <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
            <FolderTree className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-medium text-slate-500">No categories added yet. Click &ldquo;Add Category&rdquo; above.</p>
          </div>
        ) : (
          programCategories.map((cat, catIdx) => {
            const isEditing = editingCatId === cat.id;
            const isCollapsed = Boolean(collapsedCategories[cat.id]);
            const subCategories = programSubCategories.filter((sub) => sub.category_id === cat.id);

            return (
              <div
                key={`cat_${cat.id || catIdx}_${catIdx}`}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs transition"
              >
                {/* Category Header Row */}
                <div
                  onClick={() => toggleCollapse(cat.id)}
                  className="px-3.5 py-3 bg-slate-50/80 hover:bg-slate-100/70 border-b border-slate-100 flex items-center justify-between gap-2 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapse(cat.id);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer shrink-0"
                    >
                      {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editCatName}
                          onChange={(e) => setEditCatName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveCatEdit(cat.id);
                            if (e.key === 'Escape') setEditingCatId(null);
                          }}
                          className="flex-1 px-2.5 py-1 bg-white border border-emerald-600 rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveCatEdit(cat.id)}
                          className="p-1.5 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCatId(null)}
                          className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Tag className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                          {cat.name}
                        </span>
                        <span className="text-[11px] font-normal text-slate-500 shrink-0">
                          ({subCategories.length} subcategories)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setEditCatName(cat.name);
                        }}
                        className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg transition cursor-pointer"
                        title="Edit category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmCat(cat)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                        title="Delete category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded Subcategories Section */}
                {!isCollapsed && (
                  <div className="p-3.5 space-y-3 bg-white">
                    {subCategories.length === 0 ? (
                      <div className="flex items-center justify-between px-2 py-1.5">
                        <p className="text-xs text-slate-400 italic">No subcategories under this category.</p>
                        <button
                          type="button"
                          onClick={() => handleOpenAddSub(cat.id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Subcategory</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subcategories</span>
                          <button
                            type="button"
                            onClick={() => handleOpenAddSub(cat.id)}
                            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add to {cat.name}</span>
                          </button>
                        </div>
                        {subCategories.map((sub, subIdx) => {
                          const isSubEditing = editingSubCatId === sub.id;

                          if (isSubEditing) {
                            return (
                              <div
                                key={`sub_edit_${sub.id || subIdx}_${subIdx}`}
                                className="flex items-center gap-1.5 p-1.5 bg-slate-50 border border-emerald-600 rounded-xl"
                              >
                                <input
                                  type="text"
                                  value={editSubCatName}
                                  onChange={(e) => setEditSubCatName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveSubCatEdit(sub.id);
                                    if (e.key === 'Escape') setEditingSubCatId(null);
                                  }}
                                  className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveSubCatEdit(sub.id)}
                                  className="p-1 bg-emerald-700 text-white rounded-md hover:bg-emerald-800 transition cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingSubCatId(null)}
                                  className="p-1 bg-slate-200 text-slate-600 rounded-md hover:bg-slate-300 transition cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={`sub_item_${sub.id || subIdx}_${subIdx}`}
                              className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50/70 hover:bg-slate-100 border border-slate-200/80 rounded-xl transition"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="text-xs text-slate-800 font-medium truncate">
                                  {sub.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSubCatId(sub.id);
                                    setEditSubCatName(sub.name);
                                  }}
                                  className="p-1 text-slate-400 hover:text-emerald-700 rounded transition cursor-pointer"
                                  title="Edit subcategory"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubCategory(sub.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                  title="Delete subcategory"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 1. ADD CATEGORY MODAL */}
      {isAddCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 font-heading">Add New Category</h3>
              <button
                type="button"
                onClick={() => setIsAddCatModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
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

            <form onSubmit={handleSaveCategory} className="space-y-3">
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
                  placeholder="e.g. Academic, Cultural, Workshop..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCatModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newCatName.trim()}
                  className="flex-1 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. ADD SUBCATEGORY MODAL */}
      {isAddSubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 font-heading">Add New Subcategory</h3>
              <button
                type="button"
                onClick={() => setIsAddSubModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
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

            <form onSubmit={handleSaveSubCategory} className="space-y-3">
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
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  required
                >
                  <option value="" disabled>Select parent category...</option>
                  {programCategories.map((c, idx) => (
                    <option key={`modal_cat_opt_${c.id || idx}_${idx}`} value={c.id}>
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
                  placeholder="e.g. Seminar, Quiz, Debate..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddSubModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newSubName.trim() || !selectedParentCatId}
                  className="flex-1 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  Save Subcategory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Dialog */}
      {deleteConfirmCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="space-y-1 text-center">
              <h3 className="text-sm font-bold text-slate-900">
                Delete &ldquo;{deleteConfirmCat.name}&rdquo;?
              </h3>
              <p className="text-xs text-slate-500">
                This will also delete all subcategories under this category.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmCat(null)}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
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
