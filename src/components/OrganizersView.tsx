import React, { useState } from 'react';
import {
  Users,
  PlusCircle,
  Search,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Shield,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Organizer } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { OrganizerDetailsModal } from './OrganizerDetailsModal';

interface OrganizersViewProps {
  onOpenAddModal: () => void;
  onOpenEditModal: (organizer: Organizer) => void;
}

export const OrganizersView: React.FC<OrganizersViewProps> = ({
  onOpenAddModal,
  onOpenEditModal,
}) => {
  const { currentOrg, organizers, deleteOrganizer, reorderOrganizers, isAdmin } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosFilter, setSelectedPosFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<Organizer | null>(null);
  const [selectedDetailsOrg, setSelectedDetailsOrg] = useState<Organizer | null>(null);

  if (!currentOrg) return null;

  // Filter organizers
  const filteredOrganizers = organizers.filter((orgzr) => {
    const name = orgzr.name || '';
    const pos = orgzr.position || '';
    const bio = orgzr.bio || '';

    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pos.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bio.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPos =
      selectedPosFilter === 'all' ||
      pos.trim().toLowerCase() === selectedPosFilter.trim().toLowerCase();

    return matchesSearch && matchesPos;
  });

  const uniquePositions = Array.from(
    new Set(
      organizers
        .map((o) => (o.position ? o.position.trim() : ''))
        .filter((pos): pos is string => Boolean(pos && pos.length > 0))
    )
  ).sort();

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newItems = [...organizers];
    const temp = newItems[index];
    newItems[index] = newItems[index - 1];
    newItems[index - 1] = temp;
    reorderOrganizers(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index >= organizers.length - 1) return;
    const newItems = [...organizers];
    const temp = newItems[index];
    newItems[index] = newItems[index + 1];
    newItems[index + 1] = temp;
    reorderOrganizers(newItems);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteOrganizer(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">
              Organizers & Office Bearers
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Executive council, leadership board, and committee coordinators for {currentOrg.name}.
          </p>
        </div>

        {isAdmin && (
          <button
            id="add-organizer-btn"
            onClick={onOpenAddModal}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2 text-sm shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Organizer</span>
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="search-organizers-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, position, or bio..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {uniquePositions.length > 0 && (
          <select
            id="filter-organizer-position-select"
            value={selectedPosFilter}
            onChange={(e) => setSelectedPosFilter(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option key="all" value="all">All Positions ({organizers.length})</option>
            {uniquePositions.map((pos) => (
              <option key={`pos-opt-${pos}`} value={pos}>
                {pos}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Organizers Grid */}
      {filteredOrganizers.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Organizers Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery ? 'Try clearing your search filters.' : 'Add your first office bearer or committee member.'}
          </p>
          {isAdmin && !searchQuery && (
            <button
              onClick={onOpenAddModal}
              className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              + Add Organizer
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredOrganizers.map((orgzr, index) => (
            <div
              key={orgzr.id}
              id={`organizer-card-${orgzr.id}`}
              onClick={() => setSelectedDetailsOrg(orgzr)}
              className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-200 transition-all flex flex-col items-center p-4 sm:p-6 text-center cursor-pointer group"
            >
              {/* Photo */}
              <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full p-1 bg-white border border-slate-100 shadow-sm overflow-hidden mb-3 group-hover:scale-105 transition-transform">
                <img
                  src={orgzr.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'}
                  alt={orgzr.name}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';
                  }}
                />
              </div>

              {/* Name & Position */}
              <h3 className="text-xs sm:text-base font-bold text-slate-900 font-heading leading-tight line-clamp-2">
                {orgzr.name}
              </h3>
              <p className="mt-1 text-[10px] sm:text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                {orgzr.position}
              </p>

              {/* Admin Actions: Subtle icons */}
              {isAdmin && (
                <div 
                  className="mt-4 pt-3 border-t border-slate-50 w-full flex items-center justify-between"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 text-slate-400 hover:text-slate-900 disabled:opacity-20 transition-colors"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === organizers.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-900 disabled:opacity-20 transition-colors"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onOpenEditModal(orgzr)}
                      className="p-1 text-slate-400 hover:text-emerald-700 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(orgzr)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Organizer Full Profile Modal */}
      <OrganizerDetailsModal
        isOpen={Boolean(selectedDetailsOrg)}
        organizer={selectedDetailsOrg}
        onClose={() => setSelectedDetailsOrg(null)}
        onEdit={onOpenEditModal}
        isAdmin={isAdmin}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Remove Organizer"
        message={`Are you sure you want to delete ${deleteTarget?.name} (${deleteTarget?.position}) from the organization's office bearers list?`}
        confirmText="Yes, Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
