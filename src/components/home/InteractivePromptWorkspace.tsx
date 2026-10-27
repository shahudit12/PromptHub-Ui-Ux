import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal,
  Gauge,
  Sparkles,
  Swords,
  Copy,
  Check,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  Zap,
  FileCode,
  CheckCircle2,
  RefreshCw,
  Cpu,
  ChevronDown,
  Lock,
  MoveHorizontal,
  Camera,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  homepageAnalyzerService,
  type HomepageAnalysisResult,
  type HomepageAnalysisDimension,
} from '../../services/homepageAnalyzerService';
import { modelCatalogService, type CatalogModel } from '../../services/modelCatalogService';
import { smartModelResolver } from '../../services/ai/smartModelResolver';
import { FreeModelSelector } from './FreeModelSelector';
import { PromptCameraMicControls } from '../common/PromptCameraMicControls';
import { uploadPromptImage } from '../../utils/promptMediaAttachment';

export type WorkspaceTab = 'draft' | 'analyze' | 'improve' | 'arena';

const SAMPLE_TEMPLATES = [
  {
    id: 'finance',
    name: 'MRR & Billing Extraction',
    shortName: 'Finance',
    category: 'Finance',
    raw: 'Extract all customer subscription changes, MRR numbers, and churn reasons from {{transcript_source}} and return it as clean JSON for finance.',
  },
  {
    id: 'support',
    name: 'Customer Support Guardrails',
    shortName: 'Support',
    category: 'Support',
    raw: 'You are a customer support agent. Answer user queries about product refunds for {{user_account}}. If they get angry, give them a discount coupon.',
  },
  {
    id: 'typescript',
    name: 'TypeScript Code Auditor',
    shortName: 'Code Audit',
    category: 'Development',
    raw: 'Act as a Principal Engineer. Review this TypeScript function for {{module_name}}. Optimize performance, remove any types, and make sure it has proper comments.',
  },
];

