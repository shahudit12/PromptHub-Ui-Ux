import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { 
  AlertCircle, 
  Terminal, 
  ArrowRight, 
  Sparkles, 
  HelpCircle,
  ShieldAlert,
  Sliders
} from 'lucide-react';
import { EASE, DURATION } from '../../lib/animations';

export interface StoryProblemStageProps {
  onNext?: () => void;
  className?: string;
}

const RAW_PROMPT_TEXT = "debug my prompt — it's not doing what I described";

export const StoryProblemStage: React.FC<StoryProblemStageProps> = ({
  onNext,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '0px' });

  const [typedText, setTypedText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  // Check prefers-reduced-motion
  const prefersReduced = 
    typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Typing animation simulation
  useEffect(() => {
    if (!isInView) return;

    if (prefersReduced) {
      setTypedText(RAW_PROMPT_TEXT);
      setIsTypingComplete(true);
      return;
    }

    let currentIndex = 0;
    const startDelay = setTimeout(() => {
      const interval = setInterval(() => {
        if (currentIndex < RAW_PROMPT_TEXT.length) {
          setTypedText(RAW_PROMPT_TEXT.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(interval);
          setIsTypingComplete(true);
        }
      }, 45); // Natural typing speed

      return () => clearInterval(interval);
    }, 600);

    return () => clearTimeout(startDelay);
  }, [isInView, prefersReduced]);

  return (
    <div 
      ref={containerRef}
      className={`w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 text-left ${className}`}
    >
      {/* ─── SCENE HEADER: Editorial Headline ──────────────────────── */}
      <div className="max-w-2xl mx-auto text-center space-y-2.5 mb-6 sm:mb-8">
        {/* Eyebrow badge */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: prefersReduced ? 0 : DURATION.reveal, ease: EASE }}
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold tracking-wider uppercase bg-brand-primary-light text-brand-primary border border-brand-primary/20"
        >
          <Sparkles className="w-3 h-3" />
          <span>Stage 01 • The Problem</span>
        </motion.div>

        {/* Primary Narrative Headline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: prefersReduced ? 0 : DURATION.reveal, delay: prefersReduced ? 0 : 0.1, ease: EASE }}
          className="space-y-1"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display tracking-tight text-text-primary leading-tight">
            AI is powerful. <span className="text-brand-primary">Your prompt might not be.</span>
          </h2>
        </motion.div>

        {/* Subtitle Statement */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: prefersReduced ? 0 : DURATION.reveal, delay: prefersReduced ? 0 : 0.2, ease: EASE }}
          className="text-xs sm:text-sm text-text-secondary max-w-lg mx-auto leading-relaxed font-sans"
        >
          Most prompts fail in production not because models are weak, but because instructions lack structure, context, and operational guardrails.
        </motion.p>
      </div>

      {/* ─── CENTERPIECE: The Raw Weak Prompt Studio Frame ──────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: prefersReduced ? 0 : DURATION.revealMax, delay: prefersReduced ? 0 : 0.4, ease: EASE }}
        className="max-w-3xl mx-auto bg-bg-secondary border border-border-default rounded-2xl shadow-sm overflow-hidden transition-all"
      >
        {/* Studio Window Bar */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border-default bg-bg-tertiary/40">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="w-2.5 h-2.5 rounded-full bg-border-hover/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-border-hover/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-border-hover/80" />
            </div>
            <div className="h-4 w-px bg-border-default mx-1 hidden sm:block" />
            <div className="flex items-center gap-1.5 text-xs font-mono text-text-muted">
              <Terminal className="w-3.5 h-3.5 text-brand-primary" />
              <span className="font-medium text-text-primary">unstructured-input.prompt</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-secondary border border-border-default text-text-muted">
              Length: {typedText.length} chars
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-semibold">
              Raw Draft
            </span>
          </div>
        </div>

        {/* Studio Code Editor Surface */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-start gap-3 sm:gap-4 font-mono text-xs sm:text-sm">
            <div className="text-text-muted select-none text-right w-5 pt-0.5 font-mono text-xs opacity-60">
              1
            </div>
            <div className="flex-1 min-h-[52px] sm:min-h-[60px] text-text-primary font-mono leading-relaxed bg-bg-primary/50 p-3 rounded-lg border border-border-subtle">
              <span className="font-semibold text-text-primary">
                {typedText}
              </span>
              <span 
                className={`inline-block w-2 h-4 ml-1 bg-brand-primary align-middle ${
                  isTypingComplete ? 'opacity-0' : 'opacity-100'
                }`}
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Diagnostic Deficiencies (Revealed when typing finishes) */}
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={isTypingComplete ? { opacity: 1, height: 'auto' } : {}}
            transition={{ duration: prefersReduced ? 0 : 0.35, ease: EASE }}
            className="overflow-hidden pt-2 border-t border-border-subtle"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-text-muted uppercase tracking-wider">
                <span>Prompt Audit Findings</span>
                <span className="text-rose-600 dark:text-rose-400 font-bold">3 Deficiencies Detected</span>
              </div>

              {/* Mobile Compact Deficiency Pills (<640px) */}
              <div className="flex flex-col gap-1.5 pt-1 sm:hidden">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-bg-primary border border-border-default text-xs">
                  <HelpCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span className="font-semibold text-text-primary">Missing Prompt:</span>
                  <span className="text-text-muted truncate">No broken prompt or input code provided</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-bg-primary border border-border-default text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="font-semibold text-text-primary">Zero Telemetry:</span>
                  <span className="text-text-muted truncate">No expected vs observed failure output</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-bg-primary border border-border-default text-xs">
                  <Sliders className="w-4 h-4 text-brand-primary shrink-0" />
                  <span className="font-semibold text-text-primary">No Diagnosis Schema:</span>
                  <span className="text-text-muted truncate">No target model or diagnostic bounds</span>
                </div>
              </div>

              {/* Desktop Deficiency Cards (>=640px) */}
              <div className="hidden sm:grid sm:grid-cols-3 gap-2.5 pt-1">
                {/* Deficiency 1: Broken Prompt & Source */}
                <div className="p-3 rounded-xl bg-bg-primary border border-border-default text-left space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                    <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Missing Prompt</span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    No prompt snippet, system instruction, or input payload provided.
                  </p>
                </div>

                {/* Deficiency 2: Failure Telemetry */}
                <div className="p-3 rounded-xl bg-bg-primary border border-border-default text-left space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>Zero Telemetry</span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    Doesn't state expected behavior vs the hallucination observed.
                  </p>
                </div>

                {/* Deficiency 3: Schema & Model Boundaries */}
                <div className="p-3 rounded-xl bg-bg-primary border border-border-default text-left space-y-1">
                  <div className="flex items-center gap-1.5 text-text-secondary text-xs font-semibold">
                    <Sliders className="w-3.5 h-3.5 shrink-0 text-brand-primary" />
                    <span>No Diagnosis Schema</span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    No target model (Claude, GPT-4o) or structured fix criteria.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Studio Bottom Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-bg-tertiary/50 border-t border-border-default text-xs">
          <div className="flex items-center gap-2 text-text-muted text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <span>PromptHub tests 7 deterministic engineering dimensions before execution.</span>
          </div>

          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs min-h-[44px] cursor-pointer active:scale-[0.98]"
            >
              <span>See How It Analyzes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default StoryProblemStage;