import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  SlidersHorizontal,
  Copy,
  CheckCheck,
  Terminal,
  Sparkles,
  MoveHorizontal,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  FileCode2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface TransformationSample {
  id: string;
  name: string;
  category: string;
  rough: {
    title: string;
    sub: string;
    text: string;
    vulnerabilities: string[];
    score: number;
  };
  hardened: {
    title: string;
    sub: string;
    text: string;
    guarantees: string[];
    score: number;
  };
}

// Single featured sample case as requested
const FEATURED_SAMPLE: TransformationSample = {
  id: 'finance',
  name: 'Financial Extraction & MRR Audit',
  category: 'Finance',
  rough: {
    title: 'BEFORE: Rough Prompt',
    sub: 'High Ambiguity · Untyped Schema · Hallucination Risk',
    text: 'Extract all customer subscription changes, MRR numbers, and churn reasons from this raw transcript and return it as JSON. Make sure the math is accurate and there are no errors.',
    vulnerabilities: [
      'Output schema is unspecified — models return unpredictable keys.',
      'Zero negative constraints — prone to conversational preambles.',
      'No arithmetic guardrails — high hallucination risk on delta figures.',
    ],
    score: 42,
  },
  hardened: {
    title: 'AFTER: Hardened Architecture',
    sub: '100% Deterministic Contract · Strict RFC-8259 Schema · 422 Fallback',
    text: `System: You are an autonomous Enterprise Financial Audit & Extraction Agent.
Context: Ingest and parse {{transcript_payload}} with zero external extrapolation.

Strict JSON Schema Architecture:
{
  "organization_id": "{{org_id}}",
  "audit_timestamp": "ISO-8601 UTC",
  "subscription_events": [
    {
      "customer_id": "string",
      "event_type": "expansion" | "contraction" | "churn",
      "mrr_delta_usd": "number (exact decimal)",
      "root_cause": "string (max 20 words)"
    }
  ],
  "confidence_score": "number (0.00 to 1.00)"
}

Deterministic Constraints & Guardrails:
1. Arithmetic Verification: Only extract explicitly stated figures; never extrapolate calculations.
2. Strict JSON Only: Output must parse directly with JSON.parse(). No preamble or conversational text.
3. Fallback: If payload is missing data, return {"error": "INSUFFICIENT_AUDIT_DATA", "status": 422}.`,
    guarantees: [
      'Strict JSON Schema',
      'Zero Chatty Preamble',
      'Dynamic Slots {{param}}',
      '422 Error Fallback',
    ],
    score: 98,
  },
};

