import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  FileCode, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';
import type { WorkMessage, WorkTask, WorkVisualDirection } from '../../types/work';
import { workToolRegistry } from '../../services/work/workToolRegistry';
import { trackWorkTaskStarted } from '../../lib/mixpanelEvents';
import { WorkVisualDirectionCard } from './WorkVisualDirectionCard';
import { workImageCapService, MAX_IMAGE_GENERATION_CAP } from '../../services/work/workImageCapService';

interface WorkAgentChatProps {
  messages: WorkMessage[];
  isExecuting: boolean;
  activeTask?: WorkTask | null;
  onSendMessage: (content: string, options?: { model?: string }) => Promise<void>;
  onOpenFile: (path: string) => void;
  onOpenArtifact?: (id: string) => void;
  onOpenDiffs?: () => void;
  executionMode?: 'single_agent' | 'orchestrated_team';
  onToggleExecutionMode?: (mode: 'single_agent' | 'orchestrated_team') => void;
  agentCount?: number;
  onAcceptVisualDirection?: (direction: WorkVisualDirection) => void;
  onRejectVisualDirection?: (feedback: string, previousDirections: WorkVisualDirection[]) => void;
  accountId?: string;
}

const QUICK_PROMPTS = [
  {
    title: '🎨 Propose 2-3 visual directions',
    prompt: 'propose 2-3 visual directions for a modern portfolio',
  },
  {
    title: '💼 Build developer portfolio',
    prompt: 'i want a portfolio',
  },
  {
    title: '🚀 Build SaaS landing page',
    prompt: 'build a modern AI SaaS landing page with dark mode, bento grid, and interactive hero',
  },
  {
    title: '🖼️ Make a tiger image',
    prompt: 'make a tiger image',
  },
  {
    title: '☁️ Sync with Google Drive',
    prompt: 'synchronize all workspace files and assets to Google Drive vault',
  },
];

const renderChatMessage = (content: string) => {
  const imageRegex = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
  const match = imageRegex.exec(content);
  if (match) {
    const alt = match[1] || 'Generated image';
    const src = match[2];
    const textBefore = content.substring(0, match.index);
    const textAfter = content.substring(match.index + match[0].length);
    return (
      <div className="space-y-2">
        {textBefore.trim() && <p className="whitespace-pre-wrap">{textBefore.trim()}</p>}
        <div className="rounded-lg overflow-hidden border border-border-default bg-black/10 my-2">
          <img src={src} alt={alt} className="w-full max-h-72 object-cover rounded-lg" loading="lazy" />
          <div className="p-1.5 text-[10px] text-text-muted font-mono flex items-center justify-between">
            <span className="truncate max-w-[220px]">{alt}</span>
            <a href={src} target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline font-semibold shrink-0">View Full</a>
          </div>
        </div>
        {textAfter.trim() && <p className="whitespace-pre-wrap">{textAfter.trim()}</p>}
      </div>
    );
  }
  return <div className="whitespace-pre-wrap">{content}</div>;
};

