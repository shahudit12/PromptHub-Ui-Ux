import React, { useState, useEffect, useMemo } from 'react';
import {
  Swords,
  Lock,
  ArrowRight,
  Sparkles,
  Brain,
  Code2,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { modelCatalogService, type CatalogModel } from '../../services/modelCatalogService';

const SAMPLE_ARENA_PROMPT = `Extract all customer subscription changes, MRR numbers, and churn reasons from {{payload}} and return structured JSON.`;

const SAMPLE_PREVIEWS: Record<string, string> = {
  anthropic: `{\n  "organization_id": "org_9821",\n  "audit_timestamp": "2026-08-19T04:00:00Z",\n  "subscription_events": [\n    {\n      "customer_id": "cust_104",\n      "event_type": "expansion",\n      "mrr_delta_usd": 4200.00,\n      "root_cause": "Tier upgrade to Enterprise SLA"\n    }\n  ],\n  "confidence_score": 0.98\n}`,
  openai: `{\n  "organization_id": "org_9821",\n  "audit_timestamp": "2026-08-19T04:00:00Z",\n  "subscription_events": [\n    {\n      "customer_id": "cust_104",\n      "event_type": "expansion",\n      "mrr_delta_usd": 4200.00,\n      "root_cause": "Tier upgrade to Enterprise SLA"\n    }\n  ],\n  "confidence_score": 0.97\n}`,
  gemini: `{\n  "organization_id": "org_9821",\n  "audit_timestamp": "2026-08-19T04:00:00Z",\n  "subscription_events": [\n    {\n      "customer_id": "cust_104",\n      "event_type": "expansion",\n      "mrr_delta_usd": 4200.00,\n      "root_cause": "Tier upgrade to Enterprise SLA"\n    }\n  ],\n  "confidence_score": 0.96\n}`,
  deepseek: `{\n  "organization_id": "org_9821",\n  "audit_timestamp": "2026-08-19T04:00:00Z",\n  "subscription_events": [\n    {\n      "customer_id": "cust_104",\n      "event_type": "expansion",\n      "mrr_delta_usd": 4200.00,\n      "root_cause": "Tier upgrade to Enterprise SLA"\n    }\n  ],\n  "confidence_score": 0.98\n}`,
};

export const ArenaBranchingPreview: React.FC = () => {
  const { setArenaPromptDraft, isLoggedIn, setShowAuthModal, showToast, navigateToArena } = useApp();

  const [catalog, setCatalog] = useState<CatalogModel[]>(() => modelCatalogService.getCachedCatalog());
  const [selectedModelKey, setSelectedModelKey] = useState<string>('claude');

  // Load live catalog on mount
  useEffect(() => {
    modelCatalogService.fetchCatalog().then((models) => {
      if (models && models.length > 0) {
        setCatalog(models);
      }
    }).catch(() => {});
  }, []);

  // Dynamically resolve 4 representative flagship models from live catalog
  const representativeModels = useMemo(() => {
    const claude =
      catalog.find((m) => m.id === 'anthropic/claude-3.7-sonnet') ||
      catalog.find((m) => m.id === 'anthropic/claude-3.5-sonnet') ||
      catalog.find((m) => m.providerId === 'anthropic') || {
        id: 'anthropic/claude-3.7-sonnet',
        name: 'Claude 3.7 Sonnet',
        provider: 'Anthropic',
        providerId: 'anthropic',
        description: 'Frontier benchmark for complex coding, reasoning, and schema extraction.',
        contextLength: 200000,
        pricing: { prompt: 3, completion: 15 },
        isFree: false,
        isCoding: true,
        isReasoning: true,
      };

    const gpt =
      catalog.find((m) => m.id === 'openai/gpt-4o') ||
      catalog.find((m) => m.providerId === 'openai') || {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        provider: 'OpenAI',
        providerId: 'openai',
        description: 'Flagship versatile intelligence with high instruction adherence.',
        contextLength: 128000,
        pricing: { prompt: 2.5, completion: 10 },
        isFree: false,
        isCoding: true,
        isReasoning: false,
      };

    const gemini =
      catalog.find((m) => m.id === 'google/gemini-2.0-flash') ||
      catalog.find((m) => m.id === 'google/gemini-2.0-flash-001') ||
      catalog.find((m) => m.providerId === 'gemini') || {
        id: 'google/gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'Google',
        providerId: 'gemini',
        description: 'High-speed generative intelligence with 1M token context window.',
        contextLength: 1000000,
        pricing: { prompt: 0.1, completion: 0.4 },
        isFree: false,
        isCoding: false,
        isReasoning: false,
      };

    const deepseek =
      catalog.find((m) => m.id === 'deepseek/deepseek-r1') ||
      catalog.find((m) => m.providerId === 'deepseek') || {
        id: 'deepseek/deepseek-r1',
        name: 'DeepSeek R1',
        provider: 'DeepSeek',
        providerId: 'deepseek',
        description: 'Open reasoning model with native step-by-step verification.',
        contextLength: 64000,
        pricing: { prompt: 0.55, completion: 2.19 },
        isFree: false,
        isCoding: true,
        isReasoning: true,
      };

    return [
      { key: 'claude', model: claude, icon: Code2, highlight: 'Architecture & Coding' },
      { key: 'gpt', model: gpt, icon: Sparkles, highlight: 'Versatile Instruction' },
      { key: 'gemini', model: gemini, icon: Zap, highlight: '1M Context Speed' },
      { key: 'deepseek', model: deepseek, icon: Brain, highlight: 'Step-by-Step Reasoning' },
    ];
  }, [catalog]);

  const activeEntry =
    representativeModels.find((item) => item.key === selectedModelKey) || representativeModels[0];
  const activeModel = activeEntry.model;

  const handleOpenArena = () => {
    if (!isLoggedIn) {
      setArenaPromptDraft(SAMPLE_ARENA_PROMPT);
      showToast('Sign in to launch the Prompt IDE Arena.', 'info');
      setShowAuthModal(true);
      return;
    }

    navigateToArena(activeModel.id, SAMPLE_ARENA_PROMPT);
  };

  const formatContext = (ctx?: number) => {
    if (!ctx) return '128K';
    if (ctx >= 1000000) return `${(ctx / 1000000).toFixed(1)}M`;
    return `${Math.round(ctx / 1000)}K`;
  };

  const formatPricing = (pricing?: { prompt: number; completion: number }) => {
    if (!pricing || (pricing.prompt === 0 && pricing.completion === 0)) return 'Free';
    return `$${pricing.prompt.toFixed(2)} / $${pricing.completion.toFixed(2)} / 1M`;
  };

  return (
    <section id="arena-preview" className="py-12 sm:py-16 px-4 sm:px-6 md:px-8 bg-bg-secondary border-b border-border-default text-left font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Section Header */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-xs font-semibold text-brand-primary font-mono uppercase tracking-widest bg-brand-primary-light border border-brand-primary/20 px-3 py-0.5 rounded-full inline-flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5" />
            <span>MODEL COMPARISON</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-black font-display text-text-primary tracking-tight">
            Compare one prompt across multiple AI models.
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            See how different models approach the same task, compare their capabilities, and choose the right model before running a full Arena test.
          </p>
        </div>

        {/* Light Comparison Card */}
        <div className="rounded-2xl border border-border-default bg-bg-secondary p-5 sm:p-7 shadow-sm space-y-5">
          {/* Prompt Banner */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-bg-primary border border-border-default space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-text-primary flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-primary" />
                <span>Test Prompt Input:</span>
              </span>
              <span className="text-[11px] text-text-muted">Multi-Model Arena Draft</span>
            </div>
            <p className="text-xs sm:text-sm font-mono text-text-primary leading-relaxed bg-bg-secondary p-2.5 rounded-lg border border-border-subtle">
              "{SAMPLE_ARENA_PROMPT}"
            </p>
          </div>

          {/* 4 Interactive Model Selector Cards */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-text-muted mb-2">
              <span>Select a model to preview capability metadata:</span>
              <span className="hidden sm:inline">Live OpenRouter Catalog</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {representativeModels.map(({ key, model, icon: Icon, highlight }) => {
                const isSelected = selectedModelKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedModelKey(key)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer space-y-2 relative group min-h-[44px] ${
                      isSelected
                        ? 'bg-brand-primary-light/50 border-brand-primary shadow-xs ring-1 ring-brand-primary/30'
                        : 'bg-bg-primary hover:bg-bg-secondary border-border-default hover:border-brand-primary/60 hover:-translate-y-0.5 shadow-2xs'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-1">
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-xs font-bold text-text-primary font-display truncate block">
                          {model.name}
                        </span>
                        <span className="text-[10px] font-mono text-text-muted block">
                          {model.provider}
                        </span>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-brand-primary text-white'
                            : 'bg-bg-tertiary text-text-secondary group-hover:text-brand-primary'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Metadata Badges */}
                    <div className="space-y-1 text-[11px] font-mono text-text-secondary pt-1 border-t border-border-subtle">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-text-muted">Context:</span>
                        <span className="font-semibold text-text-primary">
                          {formatContext(model.contextLength)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-text-muted">Pricing:</span>
                        <span className="font-semibold text-text-primary truncate ml-1">
                          {formatPricing(model.pricing)}
                        </span>
                      </div>
                    </div>

                    {/* Capability Chip */}
                    <div className="pt-1">
                      <span className="text-[10px] font-semibold text-brand-primary bg-bg-secondary px-2 py-0.5 rounded border border-brand-primary/20 block truncate text-center">
                        {highlight}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Model Capability & Sample Output Preview */}
          <div className="rounded-xl border border-border-default bg-bg-secondary p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border-default text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-text-primary font-display text-sm">
                  {activeModel.name}
                </span>
                <span className="px-2 py-0.5 rounded bg-bg-secondary border border-border-default text-text-secondary font-mono text-[10px]">
                  Provider: {activeModel.provider}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[10px] font-semibold">
                  {formatContext(activeModel.contextLength)} Window
                </span>
              </div>
              <span className="text-[11px] font-mono text-text-muted bg-bg-secondary px-2 py-0.5 rounded border border-border-subtle">
                Example Response Architecture
              </span>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              {activeModel.description || 'Frontier language model optimized for complex schema adherence and deterministic output.'}
            </p>

            {/* JSON Output Inset */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block">
                Structured Schema Output (Preview):
              </span>
              <pre className="p-3 bg-bg-secondary rounded-lg border border-border-default font-mono text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed overflow-x-auto max-h-40 whitespace-pre shadow-2xs">
                {SAMPLE_PREVIEWS[selectedModelKey] || SAMPLE_PREVIEWS.anthropic}
              </pre>
            </div>
          </div>

          {/* Protected CTA & Auth Gate Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border-subtle text-xs">
            <div className="flex items-center gap-2 text-text-secondary font-mono text-[11.5px]">
              {!isLoggedIn ? (
                <div className="flex items-center gap-1.5 text-text-muted">
                  <Lock className="w-3.5 h-3.5 text-text-muted" />
                  <span>Sign in required to run Arena tests.</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Signed in · 2-4x Parallel Execution Ready</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleOpenArena}
                className="w-full sm:w-auto px-5 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:-translate-y-px min-h-[38px]"
              >
                {!isLoggedIn && <Lock className="w-3.5 h-3.5 text-white/80" />}
                <span>Open full Arena →</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ArenaBranchingPreview;