export const BeforeAfterSlider: React.FC = () => {
  const {
    setActiveTab,
    setArenaPromptDraft,
    setActivePromptId,
    createPrompt,
    isLoggedIn,
    setShowAuthModal,
  } = useApp();

  const sample = FEATURED_SAMPLE;

  // 0 to 100 percentage split position (50 is exact center)
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'slider' | 'split'>('slider');
  const [copiedHardened, setCopiedHardened] = useState<boolean>(false);
  const [copiedRough, setCopiedRough] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);

  // Sync ref with state for event listeners
  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  // Robust calculation of slider position from clientX with full 0-100 range
  const updateSliderFromClientX = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const rawPos = ((clientX - rect.left) / rect.width) * 100;
    // Clamping strictly within [0, 100]
    const clampedPos = Math.max(0, Math.min(100, rawPos));
    setSliderPos(clampedPos);
  }, []);

  // ─── POINTER EVENTS HANDLING (Pointer Capture Engine) ─────────────────────────
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only handle primary button / touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }
    setIsDragging(true);
    updateSliderFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    updateSliderFromClientX(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release error
    }
    setIsDragging(false);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release error
    }
    setIsDragging(false);
  };

  // ─── GLOBAL WINDOW FALLBACK (Ensures dragging never freezes or stops) ──────────
  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      updateSliderFromClientX(clientX);
    };

    const handleGlobalEnd = () => {
      if (isDraggingRef.current) {
        setIsDragging(false);
      }
    };

    window.addEventListener('mousemove', handleGlobalMove, { passive: true });
    window.addEventListener('mouseup', handleGlobalEnd);
    window.addEventListener('touchmove', handleGlobalMove, { passive: true });
    window.addEventListener('touchend', handleGlobalEnd);
    window.addEventListener('touchcancel', handleGlobalEnd);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalEnd);
      window.removeEventListener('touchcancel', handleGlobalEnd);
    };
  }, [updateSliderFromClientX]);

  // ─── KEYBOARD ACCESSIBILITY ──────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 3;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSliderPos((prev) => Math.max(0, prev - step));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSliderPos((prev) => Math.min(100, prev + step));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSliderPos(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSliderPos(100);
    }
  };

  const handleCopyHardened = () => {
    navigator.clipboard.writeText(sample.hardened.text);
    setCopiedHardened(true);
    setTimeout(() => setCopiedHardened(false), 2000);
  };

  const handleCopyRough = () => {
    navigator.clipboard.writeText(sample.rough.text);
    setCopiedRough(true);
    setTimeout(() => setCopiedRough(false), 2000);
  };

  const handleOpenInStudio = async () => {
    try {
      const p = await createPrompt({
        title: 'Hardened Financial Architecture',
        description: `Transformed by PromptHub Engineering Engine (${sample.category})`,
        rawContent: sample.hardened.text,
        category: 'Development',
        tags: ['production', 'hardened', 'split-view', 'finance'],
        model: 'openai/gpt-4o',
        variables: [
          { name: 'transcript_payload', defaultValue: '', description: 'JSON transcript payload' },
          { name: 'org_id', defaultValue: '', description: 'Organization identifier' }
        ],
        visibility: 'private',
        isPremium: false,
        assetType: 'prompt',
      });
      setActivePromptId(p.id);
      setActiveTab('workspace');
    } catch {
      setActiveTab('workspace');
    }
  };

  const handleSendToArena = () => {
    setArenaPromptDraft(sample.hardened.text);
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    setActiveTab('workspace');
  };

  // Human readable state indicator
  const getSplitLabel = () => {
    if (sliderPos <= 5) return '100% Hardened';
    if (sliderPos >= 95) return '100% Rough';
    if (sliderPos >= 45 && sliderPos <= 55) return '50 / 50 Split';
    return `${Math.round(100 - sliderPos)}% Hardened · ${Math.round(sliderPos)}% Rough`;
  };

  return (
    <section
      id="prompt-transformation"
      className="py-10 sm:py-16 px-3 sm:px-6 md:px-8 bg-bg-tertiary border-y border-border-default font-sans text-left relative overflow-hidden"
    >
      <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6">
        {/* Section Heading */}
        <div className="text-center space-y-2 max-w-2xl mx-auto px-2">
          <span className="text-xs font-semibold text-brand-primary font-mono uppercase tracking-widest bg-brand-primary-light border border-brand-primary/20 px-3 py-0.5 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Interactive Split Screen Comparison</span>
          </span>
          <h2 className="text-xl sm:text-3xl font-black font-display text-text-primary tracking-tight">
            See the difference a hardened prompt makes.
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-sans">
            Slide the fluid divider left and right to inspect how vague prompts transform into deterministic, production-grade AI system contracts.
          </p>
        </div>

        {/* Toolbar: Single Sample Case + View Mode Switcher + Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 bg-bg-secondary p-2.5 sm:p-3.5 rounded-xl border border-border-default shadow-xs">
          {/* Single Sample Case Pill */}
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted shrink-0">
              Sample Case:
            </span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-secondary border border-border-default text-text-primary text-xs font-semibold shadow-2xs shrink-0 max-w-full truncate">
              <FileCode2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />
              <span className="truncate">{sample.name}</span>
              <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-brand-primary-light text-brand-primary border border-brand-primary/20 shrink-0">
                {sample.category}
              </span>
            </div>
          </div>

          {/* View Mode Toggle & Quick Actions */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-bg-tertiary p-0.5 rounded-lg border border-border-default text-xs font-mono">
              <button
                type="button"
                onClick={() => setViewMode('slider')}
                className={`px-2.5 sm:px-3 py-1 rounded-md transition-all cursor-pointer min-h-[34px] sm:min-h-[30px] flex items-center ${
                  viewMode === 'slider'
                    ? 'bg-brand-primary text-white font-bold shadow-2xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Split Slider
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-2.5 sm:px-3 py-1 rounded-md transition-all cursor-pointer min-h-[34px] sm:min-h-[30px] flex items-center ${
                  viewMode === 'split'
                    ? 'bg-brand-primary text-white font-bold shadow-2xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Side-by-Side
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyHardened}
                className="px-2.5 sm:px-3 py-1 rounded-lg border border-border-default hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 shadow-2xs min-h-[34px] sm:min-h-[30px]"
                title="Copy Hardened Prompt"
              >
                {copiedHardened ? (
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-text-muted" />
                )}
                <span className="hidden sm:inline">{copiedHardened ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={handleSendToArena}
                className="px-2.5 sm:px-3 py-1 rounded-lg bg-bg-primary hover:bg-border-subtle text-text-primary text-xs font-semibold border border-border-default transition-colors cursor-pointer flex items-center gap-1 min-h-[34px] sm:min-h-[30px] shadow-2xs"
                title="Test in Creation Workspace"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                <span className="hidden sm:inline">Workspace</span>
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            § 1 — FLUID INTERACTIVE SPLIT SLIDER (POINTER CAPTURE ENGINE)
        ══════════════════════════════════════════════════════════════ */}
        {viewMode === 'slider' ? (
          <div className="space-y-3">
            {/* Split Screen Frame Container */}
            <div
              ref={containerRef}
              tabIndex={0}
              role="slider"
              aria-label="Split screen prompt comparison slider"
              aria-valuenow={Math.round(sliderPos)}
              aria-valuemin={0}
              aria-valuemax={100}
              onKeyDown={handleKeyDown}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              className={`relative w-full rounded-2xl border border-border-default bg-bg-secondary overflow-hidden shadow-md select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary transition-shadow ${
                isDragging ? 'cursor-grabbing ring-2 ring-brand-primary/40' : 'cursor-ew-resize'
              }`}
              style={{
                minHeight: '390px',
                touchAction: 'none',
                userSelect: 'none',
              }}
            >
              {/* ─── Layer A: BEFORE (Rough Draft) ────────────────────── */}
              <div
                className="absolute inset-0 p-4 sm:p-7 bg-[#FCF8F2] dark:bg-[#191612] text-text-primary font-mono text-xs sm:text-sm space-y-3 sm:space-y-4 overflow-hidden pointer-events-none"
                style={{
                  clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`,
                }}
              >
                <div className="flex items-center justify-between pb-2 border-b border-amber-200/80 dark:border-amber-900/50">
                  <span className="text-amber-900 dark:text-amber-300 font-bold uppercase font-mono text-xs flex items-center gap-1.5 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span>{sample.rough.title}</span>
                  </span>
                  <span className="text-amber-800 dark:text-amber-300 text-[10px] sm:text-[11px] font-semibold truncate ml-2 bg-amber-100/70 dark:bg-amber-950/70 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
                    Score: {sample.rough.score}/100 · Ambiguous
                  </span>
                </div>

                <div className="p-3.5 sm:p-4 bg-bg-secondary/95 rounded-xl border border-amber-200/90 dark:border-amber-900/50 text-text-primary leading-relaxed max-w-2xl shadow-2xs font-sans text-xs sm:text-sm break-words">
                  "{sample.rough.text}"
                </div>

                <div className="p-3 sm:p-3.5 bg-amber-100/60 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/50 text-amber-950 dark:text-amber-200 text-xs space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-amber-900 dark:text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                    <span>Identified Vulnerabilities:</span>
                  </div>
                  <ul className="space-y-1 pl-1">
                    {sample.rough.vulnerabilities.map((v, i) => (
                      <li key={i} className="text-[11px] sm:text-[11.5px] text-amber-900/90 dark:text-amber-200/90 leading-snug flex items-start gap-1.5">
                        <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">✕</span>
                        <span>{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* ─── Layer B: AFTER (Hardened Architecture) ─────────────── */}
              <div
                className="absolute inset-0 p-4 sm:p-7 bg-[#F2F8F4] dark:bg-[#0E1A13] text-text-primary font-mono text-xs sm:text-sm space-y-3 sm:space-y-4 overflow-hidden pointer-events-none"
                style={{
                  clipPath: `polygon(${sliderPos}% 0, 100% 0, 100% 100%, ${sliderPos}% 100%)`,
                }}
              >
                <div className="flex items-center justify-between pb-2 border-b border-emerald-300/80 dark:border-emerald-800/50">
                  <span className="text-emerald-950 dark:text-emerald-300 font-bold uppercase font-mono text-xs flex items-center gap-1.5 shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                    <span>{sample.hardened.title}</span>
                  </span>
                  <span className="text-emerald-900 dark:text-emerald-300 text-[10px] sm:text-[11px] font-bold truncate ml-2 bg-emerald-100/80 dark:bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800/60">
                    Score: {sample.hardened.score}/100 · 100% Deterministic
                  </span>
                </div>

                <pre className="p-3.5 sm:p-4 bg-bg-secondary/95 rounded-xl border border-emerald-300/90 dark:border-emerald-800/50 text-emerald-950 dark:text-emerald-200 text-[11px] sm:text-xs leading-relaxed max-h-52 sm:max-h-56 overflow-y-auto whitespace-pre-wrap shadow-2xs font-mono break-words">
                  {sample.hardened.text}
                </pre>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-emerald-900 dark:text-emerald-300 font-bold">
                  {sample.hardened.guarantees.map((g, i) => (
                    <span key={i} className="flex items-center gap-1 bg-bg-secondary/80 dark:bg-bg-secondary px-1.5 sm:px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/60 shadow-2xs truncate">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate text-emerald-900 dark:text-emerald-200">{g}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* ─── Draggable Divider Handle & Split Line ──────────────── */}
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-30"
                style={{ left: `${sliderPos}%` }}
              >
                {/* Vertical Divider Line */}
                <div
                  className={`absolute top-0 bottom-0 -translate-x-1/2 w-0.5 transition-colors ${
                    isDragging
                      ? 'bg-brand-primary shadow-[0_0_12px_rgba(49,92,74,0.8)]'
                      : 'bg-brand-primary shadow-sm'
                  }`}
                />

                {/* Central Floating Grab Handle */}
                <div
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-[#111311] transition-transform ${
                    isDragging ? 'scale-110 ring-brand-primary/30 shadow-xl' : 'hover:scale-105'
                  }`}
                >
                  <MoveHorizontal className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
              </div>
            </div>

            {/* Slider Drag Hint & State Label */}
            <div className="flex items-center justify-between text-xs font-mono text-text-muted px-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-secondary border border-border-default font-semibold text-brand-primary text-[11px]">
                <MoveHorizontal className="w-3.5 h-3.5" />
                <span>{getSplitLabel()}</span>
              </span>
              <span className="text-[11px] text-text-muted">
                Drag divider left / right to compare
              </span>
            </div>
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════════
              § 2 — SIDE-BY-SIDE SPLIT VIEW (DETAILED COMPARISON)
          ══════════════════════════════════════════════════════════════ */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Left Card: BEFORE */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/30 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-3 shadow-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-amber-900 dark:text-amber-300 font-bold pb-2 border-b border-amber-200 dark:border-amber-900/50">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>{sample.rough.title}</span>
                  </span>
                  <span className="bg-amber-100/80 dark:bg-amber-950/70 px-2 py-0.5 rounded text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-mono text-[10px] sm:text-xs">
                    Score: {sample.rough.score}/100
                  </span>
                </div>

                <div className="p-3 sm:p-3.5 bg-bg-secondary rounded-xl border border-amber-200 dark:border-amber-900/50 font-sans text-xs sm:text-sm text-text-primary leading-relaxed shadow-2xs break-words">
                  "{sample.rough.text}"
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider block">
                    Identified Vulnerabilities:
                  </span>
                  <ul className="space-y-1 text-xs font-mono text-amber-950 dark:text-amber-200">
                    {sample.rough.vulnerabilities.map((v, i) => (
                      <li key={i} className="flex items-start gap-1.5 leading-snug">
                        <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">✕</span>
                        <span>{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-amber-200 dark:border-amber-900/40 flex items-center justify-between">
                <span className="text-[11px] font-mono text-amber-800 dark:text-amber-300">Unspecified schema</span>
                <button
                  type="button"
                  onClick={handleCopyRough}
                  className="px-2.5 py-1 rounded bg-bg-secondary hover:bg-amber-100/80 dark:hover:bg-amber-950/60 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 min-h-[34px] sm:min-h-[30px]"
                >
                  {copiedRough ? <CheckCheck className="w-3 h-3 text-amber-700 dark:text-amber-400" /> : <Copy className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                  <span>{copiedRough ? 'Copied' : 'Copy Rough'}</span>
                </button>
              </div>
            </div>

            {/* Right Card: AFTER */}
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-900/40 space-y-3 shadow-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-emerald-950 dark:text-emerald-300 font-bold pb-2 border-b border-emerald-300 dark:border-emerald-900/50">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    <span>{sample.hardened.title}</span>
                  </span>
                  <span className="bg-emerald-100/80 dark:bg-emerald-950/70 px-2 py-0.5 rounded text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 font-mono text-[10px] sm:text-xs">
                    Score: {sample.hardened.score}/100
                  </span>
                </div>

                <pre className="p-3 sm:p-3.5 bg-bg-secondary rounded-xl border border-emerald-300 dark:border-emerald-900/50 font-mono text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto shadow-2xs break-words">
                  {sample.hardened.text}
                </pre>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider block">
                    Engineering Guarantees:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 text-xs font-mono text-emerald-900 dark:text-emerald-200 font-bold">
                    {sample.hardened.guarantees.map((g, i) => (
                      <span key={i} className="flex items-center gap-1 bg-bg-secondary/70 dark:bg-bg-secondary px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60 truncate">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="truncate">{g}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between">
                <span className="text-[11px] font-mono text-emerald-800 dark:text-emerald-300">100% Deterministic Contract</span>
                <button
                  type="button"
                  onClick={handleCopyHardened}
                  className="px-2.5 py-1 rounded bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 min-h-[34px] sm:min-h-[30px] shadow-2xs"
                >
                  {copiedHardened ? <CheckCheck className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3 text-white/80" />}
                  <span>{copiedHardened ? 'Copied' : 'Copy Hardened'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Row & Studio Link */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 text-xs text-text-muted font-mono text-center sm:text-left">
            <ShieldCheck className="w-4 h-4 text-brand-primary shrink-0" />
            <span>Deterministic AST compiler &amp; guardrail synthesis engine.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleOpenInStudio}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs min-h-[44px] hover:-translate-y-px active:scale-[0.98]"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Open in Studio IDE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BeforeAfterSlider;


