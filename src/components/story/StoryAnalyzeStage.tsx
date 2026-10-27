import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { 
  Gauge, 
  ArrowRight, 
  ArrowLeft,
  AlertTriangle, 
  XCircle, 
  Terminal, 
  Sparkles,
  Info,
  Layers,
  Sliders,
  ShieldAlert,
  FileCode,
  FileText,
  Target
} from 'lucide-react';
import { EASE, DURATION } from '../../lib/animations';

export interface StoryAnalyzeStageProps {
  onNext?: () => void;
  onBack?: () => void;
  className?: string;
}

export interface DimensionMetric {
  id: 'clarity' | 'specificity' | 'context' | 'constraints' | 'schema' | 'examples' | 'structure';
  label: string;
  score: number;
  grade: string;
  status: 'good' | 'warning' | 'alert';
  icon: React.ComponentType<{ className?: string }>;
  finding: string;
  recommendation: string;
}

// ─── Deterministic Story Preset Data for "debug my prompt — it's not doing what I described" ──
const STORY_PRESET_DIMENSIONS: DimensionMetric[] = [
  {
    id: 'clarity',
    label: 'Clarity',
    score: 42,
    grade: 'D',
    status: 'warning',
    icon: Target,
    finding: 'Intent is to troubleshoot, but the core failure mode and expected behavior remain completely undefined.',
    recommendation: 'Explicitly state the exact task the prompt was supposed to perform and where it broke down.',
  },
  {
    id: 'specificity',
    label: 'Specificity',
    score: 24,
    grade: 'F',
    status: 'alert',
    icon: Sliders,
    finding: 'Zero failure telemetry: no error logs, hallucinated tokens, or unexpected formatting examples attached.',
    recommendation: 'Provide concrete expected output vs observed failure side-by-side.',
  },
  {
    id: 'context',
    label: 'Context',
    score: 18,
    grade: 'F',
    status: 'alert',
    icon: Info,
    finding: 'Missing runtime environment: no target model family, system instructions, temperature, or context window limits.',
    recommendation: 'Specify the LLM model (e.g. Claude 3.5 Sonnet, GPT-4o) and runtime parameters.',
  },
  {
    id: 'constraints',
    label: 'Constraints',
    score: 15,
    grade: 'F',
    status: 'alert',
    icon: ShieldAlert,
    finding: 'No diagnostic boundaries: doesn\'t constrain whether to refactor system prompts, few-shot examples, or output schema.',
    recommendation: 'Constrain the solution to prompt architecture without altering downstream application logic.',
  },
  {
    id: 'schema',
    label: 'Schema & Output',
    score: 12,
    grade: 'F',
    status: 'alert',
    icon: FileCode,
    finding: 'No structured diagnosis requested — will produce rambling conversational advice rather than an actionable fix.',
    recommendation: 'Require structured output: Root cause diagnosis + corrected prompt template + test verification suite.',
  },
  {
    id: 'examples',
    label: 'Examples (Few-Shot)',
    score: 0,
    grade: 'F',
    status: 'alert',
    icon: FileText,
    finding: 'Zero failing inputs or target response pairs provided for the model to learn from.',
    recommendation: 'Include at least 1 failing input with its unwanted output and target correction.',
  },
  {
    id: 'structure',
    label: 'Structure',
    score: 30,
    grade: 'D',
    status: 'warning',
    icon: Layers,
    finding: 'Single conversational sentence without XML tags, diagnostic sections, or parameter slots.',
    recommendation: 'Refactor into XML-delimited prompt debugging architecture with dynamic variable slots.',
  },
];

const OVERALL_SCORE = 32;

