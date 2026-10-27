import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { modelCatalogService, type CatalogModel } from '../../services/modelCatalogService';
import { calculateCostFromCatalog } from '../../lib/openrouter';
import { aiGateway } from '../../services/ai/aiGateway';
import { multiProviderService } from '../../services/ai/multiProviderService';
import { securityUtils } from '../../utils/security';
import { ThoughtChain } from '../ai/ThoughtChain';
import { AIBubble } from '../ai/AIBubble';
import { ModelSelectorModal } from '../ModelSelectorModal';
import { AIUpgradeModal } from '../AIUpgradeModal';
import { motion, AnimatePresence } from 'framer-motion';
import type { ArenaResultItem, ArenaRun } from '../../db/schema';
import {
  Swords,
  Play,
  RotateCcw,
  Sparkles,
  Award,
  Trophy,
  Clock,
  Coins,
  Cpu,
  Copy,
  Check,
  Layers,
  ArrowLeftRight,
  Share2,
  Trash2,
  AlertCircle,
  Plus,
  X,
  Settings2,
  XCircle,
  RefreshCw,
  ArrowRight,
  Hash,
  Zap,
} from 'lucide-react';

// Curated Benchmark Challenges for Instant Testing
export const BENCHMARK_PRESETS = [
  {
    id: 'code-refactor',
    title: 'TypeScript Architecture & Clean Code',
    category: 'Development',
    description: 'Benchmarks clean architecture, generic type safety, and memory optimization.',
    prompt: `Act as a Principal Software Architect. Review and refactor this data processor function for maximum performance, strict type safety, and error handling in TypeScript:

function processBatch(items: any[]) {
  let res = [];
  for (let i=0; i<items.length; i++) {
    if (items[i].active == true) {
      res.push({ id: items[i].id, val: items[i].amount * 1.18, processedAt: new Date() });
    }
  }
  return res;
}

Provide the optimized class or utility with full JSDoc comments, benchmarks explanation, and zero 'any' types.`,
    recommendedModels: [
      'cohere/north-mini-code:free',
      'google/gemma-4-31b-it:free',
      'nvidia/nemotron-3-super-120b-a12b:free'
    ]
  },
  {
    id: 'deep-reasoning',
    title: 'Multi-Step Logical & STEM Reasoning',
    category: 'Reasoning',
    description: 'Tests deep chain-of-thought, edge case identification, and mathematical proofs.',
    prompt: `Analyze the following distributed consensus scenario:
A distributed cluster has 5 nodes (A, B, C, D, E). A network partition divides the cluster into {A, B} and {C, D, E}.
Simultaneously, node C experiences an intermittent 400ms clock skew drift while processing a Raft leader election.

1. Prove whether a split-brain condition is possible under standard Raft consensus axioms.
2. Outline the exact sequence of RPC messages exchanged during the election term transition.
3. Formulate the recovery state machine when the network partition heals after 15 seconds.`,
    recommendedModels: [
      'nvidia/nemotron-3-super-120b-a12b:free',
      'google/gemma-4-31b-it:free',
      'openrouter/free'
    ]
  },
  {
    id: 'json-extraction',
    title: 'Strict Structured JSON Extraction',
    category: 'Data Extraction',
    description: 'Evaluates schema adherence, zero-hallucination extraction, and data normalization.',
    prompt: `Extract all key commercial terms, SLA guarantees, liability caps, and termination clauses from this contract excerpt and return ONLY a valid, minified JSON object conforming to the schema below:

Schema:
{
  "contract_id": string,
  "parties": string[],
  "sla_uptime_percent": number,
  "liability_cap_usd": number,
  "cure_period_days": number,
  "governing_law": string,
  "risk_flags": string[]
}

Excerpt:
"This Enterprise Master Services Agreement is entered into by Acme Cloud Inc and Vertex Retail LLC. Acme guarantees 99.95% monthly uptime. In no event shall aggregate liability exceed $500,000 USD. Either party may terminate with 30 days prior written notice subject to a 14-day cure window. Governed by the laws of Delaware."`,
    recommendedModels: [
      'google/gemma-4-31b-it:free',
      'nvidia/nemotron-3.5-lightning:free',
      'cohere/north-mini-code:free'
    ]
  },
  {
    id: 'creative-copy',
    title: 'High-Converting Product Launch Copy',
    category: 'Marketing',
    description: 'Compares tone calibration, emotional resonance, and conversion copywriting craft.',
    prompt: `You are a world-class Direct Response Copywriter and Brand Strategist.
Write a launch announcement sequence for "PromptHub" — an AI Prompt Engineering Studio that allows developers to benchmark, diagnose, and version-control system prompts across frontier LLMs.

Deliver:
1. One high-gravity hero headline and subhead.
2. Three quantified value propositions tailored to Senior AI Engineers and CISOs.
3. A 3-part launch tweet thread with technical hooks and high engagement.
Tone: Fresh, technical, authoritative, zero generic AI hype or corporate fluff.`,
    recommendedModels: [
      'google/gemma-4-31b-it:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
      'openrouter/free'
    ]
  }
];

