import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ConfirmationVariant = 'danger' | 'warning' | 'primary';

export interface ConfirmationModalProps {
  isOpen: boolean;
  itemId?: string;
  title?: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmationVariant;
  icon?: React.ReactNode;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  itemId,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  icon,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  // Keyboard navigation & accessibility focus trap
  useEffect(() => {
    if (isOpen) {
      if (!wasOpenRef.current) {
        previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
        wasOpenRef.current = true;
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        // Disallow keyboard dismissal or confirmation while an async action is running
        if (isLoading) return;

        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation?.();
          onCancel();
          return;
        }

        // Accessibility focus trap: cycle focus strictly inside dialog
        if (e.key === 'Tab') {
          if (!dialogRef.current) return;
          const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;

          const firstElement = focusable[0];
          const lastElement = focusable[focusable.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement || !dialogRef.current.contains(document.activeElement)) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement || !dialogRef.current.contains(document.activeElement)) {
              e.preventDefault();
              firstElement.focus();
            }
          }
          return;
        }

        if (e.key === 'Enter') {
          // If the user isn't actively focusing the cancel or close button, Enter triggers confirmation
          if (
            document.activeElement !== cancelButtonRef.current &&
            document.activeElement !== closeButtonRef.current
          ) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            onConfirm();
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      // Auto-focus appropriate button on open or active prompt change
      const timer = setTimeout(() => {
        if (variant === 'danger') {
          // For destructive actions, focus Cancel by default to avoid accidental deletion
          cancelButtonRef.current?.focus();
        } else {
          confirmButtonRef.current?.focus();
        }
      }, 50);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        clearTimeout(timer);
      };
    } else {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        // Restore focus to original triggering element upon modal close if still connected to document
        if (
          previouslyFocusedElementRef.current &&
          typeof previouslyFocusedElementRef.current.focus === 'function' &&
          document.contains(previouslyFocusedElementRef.current)
        ) {
          try {
            previouslyFocusedElementRef.current.focus();
          } catch {}
        }
      }
    }
  }, [isOpen, onCancel, onConfirm, variant, title, message, isLoading, itemId]);

  // Unmount safety: If the modal component unmounts while open, restore focus cleanly
  useEffect(() => {
    return () => {
      if (
        wasOpenRef.current &&
        previouslyFocusedElementRef.current &&
        typeof previouslyFocusedElementRef.current.focus === 'function' &&
        document.contains(previouslyFocusedElementRef.current)
      ) {
        try {
          previouslyFocusedElementRef.current.focus();
        } catch {}
      }
    };
  }, []);

  if (typeof document === 'undefined') return null;

  const defaultTitle =
    variant === 'danger'
      ? 'Confirm Deletion'
      : variant === 'warning'
      ? 'Warning'
      : variant === 'primary'
      ? 'Confirmation Required'
      : 'Confirmation Required';

  const trimmedTitle = typeof title === 'string' ? title.trim() : '';
  const displayTitle = trimmedTitle || defaultTitle;

  const trimmedMessage = typeof message === 'string' ? message.trim() : message;
  const displayMessage = trimmedMessage || 'Please confirm whether you want to proceed with this action.';

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[1300] flex items-center justify-center p-4 overflow-y-auto select-none"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          aria-describedby="confirm-modal-description"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isLoading) {
              onCancel();
            }
          }}
        >
          {/* Backdrop with smooth blur */}
          <motion.div
            key="confirm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => {
              if (!isLoading) {
                onCancel();
              }
            }}
            aria-hidden="true"
            className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
          />

          {/* Centered Modal Window */}
          <motion.div
            ref={dialogRef}
            key="confirm-dialog"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-md my-auto rounded-2xl bg-bg-secondary border border-border-default p-6 shadow-2xl text-left overflow-hidden space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button */}
            <button
              ref={closeButtonRef}
              type="button"
              disabled={isLoading}
              onClick={() => {
                if (!isLoading) {
                  onCancel();
                }
              }}
              className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-tertiary dark:hover:bg-bg-elevated transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header with Variant Icon & Title */}
            <div className="flex items-start gap-3.5 pr-8">
              <div
                className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center border shadow-xs ${
                  variant === 'danger'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                    : variant === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                    : 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary dark:text-brand-accent'
                }`}
              >
                {icon ? (
                  icon
                ) : variant === 'danger' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : variant === 'warning' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0 pt-0.5" aria-live="assertive" aria-atomic="true">
                <h3
                  id="confirm-modal-title"
                  className="text-base font-bold text-text-primary font-display tracking-tight"
                >
                  {displayTitle}
                </h3>
                <div
                  id="confirm-modal-description"
                  className="mt-1.5 text-xs text-text-secondary leading-relaxed font-sans break-words"
                >
                  {displayMessage}
                </div>
              </div>
            </div>

            {/* Action Buttons: Prominent [Cancel] and [Confirm] with >=44px touch targets */}
            <div className="pt-2 flex items-center justify-end gap-3 flex-wrap sm:flex-nowrap">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={() => {
                  if (!isLoading) {
                    onCancel();
                  }
                }}
                disabled={isLoading}
                className="w-full sm:w-auto min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-xl border border-border-default bg-bg-tertiary hover:bg-border-subtle text-text-secondary dark:text-text-primary hover:text-text-primary text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelText}
              </button>

              <button
                ref={confirmButtonRef}
                type="button"
                onClick={() => {
                  if (!isLoading) {
                    onConfirm();
                  }
                }}
                disabled={isLoading}
                className={`w-full sm:w-auto min-h-[44px] min-w-[44px] px-5 py-2.5 rounded-xl text-white text-xs font-bold transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                  variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 dark:bg-rose-600 dark:hover:bg-rose-500 shadow-rose-950/20'
                    : variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500 shadow-amber-950/20'
                    : 'bg-brand-primary hover:bg-blue-700 active:bg-blue-800 shadow-blue-950/20'
                }`}
              >
                {isLoading && (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                )}
                <span>{confirmText}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
