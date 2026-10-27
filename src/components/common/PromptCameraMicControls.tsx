/**
 * src/components/common/PromptCameraMicControls.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Universal Camera (Photo/Image Attachment) & Mic (Voice Dictation) Controls.
 *
 * Provides 1-click access to:
 * 1. Camera / Photo upload: Device camera capture & local image file selection,
 *    compressed on client canvas, uploaded to resilient multi-tier storage
 *    (Cloudinary -> Supabase Storage -> Local Data URI).
 * 2. Microphone / Voice Dictation: Sarvam AI Indic Saaras model, Deepgram Nova-3,
 *    and Web Speech API real-time fallback.
 *
 * Adheres strictly to PromptHub Craftsmanship Standards:
 * - Touch targets >= 44px on touch viewports (min-h-[44px] or sm:min-h-[32px]).
 * - Smooth quartic easing: cubic-bezier(0.16, 1, 0.3, 1).
 * - Zero anti-patterns, accessible ARIA labels.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef } from 'react';
import { Camera, Mic, Loader2 } from 'lucide-react';
import { cloudinaryService } from '../../services/cloudinaryService';
import { securityUtils } from '../../utils/security';
import { VoicePromptModal } from '../voice/VoicePromptModal';
import { useApp } from '../../context/AppContext';

export interface PromptCameraMicControlsProps {
  onImageAttached: (url: string) => void;
  onTranscriptReady: (transcript: string) => void;
  variant?: 'compact' | 'standard' | 'pill' | 'inline';
  disabled?: boolean;
  className?: string;
  cameraTooltip?: string;
  micTooltip?: string;
  voiceSuccessMessage?: string;
}

export const PromptCameraMicControls: React.FC<PromptCameraMicControlsProps> = ({
  onImageAttached,
  onTranscriptReady,
  variant = 'standard',
  disabled = false,
  className = '',
  cameraTooltip = 'Attach photo or take picture',
  micTooltip = 'Voice dictation (Sarvam AI & Deepgram)',
  voiceSuccessMessage,
}) => {
  const { showToast } = useApp();
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessingImageRef = useRef(false);

  const handleCameraClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (disabled || isUploadingImage || isProcessingImageRef.current) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isUploadingImage || isProcessingImageRef.current) return;
    isProcessingImageRef.current = true;

    // Rate limit check
    const rateCheck = securityUtils.rateLimit('camera_prompt_upload', 1500);
    if (!rateCheck.allowed) {
      isProcessingImageRef.current = false;
      showToast(rateCheck.error || 'Please wait a moment before uploading again.', 'error');
      return;
    }

    setIsUploadingImage(true);
    showToast('Processing and attaching photo...', 'info');

    try {
      // 1. Magic bytes & size check (up to 10MB)
      const validation = await cloudinaryService.validateFile(file, 10);
      if (!validation.isValid) {
        showToast(validation.error || 'Unsupported image format.', 'error');
        return;
      }

      // 2. Client-side canvas compression for instant responsiveness
      const compressed = await cloudinaryService.compressImage(file, 1200, 1200, 0.82);

      // 3. Multi-tier upload (Cloudinary -> Supabase Storage -> Data URI)
      const res = await cloudinaryService.uploadImage(compressed, 'prompts');

      onImageAttached(res.secure_url);
      showToast('📸 Photo attached to prompt!', 'success');
    } catch (err: any) {
      console.error('[PromptCameraMicControls] Image upload failed:', err);
      showToast(err?.message || 'Failed to attach image. Please try another file.', 'error');
    } finally {
      isProcessingImageRef.current = false;
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleVoiceDone = (transcript: string) => {
    if (transcript && transcript.trim()) {
      onTranscriptReady(transcript.trim());
      showToast(voiceSuccessMessage || '🎙️ Dictation added to prompt!', 'success');
    }
    setIsVoiceOpen(false);
  };

  const isCompact = variant === 'compact';
  const isPill = variant === 'pill';
  const isInline = variant === 'inline';

  return (
    <>
      {/* Hidden Native File Input (Camera / Gallery) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        disabled={disabled || isUploadingImage}
        onChange={handleFileChange}
        className="hidden"
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
      />

      <div className={`flex items-center gap-1 ${className}`}>
        {/* Camera / Image Attachment Button */}
        <button
          type="button"
          onClick={handleCameraClick}
          disabled={disabled || isUploadingImage}
          title={cameraTooltip}
          aria-label={cameraTooltip}
          className={[
            'cursor-pointer transition-all duration-150 flex items-center justify-center font-medium disabled:opacity-50 disabled:cursor-not-allowed',
            isInline
              ? 'text-text-muted hover:text-brand-primary p-1 rounded-md min-h-[44px] sm:min-h-[28px] min-w-[44px] sm:min-w-[28px] hover:bg-bg-primary/80'
              : isCompact
              ? 'min-h-[44px] sm:min-h-[32px] px-2 py-1 rounded-lg bg-bg-tertiary hover:bg-bg-primary border border-border-default hover:border-brand-primary/40 text-text-secondary hover:text-text-primary text-xs gap-1'
              : isPill
              ? 'min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-full bg-bg-tertiary hover:bg-bg-primary border border-border-default hover:border-brand-primary/40 text-text-secondary hover:text-text-primary text-xs gap-1.5 shadow-2xs'
              : 'min-h-[44px] sm:min-h-[36px] px-2.5 py-1.5 rounded-lg bg-bg-primary border border-border-default hover:border-brand-primary/40 text-text-secondary hover:text-text-primary text-xs gap-1.5 shadow-2xs',
          ].join(' ')}
          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          {isUploadingImage ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-primary dark:text-brand-accent shrink-0" />
          ) : (
            <Camera className="w-3.5 h-3.5 text-brand-primary dark:text-brand-accent shrink-0" />
          )}
          {!isInline && (
            <span className={isCompact ? 'hidden xs:inline' : 'inline'}>
              {isUploadingImage ? 'Uploading...' : 'Photo'}
            </span>
          )}
        </button>

        {/* Mic / Voice Dictation Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsVoiceOpen(true);
          }}
          disabled={disabled}
          title={micTooltip}
          aria-label={micTooltip}
          className={[
            'cursor-pointer transition-all duration-150 flex items-center justify-center font-medium disabled:opacity-50 disabled:cursor-not-allowed',
            isInline
              ? 'text-text-muted hover:text-brand-primary dark:hover:text-brand-accent p-1 rounded-md min-h-[44px] sm:min-h-[28px] min-w-[44px] sm:min-w-[28px] hover:bg-bg-primary/80'
              : isCompact
              ? 'min-h-[44px] sm:min-h-[32px] px-2 py-1 rounded-lg bg-bg-tertiary hover:bg-bg-primary border border-border-default hover:border-brand-primary/40 text-text-secondary hover:text-text-primary text-xs gap-1'
              : isPill
              ? 'min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-full bg-bg-tertiary hover:bg-bg-primary border border-border-default hover:border-brand-primary/40 text-text-secondary hover:text-text-primary text-xs gap-1.5 shadow-2xs'
              : 'min-h-[44px] sm:min-h-[36px] px-2.5 py-1.5 rounded-lg bg-bg-primary border border-border-default hover:border-brand-primary/40 text-text-secondary hover:text-text-primary text-xs gap-1.5 shadow-2xs',
          ].join(' ')}
          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          <Mic className="w-3.5 h-3.5 text-brand-primary dark:text-brand-accent shrink-0" />
          {!isInline && (
            <span className={isCompact ? 'hidden xs:inline' : 'inline'}>
              Voice
            </span>
          )}
        </button>
      </div>

      {/* Voice Dictation Modal */}
      <VoicePromptModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onTranscriptReady={handleVoiceDone}
      />
    </>
  );
};
