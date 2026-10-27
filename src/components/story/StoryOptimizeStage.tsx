import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { 
  Wand2, 
  ArrowRight, 
  ArrowLeft,
  Copy, 
  Check, 
  Terminal, 
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { EASE, DURATION } from '../../lib/animations';

export interface StoryOptimizeStageProps {
  onNext?: () => void;
  onBack?: () => void;
  className?: string;
}

const RAW_PROMPT = "debug my prompt — it's not doing what I described";

const OPTIMIZED_PROMPT_TEMPLATE = `Act as a Principal Prompt Engineer and LLM diagnostic specialist.

Analyze and fix the following failing prompt that does not produce expected results.

Target Model: {{target_model}}
Failing Prompt:
"""
{{broken_prompt}}
"""

Failure Telemetry:
- Expected Output: {{expected_behavior}}
- Observed Output: {{observed_failure}}

Diagnostic Instructions:
1. Root Cause Analysis: Identify why the model drifts (ambiguity, weak constraints, or context bleed).
2. Corrected Prompt Template: Output a hardened prompt using delimited sections and explicit negative constraints.
3. Verification Suite: Provide 3 edge-case test scenarios to validate the fix.

Output Structure:
- [ROOT CAUSE]: 2-3 bullet diagnosis of the exact failure points.
- [OPTIMIZED PROMPT]: Production-ready prompt block with {{variable}} placeholders.
- [TEST CASES]: 3 edge-case tests with pass/fail criteria.`;

const DETECTED_VARIABLES = [
  { name: 'target_model', sample: 'Claude 3.5 Sonnet' },
  { name: 'broken_prompt', sample: 'Extract action items into JSON' },
  { name: 'expected_behavior', sample: 'Strict JSON array with task, owner, deadline' },
  { name: 'observed_failure', sample: 'Markdown chatter instead of raw JSON' },
];

export const StoryOptimizeStage: React.FC<StoryOptimizeStageProps> = ({
  onNext,
  onBack,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-60px' });

  const [mobileTab, setMobileTab] = useState<'original' | 'optimized'>('optimized');
  const [copied, setCopied] = useState(false);
  const [revealedSections, setRevealedSections] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const prefersReduced = 
    typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!isInView) return;

    if (prefersReduced) {
      setRevealedSections(true);
      return;
    }

    const timer = setTimeout(() => {
      setRevealedSections(true);
    }, 400);

    return () => clearTimeout(timer);
  }, [isInView, prefersReduced]);

  const handleCopy = () => {
    navigator.clipboard.writeText(OPTIMIZED_PROMPT_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to render prompt with highlighted {{variables}}
  const renderFormattedPrompt = (text: string) => {
    const parts = text.split(/(\{\{[a-zA-Z0-9_-]+\}\})/g);
    return parts.map((part, i) => {
      if (part.startsWith('{{') && part.endsWith('}}')) {
        return (
          <span 
            key={i}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-brand-primary-light text-brand-primary border border-brand-primary/20 font-bold font-mono text-[11px] sm:text-xs"
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div 
      ref={containerRef}
      className={`w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 text-left ${className}`}
    >
      {/* ─── SCENE HEADER: Editorial Narrative ─────────────────────── */}
      <div className="max-w-2xl mx-auto text-center space-y-2.5 mb-6 sm:mb-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: prefersReduced ? 0 : DURATION.reveal, ease: EASE }}
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold tracking-wider uppercase bg-brand-primary-light text-brand-primary border border-brand-primary/20"
        >
          <Wand2 className="w-3 h-3" />
          <span>Stage 03 • Structural Optimization</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: prefersReduced ? 0 : DURATION.reveal, delay: prefersReduced ? 0 : 0.1, ease: EASE }}
          className="space-y-1"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display tracking-tight text-text-primary leading-tight">
            Same intent. <span className="text-brand-primary">Engineered for production.</span>
          </h2>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: prefersReduced ? 0 : DURATION.reveal, delay: prefersReduced ? 0 : 0.2, ease: EASE }}
          className="text-xs sm:text-sm text-text-secondary max-w-lg mx-auto leading-relaxed font-sans"
        >
          Same intent. Better instructions. We transform vague sentences into hardened, parameterized prompts that frontier models execute reliably.
        </motion.p>
      </div>

      {/* ─── AUDIT REMEDIATION RIBBON (Fixes Mapped from Scene 2) ───── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: prefersReduced ? 0 : DURATION.reveal, delay: prefersReduced ? 0 : 0.25, ease: EASE }}
        className="max-w-4xl mx-auto mb-6 p-3 sm:p-4 rounded-xl bg-bg-secondary border border-border-default shadow-xs"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-border-subtle text-xs font-mono font-semibold text-text-muted">
          <span className="uppercase tracking-wider">Audit Remediations Applied</span>
          <span className="text-brand-primary font-bold">4 Semantic Enhancements</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-text-primary">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <span>Audience Inject</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-primary">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <span>Context Anchors</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-primary">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <span>125-Word Boundary</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-primary">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <span>3-Part Output Schema</span>
          </div>
        </div>
      </motion.div>

      {/* ─── CENTERPIECE WORKBENCH: BEFORE / AFTER TRANSFORMATION ─── */}
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: prefersReduced ? 0 : DURATION.revealMax, delay: prefersReduced ? 0 : 0.35, ease: EASE }}
        className="max-w-4xl mx-auto bg-bg-secondary border border-border-default rounded-2xl shadow-sm overflow-hidden transition-all"
      >
        {/* Studio Window Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-border-default bg-bg-tertiary/40">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="w-2.5 h-2.5 rounded-full bg-border-hover/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-border-hover/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-border-hover/80" />
            </div>
            <div className="h-4 w-px bg-border-default mx-1 hidden sm:block" />
            <div className="flex items-center gap-1.5 text-xs font-mono text-text-muted">
              <Terminal className="w-3.5 h-3.5 text-brand-primary" />
              <span className="font-medium text-text-primary">production-template.prompt</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="px-2 py-0.5 rounded bg-bg-secondary border border-border-default text-text-muted">
              Story Preset Optimization
            </span>
            <span className="px-2 py-0.5 rounded bg-brand-primary-light text-brand-primary border border-brand-primary/20 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Quality: 94 / 100 • Production Ready
            </span>
          </div>
        </div>

        {/* Mobile Segmented View Switcher (<768px) */}
        <div className="block md:hidden px-4 pt-3 pb-2 border-b border-border-subtle bg-bg-primary/50">
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-bg-secondary border border-border-default">
            <button
              type="button"
              onClick={() => setMobileTab('original')}
              className={`py-2 text-xs font-mono font-semibold rounded transition-all min-h-[44px] ${
                mobileTab === 'original'
                  ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 font-bold border border-rose-500/20'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Original (Score 32)
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('optimized')}
              className={`py-2 text-xs font-mono font-semibold rounded transition-all min-h-[44px] ${
                mobileTab === 'optimized'
                  ? 'bg-brand-primary text-white font-bold shadow-2xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Optimized (Score 94)
            </button>
          </div>
        </div>

        {/* ─── BEFORE / AFTER CONTENT PANELS ───────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border-default">
          {/* Left Panel: Original Prompt (Score 32) */}
          <div className={`p-4 sm:p-6 space-y-4 bg-bg-primary/30 ${
            mobileTab === 'optimized' ? 'hidden md:block' : 'block'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                Before: Raw Sentence
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-bold">
                Score: 32 / 100
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-default font-mono text-xs sm:text-sm text-text-primary min-h-[140px] leading-relaxed">
              "{RAW_PROMPT}"
            </div>

            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                Observed Limitations:
              </span>
              <div className="space-y-1 text-xs text-text-secondary font-sans">
                <p className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  No broken prompt code or target model provided
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  No failure telemetry or expected vs actual output
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  No structured diagnostic schema or test suite
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel: Optimized Prompt (Score 94) */}
          <div className={`p-4 sm:p-6 space-y-4 bg-bg-secondary ${
            mobileTab === 'original' ? 'hidden md:block' : 'block'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-brand-primary uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>After: Production CO-STAR</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-primary-light text-brand-primary border border-brand-primary/20 font-bold">
                Score: 94 / 100
              </span>
            </div>

            {/* Formatted Structured Output with Controlled Space & Expand Toggle */}
            <div className="relative">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={revealedSections ? { opacity: 1 } : {}}
                transition={{ duration: prefersReduced ? 0 : 0.4, ease: EASE }}
                className={`p-3.5 rounded-xl bg-bg-primary border border-brand-primary/25 font-mono text-xs sm:text-[13px] text-text-primary whitespace-pre-wrap leading-relaxed shadow-2xs transition-all duration-300 ${
                  isExpanded ? 'max-h-[500px] overflow-y-auto' : 'max-h-[170px] overflow-hidden'
                }`}
              >
                {renderFormattedPrompt(OPTIMIZED_PROMPT_TEMPLATE)}
              </motion.div>

              {/* Bottom gradient fade overlay when collapsed */}
              {!isExpanded && (
                <div 
                  className="absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-transparent rounded-b-xl pointer-events-none" 
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Expand / Collapse Action */}
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[10px] font-mono text-text-muted">
                {isExpanded ? 'Full prompt view (25 lines)' : 'Showing first 6 lines'}
              </span>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs font-mono font-medium text-brand-primary hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors px-1 py-0.5"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Show less</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>View full prompt</span>
                  </>
                )}
              </button>
            </div>

            {/* Dynamic Variables Detected Ribbon */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-text-muted">
                <span>Reusable Parameters Detected:</span>
                <span className="text-brand-primary font-bold">4 Variables</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DETECTED_VARIABLES.map((v) => (
                  <span 
                    key={v.name}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-bg-tertiary border border-border-default text-[10px] font-mono text-text-primary"
                    title={`Sample value: ${v.sample}`}
                  >
                    <span className="text-brand-primary font-bold">{"{{"}</span>
                    <span>{v.name}</span>
                    <span className="text-brand-primary font-bold">{"}}"}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── CLIMAX HERO STATEMENT BAND ──────────────────────────── */}
        <div className="p-4 sm:p-5 bg-brand-primary/5 border-t border-border-default flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="space-y-0.5">
            <h3 className="text-sm font-black font-display text-text-primary tracking-tight">
              "Same intent. Better instructions."
            </h3>
            <p className="text-xs text-text-secondary font-sans">
              The model now receives explicit boundaries, recipient context, and structured output expectations.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-xs font-mono font-semibold text-text-primary transition-colors min-h-[44px] cursor-pointer active:scale-[0.98] shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-brand-primary" />
                <span className="text-brand-primary font-bold">Copied Prompt</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-text-muted" />
                <span>Copy Optimized Prompt</span>
              </>
            )}
          </button>
        </div>

        {/* ─── BOTTOM ACTION NAVIGATION BAR ────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-bg-tertiary/50 border-t border-border-default text-xs">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors min-h-[44px] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Analysis</span>
            </button>
          )}

          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs min-h-[44px] cursor-pointer active:scale-[0.98]"
            >
              <span>See How It Tests Across Models</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default StoryOptimizeStage;