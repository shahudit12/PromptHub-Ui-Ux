import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { AIUpgradeModal } from '../components/AIUpgradeModal';
import { AICreditBadge } from '../components/AICreditBadge';
import { securityUtils } from '../utils/security';
import {
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Check,
  Play,
  Code2,
  Cpu,
  Zap,
  XCircle,
  TrendingUp,
  ArrowLeftRight,
  Sliders,
  RotateCcw,
  Swords,
  Clock,
  Download,
  FileText,
  Mic,
  Camera,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { PromptAnalyzerIcon } from '../components/icons/PromptHubIcons';
import { uploadPromptImage } from '../utils/promptMediaAttachment';

import { motion, AnimatePresence } from 'framer-motion';

import type { PromptAnalysisResult } from '../lib/openrouter';
import { modelCatalogService, type CatalogModel, filterForRealTime } from '../services/modelCatalogService';
import { multiProviderService } from '../services/ai/multiProviderService';
import { analyzerTrialService, type TrialState } from '../services/analyzerTrialService';
import { ModelSelectorModal } from '../components/ModelSelectorModal';
import { ActiveModelBadge } from '../components/ActiveModelBadge';
import { smartModelResolver, type SelectionMode } from '../services/ai/smartModelResolver';
import { backgroundAnalysisService } from '../services/ai/backgroundAnalysisService';
import { draftPersistenceService, type AnalyzerDraftState } from '../services/draftPersistenceService';
import { PromptDiffViewer } from '../components/analyzer/PromptDiffViewer';
import { VoicePromptModal } from '../components/voice/VoicePromptModal';
import { exportAuditReportToMarkdown, exportAuditReportToJson } from '../services/export/promptExporter';
import { isFreeModel, isRetiredOrUnavailableFreeModel } from '../utils/modelFormatting';

import {
  trackPromptAnalyzed,
  trackAnalysisCompleted,
  trackAnalysisFailed,
  trackAiSuggestionAccepted,
} from '../lib/posthogEvents';
import { trackPromptAnalyzed as trackMixpanelPromptAnalyzed } from '../lib/mixpanelEvents';
import { getUserPlanTier } from '../config/billingConfig';

// Re-export for backward compatibility
export type { PromptAnalysisResult as AnalysisResult };

// ─── Preset Templates ─────────────────────────────────────────────────────────
const PRESETS = [
  {
    name: 'Marketing Campaign Email',
    desc: 'Product launch sequence',
    text: 'Write a promotional email to send to customers about our new team calendar feature. Make it sound exciting and list some benefits of using it.',
  },
  {
    name: 'Python Optimizer & Refactor',
    desc: 'Performance bottlenecks review',
    text: 'Analyze my python code and tell me if there are any performance bottlenecks. Give me the optimized code block with comments explaining every change.',
  },
  {
    name: 'SQL Schema Query Generator',
    desc: 'Complex aggregations query',
    text: 'Write a SQL query to get the total purchase amount for all customers who bought a premium subscription plan last month. Also include their email address.',
  },
  {
    name: 'Support Assistant Agent',
    desc: 'Customer guardrails prompt',
    text: 'You are a friendly customer service assistant. Answer user questions about product returns. If they ask about other topics, just be helpful and answer them.',
  },
];

// ─── Detect template variables {{varName}} ────────────────────────────────────
const detectVariables = (text: string): string[] => {
  const matches = text.match(/\{\{([^}]+)\}\}/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map(m => m.replace(/[{}]/g, '').trim())));
};

// ─── Risk Badge Component ──────────────────────────────────────────────────────
const RiskBadge: React.FC<{ label: string; level: 'Low' | 'Moderate' | 'High' | 'Critical' | null | string }> = ({ label, level }) => {
  const normalizedLevel = (typeof level === 'string' && ['Low', 'Moderate', 'High', 'Critical'].includes(level))
    ? (level as 'Low' | 'Moderate' | 'High' | 'Critical')
    : null;
  const colors: Record<'Low' | 'Moderate' | 'High' | 'Critical', string> = {
    Low:      'text-emerald-800 bg-emerald-50 border-emerald-200',
    Moderate: 'text-amber-800 bg-amber-50 border-amber-200',
    High:     'text-rose-800 bg-rose-50 border-rose-200',
    Critical: 'text-rose-900 bg-rose-100 border-rose-300 font-extrabold',
  };
  const badgeClass = normalizedLevel ? colors[normalizedLevel] : 'text-text-muted bg-bg-secondary border-border-default';
  return (
    <div className="bg-bg-tertiary border border-border-default rounded-lg p-2 sm:p-2.5 text-center min-w-0 overflow-hidden flex flex-col justify-center">
      <span className="text-text-muted text-[10px] block mb-1 font-mono uppercase font-semibold truncate" title={label}>
        {label}
      </span>
      <span className={`font-bold uppercase tracking-wide text-[11px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded border truncate max-w-full inline-block ${badgeClass}`}>
        {normalizedLevel ?? 'Not assessed'}
      </span>
    </div>
  );
};

// ─── Score Bar Component ───────────────────────────────────────────────────────
const ScoreBar: React.FC<{ label: string; value: number | null | undefined }> = ({ label, value }) => {
  const isNumeric = typeof value === 'number' && Number.isFinite(value);
  return (
    <div className="space-y-1 min-w-0">
      <div className="flex justify-between items-center text-[11px] font-medium text-text-secondary font-mono gap-2">
        <span className="truncate" title={label}>{label}</span>
        {!isNumeric ? (
          <span className="font-bold text-text-muted shrink-0" title="Not scored by the model">—</span>
        ) : (
          <span className="font-bold text-text-primary shrink-0">{value}%</span>
        )}
      </div>
      <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden border border-border-default">
        {isNumeric && (
          <motion.div
            className="h-full rounded-full w-full"
            style={{
              background: (value ?? 0) >= 75 ? 'var(--brand-primary)' : (value ?? 0) >= 50 ? 'var(--text-muted)' : 'var(--accent-coral)',
              transformOrigin: 'left',
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: Math.max(0, Math.min(1, (value ?? 0) / 100)) }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          />
        )}
      </div>
    </div>
  );
};

// ─── Resilient Local Error Boundary for Analyzer Panels ───────────────────────
interface AnalyzerErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}
interface AnalyzerErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

