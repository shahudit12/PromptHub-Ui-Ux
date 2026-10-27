import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, Image as ImageIcon, X, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cloudinaryService } from '../../services/cloudinaryService';
import { securityUtils } from '../../utils/security';

export interface DeviceImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  description?: string;
  folder?: 'prompts' | 'drops' | 'news' | 'covers' | 'banners' | string;
  maxSizeMB?: number;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: 'video' | 'square' | 'auto';
  compact?: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
  onUploadStart?: () => void;
  onUploadEnd?: (success: boolean) => void;
}

export const DeviceImageUploader: React.FC<DeviceImageUploaderProps> = ({
  value,
  onChange,
  label,
  description,
  folder = 'prompts',
  maxSizeMB = 10,
  maxWidth = 1200,
  maxHeight = 1200,
  aspectRatio = 'video',
  compact = false,
  disabled = false,
  required = false,
  error: propError,
  className = '',
  onUploadStart,
  onUploadEnd,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(propError || null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [fileMeta, setFileMeta] = useState<{ name: string; sizeKb: number } | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const localPreviewUrlRef = useRef<string | null>(null);

  const [imgSrc, setImgSrc] = useState<string>(value || '');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef(false);

  // Sync displayed image source and reset error state when value or local preview changes
  React.useEffect(() => {
    setImgSrc(value || localPreviewUrl || '');
    setImageLoadError(false);
  }, [value, localPreviewUrl]);

  // Clean up object URLs on component unmount
  React.useEffect(() => {
    return () => {
      if (localPreviewUrlRef.current) {
        URL.revokeObjectURL(localPreviewUrlRef.current);
      }
    };
  }, []);

  const handleImageError = () => {
    // If the remote CDN URL failed to load, fall back to the local object URL if available
    if (localPreviewUrl && imgSrc !== localPreviewUrl) {
      setImgSrc(localPreviewUrl);
      setImageLoadError(false);
    } else {
      setImageLoadError(true);
    }
  };

  const processFile = useCallback(
    async (file: File) => {
      if (disabled || isUploading || isProcessingRef.current) return;
      isProcessingRef.current = true;

      // Rate limit check
      const rateLimitCheck = securityUtils.rateLimit('device_image_upload', 800);
      if (!rateLimitCheck.allowed) {
        isProcessingRef.current = false;
        setErrorMessage(rateLimitCheck.error || 'Please wait a moment before uploading again.');
        return;
      }

      setErrorMessage(null);
      setImageLoadError(false);
      setIsUploading(true);
      setUploadProgress(0);
      onUploadStart?.();

      // Immediately generate and display local object URL preview for zero flicker
      if (localPreviewUrlRef.current) {
        URL.revokeObjectURL(localPreviewUrlRef.current);
      }
      const objectUrl = URL.createObjectURL(file);
      localPreviewUrlRef.current = objectUrl;
      setLocalPreviewUrl(objectUrl);
      setImgSrc(objectUrl);

      try {
        // 1. Magic bytes & size security validation (strictly validates PNG, JPEG, WEBP, GIF, BMP, AVIF)
        const validation = await cloudinaryService.validateFile(file, maxSizeMB);
        if (!validation.isValid) {
          throw new Error(validation.error || 'Invalid image file.');
        }

        // 2. Client-side canvas compression: preserves PNG format, alpha channel, and transparency
        setUploadProgress(15);
        const compressed = await cloudinaryService.compressImage(file, maxWidth, maxHeight, 0.85);
        setUploadProgress(35);

        // Store file metadata for visual status
        setFileMeta({
          name: file.name,
          sizeKb: Math.round(compressed.size / 1024),
        });

        // 3. Resilient multi-tier upload (Cloudinary -> Supabase Storage -> Drive -> Data URI)
        const res = await cloudinaryService.uploadImage(compressed, folder, (prog) => {
          setUploadProgress(Math.min(95, 35 + Math.round(prog * 0.6)));
        });

        setUploadProgress(100);
        onChange(res.secure_url);
        onUploadEnd?.(true);
      } catch (err: any) {
        console.error('[DeviceImageUploader] Upload failed:', err);
        const msg = err?.message || 'Failed to process and upload image. Please try another file.';
        setErrorMessage(msg);
        onUploadEnd?.(false);
      } finally {
        isProcessingRef.current = false;
        setIsUploading(false);
        setUploadProgress(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [disabled, isUploading, maxSizeMB, maxWidth, maxHeight, folder, onChange, onUploadStart, onUploadEnd]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleRemove = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current);
      localPreviewUrlRef.current = null;
    }
    setLocalPreviewUrl(null);
    setImgSrc('');
    onChange('');
    setFileMeta(null);
    setImageLoadError(false);
    setErrorMessage(null);
  };

  const handleTriggerPicker = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const aspectClass =
    aspectRatio === 'square'
      ? 'aspect-square'
      : aspectRatio === 'video'
      ? 'aspect-video'
      : 'min-h-[140px]';

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Hidden File Input for Device Native Camera / Photo Gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp,image/*"
        disabled={disabled || isUploading}
        onChange={handleFileSelect}
        className="hidden"
        aria-hidden="true"
      />

      {/* Label and Helper Header */}
      {(label || description) && (
        <div className="flex flex-col gap-0.5">
          {label && (
            <label className="text-xs font-semibold text-text-primary flex items-center gap-1">
              <span>{label}</span>
              {required && <span className="text-red-500 font-mono">*</span>}
            </label>
          )}
          {description && (
            <span className="text-[11px] text-text-secondary leading-snug">{description}</span>
          )}
        </div>
      )}

      {/* Upload State or Existing Image Preview */}
      {(value || localPreviewUrl) ? (
        /* Image Preview Card */
        <div
          className={`relative rounded-xl overflow-hidden border border-border-default bg-bg-secondary group transition-all duration-200 ${
            compact ? 'p-1' : 'p-2'
          }`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          <div
            className={`relative rounded-lg overflow-hidden bg-bg-tertiary flex items-center justify-center ${aspectClass}`}
          >
            {!imageLoadError && imgSrc ? (
              <img
                src={imgSrc}
                alt={label || 'Uploaded preview'}
                className="w-full h-full object-cover select-none"
                referrerPolicy="no-referrer"
                onError={handleImageError}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-2.5 text-center">
                <AlertCircle className="w-5 h-5 text-amber-500 mb-1" />
                <span className="text-xs font-medium text-text-primary">Preview unavailable</span>
                <button
                  type="button"
                  onClick={handleTriggerPicker}
                  className="mt-1 text-[11px] font-semibold text-brand-primary hover:underline cursor-pointer"
                >
                  Replace
                </button>
              </div>
            )}

            {/* In-flight upload overlay */}
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-3">
                <Loader2 className="w-5 h-5 animate-spin text-brand-primary mb-1.5" />
                <span className="text-xs font-medium">Uploading image...</span>
                {uploadProgress !== null && (
                  <span className="text-[10px] font-mono text-brand-secondary mt-0.5">{uploadProgress}%</span>
                )}
              </div>
            )}

            {/* Compact Floating Actions in top-right */}
            {compact && !isUploading && (
              <div className="absolute top-1 right-1 flex items-center gap-1 z-10">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleTriggerPicker(); }}
                  disabled={disabled || isUploading}
                  className="w-6 h-6 rounded-md bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs flex items-center justify-center transition-colors cursor-pointer border border-white/20"
                  title="Replace image"
                  aria-label="Replace image"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleRemove(e); }}
                  disabled={disabled || isUploading}
                  className="w-6 h-6 rounded-md bg-rose-600/80 hover:bg-rose-600 text-white backdrop-blur-xs flex items-center justify-center transition-colors cursor-pointer border border-white/20"
                  title="Remove image"
                  aria-label="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Standard Action Bar Beneath Preview (non-compact only) */}
          {!compact && (
            <div className="flex items-center justify-between gap-2 mt-2 px-1">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-medium text-text-secondary truncate">
                  {fileMeta?.name || 'Device image attached'}
                </span>
                {fileMeta && (
                  <span className="text-[10px] font-mono text-text-muted shrink-0">
                    ({fileMeta.sizeKb} KB)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleTriggerPicker}
                  disabled={disabled || isUploading}
                  className="min-h-[44px] px-3 py-1.5 rounded-lg border border-border-default bg-bg-tertiary hover:bg-bg-primary text-text-primary text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors duration-150"
                  style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                  aria-label="Replace image from device"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-text-secondary" />
                  <span>Replace</span>
                </button>

                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={disabled || isUploading}
                  className="min-h-[44px] px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors duration-150"
                  style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                  aria-label="Remove uploaded image"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Device Upload Dropzone */
        <div
          onClick={handleTriggerPicker}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTriggerPicker();
            }
          }}
          className={[
            'relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer select-none text-center flex flex-col items-center justify-center',
            compact ? 'p-2.5 min-h-[76px]' : 'p-6 min-h-[140px]',
            isDragging
              ? 'border-brand-primary bg-brand-primary/5 ring-2 ring-brand-primary/20 scale-[0.99]'
              : 'border-border-default hover:border-brand-primary/60 bg-bg-secondary hover:bg-bg-tertiary/50',
            disabled || isUploading ? 'opacity-60 cursor-not-allowed pointer-events-none' : '',
          ].join(' ')}
          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
          aria-label={label ? `Upload ${label} from device` : 'Upload image from device'}
        >
          {isUploading ? (
            /* Upload In Progress */
            <div className="flex flex-col items-center justify-center py-2 w-full max-w-xs">
              <Loader2 className={`${compact ? 'w-5 h-5' : 'w-7 h-7'} animate-spin text-brand-primary mb-1`} />
              <span className={`${compact ? 'text-[11px]' : 'text-xs'} font-semibold text-text-primary`}>
                Uploading...
              </span>
              {uploadProgress !== null && (
                <div className="w-full mt-2 bg-border-default/50 rounded-full h-1 overflow-hidden max-w-[120px]">
                  <div
                    className="bg-brand-primary h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${uploadProgress}%`,
                      transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            /* Normal Dropzone Content */
            <div className="flex flex-col items-center justify-center">
              <div
                className={`rounded-full flex items-center justify-center transition-transform duration-200 ${
                  compact ? 'w-7 h-7 mb-1' : 'w-11 h-11 mb-2'
                } ${
                  isDragging
                    ? 'bg-brand-primary text-white scale-110'
                    : 'bg-brand-primary/10 text-brand-primary'
                }`}
              >
                {isDragging ? (
                  <UploadCloud className={compact ? 'w-3.5 h-3.5' : 'w-5 h-5'} />
                ) : (
                  <ImageIcon className={compact ? 'w-3.5 h-3.5' : 'w-5 h-5'} />
                )}
              </div>

              <div className="space-y-0.5">
                <p className={`${compact ? 'text-[11px]' : 'text-xs'} font-semibold text-text-primary`}>
                  <span className="text-brand-primary hover:underline">{compact ? 'Upload' : 'Upload from device'}</span>
                  {!compact && (
                    <span className="hidden sm:inline text-text-secondary font-normal">
                      {' '}or drag &amp; drop
                    </span>
                  )}
                </p>
                <p className={`${compact ? 'text-[9px]' : 'text-[10px]'} text-text-muted`}>
                  {compact ? `PNG, JPG ≤ ${maxSizeMB}MB` : `PNG, JPG, WEBP, GIF up to ${maxSizeMB}MB`}
                </p>
              </div>

              {/* Mobile tactile button hint (non-compact only) */}
              {!compact && (
                <div className="mt-2.5 sm:hidden">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-[11px] font-medium min-h-[44px]">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Choose Photo / Camera</span>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[11px]">{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
