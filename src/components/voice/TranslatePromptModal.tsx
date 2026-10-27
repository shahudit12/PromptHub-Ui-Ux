/**
 * src/components/voice/TranslatePromptModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Multilingual Prompt Translation Modal (Powered by Sarvam AI Mayura).
 *
 * Enables instant translation of complex prompts across Indian languages:
 * Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Odia, Punjabi.
 * Strictly adheres to PromptHub's 4-color palette and Impeccable craftsmanship standards.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check, X, Copy, Loader2, Sparkles, ChevronDown, AlertCircle } from 'lucide-react';
import { INDIAN_LANGUAGES } from '../../services/voice/types';
import { VoiceGateway } from '../../services/voice/voiceGateway';

interface TranslatePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalPrompt: string;
  onApplyTranslation: (translated: string) => void;
}

export const TranslatePromptModal: React.FC<TranslatePromptModalProps> = ({
  isOpen,
  onClose,
  originalPrompt,
  onApplyTranslation,
}) => {
  const [targetLang, setTargetLang] = useState('hi-IN');
  const [sourceLang, setSourceLang] = useState('en-IN');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleTranslate = async () => {
    if (!originalPrompt.trim()) return;
    setErrorMsg(null);
    setIsTranslating(true);
    try {
      const res = await VoiceGateway.translate(originalPrompt, targetLang, sourceLang);
      setTranslatedText(res.translatedText);
    } catch (err: any) {
      console.error('[Translate Error]:', err);
      setErrorMsg(err?.message || 'Translation failed. Please verify your Sarvam AI configuration.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = () => {
    if (translatedText) {
      navigator.clipboard.writeText(translatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApply = () => {
    if (translatedText.trim()) {
      onApplyTranslation(translatedText.trim());
      onClose();
    }
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
          className="relative w-full max-w-xl bg-bg-secondary border border-border-default rounded-2xl shadow-2xl overflow-hidden p-6 text-text-primary"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border-default">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary dark:text-brand-accent flex items-center justify-center border border-brand-primary/20 shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-display text-text-primary tracking-tight">
                  Translate Prompt
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Multilingual Indic Translation (Sarvam AI Mayura)
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

          {/* Language Selection Row */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Source Language:
              </label>
              <div className="relative">
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="w-full appearance-none bg-bg-tertiary border border-border-default rounded-xl px-3.5 py-2.5 pr-10 text-xs font-medium text-text-primary min-h-[44px] focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-all cursor-pointer"
                >
                  {INDIAN_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code} className="bg-bg-secondary text-text-primary">
                      {l.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Target Language:
              </label>
              <div className="relative">
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full appearance-none bg-bg-tertiary border border-border-default rounded-xl px-3.5 py-2.5 pr-10 text-xs font-medium text-text-primary min-h-[44px] focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-all cursor-pointer"
                >
                  {INDIAN_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code} className="bg-bg-secondary text-text-primary">
                      {l.name} ({l.native})
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleTranslate}
              disabled={isTranslating || !originalPrompt.trim()}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-brand-primary text-white rounded-xl hover:bg-brand-primary-hi active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm min-h-[44px] cursor-pointer"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Translating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Translate Now</span>
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mt-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1 leading-relaxed">
                <span className="font-semibold block mb-0.5">Translation Notice</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Translated Content */}
          {translatedText && (
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-secondary">
                  Translated Output:
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-medium text-brand-primary dark:text-brand-accent hover:underline min-h-[44px] px-2.5 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>
              <textarea
                value={translatedText}
                onChange={(e) => setTranslatedText(e.target.value)}
                rows={4}
                className="w-full bg-bg-tertiary border border-border-default rounded-xl p-3.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary resize-none font-mono leading-relaxed"
              />
            </div>
          )}

          {/* Modal Footer */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-border-default">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-border-subtle rounded-xl border border-border-default transition-all min-h-[44px] cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleApply}
              disabled={!translatedText.trim()}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-brand-primary text-white rounded-xl hover:bg-brand-primary-hi active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm min-h-[44px] cursor-pointer"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>Apply Translation</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default TranslatePromptModal;
