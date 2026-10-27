/**
 * src/components/media/PromptVideoDemoModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal for Viewing & Uploading Mux Prompt Demos and Walkthroughs.
 * Adheres strictly to PromptHub 4-color tokens and Impeccable standards.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, X, UploadCloud, Sparkles } from 'lucide-react';
import { VideoPlayer } from './VideoPlayer';
import { MediaPickerModal, type MediaPickerResult } from '../common/MediaPickerModal';

interface PromptVideoDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptTitle?: string;
  playbackId?: string | null;
  onVideoAttached?: (playbackId: string) => void;
}

export const PromptVideoDemoModal: React.FC<PromptVideoDemoModalProps> = ({
  isOpen,
  onClose,
  promptTitle = 'Prompt Walkthrough',
  playbackId: initialPlaybackId,
  onVideoAttached,
}) => {
  const [currentPlaybackId, setCurrentPlaybackId] = useState<string | null>(
    initialPlaybackId || null
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  const handleVideoSelect = (result: MediaPickerResult) => {
    setIsMediaPickerOpen(false);
    setCurrentPlaybackId(result.url);
    onVideoAttached?.(result.url);
    setStatusMessage('Video walkthrough ready!');
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl bg-bg-secondary border border-border-default rounded-2xl shadow-2xl overflow-hidden p-6 text-text-primary"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border-default">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary dark:text-brand-accent flex items-center justify-center border border-brand-primary/20 shrink-0">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-display text-text-primary tracking-tight">
                  Prompt Walkthrough & Video Demo
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Powered by Mux HLS Video Streaming
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Video Surface */}
          <div className="mt-5">
            {currentPlaybackId ? (
              <div className="space-y-3">
                <VideoPlayer
                  playbackId={currentPlaybackId}
                  title={promptTitle}
                  className="w-full rounded-xl overflow-hidden shadow-sm"
                />
                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsMediaPickerOpen(true)}
                    className="text-xs font-semibold text-brand-primary dark:text-brand-accent hover:underline cursor-pointer min-h-[44px] px-2 flex items-center"
                  >
                    Change Video
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPlaybackId(null);
                      onVideoAttached?.('');
                      setStatusMessage(null);
                    }}
                    className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer min-h-[44px] px-2 flex items-center"
                  >
                    Remove Video
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-border-default rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-bg-tertiary">
                <div className="w-12 h-12 rounded-full bg-brand-primary/10 text-brand-primary dark:text-brand-accent flex items-center justify-center mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-text-primary mb-1">
                  No Walkthrough Attached
                </h4>
                <p className="text-xs text-text-muted max-w-sm mb-4 leading-relaxed">
                  Attach an MP4 or MOV screen recording from your device gallery, paste a video web link, or select from your Storage Vault.
                </p>

                <button
                  type="button"
                  onClick={() => setIsMediaPickerOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-brand-primary text-white rounded-xl hover:bg-brand-primary-hi active:scale-[0.98] cursor-pointer transition-all shadow-sm min-h-[44px]"
                >
                  <Video className="w-4 h-4" />
                  <span>Choose Video (Gallery, Link, or Storage Vault)</span>
                </button>
              </div>
            )}
          </div>

          {/* Status Message */}
          {statusMessage && (
            <p className="mt-3 text-xs text-text-muted flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-primary dark:text-brand-accent" />
              <span>{statusMessage}</span>
            </p>
          )}

          {/* Footer */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-border-default">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold bg-brand-primary text-white rounded-xl hover:bg-brand-primary-hi active:scale-[0.98] transition-all min-h-[44px] cursor-pointer shadow-sm"
            >
              Done
            </button>
          </div>
        </motion.div>

        <MediaPickerModal
          isOpen={isMediaPickerOpen}
          onClose={() => setIsMediaPickerOpen(false)}
          onSelect={handleVideoSelect}
          title="Select Video Walkthrough"
          description="Choose a video from your device, enter a web video link, or select a video from your Storage Vault."
          mediaType="video"
        />
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default PromptVideoDemoModal;
