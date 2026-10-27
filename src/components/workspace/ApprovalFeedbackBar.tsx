import React, { useState } from 'react';
import {
  ThumbsUp,
  RotateCcw,
  Edit3,
  CheckCircle,
  ChevronDown,
  Sparkles,
  Send,
} from 'lucide-react';
import { ModelProviderLogo } from '../common/ModelProviderLogo';

export interface ModelOption {
  id: string;
  name: string;
  badge: string;
  description: string;
}

export const WORKSPACE_EXECUTION_MODELS: ModelOption[] = [
  {
    id: 'openrouter/free',
    name: 'Auto Best Free',
    badge: '0 cr • Router',
    description: 'Auto-routes to the best free high-speed model.',
  },
  {
    id: 'google/gemma-4-31b-it:free',
    name: 'Gemma 4 31B',
    badge: '0 cr • Google',
    description: 'Google DeepMind 31B multimodal model at $0.',
  },
  {
    id: 'nvidia/nemotron-3.5-lightning:free',
    name: 'Nemotron Lightning',
    badge: '0 cr • 1M ctx',
    description: 'NVIDIA ultra-fast 1M context model at $0.',
  },
  {
    id: 'qwen/qwen-2.5-coder-32b-instruct:free',
    name: 'Qwen Coder 32B',
    badge: '0 cr • Coding',
    description: 'State-of-the-art coding and architectural generation.',
  },
  {
    id: 'deepseek/deepseek-r1:free',
    name: 'DeepSeek R1',
    badge: '0 cr • Thinking',
    description: 'Open reasoning model with deep transparent logic.',
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B',
    badge: '0 cr • Reasoning',
    description: 'Meta frontier open model for complex problem solving.',
  },
  {
    id: 'google/gemma-4-31b-it:free',
    name: 'Gemma 4 31B',
    badge: '0 cr • Fast',
    description: 'Sub-second real-time streaming and multimodal understanding.',
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    badge: 'Frontier • Anthropic',
    description: 'Industry benchmark for nuanced code and UI generation.',
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    badge: 'Omni • OpenAI',
    description: 'Flagship multimodal reasoning engine.',
  },
];

export interface ApprovalFeedbackBarProps {
  isApproved: boolean;
  onApprove: () => void;
  onRegenerateNew: () => void;
  onImprove: (feedbackText: string, chosenModel: string) => void;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  isGenerating?: boolean;
  className?: string;
}

