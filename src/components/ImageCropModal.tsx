import React, { useState, useCallback, useEffect } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { ZoomIn, ZoomOut, RotateCcw, RotateCw, RefreshCw, Check, X, Eye, Image as ImageIcon } from 'lucide-react';
import { getCroppedImg } from '../utils/cropImage';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedImage: string, croppedFile?: File) => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
}) => {
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [livePreview, setLivePreview] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  // Reset controls when a new imageSrc is opened
  useEffect(() => {
    if (isOpen) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setError('');
      setLivePreview('');
    }
  }, [isOpen, imageSrc]);

  const handleCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  // Generate live preview when crop completes
  useEffect(() => {
    let active = true;
    if (imageSrc && croppedAreaPixels) {
      const timer = setTimeout(async () => {
        try {
          const { dataUrl } = await getCroppedImg(imageSrc, croppedAreaPixels, rotation, 200);
          if (active) {
            setLivePreview(dataUrl);
          }
        } catch {
          // Ignore preview generation errors during active drag
        }
      }, 150);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [imageSrc, croppedAreaPixels, rotation]);

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setError('');
  };

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 < -180 ? prev + 270 : prev - 90));
  };

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90 > 180 ? prev - 270 : prev + 90));
  };

  const handleApply = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      setError('No valid crop area selected.');
      return;
    }

    try {
      setIsProcessing(true);
      setError('');

      // Generate cropped profile image at 400x400
      const { blob, dataUrl } = await getCroppedImg(imageSrc, croppedAreaPixels, rotation, 400);

      // Create File object for server upload
      const file = new File([blob], `organizer_profile_${Date.now()}.jpg`, { type: 'image/jpeg' });

      // Check if user token exists for server upload
      const token = localStorage.getItem('org_token');
      if (token) {
        const formData = new FormData();
        formData.append('file', file);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData.url) {
            onCropComplete(uploadData.url, file);
            onClose();
            return;
          }
        }
      }

      // Fallback to optimized dataUrl if upload endpoint not reached
      onCropComplete(dataUrl, file);
      onClose();
    } catch (err: any) {
      console.error('Crop error:', err);
      setError(err.message || 'Failed to crop image. CORS or format error.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">Crop & Adjust Organizer Photo</h3>
              <p className="text-xs text-slate-400">Drag to reposition, zoom or rotate your profile picture</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cropper Container */}
            <div className="md:col-span-2 relative h-64 sm:h-80 bg-slate-900 rounded-2xl overflow-hidden shadow-inner border border-slate-800">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={1}
                cropShape="round"
                showGrid={true}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={handleCropComplete}
                style={{
                  containerStyle: { borderRadius: '1rem' },
                  cropAreaStyle: { border: '2px solid #10b981', boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.75)' },
                }}
              />
            </div>

            {/* Live Preview Panel */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center justify-center space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <Eye className="w-4 h-4 text-emerald-600" />
                <span>Live Preview</span>
              </div>

              {/* Circular Preview */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-emerald-600 shadow-md bg-white relative">
                {livePreview ? (
                  <img src={livePreview} alt="Live Profile Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-200 animate-pulse flex items-center justify-center text-xs text-slate-400">
                    Loading...
                  </div>
                )}
              </div>
              <span className="text-[11px] font-medium text-slate-500">Circular Profile View</span>

              {/* Square Preview */}
              <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-slate-300 shadow-xs bg-white">
                {livePreview && <img src={livePreview} alt="Square Preview" className="w-full h-full object-cover" />}
              </div>
              <span className="text-[10px] text-slate-400">Badge View</span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
                className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 w-10">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                />
                <span className="text-xs font-mono font-bold text-slate-700 w-10 text-right">
                  {zoom.toFixed(1)}x
                </span>
              </div>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Rotate Controls & Reset */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRotateLeft}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Rotate -90°</span>
                </button>
                <button
                  type="button"
                  onClick={handleRotateRight}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
                >
                  <RotateCw className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Rotate +90°</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Crop</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 px-5 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Reset
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={isProcessing}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Photo...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Apply / Save Photo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
