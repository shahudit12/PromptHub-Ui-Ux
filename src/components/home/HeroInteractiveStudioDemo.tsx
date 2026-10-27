import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { PipCharacter } from '../guide/PipCharacter';
import { Sparkles, Copy, Check, RotateCcw, ShieldCheck } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';
import { EASE } from '../../lib/animations';

export interface HeroInteractiveStudioDemoProps {
  /** Optional class name */
  className?: string;
}

type ScenarioKey = 'email' | 'code' | 'improve';
type ModelKey = 'gpt4o' | 'claude' | 'gemini';

interface ScenarioData {
  id: ScenarioKey;
  label: string;
  tag: string;
  originalPrompt: string;
  improvedPrompt: string;
  models: {
    name: string;
    modelKey: ModelKey;
    latency: string;
    tokens: string;
    output: string;
    highlight: string;
  }[];
}

const SCENARIOS: ScenarioData[] = [
  {
    id: 'email',
    label: 'Write an email',
    tag: 'Customer Success',
    originalPrompt: 'Write a friendly check-in email to a customer whose trial ends in 3 days.',
    improvedPrompt:
      'You are a Senior Customer Success Lead. Draft a warm, 3-paragraph check-in email for {{customer_name}} whose enterprise trial expires in 3 days. Focus on one high-value outcome, offer a 15-minute quick walkthrough, and end with a zero-friction question.',
    models: [
      {
        name: 'GPT-4o',
        modelKey: 'gpt4o',
        latency: '340ms',
        tokens: '118 tok',
        output:
          'Subject: How is your team setup feeling, {{customer_name}}?\n\nQuick note—your trial wraps up in 3 days. If you want a 15-min hand on your setup, just reply "yes"!',
        highlight: 'Warm, conversational tone',
      },
      {
        name: 'Claude 3.5',
        modelKey: 'claude',
        latency: '389ms',
        tokens: '142 tok',
        output:
          'Subject: 3 days left on PromptHub — quick question on your team setup.\n\nHi {{customer_name}}, wanted to make sure you saw the multi-model comparison before your trial finishes.',
        highlight: 'Contextual clarity',
      },
      {
        name: 'Gemini 2.0',
        modelKey: 'gemini',
        latency: '265ms',
        tokens: '98 tok',
        output:
          'Subject: Wrapping up your trial on Friday.\n\nHi {{customer_name}}, here is the fastest way to save your prompt templates before day 14.',
        highlight: 'Direct & concise',
      },
    ],
  },
  {
    id: 'code',
    label: 'Review code',
    tag: 'Code Review',
    originalPrompt: 'Check this TypeScript authentication hook for security issues.',
    improvedPrompt:
      'You are a Staff Security Engineer. Audit the following React auth hook for: 1. Token leakage in sessionStorage, 2. Missing race condition cleanup in useEffect, 3. Unchecked API error handling. Return a concise bulleted summary with RFC 7807 recommendations.',
    models: [
      {
        name: 'Claude 3.5',
        modelKey: 'claude',
        latency: '372ms',
        tokens: '164 tok',
        output:
          '1. Token in sessionStorage is vulnerable to XSS. Prefer in-memory state with silent refresh.\n2. Add an AbortController cleanup to the active fetch in useEffect.',
        highlight: 'Precise AST security reasoning',
      },
      {
        name: 'GPT-4o',
        modelKey: 'gpt4o',
        latency: '412ms',
        tokens: '155 tok',
        output:
          '1. Potential token desync on concurrent refresh calls.\n2. Missing try/catch around JSON.parse when restoring cached sessions.',
        highlight: 'Practical edge case identification',
      },
      {
        name: 'Gemini 2.0',
        modelKey: 'gemini',
        latency: '280ms',
        tokens: '131 tok',
        output:
          '1. Add explicit ReturnType to useAuth to prevent leaking internal token state.\n2. Enforce strict null-checks on user object.',
        highlight: 'Strict type contract analysis',
      },
    ],
  },
  {
    id: 'improve',
    label: 'Improve a prompt',
    tag: 'Prompt Engineering',
    originalPrompt: 'Summarize our customer feedback into key issues.',
    improvedPrompt:
      'Analyze {{feedback_items}} and categorize findings into: [Critical Bugs, Feature Requests, UX Friction]. For each category, cite exact user quotes, quantify occurrence frequency, and recommend the top 2 immediate engineering actions.',
    models: [
      {
        name: 'GPT-4o',
        modelKey: 'gpt4o',
        latency: '360ms',
        tokens: '135 tok',
        output:
          'Categorized 28 entries into 3 buckets: 42% Onboarding UX, 35% Billing currency clarity, 23% Export speed. Top action: add one-click CSV export.',
        highlight: 'Quantitative classification',
      },
      {
        name: 'Claude 3.5',
        modelKey: 'claude',
        latency: '395ms',
        tokens: '148 tok',
        output:
          'Structured synthesis with cited verbatim feedback. Highlights top friction point: teams need shared prompt collections before rolling out company-wide.',
        highlight: 'Actionable team insights',
      },
      {
        name: 'Gemini 2.0',
        modelKey: 'gemini',
        latency: '270ms',
        tokens: '112 tok',
        output:
          'Rapid summary grouping 50+ lines into high-priority sprint items. Flags 2 blocking bugs in mobile checkout.',
        highlight: 'Speed & sprint categorization',
      },
    ],
  },
];

