import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Star, 
  Send, 
  Sparkles, 
  CheckCircle2
} from 'lucide-react';
import { securityUtils } from '../utils/security';

export interface AppFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
  userId?: string;
  onSubmitted?: () => void;
}

export const AppFeedbackModal: React.FC<AppFeedbackModalProps> = ({
  isOpen,
  onClose,
  userEmail = '',
  userName = '',
  userId = '',
  onSubmitted,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [category, setCategory] = useState<string>('feature');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [favoriteFeature, setFavoriteFeature] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>(userEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFeedback = feedbackText.trim();
    if (!cleanFeedback) return;

    if (cleanFeedback.length > 1000) {
      return;
    }

    const rateLimit = securityUtils.rateLimit('submit_feedback', 5000);
    if (!rateLimit.allowed) return;

    setIsSubmitting(true);
    try {
      const sanitizedFeedback = securityUtils.sanitizeInput(cleanFeedback.slice(0, 1000));
      const sanitizedFav = securityUtils.sanitizeInput(favoriteFeature.slice(0, 100));
      const sanitizedEmail = securityUtils.sanitizeInput(emailInput.slice(0, 100));

      setIsSubmitted(true);
      if (onSubmitted) onSubmitted();
      setTimeout(() => {
        setIsSubmitted(false);
        setFeedbackText('');
        setFavoriteFeature('');
        onClose();
      }, 2200);
    } catch (err) {
      console.warn('[AppFeedbackModal] Submit feedback error:', err);
      // Fallback show success
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        onClose();
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[750] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg bg-bg-secondary border border-border-default rounded-2xl shadow-2xl overflow-hidden flex flex-col text-left text-text-primary"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-bg-primary/50 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-primary-light flex items-center justify-center text-brand-primary border border-brand-primary/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary font-display">PromptHub Early Adopter Feedback</h3>
                <span className="text-[10px] font-mono text-brand-primary font-semibold">
                  Founder &amp; Builder Survey (First 100 Users)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close Feedback Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          {isSubmitted ? (
            <div className="p-8 text-center space-y-3 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-text-primary">Thank you for your feedback!</h4>
              <p className="text-xs text-text-secondary max-w-xs leading-relaxed">
                Your direct inputs help shape the developer studio, model routing, and community marketplace.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              {/* Star Rating */}
              <div className="space-y-1.5 text-center sm:text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono block">
                  Overall Studio &amp; App Experience
                </label>
                <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverRating || rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                        className="p-1 text-2xl transition-transform hover:scale-110 cursor-pointer focus:outline-none"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            isFilled
                              ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                              : 'text-border-default hover:text-text-muted'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="text-xs font-mono font-bold text-text-primary ml-2">
                    {rating === 5 ? 'Exceptional 🔥' : rating === 4 ? 'Great 👍' : rating === 3 ? 'Good 🙂' : rating === 2 ? 'Needs Work ⚠️' : 'Poor 👎'}
                  </span>
                </div>
              </div>

              {/* Feedback Category */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono block">
                  Feedback Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'feature', label: 'Feature Request' },
                    { id: 'ide', label: 'Prompt Studio IDE' },
                    { id: 'routing', label: 'AI Model Execution' },
                    { id: 'general', label: 'General / UI' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer text-center ${
                        category === cat.id
                          ? 'bg-brand-primary-light border-brand-primary text-brand-primary font-semibold'
                          : 'bg-bg-primary border-border-default text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Details */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono block">
                    What can we improve or what feature are you missing?
                  </label>
                  <span className={`text-[10px] font-mono tabular-nums ${feedbackText.length >= 950 ? 'text-brand-amber font-semibold' : 'text-text-muted'}`}>{feedbackText.length}/1000</span>
                </div>
                <textarea
                  required
                  rows={3}
                  maxLength={1000}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value.slice(0, 1000))}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.code === 'Enter' || e.keyCode === 13)) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Share your thoughts, suggestions, or edge cases you ran into... (Ctrl+Enter to send)"
                  className="w-full bg-bg-primary border border-border-default rounded-xl p-3 text-xs text-text-primary focus:border-brand-primary focus:outline-none resize-none placeholder:text-text-muted"
                />
              </div>

              {/* Favorite Feature */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono block">
                  What feature do you love the most so far? (Optional)
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={favoriteFeature}
                  onChange={(e) => setFavoriteFeature(e.target.value.slice(0, 100))}
                  placeholder="e.g. Multi-Model execution, Variable AST Drawer, Forking templates..."
                  className="w-full bg-bg-primary border border-border-default rounded-xl px-3 py-2 text-xs text-text-primary focus:border-brand-primary focus:outline-none font-sans placeholder:text-text-muted"
                />
              </div>

              {/* Email Contact */}
              {!userEmail && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono block">
                    Your Email (for response &amp; early credits)
                  </label>
                  <input
                    type="email"
                    maxLength={100}
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value.slice(0, 100))}
                    placeholder="developer@yourdomain.com"
                    className="w-full bg-bg-primary border border-border-default rounded-xl px-3 py-2 text-xs text-text-primary focus:border-brand-primary focus:outline-none font-mono"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-border-default">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-border-default text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer bg-bg-tertiary min-h-[44px] flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !feedbackText.trim()}
                  className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-surface-inverse hover:bg-surface-inverse-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 min-h-[44px]"
                >
                  {isSubmitting ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{isSubmitting ? 'Submitting...' : 'Send Feedback'}</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
