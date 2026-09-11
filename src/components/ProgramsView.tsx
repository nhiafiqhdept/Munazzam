import React, { useState } from 'react';
import {
  CalendarDays,
  PlusCircle,
  Search,
  MapPin,
  Clock,
  Camera,
  ChevronRight,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Program } from '../types';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/helpers';
import { ConfirmModal } from './ConfirmModal';

interface ProgramsViewProps {
  onOpenAddModal: () => void;
  onOpenEditModal: (program: Program) => void;
}

export const ProgramsView: React.FC<ProgramsViewProps> = ({
  onOpenAddModal,
  onOpenEditModal,
}) => {
  const {
    currentOrg,
    programs,
    viewProgramDetails,
    deleteProgram,
    isAdmin,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);

  if (!currentOrg) return null;

  // Filter programs
  const filteredPrograms = programs.filter((prog) => {
    const matchesSearch =
      prog.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prog.category && prog.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      prog.place.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prog.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prog.audience.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === 'all' || (prog.status || 'completed') === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteProgram(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
              <CalendarDays className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">
              Programs & Activities
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Conduct, record, and document all seminars, workshops, and academic events for {currentOrg.name}.
          </p>
        </div>

        {isAdmin && (
          <button
            id="add-program-btn"
            onClick={onOpenAddModal}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2 text-sm shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Program</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="search-programs-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search programs by title, venue, audience, or keywords..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
            </select>
          </div>
        </div>
      </div>

      {/* Programs List */}
      {filteredPrograms.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300">
          <CalendarDays className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Programs Match Your Filters</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Try adjusting your search query or status filter.
          </p>
          {isAdmin && (
            <button
              onClick={onOpenAddModal}
              className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              + Record New Program
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrograms.map((prog) => {
            return (
              <div
                key={prog.id}
                id={`program-item-${prog.id}`}
                className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-2xs hover:shadow-lg transition-all flex flex-col justify-between group"
              >
                {/* Top Section */}
                <div>
                  {/* Poster Image */}
                  <div
                    className="relative h-48 bg-slate-900 overflow-hidden cursor-pointer"
                    onClick={() => viewProgramDetails(prog.id)}
                  >
                    <img
                      src={prog.poster || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80'}
                      alt={prog.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                    {/* Proof Count */}
                    {prog.media && prog.media.length > 0 && (
                      <span className="absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-xs text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        <span>{prog.media.length} Proofs</span>
                      </span>
                    )}

                    {/* Date Badge */}
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <p className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDate(prog.date)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <h3
                      onClick={() => viewProgramDetails(prog.id)}
                      className="text-base font-bold text-slate-900 font-serif leading-snug hover:text-emerald-700 cursor-pointer transition-colors line-clamp-2"
                    >
                      {prog.name}
                    </h3>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{prog.place}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {prog.description}
                    </p>

                    <div className="pt-2 flex items-center gap-2 flex-wrap">
                      {prog.category && (
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-md">
                          {prog.category}
                        </span>
                      )}
                      <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                        For: {prog.audience}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => viewProgramDetails(prog.id)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
                  >
                    <span>View Record & Proofs</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onOpenEditModal(prog)}
                        className="p-1.5 text-slate-600 hover:text-emerald-700 rounded-lg hover:bg-white transition-colors"
                        title="Edit Program"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(prog)}
                        className="p-1.5 text-slate-600 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
                        title="Delete Program"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Program Activity"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}" and all attached documentation proofs?`}
        confirmText="Yes, Delete Record"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