export const HeroInteractiveStudioDemo: React.FC<HeroInteractiveStudioDemoProps> = ({
  className = '',
}) => {
  const reducedMotion = useReducedMotion();

  // Active state
  const [activeScenarioKey, setActiveScenarioKey] = useState<ScenarioKey>('email');
  const [activeTab, setActiveTab] = useState<'original' | 'improved'>('original');
  const [selectedModelIdx, setSelectedModelIdx] = useState<number>(0);
  const [isImproving, setIsImproving] = useState<boolean>(false);
  const [improvementStep, setImprovementStep] = useState<string>('');
  const [hasImproved, setHasImproved] = useState<boolean>(false);
  const [demoCompleted, setDemoCompleted] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Cancellation reference for rapid switching safety
  const sequenceIdRef = useRef<number>(0);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scenario = SCENARIOS.find((s) => s.id === activeScenarioKey) || SCENARIOS[0];

  // Cancel any in-flight sequence timer
  const cancelCurrentSequence = useCallback(() => {
    sequenceIdRef.current += 1;
    setIsImproving(false);
    setImprovementStep('');
  }, []);

  // Safe scenario switching (cancels in-flight timers, resets to original draft)
  const handleSelectScenario = (key: ScenarioKey) => {
    if (key === activeScenarioKey) return;
    cancelCurrentSequence();
    setActiveScenarioKey(key);
    setActiveTab('original');
    setSelectedModelIdx(0);
    setHasImproved(false);
    setDemoCompleted(false);
  };

  // Staged "Improve sample" action with sequence safety
  const handleImproveSample = () => {
    cancelCurrentSequence();
    const currentSeqId = sequenceIdRef.current;

    setIsImproving(true);
    setImprovementStep('Analyzing constraints...');

    // Phase 1: 150ms
    setTimeout(() => {
      if (sequenceIdRef.current !== currentSeqId) return;
      setImprovementStep('Injecting system persona & guardrails...');
    }, 150);

    // Phase 2: 360ms
    setTimeout(() => {
      if (sequenceIdRef.current !== currentSeqId) return;
      setIsImproving(false);
      setImprovementStep('');
      setActiveTab('improved');
      setHasImproved(true);
      setDemoCompleted(true);

      // Revert character trigger after 1.4s
      setTimeout(() => {
        if (sequenceIdRef.current !== currentSeqId) return;
        setDemoCompleted(false);
      }, 1400);
    }, 360);
  };

  // Replay / Reset action
  const handleReset = () => {
    cancelCurrentSequence();
    setActiveTab('original');
    setHasImproved(false);
    setDemoCompleted(false);
  };

  // Working copy action with confirmation feedback
  const handleCopy = async () => {
    const textToCopy = activeTab === 'original' ? scenario.originalPrompt : scenario.improvedPrompt;
    try {
      await copyToClipboard(textToCopy);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sequenceIdRef.current += 1;
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  return (
    <div
      className={`w-full max-w-xl rounded-2xl border border-slate-200 dark:border-[#1C2B3A] bg-white dark:bg-[#0B1118] shadow-xl text-left select-text transition-all duration-200 ${className}`}
    >
      {/* ─── Top Header: Scenario Selector & Prompt Tile Character ─────── */}
      <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-200/80 dark:border-[#1C2B3A] bg-slate-50/60 dark:bg-[#000000] rounded-t-2xl gap-3">
        {/* Scenario Selector Pills */}
        <div className="flex items-center flex-wrap gap-1.5" role="tablist" aria-label="Sample scenarios" data-tour="tour-scenario-picker">
          {SCENARIOS.map((s) => {
            const isSelected = s.id === activeScenarioKey;
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={isSelected}
                tabIndex={0}
                type="button"
                onClick={() => handleSelectScenario(s.id)}
                className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 active:scale-[0.98] ${
                  isSelected
                    ? 'bg-brand-primary text-white shadow-xs'
                    : 'bg-white dark:bg-[#0B1118] text-slate-600 dark:text-[#C5D7E8] hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#1C2B3A]'
                }`}
              >
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Small Assistant Character in Reserved Slot */}
        <div className="shrink-0 flex items-center gap-2">
          <PipCharacter mood={demoCompleted ? 'celebrate' : 'idle'} size={36} />
        </div>
      </div>

      {/* ─── Middle Section: Before/After Tab Controls & Prompt Card ─── */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Sub-bar: Before/After Tabs + Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-1">
          {/* Tab Switcher */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#000000] border border-slate-200 dark:border-[#1C2B3A] gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('original')}
              className={`min-h-[38px] px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'original'
                  ? 'bg-white dark:bg-[#131D27] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-[#7E97AD] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Original Draft
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('improved')}
              className={`min-h-[38px] px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'improved'
                  ? 'bg-white dark:bg-[#131D27] text-brand-primary dark:text-[#41A2D9] shadow-xs'
                  : 'text-slate-500 dark:text-[#7E97AD] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Improved Prompt</span>
              {hasImproved && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary dark:bg-[#41A2D9]" />
              )}
            </button>
          </div>

          {/* Action Buttons: Improve, Copy, Reset */}
          <div className="flex items-center gap-1.5">
            {activeTab === 'original' ? (
              <button
                type="button"
                onClick={handleImproveSample}
                disabled={isImproving}
                data-tour="tour-improve-action"
                className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-brand-primary hover:bg-blue-700 disabled:opacity-70 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-[0.98]"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{isImproving ? improvementStep || 'Improving...' : 'Improve sample'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleReset}
                className="min-h-[44px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#000000] hover:bg-slate-200 dark:hover:bg-[#131D27] text-slate-700 dark:text-[#C5D7E8] text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                title="Reset to original draft"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              data-tour="tour-copy-action"
              aria-label="Copy prompt text"
              className="min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#000000] hover:bg-slate-200 dark:hover:bg-[#131D27] text-slate-700 dark:text-[#C5D7E8] text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1"
              title="Copy prompt"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[11px] hidden sm:inline">Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Prompt Card Box */}
        <div data-tour="tour-prompt-editor" className="relative min-h-[110px] p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-[#1A242E] border border-slate-200/80 dark:border-[#1C2B3A] font-mono text-xs sm:text-[13px] leading-relaxed transition-colors">
          <AnimatePresence mode="wait">
            {activeTab === 'original' ? (
              <motion.div
                key="original"
                initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
                transition={{ duration: 0.2, ease: EASE }}
                className="text-slate-700 dark:text-[#C5D7E8]"
              >
                <span className="text-slate-400 select-none mr-2 font-sans font-semibold text-[11px] uppercase tracking-wider block mb-1">
                  Draft Prompt
                </span>
                {scenario.originalPrompt}
              </motion.div>
            ) : (
              <motion.div
                key="improved"
                initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
                transition={{ duration: 0.2, ease: EASE }}
                className="text-slate-800 dark:text-[#FFFFFF]"
              >
                <div className="flex items-center gap-2 mb-1.5 select-none">
                  <span className="text-brand-primary dark:text-[#41A2D9] font-sans font-bold text-[11px] uppercase tracking-wider">
                    Structured Prompt (Production Ready)
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-[#131D27] text-brand-primary dark:text-[#41A2D9] text-[10px] font-semibold">
                    Parameters Injected
                  </span>
                </div>
                {scenario.improvedPrompt}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Staged progress overlay */}
          {isImproving && (
            <div className="absolute inset-0 rounded-xl bg-white/90 dark:bg-[#1A242E]/90 flex items-center justify-center p-4 backdrop-blur-2xs">
              <div className="flex items-center gap-2 text-brand-primary dark:text-[#41A2D9] font-sans text-xs font-semibold animate-pulse">
                <Sparkles className="w-4 h-4" />
                <span>{improvementStep}</span>
              </div>
            </div>
          )}
        </div>

        {/* ─── Bottom Section: Multi-Model Response Comparison ─────────── */}
        <div className="pt-2 border-t border-slate-100 dark:border-[#1C2B3A]/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-slate-500 dark:text-[#7E97AD] uppercase tracking-wider font-semibold">
              Model Comparison Preview
            </span>
            {/* Model Selector Tabs */}
            <div data-tour="tour-model-tabs" className="flex items-center gap-1">
              {scenario.models.map((m, idx) => (
                <button
                  key={m.modelKey}
                  type="button"
                  onClick={() => setSelectedModelIdx(idx)}
                  className={`min-h-[36px] px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-colors cursor-pointer ${
                    selectedModelIdx === idx
                      ? 'bg-blue-50 dark:bg-[#131D27] text-brand-primary dark:text-[#41A2D9] font-bold border border-blue-200/80 dark:border-[#1C2B3A]'
                      : 'text-slate-500 dark:text-[#7E97AD] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Model Output */}
          <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#1A242E] border border-slate-200/60 dark:border-[#1C2B3A] text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-slate-900 dark:text-white">
                {scenario.models[selectedModelIdx].name}
              </span>
              <div className="flex items-center gap-2 text-[10.5px] font-mono text-slate-500 dark:text-[#7E97AD]">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {scenario.models[selectedModelIdx].latency}
                </span>
                <span>•</span>
                <span>{scenario.models[selectedModelIdx].tokens}</span>
              </div>
            </div>
            <p className="text-slate-600 dark:text-[#C5D7E8] font-sans text-xs leading-relaxed line-clamp-2">
              {scenario.models[selectedModelIdx].output}
            </p>
            <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-[#7E97AD] pt-1 border-t border-slate-200/40 dark:border-[#1C2B3A]">
              <span>Feature: {scenario.models[selectedModelIdx].highlight}</span>
              <span className="text-brand-primary dark:text-[#41A2D9] font-medium">Illustrative response</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Footer Telemetry Label ──────────────────────────────────── */}
      <div className="px-4 py-2.5 rounded-b-2xl bg-slate-50 dark:bg-[#000000] border-t border-slate-200/80 dark:border-[#1C2B3A] flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-[#7E97AD]">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-primary dark:text-[#41A2D9]" />
          <span>Sample demo · 0 credits consumed · No API calls</span>
        </div>
        <span className="hidden sm:inline text-slate-400">Client-side simulation</span>
      </div>
    </div>
  );
};

export default HeroInteractiveStudioDemo;
