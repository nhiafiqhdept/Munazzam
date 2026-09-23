/**
 * Global Image Optimization Utility for Munazzam
 *
 * Implements client-side automatic image compression, intelligent resizing,
 * progressive quality optimization, alpha-transparency preservation,
 * and modern WebP format conversion.
 */

export interface OptimizeImageOptions {
  /** Maximum width or height. Aspect ratio is preserved. Default: 1600 */
  maxDimension?: number;
  /** Target maximum compressed size in bytes. Default: 500 KB (512,000 bytes) */
  targetMaxSizeBytes?: number;
  /** Initial compression quality from 0.1 to 1.0. Default: 0.85 */
  initialQuality?: number;
  /** Minimum compression quality threshold to prevent pixelation. Default: 0.55 */
  minQuality?: number;
  /** Preferred output format. 'auto' selects WebP when supported, with PNG for transparent logos. Default: 'auto' */
  preferredFormat?: 'webp' | 'jpeg' | 'png' | 'auto';
  /** Whether to preserve transparency for PNG/WebP images. Default: true */
  preserveTransparency?: boolean;
  /** If image is smaller than maxDimension, do not upscale. Default: true */
  preventUpscaling?: boolean;
}

export interface OptimizedImageResult {
  /** The optimized File object ready for upload or multipart form data */
  file: File;
  /** Base64 Data URL for instant preview and local storage */
  dataUrl: string;
  /** The compressed Blob */
  blob: Blob;
  /** Final width in pixels */
  width: number;
  /** Final height in pixels */
  height: number;
  /** Original file size in bytes */
  originalSize: number;
  /** Compressed file size in bytes */
  optimizedSize: number;
  /** Mime type of the optimized image */
  mimeType: string;
  /** Short format name: 'webp' | 'png' | 'jpeg' */
  format: 'webp' | 'png' | 'jpeg';
  /** Percentage of bytes saved, e.g. 84 for 84% reduction */
  savedPercentage: number;
  /** Original file name */
  originalName: string;
  /** Optimized file name with correct extension */
  fileName: string;
}

/** Check if the current browser environment supports encoding to WebP via canvas */
export function isWebPSupported(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
}

/** Verify if a file is an image */
export function isImageFile(file: File | Blob): boolean {
  return file.type ? file.type.startsWith('image/') : false;
}

/** Format byte size into human-readable string (e.g. "450 KB", "2.1 MB") */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Convert a Blob to base64 Data URL */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to data URL'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

/** Convert canvas to Blob with fallback */
function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (canvas.toBlob) {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error(`Failed to convert canvas to blob with mime type ${type}`));
          }
        },
        type,
        quality
      );
    } else {
      // Fallback using dataURL
      try {
        const dataUrl = canvas.toDataURL(type, quality);
        const parts = dataUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : type;
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        resolve(new Blob([u8arr], { type: mime }));
      } catch (err) {
        reject(err);
      }
    }
  });
}

/**
 * Detect if canvas contains non-opaque pixels (transparency)
 * Samples pixels for high performance without traversing entire large images
 */
function detectCanvasAlpha(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const sampleWidth = Math.min(width, 120);
    const sampleHeight = Math.min(height, 120);
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = sampleWidth;
    sampleCanvas.height = sampleHeight;
    const sCtx = sampleCanvas.getContext('2d');
    if (!sCtx) return false;

    sCtx.drawImage(ctx.canvas, 0, 0, sampleWidth, sampleHeight);
    const imgData = sCtx.getImageData(0, 0, sampleWidth, sampleHeight).data;

    // Check alpha values (index 3, 7, 11, ...)
    for (let i = 3; i < imgData.length; i += 4) {
      if (imgData[i] < 250) {
        return true;
      }
    }
  } catch {
    // If security error (CORS), assume safe default
  }
  return false;
}

/**
 * Loads an image from a File, Blob, or URL into an HTMLImageElement
 */
function loadImageElement(source: File | Blob | string): Promise<{ img: HTMLImageElement; revokeUrl?: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let urlToRevoke: string | undefined;

    img.onload = () => {
      resolve({ img, revokeUrl: urlToRevoke });
    };

    img.onerror = () => {
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
      reject(new Error('Failed to load image for optimization. The file might be corrupt or an unsupported format.'));
    };

    if (typeof source === 'string') {
      img.src = source;
    } else {
      urlToRevoke = URL.createObjectURL(source);
      img.src = urlToRevoke;
    }
  });
}

/**
 * Calculate scaled dimensions while preserving aspect ratio and preventing upscaling
 */
