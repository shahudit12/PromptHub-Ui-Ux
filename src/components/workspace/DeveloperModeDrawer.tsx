import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Terminal,
  Cpu,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  Zap,
  ShieldCheck,
  Brain,
  Network,
  ScrollText,
} from 'lucide-react';
import { multiProviderService, type AIProviderId } from '../../services/ai/multiProviderService';
import { isFreeOpenRouterModel } from '../../config/providerRegistry';
import { getModelCreditCost } from '../../config/modelCostCatalog';
import { useApp } from '../../context/AppContext';
import { PromptKeyIcon } from '../icons/PromptHubIcons';
import { McpServerConfig } from './McpServerConfig';

export interface DeveloperSettings {
  modelOverride: string | null; // null or 'auto' means autonomous routing
  temperature: number; // 0.0 - 1.0
  maxTokens: number; // 512 - 32768
  systemPromptOverride: string;
}

export interface DeveloperModeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: DeveloperSettings;
  onSettingsChange?: (newSettings: DeveloperSettings) => void;
  // Direct bindings for convenience
  selectedModel?: string | null;
  onSelectModel?: (modelId: string | null) => void;
  temperature?: number;
  onTemperatureChange?: (val: number) => void;
  maxTokens?: number;
  onMaxTokensChange?: (val: number) => void;
  systemPrompt?: string;
  onSystemPromptChange?: (val: string) => void;
  onOpenByokVault?: () => void;
  onOpenBrief?: () => void;
  onOpenMemory?: () => void;
  onOpenGraph?: () => void;
  autoApproveRisk?: boolean;
  onToggleAutoApprove?: (enabled: boolean) => void;
  className?: string;
}

