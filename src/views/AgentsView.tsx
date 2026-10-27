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
  Image as ImageIcon, 
  Film, 
  PenTool, 
  TrendingUp, 
  Cpu, 
  FlaskConical, 
  Languages, 
  ShieldAlert, 
  GraduationCap,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  ChevronDown,
  FileText,
  Camera,
  Zap
} from 'lucide-react';
import { PromptCameraMicControls } from '../components/common/PromptCameraMicControls';
import { uploadPromptImage } from '../utils/promptMediaAttachment';
import { useApp } from '../context/AppContext';
import { AIUpgradeModal } from '../components/AIUpgradeModal';
import { 
  AGENTS_METADATA, 
  AGENT_CATEGORIES, 
  type AgentType, 
  type AgentCategory,
  type AgentDisplayMetadata
} from '../config/agentMetadata';
import { aiGateway } from '../services/ai/aiGateway';
import { ModelSelectorModal } from '../components/ModelSelectorModal';
import { formatModelShortName, isFreeModel, isRetiredOrUnavailableFreeModel } from '../utils/modelFormatting';
import { smartModelResolver } from '../services/ai/smartModelResolver';
import { multiProviderService } from '../services/ai/multiProviderService';

// Icon Map
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain: Bot,
  Sparkles,
  Search,
  Gauge,
  Wrench,
  Code,
  Image: ImageIcon,
  Film,
  PenTool,
  TrendingUp,
  Cpu,
  FlaskConical,
  Languages,
  ShieldAlert,
  GraduationCap,
};

export interface AgentExecutionResult {
  output: string;
  creditCost?: number | null;
  durationMs?: number;
  model?: string;
  provider?: string;
  requestId?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  usageMeasured?: boolean;
}

interface AgentsErrorBoundaryProps {
  children: React.ReactNode;
}

