import React, { useState } from 'react';
import { Users, Plus } from 'lucide-react';
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
  const { currentOrg, organizers, deleteOrganizer, isAdmin } = useApp();
  const [deleteTarget, setDeleteTarget] = useState<Organizer | null>(null);
  const [selectedDetailsOrg, setSelectedDetailsOrg] = useState<Organizer | null>(null);

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
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Compact Header with Inline Add Action */}
      <section
        className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-card relative overflow-hidden flex items-center justify-between gap-3"
        data-purpose="executive-header"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-50 border border-brand-200/70 flex items-center justify-center text-brand-700 shrink-0 shadow-inner">
            <Users className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-brand-700" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight font-heading truncate">
            Organizers &amp; Office Bearers
          </h1>
        </div>

        {isAdmin && (
          <button
            id="add-organizer-btn"
            onClick={onOpenAddModal}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-bold text-xs sm:text-sm text-white bg-brand-700 hover:bg-brand-800 transition shadow-xs shrink-0 cursor-pointer"
            type="button"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Add Organizer</span>
          </button>
        )}
      </section>

      {/* Leadership Cards Grid (3 Columns on Mobile) */}
      {organizers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300 shadow-subtle">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-700 border border-brand-100 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-brand-700" />
          </div>
          <h3 className="text-base font-bold text-slate-900 font-heading">No Organizers Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Add your first office bearer or executive committee coordinator.
          </p>
          {isAdmin && (
            <button
              onClick={onOpenAddModal}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-98 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Organizer</span>
            </button>
          )}
        </div>
      ) : (
        <div
          className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-4"
          data-purpose="members-grid"
        >
          {organizers.map((orgzr) => {
            const hasPhoto = Boolean(orgzr.photo && orgzr.photo.trim().length > 0);
            return (
              <article
                key={orgzr.id}
                id={`organizer-card-${orgzr.id}`}
                onClick={() => setSelectedDetailsOrg(orgzr)}
                className="group bg-white rounded-2xl border border-slate-200/90 shadow-card hover:shadow-lg hover:border-brand-300 transition-all duration-200 flex flex-col overflow-hidden relative cursor-pointer p-3 sm:p-4 text-center items-center justify-between"
              >
                {/* Member Avatar */}
                <div className="relative mb-2">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 bg-gradient-to-tr from-brand-600 via-brand-400 to-indigo-300 shadow-sm mx-auto">
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
                              initialsSpan.className = 'text-xs sm:text-sm font-bold text-brand-800';
                              initialsSpan.innerText = getInitials(orgzr.name);
                              parent.appendChild(initialsSpan);
                            }
                          }}
                        />
                      ) : (
                        <span className="text-xs sm:text-sm font-bold text-brand-800">
                          {getInitials(orgzr.name)}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Active presence status dot */}
                  <span
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 border-2 border-white rounded-full shadow-xs"
                    title="Active"
                  />
                </div>

                {/* Name, Role & Subtitle */}
                <div className="flex flex-col items-center w-full min-w-0">
                  <h3 className="font-semibold sm:font-bold text-slate-900 text-[13px] sm:text-sm leading-tight group-hover:text-brand-700 transition font-heading line-clamp-2 w-full">
                    {orgzr.name}
                  </h3>
                  <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200 line-clamp-1 max-w-full">
                    {orgzr.position}
                  </span>
                  <p className="mt-0.5 text-[10px] sm:text-[11px] text-slate-400 font-medium line-clamp-1 w-full">
                    {orgzr.bio || (orgzr.academic_year ? `Batch: ${orgzr.academic_year}` : 'Coordinator')}
                  </p>
                </div>
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
