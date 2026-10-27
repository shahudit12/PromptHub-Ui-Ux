/**
 * src/views/ModelsGuideView.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * PromptHub AI Models & Features Guide
 *
 * Single Source of Truth: All model data comes from modelCatalogService +
 * providerRegistry — the same registries used by the actual model selector,
 * router, and credit engine. No secondary hardcoded lists.
 *
 * Design: DESIGN_VARIANCE:7 · MOTION_INTENSITY:6 · VISUAL_DENSITY:4
 * Palette: Primary Forest Green #315C4A · Mint Mist #E3ECE7 · Emerald #529E7C · Obsidian #0E110F
 * Typography: Outfit (display) · Inter (body) · JetBrains Mono (mono)
 * Touch targets: min-h-[44px] on all interactive controls
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Cpu,
  Sparkles,
  Zap,
  Search,
  Calculator,
  Key,
  Coins,
  Grid3X3,
  CheckCircle,
  Clock,
  XCircle,
  Layers,
  Terminal,
  Mic,
  Users,
  ShieldCheck,
  Star,
  Info,
  Swords,
  ExternalLink,
} from 'lucide-react';
import { PromptModelsHubIcon, PromptKeyIcon } from '../components/icons/PromptHubIcons';
import { ByokLogo } from '../components/ByokLogo';
import { modelCatalogService, type CatalogModel } from '../services/modelCatalogService';
import { formatInr, INR_PER_CREDIT } from '../config/creditEconomics';
import {
  isFreeOpenRouterModel,
  isModelAvailableForUser,
  AUTHORITATIVE_PROVIDER_SPECS,
  type ProviderGatewaySpec,
} from '../config/providerRegistry';
import { AppFooter } from '../components/common/AppFooter';
import { ModelProviderLogo } from '../components/common/ModelProviderLogo';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveTab =
  | 'overview'
  | 'premium-models'
  | 'free-models'
  | 'features'
  | 'credits'
  | 'providers'
  | 'byok'
  | 'calculator';

type CategoryFilter = 'all' | 'reasoning' | 'coding' | 'multimodal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getModelTier(model: CatalogModel): 'free' | 'paid' {
  if (model.isFree || isFreeOpenRouterModel(model.id)) return 'free';
  return 'paid';
}

function getTierBadge(tier: 'free' | 'paid') {
  if (tier === 'free') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-primary/10 border border-brand-primary/20 text-brand-primary dark:text-[#41A2D9] text-[10px] font-mono font-bold uppercase shrink-0">
        <Zap className="w-2.5 h-2.5" />
        Free
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-700 text-[10px] font-mono font-bold uppercase shrink-0">
      <Sparkles className="w-2.5 h-2.5" />
      Credits
    </span>
  );
}

function getStatusIcon(status: ProviderGatewaySpec['status']) {
  switch (status) {
    case 'ACTIVE':
      return <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />;
    case 'MANUAL_CONFIGURATION_REQUIRED':
      return <Clock className="w-3 h-3 text-amber-500 shrink-0" />;
    case 'BLOCKED':
      return <XCircle className="w-3 h-3 text-red-500 shrink-0" />;
    default:
      return <Info className="w-3 h-3 text-text-muted shrink-0" />;
  }
}

function getStatusLabel(status: ProviderGatewaySpec['status']) {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'MANUAL_CONFIGURATION_REQUIRED':
      return 'Pending Setup';
    case 'BLOCKED':
      return 'Blocked';
    case 'SPECIALIZED_TOOL':
      return 'Specialized Tool';
    case 'NOT_AN_API':
      return 'Consumer Tool';
    default:
      return status;
  }
}

// ─── Feature Guide Data ───────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Terminal,
    title: 'Prompt Studio IDE',
    badge: 'Live',
    description:
      'Full-featured prompt engineering workspace with variable detection {{var}}, syntax highlighting, git-style version snapshots, and multi-model execution in a single editor.',
    items: [
      'Create & edit prompts with {{variable}} support',
      'Version snapshots & history',
      'Multi-model test runner',
      'Token & latency metrics',
      'Copy/export to JSON or TypeScript',
    ],
  },
  {
    icon: Sparkles,
    title: 'AI Prompt Analyzer',
    badge: 'Live',
    description:
      'Comprehensive prompt quality analysis across 7 dimensions: clarity, specificity, context, safety, output format, role definition, and instruction quality.',
    items: [
      'Automated quality scoring',
      'Issue identification & explanations',
      'One-click auto-improvement',
      'Safety guardrail checks',
      'Comparative analysis',
    ],
  },
  {
    icon: Grid3X3,
    title: 'Multi-Model Arena',
    badge: 'Live',
    description:
      'Side-by-side prompt execution across multiple AI models. Compare outputs, latency, quality, and cost in real-time.',
    items: [
      'Parallel model execution',
      'Side-by-side output comparison',
      'Cost & speed benchmarks',
      'Shareable arena results',
    ],
  },
  {
    icon: Mic,
    title: 'Voice & Multilingual',
    badge: 'Live',
    description:
      'Browser-native speech-to-text for voice prompt input. Compose prompts hands-free across 40+ languages.',
    items: [
      'Speech-to-text prompt input',
      '40+ language support',
      'Real-time transcription',
      'No external API required',
    ],
  },
  {
    icon: Users,
    title: 'Community Marketplace',
    badge: 'Live',
    description:
      'Discover, fork, and share prompt templates with the PromptHub community. Filter by model, category, and use case.',
    items: [
      'Browse community prompts',
      'Fork into your library',
      'Publish your prompts',
      'Search by model & category',
    ],
  },
  {
    icon: Key,
    title: 'BYOK — Bring Your Own Key',
    badge: 'Live',
    description:
      'Connect your own provider API keys (OpenAI, Anthropic, Gemini, DeepSeek, Groq, etc.) for direct execution at zero PromptHub credit cost.',
    items: [
      'OpenAI, Anthropic, Gemini, Groq, Mistral, xAI',
      'Keys stored only in browser session',
      'Zero platform credit deduction',
      'Full model access via your account',
    ],
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export const ModelsGuideView: React.FC = () => {
  const { setActiveTab, openRechargeModal, navigateToStudio, navigateToArena } = useApp();

  // ── Tab State ──────────────────────────────────────────────────────────────
  const [activeNavTab, setActiveNavTab] = useState<ActiveTab>('overview');

  // ── Model Catalog (live fetch, seed from cache) ────────────────────────────
  const [catalog, setCatalog] = useState<CatalogModel[]>(() => modelCatalogService.getCachedCatalog());
  const [catalogLoading, setCatalogLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    modelCatalogService
      .fetchCatalog()
      .then((models) => {
        if (!cancelled) setCatalog(models);
      })
      .catch(() => {
        // Cache / fallback already seeded — failed refresh must not blank the page
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Governance Filter: only show models available to users ─────────────────
  const availableModels = useMemo(() => {
    const seen = new Set<string>();
    return catalog.filter((m) => {
      if (!isModelAvailableForUser(m.id)) return false;
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [catalog]);

  const freeModels = useMemo(
    () => availableModels.filter((m) => getModelTier(m) === 'free'),
    [availableModels]
  );
  const paidModels = useMemo(
    () => availableModels.filter((m) => getModelTier(m) === 'paid'),
    [availableModels]
  );

  // ── Model Filters ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  // ── Calculator State ───────────────────────────────────────────────────────
  const [calcRunsCount, setCalcRunsCount] = useState<number>(100);
  const [selectedCalcModelId, setSelectedCalcModelId] = useState<string>('');

  const selectedCalcModel = useMemo(
    () => catalog.find((m) => m.id === selectedCalcModelId) || paidModels[0] || catalog[0],
    [catalog, paidModels, selectedCalcModelId]
  );

  const effectiveCalcModelId = selectedCalcModel?.id ?? '';

  const calcCreditsPerRun = useMemo<number | null>(() => {
    if (!selectedCalcModel) return null;
    if (selectedCalcModel.isFree) return 0;
    const perRun = selectedCalcModel.creditPricing?.aicredits;
    return typeof perRun === 'number' ? perRun : null;
  }, [selectedCalcModel]);

  const calcEstimatedCredits = useMemo<number | null>(
    () => (calcCreditsPerRun === null ? null : calcCreditsPerRun * calcRunsCount),
    [calcCreditsPerRun, calcRunsCount]
  );

  const calcEstimatedInr = useMemo<number | null>(
    () => (calcEstimatedCredits === null ? null : calcEstimatedCredits * INR_PER_CREDIT),
    [calcEstimatedCredits]
  );

  // ── Tab Navigation Config ──────────────────────────────────────────────────
  const NAV_TABS: {
    id: ActiveTab;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }[] = [
    { id: 'overview', label: 'Platform & Features', icon: PromptModelsHubIcon },
    {
      id: 'premium-models',
      label: 'AICredits Premium',
      icon: Sparkles,
      badge: String(paidModels.length),
    },
    {
      id: 'free-models',
      label: 'Free Tier',
      icon: Zap,
      badge: String(freeModels.length),
    },
    { id: 'credits', label: 'Credits & Pricing', icon: Coins },
    { id: 'providers', label: 'Providers', icon: Layers },
    { id: 'byok', label: 'BYOK Direct Keys', icon: PromptKeyIcon },
    { id: 'calculator', label: 'Calculator', icon: Calculator },
  ];

  // ── Provider lane specs (LLM only) ────────────────────────────────────────
  const llmProviders = useMemo(
    () => AUTHORITATIVE_PROVIDER_SPECS.filter((p) => p.serviceType === 'llm_inference'),
    []
  );
  const specializedProviders = useMemo(
    () => AUTHORITATIVE_PROVIDER_SPECS.filter((p) => p.serviceType !== 'llm_inference'),
    []
  );


  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-bg-primary text-text-primary">
      {/* ── Hero Header ─────────────────────────────────────────────────────── */}
      <div className="border-b border-border-default bg-bg-secondary">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-brand-primary-light border border-brand-primary/20 text-brand-primary px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase">
                  <PromptModelsHubIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>PromptHub Intelligence</span>
                </span>
                <span className="text-[11px] font-mono text-brand-primary dark:text-[#41A2D9] bg-brand-primary/10 px-2 py-0.5 rounded border border-brand-primary/20 font-semibold">
                  Rate: ₹1 = 2 Credits ({formatInr(INR_PER_CREDIT)} / Credit)
                </span>
                {!catalogLoading && (
                  <span className="text-[11px] font-mono text-text-muted bg-bg-tertiary px-2 py-0.5 rounded border border-border-default">
                    {availableModels.length} models available
                  </span>
                )}
              </div>
              <h1
                className="text-xl sm:text-2xl font-bold font-display text-text-primary tracking-tight"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                AI Models &amp; Features Guide
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary max-w-2xl leading-relaxed">
                Explore PromptHub&apos;s dual-lane execution engine: verified PromptHub Credits models,
                OpenRouter free tier, and BYOK direct provider keys with zero platform markup.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => openRechargeModal(100)}
                className="btn-brand text-xs font-semibold flex items-center gap-2 px-3.5 py-2 shadow-xs cursor-pointer min-h-[44px]"
              >
                <Coins className="w-4 h-4 shrink-0" />
                <span>Recharge Credits</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('workspace')}
                className="px-3.5 py-2 rounded-lg border border-border-default bg-bg-tertiary hover:bg-border-subtle text-xs font-semibold text-text-primary cursor-pointer transition-colors min-h-[44px]"
              >
                Open Studio
              </button>
            </div>
          </div>

          {/* ── Tab Nav ───────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-1 sm:gap-2 mt-5 overflow-x-auto pb-1 border-b border-border-default/60 scrollbar-none">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeNavTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveNavTab(tab.id)}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer min-h-[44px] ${
                    isSelected
                      ? 'bg-brand-primary text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-bg-tertiary text-text-muted border border-border-default'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: OVERVIEW & ARCHITECTURE & FEATURES                              */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeNavTab === 'overview' && (
          <div className="space-y-8">
            {/* 3 Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-bg-secondary border border-border-default space-y-3 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
                  💎
                </div>
                <h3 className="text-base font-bold font-display text-text-primary">
                  AICredits Premium Lane
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Frontier LLMs (GPT-4o, Claude 3.7/3.5 Sonnet, Gemini 2.0 Pro, DeepSeek R1) routed
                  through PromptHub-managed API with transparent credit consumption.
                </p>
                <div className="pt-2 text-xs font-mono text-brand-primary font-semibold flex items-center gap-1">
                  <span>Rate: ₹1 = 2 Credits ({formatInr(INR_PER_CREDIT)} / Credit)</span>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-bg-secondary border border-border-default space-y-3 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 flex items-center justify-center font-bold">
                  🆓
                </div>
                <h3 className="text-base font-bold font-display text-text-primary">
                  OpenRouter Free Tier
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Free dynamic router and approved open-weight models (Llama 3.3 70B, DeepSeek R1 Free,
                  Gemini 2.0 Flash) consuming 0 PromptHub credits.
                </p>
                <div className="pt-2 text-xs font-mono text-brand-primary dark:text-[#41A2D9] font-semibold flex items-center gap-1">
                  <span>0 Platform Credits per run</span>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-bg-secondary border border-border-default space-y-3 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary dark:text-[#41A2D9] flex items-center justify-center font-bold">
                  🔑
                </div>
                <h3 className="text-base font-bold font-display text-text-primary">
                  Bring Your Own Key (BYOK)
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Connect personal API keys for OpenAI, Anthropic, Gemini, DeepSeek, Groq, Mistral, xAI,
                  and OpenRouter for direct client execution.
                </p>
                <div className="pt-2 text-xs font-mono text-text-muted font-semibold flex items-center gap-1">
                  <span>Zero PromptHub credit deductions</span>
                </div>
              </div>
            </div>

            {/* Feature Guide Section */}
            <div>
              <span className="text-xs font-mono font-bold text-brand-primary uppercase tracking-wider">
                What&apos;s in PromptHub
              </span>
              <h2
                className="text-xl sm:text-2xl font-bold font-display text-text-primary mt-1 tracking-tight"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Production Features
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                Every verified feature available in PromptHub today.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {FEATURES.map((feat) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={feat.title}
                    className="p-5 sm:p-6 rounded-2xl bg-bg-secondary border border-border-default space-y-4 hover:border-border-hover transition-all shadow-xs"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-primary-light border border-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold font-display text-text-primary">
                            {feat.title}
                          </h3>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-700">
                            <CheckCircle className="w-2.5 h-2.5" />
                            {feat.badge}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                          {feat.description}
                        </p>
                      </div>
                    </div>

                    <ul className="space-y-1.5 pl-1">
                      {feat.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-xs text-text-secondary">
                          <CheckCircle className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Prompt Lifecycle */}
            <div className="p-5 sm:p-8 rounded-2xl bg-bg-secondary border border-border-default space-y-6 shadow-xs">
              <div>
                <span className="text-xs font-mono font-bold text-brand-primary uppercase tracking-wider">
                  The SaaS Prompt Engineering Lifecycle
                </span>
                <h2 className="text-xl font-bold font-display text-text-primary mt-1">
                  Write → Test → Compare → Improve → Ship
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { step: '01', title: 'WRITE', desc: 'Studio IDE with {{variable}} detection and version snapshots.' },
                  { step: '02', title: 'TEST', desc: 'Multi-model execution with token & latency tracking.' },
                  { step: '03', title: 'COMPARE', desc: 'Side-by-side Arena for outputs, metrics, and quality.' },
                  { step: '04', title: 'IMPROVE', desc: 'AI prompt analyzer with one-click auto-improvement.' },
                  { step: '05', title: 'SHIP', desc: 'Export to JSON/TS, share to community, or deploy.' },
                ].map((s) => (
                  <div
                    key={s.step}
                    className="p-4 rounded-xl bg-bg-tertiary border border-border-default space-y-1.5"
                  >
                    <span className="text-xs font-mono font-bold text-brand-primary">{s.step}</span>
                    <h4 className="text-sm font-bold text-text-primary">{s.title}</h4>
                    <p className="text-xs text-text-secondary leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: PREMIUM MODELS                                                 */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeNavTab === 'premium-models' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search premium models..."
                  className="w-full pl-9 pr-4 py-2.5 bg-bg-secondary border border-border-default rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary min-h-[44px]"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {(['all', 'reasoning', 'coding', 'multimodal'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer min-h-[44px] ${
                      categoryFilter === cat
                        ? 'bg-brand-primary text-white font-semibold'
                        : 'bg-bg-secondary text-text-secondary hover:text-text-primary border border-border-default'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paidModels
                .filter((m) => {
                  const q = searchQuery.toLowerCase().trim();
                  const matchesSearch =
                    !q ||
                    m.name.toLowerCase().includes(q) ||
                    m.id.toLowerCase().includes(q) ||
                    m.provider.toLowerCase().includes(q) ||
                    m.description.toLowerCase().includes(q);
                  let matchesCat = true;
                  if (categoryFilter === 'reasoning') matchesCat = Boolean(m.isReasoning);
                  if (categoryFilter === 'coding') matchesCat = Boolean(m.isCoding);
                  if (categoryFilter === 'multimodal')
                    matchesCat = Boolean(m.inputModalities?.includes('image'));
                  return matchesSearch && matchesCat;
                })
                .map((model) => (
                  <div
                    key={model.id}
                    className="p-5 rounded-2xl bg-bg-secondary border border-border-default space-y-3 hover:border-border-hover transition-all shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-bg-tertiary border border-border-default flex items-center justify-center shrink-0 mt-0.5">
                          <ModelProviderLogo provider={model.provider} modelId={model.id} className="w-4 h-4 shrink-0" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-text-primary font-display truncate">{model.name}</h3>
                          <span className="text-[11px] font-mono text-text-muted break-all">{model.id}</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 border border-amber-500/20 text-xs font-mono font-bold shrink-0">
                        {typeof model.creditPricing?.aicredits === 'number'
                          ? `${model.creditPricing.aicredits} Credits / run`
                          : 'Price at run time'}
                      </span>
                    </div>

                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                      {model.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-text-muted">
                      <span className="bg-bg-tertiary px-2 py-0.5 rounded border border-border-default inline-flex items-center gap-1.5">
                        <ModelProviderLogo provider={model.provider} modelId={model.id} className="w-3 h-3 shrink-0" />
                        <span>{model.provider || 'AI Provider'}</span>
                      </span>
                      <span className="bg-bg-tertiary px-2 py-0.5 rounded border border-border-default">
                        Context: {Math.round((model.contextLength || 128000) / 1000)}k
                      </span>
                      {model.pricing && (
                        <span className="bg-bg-tertiary px-2 py-0.5 rounded border border-border-default">
                          ${model.pricing.prompt.toFixed(2)} / ${model.pricing.completion.toFixed(2)} per 1M tokens
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle">
                      <button
                        onClick={() => navigateToStudio(model.id)}
                        className="py-1.5 px-3 rounded-lg bg-bg-tertiary hover:bg-brand-primary hover:text-white text-text-primary text-xs font-medium border border-border-default hover:border-brand-primary transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[36px]"
                        title={`Open ${model.name} in Prompt Studio`}
                      >
                        <Cpu className="w-3.5 h-3.5 shrink-0" />
                        <span>Try in Studio</span>
                      </button>
                      <button
                        onClick={() => navigateToArena(model.id)}
                        className="py-1.5 px-3 rounded-lg bg-bg-tertiary hover:bg-brand-primary hover:text-white text-text-primary text-xs font-medium border border-border-default hover:border-brand-primary transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[36px]"
                        title={`Benchmark ${model.name} in Arena`}
                      >
                        <Swords className="w-3.5 h-3.5 shrink-0" />
                        <span>Benchmark</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: FREE MODELS                                                    */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeNavTab === 'free-models' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-brand-primary dark:text-[#41A2D9]">
                  100% Free AI Model Access
                </h4>
                <p className="text-[11.5px] text-text-secondary mt-0.5">
                  Every user gets unrestricted access to OpenRouter free models at 0 PromptHub credits.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {freeModels.map((model) => (
                <div
                  key={model.id}
                  className="p-5 rounded-2xl bg-bg-secondary border border-border-default space-y-3 hover:border-border-hover transition-all shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-bg-tertiary border border-border-default flex items-center justify-center shrink-0 mt-0.5">
                        <ModelProviderLogo provider={model.provider} modelId={model.id} className="w-4 h-4 shrink-0" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-text-primary font-display truncate">{model.name}</h3>
                        <span className="text-[11px] font-mono text-text-muted break-all">{model.id}</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-brand-primary/10 text-brand-primary dark:text-[#41A2D9] border border-brand-primary/20 text-xs font-mono font-bold shrink-0">
                      0 Credits
                    </span>
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed">
                    {model.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-text-muted">
                    <span className="bg-bg-tertiary px-2 py-0.5 rounded border border-border-default inline-flex items-center gap-1.5">
                      <ModelProviderLogo provider={model.provider} modelId={model.id} className="w-3 h-3 shrink-0" />
                      <span>{model.provider || 'AI Provider'}</span>
                    </span>
                    <span className="bg-bg-tertiary px-2 py-0.5 rounded border border-border-default">
                      Context: {Math.round((model.contextLength || 128000) / 1000)}k
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle">
                    <button
                      onClick={() => navigateToStudio(model.id)}
                      className="py-1.5 px-3 rounded-lg bg-bg-tertiary hover:bg-brand-primary hover:text-white text-text-primary text-xs font-medium border border-border-default hover:border-brand-primary transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[36px]"
                      title={`Open ${model.name} in Prompt Studio`}
                    >
                      <Cpu className="w-3.5 h-3.5 shrink-0" />
                      <span>Try in Studio</span>
                    </button>
                    <button
                      onClick={() => navigateToArena(model.id)}
                      className="py-1.5 px-3 rounded-lg bg-bg-tertiary hover:bg-brand-primary hover:text-white text-text-primary text-xs font-medium border border-border-default hover:border-brand-primary transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[36px]"
                      title={`Benchmark ${model.name} in Arena`}
                    >
                      <Swords className="w-3.5 h-3.5 shrink-0" />
                      <span>Benchmark</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: CREDITS & PRICING                                              */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeNavTab === 'credits' && (
          <div className="space-y-6 max-w-3xl">
            {/* Credit Rate */}
            <div className="p-5 sm:p-6 rounded-2xl bg-brand-primary-light border border-brand-primary/20 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/15 border border-brand-primary/25 text-brand-primary flex items-center justify-center">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display text-text-primary">
                    PromptHub Credit System
                  </h3>
                  <p className="text-xs text-text-secondary">Simple, transparent pricing</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-bg-primary border border-border-default text-center">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-brand-primary block">
                    ₹1 = 2 Credits
                  </span>
                  <span className="text-xs text-text-secondary mt-1 block">Standard Exchange</span>
                </div>
                <div className="p-4 rounded-xl bg-bg-primary border border-border-default text-center">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-brand-primary block">
                    ₹50
                  </span>
                  <span className="text-xs text-text-secondary mt-1 block">for 100 Credits</span>
                </div>
                <div className="p-4 rounded-xl bg-bg-primary border border-border-default text-center">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-brand-primary dark:text-[#41A2D9] block">
                    {formatInr(INR_PER_CREDIT)}
                  </span>
                  <span className="text-xs text-text-secondary mt-1 block">per Credit</span>
                </div>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                Different models consume different amounts of credits per run. Free models always cost{' '}
                <strong>0 credits</strong>. Premium frontier models consume credits based on their
                verified provider economics.
              </p>
            </div>

            {/* How Credits Work */}
            <div className="p-5 sm:p-6 rounded-2xl bg-bg-secondary border border-border-default space-y-5 shadow-xs">
              <h3 className="text-base font-bold font-display text-text-primary">
                How Credits Work
              </h3>
              <ol className="space-y-3">
                {[
                  ['Choose a model', 'Free or credits-based — you decide based on your needs.'],
                  ['Estimate is shown', 'PromptHub estimates the credit cost before you run.'],
                  ['Credits reserved', 'Credits are held when needed during request execution.'],
                  ['Request processed', 'Your prompt is securely evaluated by the AI provider.'],
                  ['Usage reconciled', 'Actual usage is reconciled after the response arrives.'],
                  ['Final charge applied', 'Your final credit charge is calculated and debited.'],
                  ['Transaction recorded', 'Your transaction history and ledger are updated.'],
                ].map(([title, desc], i) => (
                  <li key={title} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-brand-primary text-white text-[11px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <span className="text-xs font-semibold text-text-primary">{title}</span>
                      <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="flex items-start gap-2 p-3 rounded-xl bg-bg-tertiary border border-border-default">
                <ShieldCheck className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                <p className="text-xs text-text-secondary leading-relaxed">
                  Failed requests are automatically reconciled. The exact amount charged is calculated and
                  charged by the server when the run executes.
                </p>
              </div>
            </div>

            {/* Credit Labels */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Available', color: 'emerald', desc: 'Ready to use' },
                { label: 'Reserved', color: 'amber', desc: 'Held during request' },
                { label: 'Used', color: 'blue', desc: 'Charged for run' },
                { label: 'Refunded', color: 'violet', desc: 'Returned on failure' },
              ].map(({ label, color, desc }) => (
                <div
                  key={label}
                  className={`p-3 rounded-xl border text-center bg-${color}-500/5 border-${color}-500/20`}
                >
                  <span className={`text-xs font-bold font-mono text-${color}-700 block`}>
                    {label}
                  </span>
                  <span className="text-[10px] text-text-muted block mt-0.5">{desc}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => openRechargeModal(100)}
                className="btn-brand text-sm font-semibold flex items-center gap-2 px-5 py-3 shadow-sm cursor-pointer min-h-[44px]"
              >
                <Coins className="w-4 h-4" />
                <span>Top Up Credits</span>
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: PROVIDERS                                                       */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeNavTab === 'providers' && (
          <div className="space-y-6">
            <div>
              <h2
                className="text-xl font-bold font-display text-text-primary tracking-tight"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Provider Ecosystem
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                Explore connected AI inference engines, model routers, and tool providers.
              </p>
            </div>

            {/* LLM Providers */}
            <div>
              <h3 className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider mb-3">
                LLM Inference Providers
              </h3>
              <div className="space-y-3">
                {llmProviders.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 sm:p-5 rounded-2xl bg-bg-secondary border border-border-default shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-bg-tertiary border border-border-default flex items-center justify-center shrink-0 shadow-2xs">
                          <ModelProviderLogo provider={p.id} className="w-5 h-5 shrink-0" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-text-primary">{p.name}</h4>
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md uppercase inline-flex items-center gap-1 ${
                                p.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                                  : p.status === 'BLOCKED'
                                  ? 'bg-red-500/10 text-red-700 border border-red-500/20'
                                  : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                              }`}
                            >
                              {getStatusIcon(p.status)}
                              {getStatusLabel(p.status)}
                            </span>
                            {p.lane === 'category2' && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-700">
                                30% Discount Lane
                              </span>
                            )}
                          </div>
                          {p.baseUrl ? (
                            p.baseUrl.startsWith('http') ? (
                              <a
                                href={p.baseUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-mono text-brand-primary dark:text-[#41A2D9] hover:underline mt-0.5 break-all cursor-pointer"
                              >
                                <span>{p.baseUrl}</span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </a>
                            ) : (
                              <p className="text-[10px] font-mono text-text-muted mt-0.5 break-all">
                                {p.baseUrl}
                              </p>
                            )
                          ) : null}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {p.creditDiscountMultiplier === 0 ? (
                          <span className="text-xs font-mono font-bold text-emerald-600">
                            Free
                          </span>
                        ) : (
                          <span className="text-xs font-mono font-bold text-text-secondary">
                            {p.creditDiscountMultiplier < 1
                              ? `${Math.round((1 - p.creditDiscountMultiplier) * 100)}% off`
                              : 'Standard rate'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Specialized / Non-LLM */}
            <div>
              <h3 className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider mb-3">
                Specialized &amp; Tool Providers
              </h3>
              <div className="space-y-3">
                {specializedProviders.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl bg-bg-secondary border border-border-default opacity-75 space-y-2"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="w-8 h-8 rounded-lg bg-bg-tertiary border border-border-default flex items-center justify-center shrink-0">
                        <ModelProviderLogo provider={p.id} className="w-4 h-4 shrink-0" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-text-primary">{p.name}</span>
                          <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 rounded bg-bg-tertiary border border-border-default capitalize">
                            {p.serviceType?.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md text-text-muted border border-border-default inline-flex items-center gap-1">
                            {getStatusIcon(p.status)}
                            {getStatusLabel(p.status)}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-text-muted mt-0.5 break-all">{p.baseUrl}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: BYOK                                                           */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeNavTab === 'byok' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-bg-secondary border border-border-default space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <ByokLogo size={44} showTile={true} />
                <div>
                  <h3 className="text-base font-bold font-display text-text-primary">
                    Bring Your Own Key (BYOK) Architecture
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Your keys remain strictly in browser session storage and never touch PromptHub servers.
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Connect your personal API keys in <strong>Settings → API Credentials</strong> to execute
                prompts directly with your provider accounts. Zero PromptHub platform credits are
                deducted for BYOK executions.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('credentials')}
                  className="btn-brand text-xs sm:text-sm font-semibold flex items-center gap-2 px-4 py-2 cursor-pointer min-h-[44px]"
                >
                  <PromptKeyIcon size={16} />
                  <span>Configure API Credentials</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: CALCULATOR                                                      */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeNavTab === 'calculator' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="p-5 sm:p-6 rounded-2xl bg-bg-secondary border border-border-default space-y-6 shadow-xs">
              <div>
                <h3 className="text-base font-bold font-display text-text-primary">
                  Credit &amp; INR Cost Estimator
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Calculate exact credit and rupee costs for your workload before you start.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary block">
                    Select Model
                  </label>
                  <select
                    value={effectiveCalcModelId}
                    onChange={(e) => setSelectedCalcModelId(e.target.value)}
                    className="w-full bg-bg-tertiary border border-border-default rounded-xl px-3 py-2.5 text-xs font-medium text-text-primary focus:outline-none focus:border-brand-primary min-h-[44px]"
                  >
                    <optgroup label="Free (0 Credits)">
                      {freeModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} — Free
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Credits-Based">
                      {paidModels.map((m) => {
                        const perRun = m.creditPricing?.aicredits;
                        return (
                          <option key={m.id} value={m.id}>
                            {m.name}{' '}
                            {typeof perRun === 'number' ? `— ${perRun} cr/run` : '— metered'}
                          </option>
                        );
                      })}
                    </optgroup>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary block">
                    Number of Executions
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={calcRunsCount}
                    onChange={(e) =>
                      setCalcRunsCount(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-full bg-bg-tertiary border border-border-default rounded-xl px-3 py-2.5 text-xs font-mono text-text-primary focus:outline-none focus:border-brand-primary min-h-[44px]"
                  />
                </div>
              </div>

              {/* Result Summary Box */}
              <div className="p-5 rounded-xl bg-bg-tertiary border border-border-default space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-bg-secondary border border-border-default">
                    <span className="text-[11px] text-text-muted block font-mono mb-1">
                      Estimated Credits
                    </span>
                    <span className="text-xl sm:text-2xl font-bold font-mono text-brand-primary">
                      {calcEstimatedCredits === null
                        ? 'Not available'
                        : calcEstimatedCredits === 0
                        ? 'Free'
                        : `${calcEstimatedCredits.toLocaleString()}`}
                    </span>
                    {calcEstimatedCredits !== null && calcEstimatedCredits > 0 && (
                      <span className="text-[10px] text-text-muted block font-mono mt-0.5">credits</span>
                    )}
                  </div>
                  <div className="p-3 rounded-lg bg-bg-secondary border border-border-default">
                    <span className="text-[11px] text-text-muted block font-mono mb-1">
                      Estimated Cost
                    </span>
                    <span className="text-xl sm:text-2xl font-bold font-mono text-brand-primary dark:text-[#41A2D9]">
                      {calcEstimatedInr === null
                        ? 'Not available'
                        : calcEstimatedInr === 0
                        ? '₹0'
                        : formatInr(calcEstimatedInr)}
                    </span>
                    {calcEstimatedInr !== null && calcEstimatedInr === 0 && (
                      <span className="text-[10px] text-brand-primary dark:text-[#41A2D9] block font-mono mt-0.5">no charge</span>
                    )}
                  </div>
                </div>

                {calcEstimatedCredits === null && (
                  <p className="text-[11px] font-mono text-text-muted text-center">
                    This model&apos;s per-run credit price is not published in the catalog, so no
                    estimate is shown. The exact cost is calculated and charged by the server when
                    the run executes.
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-text-muted font-mono pt-2 border-t border-border-default/60">
                  <span>Rate: ₹1 = 2 Credits ({formatInr(INR_PER_CREDIT)} / Credit)</span>
                  {(calcEstimatedInr ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => openRechargeModal(Math.max(50, calcEstimatedInr ?? 0))}
                      className="btn-brand text-xs font-semibold px-3 py-1.5 cursor-pointer min-h-[36px]"
                    >
                      Top-Up Now
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Model Comparison */}
              <div>
                <h4 className="text-xs font-semibold text-text-secondary mb-3">
                  Sample Costs for {calcRunsCount} Runs
                </h4>
                <div className="space-y-2">
                  {[...freeModels.slice(0, 2), ...paidModels.slice(0, 3)].map((m) => {
                    const tier = getModelTier(m);
                    const perRun = tier === 'free' ? 0 : m.creditPricing?.aicredits;
                    const totalCredits = typeof perRun === 'number' ? perRun * calcRunsCount : null;
                    const totalInr = totalCredits !== null ? totalCredits * INR_PER_CREDIT : null;
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-bg-tertiary border border-border-default text-xs gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {getTierBadge(tier)}
                          <span className="font-medium text-text-primary truncate">{m.name}</span>
                        </div>
                        <span className="font-mono font-bold shrink-0 text-text-primary">
                          {totalInr === null
                            ? 'Not available'
                            : totalInr === 0
                            ? 'Free'
                            : formatInr(totalInr)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-4 rounded-xl bg-bg-secondary border border-border-default">
              <Star className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-xs text-text-secondary leading-relaxed">
                <strong>Tip:</strong> Start with free models for experimentation. Switch to credits-based
                models when you need frontier capabilities like reasoning, coding, or vision.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <AppFooter />
    </div>
  );
};

export default ModelsGuideView;