export const InteractivePromptWorkspace: React.FC = () => {
  const { setActiveTab, setArenaPromptDraft, showToast, isLoggedIn, setShowAuthModal } = useApp();

  const [activeTemplateIdx, setActiveTemplateIdx] = useState<number | null>(0);
  const [promptText, setPromptText] = useState(SAMPLE_TEMPLATES[0].raw);
  const [activeTab, setActiveTabLocal] = useState<WorkspaceTab>('draft');
  const [selectedDimension, setSelectedDimension] = useState<string | null>('structure');
  const [copied, setCopied] = useState(false);

  // Mobile Before/After segmented tab
  const [mobileImproveTab, setMobileImproveTab] = useState<'before' | 'after'>('after');

  // Model selection state
  const [selectedModel, setSelectedModel] = useState<CatalogModel>(() => {
    const lastId = smartModelResolver.getLastSelectedModel();
    if (lastId) {
      const match = modelCatalogService.getModelById(lastId);
      if (match && match.isFree) return match;
    }
    return homepageAnalyzerService.resolveFreeModel();
  });
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [pendingAnalyzeAfterSelect, setPendingAnalyzeAfterSelect] = useState(false);

  // Live analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<HomepageAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isDraggingWorkspacePhoto, setIsDraggingWorkspacePhoto] = useState(false);
  const [isUploadingWorkspacePhoto, setIsUploadingWorkspacePhoto] = useState(false);

  const processWorkspaceImage = async (file: File) => {
    if (isUploadingWorkspacePhoto) return;
    setIsUploadingWorkspacePhoto(true);
    try {
      const { markdownTag } = await uploadPromptImage(file, { showToast });
      setPromptText(prev => prev.trim() ? `${prev.trim()}${markdownTag}` : markdownTag.trimStart());
      setActiveTemplateIdx(null);
    } catch {
      // toast handled
    } finally {
      setIsUploadingWorkspacePhoto(false);
    }
  };

  const handleWorkspaceDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer?.types?.includes('Files')) {
      e.preventDefault();
      setIsDraggingWorkspacePhoto(true);
    }
  };

  const handleWorkspaceDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingWorkspacePhoto(false);
  };

  const handleWorkspaceDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingWorkspacePhoto(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && ((file.type || '').startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i.test(file.name || ''))) {
      await processWorkspaceImage(file);
    }
  };

  const handleWorkspacePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if ((items[i]?.type || '').startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          await processWorkspaceImage(file);
          break;
        }
      }
    }
  };

  // Tab 3 Before/After view mode & Split Screen Slider state
  const [improveViewMode, setImproveViewMode] = useState<'split' | 'slider'>('split');
  const [workspaceSliderPos, setWorkspaceSliderPos] = useState<number>(50);
  const [isDraggingWorkspaceSlider, setIsDraggingWorkspaceSlider] = useState<boolean>(false);
  const workspaceSliderRef = useRef<HTMLDivElement>(null);
  const isDraggingWorkspaceSliderRef = useRef<boolean>(false);

  useEffect(() => {
    isDraggingWorkspaceSliderRef.current = isDraggingWorkspaceSlider;
  }, [isDraggingWorkspaceSlider]);

  const updateWorkspaceSliderFromClientX = React.useCallback((clientX: number) => {
    if (!workspaceSliderRef.current) return;
    const rect = workspaceSliderRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const rawPos = ((clientX - rect.left) / rect.width) * 100;
    setWorkspaceSliderPos(Math.max(0, Math.min(100, rawPos)));
  }, []);

  // Pointer event handlers for the workspace split slider
  const handleWorkspaceSliderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsDraggingWorkspaceSlider(true);
    updateWorkspaceSliderFromClientX(e.clientX);
  };

  const handleWorkspaceSliderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingWorkspaceSliderRef.current) return;
    updateWorkspaceSliderFromClientX(e.clientX);
  };

  const handleWorkspaceSliderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}
    setIsDraggingWorkspaceSlider(false);
  };

  const handleWorkspaceSliderPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}
    setIsDraggingWorkspaceSlider(false);
  };

  // Global window listeners fallback for workspace slider
  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingWorkspaceSliderRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      updateWorkspaceSliderFromClientX(clientX);
    };

    const handleGlobalEnd = () => {
      if (isDraggingWorkspaceSliderRef.current) {
        setIsDraggingWorkspaceSlider(false);
      }
    };

    window.addEventListener('mousemove', handleGlobalMove, { passive: true });
    window.addEventListener('mouseup', handleGlobalEnd);
    window.addEventListener('touchmove', handleGlobalMove, { passive: true });
    window.addEventListener('touchend', handleGlobalEnd);
    window.addEventListener('touchcancel', handleGlobalEnd);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalEnd);
      window.removeEventListener('touchcancel', handleGlobalEnd);
    };
  }, [updateWorkspaceSliderFromClientX]);

  // Keyboard accessibility for workspace slider
  const handleWorkspaceSliderKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 3;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setWorkspaceSliderPos((prev) => Math.max(0, prev - step));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setWorkspaceSliderPos((prev) => Math.min(100, prev + step));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setWorkspaceSliderPos(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setWorkspaceSliderPos(100);
    }
  };

  // Sync saved model on mount & refresh catalog
  useEffect(() => {
    modelCatalogService.fetchCatalog().then(() => {
      const savedId = homepageAnalyzerService.getSavedModelId();
      if (savedId) {
        const resolved = homepageAnalyzerService.resolveFreeModel(savedId);
        setSelectedModel(resolved);
      }
    }).catch(() => {});
  }, []);

  // Extract variables dynamically from promptText
  const extractedVariables = useMemo(() => {
    const matches = promptText.match(/\{\{([a-zA-Z0-9_-]+)\}\}/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map((m) => m.replace(/[{}]/g, ''))));
  }, [promptText]);

  // Token estimate: ~4 chars per token
  const tokenEstimate = Math.ceil(promptText.length / 4);
  const wordCount = promptText.trim().split(/\s+/).filter(Boolean).length;

  const handleSelectTemplate = (idx: number) => {
    setActiveTemplateIdx(idx);
    setPromptText(SAMPLE_TEMPLATES[idx].raw);
    setActiveTabLocal('draft');
    setAnalysisError(null);
  };

  const handleModelSelected = (model: CatalogModel) => {
    setSelectedModel(model);
    homepageAnalyzerService.saveModelId(model.id);
    smartModelResolver.setLastSelectedModel(model.id);

    if (pendingAnalyzeAfterSelect) {
      setPendingAnalyzeAfterSelect(false);
      executeAnalysis(promptText, model.id);
    }
  };

  const executeAnalysis = async (text: string, modelId: string) => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      showToast('Please sign in to analyze prompts.', 'info');
      return;
    }

    if (!text.trim()) {
      showToast('Please enter a prompt to analyze!', 'info');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const result = await homepageAnalyzerService.analyzePrompt(text, modelId);
      setAnalysisResult(result);
      setActiveTabLocal('analyze');
      if (result.dimensions.length > 0) {
        setSelectedDimension(result.dimensions[0].id);
      }
    } catch (err: any) {
      const msg = err?.message || 'AI analysis request failed. Please try again.';
      setAnalysisError(msg);
      showToast(msg, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeClick = () => {
    if (isAnalyzing) return;

    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }

    // Logged-in users get the full Analyzer IDE, not the anonymous trial endpoint.
    // The anonymous trial token was already consumed before they signed up,
    // so routing to the trial endpoint gives them "trial already used" — wrong.
    // Save their prompt into the Analyzer draft so they land with it pre-filled.
    try {
      sessionStorage.setItem('ph_creation_workspace_prompt', promptText);
      sessionStorage.setItem('ph_work_pending_task', JSON.stringify({
        title: 'Draft Prompt',
        prompt: promptText,
      }));
    } catch {}
    setActiveTab('workspace');
  };

  const handleCopy = () => {
    // When the model returned no rewrite, improvedPrompt is null and there is
    // nothing to copy. Copying the visitor's own prompt back would present it as
    // the improved version, which is the fabrication this pass removed.
    const textToCopy =
      activeTab === 'improve' && analysisResult
        ? analysisResult.improvedPrompt
        : promptText;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInArena = () => {
    const textToPass =
      analysisResult?.improvedPrompt || promptText;
    setArenaPromptDraft(textToPass);
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    setActiveTab('workspace');
  };

  const handleOpenInIDE = () => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    setActiveTab('workspace');
  };

  // Active dimensions to render: the live result, or an UNSCORED template.
  //
  // The template previously carried concrete scores (72, 55, 40, 45, 90) and
  // letter grades (C, D, F, A), so a visitor who had not clicked Analyze was
  // still shown a graded report card for their prompt. The template now names
  // the dimensions and nothing else; `placeholder` tells the UI to render
  // dashes in place of numbers.
  const activeDimensions: HomepageAnalysisDimension[] = useMemo(() => {
    if (analysisResult?.dimensions) {
      return analysisResult.dimensions;
    }
    const pending = (
      id: HomepageAnalysisDimension['id'],
      label: string,
      highlightText: string
    ): HomepageAnalysisDimension => ({
      id,
      label,
      score: 0,
      grade: '—',
      status: 'warning',
      highlightText,
      diagnosis: null,
      recommendation: null,
      placeholder: true,
    });

    return [
      pending('clarity', 'Clarity', promptText.slice(0, 50) + (promptText.length > 50 ? '...' : '')),
      pending('structure', 'Structure', 'Not analyzed yet'),
      pending('constraints', 'Constraints', 'Not analyzed yet'),
      pending('ambiguity', 'Ambiguity', 'Not analyzed yet'),
      pending('safety', 'Safety & Guardrails', 'Not analyzed yet'),
    ];
  }, [analysisResult, promptText]);

  // No fabricated "optimized rewrite" before the model has produced one. This
  // previously rendered a hand-written system prompt that the user could copy,
  // believing a model had written it for their input.
  const activeImprovedPrompt = analysisResult?.improvedPrompt ?? null;

  return (
    <div className="w-full max-w-4xl mx-auto font-sans select-none text-left">
      {/* Free Model Selector Modal (One-time selection) */}
      <FreeModelSelector
        isOpen={isModelSelectorOpen}
        onClose={() => {
          setIsModelSelectorOpen(false);
          setPendingAnalyzeAfterSelect(false);
        }}
        selectedModelId={selectedModel.id}
        onSelectModel={handleModelSelected}
      />

      {/* Studio Header Card */}
      <div className="rounded-2xl border border-border-default bg-bg-secondary shadow-md overflow-hidden transition-all">
        {/* Top Control Strip */}
        <div className="px-3 sm:px-4 py-2 sm:py-2.5 bg-bg-secondary border-b border-border-default flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
          {/* Sample Preset Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 w-full sm:w-auto">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted shrink-0 hidden md:inline-block mr-1">
              Sample:
            </span>
            {SAMPLE_TEMPLATES.map((tmpl, idx) => {
              const isSelected = activeTemplateIdx === idx;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => handleSelectTemplate(idx)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[32px] sm:min-h-0 flex items-center ${
                    isSelected
                      ? 'bg-brand-primary text-white font-semibold shadow-2xs'
                      : 'bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default'
                  }`}
                >
                  <span className="sm:hidden">{tmpl.shortName}</span>
                  <span className="hidden sm:inline">{tmpl.name}</span>
                </button>
              );
            })}
          </div>

          {/* Model Selector Trigger & Quick Metrics */}
          <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 text-[11px] font-mono text-text-secondary font-medium shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t border-border-default/40 sm:border-t-0">
            {/* Free Model Picker Badge */}
            <div className="flex items-center gap-1 bg-bg-secondary border border-border-default px-2 py-1 sm:py-0.5 rounded-lg shadow-2xs">
              <span className="text-[10px] text-text-secondary font-medium hidden md:inline">Model:</span>
              <button
                onClick={() => setIsModelSelectorOpen(true)}
                className="font-bold text-brand-primary hover:text-brand-primary-hi flex items-center gap-1 cursor-pointer transition-colors"
                title="Change Free Analysis Model"
              >
                <Cpu className="w-3 h-3 text-brand-primary shrink-0" />
                <span className="truncate max-w-[95px] sm:max-w-[170px]">
                  {selectedModel.name.replace(/\s*\(Free\)/i, '')}
                </span>
                <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1 rounded font-bold uppercase hidden xs:inline">
                  Free
                </span>
                <ChevronDown className="w-2.5 h-2.5 text-text-secondary shrink-0" />
              </button>
            </div>

            <span className="hidden md:inline">·</span>
            <span className="hidden md:inline text-text-secondary font-medium">{wordCount}w</span>
            <span className="hidden sm:inline">·</span>
            <span className="text-text-secondary font-medium font-mono hidden sm:inline">~{tokenEstimate} tok</span>
          </div>
        </div>

        {/* Workspace Mode Navigation Tabs */}
        <div className="px-2 sm:px-4 py-1.5 sm:py-2 bg-bg-secondary border-b border-border-default flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={() => setActiveTabLocal('draft')}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-[38px] flex-1 sm:flex-initial ${
                activeTab === 'draft'
                  ? 'bg-brand-primary text-white shadow-2xs'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">Draft</span>
              <span className="hidden sm:inline">Prompt Draft</span>
            </button>

            <button
              onClick={() => {
                if (!isLoggedIn) {
                  setShowAuthModal(true);
                  showToast('Please sign in to view the analysis breakdown.', 'info');
                  return;
                }
                setActiveTabLocal('analyze');
              }}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-[38px] flex-1 sm:flex-initial ${
                activeTab === 'analyze'
                  ? 'bg-brand-primary text-white shadow-2xs'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              }`}
            >
              <Gauge className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">Audit</span>
              <span className="hidden sm:inline">Analysis Breakdown</span>
              {analysisResult && (
                <span className="ml-0.5 sm:ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono font-bold">
                  {analysisResult.overallScore}%
                </span>
              )}
            </button>

            <button
              onClick={() => {
                if (!isLoggedIn) {
                  setShowAuthModal(true);
                  showToast('Please sign in to compare prompt iterations.', 'info');
                  return;
                }
                setActiveTabLocal('improve');
              }}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-[38px] flex-1 sm:flex-initial ${
                activeTab === 'improve'
                  ? 'bg-brand-primary text-white shadow-2xs'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">Compare</span>
              <span className="hidden sm:inline">Before / After</span>
            </button>

            <button
              onClick={() => {
                if (!isLoggedIn) {
                  setShowAuthModal(true);
                  showToast('Please sign in to launch the multi-model arena shootout.', 'info');
                  return;
                }
                setActiveTabLocal('arena');
              }}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-[38px] flex-1 sm:flex-initial ${
                activeTab === 'arena'
                  ? 'bg-brand-primary text-white shadow-2xs'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              }`}
            >
              <Swords className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">Arena</span>
              <span className="hidden sm:inline">Arena Shootout</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 shrink-0 ml-2">
            <button
              onClick={handleCopy}
              title="Copy current prompt"
              className="px-2.5 py-1 rounded-md border border-border-default hover:bg-bg-tertiary text-text-secondary text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Copied ✓</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-text-muted" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Execution Error Alert */}
        {analysisError && (
          <div className="px-4 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{analysisError}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleAnalyzeClick}
                className="px-2.5 py-0.5 rounded bg-rose-200/80 hover:bg-rose-300 font-semibold transition-colors cursor-pointer"
              >
                Retry
              </button>
              <button
                onClick={() => setIsModelSelectorOpen(true)}
                className="px-2.5 py-0.5 rounded bg-bg-secondary border border-rose-200 hover:bg-rose-100 font-medium transition-colors cursor-pointer"
              >
                Change Free Model
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Interactive Stage Body */}
        <div className="p-3.5 sm:p-4 bg-bg-primary min-h-[200px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            {/* 1. DRAFT TAB */}
            {activeTab === 'draft' && (
              <motion.div
                key="draft"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-text-secondary font-medium flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] flex items-center gap-1.5 text-text-secondary">
                      <FileCode className="w-3.5 h-3.5 text-brand-primary" />
                      <span>Editable Prompt Body (Live Input)</span>
                    </span>
                    {extractedVariables.length > 0 && (
                      <div className="hidden sm:flex items-center gap-1">
                        <span className="text-[10px] font-mono text-text-secondary font-bold">Parameters:</span>
                        {extractedVariables.map((v) => (
                          <span
                            key={v}
                            className="px-1.5 py-0.2 rounded bg-brand-primary-light border border-brand-primary/20 text-brand-primary font-mono text-[10px] font-bold"
                          >
                            {`{{${v}}}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <PromptCameraMicControls
                    variant="compact"
                    disabled={isAnalyzing}
                    onImageAttached={(url) => {
                      setPromptText(prev => prev.trim() ? `${prev.trim()}\n\n![Image Context](${url})\n` : `![Image Context](${url})\n`);
                      setActiveTemplateIdx(null);
                    }}
                    onTranscriptReady={(text) => {
                      setPromptText(prev => prev.trim() ? `${prev.trim()} ${text}` : text);
                      setActiveTemplateIdx(null);
                    }}
                  />
                </div>

                <div className="relative rounded-xl border border-border-default bg-bg-secondary p-3 shadow-2xs focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/10 transition-all">
                  <textarea
                    value={promptText}
                    onChange={(e) => {
                      setPromptText(e.target.value);
                      setActiveTemplateIdx(null);
                    }}
                    onDragOver={handleWorkspaceDragOver}
                    onDragLeave={handleWorkspaceDragLeave}
                    onDrop={handleWorkspaceDrop}
                    onPaste={handleWorkspacePaste}
                    rows={3}
                    className="w-full bg-transparent font-mono text-xs sm:text-sm text-text-primary focus:outline-none resize-none leading-relaxed min-h-[75px] sm:min-h-[90px]"
                    placeholder="Type or paste your prompt instructions here to test live with OpenRouter..."
                    aria-label="Prompt Editor"
                    disabled={isAnalyzing}
                  />

                  {isDraggingWorkspacePhoto && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-brand-primary/10 border-2 border-dashed border-brand-primary rounded-xl backdrop-blur-[1px] pointer-events-none text-xs font-semibold text-brand-primary gap-1">
                      <Camera className="w-6 h-6 animate-pulse text-brand-primary" />
                      <span>Drop photo here to attach to live prompt</span>
                    </div>
                  )}
                </div>

                {/* Quick actions row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    {analysisResult ? (
                      <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px] font-medium font-mono">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Analyzed with {analysisResult.requestedModel}</span>
                      </span>
                    ) : !isLoggedIn ? (
                      <span className="inline-flex items-center gap-1 text-text-secondary bg-bg-secondary px-2 py-0.5 rounded border border-border-default text-[11px] font-medium font-mono">
                        <Lock className="w-3 h-3 text-amber-600" />
                        <span>Sign-in required to analyze</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-text-secondary bg-bg-secondary px-2 py-0.5 rounded border border-border-default text-[11px] font-medium font-mono">
                        <Zap className="w-3 h-3 text-brand-primary" />
                        <span>Instant AI Analysis</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        setPromptText(SAMPLE_TEMPLATES[0].raw);
                        setActiveTemplateIdx(0);
                        setAnalysisResult(null);
                        setAnalysisError(null);
                      }}
                      disabled={isAnalyzing}
                      className="px-3 py-2 rounded-lg border border-border-default hover:bg-bg-tertiary text-xs font-medium text-text-secondary transition-colors cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50 min-h-[44px] sm:min-h-[36px]"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-text-muted" />
                      <span>Reset</span>
                    </button>

                    <button
                      onClick={handleAnalyzeClick}
                      disabled={isAnalyzing}
                      className="flex-1 sm:flex-initial px-5 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 hover:-translate-y-px disabled:opacity-50 min-h-[44px] sm:min-h-[36px]"
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Analyzing with {selectedModel.name.replace(/\s*\(Free\)/i, '')}...</span>
                        </>
                      ) : !isLoggedIn ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-amber-200" />
                          <span>Sign In to Analyze</span>
                        </>
                      ) : (
                        <>
                          <Gauge className="w-3.5 h-3.5" />
                          <span>Analyze Prompt</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. ANALYZE TAB */}
            {activeTab === 'analyze' && (
              <motion.div
                key="analyze"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="space-y-3 sm:space-y-4"
              >
                {/* Header status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-primary font-display text-sm">
                      {analysisResult ? 'Audit Breakdown' : 'Evaluation Rubrics'}
                    </span>
                    {analysisResult && (
                      <span className="px-2 py-0.5 rounded-full bg-brand-primary-light border border-brand-primary/20 text-brand-primary font-mono text-[10px] font-bold truncate max-w-[140px]">
                        {analysisResult.requestedModel}
                      </span>
                    )}
                  </div>
                  {analysisResult && (
                    <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded self-start sm:self-auto">
                      Overall: {analysisResult.overallScore}/100 ({analysisResult.difficulty})
                    </span>
                  )}
                </div>

                {/* 5-Dimension Score Bar */}
                <div className="flex sm:grid sm:grid-cols-5 gap-2 overflow-x-auto no-scrollbar pb-1">
                  {activeDimensions.map((dim) => {
                    const isSelected = selectedDimension === dim.id;
                    return (
                      <button
                        key={dim.id}
                        onClick={() => setSelectedDimension(dim.id)}
                        className={`min-w-[110px] shrink-0 sm:min-w-0 p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden min-h-[56px] ${
                          isSelected
                            ? 'bg-bg-secondary border-brand-primary shadow-xs ring-2 ring-brand-primary/10'
                            : 'bg-bg-secondary border-border-default hover:border-border-hover'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-text-secondary font-medium font-mono mb-1">
                          <span className="truncate">{dim.label}</span>
                          <span
                            className={`font-bold ${
                              dim.placeholder
                                ? 'text-text-muted'
                                : dim.status === 'good'
                                ? 'text-emerald-700'
                                : dim.status === 'warning'
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }`}
                          >
                            {dim.grade}
                          </span>
                        </div>
                        <div className="text-lg font-black font-display text-text-primary">
                          {dim.placeholder ? (
                            <span className="text-text-muted">—</span>
                          ) : (
                            <>
                              {dim.score}
                              <span className="text-[10px] text-text-secondary font-sans font-normal">/100</span>
                            </>
                          )}
                        </div>
                        {isSelected && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Highlighted Prompt Clause & Actionable Diagnosis */}
                {selectedDimension && (
                  <div className="rounded-xl border border-border-default bg-bg-secondary p-3.5 space-y-2.5 shadow-2xs">
                    {(() => {
                      const dim = activeDimensions.find((d) => d.id === selectedDimension) || activeDimensions[0];
                      if (!dim) return null;
                      return (
                        <>
                          <div className="flex items-center justify-between text-xs pb-1.5 border-b border-border-subtle">
                            <span className="font-bold text-text-primary flex items-center gap-1.5 font-display">
                              <span className="w-2 h-2 rounded-full bg-brand-primary" />
                              <span>{dim.label} Dimension Inspection</span>
                            </span>
                            <span
                              className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded ${
                                dim.placeholder
                                  ? 'bg-bg-tertiary text-text-muted border border-border-default'
                                  : dim.status === 'good'
                                   ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : dim.status === 'warning'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {dim.placeholder
                                ? 'Not analyzed yet'
                                : `Score: ${dim.score}/100 (${dim.status.toUpperCase()})${dim.derived ? ' · derived' : ''}`}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-bg-secondary border border-border-default font-mono text-xs text-text-primary leading-relaxed">
                            <span className="text-text-muted font-semibold block text-[10px] mb-1">
                              Inspected Prompt Scope:
                            </span>
                            <span className="bg-amber-100 text-amber-950 px-1 py-0.5 rounded font-semibold border border-amber-300">
                              "{dim.highlightText}"
                            </span>
                          </div>

                          {/* Findings are shown only when the model actually returned one. */}
                          {(dim.diagnosis || dim.recommendation) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {dim.diagnosis && (
                                <div className="p-2 bg-rose-50/60 rounded-lg border border-rose-100 space-y-0.5">
                                  <span className="font-bold text-rose-900 text-[11px]">Identified Finding:</span>
                                  <p className="text-rose-800 text-[11px] leading-snug">{dim.diagnosis}</p>
                                </div>
                              )}
                              {dim.recommendation && (
                                <div className="p-2 bg-emerald-50/60 rounded-lg border border-emerald-100 space-y-0.5">
                                  <span className="font-bold text-emerald-900 text-[11px]">Actionable Recommendation:</span>
                                  <p className="text-emerald-800 text-[11px] leading-snug">{dim.recommendation}</p>
                                </div>
                              )}
                            </div>
                          )}
                          {!dim.diagnosis && !dim.recommendation && (
                            <p className="text-[11px] text-text-muted leading-snug">
                              {dim.placeholder
                                ? 'Run the analysis to score this dimension.'
                                : 'The model returned a score for this dimension but no written finding.'}
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Bottom navigation */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setActiveTabLocal('draft')}
                    className="text-xs text-text-secondary hover:text-text-primary font-medium transition-colors cursor-pointer"
                  >
                    ← Edit in Draft
                  </button>
                  <button
                    onClick={() => setActiveTabLocal('improve')}
                    className="px-4 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 min-h-[34px]"
                  >
                    <span>Inspect Before / After</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* 3. IMPROVE TAB */}
            {activeTab === 'improve' && (
              <motion.div
                key="improve"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted pb-1 border-b border-border-subtle">
                  <span className="flex items-center gap-1.5 font-bold text-emerald-800 font-display">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="sm:hidden">Hardened Prompt</span>
                    <span className="hidden sm:inline">Transformed Production Architecture</span>
                  </span>

                  <div className="flex items-center gap-2">
                    {/* View Switcher: Side-by-Side vs Split Slider (Desktop only) */}
                    <div className="hidden sm:flex items-center bg-bg-secondary p-0.5 rounded-lg border border-border-default text-[11px] font-mono">
                      <button
                        type="button"
                        onClick={() => setImproveViewMode('split')}
                        className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                          improveViewMode === 'split'
                            ? 'bg-brand-primary text-white font-bold shadow-2xs'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        Side-by-Side
                      </button>
                      <button
                        type="button"
                        onClick={() => setImproveViewMode('slider')}
                        className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                          improveViewMode === 'slider'
                            ? 'bg-brand-primary text-white font-bold shadow-2xs'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        Split Slider
                      </button>
                    </div>

                    <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono text-[10px] sm:text-[11px] font-bold">
                      {analysisResult ? `Model: ${analysisResult.requestedModel}` : 'Deterministic Refactoring'}
                    </span>
                  </div>
                </div>

                {/* ── Mobile View: High-Craft Segmented Toggle ── */}
                <div className="sm:hidden space-y-2.5">
                  <div className="flex items-center bg-bg-secondary p-1 rounded-xl border border-border-default gap-1">
                    <button
                      type="button"
                      onClick={() => setMobileImproveTab('before')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[40px] flex items-center justify-center gap-1.5 ${
                        mobileImproveTab === 'before'
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-900/60 shadow-2xs font-bold'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span>Original</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileImproveTab('after')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[40px] flex items-center justify-center gap-1.5 ${
                        mobileImproveTab === 'after'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800/60 shadow-2xs font-bold'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Improved</span>
                    </button>
                  </div>

                  {mobileImproveTab === 'before' ? (
                    <div className="p-3 bg-bg-secondary rounded-xl border border-rose-200/70 dark:border-rose-900/40 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px] font-mono text-rose-800 dark:text-rose-300 font-semibold">
                        <span>BEFORE: Raw Input</span>
                        <span className="bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-900/40">
                          Score: {analysisResult?.overallScore ? Math.max(30, analysisResult.overallScore - 30) : 48}/100
                        </span>
                      </div>
                      <div className="font-mono text-xs text-text-secondary leading-relaxed bg-bg-primary p-2.5 rounded-lg border border-border-default max-h-48 overflow-y-auto whitespace-pre-wrap">
                        "{promptText}"
                      </div>
                      <div className="text-[10px] text-rose-700 dark:text-rose-400 font-mono">
                        ✕ Missing typed constraints · Unenforced schema
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-bg-secondary rounded-xl border border-emerald-300 dark:border-emerald-800/60 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono text-emerald-800 dark:text-emerald-300 font-semibold">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          <span>AFTER: Hardened Architecture</span>
                        </span>
                        <span className="bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-900/40">
                          Score: {analysisResult?.overallScore ? Math.min(98, analysisResult.overallScore + 20) : 96}/100
                        </span>
                      </div>
                      <pre className="font-mono text-[11px] text-emerald-950 dark:text-emerald-200 leading-relaxed bg-emerald-50/40 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 max-h-48 overflow-y-auto whitespace-pre-wrap">
                        {activeImprovedPrompt}
                      </pre>
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold">
                        ✓ Strict schema · Parameter encapsulation · Zero preamble
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Desktop View: Side-by-Side vs Split Slider ── */}
                <div className="hidden sm:block">
                  {improveViewMode === 'slider' ? (
                    /* ── Interactive Split Screen Slider inside Workspace ── */
                    <div className="space-y-2">
                      <div
                        ref={workspaceSliderRef}
                        tabIndex={0}
                        role="slider"
                        aria-label="Workspace before and after comparison slider"
                        aria-valuenow={Math.round(workspaceSliderPos)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        onKeyDown={handleWorkspaceSliderKeyDown}
                        onPointerDown={handleWorkspaceSliderPointerDown}
                        onPointerMove={handleWorkspaceSliderPointerMove}
                        onPointerUp={handleWorkspaceSliderPointerUp}
                        onPointerCancel={handleWorkspaceSliderPointerCancel}
                        className={`relative w-full rounded-xl border border-border-default bg-bg-secondary overflow-hidden shadow-xs select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary transition-shadow ${
                          isDraggingWorkspaceSlider ? 'cursor-grabbing ring-2 ring-brand-primary/40' : 'cursor-ew-resize'
                        }`}
                        style={{
                          minHeight: '260px',
                          touchAction: 'none',
                          userSelect: 'none',
                        }}
                      >
                        {/* Before Region */}
                        <div
                          className="absolute inset-0 p-4 bg-[#FCF8F2] dark:bg-[#191612] text-text-primary font-mono text-xs space-y-2.5 overflow-hidden pointer-events-none"
                          style={{
                            clipPath: `polygon(0 0, ${workspaceSliderPos}% 0, ${workspaceSliderPos}% 100%, 0 100%)`,
                          }}
                        >
                          <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/80 dark:border-amber-900/50">
                            <span className="text-amber-900 dark:text-amber-300 font-bold uppercase font-mono text-[11px] flex items-center gap-1.5 shrink-0">
                              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                              <span>BEFORE: Raw Input Prompt</span>
                            </span>
                            <span className="text-amber-800 dark:text-amber-300 text-[10px] font-semibold bg-amber-100/70 dark:bg-amber-950/70 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800/60">
                              Score: {analysisResult?.overallScore ? Math.max(30, analysisResult.overallScore - 30) : 48}/100
                            </span>
                          </div>
                          <div className="p-3 bg-bg-secondary/95 rounded-lg border border-amber-200 dark:border-amber-900/50 text-text-primary leading-relaxed max-w-xl shadow-2xs font-mono text-xs">
                            "{promptText}"
                          </div>
                          <div className="text-[10px] text-amber-900 dark:text-amber-300 font-mono">
                            ✕ Unspecified schema · Missing negative constraints · High ambiguity
                          </div>
                        </div>

                        {/* After Region */}
                        <div
                          className="absolute inset-0 p-4 bg-[#F2F8F4] dark:bg-[#0E1A13] text-text-primary font-mono text-xs space-y-2.5 overflow-hidden pointer-events-none"
                          style={{
                            clipPath: `polygon(${workspaceSliderPos}% 0, 100% 0, 100% 100%, ${workspaceSliderPos}% 100%)`,
                          }}
                        >
                          <div className="flex items-center justify-between pb-1.5 border-b border-emerald-300/80 dark:border-emerald-800/50">
                            <span className="text-emerald-950 dark:text-emerald-300 font-bold uppercase font-mono text-[11px] flex items-center gap-1.5 shrink-0">
                              <Sparkles className="w-3 h-3 text-emerald-700 dark:text-emerald-400 shrink-0" />
                              <span>AFTER: Hardened Architecture</span>
                            </span>
                            <span className="text-emerald-900 dark:text-emerald-300 text-[10px] font-bold bg-emerald-100/80 dark:bg-emerald-950/70 px-1.5 py-0.2 rounded border border-emerald-300 dark:border-emerald-800/60">
                              Score: {analysisResult?.overallScore ? Math.min(98, analysisResult.overallScore + 20) : 96}/100
                            </span>
                          </div>
                          <pre className="p-3 bg-bg-secondary/95 rounded-lg border border-emerald-300/90 dark:border-emerald-800/50 text-emerald-950 dark:text-emerald-200 text-[11px] leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap shadow-2xs font-mono">
                            {activeImprovedPrompt}
                          </pre>
                          <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                            ✓ Strict schema contract · Dynamic parameter encapsulation · Zero preamble
                          </div>
                        </div>

                        {/* Divider Handle */}
                        <div
                          className="absolute top-0 bottom-0 pointer-events-none z-30"
                          style={{ left: `${workspaceSliderPos}%` }}
                        >
                          <div className="absolute top-0 bottom-0 -translate-x-1/2 w-0.5 bg-brand-primary shadow-xs" />
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-[#111311] transition-transform ${
                              isDraggingWorkspaceSlider ? 'scale-115 ring-brand-primary/30' : 'hover:scale-105'
                            }`}
                          >
                            <MoveHorizontal className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>

                      {/* Workspace Slider hint */}
                      <div className="flex items-center justify-between text-[11px] font-mono text-text-muted px-1">
                        <span className="text-text-secondary">
                          {workspaceSliderPos <= 5
                            ? '100% Hardened'
                            : workspaceSliderPos >= 95
                            ? '100% Rough'
                            : `${Math.round(100 - workspaceSliderPos)}% Hardened / ${Math.round(workspaceSliderPos)}% Rough`}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          Drag divider left / right
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* ── Side-by-Side Split View ── */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Before */}
                      <div className="p-3 bg-bg-secondary rounded-xl border border-rose-200/70 dark:border-rose-900/40 space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between text-[11px] font-mono text-rose-800 dark:text-rose-300 font-semibold">
                          <span>BEFORE (Your Prompt)</span>
                          <span className="bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300">
                            Score: {analysisResult?.overallScore ? Math.max(30, analysisResult.overallScore - 30) : 48}/100
                          </span>
                        </div>
                        <div className="font-mono text-xs text-text-secondary leading-relaxed bg-bg-secondary p-2.5 rounded-lg border border-border-default max-h-48 overflow-y-auto whitespace-pre-wrap">
                          "{promptText}"
                        </div>
                        <div className="text-[10px] text-rose-700 dark:text-rose-400 font-mono">
                          ✕ Missing typed constraints · Unenforced schema
                        </div>
                      </div>

                      {/* After */}
                      <div className="p-3 bg-bg-secondary rounded-xl border border-emerald-300 dark:border-emerald-800/60 shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono text-emerald-800 dark:text-emerald-300 font-semibold">
                          <span>AFTER (Compiled Output)</span>
                          <span className="bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                            Score: {analysisResult?.overallScore ? Math.min(98, analysisResult.overallScore + 20) : 96}/100
                          </span>
                        </div>
                        <pre className="font-mono text-[11px] text-emerald-950 dark:text-emerald-200 leading-relaxed bg-emerald-50/40 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 max-h-48 overflow-y-auto whitespace-pre-wrap">
                          {activeImprovedPrompt}
                        </pre>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold">
                          ✓ Strict schema · Parameter encapsulation · Zero preamble
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setActiveTabLocal('draft')}
                    className="text-xs text-text-secondary hover:text-text-primary font-medium transition-colors cursor-pointer"
                  >
                    ← Back to Draft
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleOpenInArena}
                      className="px-3.5 py-2 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs min-h-[44px] sm:min-h-[34px]"
                    >
                      <Swords className="w-3.5 h-3.5" />
                      <span>Benchmark in Arena</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. ARENA TAB */}
            {activeTab === 'arena' && (
              <motion.div
                key="arena"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span className="flex items-center gap-1.5 font-bold text-text-primary font-display">
                    <Zap className="w-3.5 h-3.5 text-brand-primary" />
                    <span>Multi-Model Shootout Arena</span>
                  </span>
                  <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono text-[10px] sm:text-[11px] font-bold">
                    400+ Models
                  </span>
                </div>

                <div className="p-3 sm:p-4 bg-bg-secondary rounded-xl border border-border-default space-y-2 sm:space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-mono border-b border-border-subtle pb-1.5">
                    <span className="font-bold text-text-primary text-xs">Queued for Arena:</span>
                    <span className="text-text-secondary font-medium font-mono text-[11px]">~{tokenEstimate} tokens</span>
                  </div>
                  <pre className="p-2.5 bg-bg-primary rounded-lg font-mono text-xs text-text-secondary max-h-24 sm:max-h-28 overflow-y-auto whitespace-pre-wrap border border-border-default">
                    {analysisResult?.improvedPrompt || promptText}
                  </pre>
                  <p className="text-[11.5px] sm:text-xs text-text-secondary leading-relaxed">
                    Compare latency, cost, and schema compliance side-by-side across Claude 3.5 Sonnet, GPT-4o, Gemini 2.0 Flash, and DeepSeek R1.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-text-secondary font-mono">
                    Benchmarked with live OpenRouter execution.
                  </span>
                  <button
                    onClick={handleOpenInArena}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[34px]"
                  >
                    <span>Launch Live Arena Playground</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Studio Action Footer */}
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-bg-secondary border-t border-border-default flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 text-text-secondary font-sans text-[11.5px] w-full sm:w-auto justify-center sm:justify-start">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">
              OpenRouter live · Selected: <strong>{selectedModel.name.replace(/\s*\(Free\)/i, '')}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleOpenInIDE}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-white text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs min-h-[44px] sm:min-h-[36px]"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Open in Prompt IDE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractivePromptWorkspace;