export class AnalyzerErrorBoundary extends React.Component<AnalyzerErrorBoundaryProps, AnalyzerErrorBoundaryState> {
  constructor(props: AnalyzerErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any): AnalyzerErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message || 'Formatting error' };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.warn('[AnalyzerErrorBoundary captured render error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 sm:p-8 rounded-2xl bg-bg-secondary border border-border-default shadow-xs text-center space-y-4 my-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-text-primary">Analysis Report Display Issue</h4>
            <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
              We encountered an issue rendering this analysis report. Your prompt text is preserved. You can reset the findings or re-run the audit.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onReset?.();
              }}
              className="px-4 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hi transition-colors cursor-pointer min-h-[38px]"
            >
              Reset Report &amp; Re-run
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Result Tab type ──────────────────────────────────────────────────────────
type ResultTab = 'report' | 'comparison' | 'sandbox';

const sanitizeAnalysisResult = (raw: any): PromptAnalysisResult => {
  if (!raw || typeof raw !== 'object') {
    return {
      overall: 0,
      scoredCategories: 0,
      weakAreas: [],
      suggestions: [],
      securityIssues: [],
      totalTokens: 0,
      cost: '$0.00',
      clarity: null,
      context: null,
      specificity: null,
      constraints: null,
      outputDefinition: null,
      examples: null,
      structure: null,
      hallucinationRisk: null,
      injectionRisk: null,
      improved: null,
      summary: null,
      detectedIntent: 'General instruction',
      tokenSource: 'estimated',
      costSource: 'free',
      difficulty: 'Intermediate',
    } as any;
  }
  return {
    ...raw,
    weakAreas: Array.isArray(raw.weakAreas) ? raw.weakAreas.filter((w: any) => typeof w === 'string' && w.trim()) : [],
    suggestions: Array.isArray(raw.suggestions) ? raw.suggestions.filter((s: any) => typeof s === 'string' && s.trim()) : [],
    securityIssues: Array.isArray(raw.securityIssues) ? raw.securityIssues.filter((i: any) => typeof i === 'string' && i.trim()) : [],
    totalTokens: typeof raw.totalTokens === 'number' && Number.isFinite(raw.totalTokens) ? raw.totalTokens : 0,
    scoredCategories: typeof raw.scoredCategories === 'number' && Number.isFinite(raw.scoredCategories) ? raw.scoredCategories : 7,
    overall: typeof raw.overall === 'number' && Number.isFinite(raw.overall) ? raw.overall : 0,
    cost: typeof raw.cost === 'string' && raw.cost ? raw.cost : '$0.00',
    difficulty: typeof raw.difficulty === 'string' && raw.difficulty ? raw.difficulty : 'Production Ready',
    tokenSource: raw.tokenSource === 'provider_reported' ? 'provider_reported' : 'estimated',
    costSource: raw.costSource || 'free',
  };
};

/**
 * Inert trial state for signed-in visitors.
 *
 * This view is only ever rendered inside <AuthGuard> (App.tsx), so `isLoggedIn`
 * is always true here and the guest-trial banner/expiry gate below cannot
 * render. `analyzerTrialService.getOrStartTrial()` is NOT inert though — it
 * writes sessionStorage and fires a background POST to /api/analyzer-trial,
 * which registered an anonymous_trials row keyed by IP+User-Agent for every
 * authenticated visit to the Analyzer. Signed-in users start from this constant
 * instead, so nothing is claimed on their behalf.
 */
const NO_TRIAL: TrialState = {
  isActive: false,
  isExpired: false,
  remainingMs: 0,
  remainingSeconds: 0,
  formattedTime: '00:00',
  totalDurationSeconds: 0,
  hasStarted: false,
  executionCount: 0,
  isServerVerified: false,
};

