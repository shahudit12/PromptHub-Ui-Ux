import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Wand2, 
  Check, 
  RefreshCw, 
  FileText, 
  Minimize2, 
  Maximize2, 
  ShieldCheck, 
  CheckCircle2,
  RotateCcw,
  Info,
  AlertCircle,
  Hash,
  ArrowRight,
  Lock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isSubscribedUser } from '../../utils/isPaidUser';
import { VersionDiffViewer } from '../ui/VersionDiffViewer';
import { PromptOptimizer, type OptimizationMode, type OptimizationResult } from '../../services/ai/promptOptimizer';

export type RefinementMode = OptimizationMode;

export const FREE_OPTIMIZATION_MODES: RefinementMode[] = ['improve', 'clarify', 'compress'];

export interface RefinementPanelProps {
  currentPrompt: string;
  selectedModel?: string;
  onApplyOptimization: (optimizedPrompt: string) => void;
  isOptimizing?: boolean;
}

const REFINEMENT_MODES: Array<{ id: RefinementMode; label: string; description: string; icon: React.ReactNode }> = [
  { id: 'improve', label: 'CO-STAR Optimization', description: 'Restructures prompt into Context, Objective, Style, Tone, Audience, Response.', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'clarify', label: 'Clarify & Disambiguate', description: 'Removes vague qualifiers and sharpens directives.', icon: <Wand2 className="w-4 h-4" /> },
  { id: 'compress', label: 'Token Compression', description: 'Reduces prompt token count by 30-50% while preserving semantics.', icon: <Minimize2 className="w-4 h-4" /> },
  { id: 'expand', label: 'Exhaustive Detail', description: 'Expands prompt with edge cases, acceptance criteria, and constraints.', icon: <Maximize2 className="w-4 h-4" /> },
  { id: 'structure', label: 'Markdown Framing', description: 'Adds hierarchical headings, bullet points, and code fences.', icon: <FileText className="w-4 h-4" /> },
  { id: 'reduce_hallucinations', label: 'Grounding & Factuality', description: 'Adds strict negative constraints against speculative claims.', icon: <ShieldCheck className="w-4 h-4" /> },
  { id: 'format_json', label: 'JSON Output Contract', description: 'Appends strict JSON Schema specification and zero-preamble directives.', icon: <CheckCircle2 className="w-4 h-4" /> },
  { id: 'increase_specificity', label: 'Technical Specificity', description: 'Replaces generalities with concrete technical metrics and rules.', icon: <Hash className="w-4 h-4" /> },
  { id: 'add_constraints', label: 'Operational Guardrails', description: 'Injects strict operational boundaries and negative rules.', icon: <ShieldCheck className="w-4 h-4" /> },
  { id: 'debug', label: 'AI Prompt Debugger', description: 'Audits failure modes, removes conflicting directives, and eliminates injection risks.', icon: <AlertCircle className="w-4 h-4" /> },
];

