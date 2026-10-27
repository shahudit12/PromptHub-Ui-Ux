import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flag, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { reportService } from '../services/reportService';
import { securityUtils } from '../utils/security';

const REPORT_REASONS = [
  { id: 'spam', label: 'Spam or Misleading Content', description: 'Promotional, repetitive, or deceptive prompt content.' },
  { id: 'harmful', label: 'Harmful or Dangerous Content', description: 'Prompt designed to cause harm, extract credentials, or bypass safety.' },
  { id: 'copyright', label: 'Copyright Infringement', description: 'Plagiarized, copied without attribution, or illegally reproduced.' },
  { id: 'offensive', label: 'Offensive or Inappropriate', description: 'Hateful, explicit, or violates community guidelines.' },
  { id: 'fake', label: 'Fake or Low Quality', description: 'Prompt does not work, is entirely fabricated, or is misleading about its capabilities.' },
  { id: 'other', label: 'Other Violation', description: 'Any other community standards violation not listed above.' },
];

export interface ReportPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptId: string;
  promptTitle?: string;
  authorId?: string;
  authorName?: string;
}

export const ReportPromptModal: React.FC<ReportPromptModalProps> = ({
  isOpen,
  onClose,
  promptId,
  promptTitle,
  authorId,
  authorName,
}) => {
  const { user, isLoggedIn, setShowAuthModal, showToast } = useApp();
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason('');
      setDetails('');
      setSubmitted(false);
      setWarning(null);
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!isLoggedIn || !user) {
      setShowAuthModal(true);
      showToast('Please sign in to report this prompt.', 'info');
      onClose();
      return;
    }

    if (!selectedReason) return;

    // Check rate limit
    const rl = securityUtils.rateLimit('prompt_report_submit', 6000);
    if (!rl.allowed) {
      showToast(rl.error || 'Please wait before reporting again.', 'error');
      return;
    }

    setIsSubmitting(true);
    setWarning(null);

    try {
      // Check reporter status for abuse
      const reporterStatus = await reportService.getReporterStatus(user.id);
      if (reporterStatus.isBlocked) {
        setWarning('Your reporting privileges have been temporarily suspended due to excessive reports. Please contact support.');
        setIsSubmitting(false);
        return;
      }
      if (reporterStatus.warningLevel === 'warning') {
        setWarning(`Warning: You have submitted ${reporterStatus.count} reports in the last 24 hours. At 10 reports your account will be reviewed.`);
      }

      await reportService.reportPrompt({
        reporterId: user.id,
        reporterName: user.name,
        promptId,
        promptTitle,
        authorId,
        authorName,
        reason: selectedReason,
        details: details.trim() || undefined,
      });

      setSubmitted(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to submit report. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting]);

  // Lock body overflow while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="report-prompt-backdrop"
        className="fixed inset-0 z-[800] flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/70 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="relative w-full max-w-lg my-auto rounded-2xl overflow-hidden flex flex-col max-h-[min(90vh,620px)] bg-bg-secondary border border-border-default shadow-2xl text-left"
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-modal-title"
        >
          {/* Sticky Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-bg-secondary shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                <Flag className="w-4 h-4 text-rose-500" />
              </div>
              <div className="min-w-0">
                <h2 id="report-modal-title" className="font-semibold text-sm text-text-primary font-display tracking-tight truncate">
                  Report Prompt
                </h2>
                <p className="text-[11px] text-text-muted">Help maintain safety and quality standards</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
              aria-label="Close report modal"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="p-5 overflow-y-auto custom-scrollbar flex-1 min-h-0 space-y-4">
            {submitted ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="font-semibold text-text-primary text-base">Report Submitted</p>
                <p className="text-xs text-text-secondary max-w-sm">
                  Thank you for helping keep PromptHub safe and trustworthy. Our moderation team will investigate this prompt shortly.
                </p>
              </div>
            ) : (
              <>
                {/* Target Prompt Card */}
                <div className="p-3 rounded-xl bg-bg-tertiary/70 border border-border-default flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-text-muted block">Reporting Prompt</span>
                    <span className="text-xs font-semibold text-text-primary truncate block mt-0.5">
                      {promptTitle || promptId}
                    </span>
                  </div>
                  {authorName && (
                    <span className="text-[11px] text-text-muted shrink-0 bg-bg-secondary px-2 py-0.5 rounded-md border border-border-subtle">
                      Author: {authorName}
                    </span>
                  )}
                </div>

                {warning && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl text-xs bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                    <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>{warning}</span>
                  </div>
                )}

                {/* Reason Selection */}
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-2">
                    Select Violation Reason <span className="text-rose-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {REPORT_REASONS.map(reason => {
                      const isSelected = selectedReason === reason.id;
                      return (
                        <button
                          key={reason.id}
                          type="button"
                          onClick={() => setSelectedReason(reason.id)}
                          className={[
                            'w-full text-left p-3 rounded-xl border transition-all text-xs flex items-start gap-3 cursor-pointer',
                            isSelected
                              ? 'border-brand-primary bg-brand-primary/10 dark:bg-brand-primary/15 ring-1 ring-brand-primary/30'
                              : 'border-border-default bg-bg-primary/50 hover:border-border-hover hover:bg-bg-tertiary/40',
                          ].join(' ')}
                          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                        >
                          <div
                            className={[
                              'w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 transition-colors',
                              isSelected
                                ? 'border-brand-primary bg-brand-primary text-white'
                                : 'border-border-hover bg-bg-secondary',
                            ].join(' ')}
                          >
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-text-primary leading-tight">{reason.label}</div>
                            <div className="text-text-muted text-[11px] mt-0.5 leading-snug">{reason.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Details */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="report-details" className="text-xs font-semibold text-text-primary">
                      Additional Context <span className="text-text-muted font-normal">(Optional)</span>
                    </label>
                    <span className="text-[10px] text-text-muted font-mono">{details.length}/500</span>
                  </div>
                  <textarea
                    id="report-details"
                    className="w-full text-xs rounded-xl p-3 resize-none focus:outline-none focus:ring-1 focus:ring-brand-primary bg-bg-primary border border-border-default text-text-primary placeholder:text-text-muted"
                    style={{ minHeight: 76 }}
                    placeholder="Provide any additional details or evidence to help our review team..."
                    value={details}
                    onChange={e => setDetails(e.target.value.slice(0, 500))}
                    maxLength={500}
                  />
                </div>
              </>
            )}
          </div>

          {/* Sticky Footer */}
          <div className="px-5 py-3.5 border-t border-border-default bg-bg-secondary shrink-0 flex items-center justify-end gap-2.5">
            {submitted ? (
              <button
                type="button"
                onClick={handleClose}
                className="w-full min-h-[44px] px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-brand-primary hover:bg-brand-primary-hover transition-colors flex items-center justify-center cursor-pointer"
              >
                Done
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!selectedReason || isSubmitting}
                  className={[
                    'min-h-[44px] px-5 py-2 rounded-xl font-semibold text-xs inline-flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                    selectedReason
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                      : 'bg-bg-tertiary text-text-muted',
                  ].join(' ')}
                  style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Flag size={14} />
                      <span>Submit Report</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
