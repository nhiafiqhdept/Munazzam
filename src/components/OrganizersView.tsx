import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  SlidersHorizontal,
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

  const getInitials = (name: string) => {
    if (!name) return 'LD';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Banner & Executive Action Header */}
      <section
        className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-card relative overflow-hidden"
        data-purpose="executive-header"
      >
        {/* Ambient decorative top-right gradient orb */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-brand-100/50 via-brand-50/20 to-transparent pointer-events-none rounded-full blur-2xl -mr-16 -mt-16" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Title & Subtitle with Icon Badge */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-200/70 flex items-center justify-center text-brand-700 shrink-0 shadow-inner">
              <Users className="w-6 h-6 text-brand-700" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-heading">
                  Organizers &amp; Office Bearers
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active Directory
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500 max-w-2xl font-normal leading-relaxed">
                Executive council, leadership board, and committee coordinators for {currentOrg.name}.
              </p>
            </div>
          </div>

          {/* Primary Call to Action */}
          {isAdmin && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                id="add-organizer-btn"
                onClick={onOpenAddModal}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white bg-brand-700 hover:bg-brand-800 transition shadow-md shadow-brand-700/25 active:scale-98"
                type="button"
              >
                <Plus className="w-4 h-4" />
                <span>Add Organizer</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Metrics Summary Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-500">
          <span className="font-medium text-slate-700">Directory Overview:</span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 font-semibold text-slate-700">
            {organizers.length} Total Leaders
          </span>
          <span className="text-slate-300">•</span>
          <span className="px-2.5 py-1 rounded-md bg-brand-50 font-semibold text-brand-700 border border-brand-100">
            {uniquePositions.length} Designated Roles
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-xs text-slate-400">Order is sync-sorted by hierarchy</span>
        </div>
      </section>

      {/* Search & Filters */}
      <div
        className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-subtle flex flex-col md:flex-row items-center gap-3"
        data-purpose="search-and-filters"
      >
        {/* Search Input */}
        <div className="relative w-full md:flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="search-organizers-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, position, or bio..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl transition duration-150 outline-none"
          />
        </div>

        {/* Filters & Sorting Actions */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Position Filter Select */}
          <div className="relative w-full md:w-56">
            <select
              id="filter-organizer-position-select"
              value={selectedPosFilter}
              onChange={(e) => setSelectedPosFilter(e.target.value)}
              className="w-full appearance-none pl-3.5 pr-10 py-2.5 text-sm font-medium bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl transition duration-150 cursor-pointer text-slate-700 outline-none"
            >
              <option value="all">All Positions ({organizers.length})</option>
              {uniquePositions.map((pos) => (
                <option key={`pos-opt-${pos}`} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          {/* Quick Sort indicator button */}
          <button
            className="shrink-0 p-2.5 text-slate-600 hover:text-brand-700 bg-slate-50 hover:bg-brand-50 border border-slate-200 rounded-xl transition"
            title="Hierarchy Ordering Active"
            type="button"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Leadership Cards Grid */}
      {filteredOrganizers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300 shadow-subtle">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-700 border border-brand-100 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-brand-700" />
          </div>
          <h3 className="text-base font-bold text-slate-900 font-heading">No Organizers Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery
              ? 'No members match your search criteria. Try clearing search filters.'
              : 'Add your first office bearer or executive committee coordinator.'}
          </p>
          {isAdmin && !searchQuery && (
            <button
              onClick={onOpenAddModal}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-700/20 transition active:scale-98"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Organizer</span>
            </button>
          )}
        </div>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          data-purpose="members-grid"
        >
          {filteredOrganizers.map((orgzr, index) => {
            const hasPhoto = Boolean(orgzr.photo && orgzr.photo.trim().length > 0);
            return (
              <article
                key={orgzr.id}
                id={`organizer-card-${orgzr.id}`}
                onClick={() => setSelectedDetailsOrg(orgzr)}
                className="group bg-white rounded-2xl border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col overflow-hidden relative cursor-pointer"
              >
                <div className="p-6 flex flex-col items-center text-center flex-1">
                  {/* Member Avatar */}
                  <div className="relative mb-4">
                    <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-brand-600 via-brand-400 to-indigo-300 shadow-sm">
                      <div className="w-full h-full rounded-full bg-brand-100 flex items-center justify-center overflow-hidden border-2 border-white">
                        {hasPhoto ? (
                          <img
                            src={orgzr.photo}
                            alt={orgzr.name}
                            className="w-full h-full object-cover rounded-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                const initialsSpan = document.createElement('span');
                                initialsSpan.className = 'text-xl font-bold text-brand-800';
                                initialsSpan.innerText = getInitials(orgzr.name);
                                parent.appendChild(initialsSpan);
                              }
                            }}
                          />
                        ) : (
                          <span className="text-xl font-bold text-brand-800">
                            {getInitials(orgzr.name)}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Active presence status dot */}
                    <span
                      className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-xs"
                      title="Active"
                    />
                  </div>

                  {/* Name & Role */}
                  <h3 className="font-bold text-slate-900 text-base leading-tight group-hover:text-brand-700 transition font-heading line-clamp-2">
                    {orgzr.name}
                  </h3>
                  <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
                    {orgzr.position}
                  </span>
                  <p className="mt-2 text-xs text-slate-400 font-medium line-clamp-2">
                    {orgzr.bio || (orgzr.academic_year ? `Batch: ${orgzr.academic_year}` : 'Executive Coordinator')}
                  </p>
                </div>

                {/* Management Footer / Action Controls */}
                {isAdmin && (
                  <div
                    className="px-4 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-slate-400 mt-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Reorder buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        aria-label="Move up"
                        className="p-1.5 hover:text-brand-700 hover:bg-white rounded-lg transition disabled:opacity-20"
                        title="Move Up"
                        type="button"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === organizers.length - 1}
                        aria-label="Move down"
                        className="p-1.5 hover:text-brand-700 hover:bg-white rounded-lg transition disabled:opacity-20"
                        title="Move Down"
                        type="button"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Edit & Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onOpenEditModal(orgzr)}
                        aria-label="Edit member"
                        className="p-1.5 hover:text-brand-700 hover:bg-white rounded-lg transition"
                        title="Edit Profile"
                        type="button"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(orgzr)}
                        aria-label="Delete member"
                        className="p-1.5 hover:text-red-600 hover:bg-white rounded-lg transition"
                        title="Remove Member"
                        type="button"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
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

