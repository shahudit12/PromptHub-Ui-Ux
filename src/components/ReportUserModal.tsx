import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Flag, 
  ShieldAlert, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { reportService } from '../services/reportService';
import { UserAvatar } from './UserAvatar';

export interface ReportUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId: string;
  reportedUserName?: string;
  reportedUserUsername?: string;
  reportedUserAvatar?: string;
  promptId?: string;
  promptTitle?: string;
}

const REPORT_REASONS = [
  {
    id: 'spam',
    label: 'Spam or Commercial Promotion',
    description: 'Automated advertising, affiliate links, repetitive or misleading content.',
  },
  {
    id: 'harassment',
    label: 'Harassment, Abuse, or Hate Speech',
    description: 'Bullying, targeted intimidation, derogatory slurs, or hostile attacks.',
  },
  {
    id: 'malicious',
    label: 'Malicious, Dangerous, or Exploit Payloads',
    description: 'Prompt injections, credential stealers, system evasion, or harm directives.',
  },
  {
    id: 'copyright',
    label: 'Intellectual Property or Copyright Infringement',
    description: 'Plagiarized prompts, unauthorized commercial code reproduction.',
  },
  {
    id: 'impersonation',
    label: 'Impersonation or False Identity',
    description: 'Pretending to be another creator, public figure, brand, or PromptHub staff.',
  },
  {
    id: 'other',
    label: 'Other Policy Violation',
    description: 'Violates PromptHub community terms or acceptable use guidelines.',
  },
];

export const ReportUserModal: React.FC<ReportUserModalProps> = ({
  isOpen,
  onClose,
  reportedUserId,
  reportedUserName = 'Developer',
  reportedUserUsername,
  reportedUserAvatar,
  promptId,
  promptTitle,
}) => {
  const { user, isLoggedIn, setShowAuthModal, showToast } = useApp();
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0].id);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSubmittedSuccess(false);
      setDetails('');
      setSelectedReason(REPORT_REASONS[0].id);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn || !user) {
      setShowAuthModal(true);
      showToast('Please sign in to report users.', 'info');
      return;
    }

    if (user.id === reportedUserId) {
      showToast('You cannot report your own account.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const reasonObj = REPORT_REASONS.find(r => r.id === selectedReason);
      await reportService.submitReport({
        reporterId: user.id,
        reporterName: user.name || user.username || 'Reporter',
        reportedUserId,
        reportedUserName,
        promptId,
        reason: reasonObj?.label || selectedReason,
        details,
      });

      setSubmittedSuccess(true);
      showToast('Report submitted. Our safety team will review this.', 'success');
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      showToast(err.message || 'Failed to submit report. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        className="fixed inset-0 z-[750] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="bg-bg-secondary border border-border-default rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-hidden relative text-left"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border-default">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <Flag className="w-5 h-5" />
              </div>
              <div>
                <h3 id="report-modal-title" className="text-base font-bold text-text-primary font-display">
                  Report User &amp; Content
                </h3>
                <p className="text-xs text-text-muted">
                  Help maintain a safe, high-quality developer community.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close report modal"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {submittedSuccess ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-text-primary">
                Report Submitted Successfully
              </h4>
              <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
                Thank you for notifying us. Our safety moderators review flagged profiles and prompts under our Acceptable Use Policy.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              {/* Target User Pill */}
              <div className="p-3 rounded-xl bg-bg-tertiary/60 border border-border-subtle flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar 
                    src={reportedUserAvatar} 
                    name={reportedUserName} 
                    username={reportedUserUsername}
                    size="sm" 
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-primary truncate">
                      {reportedUserName}
                    </p>
                    <p className="text-[11px] text-text-muted font-mono truncate">
                      @{reportedUserUsername || reportedUserId.slice(0, 8)}
                    </p>
                  </div>
                </div>

                {promptTitle && (
                  <div className="text-right shrink-0 max-w-[150px]">
                    <span className="text-[10px] uppercase font-mono text-text-muted block">Related Prompt</span>
                    <span className="text-xs text-text-primary font-medium truncate block" title={promptTitle}>
                      {promptTitle}
                    </span>
                  </div>
                )}
              </div>

              {/* Reason Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-primary block">
                  Why are you reporting this user? <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {REPORT_REASONS.map((r) => {
                    const isSelected = selectedReason === r.id;
                    return (
                      <label
                        key={r.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-brand-primary/10 border-brand-primary/40 text-text-primary shadow-2xs'
                            : 'bg-bg-tertiary/40 border-border-default/70 hover:bg-bg-tertiary text-text-secondary'
                        }`}
                      >
                        <input
                          type="radio"
                          name="report_reason"
                          value={r.id}
                          checked={isSelected}
                          onChange={() => setSelectedReason(r.id)}
                          className="mt-0.5 accent-brand-primary text-brand-primary cursor-pointer"
                        />
                        <div className="space-y-0.5 min-w-0">
                          <p className={`text-xs font-semibold ${isSelected ? 'text-brand-primary' : 'text-text-primary'}`}>
                            {r.label}
                          </p>
                          <p className="text-[11px] text-text-muted leading-tight">
                            {r.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Additional Context */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="report-details" className="text-xs font-semibold text-text-primary">
                    Additional Details (optional)
                  </label>
                  <span className="text-[10px] text-text-muted font-mono">
                    {details.length}/1000
                  </span>
                </div>
                <textarea
                  id="report-details"
                  value={details}
                  maxLength={1000}
                  onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
                  placeholder="Provide specific links, context, or details about the issue to help our moderators..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-tertiary border border-border-default text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand-primary resize-none"
                />
              </div>

              {/* Footer Notice & Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <p className="text-[11px] text-text-muted leading-relaxed">
                  False or malicious reports violate our policies.
                </p>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="min-h-[44px] px-4 rounded-xl border border-border-default hover:bg-bg-tertiary text-text-secondary text-xs font-medium transition-colors cursor-pointer flex-1 sm:flex-initial"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-[44px] px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer flex-1 sm:flex-initial"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-4 h-4" />
                        <span>Submit Report</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
