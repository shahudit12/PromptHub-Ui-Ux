import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crop, ZoomIn, ZoomOut, RotateCw, Check, Move, RefreshCcw } from 'lucide-react';

export interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: File | null;
  aspectRatio?: number; // e.g. 1 for avatar, 3 for banner
  title?: string;
  onCropComplete: (croppedBlob: Blob, croppedDataUrl: string) => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  imageFile,
  aspectRatio = 1,
  title = 'Crop & Refine Photo',
  onCropComplete,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const previewBoxRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load image when file changes
  useEffect(() => {
    if (!imageFile) {
      setImageSrc(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    };
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  // Handle Mouse Drag for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle Touch Drag for mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Handle Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => {
      const delta = e.deltaY * -0.0015;
      return Math.min(Math.max(prev + delta, 0.7), 3.5);
    });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleApplyCrop = useCallback(() => {
    if (!imageSrc) return;
    setIsProcessing(true);

    const img = new Image();
    if (imageSrc.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }
    img.src = imageSrc;

    img.onload = () => {
      const outputCanvas = document.createElement('canvas');
      const targetWidth = aspectRatio >= 2 ? 1200 : 600;
      const targetHeight = Math.round(targetWidth / aspectRatio);

      outputCanvas.width = targetWidth;
      outputCanvas.height = targetHeight;

      const ctx = outputCanvas.getContext('2d');
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Fill background
      ctx.fillStyle = '#1F2A34';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Get preview element measurements to calculate accurate scaling
      const previewBox = previewBoxRef.current;
      const previewBoxWidth = previewBox ? previewBox.clientWidth : 256;
      const previewBoxHeight = previewBox ? previewBox.clientHeight : 256;

      const scaleRatioX = targetWidth / previewBoxWidth;
      const scaleRatioY = targetHeight / previewBoxHeight;

      ctx.save();
      ctx.translate(
        targetWidth / 2 + position.x * scaleRatioX,
        targetHeight / 2 + position.y * scaleRatioY
      );
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      // Scale base image to cover target bounds
      const imgAspect = img.width / img.height;
      let drawWidth = targetWidth;
      let drawHeight = targetWidth / imgAspect;

      if (imgAspect > aspectRatio) {
        drawHeight = targetHeight;
        drawWidth = targetHeight * imgAspect;
      }

      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      outputCanvas.toBlob(
        (blob) => {
          setIsProcessing(false);
          const dataUrl = outputCanvas.toDataURL('image/jpeg', 0.88);
          if (blob) {
            onCropComplete(blob, dataUrl);
            onClose();
          } else {
            // Fallback blob generation from data URL
            fetch(dataUrl)
              .then(res => res.blob())
              .then(fallbackBlob => {
                onCropComplete(fallbackBlob, dataUrl);
                onClose();
              })
              .catch(() => {
                const byteString = atob(dataUrl.split(',')[1]);
                const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                  ia[i] = byteString.charCodeAt(i);
                }
                const rawBlob = new Blob([ab], { type: mimeString });
                onCropComplete(rawBlob, dataUrl);
                onClose();
              });
          }
        },
        'image/jpeg',
        0.88
      );
    };

    img.onerror = () => {
      setIsProcessing(false);
      console.error('[ImageCropModal] Failed to load image for cropping');
    };
  }, [imageSrc, aspectRatio, position, rotation, zoom, onCropComplete, onClose]);

  if (!isOpen || !imageFile) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md font-sans"
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg bg-bg-elevated border border-border-default rounded-2xl shadow-2xl overflow-hidden flex flex-col text-left text-text-primary max-h-[92dvh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-default bg-bg-secondary">
            <div className="flex items-center gap-2">
              <Crop className="w-4 h-4 text-brand-primary" />
              <h3 className="text-sm font-bold text-text-primary font-display">{title}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close Crop Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive Crop Viewport */}
          <div className="p-3 sm:p-6 flex flex-col items-center justify-center bg-stone-950/60 select-none overflow-hidden relative">
            <div
              ref={previewBoxRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              className={`relative overflow-hidden border-2 border-brand-primary shadow-2xl cursor-grab active:cursor-grabbing bg-stone-900 touch-none ${
                aspectRatio === 1 ? 'w-52 h-52 sm:w-64 sm:h-64 max-w-full rounded-2xl' : 'w-full h-44 rounded-xl'
              }`}
            >
              {imageSrc && (
                <div
                  className="w-full h-full flex items-center justify-center pointer-events-none"
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${zoom})`,
                    transition: isDragging ? 'none' : 'transform 0.08s ease-out',
                  }}
                >
                  <img
                    ref={imageRef}
                    src={imageSrc}
                    alt="Crop preview"
                    className="max-w-none w-full object-contain pointer-events-none select-none"
                    draggable={false}
                  />
                </div>
              )}

              {/* Grid overlay rule of thirds */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-25 border border-white/40">
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-white" />
                <div className="border-r border-white" />
                <div />
              </div>

              {/* Center crosshair dot */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3 text-[11px] text-text-muted font-mono">
              <Move className="w-3 h-3" />
              <span>Drag to reposition · Scroll or slide to zoom</span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="p-4 bg-bg-primary border-t border-border-default space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2 flex-1 w-full">
                <ZoomOut className="w-3.5 h-3.5 text-text-muted shrink-0" />
                <input
                  type="range"
                  min="0.7"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-brand-primary"
                  aria-label="Zoom slider"
                />
                <ZoomIn className="w-3.5 h-3.5 text-text-muted shrink-0" />
                <span className="text-[11px] font-mono text-text-muted w-10 text-right">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleRotate}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-xs font-medium text-text-primary transition-colors cursor-pointer min-h-[44px]"
                  title="Rotate 90 degrees"
                >
                  <RotateCw className="w-3.5 h-3.5 text-text-muted" />
                  <span>Rotate</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="p-2.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Reset alignment"
                  aria-label="Reset alignment"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-border-default">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-border-default text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer bg-bg-tertiary min-h-[44px] flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                disabled={isProcessing}
                className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                {isProcessing ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{isProcessing ? 'Processing...' : 'Apply & Save DP'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
