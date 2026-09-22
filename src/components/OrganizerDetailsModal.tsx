import React from 'react';
import { X, Mail, Phone, GraduationCap, Shield, Edit2, User, Trash2 } from 'lucide-react';
import { Organizer } from '../types';

interface OrganizerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizer: Organizer | null;
  onEdit: (organizer: Organizer) => void;
  onDelete: (organizer: Organizer) => void;
  isAdmin: boolean;
}

export const OrganizerDetailsModal: React.FC<OrganizerDetailsModalProps> = ({
  isOpen,
  onClose,
  organizer,
  onEdit,
  onDelete,
  isAdmin,
}) => {
  if (!isOpen || !organizer) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/80 backdrop-blur-sm text-slate-500 hover:text-slate-900 rounded-full shadow-sm border border-slate-200 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Large Photo Section */}
        <div className="relative h-64 sm:h-80 bg-slate-100">
          <img
            src={organizer.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80'}
            alt={organizer.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
          
          <div className="absolute bottom-6 left-6 right-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-white font-heading leading-tight">
              {organizer.name}
            </h2>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full border border-emerald-400 shadow-sm">
              <Shield className="w-3.5 h-3.5" />
              <span>{organizer.position}</span>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {organizer.academic_year && (
              <div className="flex items-center gap-3 text-slate-700">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 leading-none mb-1">Batch / Year</p>
                  <p className="text-sm font-semibold">{organizer.academic_year}</p>
                </div>
              </div>
            )}
            
            {organizer.email && (
              <div className="flex items-center gap-3 text-slate-700">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 leading-none mb-1">Email Address</p>
                  <p className="text-sm font-semibold truncate">{organizer.email}</p>
                </div>
              </div>
            )}

            {organizer.phone && (
              <div className="flex items-center gap-3 text-slate-700">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 leading-none mb-1">Phone Number</p>
                  <p className="text-sm font-semibold">{organizer.phone}</p>
                </div>
              </div>
            )}
          </div>

          {/* Bio Section */}
          {organizer.bio && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                About
              </h4>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <p className="text-sm text-slate-600 leading-relaxed italic">
                  "{organizer.bio}"
                </p>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
            
            {isAdmin && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onDelete(organizer);
                    onClose();
                  }}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
                <button
                  onClick={() => {
                    onEdit(organizer);
                    onClose();
                  }}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
