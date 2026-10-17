import React, { useState } from 'react';
import { Tag, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ProgramCategorySettings: React.FC = () => {
  const { programCategories, programSubCategories, addProgramCategory, updateProgramCategory, deleteProgramCategory, addProgramSubCategory, updateProgramSubCategory, deleteProgramSubCategory } = useApp();
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [newSubCatNames, setNewSubCatNames] = useState<Record<string, string>>({});
  const [editingSubCatId, setEditingSubCatId] = useState<string | null>(null);
  const [editSubCatName, setEditSubCatName] = useState('');

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    await addProgramCategory(newCatName);
    setNewCatName('');
  };

  const handleAddSubCategory = async (categoryId: string) => {
    const name = newSubCatNames[categoryId];
    if (!name?.trim()) return;
    await addProgramSubCategory(name, categoryId);
    setNewSubCatNames(prev => ({ ...prev, [categoryId]: '' }));
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 pb-3 border-b border-slate-100">
        Program Categories & Subcategories
      </h2>

      <div className="flex gap-2">
        <input
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          placeholder="New Category Name"
          className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
        />
        <button onClick={handleAddCategory} className="px-4 py-2 bg-emerald-700 text-white rounded-xl font-bold text-sm">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {programCategories.map(cat => (
          <div key={cat.id} className="p-4 border border-slate-200 rounded-2xl bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              {editingCatId === cat.id ? (
                <div className="flex gap-2">
                  <input value={editCatName} onChange={e => setEditCatName(e.target.value)} className="px-2 py-1 border rounded" />
                  <button onClick={async () => { await updateProgramCategory(cat.id, editCatName); setEditingCatId(null); }}><Check className="text-emerald-600" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800">{cat.name}</h3>
                  <button onClick={() => { setEditingCatId(cat.id); setEditCatName(cat.name); }}><Edit2 className="w-3.5 h-3.5 text-slate-400" /></button>
                  <button onClick={() => deleteProgramCategory(cat.id)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></button>
                </div>
              )}
            </div>

            <div className="ml-6 space-y-2">
              {programSubCategories.filter(sub => sub.category_id === cat.id).map(sub => (
                <div key={sub.id} className="flex items-center justify-between text-sm">
                  {editingSubCatId === sub.id ? (
                    <div className="flex gap-2">
                      <input value={editSubCatName} onChange={e => setEditSubCatName(e.target.value)} className="px-2 py-1 border rounded" />
                      <button onClick={async () => { await updateProgramSubCategory(sub.id, editSubCatName); setEditingSubCatId(null); }}><Check className="text-emerald-600" /></button>
                    </div>
                  ) : (
                    <>
                      <span>{sub.name}</span>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingSubCatId(sub.id); setEditSubCatName(sub.name); }}><Edit2 className="w-3.5 h-3.5 text-slate-400" /></button>
                        <button onClick={() => deleteProgramSubCategory(sub.id)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <input
                  value={newSubCatNames[cat.id] || ''}
                  onChange={(e) => setNewSubCatNames(prev => ({ ...prev, [cat.id]: e.target.value }))}
                  placeholder="New Subcategory"
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm"
                />
                <button onClick={() => handleAddSubCategory(cat.id)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-xs">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