const FREE_CLUSTER_MODELS = [
  { id: 'openrouter/free', label: 'Auto Best Free', badge: '0 cr • Router', desc: 'Auto-routes to the fastest free frontier model' },
  { id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B', badge: '0 cr • Google', desc: 'Google DeepMind 31B multimodal dense model at $0' },
  { id: 'nvidia/nemotron-3.5-lightning:free', label: 'Nemotron Lightning', badge: '0 cr • 1M ctx', desc: 'NVIDIA ultra-fast 1M context model at $0' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 120B', badge: '0 cr • Reasoning', desc: 'NVIDIA 120B open hybrid model with strong reasoning at $0' },
  { id: 'google/gemma-4-26b-a4b-it:free', label: 'Gemma 4 26B', badge: '0 cr • Multimodal', desc: 'Sub-second streaming & multimodal vision perception' },
  { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1', badge: '0 cr • Reasoning', desc: 'Transparent chain-of-thought mathematical & logical deduction' },
  { id: 'qwen/qwen-2.5-coder-32b-instruct:free', label: 'Qwen 2.5 Coder 32B', badge: '0 cr • Coding', desc: 'State-of-the-art interactive web apps and complete code generation' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B', badge: '0 cr • Frontier', desc: 'Meta 70B frontier open language model' },
];

const MANAGED_FRONTIER_MODELS = [
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', badge: 'Paid Gateway', desc: 'SOTA persuasive copywriting, nuanced voice, and system architecture' },
  { id: 'openai/gpt-4o', label: 'OpenAI GPT-4o', badge: 'Paid Gateway', desc: 'Omni multimodal vision and complex reasoning' },
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek Chat (V3)', badge: 'Paid Gateway', desc: 'Fast, cost-efficient frontier language intelligence' },
  { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B (Managed)', badge: 'Paid Gateway', desc: 'Dedicated managed tier for high-throughput generation' },
];

const SYSTEM_PROMPT_PRESETS = [
  {
    label: 'Standard / Neutral',
    desc: 'Default PromptHub outcome-oriented assistant behavior',
    directive: '',
  },
  {
    label: 'Principal Architect',
    desc: 'Modular, typed, and production-ready code with complete implementations',
    directive: 'You are a Principal Software Architect. Produce clean, strictly-typed, modular production code with zero placeholders or truncated syntax. Include comprehensive edge-case handling and inline comments explaining non-trivial logic.',
  },
  {
    label: 'Conversion Copywriter',
    desc: 'High-urgency, punchy, direct-response copy that maximizes conversions',
    directive: 'You are a Direct-Response Master Copywriter. Write punchy, persuasive copy with emotional resonance, clear value propositions, zero corporate fluff, and irresistible calls to action.',
  },
  {
    label: 'Executive Strategist',
    desc: 'Structured frameworks, quantitative KPIs, and phased roadmaps',
    directive: 'You are an Executive Strategic Advisor. Structure all deliverables into clear executive summaries, MECE strategic frameworks, measurable KPIs, risk matrices, and prioritized phased action plans.',
  },
];

const BYOK_PROVIDERS_TRACKED: { id: AIProviderId; label: string }[] = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'gemini', label: 'Google Gemini' },
  { id: 'deepseek', label: 'DeepSeek' },
  { id: 'groq', label: 'Groq' },
  { id: 'openrouter', label: 'OpenRouter' },
];

export const DeveloperModeDrawer: React.FC<DeveloperModeDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  selectedModel: propSelectedModel,
  onSelectModel,
  temperature: propTemperature,
  onTemperatureChange,
  maxTokens: propMaxTokens,
  onMaxTokensChange,
  systemPrompt: propSystemPrompt,
  onSystemPromptChange,
  onOpenByokVault,
  onOpenBrief,
  onOpenMemory,
  onOpenGraph,
  autoApproveRisk = false,
  onToggleAutoApprove,
  className = '',
}) => {
  const { setActiveTab } = useApp();

  // Internal state when external handlers are not supplied
  const [internalModel, setInternalModel] = useState<string | null>(
    settings?.modelOverride ?? propSelectedModel ?? null
  );
  const [internalTemp, setInternalTemp] = useState<number>(
    settings?.temperature ?? propTemperature ?? 0.7
  );
  const [internalTokens, setInternalTokens] = useState<number>(
    settings?.maxTokens ?? propMaxTokens ?? 4096
  );
  const [internalPrompt, setInternalPrompt] = useState<string>(
    settings?.systemPromptOverride ?? propSystemPrompt ?? ''
  );
  const [connectedProviders, setConnectedProviders] = useState<AIProviderId[]>([]);

  // Synchronize incoming props
  useEffect(() => {
    if (settings) {
      setInternalModel(settings.modelOverride);
      setInternalTemp(settings.temperature);
      setInternalTokens(settings.maxTokens);
      setInternalPrompt(settings.systemPromptOverride);
    } else {
      if (propSelectedModel !== undefined) setInternalModel(propSelectedModel);
      if (propTemperature !== undefined) setInternalTemp(propTemperature);
      if (propMaxTokens !== undefined) setInternalTokens(propMaxTokens);
      if (propSystemPrompt !== undefined) setInternalPrompt(propSystemPrompt);
    }
  }, [settings, propSelectedModel, propTemperature, propMaxTokens, propSystemPrompt]);

  // Load connected BYOK providers
  useEffect(() => {
    const refreshBYOK = () => {
      setConnectedProviders(multiProviderService.getConnectedProviders());
    };
    refreshBYOK();
    const interval = setInterval(refreshBYOK, 3000);
    return () => clearInterval(interval);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleModelChange = (modelId: string | null) => {
    const clean = modelId === 'auto' || !modelId ? null : modelId;
    setInternalModel(clean);
    onSelectModel?.(clean);
    if (onSettingsChange) {
      onSettingsChange({
        modelOverride: clean,
        temperature: internalTemp,
        maxTokens: internalTokens,
        systemPromptOverride: internalPrompt,
      });
    }
  };

  const handleTempChange = (val: number) => {
    const clamped = Math.max(0, Math.min(1, Math.round(val * 100) / 100));
    setInternalTemp(clamped);
    onTemperatureChange?.(clamped);
    if (onSettingsChange) {
      onSettingsChange({
        modelOverride: internalModel,
        temperature: clamped,
        maxTokens: internalTokens,
        systemPromptOverride: internalPrompt,
      });
    }
  };

  const handleTokensChange = (val: number) => {
    const clamped = Math.max(512, Math.min(32768, val));
    setInternalTokens(clamped);
    onMaxTokensChange?.(clamped);
    if (onSettingsChange) {
      onSettingsChange({
        modelOverride: internalModel,
        temperature: internalTemp,
        maxTokens: clamped,
        systemPromptOverride: internalPrompt,
      });
    }
  };

  const handlePromptChange = (text: string) => {
    setInternalPrompt(text);
    onSystemPromptChange?.(text);
    if (onSettingsChange) {
      onSettingsChange({
        modelOverride: internalModel,
        temperature: internalTemp,
        maxTokens: internalTokens,
        systemPromptOverride: text,
      });
    }
  };

  const handleResetToDefaults = () => {
    handleModelChange(null);
    handleTempChange(0.7);
    handleTokensChange(4096);
    handlePromptChange('');
  };

  const navigateToVault = () => {
    if (onOpenByokVault) {
      onOpenByokVault();
    } else {
      setActiveTab('credentials');
    }
    onClose();
  };

  if (!isOpen) return null;

  const currentModelCost = internalModel
    ? isFreeOpenRouterModel(internalModel)
      ? 0
      : getModelCreditCost(internalModel)
    : 0;

  const isModelUnlockedByByok = internalModel
    ? multiProviderService.isModelUnlockedByBYOK(internalModel).unlocked
    : false;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Model Configuration Controls"
      className="fixed inset-0 z-50 flex justify-end overflow-hidden"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#000000]/60 backdrop-blur-xs transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer"
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        className={`relative w-full max-w-lg sm:max-w-xl bg-bg-secondary border-l border-border-default shadow-2xl flex flex-col h-full transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-text z-10 ${className}`}
      >
        {/* Header */}
        <header className="h-16 shrink-0 px-5 sm:px-6 border-b border-border-default bg-bg-secondary flex items-center justify-between gap-3 sticky top-0 z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20 shrink-0">
              <Terminal className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-display text-text-primary tracking-tight truncate">
                  Model Configuration
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20 shrink-0">
                  CONFIG
                </span>
              </div>
              <p className="text-xs text-text-muted truncate">
                Inference parameters, custom directives &amp; model routing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="min-h-[44px] px-3 rounded-xl border border-border-default bg-bg-primary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer"
              title="Reset all settings to default auto-routing"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Model Configuration"
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-border-default bg-bg-primary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary flex items-center justify-center transition-all duration-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Section 1: Model Routing Directive */}
          <section className="bg-bg-primary border border-border-default rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-brand-primary shrink-0" />
                <h3 className="text-sm font-bold text-text-primary font-display">
                  Model Override &amp; Routing
                </h3>
              </div>
              {internalModel ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                  Locked: {isModelUnlockedByByok ? 'BYOK (0 cr)' : currentModelCost === 0 ? 'Free (0 cr)' : `${currentModelCost} cr`}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  <Zap className="w-3 h-3" />
                  Autonomous Routing
                </span>
              )}
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              By default, PromptHub autonomously classifies your task and routes it to the optimal model without cost or friction. You can lock an explicit model override below:
            </p>

            <div className="space-y-2">
              <label htmlFor="developer-model-select" className="text-xs font-semibold text-text-primary block">
                Selected Model Architecture
              </label>
              <div className="relative">
                <select
                  id="developer-model-select"
                  value={internalModel || 'auto'}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 pr-10 rounded-xl border border-border-default bg-bg-secondary text-text-primary text-xs font-mono font-medium focus:outline-hidden focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all duration-200 cursor-pointer appearance-none"
                >
                  <option value="auto">⚡ Auto (Autonomous Deliverable Routing)</option>
                  <optgroup label="PromptHub Free Cluster (0 Credits)">
                    {FREE_CLUSTER_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} ({m.badge})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Frontier &amp; Managed Gateway (AICredits / BYOK)">
                    {MANAGED_FRONTIER_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} ({m.badge})
                      </option>
                    ))}
                  </optgroup>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Selected Model Details Preview */}
            <div className="p-3 rounded-xl bg-bg-secondary border border-border-subtle text-xs space-y-1.5">
              <div className="flex items-center justify-between text-text-secondary">
                <span className="font-semibold text-text-primary">Effective Execution Lane:</span>
                <span className="font-mono text-text-primary">
                  {internalModel
                    ? isModelUnlockedByByok
                      ? 'BYOK Direct (0 cr)'
                      : currentModelCost === 0
                      ? 'OpenRouter Free (0 cr)'
                      : `AICredits Premium (${currentModelCost} cr)`
                    : 'Dynamic Autonomous Route'}
                </span>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                {internalModel
                  ? `Manual lock active. The workspace will bypass autonomous routing and dispatch all requests to ${internalModel}.`
                  : 'Autonomous routing is active. Tasks will be routed to Gemini 2.0 Flash (vision/general), DeepSeek R1 (reasoning/reports), Claude 3.5 (copywriting), or Qwen 2.5 Coder (web apps).'}
              </p>
            </div>
          </section>

          {/* Section 2: Inference Parameters (Temperature & Max Output Tokens) */}
          <section className="bg-bg-primary border border-border-default rounded-2xl p-4 sm:p-5 space-y-5 shadow-2xs">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-primary shrink-0" />
              <h3 className="text-sm font-bold text-text-primary font-display">
                Inference Parameters
              </h3>
            </div>

            {/* Temperature Slider */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="developer-temp-slider" className="text-xs font-semibold text-text-primary block">
                    Sampling Temperature
                  </label>
                  <span className="text-[11px] text-text-muted">
                    Balances deterministic precision vs. creative exploration
                  </span>
                </div>
                <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-bg-secondary border border-border-default text-text-primary">
                  {internalTemp.toFixed(2)}
                </span>
              </div>

              <input
                id="developer-temp-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={internalTemp}
                onChange={(e) => handleTempChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />

              {/* Temperature Quick Presets (all min-h-[44px]) */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleTempChange(0.2)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-medium transition-all duration-150 cursor-pointer flex flex-col items-center justify-center ${
                    Math.abs(internalTemp - 0.2) < 0.05
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-bold'
                      : 'border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-secondary'
                  }`}
                >
                  <span className="font-semibold">Precise</span>
                  <span className="text-[10px] opacity-75">0.20 (Code)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTempChange(0.7)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-medium transition-all duration-150 cursor-pointer flex flex-col items-center justify-center ${
                    Math.abs(internalTemp - 0.7) < 0.05
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-bold'
                      : 'border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-secondary'
                  }`}
                >
                  <span className="font-semibold">Balanced</span>
                  <span className="text-[10px] opacity-75">0.70 (Standard)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTempChange(1.0)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-medium transition-all duration-150 cursor-pointer flex flex-col items-center justify-center ${
                    Math.abs(internalTemp - 1.0) < 0.05
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-bold'
                      : 'border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-secondary'
                  }`}
                >
                  <span className="font-semibold">Creative</span>
                  <span className="text-[10px] opacity-75">1.00 (Brainstorm)</span>
                </button>
              </div>
            </div>

            <div className="h-px bg-border-subtle" />

            {/* Max Output Tokens Slider */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="developer-tokens-slider" className="text-xs font-semibold text-text-primary block">
                    Max Output Generation Limit
                  </label>
                  <span className="text-[11px] text-text-muted">
                    Upper ceiling for generated tokens (512 to 32,768)
                  </span>
                </div>
                <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-bg-secondary border border-border-default text-text-primary">
                  {internalTokens.toLocaleString()} tokens
                </span>
              </div>

              <input
                id="developer-tokens-slider"
                type="range"
                min="512"
                max="32768"
                step="512"
                value={internalTokens}
                onChange={(e) => handleTokensChange(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />

              {/* Tokens Quick Presets (all min-h-[44px]) */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[1024, 4096, 8192, 16384].map((tok) => (
                  <button
                    key={tok}
                    type="button"
                    onClick={() => handleTokensChange(tok)}
                    className={`min-h-[44px] px-2 py-2 rounded-xl border text-xs font-medium transition-all duration-150 cursor-pointer flex flex-col items-center justify-center ${
                      internalTokens === tok
                        ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-bold'
                        : 'border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-secondary'
                    }`}
                  >
                    <span className="font-semibold">{tok >= 1024 ? `${tok / 1024}K` : tok}</span>
                    <span className="text-[10px] opacity-75">{tok >= 1024 ? `${(tok / 1024) * 750}w` : 'Short'}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Section 3: System Prompt Override */}
          <section className="bg-bg-primary border border-border-default rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-brand-primary shrink-0" />
                <h3 className="text-sm font-bold text-text-primary font-display">
                  System Directive Override
                </h3>
              </div>
              {internalPrompt.trim() && (
                <button
                  type="button"
                  onClick={() => handlePromptChange('')}
                  className="min-h-[44px] px-2.5 py-1 text-xs text-text-muted hover:text-red-500 font-medium transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Inject custom developer directives to enforce specialized behavior, strict output formatting, or personality attributes:
            </p>

            {/* Preset Directives Buttons */}
            <div className="flex flex-wrap gap-2">
              {SYSTEM_PROMPT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePromptChange(preset.directive)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-medium transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                    internalPrompt === preset.directive
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-semibold'
                      : 'border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Sparkles className="w-3 h-3 shrink-0" />
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>

            <textarea
              value={internalPrompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              placeholder="e.g. You are an expert AI agent. Always verify assumptions, provide complete type-safe code, and structure responses with clear markdown headers."
              rows={4}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border-default bg-bg-secondary text-text-primary text-xs font-mono placeholder:text-text-muted focus:outline-hidden focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all duration-200 resize-y min-h-[100px]"
            />
            <div className="flex items-center justify-between text-[11px] text-text-muted">
              <span>{internalPrompt.length} characters</span>
              <span>Injected into assistant system turn</span>
            </div>
          </section>

          {/* Section 4: BYOK Credential Vault Status */}
          <section className="bg-bg-primary border border-border-default rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PromptKeyIcon size={16} className="text-brand-primary shrink-0" />
                <h3 className="text-sm font-bold text-text-primary font-display">
                  BYOK Credential Status
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {connectedProviders.length} CONNECTED
              </span>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              When a personal API key is connected, PromptHub automatically routes requests to that provider with <strong>0 platform credits deducted</strong>.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {BYOK_PROVIDERS_TRACKED.map((prov) => {
                const isConnected = connectedProviders.includes(prov.id);
                return (
                  <div
                    key={prov.id}
                    className="p-3 rounded-xl border border-border-default bg-bg-secondary flex flex-col justify-between gap-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-text-primary truncate">
                        {prov.label}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isConnected ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-gray-400 dark:bg-gray-600'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-mono font-semibold ${
                        isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-text-muted'
                      }`}
                    >
                      {isConnected ? 'Active (0 cr)' : 'Not Connected'}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={navigateToVault}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer group"
            >
              <PromptKeyIcon size={14} className="text-brand-primary" />
              <span>Configure API Keys in BYOK Vault</span>
            </button>
          </section>

          {/* Section 5: Model Context Protocol (MCP) Integrations */}
          <section className="bg-bg-primary border border-border-default rounded-2xl p-4 sm:p-5 shadow-2xs">
            <McpServerConfig />
          </section>

          {/* Section 6: Action Confirmation & Risk Gates (Req #4) */}
          <section className="bg-bg-primary border border-border-default rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-primary shrink-0" />
                <h3 className="text-sm font-bold text-text-primary font-display">
                  Action Confirmation & Risk Gates
                </h3>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                autoApproveRisk
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              }`}>
                {autoApproveRisk ? 'AUTO-PROCEED' : 'CONFIRM FIRST'}
              </span>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              When enabled, PromptHub requires explicit confirmation before performing high-risk actions (file edits, overwrites, external web calls), just like Antigravity.
            </p>

            <label className="flex items-center justify-between p-3 rounded-xl border border-border-default bg-bg-secondary cursor-pointer hover:bg-bg-tertiary transition-colors">
              <div className="pr-3">
                <span className="text-xs font-semibold text-text-primary block">
                  Always Ask Before High-Risk Actions
                </span>
                <span className="text-[11px] text-text-muted">
                  Requires manual user permission to modify files, run tools, or execute code.
                </span>
              </div>
              <input
                type="checkbox"
                checked={!autoApproveRisk}
                onChange={(e) => onToggleAutoApprove && onToggleAutoApprove(!e.target.checked)}
                className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary"
              />
            </label>
          </section>

          {/* Section: AI Agent Context, Memory & Knowledge Graph */}
          {(onOpenBrief || onOpenMemory || onOpenGraph) && (
            <section className="space-y-3 pt-4 border-t border-border-default">
              <div className="flex items-center gap-2 text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
                <Brain className="w-3.5 h-3.5 text-brand-primary" />
                <span>Agent Brief, Memory &amp; Knowledge Graph</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                PromptHub agents maintain structured execution briefs, notebook memories, and concept lineage graphs in the background.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {onOpenBrief && (
                  <button
                    type="button"
                    onClick={onOpenBrief}
                    className="p-3 rounded-xl border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-left transition-colors cursor-pointer flex items-center gap-2.5 shadow-3xs min-h-[44px]"
                  >
                    <ScrollText className="w-4 h-4 text-brand-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-text-primary truncate">Adaptive Brief</div>
                      <div className="text-[10px] text-text-muted truncate">Execution contract</div>
                    </div>
                  </button>
                )}
                {onOpenMemory && (
                  <button
                    type="button"
                    onClick={onOpenMemory}
                    className="p-3 rounded-xl border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-left transition-colors cursor-pointer flex items-center gap-2.5 shadow-3xs min-h-[44px]"
                  >
                    <Brain className="w-4 h-4 text-brand-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-text-primary truncate">Memory Inspector</div>
                      <div className="text-[10px] text-text-muted truncate">Working memory notes</div>
                    </div>
                  </button>
                )}
                {onOpenGraph && (
                  <button
                    type="button"
                    onClick={onOpenGraph}
                    className="p-3 rounded-xl border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-left transition-colors cursor-pointer flex items-center gap-2.5 shadow-3xs min-h-[44px]"
                  >
                    <Network className="w-4 h-4 text-brand-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-text-primary truncate">Knowledge Graph</div>
                      <div className="text-[10px] text-text-muted truncate">Concept relationship map</div>
                    </div>
                  </button>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Footer Actions */}
        <footer className="h-16 shrink-0 px-5 sm:px-6 border-t border-border-default bg-bg-secondary flex items-center justify-between gap-3 sticky bottom-0 z-10">
          <div className="text-xs text-text-muted hidden sm:block">
            <span>Press </span>
            <kbd className="px-1.5 py-0.5 rounded-sm bg-bg-tertiary border border-border-default font-mono text-[10px]">
              Esc
            </kbd>
            <span> to close</span>
          </div>

          <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                if (onSettingsChange) {
                  onSettingsChange({
                    modelOverride: internalModel,
                    temperature: internalTemp,
                    maxTokens: internalTokens,
                    systemPromptOverride: internalPrompt,
                  });
                }
                onClose();
              }}
              className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-[#084C8D] dark:bg-[#41A2D9] dark:hover:bg-[#64B6E3] text-white dark:text-[#000000] font-semibold text-xs transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Apply &amp; Return</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DeveloperModeDrawer;
