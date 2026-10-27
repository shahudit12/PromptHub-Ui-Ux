import React, { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { 
  Play, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2, 
  Copy, 
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { EASE, DURATION } from '../../lib/animations';

export interface StoryTestStageProps {
  onNext?: () => void;
  onBack?: () => void;
  className?: string;
}

const MODEL_RESULT = {
  id: 'anthropic/claude-3.5-sonnet',
  name: 'Claude 3.5 Sonnet',
  provider: 'Anthropic',
  status: 'completed',
  tag: 'Frontier Production Model',
  diagnosticTitle: 'Root Cause: Preamble Drift & Unbounded Delimiters',
  diagnosticBody: `1. Format Bleed: Lack of negative constraints allowed conversational preamble ("Sure! Here is the JSON...").
2. Delimiter Ambiguity: Without strict markdown suppression, parser fails on triple-backtick wrappers.`,
  outputPreview: `[
  {"task": "Cluster Redis cache for session storage", "owner": "devops@org.com", "deadline": "2026-09-15"},
  {"task": "Rotate JWT signing keys in staging", "owner": "secops@org.com", "deadline": "2026-09-18"}
]`,
  testCases: '3/3 Edge Tests Passed: Zero markdown fences · All keys typed · ISO-8601 validated',
  wordCount: 58,
  latency: '0.7s',
};

export const StoryTestStage: React.FC<StoryTestStageProps> = ({
  onNext,
  onBack,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '0px' });

  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const prefersReduced = 
    typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleCopy = () => {
    const text = `Diagnostic: ${MODEL_RESULT.diagnosticTitle}\n\n${MODEL_RESULT.diagnosticBody}\n\nOutput:\n${MODEL_RESULT.outputPreview}\n\nValidation:\n${MODEL_RESULT.testCases}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Stage 04 • Test Execution</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: prefersReduced ? 0 : DURATION.reveal, delay: prefersReduced ? 0 : 0.1, ease: EASE }}
          className="space-y-1"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display tracking-tight text-text-primary">
            Instant Execution. Clean Result.
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary max-w-lg mx-auto leading-relaxed">
            See how your hardened prompt executes with zero guesswork. One prompt, one high-fidelity response.
          </p>
        </motion.div>
      </div>

      {/* Single Model Output Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: prefersReduced ? 0 : DURATION.reveal, delay: prefersReduced ? 0 : 0.15, ease: EASE }}
        className="bg-bg-secondary border border-border-default rounded-2xl shadow-xs overflow-hidden"
      >
        {/* Card Header: Model info & telemetry */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-border-default bg-bg-tertiary/40">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-semibold text-xs sm:text-sm text-text-primary font-mono">
              {MODEL_RESULT.name}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-primary text-text-muted border border-border-default hidden xs:inline-block">
              {MODEL_RESULT.provider}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-text-muted">
            <span>{MODEL_RESULT.latency}</span>
            <span>·</span>
            <span>{MODEL_RESULT.wordCount} words</span>
          </div>
        </div>

        {/* Card Body: The Output */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Diagnostic Root Cause */}
          <div className="p-3 rounded-lg bg-bg-primary border border-border-default space-y-1">
            <span className="text-[10px] font-mono uppercase font-bold text-brand-primary block">Diagnostic Analysis:</span>
            <p className="text-xs sm:text-sm font-semibold text-text-primary">
              {MODEL_RESULT.diagnosticTitle}
            </p>
            <p className="text-xs text-text-secondary whitespace-pre-line leading-relaxed pt-1">
              {MODEL_RESULT.diagnosticBody}
            </p>
          </div>

          {/* Hardened Output Preview with Progressive Disclosure */}
          <div className="p-4 rounded-xl bg-bg-primary/50 border border-border-default space-y-2 font-mono">
            <div className="flex items-center justify-between text-[11px] font-semibold text-text-muted">
              <span>Verified Output (Strict JSON):</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">100% Parse Success</span>
            </div>
            <pre className="text-xs sm:text-[13px] text-text-primary overflow-x-auto p-2.5 rounded-lg bg-bg-secondary border border-border-subtle leading-relaxed">
              {isExpanded ? MODEL_RESULT.outputPreview : MODEL_RESULT.outputPreview.slice(0, 120) + '\n  ...'}
            </pre>

            <p className="font-sans text-xs font-medium text-emerald-800 dark:text-emerald-300 pt-1 border-t border-border-subtle">
              {MODEL_RESULT.testCases}
            </p>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-sans font-semibold text-brand-primary hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors pt-1"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Show less</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>View full output ({MODEL_RESULT.wordCount} words)</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Quality Check Pill */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-text-muted font-mono">
            <span className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Deterministic Schema Respected</span>
            </span>
            <span className="text-[11px] text-text-muted">Zero markdown fences · Strict types · Under 60 words</span>
          </div>
        </div>

        {/* Card Footer: Clear Actions */}
        <div className="flex items-center justify-between gap-3 p-4 bg-bg-tertiary/30 border-t border-border-default">
          <div className="flex items-center gap-2">
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

            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-lg border border-border-default hover:bg-bg-tertiary text-xs font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer flex items-center gap-1.5 min-h-[44px] sm:min-h-[36px]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Output'}</span>
            </button>
          </div>

          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="px-5 py-2 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2 min-h-[44px] sm:min-h-[36px]"
            >
              <span>Next: Quality Score</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default StoryTestStage;