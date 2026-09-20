import React from 'react';
import { X, ChevronLeft, ChevronRight, Download, Image as ImageIcon } from 'lucide-react';
import { ProgramMedia } from '../types';

interface MediaGalleryModalProps {
  isOpen?: boolean;
  onClose: () => void;
  mediaList: ProgramMedia[];
  currentIndex?: number;
  initialIndex?: number;
  onNavigate?: (index: number) => void;
}

export const MediaGalleryModal: React.FC<MediaGalleryModalProps> = ({
  isOpen = true,
  onClose,
  mediaList,
  currentIndex: controlledIndex,
  initialIndex = 0,
  onNavigate,
}) => {
  const [internalIndex, setInternalIndex] = React.useState(controlledIndex ?? initialIndex);

  React.useEffect(() => {
    if (controlledIndex !== undefined) {
      setInternalIndex(controlledIndex);
    }
  }, [controlledIndex]);

  if (!isOpen || mediaList.length === 0) return null;

  const activeIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;
  const currentMedia = mediaList[activeIndex] || mediaList[0];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prevIndex = activeIndex > 0 ? activeIndex - 1 : mediaList.length - 1;
    if (onNavigate) onNavigate(prevIndex);
    setInternalIndex(prevIndex);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIndex = activeIndex < mediaList.length - 1 ? activeIndex + 1 : 0;
    if (onNavigate) onNavigate(nextIndex);
    setInternalIndex(nextIndex);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-5xl w-full flex flex-col items-center justify-center max-h-[90vh]"
      >
        {/* Top Controls */}
        <div className="w-full flex items-center justify-between text-white pb-3 px-2">
          <div className="text-xs font-semibold text-slate-300">
            Photo {activeIndex + 1} of {mediaList.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Main Image View */}
        <div className="relative w-full flex items-center justify-center bg-black/40 rounded-3xl overflow-hidden max-h-[70vh] border border-slate-800 shadow-2xl">
          <img
            src={currentMedia?.url || ''}
            alt={currentMedia?.caption || 'Program Media'}
            className="max-h-[70vh] max-w-full object-contain rounded-2xl"
          />

          {/* Navigation Arrows */}
          {mediaList.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white shadow-lg transition-transform hover:scale-110"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white shadow-lg transition-transform hover:scale-110"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* Caption */}
        {currentMedia.caption && (
          <div className="mt-3 text-center bg-slate-900/80 px-6 py-2.5 rounded-2xl border border-slate-800 text-slate-200 text-xs sm:text-sm max-w-2xl">
            {currentMedia.caption}
          </div>
        )}
      </div>
    </div>
  );
};