export function calculateAspectRatioFit(
  srcWidth: number,
  srcHeight: number,
  maxDimension: number,
  preventUpscaling: boolean = true
): { width: number; height: number } {
  if (srcWidth <= 0 || srcHeight <= 0) {
    return { width: Math.max(1, maxDimension), height: Math.max(1, maxDimension) };
  }

  // If already within boundary and preventUpscaling is true, do not enlarge
  if (preventUpscaling && srcWidth <= maxDimension && srcHeight <= maxDimension) {
    return { width: Math.round(srcWidth), height: Math.round(srcHeight) };
  }

  const ratio = Math.min(maxDimension / srcWidth, maxDimension / srcHeight);
  return {
    width: Math.max(1, Math.round(srcWidth * ratio)),
    height: Math.max(1, Math.round(srcHeight * ratio)),
  };
}

/**
 * Core image optimization engine
 * Resizes, compresses, and converts an image file or source to an optimized format
 */
export async function optimizeImage(
  source: File | Blob | string,
  options: OptimizeImageOptions = {},
  fallbackFileName?: string
): Promise<OptimizedImageResult> {
  const maxDimension = options.maxDimension ?? 1600;
  const targetMaxSizeBytes = options.targetMaxSizeBytes ?? 500 * 1024; // 500 KB
  const initialQuality = options.initialQuality ?? 0.85;
  const minQuality = options.minQuality ?? 0.55;
  const preferredFormat = options.preferredFormat ?? 'auto';
  const preserveTransparency = options.preserveTransparency ?? true;
  const preventUpscaling = options.preventUpscaling ?? true;

  // Determine original filename and size
  let originalName = fallbackFileName || 'image.jpg';
  let originalSize = 0;
  let originalType = '';

  if (source instanceof File) {
    originalName = source.name;
    originalSize = source.size;
    originalType = source.type;
  } else if (source instanceof Blob) {
    originalSize = source.size;
    originalType = source.type;
  } else if (typeof source === 'string') {
    originalSize = Math.round(source.length * 0.75); // Estimate base64 length in bytes
  }

  // 1. Load image
  const { img, revokeUrl } = await loadImageElement(source);

  try {
    const origWidth = img.naturalWidth || img.width;
    const origHeight = img.naturalHeight || img.height;

    // 2. Calculate optimal dimensions (Preserve aspect ratio, Max 1600px, No upscaling)
    const { width: targetWidth, height: targetHeight } = calculateAspectRatioFit(
      origWidth,
      origHeight,
      maxDimension,
      preventUpscaling
    );

    // 3. Draw image onto Canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      throw new Error('Failed to create 2D canvas context for image processing');
    }

    // High quality interpolation
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // 4. Transparency check & Format selection
    const webpSupported = isWebPSupported();
    let hasAlpha = false;

    const couldHaveAlpha =
      originalType.includes('png') ||
      originalType.includes('webp') ||
      originalType.includes('gif') ||
      originalName.toLowerCase().endsWith('.png');

    if (couldHaveAlpha && preserveTransparency) {
      hasAlpha = detectCanvasAlpha(ctx, targetWidth, targetHeight);
    }

    let targetMimeType: string;
    let formatLabel: 'webp' | 'png' | 'jpeg';

    if (preferredFormat === 'webp' && webpSupported) {
      targetMimeType = 'image/webp';
      formatLabel = 'webp';
    } else if (preferredFormat === 'png') {
      targetMimeType = 'image/png';
      formatLabel = 'png';
    } else if (preferredFormat === 'jpeg') {
      targetMimeType = 'image/jpeg';
      formatLabel = 'jpeg';
    } else {
      // 'auto' mode
      if (hasAlpha) {
        // Transparent image: WebP natively supports alpha with much better compression than PNG
        if (webpSupported) {
          targetMimeType = 'image/webp';
          formatLabel = 'webp';
        } else {
          targetMimeType = 'image/png';
          formatLabel = 'png';
        }
      } else {
        // Photographic/raster opaque image: Prefer WebP, fallback to JPEG
        if (webpSupported) {
          targetMimeType = 'image/webp';
          formatLabel = 'webp';
        } else {
          targetMimeType = 'image/jpeg';
          formatLabel = 'jpeg';
        }
      }
    }

    // If format is JPEG, ensure white background for any transparency to prevent black fill
    if (targetMimeType === 'image/jpeg' && hasAlpha) {
      const jpgCanvas = document.createElement('canvas');
      jpgCanvas.width = targetWidth;
      jpgCanvas.height = targetHeight;
      const jpgCtx = jpgCanvas.getContext('2d');
      if (jpgCtx) {
        jpgCtx.fillStyle = '#FFFFFF';
        jpgCtx.fillRect(0, 0, targetWidth, targetHeight);
        jpgCtx.drawImage(canvas, 0, 0);
        ctx.clearRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(jpgCanvas, 0, 0);
      }
    }

    // 5. Smart progressive compression (Target ~500 KB without sacrificing clarity)
    let bestBlob: Blob | null = null;
    let currentQuality = initialQuality;

    // Quality steps for progressive testing
    const qualitySteps = [initialQuality, 0.78, 0.70, 0.62, minQuality];

    for (let i = 0; i < qualitySteps.length; i++) {
      currentQuality = qualitySteps[i];

      // PNG does not accept quality parameter in toBlob
      const blob = await canvasToBlob(
        canvas,
        targetMimeType,
        targetMimeType === 'image/png' ? undefined : currentQuality
      );

      bestBlob = blob;

      // If already within target size or format is PNG (lossless), we are good!
      if (blob.size <= targetMaxSizeBytes || targetMimeType === 'image/png') {
        break;
      }
    }

    // If still exceeds 500 KB (e.g. extremely dense 1600px complex poster),
    // downscale slightly (e.g. max 1350px or 1150px) at high visual quality to ensure reasonable file size
    if (bestBlob && bestBlob.size > targetMaxSizeBytes && targetMimeType !== 'image/png') {
      const scaleDownRatio = Math.sqrt(targetMaxSizeBytes / bestBlob.size);
      const safeScale = Math.max(0.75, Math.min(0.92, scaleDownRatio));

      const smallerW = Math.max(400, Math.round(targetWidth * safeScale));
      const smallerH = Math.max(400, Math.round(targetHeight * safeScale));

      const downscaledCanvas = document.createElement('canvas');
      downscaledCanvas.width = smallerW;
      downscaledCanvas.height = smallerH;
      const dCtx = downscaledCanvas.getContext('2d');

      if (dCtx) {
        dCtx.imageSmoothingEnabled = true;
        dCtx.imageSmoothingQuality = 'high';
        dCtx.drawImage(canvas, 0, 0, smallerW, smallerH);

        const downscaledBlob = await canvasToBlob(downscaledCanvas, targetMimeType, 0.72);
        if (downscaledBlob.size < bestBlob.size) {
          bestBlob = downscaledBlob;
        }
      }
    }

    if (!bestBlob) {
      throw new Error('Failed to compress image file');
    }

    // 6. Generate optimized file name with correct extension
    const baseName = originalName.replace(/\.[^/.]+$/, '').trim() || 'image';
    const extension = formatLabel === 'webp' ? '.webp' : formatLabel === 'png' ? '.png' : '.jpg';
    const fileName = `${baseName}${extension}`;

    // 7. Create output File & Data URL
    const optimizedFile = new File([bestBlob], fileName, {
      type: targetMimeType,
      lastModified: Date.now(),
    });

    const dataUrl = await blobToDataUrl(bestBlob);
    const optimizedSize = bestBlob.size;
    const effectiveOriginal = originalSize > 0 ? originalSize : optimizedSize;
    const savedPercentage =
      effectiveOriginal > optimizedSize
        ? Math.round(((effectiveOriginal - optimizedSize) / effectiveOriginal) * 100)
        : 0;

    return {
      file: optimizedFile,
      dataUrl,
      blob: bestBlob,
      width: targetWidth,
      height: targetHeight,
      originalSize: effectiveOriginal,
      optimizedSize,
      mimeType: targetMimeType,
      format: formatLabel,
      savedPercentage,
      originalName,
      fileName,
    };
  } finally {
    if (revokeUrl) {
      URL.revokeObjectURL(revokeUrl);
    }
  }
}

/**
 * Optimize an image File
 */
export async function optimizeImageFile(
  file: File,
  options?: OptimizeImageOptions
): Promise<OptimizedImageResult> {
  if (!isImageFile(file)) {
    throw new Error(`The file "${file.name}" is not a recognized image format.`);
  }
  return optimizeImage(file, options, file.name);
}

/**
 * Optimize multiple image files in batch with progress notification
 */
export async function optimizeImageFiles(
  files: File[],
  options?: OptimizeImageOptions,
  onProgress?: (processed: number, total: number, currentFileName: string) => void
): Promise<OptimizedImageResult[]> {
  const results: OptimizedImageResult[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    if (onProgress) {
      onProgress(i, total, file.name);
    }
    const optimized = await optimizeImageFile(file, options);
    results.push(optimized);
    if (onProgress) {
      onProgress(i + 1, total, file.name);
    }
  }

  return results;
}

/**
 * Optimize a base64 data URL
 */
export async function optimizeDataUrl(
  dataUrl: string,
  fallbackName?: string,
  options?: OptimizeImageOptions
): Promise<OptimizedImageResult> {
  return optimizeImage(dataUrl, options, fallbackName);
}
