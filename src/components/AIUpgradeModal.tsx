import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Key, Zap, Shield, ArrowRight, CheckCircle2, CreditCard } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface AIUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'guest' | 'credits';
}

export const AIUpgradeModal: React.FC<AIUpgradeModalProps> = ({
  isOpen,
  onClose,
  mode
}) => {
  const { setShowAuthModal, setActiveTab, openRechargeModal } = useApp();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleCreateAccount = () => {
    onClose();
    setShowAuthModal(true);
  };

  const handleGoBYOK = () => {
    onClose();
    setActiveTab('credentials');
  };

  const handleGoPricing = () => {
    onClose();
    setActiveTab('pricing');
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[700] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md select-none">
        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-lg bg-bg-secondary border border-border-default rounded-t-2xl sm:rounded-xl p-5 sm:p-6 shadow-2xl overflow-hidden text-left z-10 space-y-4 max-h-[90vh] overflow-y-auto"
        >
          {/* Mobile drag handle */}
          <div className="sm:hidden flex justify-center -mt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-border-default" />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon Header */}
          <div className="w-10 h-10 rounded-lg bg-brand-primary-light border border-brand-primary/20 flex items-center justify-center text-brand-primary">
            {mode === 'guest' ? (
              <Shield className="w-5 h-5" />
            ) : (
              <Zap className="w-5 h-5" />
            )}
          </div>

          {/* Content */}
          {mode === 'guest' ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  Anonymous Demo Limit Reached
                </h3>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  Sign in or create a PromptHub developer account to continue executing multi-model benchmarks.
                </p>
              </div>

              <div className="bg-bg-tertiary border border-border-default rounded-lg p-3.5 space-y-2 text-xs text-text-secondary">
                <div className="flex items-center gap-2 text-text-primary font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Unlimited execution with your direct BYOK keys</span>
                </div>
                <div className="flex items-center gap-2 text-text-primary font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Prompt vault, version control &amp; test arena access</span>
                </div>
                <div className="flex items-center gap-2 text-text-primary font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Transparent pay-as-you-go model execution at 1 INR = 2 Credits</span>
                </div>
              </div>

              <button
                onClick={handleCreateAccount}
                className="w-full py-2.5 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create Account / Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  Wallet Credits Required
                </h3>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  PromptHub operates on a transparent pay-as-you-go model or Bring-Your-Own-Key (BYOK). Choose how you would like to continue:
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {/* Option 1: Instant Top-Up (Primary) */}
                <button
                  onClick={() => {
                    onClose();
                    openRechargeModal(500);
                  }}
                  className="p-3.5 rounded-lg bg-brand-primary-light border border-brand-primary/30 hover:border-brand-primary text-left transition-all cursor-pointer shadow-xs min-h-[44px]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-bg-secondary border border-brand-primary/20 flex items-center justify-center text-brand-primary font-bold">
                        <Zap className="w-4 h-4 text-brand-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-text-primary">
                            Top Up AI Credits (Instant Razorpay)
                          </h4>
                          <span className="text-[9px] font-mono font-bold bg-brand-primary text-white px-1.5 py-0.2 rounded-full">
                            Instant
                          </span>
                        </div>
                        <p className="text-[11px] text-text-secondary mt-0.5">
                          Starting at ₹100 · Non-expiring permanent balance · UPI, Cards &amp; NetBanking
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-brand-primary" />
                  </div>
                </button>

                {/* Option 2: BYOK */}
                <button
                  onClick={handleGoBYOK}
                  className="p-3.5 rounded-lg bg-bg-secondary border border-border-default hover:border-border-hover hover:bg-bg-tertiary text-left transition-colors cursor-pointer shadow-xs min-h-[44px]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary dark:text-[#41A2D9] font-bold">
                        <Key className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-text-primary">
                          Use Your Own API Key (BYOK)
                        </h4>
                        <p className="text-[11px] text-text-secondary mt-0.5">
                          Connect OpenAI, Anthropic, or OpenRouter keys directly at zero markup
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
                  </div>
                </button>

                {/* Option 3: View Subscription Plans */}
                <button
                  onClick={handleGoPricing}
                  className="p-3.5 rounded-lg bg-bg-secondary border border-border-default hover:border-border-hover hover:bg-bg-tertiary text-left transition-colors cursor-pointer shadow-xs min-h-[44px]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary dark:text-[#41A2D9] font-bold">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-text-primary">
                          Explore Subscriptions &amp; Packages
                        </h4>
                        <p className="text-[11px] text-text-secondary mt-0.5">
                          Starter, Pro, and Studio monthly plans with monthly credit allocations
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
                  </div>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default AIUpgradeModal;
