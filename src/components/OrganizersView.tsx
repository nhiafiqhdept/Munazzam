import React, { useState } from 'react';
import {
  Users,
  PlusCircle,
  Search,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Mail,
  Phone,
  GraduationCap,
  Shield,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Organizer } from '../types';
import { ConfirmModal } from './ConfirmModal';

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

  if (!currentOrg) return null;

  // Filter organizers
  const filteredOrganizers = organizers.filter((orgzr) => {
    const matchesSearch =
      orgzr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      orgzr.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (orgzr.bio && orgzr.bio.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPos = selectedPosFilter === 'all' || orgzr.position === selectedPosFilter;

    return matchesSearch && matchesPos;
  });

  const uniquePositions = Array.from(new Set(organizers.map((o) => o.position)));

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
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">
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
            value={selectedPosFilter}
            onChange={(e) => setSelectedPosFilter(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">All Positions ({organizers.length})</option>
            {uniquePositions.map((pos) => (
              <option key={pos} value={pos}>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredOrganizers.map((orgzr, index) => (
            <div
              key={orgzr.id}
              id={`organizer-card-${orgzr.id}`}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden group"
            >
              {/* Profile Top Bar */}
              <div className="p-5 flex flex-col items-center text-center">
                {/* Photo */}
                <div className="relative mb-3.5">
                  <div className="w-24 h-24 rounded-full p-1 bg-white border-2 border-emerald-600/40 shadow-sm overflow-hidden group-hover:scale-105 transition-transform">
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
                  <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-xs">
                    {orgzr.display_order}
                  </span>
                </div>

                {/* Name & Position */}
                <h3 className="text-base font-bold text-slate-900 font-serif leading-snug group-hover:text-emerald-700 transition-colors">
                  {orgzr.name}
                </h3>

                <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200/60 shadow-2xs">
                  <Shield className="w-3 h-3 text-emerald-600" />
                  <span>{orgzr.position}</span>
                </div>

                {orgzr.academic_year && (
                  <p className="mt-2 text-[11px] font-medium text-slate-500 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    <span>{orgzr.academic_year}</span>
                  </p>
                )}

                {orgzr.bio && (
                  <p className="mt-3 text-xs text-slate-600 leading-relaxed line-clamp-3 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 text-left w-full">
                    {orgzr.bio}
                  </p>
                )}

                {/* Contact Info */}
                {(orgzr.email || orgzr.phone) && (
                  <div className="mt-3 pt-3 border-t border-slate-100 w-full space-y-1 text-left text-[11px] text-slate-600">
                    {orgzr.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{orgzr.email}</span>
                      </div>
                    )}
                    {orgzr.phone && (
                      <div className="flex items-center gap-2 truncate">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{orgzr.phone}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Admin Actions: Reorder & Edit / Delete */}
              {isAdmin && (
                <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
                  {/* Reorder Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 rounded-lg hover:bg-slate-200 transition-colors"
                      title="Move Up in Order"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === organizers.length - 1}
                      className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 rounded-lg hover:bg-slate-200 transition-colors"
                      title="Move Down in Order"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono ml-1">#{orgzr.display_order}</span>
                  </div>

                  {/* Edit & Delete */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenEditModal(orgzr)}
                      className="p-1.5 text-slate-600 hover:text-emerald-700 rounded-lg hover:bg-white transition-colors"
                      title="Edit Organizer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(orgzr)}
                      className="p-1.5 text-slate-600 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
                      title="Delete Organizer"
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