interface AgentsErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AgentsErrorBoundary extends React.Component<AgentsErrorBoundaryProps, AgentsErrorBoundaryState> {
  constructor(props: AgentsErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AgentsErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[AgentsErrorBoundary caught exception]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-bg-primary text-text-primary min-h-[400px]">
          <div className="max-w-md w-full p-6 rounded-2xl bg-bg-secondary border border-rose-200 dark:border-rose-900/50 shadow-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">AI Agent Studio Encountered an Issue</h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                An unexpected interface state occurred. Resetting the studio workspace will restore normal operation.
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hi transition-colors shadow-xs cursor-pointer min-h-[44px]"
            >
              Reset Agent Studio
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const AgentsViewContent: React.FC = () => {
  const { user, setActiveTab, setArenaPromptDraft, showToast, setShowAuthModal } = useApp();

  const [activeCategory, setActiveCategory] = useState<AgentCategory | 'ALL'>('ALL');
  const [selectedAgentType, setSelectedAgentType] = useState<AgentType>('code_prompt_engineer');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [agentResult, setAgentResult] = useState<AgentExecutionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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

  // Model Selection
  const [model, setModel] = useState<string>(() => {
    const lastSelected = smartModelResolver.getLastSelectedModel();
    if (lastSelected && !isRetiredOrUnavailableFreeModel(lastSelected)) return lastSelected;
    const smart = smartModelResolver.resolveSmartDefaultModel('ide');
    return smart.status === 'resolved' ? smart.model.modelId : 'openrouter/free';
  });
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const activeAgent: AgentDisplayMetadata = 
    (selectedAgentType && AGENTS_METADATA[selectedAgentType]) ||
    AGENTS_METADATA.code_prompt_engineer ||
    Object.values(AGENTS_METADATA)[0] || {
      id: 'code_prompt_engineer' as AgentType,
      name: 'Code Prompt Engineer',
      category: 'CREATE' as AgentCategory,
      tagline: 'Precision system instructions for software engineering',
      description: 'Crafts battle-tested system directives, edge-case constraints, and schema validations for coding LLMs.',
      iconName: 'Code',
      placeholder: 'Describe the programming task, API, or algorithm...',
      samplePrompts: [],
    };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Filter agents based on category & search query safely
  const filteredAgents = Object.values(AGENTS_METADATA).filter((agent) => {
    if (!agent) return false;
    const matchesCategory = activeCategory === 'ALL' || agent.category === activeCategory;
    const q = (searchQuery || '').trim().toLowerCase();
    const nameMatch = (agent.name || '').toLowerCase().includes(q);
    const tagMatch = (agent.tagline || '').toLowerCase().includes(q);
    const descMatch = (agent.description || '').toLowerCase().includes(q);
    return matchesCategory && (!q || nameMatch || tagMatch || descMatch);
  });

  const handleSelectAgent = (type: AgentType) => {
    setSelectedAgentType(type);
    setErrorMessage(null);
  };

  const handleApplySample = (sampleText: string) => {
    setInputMessage(sampleText);
    setErrorMessage(null);
  };

  const handleRunAgent = async () => {
    if (!inputMessage.trim() || isExecuting) return;

    // Pre-flight check: If model is not free, user must either be logged in or have BYOK unlocked
    if (!isFreeModel(model) && !user) {
      const isByokUnlocked = multiProviderService.isModelUnlockedByBYOK(model).unlocked;
      if (!isByokUnlocked) {
        setShowAuthModal(true);
        showToast('Please sign in or connect your API key to run premium models.', 'info');
        return;
      }
    }

    setIsExecuting(true);
    setErrorMessage(null);
    setAgentResult(null);
    setCopied(false);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await aiGateway.executeAgent({
        agentType: selectedAgentType,
        message: inputMessage,
        modelId: model,
        signal: controller.signal,
      });

      setAgentResult(res);
      showToast(`✨ ${activeAgent.name || 'Agent'} generated response successfully!`, 'success');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const isAuthError = 
          err?.status === 401 ||
          err?.code === 'UNAUTHENTICATED' ||
          err?.code === 'AUTH_REQUIRED' ||
          err?.message?.includes('401') ||
          err?.message?.includes('Please sign in') ||
          err?.message?.includes('Authentication required') ||
          err?.message?.includes('Unauthorized');

        if (isAuthError && !user) {
          setShowAuthModal(true);
          setErrorMessage('Authentication required: please sign in to use this AI model.');
        } else {
          setErrorMessage(err.message || 'An unexpected error occurred while executing the AI agent.');
        }
      }
    } finally {
      setIsExecuting(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsExecuting(false);
  };

  const safeOutput = typeof agentResult?.output === 'string'
    ? agentResult.output
    : agentResult?.output != null
    ? JSON.stringify(agentResult.output, null, 2)
    : '';

  const handleCopy = () => {
    if (!safeOutput) return;
    navigator.clipboard.writeText(safeOutput);
    setCopied(true);
    showToast('Copied output to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInIDE = () => {
    if (!safeOutput) return;
    if (setArenaPromptDraft) {
      setArenaPromptDraft(safeOutput);
    }
    setActiveTab('workspace');
    showToast('Opened agent prompt in Workspace IDE!', 'success');
  };

  const ActiveIcon = ICON_MAP[activeAgent?.iconName] || Bot;
  const isFree = isFreeModel(model);
  const samplePrompts = Array.isArray(activeAgent?.samplePrompts) ? activeAgent.samplePrompts : [];

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-bg-primary overflow-hidden">
      {/* ── Editorial Header (Image 1: RUNTIME / AGENT CONFIGURATION) ───────── */}
      <div className="px-4 sm:px-6 py-4 bg-bg-primary border-b border-border-default shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-[11px] font-mono font-semibold tracking-[0.14em] text-[#7A7E75] dark:text-[#9AA0A6] uppercase">
              RUNTIME / AGENT CONFIGURATION
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-primary tracking-tight">
              Give the agent a boundary.
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary max-w-2xl">
              Configure system directives, tool execution permissions, and model parameters before running agent tests.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EBF5ED] dark:bg-[#1A3326] text-[11px] font-mono font-semibold text-[#2D6A4F] dark:text-[#86A696] border border-[#D0E6D5] dark:border-[#224A38]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span>Local workspace ready</span>
            </div>

            <button
              type="button"
              onClick={() => setIsModelModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-default bg-bg-secondary hover:border-border-hover transition-all cursor-pointer shadow-3xs min-h-[38px]"
              title="Change active execution model"
            >
              <div className={`w-2 h-2 rounded-full ${isFree ? 'bg-emerald-500' : 'bg-brand-primary'}`} />
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-text-primary">
                  {formatModelShortName(model, 20)}
                </span>
                <span className="text-[10px] text-text-muted font-mono">
                  {isFree ? 'Free Tier' : 'Premium / BYOK'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Studio Layout ─────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
        {/* ── Left Directory Panel ─────────────────────────────────────────── */}
        <div className="w-full lg:w-[360px] xl:w-[400px] flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r border-border-default bg-bg-secondary/40 shrink-0">
          {/* Search & Category Filter */}
          <div className="p-3 border-b border-border-default bg-bg-primary/80 space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 15 AI agents..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border-default bg-bg-secondary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
              <button
                type="button"
                onClick={() => setActiveCategory('ALL')}
                className={`min-h-[44px] sm:min-h-[28px] inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
                  activeCategory === 'ALL'
                    ? 'bg-brand-primary text-white font-semibold'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                }`}
              >
                All (15)
              </button>
              {AGENT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`min-h-[44px] sm:min-h-[28px] inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
                    activeCategory === cat.id
                      ? 'bg-brand-primary text-white font-semibold'
                      : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                  }`}
                >
                  {cat.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Agents List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {filteredAgents.map((agent) => {
              const isSelected = selectedAgentType === agent.id;
              const Icon = ICON_MAP[agent.iconName] || Bot;
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => handleSelectAgent(agent.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-brand-primary-light/60 border-brand-primary text-text-primary ring-1 ring-brand-primary/20 shadow-xs'
                      : 'bg-bg-primary border-border-default text-text-secondary hover:border-border-hover hover:bg-bg-tertiary/40'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    isSelected
                      ? 'bg-brand-primary text-white'
                      : 'bg-bg-secondary text-text-muted'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5 mb-0.5">
                      <span className="text-xs font-bold text-text-primary truncate">
                        {agent.name}
                      </span>
                      {agent.badge && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase bg-brand-primary/10 text-brand-primary shrink-0">
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
        </div>

        {/* ── Main Execution & Workspace Pane ─────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 bg-bg-primary overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-5">
          {/* Active Agent Banner */}
          <div className="p-4 sm:p-5 rounded-xl bg-bg-secondary border border-border-default space-y-3 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3.5">
                <div className="p-3 rounded-lg bg-brand-primary text-white shadow-xs">
                  <ActiveIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-text-primary font-display">
                      {activeAgent?.name || 'AI Agent'}
                    </h2>
                    {activeAgent?.badge && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-brand-primary-light text-brand-primary uppercase">
                        {activeAgent.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-1 max-w-2xl leading-relaxed">
                    {activeAgent?.description || ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Sample Starters */}
            {samplePrompts.length > 0 && (
              <div className="pt-2 border-t border-border-default/60">
                <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-brand-primary" />
                  <span>Instant Sample Starters</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {samplePrompts.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplySample(sample.prompt)}
                      className="px-2.5 py-1 rounded-lg border border-border-default bg-bg-primary hover:border-brand-primary/50 hover:bg-brand-primary-light/30 text-xs text-text-secondary hover:text-text-primary transition-all cursor-pointer flex items-center gap-1.5 group"
                    >
                      <span>{sample.title}</span>
                      <ArrowRight className="w-3 h-3 text-text-muted group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input Prompt Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs flex-wrap gap-2">
              <label className="font-semibold text-text-primary flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-text-muted" />
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
                <div className="flex items-center gap-3 text-[11px] text-text-muted font-mono">
                  <span>{inputMessage.length} chars</span>
                  {inputMessage && (
                    <button
                      type="button"
                      onClick={() => setInputMessage('')}
                      className="hover:text-rose-600 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
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
                placeholder={activeAgent?.placeholder || 'Enter prompt payload...'}
                rows={5}
                className="w-full p-4 text-xs sm:text-sm rounded-xl border border-border-default bg-bg-secondary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary font-mono transition-all resize-y min-h-[120px]"
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    handleRunAgent();
                  }
                }}
              />

              {isDraggingAgentPhoto && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-brand-primary/10 border-2 border-dashed border-brand-primary rounded-xl backdrop-blur-[1px] pointer-events-none text-xs font-semibold text-brand-primary gap-1">
                  <Camera className="w-6 h-6 text-brand-primary" />
                  <span>Drop photo here to attach to agent payload</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-text-muted">
                Press <kbd className="px-1.5 py-0.5 rounded bg-bg-tertiary border border-border-default font-mono text-[10px]">Ctrl+Enter</kbd> to run
              </span>

              <div className="flex items-center gap-2">
                {isExecuting ? (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Cancel Run</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRunAgent}
                    disabled={!inputMessage.trim() || isExecuting}
                    className="min-h-[44px] sm:min-h-[38px] px-5 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run {activeAgent?.name || 'Agent'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Error Banner with Contextual CTAs */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div className="space-y-1">
                  <p className="font-bold">Execution Error</p>
                  <p className="text-rose-700 leading-relaxed">{errorMessage}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 sm:mt-0 shrink-0 self-start sm:self-center">
                {(errorMessage.toLowerCase().includes('sign in') ||
                  errorMessage.toLowerCase().includes('auth') ||
                  errorMessage.toLowerCase().includes('login') ||
                  errorMessage.toLowerCase().includes('unauthorized')) && (
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors cursor-pointer min-h-[44px] sm:min-h-[32px]"
                  >
                    Sign In
                  </button>
                )}
                {(errorMessage.toLowerCase().includes('credit') ||
                  errorMessage.toLowerCase().includes('afford') ||
                  errorMessage.toLowerCase().includes('quota') ||
                  errorMessage.toLowerCase().includes('insufficient')) && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('recharge')}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors cursor-pointer min-h-[44px] sm:min-h-[32px]"
                  >
                    Recharge Credits
                  </button>
                )}
                {(errorMessage.toLowerCase().includes('model') ||
                  errorMessage.toLowerCase().includes('unavailable') ||
                  errorMessage.toLowerCase().includes('not found')) && (
                  <button
                    type="button"
                    onClick={() => setIsModelModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg border border-rose-300 bg-white hover:bg-rose-50 text-rose-800 font-semibold text-xs transition-colors cursor-pointer min-h-[44px] sm:min-h-[32px]"
                  >
                    Switch Model
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Agent Executing / Generating State */}
          {isExecuting && (
            <div className="p-6 rounded-xl bg-bg-secondary border border-border-default space-y-4 shadow-xs text-center flex flex-col items-center justify-center animate-in fade-in duration-200">
              <div className="w-8 h-8 rounded-full border-2 border-brand-primary/20 border-t-brand-primary animate-spin" />
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-text-primary">
                  {activeAgent?.name || 'Agent'} is generating response...
                </h3>
                <p className="text-[11px] text-text-muted font-mono">
                  Executing directives on {formatModelShortName(model)}
                </p>
              </div>

              {/* Fast Output Upgrade Banner */}
              <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-lg w-full text-left shadow-2xs">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 min-w-0">
                  <Zap className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
                  <span className="text-xs">
                    Generating output... <strong>For fast output, please upgrade your plan.</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hi transition-all cursor-pointer min-h-[44px] sm:min-h-[30px] shrink-0"
                  style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Upgrade Plan</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1 text-[11px] font-mono text-text-muted hover:text-text-primary rounded border border-border-default bg-bg-tertiary cursor-pointer min-h-[44px] sm:min-h-[28px]"
              >
                Cancel Execution
              </button>
            </div>
          )}

          {/* Agent Output Panel */}
          {agentResult && (
            <div className="p-5 rounded-xl bg-bg-secondary border border-border-default space-y-4 shadow-xs animate-in fade-in duration-300">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-border-default">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-text-primary">
                      Generated Prompt Output
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-text-muted font-mono mt-0.5">
                      <span>Model: {agentResult.model || model}</span>
                      {typeof agentResult.durationMs === 'number' && Number.isFinite(agentResult.durationMs) && (
                        <span>• {(agentResult.durationMs / 1000).toFixed(2)}s</span>
                      )}
                      {typeof agentResult.usage?.totalTokens === 'number' && Number.isFinite(agentResult.usage.totalTokens) && (
                        <span>• {agentResult.usage.totalTokens} tokens</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-lg border border-border-default bg-bg-primary hover:bg-bg-tertiary text-xs font-semibold text-text-secondary hover:text-text-primary transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Output'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenInIDE}
                    className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-lg bg-brand-primary text-white hover:bg-brand-primary-hi text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Open in Prompt IDE</span>
                  </button>
                </div>
              </div>

              {/* Output Content */}
              <div className="p-4 rounded-xl bg-bg-primary border border-border-default/80">
                <pre className="text-xs sm:text-sm font-mono text-text-primary whitespace-pre-wrap leading-relaxed select-text overflow-x-auto">
                  {safeOutput}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Model Selector Modal */}
      <ModelSelectorModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        selectedModelId={model}
        onSelectModel={(newModelId) => {
          setModel(newModelId);
          smartModelResolver.setLastSelectedModel(newModelId);
          setIsModelModalOpen(false);
          showToast(`Switched active model to ${newModelId}`, 'info');
        }}
      />

      {/* AI Upgrade Modal */}
      <AIUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        mode={user ? 'credits' : 'guest'}
      />
    </div>
  );
};

export const AgentsView: React.FC = () => {
  return (
    <AgentsErrorBoundary>
      <AgentsViewContent />
    </AgentsErrorBoundary>
  );
};

export default AgentsView;