export const RefinementPanel: React.FC<RefinementPanelProps> = ({
  currentPrompt,
  selectedModel = 'openrouter/free',
  onApplyOptimization,
}) => {
  const { user, setActiveTab } = useApp();
  const isSubscribed = isSubscribedUser(user) || user?.role === 'Admin';
  const isModeLocked = (modeId: RefinementMode) => !isSubscribed && !FREE_OPTIMIZATION_MODES.includes(modeId);

  const [selectedMode, setSelectedMode] = useState<RefinementMode>('improve');
  const [optimizedResult, setOptimizedResult] = useState<OptimizationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previousPrompt, setPreviousPrompt] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleGenerate = async () => {
    if (!currentPrompt.trim() || isGenerating) return;

    if (isModeLocked(selectedMode)) {
      setErrorMessage('This advanced mode requires the Starter plan (₹299/mo) or higher. 3 core modes (CO-STAR, Clarify, Token Compression) are free for everyone.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await PromptOptimizer.optimize(
        currentPrompt,
        selectedMode,
        selectedModel,
        controller.signal
      );
      setOptimizedResult(result);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMessage(err.message || 'Prompt optimization failed.');
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleApply = () => {
    if (optimizedResult?.optimizedPrompt) {
      setPreviousPrompt(currentPrompt);
      onApplyOptimization(optimizedResult.optimizedPrompt);
    }
  };

  const handleUndo = () => {
    if (previousPrompt) {
      onApplyOptimization(previousPrompt);
      setPreviousPrompt(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-bg-primary overflow-y-auto p-6 space-y-6">
      {/* Optimization Header */}
      <div className="p-5 rounded-xl bg-bg-secondary border border-border-default space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-brand-primary-light text-brand-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">AI Prompt Optimization Lab</h3>
              <p className="text-xs text-text-muted">
                Select an optimization transformation to refine structure, compress tokens, or add grounding.
              </p>
            </div>
          </div>
          <div className="text-[11px] font-mono text-text-muted px-2 py-1 rounded bg-bg-primary border border-border-default">
            Engine: <span className="font-semibold text-text-primary">{selectedModel.replace(/^[^/]+\//, '')}</span>
          </div>
        </div>

        {/* Mode Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
          {REFINEMENT_MODES.map((mode) => {
            const isSelected = selectedMode === mode.id;
            const locked = isModeLocked(mode.id);
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  setSelectedMode(mode.id);
                  setErrorMessage(null);
                }}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-brand-primary-light/50 border-brand-primary text-text-primary ring-1 ring-brand-primary/20 shadow-2xs'
                    : 'bg-bg-primary border-border-default text-text-secondary hover:border-border-hover'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={isSelected ? 'text-brand-primary' : 'text-text-muted'}>
                      {mode.icon}
                    </span>
                    <span className="text-xs font-semibold text-text-primary truncate">{mode.label}</span>
                  </div>
                  {locked && (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Starter+</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">
                  {mode.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1">
              <p className="font-semibold">Optimization Notice</p>
              <p className="mt-0.5 text-rose-700 leading-relaxed">{errorMessage}</p>
              {errorMessage.includes('Starter plan') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('pricing')}
                  className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-primary text-white text-[11px] font-semibold hover:bg-brand-primary-hi transition-colors cursor-pointer min-h-[36px]"
                >
                  <span>View Pricing & Upgrade (₹299/mo)</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Generate Trigger */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {previousPrompt ? (
            <button
              type="button"
              onClick={handleUndo}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Undo Last Applied Optimization</span>
            </button>
          ) : !currentPrompt.trim() ? (
            <span className="text-xs text-text-muted italic">
              💡 Please type or paste a prompt in the Editor tab to run optimization.
            </span>
          ) : (
            <span className="text-xs text-text-muted">
              Ready to optimize ({currentPrompt.trim().length} characters)
            </span>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !currentPrompt.trim()}
            className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hi transition-colors shadow-2xs disabled:opacity-50 cursor-pointer min-h-[44px]"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Optimizing Prompt...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                <span>Run Optimization</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Rationale & Diff Comparison View */}
      {optimizedResult && (
        <div className="space-y-4">
          {/* Metrics & Rationale Box */}
          <div className="p-4 rounded-xl bg-brand-primary-light/40 border border-brand-primary/20 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-text-primary">
                <Info className="w-4 h-4 text-brand-primary shrink-0" />
                <span>Optimization Summary</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] font-mono">
                {/*
                  Labelled "est." on purpose. Both figures come from
                  promptOptimizer's `Math.ceil(text.length / 4)` heuristic, not from
                  a provider's token count — the two sides must be measured the same
                  way for the before/after ratio to mean anything. Printing them as
                  bare "tokens" read as a measurement the provider never made.
                */}
                <span className="text-text-muted">
                  Original: <strong className="text-text-primary">~{optimizedResult.originalTokens} tokens</strong>
                </span>
                <ArrowRight className="w-3 h-3 text-text-muted" />
                <span className="text-text-muted">
                  Optimized:{' '}
                  <strong
                    className={
                      optimizedResult.tokenDelta < 0
                        ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'text-brand-primary dark:text-[#41A2D9]'
                    }
                  >
                    ~{optimizedResult.optimizedTokens} tokens
                  </strong>
                </span>
                {optimizedResult.tokenDelta < 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    -{Math.max(1, Math.round(((optimizedResult.originalTokens - optimizedResult.optimizedTokens) / (optimizedResult.originalTokens || 1)) * 100))}% saved
                  </span>
                )}
                {optimizedResult.tokenDelta > 0 && optimizedResult.mode !== 'compress' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-primary/10 text-brand-primary dark:text-[#41A2D9] border border-brand-primary/20">
                    +{optimizedResult.tokenDelta} tokens
                  </span>
                )}
                <span
                  className="text-text-muted italic"
                  title="Both counts are length-based estimates so the before/after comparison is measured consistently. They are not provider-reported token usage."
                >
                  est.
                </span>
              </div>
            </div>
            <p className="text-text-secondary text-[11px] leading-relaxed pl-6">
              {optimizedResult.rationale}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider">
              Optimization Line Diff
            </h4>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hi transition-colors shadow-xs cursor-pointer min-h-[44px]"
            >
              <Check className="w-4 h-4" />
              <span>Apply to Editor</span>
            </button>
          </div>

          <div className="rounded-xl border border-border-default bg-bg-secondary p-4 shadow-xs overflow-hidden">
            <VersionDiffViewer
              currentVersion={{ versionNumber: 2, rawContent: optimizedResult.optimizedPrompt, title: 'Optimized' }}
              previousVersion={{ versionNumber: 1, rawContent: currentPrompt, title: 'Original' }}
              onRestore={() => handleApply()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
