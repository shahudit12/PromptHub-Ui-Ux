import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { 
  Trophy, 
  ArrowRight, 
  ArrowLeft,
  Code2, 
  Sparkles, 
  Gauge, 
  Wand2, 
  Swords, 
  Columns, 
  BookmarkCheck,
  Compass,
  CheckCircle2,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { EASE, DURATION } from '../../lib/animations';
import { useApp } from '../../context/AppContext';
import { draftPersistenceService } from '../../services/draftPersistenceService';

export interface StoryPayoffStageProps {
  onBack?: () => void;
  className?: string;
}

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
1. Root Cause Analysis: Identify why the model drifts (ambiguity, weak constraints, context bleed, or schema breakdown).
2. Corrected Prompt Template: Output a hardened, production-grade prompt using delimited sections and explicit negative constraints.
3. Verification Suite: Provide 3 edge-case test scenarios to validate the fix.

Output Structure:
- [ROOT CAUSE]: 2-3 bullet diagnosis of the exact failure points.
- [OPTIMIZED PROMPT]: Production-ready prompt block with {{variable}} placeholders.
- [TEST CASES]: 3 edge-case tests with pass/fail criteria.`;

const WORKFLOW_STEPS = [
  { id: '01', label: 'Problem', icon: Sparkles },
  { id: '02', label: 'Analyze', icon: Gauge },
  { id: '03', label: 'Optimize', icon: Wand2 },
  { id: '04', label: 'Test', icon: Swords },
  { id: '05', label: 'Compare', icon: Columns },
  { id: '06', label: 'Reuse', icon: BookmarkCheck },
];

export const StoryPayoffStage: React.FC<StoryPayoffStageProps> = ({
  onBack,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-60px' });

  const { setActiveTab, showToast } = useApp();

  const prefersReduced = 
    typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleOpenStudio = () => {
    // Commit the prompt template and variables from the story into the real PromptHub IDE
    draftPersistenceService.saveWorkspaceDraft({
      title: 'Prompt Debugger & Schema Hardener',
      description: 'Production prompt engineering debugger with root-cause diagnostic architecture, schema boundaries, and test validation.',
      rawContent: OPTIMIZED_PROMPT_TEMPLATE,
      category: 'Development',
      tagsText: 'Prompt Engineering, Debugging, Reliability, Schema',
      model: 'anthropic/claude-3.5-sonnet',
      visibility: 'private',
      variableValues: {
        target_model: 'Claude 3.5 Sonnet',
        broken_prompt: 'Extract action items from customer calls into JSON',
        expected_behavior: 'Strict JSON array with task, owner, deadline',
        observed_failure: 'Preamble text and markdown code fence leakage',
      },
      lastUpdatedAt: Date.now(),
    });
    showToast?.('Prompt template preloaded into Prompt Studio', 'success');
    setActiveTab?.('workspace');
  };

  const handleExploreCommunity = () => {
    setActiveTab?.('community');
  };

  return (
    <div 
      ref={containerRef}
      className={`w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-14 text-center ${className}`}
    >
      {/* ─── CLIMAX BADGE ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: prefersReduced ? 0 : DURATION.reveal, ease: EASE }}
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold tracking-wider uppercase bg-brand-primary-light text-brand-primary border border-brand-primary/20 mb-4 sm:mb-5"
      >
        <Trophy className="w-3 h-3" />
        <span>Stage 07 • The PromptHub Thesis</span>
      </motion.div>

      {/* ─── DOMINANT HEADLINE CONTRAST ───────────────────────────── */}
      <div className="space-y-1.5 max-w-2xl mx-auto mb-4 sm:mb-6">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: prefersReduced ? 0 : DURATION.reveal, delay: prefersReduced ? 0 : 0.1, ease: EASE }}
          className="text-sm sm:text-base font-medium font-sans text-text-muted tracking-tight"
        >
          ChatGPT helps you use AI.
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: prefersReduced ? 0 : DURATION.revealMax, delay: prefersReduced ? 0 : 0.15, ease: EASE }}
          className="text-2xl sm:text-3xl md:text-4xl font-bold font-display tracking-tight text-text-primary leading-tight"
        >
          PromptHub helps you{' '}
          <span className="text-brand-primary">
            build better prompts.
          </span>
        </motion.h2>
      </div>

      {/* ─── PHILOSOPHICAL SUPPORTING STATEMENT ───────────────────── */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: prefersReduced ? 0 : DURATION.reveal, delay: prefersReduced ? 0 : 0.2, ease: EASE }}
        className="text-xs sm:text-sm text-text-secondary max-w-xl mx-auto leading-relaxed font-sans mb-6 sm:mb-8"
      >
        Your prompts should be reusable engineering assets — not disposable messages buried in chat history.
      </motion.p>

      {/* ─── CONVERGENT WORKFLOW RECAP STRIP ──────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={isInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: prefersReduced ? 0 : DURATION.revealMax, delay: prefersReduced ? 0 : 0.45, ease: EASE }}
        className="max-w-2xl mx-auto p-3 sm:p-3.5 rounded-xl bg-bg-secondary border border-border-default shadow-xs mb-6 sm:mb-8"
      >
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-3 text-[11px] font-mono">
          {WORKFLOW_STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <React.Fragment key={step.id}>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-bg-primary border border-border-subtle text-text-primary">
                  <Icon className="w-3 h-3 text-brand-primary" />
                  <span className="font-semibold">{step.label}</span>
                </div>
                {idx < WORKFLOW_STEPS.length - 1 && (
                  <ArrowRight className="w-2.5 h-2.5 text-text-muted/60 shrink-0 hidden sm:block" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </motion.div>

      {/* ─── THREE CORE PILLARS OF PROMPTHUB (Desktop Only) ─────── */}
      <div className="hidden md:grid md:grid-cols-3 gap-3 max-w-4xl mx-auto mb-6 sm:mb-8 text-left">
        <div className="p-3.5 sm:p-4 rounded-xl bg-bg-secondary border border-border-default space-y-1.5">
          <div className="w-7 h-7 rounded-lg bg-brand-primary-light border border-brand-primary/20 flex items-center justify-center text-brand-primary">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <h3 className="font-bold text-xs sm:text-sm text-text-primary font-display">
            Deterministic Auditing
          </h3>
          <p className="text-[11px] text-text-secondary leading-relaxed font-sans">
            7-dimension engineering analysis catches missing constraints, schemas, and ambiguities before production runtime.
          </p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-bg-secondary border border-border-default space-y-1.5">
          <div className="w-7 h-7 rounded-lg bg-brand-primary-light border border-brand-primary/20 flex items-center justify-center text-brand-primary">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <h3 className="font-bold text-xs sm:text-sm text-text-primary font-display">
            Production Benchmarks
          </h3>
          <p className="text-[11px] text-text-secondary leading-relaxed font-sans">
            Frontier model validation ensures reproducible inference across upgrades with zero vendor lock-in.
          </p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-bg-secondary border border-border-default space-y-1.5">
          <div className="w-7 h-7 rounded-lg bg-brand-primary-light border border-brand-primary/20 flex items-center justify-center text-brand-primary">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <h3 className="font-bold text-xs sm:text-sm text-text-primary font-display">
            Versioned Asset Vault
          </h3>
          <p className="text-[11px] text-text-secondary leading-relaxed font-sans">
            Dynamic variables and parameterization turn one-off prompts into reusable assets across teams and pipelines.
          </p>
        </div>
      </div>

      {/* ─── PRIMARY & SECONDARY ACTIONS ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: prefersReduced ? 0 : DURATION.reveal, delay: prefersReduced ? 0 : 0.3, ease: EASE }}
        className="flex flex-col sm:flex-row items-center justify-center gap-2.5 max-w-md mx-auto"
      >
        <button
          type="button"
          onClick={handleOpenStudio}
          className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors min-h-[44px] flex items-center justify-center gap-2 cursor-pointer"
          aria-label="Open Prompt Studio with optimized template"
        >
          <Code2 className="w-4 h-4" />
          <span>Open Prompt Studio</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleExploreCommunity}
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-text-primary font-medium text-xs transition-colors min-h-[44px] cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Compass className="w-3.5 h-3.5 text-text-muted" />
          <span>Explore Community Prompts</span>
        </button>
      </motion.div>

      {/* ─── BACK NAVIGATION ─────────────────────────────────────── */}
      {onBack && (
        <div className="mt-6 pt-3 border-t border-border-subtle max-w-xs mx-auto">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-text-primary transition-colors cursor-pointer py-1 min-h-[36px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Review Previous Stage (Save &amp; Reuse)</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default StoryPayoffStage;