export const ApprovalFeedbackBar: React.FC<ApprovalFeedbackBarProps> = ({
  isApproved,
  onApprove,
  onRegenerateNew,
  onImprove,
  selectedModel,
  onSelectModel,
  isGenerating = false,
  className = '',
}) => {
  const [showImproveInput, setShowImproveInput] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  const activeModelObj =
    WORKSPACE_EXECUTION_MODELS.find((m) => m.id === selectedModel) ||
    WORKSPACE_EXECUTION_MODELS[0];

  const handleApplyImprovement = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!feedbackText.trim() || isGenerating) return;
    onImprove(feedbackText.trim(), selectedModel);
    setFeedbackText('');
    setShowImproveInput(false);
  };

  return (
    <div
      className={`rounded-xl bg-bg-secondary border border-border-default/80 shadow-3xs p-2 sm:p-2.5 select-none space-y-2 transition-all ${className}`}
    >
      {/* ── 1. Decision Nodes Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        {/* Left Side: Decision Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono text-text-muted font-bold uppercase tracking-wider hidden sm:inline mr-1">
            Review:
          </span>

          {/* User Likes -> Approved */}
          <button
            type="button"
            onClick={onApprove}
            className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
              isApproved
                ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
            }`}
            title="Approve this output version"
          >
            {isApproved ? (
              <CheckCircle className="w-3.5 h-3.5 text-white" />
            ) : (
              <ThumbsUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>{isApproved ? 'Approved ✓' : 'Approve Output'}</span>
          </button>

          {/* User Don't Like -> Option A: New Produce */}
          <button
            type="button"
            onClick={onRegenerateNew}
            disabled={isGenerating}
            className="min-h-[44px] px-3 py-1.5 rounded-lg border border-border-default bg-bg-primary hover:bg-bg-tertiary text-xs font-semibold text-text-secondary hover:text-text-primary transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs disabled:opacity-50"
            title="User wants new produce: Generate a fresh output variation"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-brand-primary ${isGenerating ? 'animate-spin' : ''}`} />
            <span>New Produce</span>
          </button>

          {/* User Don't Like -> Option B: Improve Too */}
          <button
            type="button"
            onClick={() => setShowImproveInput(!showImproveInput)}
            className={`min-h-[44px] px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs ${
              showImproveInput
                ? 'bg-brand-primary text-white border-brand-primary'
                : 'bg-bg-primary hover:bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary'
            }`}
            title="User can improve too: Connect to model & do changes"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Improve / Tweak</span>
          </button>
        </div>

        {/* Right Side: Model of Choice Selector */}
        <div className="relative shrink-0 self-end md:self-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-[9.5px] font-mono text-text-muted font-bold uppercase hidden lg:inline">
              Model:
            </span>
            <button
              type="button"
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="min-h-[44px] px-2.5 py-1.5 rounded-lg bg-bg-primary border border-border-default hover:border-brand-primary/50 text-xs font-semibold text-text-primary transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs"
              title="Connect to an LLM / model of your choice to do changes"
              aria-label="Select execution model"
            >
              <ModelProviderLogo modelId={activeModelObj.id} provider={activeModelObj.id} className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-[110px]">{activeModelObj.name}</span>
              <span className="text-[9px] font-mono font-normal text-text-muted px-1 py-0.2 rounded bg-bg-tertiary border border-border-default hidden sm:inline">
                {activeModelObj.badge}
              </span>
              <ChevronDown className={`w-3 h-3 text-text-muted transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Dropdown Menu */}
          {isModelDropdownOpen && (
            <div className="absolute right-0 bottom-full mb-2 w-72 rounded-2xl bg-bg-secondary border border-border-default shadow-xl p-2 z-50 space-y-1">
              <div className="px-2.5 py-1.5 border-b border-border-default/60 flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-text-muted">
                  Choose Execution Model
                </span>
                <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  0 cr Free Available
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
                {WORKSPACE_EXECUTION_MODELS.map((model) => {
                  const isSelected = model.id === selectedModel;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => {
                        onSelectModel(model.id);
                        setIsModelDropdownOpen(false);
                      }}
                      className={`w-full p-2 rounded-xl text-left transition-colors cursor-pointer flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-brand-primary/10 border border-brand-primary/30 text-text-primary'
                          : 'hover:bg-bg-tertiary text-text-secondary hover:text-text-primary border border-transparent'
                      }`}
                    >
                      <ModelProviderLogo modelId={model.id} provider={model.id} className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-text-primary truncate">{model.name}</span>
                          <span className="text-[9px] font-mono text-text-muted shrink-0">{model.badge}</span>
                        </div>
                        <p className="text-[10px] text-text-muted line-clamp-1 leading-snug">
                          {model.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. Inline "Improve Too" Input Form ── */}
      {showImproveInput && (
        <form
          onSubmit={handleApplyImprovement}
          className="pt-2 border-t border-border-default/60 space-y-2 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between">
            <label htmlFor="refinement-input" className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
              <span>What would you like to improve or change?</span>
            </label>
            <span className="text-[10px] font-mono text-text-muted">
              Running on: <strong className="text-brand-primary">{activeModelObj.name}</strong>
            </span>
          </div>

          <div className="flex items-stretch gap-2">
            <input
              id="refinement-input"
              type="text"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="e.g., Add dark mode toggle, adjust color contrast, make hero copy punchier..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-bg-primary border border-border-default text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary min-h-[44px]"
            />
            <button
              type="submit"
              disabled={!feedbackText.trim() || isGenerating}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Do Changes</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