// Quick Comparison Bundles (100% Free OpenRouter Models)
export const ARENA_BUNDLES = [
  {
    id: 'free-frontier-trio',
    label: 'OpenRouter Free Flagships',
    desc: 'North Mini Code vs Gemma 4 vs Nemotron 3 (100% Free)',
    modelIds: ['cohere/north-mini-code:free', 'google/gemma-4-31b-it:free', 'nvidia/nemotron-3-super-120b-a12b:free']
  },
  {
    id: 'free-reasoning-shootout',
    label: 'Free Reasoning & STEM',
    desc: 'Gemma 4 vs Nemotron 3 Ultra vs Nemotron Nano (100% Free)',
    modelIds: ['google/gemma-4-31b-it:free', 'nvidia/nemotron-3-ultra-550b-a55b:free', 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free']
  },
  {
    id: 'free-speed-scale',
    label: 'Free Speed & Scale',
    desc: 'Nemotron Lightning vs Ling 3.1 vs Liquid LFM (100% Free)',
    modelIds: ['nvidia/nemotron-3.5-lightning:free', 'inclusionai/ling-3.1-flash', 'liquid/lfm-2.5-2.6b:free']
  }
];

export interface ArenaModelSlot {
  id: string;
  modelId: string;
  name: string;
  provider: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  output: string;
  reasoning?: string;
  latencyMs: number;
  /**
   * Provider-reported total tokens, or null when the provider reported none (and
   * before a run completes). Never a character count divided by four.
   */
  tokens: number | null;
  /**
   * Catalog-derived cost, or null when the provider reported no usage so no cost
   * could be computed. null is not zero: null means "unknown" and is rendered as
   * such. Was `costUsd: number` initialised to 0 and assigned
   * `costMeta?.costUsd ?? 0`, so a run that really did cost money was recorded
   * and persisted as costing exactly nothing.
   */
  costUsd: number | null;
  /**
   * Formatted cost string, absent until a cost is actually computed. The four
   * initialisers used to seed this with the literal '$0.00000', and the render at
   * the telemetry chip only checks truthiness — so every idle and every
   * unmeasured slot displayed "$0.00000" as though the run had been priced.
   */
  costDisplay?: string;
  error?: string;
}

export interface ArenaPanelProps {
  promptText: string;
  onUpdatePrompt?: (newText: string) => void;
  onExecuteArena?: (modelIds: string[]) => void;
  onSelectWinner: (winnerSlot: ArenaModelSlot) => void;
  isRunning?: boolean;
}

export const ArenaPanel: React.FC<ArenaPanelProps> = ({
  promptText,
  onUpdatePrompt,
  onSelectWinner,
}) => {
  const {
    user,
    isLoggedIn,
    showToast,
    setShowAuthModal,
    arenaRuns,
    saveArenaRun,
    deleteArenaRun,
    createPrompt,
    setActivePromptId,
    selectedStudioModel,
  } = useApp();

  const [catalog, setCatalog] = useState<CatalogModel[]>(() => modelCatalogService.getCachedCatalog());
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [activeViewMode, setActiveViewMode] = useState<'cards' | 'diff' | 'history'>('cards');
  const [showPresetsDrawer, setShowPresetsDrawer] = useState(false);
  const [mobileSlotFilter, setMobileSlotFilter] = useState<string>('all');

  // Diff comparison model selection
  const [diffModelA, setDiffModelA] = useState<string>('');
  const [diffModelB, setDiffModelB] = useState<string>('');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  // Initialize slots from dynamic catalog (OpenRouter Free models strictly by default)
  const [slots, setSlots] = useState<ArenaModelSlot[]>(() => {
    const cached = modelCatalogService.getCachedCatalog();
    const defaultFreeIds = [
      'cohere/north-mini-code:free',
      'google/gemma-4-31b-it:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
    ];
    return defaultFreeIds.map((id, index) => {
      const meta = cached.find((m) => m.id === id || m.canonicalId === id);
      return {
        id: `slot-${index + 1}`,
        modelId: id,
        name: meta?.name || (id === 'cohere/north-mini-code:free' ? 'North Mini Code (Free)' : id === 'google/gemma-4-31b-it:free' ? 'Gemma 4 31B Instruct (Free)' : 'Nemotron 3 Super 120B (Free)'),
        provider: meta?.provider || 'OpenRouter (Free)',
        status: 'idle',
        output: '',
        latencyMs: 0,
        tokens: null,
        costUsd: null,
        costDisplay: undefined,
      };
    });
  });

  const [isGlobalRunning, setIsGlobalRunning] = useState(false);
  const [winningSlotId, setWinningSlotId] = useState<string | null>(null);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const loadLiveCatalog = useCallback(async (force = false) => {
    try {
      const models = await modelCatalogService.fetchCatalog(force);
      if (models && models.length > 0) {
        setCatalog(models);
      }
    } catch {
      // Keep cached
    }
  }, []);

  useEffect(() => {
    loadLiveCatalog();
    return () => {
      abortControllersRef.current.forEach((c) => c.abort());
      abortControllersRef.current.clear();
    };
  }, [loadLiveCatalog]);

  // Auto-inject incoming selectedStudioModel into slot 1 if not present
  useEffect(() => {
    if (selectedStudioModel) {
      setSlots((prev) => {
        if (prev.some((s) => s.modelId === selectedStudioModel)) return prev;
        const meta = catalog.find((m) => m.id === selectedStudioModel || m.canonicalId === selectedStudioModel);
        const newFirstSlot: ArenaModelSlot = {
          id: prev[0]?.id || 'slot-1',
          modelId: selectedStudioModel,
          name: meta?.name || selectedStudioModel.split('/')[1] || selectedStudioModel,
          provider: meta?.provider || selectedStudioModel.split('/')[0] || 'AI Provider',
          status: 'idle',
          output: '',
          latencyMs: 0,
          tokens: null,
          costUsd: null,
          costDisplay: undefined,
        };
        return [newFirstSlot, ...prev.slice(1)];
      });
    }
  }, [selectedStudioModel, catalog]);

  // Ensure diff models are synced with current slots
  useEffect(() => {
    if (slots.length >= 2) {
      if (!diffModelA || !slots.some((s) => s.id === diffModelA)) {
        setDiffModelA(slots[0].id);
      }
      if (!diffModelB || !slots.some((s) => s.id === diffModelB)) {
        setDiffModelB(slots[1].id);
      }
    }
  }, [slots, diffModelA, diffModelB]);

  const handleOpenModelPicker = (slotId: string) => {
    setEditingSlotId(slotId);
    setIsSelectorOpen(true);
  };

  const handleSelectModelForSlot = (modelId: string, model: CatalogModel) => {
    if (!editingSlotId) return;
    setSlots((prev) =>
      prev.map((s) =>
        s.id === editingSlotId
          ? {
              ...s,
              modelId,
              name: model.name,
              provider: model.provider,
              status: 'idle',
              output: '',
              reasoning: undefined,
              error: undefined,
              latencyMs: 0,
              tokens: null,
              costUsd: null,
              costDisplay: undefined,
            }
          : s
      )
    );
    setIsSelectorOpen(false);
    setEditingSlotId(null);
  };

  const handleAddSlot = (modelOverrideId?: string) => {
    if (slots.length >= 4) {
      showToast('Maximum 4 models can be compared concurrently in the Arena.', 'info');
      return;
    }
    const targetModel = modelOverrideId
      ? catalog.find((m) => m.id === modelOverrideId || m.canonicalId === modelOverrideId)
      : catalog.find((m) => m.isFree && !slots.some((s) => s.modelId === m.id)) ||
        catalog.find((m) => m.id === 'google/gemma-4-31b-it:free') ||
        catalog.find((m) => m.id === 'openrouter/free') || catalog[0];

    const newSlot: ArenaModelSlot = {
      id: `slot-${Date.now()}`,
      modelId: targetModel?.id || 'google/gemma-4-31b-it:free',
      name: targetModel?.name || 'Gemma 4 31B (Free)',
      provider: targetModel?.provider || 'OpenRouter (Free)',
      status: 'idle',
      output: '',
      latencyMs: 0,
      tokens: null,
      costUsd: null,
      costDisplay: undefined,
    };
    setSlots((prev) => [...prev, newSlot]);
  };

  const handleRemoveSlot = (slotId: string) => {
    if (slots.length <= 2) {
      showToast('Arena requires at least 2 models for comparative benchmark.', 'info');
      return;
    }
    const controller = abortControllersRef.current.get(slotId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(slotId);
    }
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
    if (winningSlotId === slotId) setWinningSlotId(null);
  };

  const handleApplyBundle = (bundleModelIds: string[]) => {
    const newSlots: ArenaModelSlot[] = bundleModelIds.slice(0, 4).map((id, index) => {
      const meta = catalog.find((m) => m.id === id || m.canonicalId === id);
      return {
        id: `slot-${Date.now()}-${index}`,
        modelId: id,
        name: meta?.name || id.split('/')[1] || id,
        provider: meta?.provider || id.split('/')[0] || 'AI Provider',
        status: 'idle',
        output: '',
        latencyMs: 0,
        tokens: null,
        costUsd: null,
        costDisplay: undefined,
      };
    });
    setSlots(newSlots);
    setWinningSlotId(null);
  };

  const handleLoadPresetChallenge = (preset: (typeof BENCHMARK_PRESETS)[0]) => {
    if (onUpdatePrompt) {
      onUpdatePrompt(preset.prompt);
    }
    if (preset.recommendedModels && preset.recommendedModels.length >= 2) {
      handleApplyBundle(preset.recommendedModels);
    }
    setShowPresetsDrawer(false);
  };

  const runSingleSlot = async (slotId: string) => {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot || !promptText.trim()) {
      showToast('Please enter a prompt in the editor to run Arena test.', 'error');
      return;
    }

    const isUnlocked = multiProviderService.isModelUnlockedByBYOK(slot.modelId);
    if (!user && !isUnlocked.unlocked) {
      setShowAuthModal(true);
      showToast('Please sign in to benchmark models with your daily allowance, or connect an API key.', 'info');
      return;
    }

    if (abortControllersRef.current.has(slotId)) {
      abortControllersRef.current.get(slotId)?.abort();
    }
    const controller = new AbortController();
    abortControllersRef.current.set(slotId, controller);

    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId ? { ...s, status: 'running', error: undefined, output: '', reasoning: undefined } : s
      )
    );

    const startTime = Date.now();
    try {
      const res = await aiGateway.executePrompt(promptText, {
        modelId: slot.modelId,
        signal: controller.signal,
        feature: 'arena',
        providerPreference: 'auto',
        maxTokens: 2500,
        stream: true,
        onChunk: (_delta, accumulated) => {
          setSlots((prev) =>
            prev.map((s) => (s.id === slotId ? { ...s, output: accumulated } : s))
          );
        },
        onReasoningChunk: (_delta, accumulatedReasoning) => {
          setSlots((prev) =>
            prev.map((s) => (s.id === slotId ? { ...s, reasoning: accumulatedReasoning } : s))
          );
        },
      });
      const elapsed = res.durationMs || Date.now() - startTime;
      // Tokens and cost are shown only when the provider actually measured usage.
      // This previously fell back to `Math.ceil(promptText.length / 4)` and
      // `Math.ceil(res.output.length / 4)`, so an unmeasured run displayed a precise
      // token count — and a cost derived from it — that was really a character count
      // divided by four. In a side-by-side benchmark that made two models look
      // comparably measured when only one had reported anything.
      const measured = res.usageMeasured === true;
      const promptTokens = measured ? res.usage?.promptTokens : undefined;
      const completionTokens = measured ? res.usage?.completionTokens : undefined;
      const totalTokens =
        measured && typeof res.usage?.totalTokens === 'number'
          ? res.usage.totalTokens
          : measured && (typeof promptTokens === 'number' || typeof completionTokens === 'number')
          ? (promptTokens ?? 0) + (completionTokens ?? 0)
          : null;
      const costMeta =
        typeof promptTokens === 'number' && typeof completionTokens === 'number'
          ? calculateCostFromCatalog(slot.modelId, promptTokens, completionTokens, catalog)
          : null;

      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? {
                ...s,
                status: 'completed',
                output: res.output || 'No output received.',
                provider: res.provider || s.provider,
                reasoning: (res as any).reasoning || undefined,
                latencyMs: elapsed,
                tokens: totalTokens,
                costUsd: costMeta?.costUsd ?? null,
                costDisplay: costMeta?.costDisplay,
              }
            : s
        )
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        if (err?.status === 401 || err?.code === 'UNAUTHENTICATED' || err?.message?.toLowerCase().includes('sign in')) {
          setShowAuthModal(true);
        }
        setSlots((prev) =>
          prev.map((s) =>
            s.id === slotId
              ? {
                  ...s,
                  status: 'error',
                  error: err.message || 'Execution failed',
                }
              : s
          )
        );
      }
    } finally {
      abortControllersRef.current.delete(slotId);
    }
  };

  const handleRunAll = async () => {
    if (!promptText.trim()) {
      showToast('Please enter a prompt to benchmark in the Arena.', 'error');
      return;
    }
    if (slots.length < 2) {
      showToast('Select at least 2 models to run Arena shootout.', 'error');
      return;
    }

    const anyModelRequiresAuth = slots.some((s) => !multiProviderService.isModelUnlockedByBYOK(s.modelId).unlocked);
    if (!user && anyModelRequiresAuth) {
      setShowAuthModal(true);
      showToast('Please sign in to benchmark models with your daily allowance, or connect an API key.', 'info');
      return;
    }

    const rateCheck = securityUtils.rateLimit('arena_run', 3000);
    if (!rateCheck.allowed) {
      showToast(rateCheck.error || 'Rate limit in effect. Please wait.', 'error');
      return;
    }

    setIsGlobalRunning(true);
    setWinningSlotId(null);
    setActiveViewMode('cards');

    await Promise.allSettled(slots.map((s) => runSingleSlot(s.id)));
    setIsGlobalRunning(false);
  };

  const handleCancelAll = () => {
    abortControllersRef.current.forEach((c) => c.abort());
    abortControllersRef.current.clear();
    setIsGlobalRunning(false);
    setSlots((prev) =>
      prev.map((s) => (s.status === 'running' ? { ...s, status: 'idle', error: 'Execution cancelled' } : s))
    );
  };

  const handleWinnerClick = (slot: ArenaModelSlot) => {
    setWinningSlotId(slot.id);
    onSelectWinner(slot);

    // Save run into AppContext persistent arena history
    const completedResults: ArenaResultItem[] = slots.map((s) => ({
      modelId: s.modelId,
      modelName: s.name,
      provider: s.provider,
      output: s.output,
      latencyMs: s.latencyMs,
      tokens: s.tokens,
      costUsd: s.costUsd,
      costDisplay: s.costDisplay,
      status: s.status === 'completed' ? 'completed' : 'failed',
      isWinner: s.id === slot.id,
    }));

    const newRun: ArenaRun = {
      id: securityUtils.generateUUID(),
      userId: user?.id,
      promptText,
      promptTitle: `Arena Shootout (${slots.map((s) => s.name).join(' vs ')})`,
      results: completedResults,
      winnerModelId: slot.modelId,
      winnerReason: `User picked ${slot.name} as preferred output`,
      createdAt: new Date().toISOString(),
    };
    saveArenaRun(newRun);
  };

  const handleCopyOutput = (text: string, slotId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(slotId);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleExportMarkdown = () => {
    let md = `# PromptHub Arena Benchmark Report\n\n`;
    md += `**Date:** ${new Date().toLocaleString()}\n`;
    md += `**Models Compared:** ${slots.map((s) => s.name).join(', ')}\n\n`;
    md += `## Input Prompt\n\`\`\`\n${promptText}\n\`\`\`\n\n`;
    md += `## Results & Telemetry\n\n`;

    slots.forEach((s, i) => {
      const isWinner = winningSlotId === s.id;
      md += `### ${i + 1}. ${s.name} (${s.provider}) ${isWinner ? '🏆 [Your Pick]' : ''}\n`;
      md += `- **Latency:** ${(s.latencyMs / 1000).toFixed(2)}s\n`;
      md += `- **Tokens:** ${s.tokens === null ? 'n/a (provider reported no usage)' : s.tokens}\n`;
      md += `- **Estimated Cost:** ${
        s.costDisplay ?? 'n/a (provider reported no token usage, so no cost could be computed)'
      }\n`;
      md += `- **Status:** ${s.status}\n\n`;
      md += `\`\`\`\n${s.output || 'No output recorded'}\n\`\`\`\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arena-benchmark-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Benchmark markdown report exported!', 'success');
  };

  const handleForkOutputToNewPrompt = async (slot: ArenaModelSlot) => {
    try {
      const created = await createPrompt({
        title: `Arena Output: ${slot.name}`,
        description: `Forked from PromptHub Arena shootout against ${slots.length} models.`,
        rawContent: slot.output || promptText,
        model: slot.modelId,
        category: 'Development',
        tags: ['arena-winner', 'benchmark', slot.provider.toLowerCase()],
        visibility: 'private',
      });
      if (created?.id) {
        setActivePromptId(created.id);
        showToast('Created new prompt from Arena output!', 'success');
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to create prompt', 'error');
    }
  };

  const activeEditingSlot = slots.find((s) => s.id === editingSlotId);
  const diffSlotA = slots.find((s) => s.id === diffModelA) || slots[0];
  const diffSlotB = slots.find((s) => s.id === diffModelB) || slots[1] || slots[0];

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-bg-primary overflow-hidden font-sans select-text">
      {/* ── Editorial Header (Image 2: EVALUATION / PROVIDER COMPARISON) ────── */}
      <div className="px-4 sm:px-6 py-4 bg-bg-primary border-b border-border-default shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-[11px] font-mono font-semibold tracking-[0.14em] text-[#7A7E75] dark:text-[#9AA0A6] uppercase">
              EVALUATION / PROVIDER COMPARISON
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-primary tracking-tight">
              One prompt. Compare contenders.
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary max-w-2xl">
              Send a single prompt across multiple foundation models simultaneously to evaluate latency, reasoning depth, and cost.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EBF5ED] dark:bg-[#1A3326] text-[11px] font-mono font-semibold text-[#2D6A4F] dark:text-[#86A696] border border-[#D0E6D5] dark:border-[#224A38]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span>Local workspace ready</span>
            </div>

            <button
              type="button"
              onClick={handleRunAll}
              disabled={isGlobalRunning || !promptText.trim()}
              data-tour="tour-arena-broadcast"
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer min-h-[44px] ${
                isGlobalRunning || !promptText.trim()
                  ? 'bg-bg-tertiary text-text-muted cursor-not-allowed border border-border-default'
                  : 'bg-brand-primary text-white hover:bg-brand-primary-hi'
              }`}
            >
              {isGlobalRunning ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run all ({slots.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── 1. Arena Control Subheader ────────────────────────────────────────── */}
      <div data-tour="tour-arena-models" className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 sm:px-6 py-2.5 bg-bg-secondary border-b border-border-default shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-lg bg-brand-primary-light text-brand-primary shrink-0">
            <Swords className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5 truncate">
                <span>Active Contenders ({slots.length}/4)</span>
              </h3>
              {winningSlotId && (
                <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded flex items-center gap-1">
                  <Award className="w-3 h-3 text-amber-600" />
                  <span>Winner Crowned</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-text-muted truncate hidden sm:block">
              Parallel frontier shootout with independent abort isolation, latency telemetry, and diff metrics.
            </p>
          </div>
        </div>

        {/* Action Controls & Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between md:justify-end">
          {/* Sub-View Mode Switcher */}
          <div className="inline-flex bg-bg-tertiary border border-border-default rounded-lg p-0.5 items-center shrink-0">
            <button
              type="button"
              onClick={() => setActiveViewMode('cards')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 min-h-[36px] ${
                activeViewMode === 'cards'
                  ? 'bg-bg-secondary text-text-primary font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Side-by-side comparison matrix"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Matrix</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveViewMode('diff')}
              disabled={slots.length < 2}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 min-h-[36px] disabled:opacity-40 ${
                activeViewMode === 'diff'
                  ? 'bg-bg-secondary text-text-primary font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Compare Model A vs Model B"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Diff</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveViewMode('history')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 min-h-[36px] ${
                activeViewMode === 'history'
                  ? 'bg-bg-secondary text-text-primary font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Past Arena benchmark runs"
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">History</span>
              <span className="text-[10px] font-mono font-bold px-1 rounded bg-bg-primary text-text-secondary">
                {arenaRuns.length}
              </span>
            </button>
          </div>

          {/* Quick Preset / Export / Slot Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowPresetsDrawer(!showPresetsDrawer)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer min-h-[38px] flex items-center gap-1 ${
                showPresetsDrawer
                  ? 'bg-brand-primary-light border-brand-primary text-brand-primary'
                  : 'bg-bg-primary border-border-default text-text-secondary hover:text-text-primary hover:border-border-hover'
              }`}
              title="Browse Curated Benchmark Challenges"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
              <span className="hidden sm:inline">Presets</span>
            </button>

            <button
              type="button"
              onClick={handleExportMarkdown}
              className="p-2 rounded-lg bg-bg-primary border border-border-default hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="Export Benchmark Markdown Report"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            {slots.length < 4 && (
              <button
                type="button"
                onClick={() => handleAddSlot()}
                disabled={isGlobalRunning}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary hover:border-brand-primary/40 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 min-h-[38px]"
                title="Add a model slot"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Slot</span>
              </button>
            )}

            {isGlobalRunning ? (
              <button
                type="button"
                onClick={handleCancelAll}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold hover:bg-rose-100 transition-colors shadow-2xs cursor-pointer min-h-[38px]"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Cancel</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRunAll}
                disabled={!promptText.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hi transition-colors shadow-2xs disabled:opacity-50 cursor-pointer min-h-[38px]"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Run Shootout ({slots.length}x)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Curated Challenges & Model Bundles Drawer (Collapsible) ───────── */}
      <AnimatePresence>
        {showPresetsDrawer && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border-default bg-bg-secondary/70 shrink-0"
          >
            <div className="p-3.5 sm:p-4 space-y-3">
              <div className="flex flex-col lg:flex-row gap-4 justify-between">
                {/* Benchmark Challenges */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-brand-primary" /> Curated Benchmark Challenges (1-Click Load)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPresetsDrawer(false)}
                      className="text-text-muted hover:text-text-primary p-1 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
                    {BENCHMARK_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleLoadPresetChallenge(preset)}
                        className="p-2.5 rounded-lg border border-border-default bg-bg-primary hover:border-brand-primary/50 text-left transition-all cursor-pointer group min-h-[56px] flex flex-col justify-between"
                      >
                        <div className="text-xs font-semibold text-text-primary group-hover:text-brand-primary truncate">
                          {preset.title}
                        </div>
                        <div className="text-[10px] text-text-muted mt-1 flex items-center justify-between font-mono">
                          <span>{preset.category}</span>
                          <span className="text-brand-primary font-medium group-hover:underline">Load →</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Model Bundles */}
                <div className="w-full lg:w-72 space-y-2 shrink-0 border-t lg:border-t-0 lg:border-l border-border-default pt-3 lg:pt-0 lg:pl-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono flex items-center gap-1.5">
                    <Cpu className="w-3 h-3 text-brand-primary" /> Quick Model Bundles
                  </span>
                  <div className="space-y-1.5">
                    {ARENA_BUNDLES.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => handleApplyBundle(b.modelIds)}
                        className="w-full p-2 rounded-lg border border-border-default bg-bg-primary hover:border-brand-primary/50 text-left transition-colors cursor-pointer"
                      >
                        <div className="text-xs font-semibold text-text-primary">{b.label}</div>
                        <div className="text-[10px] text-text-muted truncate mt-0.5">{b.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3. Main Arena Content Views ─────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
        {/* ── Mode 1: Cards / Matrix View ──────────────────────────────────── */}
        {activeViewMode === 'cards' && (
          <div className="flex flex-col h-full space-y-3">
            {/* Mobile Viewport Model Tab Switcher (<640px) */}
            <div className="sm:hidden flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border-default no-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => setMobileSlotFilter('all')}
                className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  mobileSlotFilter === 'all'
                    ? 'bg-brand-primary text-white shadow-xs'
                    : 'bg-bg-secondary text-text-secondary border border-border-default hover:text-text-primary'
                }`}
              >
                All Models ({slots.length})
              </button>
              {slots.map((slot, index) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setMobileSlotFilter(slot.id)}
                  className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                    mobileSlotFilter === slot.id
                      ? 'bg-brand-primary text-white shadow-xs'
                      : 'bg-bg-secondary text-text-secondary border border-border-default hover:text-text-primary'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-mono">
                    {index + 1}
                  </span>
                  <span className="truncate max-w-[110px]">{slot.name}</span>
                </button>
              ))}
            </div>

            <div
              data-tour="tour-arena-telemetry"
              className={`grid grid-cols-1 lg:grid-cols-2 ${slots.length >= 3 ? 'xl:grid-cols-3' : ''} ${
                slots.length === 4 ? '2xl:grid-cols-4' : ''
              } gap-4 h-full`}
            >
              {slots.map((slot, index) => {
                const isHiddenOnMobile = mobileSlotFilter !== 'all' && mobileSlotFilter !== slot.id;
                const isWinner = winningSlotId === slot.id;

                return (
                  <div
                    key={slot.id}
                    className={`rounded-xl border bg-bg-secondary transition-all shadow-xs overflow-hidden min-h-[340px] ${
                      isHiddenOnMobile ? 'hidden sm:flex flex-col' : 'flex flex-col'
                    } ${
                      isWinner
                        ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/10'
                        : 'border-border-default hover:border-border-hover'
                    }`}
                  >
                  {/* Column Header */}
                  <div
                    className={`flex items-center justify-between p-3 border-b ${
                      isWinner ? 'bg-amber-50/40 border-amber-200' : 'bg-bg-tertiary/40 border-border-default'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-brand-primary-light text-brand-primary text-xs font-mono font-bold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenModelPicker(slot.id)}
                        className="text-xs font-mono font-semibold text-text-primary truncate max-w-[130px] hover:text-brand-primary hover:underline cursor-pointer text-left"
                        title="Click to switch model"
                      >
                        {slot.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenModelPicker(slot.id)}
                        className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-primary transition-colors cursor-pointer min-h-[28px] min-w-[28px] flex items-center justify-center"
                        title="Change model"
                      >
                        <Settings2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Telemetry Metrics or Controls */}
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted shrink-0">
                      {slot.status === 'running' && (
                        <span className="flex items-center gap-1 text-brand-primary font-medium animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin" /> streaming...
                        </span>
                      )}

                      {slot.status === 'completed' && (
                        <>
                          <span className="flex items-center gap-0.5" title="Latency">
                            <Clock className="w-3 h-3 text-text-muted" /> {(slot.latencyMs / 1000).toFixed(2)}s
                          </span>
                          {slot.tokens !== null ? (
                            <span className="flex items-center gap-0.5" title="Token usage reported by the provider">
                              <Hash className="w-3 h-3 text-text-muted" /> {slot.tokens}
                            </span>
                          ) : (
                            // An unmeasured run shows "tokens n/a" rather than a number.
                            // The old code put a character count divided by four here.
                            <span
                              className="flex items-center gap-0.5 text-text-muted italic"
                              title="This provider reported no token usage for this run, so no count can be shown."
                            >
                              <Hash className="w-3 h-3 text-text-muted" /> tokens n/a
                            </span>
                          )}
                          {slot.costDisplay ? (
                            <span className="flex items-center gap-0.5 text-brand-primary dark:text-[#41A2D9] font-bold" title="Cost">
                              <Coins className="w-3 h-3 text-brand-primary dark:text-[#41A2D9]" /> {slot.costDisplay}
                            </span>
                          ) : (
                            <span
                              className="flex items-center gap-0.5 text-text-muted italic"
                              title="Cost cannot be computed without provider-reported token counts."
                            >
                              <Coins className="w-3 h-3 text-text-muted" /> cost n/a
                            </span>
                          )}
                        </>
                      )}

                      {slot.output && (
                        <button
                          type="button"
                          onClick={() => handleCopyOutput(slot.output, slot.id)}
                          className="p-1.5 rounded bg-bg-primary border border-border-default hover:border-brand-primary/40 text-text-secondary hover:text-text-primary transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                          title="Copy output"
                        >
                          {copiedIndex === slot.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => runSingleSlot(slot.id)}
                        disabled={slot.status === 'running'}
                        className="p-1.5 rounded bg-bg-primary border border-border-default hover:border-brand-primary/40 text-text-secondary hover:text-text-primary transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center disabled:opacity-40"
                        title="Rerun this model"
                      >
                        <RotateCcw
                          className={`w-3.5 h-3.5 ${
                            slot.status === 'running' ? 'animate-spin text-brand-primary' : ''
                          }`}
                        />
                      </button>

                      {slots.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(slot.id)}
                          disabled={isGlobalRunning || slot.status === 'running'}
                          className="p-1.5 rounded bg-bg-primary border border-border-default hover:border-rose-300 text-text-muted hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-40 min-h-[32px] min-w-[32px] flex items-center justify-center"
                          title="Remove model slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Provider Attribution Strip */}
                  <div className="px-3 py-1 bg-bg-primary/50 border-b border-border-default flex items-center justify-between text-[10px] font-mono text-text-muted">
                    <span className="truncate max-w-[170px]">{slot.modelId}</span>
                    <span className="flex items-center gap-1 font-medium text-text-secondary">
                      <span>{slot.provider?.includes('AICredits') ? '💎' : slot.provider?.includes('BYOK') ? '🔑' : '🟢'}</span>
                      <span>{slot.provider}</span>
                    </span>
                  </div>

                  {/* Response Body */}
                  <div className="flex-1 p-3.5 overflow-y-auto space-y-3 min-h-[220px]">
                    {slot.reasoning && (
                      <ThoughtChain
                        thinkingText={slot.reasoning}
                        isThinking={slot.status === 'running'}
                        durationSeconds={slot.latencyMs / 1000}
                      />
                    )}

                    {slot.output ? (
                      <AIBubble
                        content={slot.output}
                        role="assistant"
                        modelName={slot.name}
                        latencyMs={slot.latencyMs}
                        tokensUsed={slot.tokens ?? undefined}
                        costEst={slot.costUsd ?? undefined}
                        isStreaming={slot.status === 'running'}
                      />
                    ) : slot.status === 'running' ? (
                      <div className="flex flex-col items-center justify-center h-36 text-text-muted text-xs font-mono space-y-2 p-3 text-center">
                        <RefreshCw className="w-5 h-5 animate-spin text-brand-primary" />
                        <span>Executing on {slot.name}...</span>
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 font-sans mt-1">
                          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-pulse" />
                          <span>For fast output, please upgrade your plan</span>
                        </div>
                      </div>
                    ) : slot.status === 'error' ? (
                      <div className="flex flex-col items-center justify-center h-36 text-rose-800 text-xs text-center border border-dashed border-rose-300 rounded-lg p-4 bg-rose-50/50">
                        <AlertCircle className="w-5 h-5 mb-1 text-rose-600" />
                        <p className="font-semibold">Execution Failed</p>
                        <p className="text-[11px] text-rose-700 mt-0.5 max-w-xs">
                          {slot.error || 'Provider timeout or error'}
                        </p>
                        <button
                          type="button"
                          onClick={() => runSingleSlot(slot.id)}
                          className="mt-2.5 px-3 py-1.5 rounded bg-bg-secondary border border-rose-300 text-rose-800 text-xs font-semibold hover:bg-rose-100 cursor-pointer min-h-[32px]"
                        >
                          Retry Slot
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-36 text-text-muted text-xs text-center border border-dashed border-border-default/50 rounded-lg p-4">
                        <p className="font-medium text-text-secondary">{slot.name}</p>
                        <p className="text-[11px] text-text-muted mt-1">{slot.provider} · Awaiting shootout run</p>
                      </div>
                    )}
                  </div>

                  {/* Column Footer: Winner Selection & Fork */}
                  {slot.output && (
                    <div className="p-3 border-t border-border-default bg-bg-tertiary/20 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleWinnerClick(slot)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer min-h-[36px] ${
                          isWinner
                            ? 'bg-amber-500 text-white font-semibold shadow-xs'
                            : 'bg-bg-primary text-text-secondary border border-border-default hover:text-text-primary hover:border-amber-400'
                        }`}
                      >
                        <Trophy className="w-3.5 h-3.5 text-amber-300" />
                        <span>{isWinner ? 'Winner Crowned' : 'Crown Winner'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleForkOutputToNewPrompt(slot)}
                        title="Fork output into a new PromptHub asset"
                        className="px-2.5 py-2 rounded-lg bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer min-h-[36px] flex items-center gap-1"
                      >
                        <span className="hidden sm:inline">Fork</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        )}

        {/* ── Mode 2: Diff View ─────────────────────────────────────────────── */}
        {activeViewMode === 'diff' && slots.length >= 2 && (
          <div className="space-y-4">
            {/* Diff Model Pickers */}
            <div className="bg-bg-secondary border border-border-default rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-text-muted uppercase font-semibold">Base Model (A)</label>
                  <select
                    value={diffModelA}
                    onChange={(e) => setDiffModelA(e.target.value)}
                    className="bg-bg-primary border border-border-default rounded-md px-2.5 py-1.5 text-xs text-text-primary font-mono cursor-pointer"
                  >
                    {slots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.provider})
                      </option>
                    ))}
                  </select>
                </div>

                <span className="text-text-muted text-xs font-bold pt-4">VS</span>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-text-muted uppercase font-semibold">
                    Compare Model (B)
                  </label>
                  <select
                    value={diffModelB}
                    onChange={(e) => setDiffModelB(e.target.value)}
                    className="bg-bg-primary border border-border-default rounded-md px-2.5 py-1.5 text-xs text-text-primary font-mono cursor-pointer"
                  >
                    {slots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.provider})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-xs text-text-muted font-mono">
                Deterministic side-by-side comparative inspection
              </div>
            </div>

            {/* Diff Comparison Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-bg-secondary border border-border-default rounded-xl p-4 space-y-2 shadow-xs">
                <div className="flex justify-between items-center pb-2 border-b border-border-default">
                  <span className="text-xs font-bold text-text-primary">{diffSlotA?.name} Output</span>
                  <span
                    className="text-[10px] font-mono text-text-muted"
                    title={
                      diffSlotA?.tokens === null
                        ? 'This provider reported no token usage for this run.'
                        : undefined
                    }
                  >
                    {(diffSlotA?.latencyMs / 1000).toFixed(2)}s ·{' '}
                    {diffSlotA?.tokens === null ? 'tok n/a' : `${diffSlotA?.tokens} tok`}
                  </span>
                </div>
                <pre className="text-xs font-mono text-text-primary whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto bg-bg-primary p-3 rounded-lg border border-border-default">
                  {diffSlotA?.output || 'No output recorded yet. Run shootout to compare.'}
                </pre>
              </div>

              <div className="bg-bg-secondary border border-brand-primary/30 rounded-xl p-4 space-y-2 shadow-xs">
                <div className="flex justify-between items-center pb-2 border-b border-brand-primary/20">
                  <span className="text-xs font-bold text-brand-primary">{diffSlotB?.name} Output</span>
                  <span
                    className="text-[10px] font-mono text-text-muted"
                    title={
                      diffSlotB?.tokens === null
                        ? 'This provider reported no token usage for this run.'
                        : undefined
                    }
                  >
                    {(diffSlotB?.latencyMs / 1000).toFixed(2)}s ·{' '}
                    {diffSlotB?.tokens === null ? 'tok n/a' : `${diffSlotB?.tokens} tok`}
                  </span>
                </div>
                <pre className="text-xs font-mono text-text-primary whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto bg-brand-primary-light/20 p-3 rounded-lg border border-brand-primary/20">
                  {diffSlotB?.output || 'No output recorded yet. Run shootout to compare.'}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ── Mode 3: Arena Benchmark History ──────────────────────────────── */}
        {activeViewMode === 'history' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-primary" /> Past Arena Benchmark Runs ({arenaRuns.length})
              </h3>
            </div>

            {arenaRuns.length === 0 ? (
              <div className="border border-dashed border-border-default rounded-xl bg-bg-secondary p-8 text-center text-text-muted text-xs">
                No past Arena runs logged yet. Execute a test and crown a winner to save benchmark history.
              </div>
            ) : (
              arenaRuns.map((run) => (
                <div
                  key={run.id}
                  className="bg-bg-secondary border border-border-default rounded-xl p-4 space-y-3 shadow-xs hover:border-border-hover transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-2.5">
                    <div>
                      <h4 className="text-xs font-bold text-text-primary">{run.promptTitle || 'Benchmark Shootout'}</h4>
                      <span className="text-[10px] text-text-muted font-mono">
                        {new Date(run.createdAt).toLocaleString()} · {run.results.length} models tested
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onUpdatePrompt) onUpdatePrompt(run.promptText);
                          // Reconstitute slots from run results
                          if (run.results && run.results.length >= 2) {
                            setSlots(
                              run.results.map((r, i) => ({
                                id: `slot-history-${i}`,
                                modelId: r.modelId,
                                name: r.modelName,
                                provider: r.provider,
                                status: 'completed',
                                output: r.output,
                                latencyMs: r.latencyMs,
                                tokens: r.tokens,
                                costUsd: r.costUsd,
                                costDisplay: r.costDisplay,
                              }))
                            );
                            setWinningSlotId(
                              run.results.find((r) => r.isWinner)?.modelId ? `slot-history-${run.results.findIndex((r) => r.isWinner)}` : null
                            );
                          }
                          setActiveViewMode('cards');
                        }}
                        className="px-2.5 py-1 rounded bg-bg-primary hover:bg-bg-tertiary text-text-primary text-[11px] font-medium transition-colors cursor-pointer border border-border-default min-h-[30px]"
                      >
                        Reopen Run
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteArenaRun(run.id)}
                        className="p-1 rounded text-text-muted hover:text-rose-600 transition-colors cursor-pointer min-h-[30px] min-w-[30px] flex items-center justify-center"
                        title="Delete run from history"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs font-mono text-text-secondary line-clamp-2 bg-bg-primary p-2 rounded">
                    {run.promptText}
                  </p>

                  <div className="flex gap-2 flex-wrap text-[10px] font-mono">
                    {run.results.map((r) => (
                      <span
                        key={r.modelId}
                        className={`px-2 py-0.5 rounded border ${
                          r.isWinner
                            ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold flex items-center gap-1'
                            : 'bg-bg-primary text-text-secondary border-border-default'
                        }`}
                      >
                        {r.isWinner && <Award className="w-2.5 h-2.5 text-amber-700" />}
                        {r.modelName} ({(r.latencyMs / 1000).toFixed(2)}s)
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── 4. Model Selector Modal ─────────────────────────────────────────── */}
      {isSelectorOpen && (
        <ModelSelectorModal
          isOpen={isSelectorOpen}
          onClose={() => {
            setIsSelectorOpen(false);
            setEditingSlotId(null);
          }}
          selectedModelId={activeEditingSlot?.modelId || 'openrouter/free'}
          feature="arena"
          onSelectModel={handleSelectModelForSlot}
        />
      )}

      {/* Upgrade Modal */}
      <AIUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        mode={isLoggedIn ? 'credits' : 'guest'}
      />
    </div>
  );
};

export default ArenaPanel;