export const WorkAgentChat: React.FC<WorkAgentChatProps> = ({
  messages,
  isExecuting,
  activeTask: _activeTask,
  onSendMessage,
  onOpenFile,
  onOpenArtifact: _onOpenArtifact,
  onOpenDiffs: _onOpenDiffs,
  executionMode = 'single_agent',
  onToggleExecutionMode,
  agentCount = 4,
  onAcceptVisualDirection,
  onRejectVisualDirection,
  accountId,
}) => {
  const [inputText, setInputText] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedNotice, setOptimizedNotice] = useState<string | null>(null);
  const [quotaState, setQuotaState] = useState(() => ({
    remaining: workImageCapService.getRemainingImagesCount(accountId),
    totalGenerated: workImageCapService.getImagesGeneratedCount(accountId),
    maxCap: MAX_IMAGE_GENERATION_CAP,
  }));
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Live account quota sync
  useEffect(() => {
    setQuotaState({
      remaining: workImageCapService.getRemainingImagesCount(accountId),
      totalGenerated: workImageCapService.getImagesGeneratedCount(accountId),
      maxCap: MAX_IMAGE_GENERATION_CAP,
    });
    return workImageCapService.subscribe((detail) => {
      setQuotaState({
        remaining: detail.remaining,
        totalGenerated: detail.totalGenerated,
        maxCap: detail.maxCap,
      });
    });
  }, [accountId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isExecuting]);

  // Listen for incoming cross-workspace tasks (from GuidedTaskComposer, Studio, or Analyzer)
  useEffect(() => {
    try {
      const pendingRaw = sessionStorage.getItem('ph_work_pending_task');
      if (pendingRaw) {
        sessionStorage.removeItem('ph_work_pending_task');
        const parsed = JSON.parse(pendingRaw);
        if (parsed?.prompt) {
          setInputText(parsed.prompt);
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }
      }
    } catch {}

    const handleIncomingTask = (e: Event) => {
      const customEvent = e as CustomEvent<{ prompt?: string; title?: string }>;
      if (customEvent.detail?.prompt) {
        setInputText(customEvent.detail.prompt);
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }
    };

    window.addEventListener('ph_work_incoming_task', handleIncomingTask);
    return () => {
      window.removeEventListener('ph_work_incoming_task', handleIncomingTask);
    };
  }, []);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isExecuting) return;

    const text = inputText.trim();
    setInputText('');
    setOptimizedNotice(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      trackWorkTaskStarted({
        model: 'openrouter/free',
        promptLength: text.length,
        taskType: 'developer_chat',
      });
    } catch {}

    await onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    const isEnter = e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13;
    if (isEnter && ((e.ctrlKey || e.metaKey) || !e.shiftKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  // Global Ctrl+Enter dispatcher listener for Work surface
  useEffect(() => {
    const handleGlobalCtrlEnter = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.activeTab && detail.activeTab !== 'work') return;
      if (!inputText.trim() || isExecuting) return;
      handleSend();
    };

    window.addEventListener('ph_global_ctrl_enter', handleGlobalCtrlEnter);
    return () => {
      window.removeEventListener('ph_global_ctrl_enter', handleGlobalCtrlEnter);
    };
  }, [inputText, isExecuting]);

  const handleOptimizePrompt = async () => {
    if (!inputText.trim()) return;
    setIsOptimizing(true);
    setOptimizedNotice(null);
    try {
      const tool = workToolRegistry.getTool('optimize_task_prompt');
      if (tool) {
        const dummyCtx: any = {
          taskId: 't_opt',
          projectId: 'p_opt',
          worktreeId: 'wt_opt',
          agentId: 'ag_opt',
          permissions: 'developer',
          filesStore: new Map(),
        };
        const res = await tool.execute({
          rawTaskPrompt: inputText.trim(),
          domain: 'software_engineering',
        }, dummyCtx);

        if (res?.optimizedPrompt) {
          setInputText(res.optimizedPrompt);
          setOptimizedNotice('Refined with automated acceptance criteria.');
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary border-r border-border-default overflow-hidden">
      {/* Agent Chat Header: Anchors left pane and aligns with Inspector Tab Bar */}
      <div className="h-10 px-3 sm:px-4 bg-bg-secondary border-b border-border-default flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              isExecuting ? 'bg-brand-primary animate-ping' : 'bg-emerald-500'
            }`} />
            <span className="font-semibold text-text-primary truncate">Atlas Engineer</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary border border-border-subtle shrink-0">
            {isExecuting ? 'Working...' : `${agentCount} online`}
          </span>
          <span 
            title={`Account Image Cap: ${quotaState.totalGenerated}/${MAX_IMAGE_GENERATION_CAP} used (${quotaState.remaining} remaining)`}
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
              quotaState.remaining <= 0
                ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 font-semibold'
                : quotaState.remaining <= 2
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                : 'bg-bg-tertiary text-text-muted border border-border-subtle'
            }`}
          >
            Cap: {quotaState.totalGenerated}/8
          </span>
        </div>

        {/* Mode Selector */}
        {onToggleExecutionMode && (
          <div className="flex items-center bg-bg-tertiary border border-border-subtle rounded-md p-0.5 text-[11px] font-mono shrink-0">
            <button
              type="button"
              onClick={() => onToggleExecutionMode('single_agent')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                executionMode === 'single_agent'
                  ? 'bg-bg-secondary text-brand-primary font-semibold shadow-2xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Single
            </button>
            <button
              type="button"
              onClick={() => onToggleExecutionMode('orchestrated_team')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                executionMode === 'orchestrated_team'
                  ? 'bg-bg-secondary text-brand-primary font-semibold shadow-2xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Team
            </button>
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 font-sans text-xs overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {messages.length === 0 ? (
          <div className="py-8 sm:py-12 max-w-md mx-auto text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-primary-light/60 border border-brand-primary/20 flex items-center justify-center text-brand-primary mx-auto shadow-2xs">
              <Bot className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-semibold text-text-primary tracking-tight">
                PromptHub Work Assistant
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                Autonomous agent development environment. Ask me to create pages, write code, run terminal commands, verify builds, and produce deliverables.
              </p>
            </div>

            {/* Quick action chips */}
            <div className="pt-2 flex flex-col gap-2 text-left">
              <span className="text-[11px] font-mono text-text-muted font-medium">Quick suggestions:</span>
              {QUICK_PROMPTS.map((qp, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInputText(qp.prompt)}
                  className="p-2.5 rounded-lg border border-border-default bg-bg-primary hover:border-brand-primary/50 hover:bg-bg-tertiary/60 transition-all text-left flex items-start gap-2.5 cursor-pointer group"
                >
                  <Sparkles className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-semibold text-text-primary group-hover:text-brand-primary transition-colors text-xs">
                      {qp.title}
                    </div>
                    <div className="text-[11px] text-text-muted truncate mt-0.5">
                      {qp.prompt}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isSystem = msg.role === 'system';

            if (isSystem) {
              return (
                <div 
                  key={msg.id}
                  className="py-1.5 px-3 rounded-lg bg-bg-tertiary/60 border border-border-subtle/80 text-[11px] font-mono text-text-muted text-center"
                >
                  {msg.content}
                </div>
              );
            }

            return (
              <div 
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-brand-primary-light flex items-center justify-center text-brand-primary shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div 
                  className={`max-w-[85%] rounded-xl p-3.5 space-y-2 leading-relaxed ${
                    isUser
                      ? 'bg-brand-primary text-white shadow-2xs font-medium'
                      : 'bg-bg-primary border border-border-default text-text-primary shadow-2xs'
                  }`}
                >
                  {/* Sender Name */}
                  <div className={`flex items-center justify-between gap-3 text-[10px] font-mono ${
                    isUser ? 'text-white/80' : 'text-text-muted'
                  }`}>
                    <span className="font-semibold">{isUser ? 'You' : msg.senderName}</span>
                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {/* Message Content */}
                  <div className={`text-xs ${isUser ? 'text-white' : 'text-text-primary'}`}>
                    {renderChatMessage(msg.content)}
                  </div>

                  {/* Visual Direction Candidates Selection & Refinement */}
                  {msg.visualDirections && msg.visualDirections.length > 0 && onAcceptVisualDirection && onRejectVisualDirection && (
                    <WorkVisualDirectionCard
                      directions={msg.visualDirections}
                      selectedDirectionId={msg.selectedDirectionId}
                      isExecuting={isExecuting}
                      onAcceptDirection={onAcceptVisualDirection}
                      onRejectAndChange={onRejectVisualDirection}
                      accountId={accountId}
                    />
                  )}

                  {/* Tool Calls if present */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="pt-2 border-t border-border-subtle/60 space-y-1.5">
                      {msg.toolCalls.map((tc) => (
                        <div 
                          key={tc.id}
                          className="p-2 rounded bg-bg-secondary border border-border-subtle text-[11px] font-mono"
                        >
                          <div className="flex items-center gap-1.5 text-brand-primary font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Action: {tc.name.replace(/_/g, ' ')}</span>
                          </div>
                          {tc.parameters?.path && (
                            <button
                              type="button"
                              onClick={() => onOpenFile(tc.parameters.path)}
                              className="mt-1 min-h-[44px] sm:min-h-0 text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
                            >
                              <FileCode className="w-3 h-3" />
                              <span>{tc.parameters.path}</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-bg-tertiary border border-border-subtle flex items-center justify-center text-text-secondary shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Live execution indicator */}
        {isExecuting && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-brand-primary-light/40 border border-brand-primary/20 text-xs text-brand-primary animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span className="font-medium">Agent is thinking, executing tools, and verifying sandbox output...</span>
          </div>
        )}
      </div>

      {/* Input Composer Box */}
      <div className="p-3 sm:p-4 border-t border-border-default bg-bg-secondary shrink-0">
        <form onSubmit={handleSend} className="space-y-2">
          {optimizedNotice && (
            <div className="flex items-center gap-1.5 text-[11px] text-brand-primary bg-brand-primary-light/50 px-2.5 py-1 rounded-md">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span>{optimizedNotice}</span>
            </div>
          )}

          <div className="relative rounded-xl border border-border-default bg-bg-primary focus-within:border-brand-primary focus-within:ring-1 focus-within:ring-brand-primary transition-all">
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Give the agent a task (e.g. Build responsive hello-world page with build test)..."
              disabled={isExecuting}
              className="w-full p-3 bg-transparent text-xs text-text-primary placeholder:text-text-muted focus:outline-none resize-none leading-relaxed"
            />

            <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-border-subtle/40">
              <button
                type="button"
                onClick={handleOptimizePrompt}
                disabled={isOptimizing || !inputText.trim() || isExecuting}
                className="text-[11px] font-medium text-brand-primary hover:text-brand-primary-hi flex items-center gap-1 transition-colors disabled:opacity-40 cursor-pointer min-h-[44px] sm:min-h-[32px] px-2 rounded-md hover:bg-brand-primary-light/40"
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Optimizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>Optimize Prompt</span>
                  </>
                )}
              </button>

              <button
                type="submit"
                disabled={!inputText.trim() || isExecuting}
                className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] px-3 rounded-lg bg-brand-primary text-white hover:bg-brand-primary-hi flex items-center justify-center gap-1.5 text-xs font-semibold shadow-xs disabled:opacity-40 transition-all cursor-pointer"
              >
                {isExecuting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Send</span>
                    <Send className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-text-muted font-mono px-1 gap-2">
            <span className="truncate">Press Enter to send &bull; Shift+Enter for newline</span>
            <span className="shrink-0 hidden lg:inline">Autonomous Virtual Worktree</span>
          </div>
        </form>
      </div>
    </div>
  );
};
