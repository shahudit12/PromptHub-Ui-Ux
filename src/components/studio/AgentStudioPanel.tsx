import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Play, 
  Copy, 
  Check, 
  Sparkles, 
  ArrowUpRight, 
  Search, 
  Gauge, 
  Wrench, 
  Code, 
  Image, 
  Film, 
  PenTool, 
  TrendingUp, 
  Cpu, 
  FlaskConical, 
  Languages, 
  ShieldAlert, 
  GraduationCap,
  RefreshCw,
  XCircle,
  Clock,
  Zap,
  Camera,
  Download
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PromptCameraMicControls } from '../common/PromptCameraMicControls';
import { uploadPromptImage } from '../../utils/promptMediaAttachment';
import { downloadFineTuningDataset, TOTAL_BENCHMARK_PROMPTS_COUNT } from '../../data/fineTuningDataset';
import { 
  AGENTS_METADATA, 
  AGENT_CATEGORIES, 
  type AgentType, 
  type AgentCategory,
  type AgentDisplayMetadata
} from '../../config/agentMetadata';
import { aiGateway } from '../../services/ai/aiGateway';

// Icon Map for dynamic lookup without arbitrary runtime strings
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain: Bot,
  Sparkles,
  Search,
  Gauge,
  Wrench,
  Code,
  Image,
  Film,
  PenTool,
  TrendingUp,
  Cpu,
  FlaskConical,
  Languages,
  ShieldAlert,
  GraduationCap,
};

export interface AgentResult {
  output: string;
  response?: string;
  /**
   * Credits the server confirmed it settled, or null/undefined when the charge was
   * not confirmed. Never a client-side estimate — the footer used to render
   * `creditCost ?? 1`, inventing a 1-credit charge for every run the endpoint
   * reported nothing about.
   */
  creditCost?: number | null;
  durationMs?: number;
  model?: string;
  provider?: string;
  requestId?: string;
  /** Present only when the provider reported usage. */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  /** True only when `usage` came from the provider. */
  usageMeasured?: boolean;
}

export async function executePromptInWorkspace(prompt: string, agentType: AgentType = 'prompt_analyzer') {
  const res = await aiGateway.executeAgent({
    agentType,
    message: prompt,
  });
  return {
    ...res,
    response: res.output,
  };
}

export interface AgentStudioPanelProps {
  initialPrompt?: string;
  onApplyPrompt?: (prompt: string) => void;
  onSaveAgent?: (config: any) => void;
}

