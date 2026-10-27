import React, { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { 
  BookmarkCheck, 
  ArrowRight, 
  ArrowLeft,
  Copy, 
  Check, 
  Code2,
  Sliders,
  History,
  CheckCircle2,
  FolderLock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { EASE, DURATION } from '../../lib/animations';
import { useApp } from '../../context/AppContext';
import { draftPersistenceService } from '../../services/draftPersistenceService';

export interface StorySaveStageProps {
  onNext?: () => void;
  onBack?: () => void;
  className?: string;
}

const SAVED_PROMPT_TEMPLATE = `Act as a Principal Prompt Engineer and LLM diagnostic specialist.

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

interface VariablePreset {
  id: string;
  name: string;
  values: {
    target_model: string;
    broken_prompt: string;
    expected_behavior: string;
    observed_failure: string;
  };
}

const VARIABLE_PRESETS: VariablePreset[] = [
  {
    id: 'json',
    name: 'JSON Schema Extraction',
    values: {
      target_model: 'Claude 3.5 Sonnet',
      broken_prompt: 'Extract action items from customer calls into JSON',
      expected_behavior: 'Strict JSON array with task, owner, deadline',
      observed_failure: 'Preamble text and markdown code fence leakage',
    },
  },
  {
    id: 'tools',
    name: 'Agentic Tool Calling',
    values: {
      target_model: 'GPT-4o',
      broken_prompt: 'Call the billing API when user asks about subscription',
      expected_behavior: 'Deterministic function call with customer_id and period',
      observed_failure: 'Model answers with generic explanation instead of calling tool',
    },
  },
];

const VERSION_TIMELINE = [
  { version: 'v1.0', label: 'Initial diagnostic baseline with 4 parameters' },
  { version: 'v1.1', label: 'Added negative constraint & markdown fence suppression' },
  { version: 'v2.0', label: 'Multi-model tested with Claude 3.5 Sonnet winner', active: true },
];

export const StorySaveStage: React.FC<StorySaveStageProps> = ({
  onNext,
  onBack,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-60px' });

  const { setActiveTab, showToast } = useApp();

  const [activePresetId, setActivePresetId] = useState<string>('json');
  const [selectedVariable, setSelectedVariable] = useState<string>('broken_prompt');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string>('v2.0');
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);

  const prefersReduced = 
    typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const currentPreset = 
    VARIABLE_PRESETS.find((p) => p.id === activePresetId) || VARIABLE_PRESETS[0];

  const handleSaveToVault = () => {
    setSaveState('saving');
    setTimeout(() => {
      // Save directly into PromptHub browser draft cache
      draftPersistenceService.saveWorkspaceDraft({
        title: 'Prompt Debugger & Schema Hardener',
        description: 'Production prompt engineering debugger with root-cause diagnostic architecture, schema boundaries, and test validation.',
        rawContent: SAVED_PROMPT_TEMPLATE,
        category: 'Development',
        tagsText: 'Prompt Engineering, Debugging, Reliability, Schema',
        model: 'anthropic/claude-3.5-sonnet',
        visibility: 'private',
        variableValues: currentPreset.values,
        lastUpdatedAt: Date.now(),
      });
      setSaveState('saved');
      showToast?.('Prompt template saved to browser vault cache', 'success');
    }, 600);
  };

  const handleOpenInIDE = () => {
    // Persist draft and transition to PromptHub Workspace IDE
    draftPersistenceService.saveWorkspaceDraft({
      title: 'Prompt Debugger & Schema Hardener',
      description: 'Production prompt engineering debugger with root-cause diagnostic architecture, schema boundaries, and test validation.',
      rawContent: SAVED_PROMPT_TEMPLATE,
      category: 'Development',
      tagsText: 'Prompt Engineering, Debugging, Reliability, Schema',
      model: 'anthropic/claude-3.5-sonnet',
      visibility: 'private',
      variableValues: currentPreset.values,
      lastUpdatedAt: Date.now(),
    });
    showToast?.('Loading prompt into Prompt IDE Workspace...', 'info');
    setActiveTab?.('workspace');
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(SAVED_PROMPT_TEMPLATE);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
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
          <BookmarkCheck className="w-3 h-3" />
          <span>Stage 06 • Prompt Asset Vault &amp; Reuse</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: prefersReduced ? 0 : DURATION.reveal, delay: prefersReduced ? 0 : 0.1, ease: EASE }}
          className="space-y-1"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display tracking-tight text-text-primary leading-tight">
            Turn prompts into assets. <span className="text-brand-primary">Save, version, and reuse.</span>
          </h2>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: prefersReduced ? 0 : DURATION.reveal, delay: prefersReduced ? 0 : 0.2, ease: EASE }}
          className="text-xs sm:text-sm text-text-secondary max-w-lg mx-auto leading-relaxed font-sans"
        >
          PromptHub transforms one-off prompts into versioned, production assets with dynamic variables that power automated pipelines across your team.
        </motion.p>
      </div>

      {/* ─── CENTERPIECE WORKBENCH: SAVED PROMPT SNAPSHOT ──────────── */}
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
              <FolderLock className="w-3.5 h-3.5 text-brand-primary" />
              <span className="font-medium text-text-primary">prompthub-vault/cold-email-b2b-saas.prompt</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="px-2 py-0.5 rounded bg-bg-secondary border border-border-default text-text-muted">
              Story Preset Asset
            </span>
            <span className="px-2 py-0.5 rounded bg-brand-primary-light text-brand-primary border border-brand-primary/20 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Ready for IDE Handoff
            </span>
          </div>
        </div>

        {/* Workbench Body: Two-Column Responsive Split */}
        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ─── LEFT: SAVED PROMPT CARD (7 Cols) ─────────────────── */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-4 sm:p-5 rounded-xl bg-bg-primary border border-border-default space-y-3.5 shadow-2xs">
              {/* Asset Title & Version Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border-subtle">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                    PromptHub Template
                  </span>
                  <h3 className="font-bold text-sm sm:text-base text-text-primary font-display">
                    Prompt Debugger & Schema Hardener
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-brand-primary-light text-brand-primary border border-brand-primary/20 text-xs font-mono font-bold">
                    {selectedVersion}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-bg-secondary border border-border-default text-text-muted text-[11px] font-mono">
                    Diagnostic Spec
                  </span>
                </div>
              </div>

              {/* Template Code Preview with Variable Highlights & Controlled Space */}
              <div className="relative">
                <div className={`p-3.5 rounded-lg bg-bg-secondary border border-border-default font-mono text-xs text-text-primary leading-relaxed whitespace-pre-wrap transition-all duration-300 ${
                  isPromptExpanded ? 'max-h-80 overflow-y-auto' : 'max-h-[150px] overflow-hidden'
                }`}>
                  {SAVED_PROMPT_TEMPLATE.split(/(\{\{[a-zA-Z0-9_-]+\}\})/g).map((chunk, i) => {
                    if (chunk.startsWith('{{') && chunk.endsWith('}}')) {
                      const varKey = chunk.slice(2, -2);
                      const isSelected = selectedVariable === varKey;
                      return (
                        <span
                          key={i}
                          onClick={() => setSelectedVariable(varKey)}
                          className={`inline-block px-1.5 py-0.5 mx-0.5 rounded font-bold cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-brand-primary text-white ring-2 ring-brand-primary/40'
                              : 'bg-brand-primary-light text-brand-primary border border-brand-primary/30 hover:bg-brand-primary hover:text-white'
                          }`}
                          title={`Click to inspect {{${varKey}}}`}
                        >
                          {chunk}
                        </span>
                      );
                    }
                    return <span key={i}>{chunk}</span>;
                  })}
                </div>

                {!isPromptExpanded && (
                  <div 
                    className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-bg-secondary via-bg-secondary/80 to-transparent rounded-b-lg pointer-events-none" 
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* Expand Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-text-muted">
                  {isPromptExpanded ? 'Full template view' : 'Showing first 6 lines'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                  className="text-xs font-mono font-medium text-brand-primary hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {isPromptExpanded ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Show less</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>View full template</span>
                    </>
                  )}
                </button>
              </div>

              {/* Prompt Tags */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {['Prompt Engineering', 'Debugging', 'Reliability', 'Schema Guard', 'Anthropic Tested'].map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-bg-secondary border border-border-default text-text-muted"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ─── RIGHT: VARIABLE PRESETS & VERSIONING (5 Cols) ────── */}
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            {/* Dynamic Variables Drawer */}
            <div className="p-4 rounded-xl bg-bg-primary border border-border-default space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-text-primary flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Variable Values</span>
                </span>
                <span className="text-[10px] font-mono text-text-muted">
                  4 Parameters
                </span>
              </div>

              {/* Preset Selector */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-bg-secondary border border-border-default">
                {VARIABLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setActivePresetId(preset.id)}
                    className={`py-1.5 px-2 rounded-md text-[11px] font-mono transition-all cursor-pointer min-h-[36px] truncate ${
                      activePresetId === preset.id
                        ? 'bg-brand-primary text-white font-bold shadow-2xs'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {preset.name.split(' ')[0]}
                  </button>
                ))}
              </div>

              {/* Active Variable Bindings */}
              <div className="space-y-2 text-xs font-mono">
                {Object.entries(currentPreset.values).map(([key, val]) => {
                  const isSelected = selectedVariable === key;
                  return (
                    <div
                      key={key}
                      onClick={() => setSelectedVariable(key)}
                      className={`p-2 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-brand-primary-light border-brand-primary/40 text-brand-primary'
                          : 'bg-bg-secondary border-border-subtle hover:border-border-default text-text-secondary'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                        <span>{`{{${key}}}`}</span>
                        {isSelected && <span className="text-[9px]">Active</span>}
                      </div>
                      <div className="text-[11px] font-sans font-medium text-text-primary truncate mt-0.5">
                        "{val}"
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Version Evolution History */}
            <div className="p-3.5 rounded-xl bg-bg-primary border border-border-default space-y-2 text-xs font-mono shadow-2xs">
              <div className="flex items-center justify-between text-text-muted text-[11px]">
                <span className="flex items-center gap-1 font-semibold text-text-primary">
                  <History className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Version Lineage</span>
                </span>
                <span>3 Commits</span>
              </div>

              <div className="space-y-1.5">
                {VERSION_TIMELINE.map((item) => (
                  <div
                    key={item.version}
                    onClick={() => setSelectedVersion(item.version)}
                    className={`p-1.5 px-2 rounded border flex items-center justify-between cursor-pointer transition-colors ${
                      selectedVersion === item.version
                        ? 'bg-brand-primary-light border-brand-primary/30 text-brand-primary font-bold'
                        : 'bg-bg-secondary border-border-subtle text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <span className="font-bold">{item.version}</span>
                    <span className="text-[10px] truncate max-w-[170px]">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleSaveToVault}
                disabled={saveState === 'saving'}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-mono font-semibold transition-all min-h-[44px] cursor-pointer flex items-center justify-center gap-2 ${
                  saveState === 'saved'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-bg-primary hover:bg-bg-tertiary border border-border-default text-text-primary'
                }`}
              >
                {saveState === 'saving' && <span>Saving to Vault...</span>}
                {saveState === 'saved' && (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Saved to Local Vault ✓</span>
                  </>
                )}
                {saveState === 'idle' && (
                  <>
                    <FolderLock className="w-4 h-4 text-brand-primary" />
                    <span>Save to PromptHub Vault</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="py-2 px-3 rounded-lg border border-border-default bg-bg-primary hover:bg-bg-tertiary text-text-primary text-xs font-mono transition-colors min-h-[44px] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {copiedPrompt ? <Check className="w-3.5 h-3.5 text-brand-primary" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPrompt ? 'Copied' : 'Copy Spec'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenInIDE}
                  className="py-2 px-3 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-mono font-bold transition-all shadow-2xs hover:shadow-xs min-h-[44px] cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Open in IDE</span>
                </button>
              </div>
            </div>
          </div>
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
              <span>Back to Comparison</span>
            </button>
          )}

          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs min-h-[44px] cursor-pointer active:scale-[0.98]"
            >
              <span>See The PromptHub Difference</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default StorySaveStage;