// ─── Main View ─────────────────────────────────────────────────────────────────
export const AnalyzerView: React.FC = () => {
  const {
    createPrompt,
    setActivePromptId,
    setActiveTab,
    arenaPromptDraft,
    setArenaPromptDraft,
    isLoggedIn,
    showToast,
    setShowAuthModal,
    user
  } = useApp();

  const userTier = getUserPlanTier(user);
  const todayKey = new Date().toISOString().slice(0, 10);
  const userIdentifier = user?.id || 'guest';
  const dailyRunsKey = `ph_analyzer_runs_${userIdentifier}_${todayKey}`;

  const [dailyRuns, setDailyRuns] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(dailyRunsKey) || '0', 10);
    } catch {
      return 0;
    }
  });

  const dailyRunsLimit = user?.role === 'Admin' ? 999999 : userTier.analyzerRunsPerDay;
  const remainingRunsToday = Math.max(0, dailyRunsLimit - dailyRuns);


  const {
    workingPrompt,
    sendToStudio,
    sendToArena,
    sendToWork,
    acceptOptimizedPrompt,
  } = useWorkspace();

  // Persistent draft cache: preserves user's prompt input, analysis findings,
  // variable values, and selected tab across navigation and page refreshes.
  const savedDraft = React.useMemo<Partial<AnalyzerDraftState>>(() => draftPersistenceService.getAnalyzerDraft() || {}, []);

  const [promptText, setPromptText] = useState<string>(() => savedDraft.promptText || workingPrompt.rawContent || '');

  // Auto-fill draft if navigated from Studio or WorkspaceContext
  React.useEffect(() => {
    if (workingPrompt.rawContent && (!promptText || promptText.trim().length === 0)) {
      setPromptText(workingPrompt.rawContent);
    }
  }, [workingPrompt.rawContent]);

  // Auto-fill draft if navigated from Dashboard Quick Prompt Launcher or external source
  React.useEffect(() => {
    if (arenaPromptDraft && arenaPromptDraft.trim()) {
      setPromptText(arenaPromptDraft);
      setArenaPromptDraft('');
    }
  }, [arenaPromptDraft, setArenaPromptDraft]);
  const [isAnalyzing, setIsAnalyzing]     = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [results, setResults]             = useState<PromptAnalysisResult | null>(() => {
    if (!savedDraft.results || typeof savedDraft.results !== 'object') return null;
    if (typeof savedDraft.results.overall !== 'number' && !savedDraft.results.improved) return null;
    return sanitizeAnalysisResult(savedDraft.results);
  });
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  const [activeResultTab, setActiveResultTab] = useState<ResultTab>(() => (savedDraft.activeResultTab as ResultTab) || 'report');
  const [sandboxVals, setSandboxVals] = useState<Record<string, string>>(() => savedDraft.sandboxVals || {});
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSampleStarters, setShowSampleStarters] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const analyzerCameraInputRef = React.useRef<HTMLInputElement>(null);

  const processAnalyzerImage = async (file: File) => {
    if (isUploadingPhoto) return;
    setIsUploadingPhoto(true);
    try {
      const { markdownTag } = await uploadPromptImage(file, { showToast });
      setPromptText(prev => prev.trim() ? `${prev.trim()}${markdownTag}` : markdownTag.trimStart());
    } catch {
      // toast handled in uploadPromptImage
    } finally {
      setIsUploadingPhoto(false);
      if (analyzerCameraInputRef.current) {
        analyzerCameraInputRef.current.value = '';
      }
    }
  };

  const handleAnalyzerCameraSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processAnalyzerImage(file);
    }
  };

  const handleAnalyzerDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer?.types?.includes('Files')) {
      e.preventDefault();
      setIsDraggingPhoto(true);
    }
  };

  const handleAnalyzerDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPhoto(false);
  };

  const handleAnalyzerDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPhoto(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && ((file.type || '').startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i.test(file.name || ''))) {
      await processAnalyzerImage(file);
    }
  };

  const handleAnalyzerPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if ((items[i]?.type || '').startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          await processAnalyzerImage(file);
          break;
        }
      }
    }
  };
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(() => (savedDraft.selectionMode as SelectionMode) || 'automatic');
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (savedDraft.selectedModel && !isRetiredOrUnavailableFreeModel(savedDraft.selectedModel)) {
      return savedDraft.selectedModel;
    }
    const lastSelected = smartModelResolver.getLastSelectedModel();
    if (lastSelected && !isRetiredOrUnavailableFreeModel(lastSelected)) {
      return lastSelected;
    }
    const smart = smartModelResolver.resolveSmartDefaultModel('analyzer');
    return smart.status === 'resolved' ? smart.model.modelId : 'openrouter/free';
  });


  // Connect with global background analysis manager
  React.useEffect(() => {
    const unsubscribe = backgroundAnalysisService.subscribe((bgState) => {
      setIsAnalyzing(bgState.isAnalyzing);
      if (bgState.loadingStage) setLoadingStage(bgState.loadingStage);
      if (bgState.results) setResults(sanitizeAnalysisResult(bgState.results));
      if (bgState.error) setAnalysisError(bgState.error);
      // Only sync prompt text from background service if an analysis is actively in-flight
      if (bgState.isAnalyzing && bgState.promptText) {
        setPromptText(bgState.promptText);
      }
    });
    return () => unsubscribe();
  }, []);

  // Automatically save state changes to persistent draft storage
  React.useEffect(() => {
    draftPersistenceService.saveAnalyzerDraft({
      promptText,
      results,
      activeResultTab,
      sandboxVals,
      selectionMode,
      selectedModel,
    });
  }, [promptText, results, activeResultTab, sandboxVals, selectionMode, selectedModel]);

  const hasByok = multiProviderService.getConnectedProviders().length > 0;

  // 5-Minute Free Guest Trial State — unreachable while this view is AuthGuarded.
  const [trialState, setTrialState] = useState<TrialState>(() =>
    isLoggedIn || hasByok ? NO_TRIAL : analyzerTrialService.getOrStartTrial()
  );

  // 1-second interval to update remaining trial time for guest users
  React.useEffect(() => {
    if (isLoggedIn || hasByok) return;

    const interval = setInterval(() => {
      const state = analyzerTrialService.getOrStartTrial();
      setTrialState(state);
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoggedIn, hasByok]);

  // Dynamic OpenRouter Catalog state (excluding batch models)
  const [liveModels, setLiveModels] = useState<CatalogModel[]>(() => filterForRealTime(modelCatalogService.getCachedCatalog()));

  React.useEffect(() => {
    modelCatalogService.fetchCatalog().then((models) => {
      if (models && models.length > 0) setLiveModels(filterForRealTime(models));
    }).catch(() => {});
  }, []);

  const handleSendToArena = (textToSend?: string | null) => {
    const text = textToSend || results?.improved || promptText;
    if (!text.trim()) {
      showToast('Enter or generate a prompt first before sending to Arena.', 'error');
      return;
    }
    sendToArena(text);
  };

  // Cooldown timer
  const startCooldown = (seconds = 4) => {
    setCooldownRemaining(seconds);
    const interval = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // Cancel in-flight request
  const handleCancel = () => {
    backgroundAnalysisService.cancel();
    setIsAnalyzing(false);
    setLoadingStage('');
    setAnalysisError('Analysis cancelled.');
  };

  // Load a preset
  const loadPreset = (text: string) => {
    setPromptText(text);
    setResults(null);
    setAnalysisError(null);
    setSandboxVals({});
  };

  // Get selected model name
  const selectedModelObj = liveModels.find(m => m.id === selectedModel) || {
    name: selectedModel ? (selectedModel.split('/')[1] || selectedModel) : 'Default Model',
    provider: selectedModel ? (selectedModel.split('/')[0] || 'AI Provider') : 'PromptHub'
  };

  // Main analyze handler
  const handleAnalyze = async () => {
    if (!promptText.trim() || isAnalyzing || cooldownRemaining > 0) return;

    // Check if guest trial has expired
    if (!isLoggedIn && !hasByok && trialState.isExpired) {
      setShowAuthModal(true);
      showToast('Your 5-minute free trial has ended. Please sign in or create a free account to continue.', 'info');
      return;
    }

    // Pre-flight: If guest selected a premium model without BYOK, prompt to sign in
    if (!isLoggedIn && !hasByok && !isFreeModel(selectedModel)) {
      setShowAuthModal(true);
      showToast('Please sign in or connect an API key to analyze with premium models.', 'info');
      return;
    }

    // Check if user has exceeded daily limit
    if (user?.role !== 'Admin' && dailyRuns >= dailyRunsLimit) {
      setAnalysisError(`You have reached your daily limit of ${userTier.analyzerRunsPerDay} analyses on the ${userTier.name} plan. Upgrade your plan to increase your daily analysis capacity.`);
      setShowUpgradeModal(true);
      return;
    }

    const limit = securityUtils.rateLimit('ai_analysis', 4000);
    if (!limit.allowed) {
      setAnalysisError(limit.error || 'Spam prevention active. Please wait.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setResults(null);
    setActiveResultTab('report');

    const startTime = Date.now();
    trackPromptAnalyzed({
      model: selectedModel,
      prompt_length: promptText.trim().length,
      has_image: false,
      analysis_type: 'full_audit',
    });

    try {
      const result = await backgroundAnalysisService.startAnalysis(promptText, selectedModel, selectedModelObj.name);
      const sanitized = sanitizeAnalysisResult(result);
      setResults(sanitized);
      const nextRuns = dailyRuns + 1;
      setDailyRuns(nextRuns);
      try {
        localStorage.setItem(dailyRunsKey, String(nextRuns));
      } catch {}
      setSandboxVals({});
      startCooldown(4);
      trackAnalysisCompleted({
        duration_ms: Date.now() - startTime,
        model: sanitized.actualModel || selectedModel,
        token_estimate: sanitized.totalTokens,
        success: true,
      });
      trackMixpanelPromptAnalyzed({
        model: sanitized.actualModel || selectedModel,
        score: sanitized.overall,
        durationMs: Date.now() - startTime,
        issueCount: (sanitized.weakAreas?.length || 0) + (sanitized.securityIssues?.length || 0),
        promptLength: promptText.trim().length,
        analysisMode: 'analyze',
      });
    } catch (err: any) {
      if (err?.message !== 'Analysis cancelled.' && err?.name !== 'AbortError') {
        const isAuthError = 
          err?.status === 401 ||
          err?.code === 'UNAUTHENTICATED' ||
          err?.code === 'AUTH_REQUIRED' ||
          err?.message?.includes('Please sign in') ||
          err?.message?.includes('Authentication required') ||
          err?.message?.includes('Unauthorized') ||
          err?.message?.includes('AUTH_REQUIRED');

        if (isAuthError) {
          if (!isLoggedIn && !hasByok) {
            setShowAuthModal(true);
            setAnalysisError('Please sign in to analyze prompts with this model.');
          } else {
            setShowUpgradeModal(true);
          }
        } else if (err?.message?.includes('CREDITS_EXHAUSTED')) {
          setShowUpgradeModal(true);
        } else {
          setAnalysisError(err.message || 'Analysis failed. Please try again.');
        }
        trackAnalysisFailed({
          model: selectedModel,
          error_type: err?.message || 'unknown',
          timeout: false,
        });
      }
    } finally {
      setIsAnalyzing(false);
      setLoadingStage('');
    }
  };

  // Global Ctrl+Enter dispatcher listener for Analyzer view
  useEffect(() => {
    const handleGlobalCtrlEnter = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.activeTab && detail.activeTab !== 'analyzer') return;
      if (!isAnalyzing && promptText.trim() && cooldownRemaining <= 0) {
        handleAnalyze();
      }
    };
    window.addEventListener('ph_global_ctrl_enter', handleGlobalCtrlEnter);
    return () => {
      window.removeEventListener('ph_global_ctrl_enter', handleGlobalCtrlEnter);
    };
  }, [isAnalyzing, promptText, cooldownRemaining]);

  const handleOpenInWorkspace = async () => {
    if (!results?.improved) return;
    trackAiSuggestionAccepted({ suggestion_type: 'open_in_workspace' });
    try {
      if (user) {
        const newPrompt = await createPrompt({
          title: results.detectedIntent || 'AI Optimized Prompt',
          description: `Optimized by PromptHub Analyzer (${results.difficulty || 'Intermediate'} · ${results.overall}% quality)`,
          rawContent: results.improved,
          model: results.recommendedModel || selectedModel,
          category: 'Development',
          tags: ['analyzed', 'optimized', (results.taskType || 'prompt').toLowerCase()],
          visibility: 'private',
        });
        setActivePromptId(newPrompt.id);
      } else {
        draftPersistenceService.saveWorkspaceDraft({
          title: results.detectedIntent || 'AI Optimized Prompt',
          description: `Optimized by PromptHub Analyzer (${results.difficulty || 'Intermediate'} · ${results.overall}% quality)`,
          rawContent: results.improved,
          model: results.recommendedModel || selectedModel,
          category: 'Development',
        });
      }
      sendToStudio(results.improved, results.recommendedModel || selectedModel, results.detectedIntent || 'AI Optimized Prompt');
    } catch {
      draftPersistenceService.saveWorkspaceDraft({
        title: results.detectedIntent || 'AI Optimized Prompt',
        description: `Optimized by PromptHub Analyzer`,
        rawContent: results.improved,
        model: results.recommendedModel || selectedModel,
        category: 'Development',
      });
      setActivePromptId(null);
      sendToStudio(results.improved, results.recommendedModel || selectedModel, results.detectedIntent || 'AI Optimized Prompt');
    }
  };

  const handleDownloadAuditReport = (format: 'markdown' | 'json') => {
    if (!results) return;
    const content = format === 'markdown'
      ? exportAuditReportToMarkdown(promptText, results, selectedModelObj.name)
      : exportAuditReportToJson(promptText, results, selectedModelObj.name);

    const mime = format === 'markdown' ? 'text/markdown' : 'application/json';
    const ext = format === 'markdown' ? 'md' : 'json';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-audit-${new Date().toISOString().split('T')[0]}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Audit report downloaded as .${ext}`, 'success');
  };

  const detectedVars = detectVariables(results?.improved || promptText);

  const getCompiledPrompt = () => {
    if (!results?.improved) return '';
    return securityUtils.compilePromptVariables(results.improved, sandboxVals, { preserveUnmatched: true });
  };

  const charCount = promptText.length;
  const wordCount = promptText.trim() ? promptText.trim().split(/\s+/).length : 0;

  const tabItems: { id: ResultTab; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    { id: 'report',     label: 'Diagnostic Audit',   shortLabel: 'Audit',   icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'comparison', label: 'Side-by-Side Diff',  shortLabel: 'Diff',    icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
    { id: 'sandbox',    label: `Variable Sandbox (${detectedVars.length})`, shortLabel: `Sandbox (${detectedVars.length})`, icon: <Sliders className="w-3.5 h-3.5" /> },
  ];

  // ── 5-Minute Free Trial Expiration Gate (Only shown when unauthenticated, without BYOK, AND the 5-minute trial expired) ──
  if (!isLoggedIn && !hasByok && trialState.isExpired) {
    return (
      <div className="flex-1 p-4 sm:p-6 md:p-12 overflow-y-auto bg-bg-primary flex items-center justify-center min-h-[80vh] select-text">
        <div className="max-w-lg w-full p-6 sm:p-8 rounded-2xl bg-bg-secondary border border-border-default shadow-md space-y-5 text-center relative overflow-hidden">
          {/* Clock Icon Badge */}
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
            <Clock className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold font-mono">
              <span>5-Minute Free Trial Completed</span>
            </div>
            <h2 className="text-2xl font-bold font-display text-text-primary tracking-tight">
              Create Your Free Account to Continue
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed max-w-md mx-auto">
              You've experienced PromptHub's deterministic 7-category prompt audit engine. Sign up free in 10 seconds to keep running free models at no cost, save prompts to your library, and continue optimizing.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left pt-1">
            <div className="p-3 rounded-lg bg-bg-tertiary border border-border-default space-y-0.5">
              <div className="text-brand-primary font-semibold text-xs flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Pay-As-You-Go</span>
              </div>
              <div className="text-[10px] text-text-muted leading-tight">Top up credits anytime, no subscription required.</div>
            </div>
            <div className="p-3 rounded-lg bg-bg-tertiary border border-border-default space-y-0.5">
              <div className="text-brand-primary font-semibold text-xs flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Prompt Vault</span>
              </div>
              <div className="text-[10px] text-text-muted leading-tight">Save, version & export prompts.</div>
            </div>
            <div className="p-3 rounded-lg bg-bg-tertiary border border-border-default space-y-0.5">
              <div className="text-brand-primary font-semibold text-xs flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Multi-Model Arena</span>
              </div>
              <div className="text-[10px] text-text-muted leading-tight">Run live head-to-head battles.</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create Free Account</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('credentials')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-bg-tertiary hover:bg-border-subtle border border-border-default text-text-primary text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <span>Use BYOK Key</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="flex-1 px-4 sm:px-6 md:px-8 pt-6 pb-12 bg-bg-primary text-text-primary select-text space-y-5 sm:space-y-6 max-w-7xl mx-auto w-full">

      {/* ── 5-Minute Free Guest Trial Active Banner ── */}
      {!isLoggedIn && !hasByok && trialState.isActive && (
        <div className="bg-bg-secondary border border-brand-primary/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary dark:text-[#41A2D9] flex items-center justify-center border border-brand-primary/20 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-text-primary">5-Minute Free Guest Trial Active</span>
                <span className="px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold bg-brand-primary text-white shadow-2xs">
                  ⏱️ {trialState.formattedTime} Remaining
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                You can audit and optimize prompts on free models for the rest of the trial window. Sign up to save your prompts permanently and keep running free models at no cost.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer whitespace-nowrap min-h-[38px] flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create Free Account</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Editorial Header (Image 3: QUALITY / PROMPT REVIEW) ─────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-border-default">
        <div className="space-y-1 min-w-0">
          <div className="text-[11px] font-mono font-semibold tracking-[0.14em] text-[#7A7E75] dark:text-[#9AA0A6] uppercase">
            QUALITY / PROMPT REVIEW
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-primary tracking-tight">
            Find the weak seams.
          </h1>
          <p className="text-text-secondary text-xs sm:text-sm leading-relaxed max-w-2xl">
            Score prompts across clarity, constraint adherence, edge-case resilience, and hallucination defense.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EBF5ED] dark:bg-[#1A3326] text-[11px] font-mono font-semibold text-[#2D6A4F] dark:text-[#86A696] border border-[#D0E6D5] dark:border-[#224A38]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span>Local workspace ready</span>
          </div>
          <AICreditBadge onClick={() => setShowUpgradeModal(true)} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 text-left">

        {/* ── Left: Input Panel ──────────────────────────────────────────────── */}
        <div className="lg:col-span-1 flex flex-col gap-3 min-w-0">
          {/* Textarea & Controls */}
          <div className="bg-bg-secondary border border-border-default rounded-xl p-3.5 sm:p-4 space-y-3 shadow-xs flex-1 flex flex-col min-w-0">
            <div className="flex flex-wrap justify-between items-center border-b border-border-subtle pb-2 gap-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                Prompt Input
              </h4>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-[10px] text-text-muted font-mono">
                  {charCount} chars · {wordCount} words
                </span>
                {/* Hidden camera file input */}
                <input
                  ref={analyzerCameraInputRef}
                  type="file"
                  accept="image/*"
                  disabled={isUploadingPhoto}
                  onChange={handleAnalyzerCameraSelect}
                  className="hidden"
                  aria-hidden="true"
                />

                <button
                  type="button"
                  onClick={() => analyzerCameraInputRef.current?.click()}
                  disabled={isUploadingPhoto || isAnalyzing}
                  className="text-[10px] text-brand-primary hover:text-brand-primary-hi flex items-center gap-1 cursor-pointer transition-colors p-0.5 rounded min-h-[44px] sm:min-h-[24px]"
                  title="Attach Photo / Image Context"
                  aria-label="Attach Photo"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Camera className="w-3 h-3" />
                  )}
                  <span>{isUploadingPhoto ? 'Uploading...' : 'Photo'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsVoiceModalOpen(true)}
                  disabled={isAnalyzing}
                  className="text-[10px] text-brand-primary hover:text-brand-primary-hi flex items-center gap-1 cursor-pointer transition-colors p-0.5 rounded min-h-[44px] sm:min-h-[24px]"
                  title="Dictate prompt with AI Voice"
                >
                  <Mic className="w-3 h-3" /> Voice
                </button>
                {promptText && !isAnalyzing && (
                  <button
                    type="button"
                    onClick={() => { setPromptText(''); setResults(null); setAnalysisError(null); setSandboxVals({}); }}
                    className="text-[10px] text-text-muted hover:text-text-primary flex items-center gap-1 cursor-pointer transition-colors p-0.5 rounded min-h-[44px] sm:min-h-[24px]"
                  >
                    <RotateCcw className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
            </div>

            <div className="relative flex-1 flex flex-col">
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                data-tour="tour-analyzer-input"
                onKeyDown={(e) => {
                  if (
                    (e.ctrlKey || e.metaKey) &&
                    (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13)
                  ) {
                    e.preventDefault();
                    if (!isAnalyzing && promptText.trim()) {
                      handleAnalyze();
                    }
                  }
                }}
                onDragOver={handleAnalyzerDragOver}
                onDragLeave={handleAnalyzerDragLeave}
                onDrop={handleAnalyzerDrop}
                onPaste={handleAnalyzerPaste}
                placeholder="Paste or write your prompt here to inspect structure, clarity, constraints, and risks... (Ctrl+Enter to analyze)"
                aria-label="Prompt text to analyze"
                disabled={isAnalyzing}
                className="flex-1 w-full min-h-[120px] sm:min-h-[150px] bg-bg-tertiary border border-border-default rounded-lg p-3 text-base sm:text-xs font-mono text-text-primary focus:border-brand-primary focus:outline-none resize-none leading-relaxed disabled:opacity-60 transition-colors placeholder:text-text-muted custom-scrollbar"
              />

              {isDraggingPhoto && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-brand-primary/10 border-2 border-dashed border-brand-primary rounded-lg backdrop-blur-[1px] pointer-events-none text-xs font-semibold text-brand-primary gap-1">
                  <Camera className="w-6 h-6 animate-pulse text-brand-primary" />
                  <span>Drop photo here to attach to prompt audit</span>
                </div>
              )}
            </div>

            {/* Optional Collapsible Starter Link */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setShowSampleStarters(!showSampleStarters)}
                className="text-[11px] font-mono text-text-muted hover:text-brand-primary flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Sparkles className="w-3 h-3 text-brand-primary shrink-0" />
                <span>Need a starting point? Load a template</span>
              </button>

              <AnimatePresence>
                {showSampleStarters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 overflow-hidden"
                  >
                    {PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => {
                          loadPreset(p.text);
                          setShowSampleStarters(false);
                        }}
                        disabled={isAnalyzing}
                        className="p-2.5 rounded-lg border border-border-default bg-bg-tertiary hover:border-border-hover text-left transition-colors cursor-pointer disabled:opacity-40 min-h-[38px] min-w-0 overflow-hidden"
                      >
                        <div className="text-[11px] font-semibold text-text-primary truncate">{p.name}</div>
                        <div className="text-[10px] text-text-muted mt-0.5 leading-tight truncate">{p.desc}</div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Variable pills detected from prompt */}
            {detectedVars.length > 0 && !results && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] text-text-muted font-mono font-semibold uppercase w-full">Detected Variables:</span>
                {detectedVars.map(v => (
                  <span key={v} className="text-[10px] font-mono font-semibold bg-brand-primary-light text-brand-primary px-2 py-0.5 rounded border border-brand-primary/20">
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            )}

            {/* Model Target selector */}
            <div className="space-y-1.5 pt-2 border-t border-border-default">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-brand-primary" /> Evaluation Engine:
                </label>
                <button
                  type="button"
                  onClick={() => setIsModelModalOpen(true)}
                  className="text-[10px] text-brand-primary hover:underline font-mono cursor-pointer"
                >
                  Change Engine
                </button>
              </div>
              <ActiveModelBadge
                modelId={selectedModel}
                feature="analyzer"
                selectionMode={selectionMode}
                onClick={() => setIsModelModalOpen(true)}
                className="w-full justify-between"
              />
            </div>

            {/* Action Bar */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (remainingRunsToday <= 0 && user?.role !== 'Admin') {
                    setShowUpgradeModal(true);
                    return;
                  }
                  handleAnalyze();
                }}
                disabled={isAnalyzing || (!promptText.trim() && remainingRunsToday > 0) || cooldownRemaining > 0}
                className={`w-full py-2.5 rounded-lg text-white text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px] hover:-translate-y-px active:scale-[0.98] ${
                  remainingRunsToday <= 0 && user?.role !== 'Admin'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-brand-primary hover:bg-brand-primary-hi'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : remainingRunsToday <= 0 && user?.role !== 'Admin' ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Daily Limit Reached — Upgrade Plan</span>
                  </>
                ) : (
                  <>
                    <PromptAnalyzerIcon className="w-3.5 h-3.5" />
                    <span>Analyze Prompt →</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-[11px] font-mono text-text-muted px-1">
                <span>Daily analyses:</span>
                <span className={remainingRunsToday <= 0 && user?.role !== 'Admin' ? 'text-amber-600 font-bold' : 'font-semibold text-text-primary'}>
                  {user?.role === 'Admin' ? 'Unlimited (Admin)' : `${remainingRunsToday} / ${userTier.analyzerRunsPerDay} left today (${userTier.name})`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Results Panel ────────────────────────────────────────────── */}
        <div data-tour="tour-analyzer-breakdown" className="lg:col-span-2 relative min-h-[400px]">
          <AnimatePresence mode="wait">

            {/* Loading state */}
            {isAnalyzing && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-bg-secondary/90 backdrop-blur-xs flex flex-col items-center justify-center border border-border-default rounded-xl gap-4 z-10 p-6"
              >
                <div className="w-8 h-8 rounded-full border-2 border-brand-primary/20 border-t-brand-primary animate-spin" />
                <div className="text-center space-y-1">
                  <p className="text-xs font-bold text-text-primary">Auditing with {selectedModelObj.name}</p>
                  <p className="text-[11px] text-text-secondary font-mono">{loadingStage}</p>
                </div>

                {/* Fast Output Upgrade Banner */}
                <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-md w-full text-left shadow-2xs">
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
                  Cancel
                </button>
              </motion.div>
            )}

            {/* Error state */}
            {analysisError && !isAnalyzing && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="h-full border border-rose-200 bg-rose-50/50 rounded-xl flex flex-col items-center justify-center py-16 text-center gap-3 px-6"
              >
                <XCircle className="w-8 h-8 text-rose-600" />
                <div>
                  <h4 className="text-xs font-bold text-rose-900">Analysis Unavailable</h4>
                  <p className="text-xs text-rose-700 mt-1 leading-relaxed max-w-sm">{analysisError}</p>
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={!promptText.trim()}
                  className="px-4 py-2 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Retry Analysis
                </button>
              </motion.div>
            )}

            {/* Empty state */}
            {!results && !isAnalyzing && !analysisError && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full border border-dashed border-border-default rounded-xl flex flex-col items-center justify-center py-20 text-center bg-bg-secondary gap-4 shadow-xs"
              >
                <div className="w-12 h-12 rounded-lg bg-bg-tertiary border border-border-default flex items-center justify-center text-text-muted">
                  <PromptAnalyzerIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-text-primary">Your analysis will appear here.</h4>
                  <p className="text-xs text-text-secondary max-w-xs leading-relaxed">
                    Write a prompt and run the analyzer to inspect clarity, structure, constraints and risks.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── Results ──────────────────────────────────────────────────────── */}
            {results && !isAnalyzing && (
              <AnalyzerErrorBoundary onReset={() => { setResults(null); draftPersistenceService.clearAnalyzerDraft(); }}>
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >

                {/* Quick stats bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                  {[
                    {
                      label: 'Quality Score',
                      value: `${results.overall ?? 0}%`,
                      sub: results.difficulty || 'Analysis Complete',
                      color: (results.overall ?? 0) >= 75 ? 'text-emerald-500 font-extrabold' : (results.overall ?? 0) >= 50 ? 'text-brand-primary font-bold' : 'text-amber-500 font-bold'
                    },
                    {
                      label: 'Total Tokens',
                      value: (typeof results.totalTokens === 'number' ? results.totalTokens : 0).toLocaleString(),
                      sub: results.tokenSource === 'provider_reported' ? 'Reported' : 'Estimated',
                      color: 'text-text-primary'
                    },
                    {
                      label: 'Est. Cost',
                      value: results.cost || '$0.00',
                      sub:
                        results.costSource === 'catalog_calculated'
                          ? 'Catalog rate'
                          : results.costSource === 'free'
                          ? 'Free tier'
                          : 'Not priced',
                      color: 'text-text-primary'
                    },
                    {
                      label: 'Audited Status',
                      value: (results.overall ?? 0) >= 85 
                        ? 'Production Ready' 
                        : (results.overall ?? 0) >= 70 
                        ? 'Production Ready' 
                        : 'Needs Polish',
                      sub: results.difficulty || 'Intermediate',
                      color: (results.overall ?? 0) >= 70 ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'
                    },
                  ].map(stat => (
                    <div key={stat.label} className="bg-bg-secondary border border-border-default rounded-xl p-2 sm:p-3 text-center shadow-xs min-w-0 overflow-hidden flex flex-col justify-center">
                      <div className={`text-xs sm:text-sm md:text-base font-bold font-mono truncate ${stat.color}`} title={stat.value}>{stat.value}</div>
                      <div className="text-[9.5px] sm:text-[10px] text-text-muted uppercase font-mono font-semibold mt-0.5 truncate" title={stat.label}>{stat.label}</div>
                      <div className="text-[9px] text-text-muted font-mono mt-0.5 truncate" title={stat.sub}>{stat.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Audit Actions & Exporters Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-bg-secondary border border-border-default rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs text-text-muted font-mono">
                    <FileText className="w-3.5 h-3.5 text-brand-primary" />
                    <span>Audit Deliverables:</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDownloadAuditReport('markdown')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-bg-primary hover:bg-bg-tertiary border border-border-default text-[11px] font-medium text-text-primary transition-colors cursor-pointer min-h-[30px]"
                      title="Download full audit report in Markdown format"
                    >
                      <Download className="w-3 h-3 text-brand-primary dark:text-[#41A2D9]" />
                      <span>Export .MD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadAuditReport('json')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-bg-primary hover:bg-bg-tertiary border border-border-default text-[11px] font-medium text-text-primary transition-colors cursor-pointer min-h-[30px]"
                      title="Export structured JSON audit payload"
                    >
                      <Download className="w-3 h-3 text-brand-primary" />
                      <span>Export JSON</span>
                    </button>
                  </div>
                </div>

                {/* Tab switcher */}
                <div className="grid grid-cols-3 gap-1 bg-bg-tertiary border border-border-default rounded-lg p-1 select-none">
                  {tabItems.map(tab => {
                    const isActive = activeResultTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveResultTab(tab.id)}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 sm:px-3 rounded-md text-xs font-semibold transition-all cursor-pointer min-h-[44px] sm:min-h-[36px] min-w-0 ${
                          isActive
                            ? 'bg-bg-secondary text-text-primary shadow-xs border border-border-default'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary/40 border border-transparent'
                        }`}
                      >
                        <span className="shrink-0">{tab.icon}</span>
                        <span className="truncate sm:hidden">{tab.shortLabel}</span>
                        <span className="truncate hidden sm:inline">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Tab content */}
                <AnimatePresence mode="wait">

                  {/* ── TAB 1: Diagnostic Report ─────────────────────────────── */}
                  {activeResultTab === 'report' && (
                    <motion.div
                      key="report"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-4"
                    >
                      {/* Score ring + summary */}
                      <div className="bg-bg-secondary border border-border-default rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-center gap-4 sm:gap-5 shadow-xs min-w-0">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-bg-tertiary border border-border-default flex flex-col items-center justify-center shrink-0">
                          <span className="text-xl sm:text-2xl font-black font-mono text-text-primary leading-none">{results.overall}%</span>
                          <span className="text-[9px] text-text-muted font-mono uppercase font-bold mt-1 truncate max-w-[90%]">{results.difficulty}</span>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5 text-center md:text-left w-full">
                          <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 sm:gap-2">
                            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">Audit Summary</h4>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-brand-primary-light text-brand-primary font-mono font-semibold">
                              {results.taskType}
                            </span>
                            {results.actualModel && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary border border-border-default font-mono max-w-full truncate inline-block" title={`Model: ${results.actualModel}`}>
                                Model: {results.actualModel}
                              </span>
                            )}
                            {results.recommendedModel && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary dark:text-[#41A2D9] border border-brand-primary/20 font-mono max-w-full truncate inline-block" title={`Recommended: ${results.recommendedModel}`}>
                                Recommended: {results.recommendedModel}
                              </span>
                            )}
                          </div>
                          {results.summary ? (
                            <p className="text-xs text-text-secondary leading-relaxed break-words">{results.summary}</p>
                          ) : (
                            <p className="text-xs text-text-muted leading-relaxed break-words italic">
                              The model returned scores but no written summary.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Optimized Prompt CTA Card */}
                      {results.improved && (
                        <div className="bg-brand-primary/5 dark:bg-brand-primary/10 border border-brand-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Sparkles className="w-4 h-4 text-brand-primary shrink-0" />
                              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
                                Production-Engineered Prompt Ready
                              </h4>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                                {results.overall}% Quality
                              </span>
                            </div>
                            <p className="text-xs text-text-secondary leading-relaxed">
                              Ambiguities eliminated, structured constraints applied, and role calibrated. Run it immediately or refine in Studio IDE.
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={handleOpenInWorkspace}
                              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer min-h-[40px] whitespace-nowrap"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Open in Prompt Studio &rarr;</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveResultTab('comparison')}
                              className="px-3 py-2 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-text-primary text-xs font-medium transition-colors cursor-pointer min-h-[40px] whitespace-nowrap"
                            >
                              <span>View Diff</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Diagnostic scores (7 Categories) */}
                      <div className="bg-bg-secondary border border-border-default rounded-xl p-4 sm:p-5 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between border-b border-border-default pb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                            <span>7-Point Quality Breakdown</span>
                          </h4>
                          <span className="text-[10px] text-text-muted font-mono font-semibold">
                            {/* The mean is taken over the categories the model actually
                                scored, so the denominator is stated rather than implied
                                to be 7. */}
                            Mean of {results.scoredCategories ?? 7}/7 scored: {results.overall ?? 0}%
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5 pt-1">
                          <ScoreBar label="Clarity" value={results.clarity} />
                          <ScoreBar label="Specificity" value={results.specificity} />
                          <ScoreBar label="Context" value={results.context} />
                          <ScoreBar label="Constraints" value={results.constraints} />
                          <ScoreBar label="Output Schema" value={results.outputDefinition} />
                          <ScoreBar label="Examples" value={results.examples} />
                          <ScoreBar label="Structure" value={results.structure} />
                        </div>
                      </div>

                      {/* Risk + Vulnerabilities */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                        {/* Vulnerabilities */}
                        <div className="bg-bg-secondary border border-border-default rounded-xl p-4 space-y-2.5 shadow-xs min-w-0">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Vulnerabilities &amp; Gaps</span>
                          </h4>
                          {(Array.isArray(results.weakAreas) && results.weakAreas.length > 0) ? (
                            <ul className="list-disc pl-4 space-y-1 text-xs text-text-secondary">
                              {results.weakAreas.map((w, i) => (
                                <li key={i} className="break-words leading-relaxed">{w}</li>
                              ))}
                            </ul>
                          ) : (
                            <div className="flex items-center gap-1.5 text-emerald-700 text-xs py-2 font-medium">
                              <ShieldCheck className="w-4 h-4 shrink-0" />
                              <span>No structural weaknesses detected.</span>
                            </div>
                          )}
                        </div>

                        {/* Security & Risk */}
                        <div className="bg-bg-secondary border border-border-default rounded-xl p-4 space-y-2.5 shadow-xs min-w-0">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                            <span>Risk Analysis</span>
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            <RiskBadge label="Hallucination" level={results.hallucinationRisk} />
                            <RiskBadge label="Injection Risk" level={results.injectionRisk} />
                          </div>
                        </div>
                      </div>

                      {/* Suggestions */}
                      {(Array.isArray(results.suggestions) && results.suggestions.length > 0) && (
                        <div className="bg-bg-secondary border border-border-default rounded-xl p-4 space-y-2.5 shadow-xs min-w-0">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                            <span>Optimization Directives</span>
                          </h4>
                          <ul className="space-y-1.5">
                            {results.suggestions.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-text-secondary leading-relaxed">
                                <span className="text-brand-primary font-bold shrink-0 mt-0.5">{i + 1}.</span>
                                <span className="break-words flex-1">{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* ── TAB 2: Side-by-Side Comparison ──────────────────────── */}
                  {activeResultTab === 'comparison' && (
                    <motion.div
                      key="comparison"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-3"
                    >
                      <PromptDiffViewer
                        original={promptText}
                        improved={results.improved || ''}
                      />

                      {/* Primary Action Buttons */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => acceptOptimizedPrompt(results.improved || '')}
                          data-tour="tour-analyzer-apply"
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer min-h-[40px] text-center"
                        >
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Accept &amp; Save</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenInWorkspace}
                          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-white text-xs font-semibold shadow-sm transition-all cursor-pointer min-h-[40px] text-center"
                        >
                          <Play className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Open in Studio</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendToArena(results.improved)}
                          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-brand-primary-light hover:bg-brand-primary/20 text-brand-primary border border-brand-primary/30 text-xs font-semibold shadow-xs transition-all cursor-pointer min-h-[40px] text-center"
                        >
                          <Swords className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Compare in Arena</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => sendToWork({ title: results.detectedIntent || 'Optimized Prototype', prompt: results.improved || promptText })}
                          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-bg-secondary hover:bg-bg-tertiary text-text-primary border border-border-default text-xs font-semibold shadow-xs transition-all cursor-pointer min-h-[40px] text-center"
                        >
                          <Code2 className="w-3.5 h-3.5 shrink-0 text-brand-primary" />
                          <span className="truncate">Build in Work IDE</span>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── TAB 3: Template Sandbox ──────────────────────────────── */}
                  {activeResultTab === 'sandbox' && (
                    <motion.div
                      key="sandbox"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-4"
                    >
                      {detectedVars.length > 0 ? (
                        <>
                          {/* Variable inputs */}
                          <div className="bg-bg-secondary border border-border-default rounded-xl p-4 space-y-3 shadow-xs">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono flex items-center gap-1.5">
                              <Sliders className="w-3.5 h-3.5 text-brand-primary" /> Dynamic Variables ({detectedVars.length})
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {detectedVars.map(v => (
                                <div key={v} className="space-y-1">
                                  <label className="text-[10px] font-bold text-brand-primary font-mono">{`{{${v}}}`}</label>
                                  <input
                                    type="text"
                                    value={sandboxVals[v] || ''}
                                    onChange={e => setSandboxVals((prev: Record<string, string>) => ({ ...prev, [v]: e.target.value }))}
                                    placeholder={`Value for ${v}...`}
                                    className="w-full bg-bg-tertiary border border-border-default rounded-md px-3 py-1.5 text-xs text-text-primary font-mono focus:border-brand-primary focus:outline-none"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Compiled preview */}
                          <div className="bg-bg-secondary border border-border-default rounded-xl p-4 space-y-3 shadow-xs">
                            <div className="flex items-center justify-between border-b border-border-default pb-2">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono flex items-center gap-1.5">
                                <Cpu className="w-3.5 h-3.5 text-brand-primary" /> Compiled Output
                              </h4>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(getCompiledPrompt());
                                }}
                                className="px-2.5 py-1 rounded bg-bg-tertiary hover:bg-border-subtle text-[11px] font-medium text-text-primary transition-colors cursor-pointer"
                              >
                                Copy Compiled
                              </button>
                            </div>
                            <pre className="bg-bg-tertiary border border-border-default rounded-lg p-3 text-xs font-mono text-text-primary whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto select-text">
                              {getCompiledPrompt()}
                            </pre>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center gap-2 border border-dashed border-border-default rounded-xl bg-bg-secondary shadow-xs">
                          <Sliders className="w-6 h-6 text-text-muted" />
                          <h4 className="text-xs font-bold text-text-primary">No Template Variables Detected</h4>
                          <p className="text-[11px] text-text-secondary max-w-xs">
                            Use <code className="font-mono text-brand-primary">{'{{var_name}}'}</code> syntax to test dynamic variables in real-time.
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}

                </AnimatePresence>
              </motion.div>
            </AnalyzerErrorBoundary>
          )}

          </AnimatePresence>
        </div>
      </div>
    </div>

    <AIUpgradeModal
      isOpen={showUpgradeModal}
      onClose={() => setShowUpgradeModal(false)}
      mode={isLoggedIn ? 'credits' : 'guest'}
    />

    <ModelSelectorModal
      isOpen={isModelModalOpen}
      onClose={() => setIsModelModalOpen(false)}
      selectedModelId={selectedModel}
      feature="analyzer"
      onSelectModel={(modelId) => {
        setSelectedModel(modelId);
        setSelectionMode('explicit-user-selection');
        smartModelResolver.setLastSelectedModel(modelId);
        setIsModelModalOpen(false);
      }}
    />

    <VoicePromptModal
      isOpen={isVoiceModalOpen}
      onClose={() => setIsVoiceModalOpen(false)}
      onTranscriptReady={(transcript) => {
        setPromptText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }}
    />
    </>
  );
};

export default AnalyzerView;