export const AgentStudioPanel: React.FC<AgentStudioPanelProps> = ({
  initialPrompt = '',
  onApplyPrompt,
}) => {
  const { showToast } = useApp();
  const [activeCategory, setActiveCategory] = useState<AgentCategory>('CORE');
  const [selectedAgentType, setSelectedAgentType] = useState<AgentType>('prompt_analyzer');
  const [inputMessage, setInputMessage] = useState(initialPrompt || '');
  const [isExecuting, setIsExecuting] = useState(false);
  const [agentResult, setAgentResult] = useState<AgentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const [isDraggingAgentPhoto, setIsDraggingAgentPhoto] = useState(false);

  const processAgentImage = async (file: File) => {
    try {
      const { markdownTag } = await uploadPromptImage(file, { showToast });
      setInputMessage(prev => prev.trim() ? `${prev.trim()}${markdownTag}` : markdownTag.trimStart());
    } catch {
      // toast handled
    }
  };

  const handleAgentDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer?.types?.includes('Files')) {
      e.preventDefault();
      setIsDraggingAgentPhoto(true);
    }
  };

  const handleAgentDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingAgentPhoto(false);
  };

  const handleAgentDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingAgentPhoto(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && ((file.type || '').startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i.test(file.name || ''))) {
      await processAgentImage(file);
    }
  };

  const handleAgentPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if ((items[i]?.type || '').startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          await processAgentImage(file);
          break;
        }
      }
    }
  };

  const abortControllerRef = useRef<AbortController | null>(null);
  const activeAgent: AgentDisplayMetadata = AGENTS_METADATA[selectedAgentType] || AGENTS_METADATA.prompt_analyzer;

  // Filter agents by currently active category
  const categoryAgents = Object.values(AGENTS_METADATA).filter(
    (a) => a.category === activeCategory
  );

  // Sync initial prompt if provided and input is empty
  useEffect(() => {
    if (initialPrompt && !inputMessage) {
      setInputMessage(initialPrompt);
    }
  }, [initialPrompt]);

  // Clean up in-flight abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSelectAgent = (type: AgentType) => {
    setSelectedAgentType(type);
    setErrorMessage(null);
  };

  const handleApplySample = (sampleText: string) => {
    setInputMessage(sampleText);
    setErrorMessage(null);
  };

  const handleCancelExecution = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsExecuting(false);
  };

  const handleRunAgent = async () => {
    if (!inputMessage.trim() || isExecuting) return;

    setIsExecuting(true);
    setErrorMessage(null);
    setAgentResult(null);
    setCopied(false);
    setApplied(false);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await aiGateway.executeAgent({
        agentType: selectedAgentType,
        message: inputMessage,
        signal: controller.signal,
      });
      setAgentResult({
        ...res,
        response: res.output,
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMessage(err.message || 'An unexpected error occurred while invoking the agent.');
      }
    } finally {
      setIsExecuting(false);
      abortControllerRef.current = null;
    }
  };

  const handleCopyOutput = () => {
    const text = agentResult?.output || agentResult?.response;
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertIntoEditor = () => {
    const text = agentResult?.output || agentResult?.response;
    if (!text) return;
    if (onApplyPrompt) {
      onApplyPrompt(text);
      setApplied(true);
      setTimeout(() => setApplied(false), 2500);
    }
  };

  const ActiveIcon = ICON_MAP[activeAgent.iconName] || Bot;

  return (
    <div className="flex flex-col lg:flex-row flex-1 h-full min-h-0 bg-bg-primary overflow-hidden">
      {/* ── Left Sidebar: Agent Directory & Selector ───────────────────────── */}
      <div className="w-full lg:w-[380px] xl:w-[420px] flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r border-border-default bg-bg-secondary/40 shrink-0">
        {/* Category Selector Tabs */}
        <div className="p-3 border-b border-border-default bg-bg-primary/70">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-text-muted mb-2 px-1 flex items-center justify-between">
            <span>PromptHub AI Agent Suite</span>
            <span className="text-[10px] bg-brand-primary-light text-brand-primary px-1.5 py-0.5 rounded font-bold">15 Agents</span>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-bg-secondary p-1 rounded-lg border border-border-default">
            {AGENT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  const firstInCat = Object.values(AGENTS_METADATA).find((a) => a.category === cat.id);
                  if (firstInCat) setSelectedAgentType(firstInCat.id);
                }}
                className={`py-1.5 px-2 rounded-md text-xs font-semibold tracking-tight transition-all cursor-pointer text-center min-h-[36px] flex items-center justify-center ${
                  activeCategory === cat.id
                    ? 'bg-brand-primary text-white shadow-2xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/60'
                }`}
              >
                {cat.id === 'CORE' ? 'Core (5)' : cat.id === 'CREATE' ? 'Create (5)' : 'Intel (5)'}
              </button>
            ))}
          </div>
        </div>

        {/* Agents Card List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {categoryAgents.map((agent) => {
            const isSelected = selectedAgentType === agent.id;
            const Icon = ICON_MAP[agent.iconName] || Bot;
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => handleSelectAgent(agent.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all duration-150 cursor-pointer relative group flex items-start gap-3 min-h-[44px] ${
                  isSelected
                    ? 'bg-bg-secondary border-brand-primary shadow-xs ring-1 ring-brand-primary/20'
                    : 'bg-bg-primary/80 border-border-default hover:bg-bg-secondary hover:border-border-hover'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 mt-0.5 transition-colors ${
                    isSelected
                      ? 'bg-brand-primary text-white'
                      : 'bg-brand-primary-light text-brand-primary group-hover:bg-brand-primary group-hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h4 className={`text-xs font-semibold truncate ${isSelected ? 'text-brand-primary font-bold' : 'text-text-primary'}`}>
                      {agent.name}
                    </h4>
                    {agent.badge && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold bg-bg-tertiary text-text-secondary border border-border-default shrink-0">
                        {agent.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
                    {agent.tagline}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer: Benchmark Dataset Info & Export */}
        <div className="p-3 border-t border-border-default bg-bg-primary/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Benchmark: {TOTAL_BENCHMARK_PROMPTS_COUNT} Prompts</span>
          </div>
          <button
            type="button"
            onClick={() => downloadFineTuningDataset('jsonl')}
            className="text-[11px] font-semibold text-brand-primary hover:underline flex items-center gap-1 cursor-pointer min-h-[36px] px-2"
            title={`Export complete ${TOTAL_BENCHMARK_PROMPTS_COUNT}-prompt fine-tuning dataset in JSONL format`}
          >
            <Download className="w-3 h-3" />
            <span>Export JSONL</span>
          </button>
        </div>
      </div>

      {/* ── Right Column: Interactive Agent Playground ──────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 bg-bg-primary overflow-hidden">
        {/* Active Agent Header */}
        <div className="p-4 border-b border-border-default bg-bg-secondary/30 flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-brand-primary text-white shadow-2xs shrink-0">
              <ActiveIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-text-primary">{activeAgent.name}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold bg-brand-primary/10 text-brand-primary dark:text-[#41A2D9] border border-brand-primary/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary dark:bg-[#41A2D9]" />
                  Studio Agent
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5 truncate">{activeAgent.description}</p>
            </div>
          </div>

          {/* Direct Fine-Tuning Benchmark Export */}
          <button
            type="button"
            onClick={() => downloadFineTuningDataset('jsonl')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-default bg-bg-primary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-semibold transition-all cursor-pointer shadow-2xs min-h-[44px] shrink-0"
            title={`Export complete ${TOTAL_BENCHMARK_PROMPTS_COUNT}-prompt fine-tuning benchmark dataset in JSONL format`}
          >
            <Download className="w-3.5 h-3.5 text-brand-primary" />
            <span>Export Benchmark ({TOTAL_BENCHMARK_PROMPTS_COUNT})</span>
          </button>
        </div>

        {/* Playground Scroll Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          {/* Sample Prompts Chips */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-text-muted uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-brand-primary" />
              <span>Instant Sample Starters</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeAgent.samplePrompts.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplySample(sample.prompt)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-bg-secondary border border-border-default text-text-secondary hover:text-brand-primary hover:border-brand-primary/40 hover:bg-bg-secondary transition-all cursor-pointer flex items-center gap-1.5 min-h-[36px]"
                >
                  <span>{sample.title}</span>
                  <ArrowUpRight className="w-3 h-3 opacity-60" />
                </button>
              ))}
            </div>
          </div>

          {/* User Input Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-mono font-semibold text-text-secondary flex items-center gap-1.5">
                <span>Input Prompt Payload</span>
              </label>
              <div className="flex items-center gap-2">
                <PromptCameraMicControls
                  variant="compact"
                  disabled={isExecuting}
                  onImageAttached={(url) => {
                    setInputMessage(prev => prev.trim() ? `${prev.trim()}\n\n![Image Context](${url})\n` : `![Image Context](${url})\n`);
                  }}
                  onTranscriptReady={(text) => {
                    setInputMessage(prev => prev.trim() ? `${prev.trim()} ${text}` : text);
                  }}
                />
                {inputMessage && (
                  <button
                    type="button"
                    onClick={() => setInputMessage('')}
                    className="text-[11px] text-text-muted hover:text-rose-600 cursor-pointer font-mono"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="relative">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onDragOver={handleAgentDragOver}
                onDragLeave={handleAgentDragLeave}
                onDrop={handleAgentDrop}
                onPaste={handleAgentPaste}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleRunAgent();
                  }
                }}
                rows={5}
                placeholder={activeAgent.placeholder}
                className="w-full text-xs font-mono p-3.5 rounded-xl bg-bg-secondary border border-border-default text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 resize-y leading-relaxed"
              />

              {isDraggingAgentPhoto && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-brand-primary/10 border-2 border-dashed border-brand-primary rounded-xl backdrop-blur-[1px] pointer-events-none text-xs font-semibold text-brand-primary gap-1">
                  <Camera className="w-6 h-6 animate-pulse text-brand-primary" />
                  <span>Drop photo here to attach to agent payload</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] text-text-muted font-mono">
              <span>Press <kbd className="px-1 py-0.5 rounded bg-bg-tertiary border border-border-default text-[10px]">Ctrl+Enter</kbd> to run</span>
              <span>{inputMessage.length} characters</span>
            </div>
          </div>

          {/* Execution Button Bar */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRunAgent}
              disabled={isExecuting || !inputMessage.trim()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hi transition-all shadow-sm disabled:opacity-50 cursor-pointer min-h-[44px]"
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Agent Executing...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Run {activeAgent.name}</span>
                </>
              )}
            </button>

            {isExecuting && (
              <button
                type="button"
                onClick={handleCancelExecution}
                className="px-4 py-2.5 rounded-xl bg-bg-secondary border border-border-default text-xs font-semibold text-text-secondary hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Error State Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-fadeIn">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-rose-900">Execution Error</p>
                <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Agent Output Stream Container */}
          {agentResult && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-text-primary">Agent Response</span>
                  <span className="text-[10px] font-mono text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded border border-border-default">
                    {agentResult.provider}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {onApplyPrompt && (
                    <button
                      type="button"
                      onClick={handleInsertIntoEditor}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[36px] ${
                        applied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-brand-primary text-white hover:bg-brand-primary-hi shadow-2xs'
                      }`}
                      title="Load this output into the main Workspace IDE editor"
                    >
                      {applied ? <Check className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                      <span>{applied ? 'Inserted!' : 'Insert into Editor'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCopyOutput}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-bg-secondary border border-border-default text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer min-h-[36px]"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Output Content */}
              <div className="p-4 rounded-xl bg-bg-secondary/60 border border-border-default font-mono text-xs text-text-primary whitespace-pre-wrap leading-relaxed overflow-x-auto selection:bg-brand-primary-light">
                {agentResult.response}
              </div>

              {/* Verified Attribution & Metrics Footer */}
              {(() => {
                const latencyMs = agentResult.durationMs || 0;
                // Token counts are shown only when the provider measured them.
                const tokensCount =
                  agentResult.usageMeasured === true
                    ? agentResult.usage?.totalTokens || (agentResult.usage as any)?.total_tokens || 0
                    : 0;
                return (
                  <div className="flex items-center justify-between flex-wrap gap-3 p-3 rounded-lg bg-bg-secondary border border-border-default text-[11px] font-mono text-text-muted">
                    <div className="flex items-center gap-4">
                      {latencyMs > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-text-muted" />
                          {(latencyMs / 1000).toFixed(2)}s
                        </span>
                      )}
                      {tokensCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-brand-primary" />
                          {tokensCount} tokens
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {agentResult.requestId && (
                        <span className="text-text-muted text-[10px]">ID: {agentResult.requestId.slice(0, 8)}...</span>
                      )}
                      {typeof agentResult.creditCost === 'number' ? (
                        <span className="text-brand-primary dark:text-[#41A2D9] font-bold bg-brand-primary/10 px-1.5 py-0.5 rounded border border-brand-primary/20">
                          {agentResult.creditCost} {agentResult.creditCost === 1 ? 'credit' : 'credits'}
                        </span>
                      ) : (
                        <span
                          className="text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded border border-border-default"
                          title="The gateway did not confirm a settled charge for this run. Check your wallet history for the authoritative amount."
                        >
                          cost pending
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
