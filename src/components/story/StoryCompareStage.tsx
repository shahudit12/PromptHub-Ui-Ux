import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  ShieldCheck, 
  Sparkles,
  Award
} from 'lucide-react';
import { EASE, DURATION } from '../../lib/animations';

export interface StoryCompareStageProps {
  onNext?: () => void;
  onBack?: () => void;
  className?: string;
}

export const StoryCompareStage: React.FC<StoryCompareStageProps> = ({
  onNext,
  onBack,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '0px' });

  const prefersReduced = 
    typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div 
      ref={containerRef}
      className={`w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-14 text-left ${className}`}
    >
      {/* Scene Header */}
      <div className="max-w-2xl mx-auto text-center space-y-3 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: prefersReduced ? 0 : DURATION.reveal, ease: EASE }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold tracking-wider uppercase bg-brand-primary-light text-brand-primary border border-brand-primary/20"
        >
          <Award className="w-3.5 h-3.5" />
          <span>Stage 05 • Quality Verdict</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: prefersReduced ? 0 : DURATION.reveal, delay: prefersReduced ? 0 : 0.1, ease: EASE }}
          className="space-y-1"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display tracking-tight text-text-primary">
            Validated. Production-Ready.
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary max-w-lg mx-auto leading-relaxed">
            Deterministic evaluation confirms your hardened prompt passes all production safety and style rules.
          </p>
        </motion.div>
      </div>

      {/* Clean Single Verdict Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: prefersReduced ? 0 : DURATION.reveal, delay: prefersReduced ? 0 : 0.15, ease: EASE }}
        className="bg-bg-secondary border border-border-default rounded-2xl shadow-xs overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border-default bg-bg-tertiary/40">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-xs sm:text-sm text-text-primary font-mono">
              Audit Verdict: Passed
            </span>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20">
            93% Score
          </span>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-bg-primary border border-border-default space-y-1">
              <span className="text-[10px] font-mono uppercase text-text-muted">Relevance &amp; Intent</span>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-text-primary font-mono">94%</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-bg-primary border border-border-default space-y-1">
              <span className="text-[10px] font-mono uppercase text-text-muted">Tone Adherence</span>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-text-primary font-mono">96%</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-bg-primary border border-border-default space-y-1">
              <span className="text-[10px] font-mono uppercase text-text-muted">Schema &amp; Constraints</span>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-text-primary font-mono">95%</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Verdict Summary */}
          <div className="p-4 rounded-xl bg-bg-primary/60 border border-border-default space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary font-mono">
              <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
              <span>Verdict Summary</span>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Eliminated conversational preamble drift and enforced deterministic schema boundaries. The corrected prompt template suppresses markdown wrapping when raw JSON output is required, guaranteeing 100% parse success in production.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 bg-bg-tertiary/30 border-t border-border-default">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3.5 py-2 rounded-lg border border-border-default hover:bg-bg-tertiary text-xs font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer flex items-center gap-1.5 min-h-[44px] sm:min-h-[36px]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="px-5 py-2 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2 min-h-[44px] sm:min-h-[36px] ml-auto"
            >
              <span>Next: Save &amp; Use</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default StoryCompareStage;