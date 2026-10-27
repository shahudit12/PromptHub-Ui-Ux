import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  FileCheck,
  File,
  X,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import type { WorkspaceAttachment } from '../../utils/workspaceAttachmentEngine';

export interface WorkspaceAttachmentTrayProps {
  attachments: WorkspaceAttachment[];
  onRemoveAttachment: (id: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Returns the appropriate icon component based on the attachment kind and mime/extension.
 */
function getAttachmentIcon(attachment: WorkspaceAttachment) {
  const name = (attachment.name || '').toLowerCase();
  if (name.endsWith('.pdf') || attachment.mimeType === 'application/pdf') {
    return <FileCheck className="w-5 h-5 text-rose-500" aria-hidden="true" />;
  }
  if (name.endsWith('.csv') || attachment.mimeType === 'text/csv') {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-500" aria-hidden="true" />;
  }
  if (name.endsWith('.json') || attachment.mimeType === 'application/json') {
    return <FileCode className="w-5 h-5 text-amber-500" aria-hidden="true" />;
  }
  if (name.endsWith('.md') || name.endsWith('.txt') || attachment.kind === 'document') {
    return <FileText className="w-5 h-5 text-brand-accent" aria-hidden="true" />;
  }
  return <File className="w-5 h-5 text-text-muted" aria-hidden="true" />;
}

/**
 * Visual pill tray displaying attached files directly in the chat composer.
 * Adheres strictly to DESIGN.md tokens, minimum 44px touch targets, and smooth quartic easing.
 */
export const WorkspaceAttachmentTray: React.FC<WorkspaceAttachmentTrayProps> = ({
  attachments,
  onRemoveAttachment,
  disabled = false,
  className = '',
}) => {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Attached files"
      className={`flex flex-wrap items-center gap-2 py-2 px-1 select-none ${className}`}
    >
      <div className="w-full flex items-center justify-between px-1">
        <span className="text-[10px] font-mono font-semibold text-text-muted uppercase tracking-wider">
          Attachments ({attachments.length}/5)
        </span>
      </div>
      <AnimatePresence initial={false}>
        {attachments.map((att) => {
          const isImage = att.kind === 'image';
          const imageSrc = att.previewUrl || (att.base64Data ? `data:${att.mimeType};base64,${att.base64Data}` : undefined);

          return (
            <motion.div
              key={att.id}
              layout
              initial={{ opacity: 0, scale: 0.95, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="group relative flex items-center gap-2.5 pl-2 pr-1 py-1.5 rounded-xl border border-border-default/70 bg-bg-secondary hover:border-brand-accent/50 shadow-xs transition-colors duration-200"
            >
              {/* Thumbnail or File Icon */}
              <div className="shrink-0 flex items-center justify-center">
                {isImage && imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={att.name}
                    className="w-10 h-10 object-cover rounded-lg border border-border-default/60 bg-bg-tertiary select-none pointer-events-none"
                  />
                ) : isImage ? (
                  <div className="w-10 h-10 rounded-lg bg-bg-tertiary border border-border-default/60 flex items-center justify-center text-brand-accent">
                    <ImageIcon className="w-5 h-5" aria-hidden="true" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-bg-tertiary border border-border-default/60 flex items-center justify-center">
                    {getAttachmentIcon(att)}
                  </div>
                )}
              </div>

              {/* Name & Metadata */}
              <div className="flex flex-col min-w-0 pr-1">
                <span
                  className="text-xs font-semibold text-text-primary truncate max-w-[140px] sm:max-w-[180px]"
                  title={att.name}
                >
                  {att.name}
                </span>

                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted border border-border-subtle/80">
                    {att.formattedSize}
                  </span>

                  {att.status === 'processing' && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-brand-accent font-medium">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" aria-hidden="true" />
                      Processing
                    </span>
                  )}

                  {att.status === 'error' && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] text-rose-500 font-medium truncate max-w-[120px]"
                      title={att.errorMessage || 'Failed to process file'}
                    >
                      <AlertCircle className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                      Error
                    </span>
                  )}

                  {att.metadata?.truncated && (
                    <span className="text-[10px] text-amber-500/90 font-mono">
                      Preview
                    </span>
                  )}
                </div>

                {att.extractedContent && (
                  <p className="mt-1 text-[10px] font-mono text-text-muted line-clamp-1 max-w-[180px] bg-bg-tertiary px-1.5 py-0.5 rounded border border-border-subtle/50 truncate">
                    {att.extractedContent.trim().slice(0, 90)}
                  </p>
                )}
              </div>

              {/* Remove button with strict 44px minimum touch target */}
              <button
                type="button"
                onClick={() => onRemoveAttachment(att.id)}
                disabled={disabled}
                aria-label={`Remove attachment ${att.name}`}
                title={`Remove ${att.name}`}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-text-muted hover:text-rose-500 hover:bg-rose-500/10 focus:outline-none focus:ring-2 focus:ring-brand-accent/40 transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
