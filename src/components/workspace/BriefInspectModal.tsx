/**
 * src/components/workspace/BriefInspectModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Developer Project Brief Inspector Modal for PromptHub.
 *
 * Implements:
 * - Master Prompt §4: Structured Brief and Prompt Enhancement
 * - Impeccable & Taste-Skill Standards:
 *   - Smooth quartic easing (cubic-bezier(0.16, 1, 0.3, 1))
 *   - Minimum 44px touch targets (min-h-[44px])
 *   - Zero emojis in core UI (monochrome SVG primitives)
 *   - Deep Navy & Slate design tokens (#263643, #1F2A34, #2E4050, #42586B, #88BDF2)
 * - 5 Developer Tabs:
 *   1. Overview & Intent
 *   2. Requirements & Rules
 *   3. Execution Context
 *   4. Validation & Decisions
 *   5. Raw JSON / Prompt
 * - Multi-turn version navigation (v1, v2, v3...)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
  Layers,
  AlertTriangle,
  Copy,
  Check,
  Code2,
  Target,
  Users,
  Wrench,
  History,
  DollarSign,
  ScrollText,
} from 'lucide-react';
import type { StructuredProjectBrief } from '../../types/projectBrief';

export interface BriefInspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  brief: StructuredProjectBrief | null;
  briefHistory?: StructuredProjectBrief[];
  onSelectVersion?: (version: number) => void;
}

type BriefTabKey = 'overview' | 'requirements' | 'execution' | 'validation' | 'raw';

export const BriefInspectModal: React.FC<BriefInspectModalProps> = ({
  isOpen,
  onClose,
  brief,
  briefHistory = [],
  onSelectVersion,
}) => {
  const [activeTab, setActiveTab] = useState<BriefTabKey>('overview');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async (text: string, sectionKey: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(sectionKey);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch {}
  };

  const currentBrief = brief;

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="brief-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] bg-bg-secondary border border-border-default rounded-2xl shadow-2xl flex flex-col overflow-hidden text-left font-sans text-text-primary"
        style={{
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ──────────────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-border-default bg-bg-primary flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0 mt-0.5">
              <ScrollText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="brief-modal-title" className="text-base sm:text-lg font-bold font-display text-text-primary">
                  Adaptive Project Brief
                </h2>
                {currentBrief && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary font-bold">
                    Turn #{currentBrief.version}
                  </span>
                )}
                {currentBrief?.selectedModel && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-bg-tertiary border border-border-default text-text-secondary">
                    {currentBrief.selectedModel.modelId.split('/').pop()}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-0.5 truncate">
                {currentBrief?.goal || currentBrief?.originalRequest || 'Active workspace execution contract and constraints'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {currentBrief && (
              <button
                type="button"
                onClick={() => handleCopy(JSON.stringify(currentBrief, null, 2), 'header-json')}
                className="min-h-[44px] px-3.5 py-1.5 rounded-xl border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors cursor-pointer shadow-3xs"
                title="Copy complete brief as JSON"
              >
                {copiedSection === 'header-json' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-text-muted" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] rounded-xl border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-muted hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close brief inspector"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Version History Switcher ────────────────────────────────────────── */}
        {briefHistory.length > 1 && (
          <div className="px-4 py-2 border-b border-border-default bg-bg-primary flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[11px] font-mono font-semibold text-text-muted flex items-center gap-1 shrink-0">
              <History className="w-3 h-3 text-brand-primary" />
              <span>Versions:</span>
            </span>
            <div className="flex items-center gap-1.5">
              {briefHistory.map((hb) => {
                const isActive = hb.version === currentBrief?.version;
                return (
                  <button
                    key={`${hb.id}_${hb.version}`}
                    type="button"
                    onClick={() => onSelectVersion && onSelectVersion(hb.version)}
                    className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-brand-primary text-white font-bold shadow-xs'
                        : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary border border-border-default'
                    }`}
                  >
                    v{hb.version}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tab Navigation Bar ──────────────────────────────────────────────── */}
        <div className="border-b border-border-default bg-bg-primary flex items-center gap-1 px-4 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'overview' as const, label: 'Overview & Intent', icon: Target },
            { id: 'requirements' as const, label: 'Requirements & Rules', icon: ShieldAlert },
            { id: 'execution' as const, label: 'Execution Context', icon: Wrench },
            { id: 'validation' as const, label: 'Validation & Decisions', icon: CheckCircle2 },
            { id: 'raw' as const, label: 'Raw JSON', icon: Code2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-text-muted hover:text-text-primary hover:border-border-default'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-brand-primary' : 'text-text-muted'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Tab Content Body ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar bg-bg-secondary text-text-primary">
          {!currentBrief ? (
            <div className="py-12 text-center text-text-muted">
              <ScrollText className="w-10 h-10 mx-auto text-text-muted mb-3 opacity-60" />
              <p className="text-sm font-medium text-text-secondary">No active project brief available.</p>
              <p className="text-xs text-text-muted mt-1">Start a conversation or submit a prompt to generate an execution brief.</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW & INTENT */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* Original Prompt */}
                  <div className="p-4 rounded-xl bg-bg-primary border border-border-default">
                    <div className="text-[11px] font-mono font-bold text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-brand-primary" />
                      <span>Original User Request</span>
                    </div>
                    <p className="text-xs sm:text-sm text-text-primary font-mono leading-relaxed break-words whitespace-pre-wrap">
                      {currentBrief.originalRequest || 'No verbatim query recorded.'}
                    </p>
                  </div>

                  {/* Goal & Audience Bento */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-bg-primary border border-border-default">
                      <div className="text-[11px] font-mono font-bold text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Functional Goal</span>
                      </div>
                      <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                        {currentBrief.goal || 'Not specified'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-bg-primary border border-border-default">
                      <div className="text-[11px] font-mono font-bold text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Target Audience</span>
                      </div>
                      <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                        {currentBrief.audience || 'General end-users & developers'}
                      </p>
                    </div>
                  </div>

                  {/* Intent & Model Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-bg-primary border border-border-default">
                      <div className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider mb-1">
                        Classified Intent
                      </div>
                      <div className="text-xs font-bold text-brand-primary font-mono">
                        {currentBrief.intent}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-bg-primary border border-border-default">
                      <div className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider mb-1">
                        Selected Model
                      </div>
                      <div className="text-xs font-semibold text-text-primary truncate font-mono">
                        {currentBrief.selectedModel.modelId}
                      </div>
                      <div className="text-[10.5px] text-text-muted mt-0.5 font-mono">
                        Lane: {currentBrief.selectedModel.lane}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-bg-primary border border-border-default">
                      <div className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-amber-500" />
                        <span>Budget & Approval</span>
                      </div>
                      <div className="text-xs font-semibold text-text-primary">
                        {currentBrief.budgetBoundaries.maxCreditCost === 0
                          ? '0 Credits (Free Model / BYOK)'
                          : `${currentBrief.budgetBoundaries.maxCreditCost} Credits Reserved`}
                      </div>
                      <div className="text-[10.5px] text-text-muted mt-0.5">
                        {currentBrief.budgetBoundaries.requiresExplicitApproval
                          ? 'Requires confirmation'
                          : 'Pre-approved execution'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: REQUIREMENTS & RULES */}
              {activeTab === 'requirements' && (
                <div className="space-y-4">
                  {/* Negative Exclusions (Critical Guardrail) */}
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <div className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Negative Constraints & Exclusions (Must Never Violate)</span>
                    </div>
                    {currentBrief.exclusions && currentBrief.exclusions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {currentBrief.exclusions.map((exc, i) => (
                          <span
                            key={i}
                            className="text-xs font-mono px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 flex items-center gap-1.5"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>{exc}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-700/80 dark:text-amber-200/70 italic">
                        No negative exclusions declared for this turn.
                      </p>
                    )}
                  </div>

                  {/* Confirmed Facts */}
                  <div className="p-4 rounded-xl bg-bg-primary border border-border-default">
                    <div className="text-[11px] font-mono font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Confirmed Facts (Zero Hallucinations)</span>
                    </div>
                    {currentBrief.confirmedFacts && currentBrief.confirmedFacts.length > 0 ? (
                      <ul className="space-y-1.5">
                        {currentBrief.confirmedFacts.map((fact, idx) => (
                          <li key={idx} className="text-xs sm:text-sm text-text-secondary flex items-start gap-2">
                            <span className="text-emerald-500 font-bold shrink-0 mt-0.5">&bull;</span>
                            <span>{fact}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-text-muted italic">No confirmed facts recorded.</p>
                    )}
                  </div>

                  {/* Explicit Requirements */}
                  <div className="p-4 rounded-xl bg-bg-primary border border-border-default">
                    <div className="text-[11px] font-mono font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-brand-primary" />
                      <span>Explicit Feature Requirements</span>
                    </div>
                    {currentBrief.requirements && currentBrief.requirements.length > 0 ? (
                      <ul className="space-y-1.5">
                        {currentBrief.requirements.map((req, idx) => (
                          <li key={idx} className="text-xs sm:text-sm text-text-secondary flex items-start gap-2">
                            <span className="text-brand-primary font-mono text-xs font-bold shrink-0 mt-0.5">
                              {(idx + 1).toString().padStart(2, '0')}
                            </span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-text-muted italic">No explicit requirements specified.</p>
                    )}
                  </div>

                  {/* Working Assumptions */}
                  <div className="p-4 rounded-xl bg-bg-primary border border-border-default">
                    <div className="text-[11px] font-mono font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Declared Assumptions (Pending Approval)</span>
                    </div>
                    {currentBrief.assumptions && currentBrief.assumptions.length > 0 ? (
                      <ul className="space-y-1.5">
                        {currentBrief.assumptions.map((asm, idx) => (
                          <li key={idx} className="text-xs text-text-secondary flex items-start gap-2">
                            <span className="text-text-muted shrink-0 mt-0.5">&bull;</span>
                            <span>{asm}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-text-muted italic">No working assumptions required.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: EXECUTION CONTEXT */}
              {activeTab === 'execution' && (
                <div className="space-y-4">
                  {/* Style, Tone & Output Format */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-bg-primary border border-border-default">
                      <div className="text-[11px] font-mono font-bold text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                        <span>Style & Tone</span>
                      </div>
                      <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                        {currentBrief.styleAndTone || 'Crisp, modern developer aesthetic with accessible contrast'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-bg-primary border border-border-default">
                      <div className="text-[11px] font-mono font-bold text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Target Output Format</span>
                      </div>
                      <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-mono">
                        {currentBrief.outputFormat || 'Self-contained executable artifact'}
                      </p>
                    </div>
                  </div>

                  {/* Active Skills & Allowed Tools */}
                  <div className="p-4 rounded-xl bg-bg-primary border border-border-default">
                    <div className="text-[11px] font-mono font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-brand-primary" />
                      <span>Active Skills & Authorized Tools</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-[10.5px] font-mono text-text-muted mb-1">Active Skills:</div>
                        {currentBrief.activeSkills && currentBrief.activeSkills.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {currentBrief.activeSkills.map((sk, i) => (
                              <span
                                key={i}
                                className="text-xs font-mono px-2 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted italic">No custom skills loaded.</span>
                        )}
                      </div>

                      <div>
                        <div className="text-[10.5px] font-mono text-text-muted mb-1">Allowed Tools & Plugins:</div>
                        {currentBrief.allowedTools && currentBrief.allowedTools.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {currentBrief.allowedTools.map((tl, i) => (
                              <span
                                key={i}
                                className="text-xs font-mono px-2 py-0.5 rounded-md bg-bg-tertiary text-text-secondary border border-border-default"
                              >
                                {tl}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted italic">Zero external tools permitted (pure isolated model execution).</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Multimodal Attachments */}
                  <div className="p-4 rounded-xl bg-bg-primary border border-border-default">
                    <div className="text-[11px] font-mono font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Multimodal Attachments ({currentBrief.attachments?.length || 0})</span>
                    </div>
                    {currentBrief.attachments && currentBrief.attachments.length > 0 ? (
                      <div className="space-y-2">
                        {currentBrief.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="p-2.5 rounded-lg bg-bg-secondary border border-border-default flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-semibold text-text-primary truncate">{att.fileName}</span>
                              <span className="text-[10px] font-mono text-text-muted uppercase">({att.mimeType})</span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                              {att.status || 'extracted'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted italic">No attachments bound to this turn.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: VALIDATION & DECISIONS */}
              {activeTab === 'validation' && (
                <div className="space-y-4">
                  {/* Approved Decisions */}
                  <div className="p-4 rounded-xl bg-bg-primary border border-border-default">
                    <div className="text-[11px] font-mono font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Approved Architectural & Content Decisions</span>
                    </div>
                    {currentBrief.approvedDecisions && currentBrief.approvedDecisions.length > 0 ? (
                      <ul className="space-y-1.5">
                        {currentBrief.approvedDecisions.map((dec, i) => (
                          <li key={i} className="text-xs sm:text-sm text-text-secondary flex items-start gap-2">
                            <span className="text-emerald-500 font-bold shrink-0 mt-0.5">&bull;</span>
                            <span>{dec}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-text-muted italic">No formal decisions logged yet.</p>
                    )}
                  </div>

                  {/* Validation Criteria */}
                  <div className="p-4 rounded-xl bg-bg-primary border border-border-default">
                    <div className="text-[11px] font-mono font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary" />
                      <span>Task-Specific Validation Criteria</span>
                    </div>
                    {currentBrief.validationCriteria && currentBrief.validationCriteria.length > 0 ? (
                      <ul className="space-y-1.5">
                        {currentBrief.validationCriteria.map((vc, i) => (
                          <li key={i} className="text-xs sm:text-sm text-text-secondary flex items-start gap-2">
                            <span className="text-brand-primary shrink-0 mt-0.5">&bull;</span>
                            <span>{vc}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-text-muted italic">Standard HTML/syntax static checks apply.</p>
                    )}
                  </div>

                  {/* Open Questions */}
                  <div className="p-4 rounded-xl bg-bg-primary border border-border-default">
                    <div className="text-[11px] font-mono font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Open Questions for User Clarification</span>
                    </div>
                    {currentBrief.openQuestions && currentBrief.openQuestions.length > 0 ? (
                      <ul className="space-y-1.5">
                        {currentBrief.openQuestions.map((q, i) => (
                          <li key={i} className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                            <span className="text-amber-500 font-bold shrink-0">?</span>
                            <span>{q}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-text-muted italic">Zero blocking questions. Execution is fully specified.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: RAW JSON */}
              {activeTab === 'raw' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-text-muted">
                      18-Field Serialized StructuredProjectBrief (v{currentBrief.version})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(JSON.stringify(currentBrief, null, 2), 'raw-json')}
                      className="min-h-[36px] px-3 py-1 rounded-lg border border-border-default bg-bg-primary hover:bg-bg-tertiary text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors cursor-pointer shadow-3xs"
                    >
                      {copiedSection === 'raw-json' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-text-muted" />
                          <span>Copy Payload</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-bg-tertiary border border-border-default text-[11px] sm:text-xs font-mono text-text-primary overflow-x-auto max-h-[500px] custom-scrollbar leading-relaxed">
                    {JSON.stringify(currentBrief, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Modal Footer ──────────────────────────────────────────────────────── */}
        <div className="p-4 border-t border-border-default bg-bg-primary flex items-center justify-between shrink-0">
          <div className="text-[11px] font-mono text-text-muted flex items-center gap-2">
            <span>Brief ID: <code className="text-text-primary font-bold">{currentBrief?.id || 'none'}</code></span>
            <span>&bull;</span>
            <span>Created: {currentBrief ? new Date(currentBrief.createdAt).toLocaleTimeString() : 'N/A'}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
