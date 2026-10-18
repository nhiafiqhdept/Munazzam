import React, { useState } from 'react';
import { Users, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Organizer } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { OrganizerDetailsModal } from './OrganizerDetailsModal';
import { getRoleBadgeStyle } from '../utils/helpers';
import { OrganizerAvatar } from './common/OrganizerAvatar';

interface OrganizersViewProps {
  onOpenAddModal: () => void;
  onOpenEditModal: (organizer: Organizer) => void;
}

export const OrganizersView: React.FC<OrganizersViewProps> = ({
  onOpenAddModal,
  onOpenEditModal,
}) => {
  const { currentOrg, organizers, deleteOrganizer, isAdmin } = useApp();
  const [deleteTarget, setDeleteTarget] = useState<Organizer | null>(null);
  const [selectedDetailsOrgId, setSelectedDetailsOrgId] = useState<string | null>(null);

  const selectedDetailsOrg = organizers.find((o) => o.id === selectedDetailsOrgId) || null;

  if (!currentOrg) return null;

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
    <div className="space-y-4 sm:space-y-6 pb-28 lg:pb-16 max-w-7xl lg:max-w-[1400px] mx-auto">
      {/* Compact Header with Deep Navy & Royal Blue Accent - Full Title Never Truncated */}
      <section
        className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs relative flex items-center justify-between gap-3"
        data-purpose="executive-header"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#0f1f4b] border border-blue-900/50 flex items-center justify-center text-white shrink-0 shadow-sm font-heading font-black">
            <Users className="w-5 h-5 text-amber-300" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight font-heading leading-tight whitespace-normal break-words">
              Organizers &amp; Office Bearers
            </h1>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              Executive committee members and academic leadership team
            </p>
          </div>
        </div>

        {/* Desktop-only Add Organizer Header Button (hidden on mobile) */}
        {isAdmin && (
          <button
            id="add-organizer-btn"
            onClick={onOpenAddModal}
            className="hidden sm:inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#1e3a8a] hover:bg-[#1d4ed8] transition shadow-xs shrink-0 cursor-pointer active:scale-98"
            type="button"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Add Organizer</span>
          </button>
        )}
      </section>

      {/* Leadership Cards Grid: 2 columns on mobile (below sm), 3 on sm/md, 4 on lg, 5 on xl/desktop */}
      {organizers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#1e3a8a] border border-blue-200 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-[#1e3a8a]" />
          </div>
          <h3 className="text-base font-bold text-slate-900 font-heading">No Organizers Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Add your first office bearer or executive committee coordinator.
          </p>
          {isAdmin && (
            <button
              onClick={onOpenAddModal}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl shadow-md transition active:scale-98 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Organizer</span>
            </button>
          )}
        </div>
      ) : (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4 lg:gap-5"
          data-purpose="members-grid"
        >
          {organizers.map((orgzr) => {
            const roleStyle = getRoleBadgeStyle(orgzr.position);

            return (
              <article
                key={orgzr.id}
                id={`organizer-card-${orgzr.id}`}
                onClick={() => setSelectedDetailsOrgId(orgzr.id)}
                className="group bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-400 transition-all duration-200 hover:-translate-y-1 flex flex-col overflow-hidden relative cursor-pointer p-2.5 sm:p-4 lg:p-5 text-center items-center justify-between h-full min-h-[195px] sm:min-h-[235px]"
              >
                {/* Member Avatar with Photo & Active Presence Dot */}
                <div className="relative mb-2 sm:mb-3 shrink-0">
                  <div className="w-14 h-14 sm:w-18 sm:h-18 lg:w-20 lg:h-20 rounded-full p-0.5 bg-gradient-to-tr from-[#0f1f4b] via-[#1d4ed8] to-indigo-400 shadow-sm mx-auto group-hover:scale-105 transition-transform duration-200">
                    <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-white">
                      <OrganizerAvatar
                        photo={orgzr.photo}
                        name={orgzr.name}
                        className="w-full h-full"
                        imgClassName="w-full h-full object-cover rounded-full"
                      />
                    </div>
                  </div>

                  {/* Active Presence Status Dot (non-emerald green) */}
                  <span
                    className="absolute bottom-0 right-0 sm:bottom-0.5 sm:right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-blue-500 border-2 border-white rounded-full shadow-xs ring-1 ring-blue-600/30"
                    title="Active"
                  />
                </div>

                {/* Name, Role & Subtitle */}
                <div className="flex flex-col items-center w-full min-w-0 flex-1 justify-between">
                  <h3 className="font-semibold text-slate-900 text-xs sm:text-sm lg:text-base leading-snug group-hover:text-[#1d4ed8] transition-colors font-heading line-clamp-2 w-full text-center px-0.5 break-words min-h-[30px] sm:min-h-0 flex items-center justify-center">
                    {orgzr.name}
                  </h3>

                  <div className="w-full flex flex-col items-center mt-1.5 sm:mt-2 space-y-0.5 sm:space-y-1">
                    {/* Color-coded role badge */}
                    <span
                      className={`inline-flex items-center justify-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[8.5px] sm:text-xs font-bold uppercase tracking-wider border shadow-2xs line-clamp-1 max-w-full text-center truncate ${roleStyle.badge}`}
                    >
                      {orgzr.position}
                    </span>

                    <p className="text-[10px] sm:text-xs text-slate-500 font-medium line-clamp-1 w-full text-center leading-tight truncate">
                      {orgzr.bio || (orgzr.academic_year ? `Batch: ${orgzr.academic_year}` : 'Coordinator')}
                    </p>
                  </div>

                  {/* Card Footer with explicit Active status & action prompt */}
                  <div className="w-full pt-2 mt-2 sm:pt-2.5 sm:mt-3 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] font-medium">
                    <span className="inline-flex items-center gap-1 sm:gap-1.5 text-green-700 font-semibold bg-green-50 border border-green-200/80 px-1.5 py-0.5 sm:px-2 rounded-full text-[9px] sm:text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                      Active
                    </span>
                    <span className="text-slate-400 group-hover:text-[#1d4ed8] transition-colors font-semibold text-[9.5px] sm:text-[11px]">
                      View &rarr;
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Mobile-Only Floating Action Button (FAB) - Positioned above the fixed bottom navigation tab bar */}
      {isAdmin && (
        <button
          id="mobile-add-organizer-fab"
          type="button"
          onClick={onOpenAddModal}
          aria-label="Add Organizer"
          className="sm:hidden fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-40 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white font-bold text-xs shadow-[0_8px_24px_rgba(30,58,138,0.45)] border border-blue-400/30 transition-all duration-200 active:scale-95 cursor-pointer touch-manipulation select-none"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Organizer</span>
        </button>
      )}

      {/* Organizer Full Profile Modal */}
      <OrganizerDetailsModal
        isOpen={Boolean(selectedDetailsOrg)}
        organizer={selectedDetailsOrg}
        onClose={() => setSelectedDetailsOrgId(null)}
        onEdit={onOpenEditModal}
        onDelete={(org) => setDeleteTarget(org)}
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
