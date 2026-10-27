import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, X, Send, CheckCircle2, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';

export interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BugReportModal: React.FC<BugReportModalProps> = ({ isOpen, onClose }) => {
  const { user, showToast, submitBugReport } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanDesc = description.trim();

    if (!cleanTitle || !cleanDesc) {
      showToast('Please provide a title and bug description.', 'error');
      return;
    }

    if (cleanTitle.length < 3 || cleanTitle.length > 100) {
      showToast('Bug title must be between 3 and 100 characters.', 'error');
      return;
    }

    if (cleanDesc.length < 5 || cleanDesc.length > 1000) {
      showToast('Bug description must be between 5 and 1000 characters.', 'error');
      return;
    }

    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));

    try {
      await submitBugReport({
        title: cleanTitle,
        description: cleanDesc,
        stepsToReproduce: steps.trim() ? steps.trim().slice(0, 1000) : undefined,
        severity,
      });

      setSubmitted(true);
      showToast('Bug report submitted to Admin! If validated, you will receive a 15-Day Pro Trial.', 'success');
    } catch (err: any) {
      showToast('Failed to submit bug report: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setTitle('');
    setDescription('');
    setSteps('');
    onClose();
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[700] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-lg bg-bg-secondary border border-border-default rounded-t-2xl sm:rounded-xl p-5 sm:p-6 shadow-2xl relative my-0 sm:my-auto text-left max-h-[90vh] overflow-y-auto"
        >
          {/* Mobile drag handle */}
          <div className="sm:hidden flex justify-center -mt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-border-default" />
          </div>

          {/* Close button */}
          <button
            onClick={handleResetAndClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          {!submitted ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                  <Bug className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">Report a Bug</h3>
                  <p className="text-xs text-text-secondary">
                    Found an issue? Help us improve PromptHub and earn rewards.
                  </p>
                </div>
              </div>

              {/* 15 Days Free Pro Reward Banner */}
              <div className="p-3 rounded-lg bg-brand-primary-light border border-brand-primary/20 flex items-center gap-2.5 text-xs text-brand-primary">
                <Sparkles className="w-4 h-4 shrink-0" />
                <div>
                  <strong>Pro Reward:</strong> Valid bug submissions earn a{' '}
                  <strong>15-Day Free Pro Trial</strong> upon admin verification.
                </div>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                      Bug Title
                    </label>
                    <span className="text-[10px] text-text-muted font-mono tabular-nums">{title.length}/100</span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                    placeholder="e.g. Code syntax highlighting glitch in Firefox"
                    className="w-full bg-bg-tertiary border border-border-default focus:border-brand-primary rounded-lg px-3 py-2 sm:py-1.5 text-base sm:text-xs text-text-primary focus:outline-none min-h-[44px] sm:min-h-[36px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                      Severity
                    </label>
                    <select
                      value={severity}
                      onChange={(e: any) => setSeverity(e.target.value)}
                      className="w-full bg-bg-tertiary border border-border-default focus:border-brand-primary rounded-lg px-2.5 py-2 sm:py-1.5 text-base sm:text-xs text-text-primary focus:outline-none cursor-pointer font-mono min-h-[44px] sm:min-h-[36px]"
                    >
                      <option value="low">Low (Minor visual issue)</option>
                      <option value="medium">Medium (Layout / slow response)</option>
                      <option value="high">High (Feature error)</option>
                      <option value="critical">Critical (Crash / blocker)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                      Your Handle
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user ? `@${user.username || user.name}` : 'Guest User'}
                      className="w-full bg-bg-tertiary/60 border border-border-default rounded-lg px-3 py-1.5 text-xs font-mono text-text-muted cursor-not-allowed opacity-75"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                      Description &amp; Expected Behavior
                    </label>
                    <span className={`text-[10px] font-mono tabular-nums ${description.length >= 950 ? 'text-brand-amber font-semibold' : 'text-text-muted'}`}>{description.length}/1000</span>
                  </div>
                  <textarea
                    required
                    maxLength={1000}
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.code === 'Enter' || e.keyCode === 13)) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    placeholder="What happened vs what you expected to happen... (Ctrl+Enter to submit)"
                    className="w-full bg-bg-tertiary border border-border-default focus:border-brand-primary rounded-lg p-3 text-base sm:text-xs text-text-primary focus:outline-none resize-none min-h-[80px]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                      Steps to Reproduce (Optional)
                    </label>
                    <span className="text-[10px] text-text-muted font-mono tabular-nums">{steps.length}/1000</span>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={1000}
                    value={steps}
                    onChange={(e) => setSteps(e.target.value.slice(0, 1000))}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.code === 'Enter' || e.keyCode === 13)) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    placeholder="1. Open Workspace&#10;2. Select Claude 3.5 Sonnet&#10;3. Click Run..."
                    className="w-full bg-bg-tertiary border border-border-default focus:border-brand-primary rounded-lg p-3 text-base sm:text-xs font-mono text-text-primary focus:outline-none resize-none min-h-[64px]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-border-default">
                  <button
                    type="button"
                    onClick={handleResetAndClose}
                    className="px-4 py-2 rounded-lg border border-border-default text-xs font-medium text-text-secondary hover:bg-bg-tertiary cursor-pointer min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-white text-xs font-semibold cursor-pointer shadow-xs flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Submitting...' : 'Submit Report'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-text-primary">Bug Report Submitted</h3>
              <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
                Thank you for helping us improve PromptHub! Our engineering team will review your report shortly.
              </p>
              <button
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-white text-xs font-semibold cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default BugReportModal;