export const StoryAnalyzeStage: React.FC<StoryAnalyzeStageProps> = ({
  onNext,
  onBack,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-60px' });

  const [selectedDimensionId, setSelectedDimensionId] = useState<DimensionMetric['id']>('constraints');
  const [hasScanned, setHasScanned] = useState(false);

  const prefersReduced = 
    typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!isInView) return;

    if (prefersReduced) {
      setHasScanned(true);
      return;
    }

    const timer = setTimeout(() => {
      setHasScanned(true);
    }, 450);

    return () => clearTimeout(timer);
  }, [isInView, prefersReduced]);

  const selectedDimension = 
    STORY_PRESET_DIMENSIONS.find((d) => d.id === selectedDimensionId) || STORY_PRESET_DIMENSIONS[0];

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
          <Gauge className="w-3 h-3" />
          <span>Stage 02 • 7-Dimension Audit</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: prefersReduced ? 0 : DURATION.reveal, delay: prefersReduced ? 0 : 0.1, ease: EASE }}
          className="space-y-1"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display tracking-tight text-text-primary leading-tight">
            PromptHub doesn't just run your prompt. <span className="text-brand-primary">It diagnoses what's broken.</span>
          </h2>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: prefersReduced ? 0 : DURATION.reveal, delay: prefersReduced ? 0 : 0.2, ease: EASE }}
          className="text-xs sm:text-sm text-text-secondary max-w-lg mx-auto leading-relaxed font-sans"
        >
          Before spending tokens or accepting hallucinated outputs, PromptHub evaluates 7 engineering rubrics to pinpoint structural deficiencies.
        </motion.p>
      </div>

      {/* ─── CENTERPIECE WORKBENCH: Analyzed Prompt Frame ─────────── */}
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: prefersReduced ? 0 : DURATION.revealMax, delay: prefersReduced ? 0 : 0.35, ease: EASE }}
        className="max-w-4xl mx-auto bg-bg-secondary border border-border-default rounded-2xl shadow-sm overflow-hidden transition-all"
      >
        {/* Top Studio Bar */}
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
              <span className="font-medium text-text-primary">unstructured-input.prompt</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="px-2 py-0.5 rounded bg-bg-secondary border border-border-default text-text-muted">
              Story Preset Data
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-semibold flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              Score: {OVERALL_SCORE}/100 • Critical
            </span>
          </div>
        </div>

        {/* Input Reference Box */}
        <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-border-subtle bg-bg-primary/40">
          <div className="flex items-center justify-between text-[11px] font-mono text-text-muted mb-1.5">
            <span>AUDITED INPUT TEXT</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">Under-Specified</span>
          </div>
          <div className="font-mono text-xs sm:text-sm text-text-primary bg-bg-secondary p-3 rounded-lg border border-border-default shadow-2xs">
            "debug my prompt — it's not doing what I described"
          </div>
        </div>

        {/* ─── 7-DIMENSION ANALYSIS SURFACE ─────────────────────────── */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Diagnostic Summary Callout */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h3 className="text-xs sm:text-sm font-bold text-text-primary">
                  Diagnostic Summary
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed font-sans">
                  Your prompt has basic intent, but lacks audience definition, operational constraints, concrete examples, and output structure.
                </p>
              </div>
            </div>

            <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 border-amber-500/20 pt-2 sm:pt-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Quality Score</span>
              <span className="text-lg sm:text-xl font-black font-display text-rose-600 dark:text-rose-400">
                {OVERALL_SCORE} / 100
              </span>
            </div>
          </div>

          {/* 7 Dimensions Interactive Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-text-muted uppercase tracking-wider">
              <span>7 Deterministic Engineering Rubrics</span>
              <span className="text-text-muted text-[10px]">Click any dimension for recommendations</span>
            </div>

            {/* Mobile Compact Accordion List (<768px) */}
            <div className="space-y-2 md:hidden">
              {STORY_PRESET_DIMENSIONS.map((dim) => {
                const isSelected = selectedDimensionId === dim.id;
                const Icon = dim.icon;
                const isAlert = dim.status === 'alert';

                return (
                  <div 
                    key={dim.id}
                    className="rounded-xl border border-border-default bg-bg-secondary overflow-hidden transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedDimensionId(isSelected ? '' as any : dim.id)}
                      className="w-full p-3 flex items-center justify-between text-left min-h-[44px] cursor-pointer hover:bg-bg-primary/50"
                      aria-expanded={isSelected}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                          isAlert 
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-text-primary truncate">
                          {dim.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isAlert
                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        }`}>
                          {dim.score}%
                        </span>
                        <span className="text-xs font-mono font-bold text-text-muted">
                          {dim.grade}
                        </span>
                      </div>
                    </button>

                    {/* Expandable Accordion Body */}
                    {isSelected && (
                      <div className="px-3 pb-3 pt-1 border-t border-border-subtle bg-bg-primary/40 space-y-2 text-xs">
                        <div className="text-text-secondary leading-relaxed">
                          <strong className="text-text-primary">Deficiency: </strong>
                          {dim.finding}
                        </div>
                        <div className="text-brand-primary leading-relaxed">
                          <strong className="text-text-primary">Prescription: </strong>
                          {dim.recommendation}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop 7 Dimensions Grid (>=768px) */}
            <div className="hidden md:grid md:grid-cols-2 gap-2.5">
              {STORY_PRESET_DIMENSIONS.map((dim, idx) => {
                const isSelected = selectedDimensionId === dim.id;
                const Icon = dim.icon;
                const isAlert = dim.status === 'alert';

                return (
                  <motion.button
                    key={dim.id}
                    type="button"
                    onClick={() => setSelectedDimensionId(dim.id)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={hasScanned ? { opacity: 1, y: 0 } : {}}
                    transition={{ 
                      duration: prefersReduced ? 0 : 0.3, 
                      delay: prefersReduced ? 0 : idx * 0.05, 
                      ease: EASE 
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer min-h-[44px] flex flex-col justify-between gap-2 ${
                      isSelected 
                        ? 'bg-bg-primary border-brand-primary ring-1 ring-brand-primary/30 shadow-xs' 
                        : 'bg-bg-secondary hover:bg-bg-primary/60 border-border-default hover:border-border-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                          isAlert 
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-text-primary font-sans">
                          {dim.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isAlert
                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        }`}>
                          {dim.score}%
                        </span>
                        <span className="text-xs font-mono font-bold text-text-muted">
                          {dim.grade}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-border-subtle h-1.5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={hasScanned ? { width: `${dim.score}%` } : {}}
                        transition={{ 
                          duration: prefersReduced ? 0 : 0.6, 
                          delay: prefersReduced ? 0 : 0.2 + idx * 0.05, 
                          ease: EASE 
                        }}
                        className={`h-full rounded-full ${
                          isAlert 
                            ? 'bg-rose-500' 
                            : 'bg-amber-500'
                        }`}
                      />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Desktop Inspection Drawer (>=768px) */}
          <div className="hidden md:block p-4 rounded-xl bg-bg-primary border border-border-default space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
                  {selectedDimension.label} Finding &amp; Prescription
                </span>
              </div>
              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                selectedDimension.status === 'alert'
                  ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
              }`}>
                Score: {selectedDimension.score}% ({selectedDimension.grade})
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="text-text-primary leading-relaxed font-sans">
                <strong className="text-text-primary">Vulnerability: </strong>
                {selectedDimension.finding}
              </div>
              <div className="text-brand-primary leading-relaxed font-sans">
                <strong className="text-text-primary">Recommended Hardening: </strong>
                {selectedDimension.recommendation}
              </div>
            </div>
          </div>
        </div>

        {/* ─── BOTTOM ACTION BAR ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-bg-tertiary/50 border-t border-border-default text-xs">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors min-h-[44px] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Problem</span>
            </button>
          ) : (
            <div className="text-text-muted text-[11px] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-brand-primary" />
              <span>PromptHub reveals specific prompt flaws before token execution.</span>
            </div>
          )}

          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs min-h-[44px] cursor-pointer active:scale-[0.98]"
            >
              <span>See How It Optimizes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default StoryAnalyzeStage;