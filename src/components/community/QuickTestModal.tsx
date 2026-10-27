import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Square, Sparkles, Copy, Check, ExternalLink, Cpu, Variable, RefreshCw } from 'lucide-react';
import type { Prompt } from '../../db/schema';
import { extractVariables, renderPromptTemplate } from '../../services/ai/variableEngine';
import { aiGateway } from '../../services/ai/aiGateway';
import { smartModelResolver } from '../../services/ai/smartModelResolver';
import { useApp } from '../../context/AppContext';
import { PromptCameraMicControls } from '../common/PromptCameraMicControls';
import { PromptRepository } from '../../repositories/promptRepository';
import { CURATED_ADMIN_PROMPTS } from '../../data/curatedAdminPrompts';

export interface QuickTestModalProps {
  isOpen: boolean;
  prompt: Prompt | null;
  onClose: () => void;
  onOpenInWorkspace: (prompt: Prompt) => void;
}

export const QuickTestModal: React.FC<QuickTestModalProps> = ({
  isOpen,
  prompt,
  onClose,
  onOpenInWorkspace,
}) => {
  const { showToast } = useApp();
  const [selectedModel, setSelectedModel] = useState<string>('openrouter/free');
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [output, setOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [latencyMs, setLatencyMs] = useState(0);
  const [tokens, setTokens] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [resolvedPrompt, setResolvedPrompt] = useState<Prompt | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(false);

  // Synchronize and resolve full prompt content whenever prompt prop changes
  useEffect(() => {
    if (!prompt) {
      setResolvedPrompt(null);
      setIsLoadingContent(false);
      return;
    }

    let isCancelled = false;

    // Fast Path 1: Prompt object already contains rawContent
    if (prompt.rawContent && prompt.rawContent.trim().length > 0) {
      setResolvedPrompt(prompt);
      setIsLoadingContent(false);
      return;
    }

    // Fast Path 2: Curated Admin Prompts dataset (instant, 0 latency)
    const curatedMatch = CURATED_ADMIN_PROMPTS.find(p => p.id === prompt.id);
    if (curatedMatch && curatedMatch.rawContent && curatedMatch.rawContent.trim().length > 0) {
      setResolvedPrompt({ ...prompt, ...curatedMatch });
      setIsLoadingContent(false);
      return;
    }

    // Network Path: Fetch full prompt record from database / storage
    setIsLoadingContent(true);
    setResolvedPrompt(prompt); // Keep card details while full body fetches

    PromptRepository.getPromptById(prompt.id)
      .then((full) => {
        if (isCancelled) return;
        if (full && full.rawContent && full.rawContent.trim().length > 0) {
          setResolvedPrompt(full);
          setIsLoadingContent(false);
          return;
        }

        // Secondary fallback: authorized content endpoint
        return PromptRepository.getAuthorizedPromptContent(prompt.id).then((auth) => {
          if (isCancelled) return;
          if (auth?.content) {
            setResolvedPrompt({
              ...prompt,
              rawContent: auth.content,
              variables: auth.variables || prompt.variables || [],
            });
          }
          setIsLoadingContent(false);
        });
      })
      .catch((err) => {
        console.warn('[QuickTestModal] Failed to load prompt content:', err);
        if (!isCancelled) {
          setIsLoadingContent(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [prompt]);

  const activePrompt = resolvedPrompt || prompt;
  const rawContent = activePrompt?.rawContent || (activePrompt as any)?.content || '';

  // Extract variables whenever prompt template resolves or changes
  const { variables } = extractVariables(rawContent);

  useEffect(() => {
    if (activePrompt) {
      const lastSelected = smartModelResolver.getLastSelectedModel();
      if (lastSelected) {
        setSelectedModel(lastSelected);
      } else {
        const smart = smartModelResolver.resolveSmartDefaultModel('ide');
        setSelectedModel(smart.status === 'resolved' ? smart.model.modelId : 'openrouter/free');
      }
      
      const initialVars: Record<string, string> = {};
      if (Array.isArray(activePrompt.variables)) {
        activePrompt.variables.forEach(v => {
          if (v && v.name) {
            initialVars[v.name] = v.defaultValue || '';
          }
        });
      }
      // Also register any variables discovered in {{...}} template tags
      variables.forEach(v => {
        if (v && v.name && initialVars[v.name] === undefined) {
          initialVars[v.name] = v.defaultValue || '';
        }
      });

      setVariableValues((prev) => {
        const next: Record<string, string> = { ...initialVars };
        Object.keys(prev).forEach((k) => {
          if (prev[k] !== undefined && prev[k] !== '') {
            next[k] = prev[k];
          }
        });
        return next;
      });
      setOutput('');
      setLatencyMs(0);
      setTokens(null);
    }
  }, [activePrompt, variables]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleRun = async () => {
    if (isExecuting || !activePrompt) return;

    if (isLoadingContent) {
      showToast('Loading full prompt template, please wait a moment...', 'info');
      return;
    }

    let templateContent = activePrompt.rawContent || (activePrompt as any)?.content || '';

    // Safety net: check curatedAdminPrompts synchronously if template is still empty
    if (!templateContent.trim()) {
      const curatedMatch = CURATED_ADMIN_PROMPTS.find(p => p.id === activePrompt.id);
      if (curatedMatch && curatedMatch.rawContent) {
        templateContent = curatedMatch.rawContent;
      }
    }

    if (!templateContent.trim()) {
      showToast('Prompt template is empty or could not be loaded.', 'error');
      return;
    }

    const compiled = renderPromptTemplate(templateContent, variableValues);
    if (!compiled.trim()) {
      showToast('Compiled prompt text is empty.', 'error');
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);
    setIsExecuting(true);
    setOutput('');
    setLatencyMs(0);
    setTokens(null);

    const startTime = Date.now();

    try {
      const res = await aiGateway.executePrompt(compiled, {
        modelId: selectedModel,
        signal: controller.signal,
        stream: true,
        onChunk: (_delta, accumulated) => {
          setOutput(accumulated);
        },
      });

      setOutput(res.output);
      setLatencyMs(Date.now() - startTime);
      if (res.usage?.totalTokens) setTokens(res.usage.totalTokens);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setOutput('Error: ' + (err?.message || 'Execution failed. Please try again.'));
      }
    } finally {
      setIsExecuting(false);
      setAbortController(null);
    }
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setIsExecuting(false);
      setAbortController(null);
    }
  };

  const handleCopyOutput = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13)
      ) {
        e.preventDefault();
        if (!isExecuting) {
          handleRun();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExecuting]);

  if (!isOpen || !prompt) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[700] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl bg-bg-secondary border border-border-default rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-bg-tertiary/60 border-b border-border-default shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-text-primary truncate">{prompt.title}</h3>
                <p className="text-xs text-text-muted truncate">
                  by @{prompt.authorName || 'community'} • {prompt.category}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const target = activePrompt || prompt;
                  if (target) onOpenInWorkspace(target);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer"
                title="Open full prompt in Studio IDE"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in IDE</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {/* Loading Indicator */}
            {isLoadingContent && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-xs text-brand-primary font-mono">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Loading prompt template & variables...</span>
              </div>
            )}

            {/* Variables Input Section */}
            {variables.length > 0 && (
              <div className="bg-bg-primary border border-border-default rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary font-mono">
                  <Variable className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Template Variables</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {variables.map((v) => (
                    <div key={v.name} className="space-y-1">
                      <label className="text-[11px] font-mono font-semibold text-text-secondary">
                        {'{' + '{' + v.name + '}' + '}'}
                      </label>
                      <input
                        type="text"
                        value={variableValues[v.name] || ''}
                        onChange={(e) =>
                          setVariableValues((prev) => ({
                            ...prev,
                            [v.name]: e.target.value,
                          }))
                        }
                        placeholder={v.defaultValue || 'Enter ' + v.name + '...'}
                        className="w-full px-3 py-1.5 bg-bg-secondary border border-border-default rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-brand-primary"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Run Trigger & Model Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted font-mono">Model:</span>
                <span className="px-2.5 py-1 rounded-md bg-bg-tertiary border border-border-default text-xs font-mono text-text-primary font-semibold">
                  {selectedModel}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <PromptCameraMicControls
                  variant="compact"
                  onImageAttached={(url) => {
                    const varKeys = Object.keys(variableValues);
                    if (varKeys.length > 0) {
                      setVariableValues((prev) => ({
                        ...prev,
                        [varKeys[0]]: prev[varKeys[0]] ? `${prev[varKeys[0]]}\n[Image Context: ${url}]` : url,
                      }));
                    }
                    showToast('Photo attached to prompt input!', 'success');
                  }}
                  onTranscriptReady={(transcript) => {
                    const varKeys = Object.keys(variableValues);
                    if (varKeys.length > 0) {
                      setVariableValues((prev) => ({
                        ...prev,
                        [varKeys[0]]: prev[varKeys[0]] ? `${prev[varKeys[0]]} ${transcript}` : transcript,
                      }));
                    }
                    showToast('Voice transcription added!', 'success');
                  }}
                />

                {isLoadingContent ? (
                  <button
                    type="button"
                    disabled
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-muted text-xs font-bold cursor-not-allowed min-h-[44px] sm:min-h-[36px]"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-primary" /> Loading...
                  </button>
                ) : isExecuting ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px]"
                  >
                    <Square className="w-3.5 h-3.5" /> Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRun}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-white text-xs font-bold shadow-xs transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px]"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Quick Run
                  </button>
                )}
              </div>
            </div>

            {/* Execution Output Box */}
            <div className="bg-bg-primary border border-border-default rounded-xl p-4 space-y-2.5 flex flex-col min-h-[160px]">
              <div className="flex items-center justify-between border-b border-border-default/60 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-text-primary font-mono">
                  <Cpu className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Output Stream</span>
                  {latencyMs > 0 && (
                    <span className="text-[11px] text-text-muted font-normal">
                      ({latencyMs}ms{tokens ? ', ' + tokens + ' tokens' : ''})
                    </span>
                  )}
                </div>

                {output && (
                  <button
                    type="button"
                    onClick={handleCopyOutput}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-bg-secondary hover:bg-bg-tertiary text-text-secondary text-[11px] border border-border-default transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>

              <div className="flex-1 text-xs font-mono text-text-primary whitespace-pre-wrap break-words leading-relaxed select-text min-h-[100px]">
                {output || (
                  <span className="text-text-muted italic">
                    {isExecuting ? 'Streaming output from AI model...' : 'Click "Quick Run" to test this prompt.'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
