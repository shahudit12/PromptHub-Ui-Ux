/**
 * src/services/ai/backgroundAnalysisService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Global Background Prompt Analysis Engine for PromptHub.
 *
 * Runs prompt analyses asynchronously in the background so that:
 * 1. Switching tabs inside PromptHub (e.g. Analyzer -> Workspace) does NOT
 *    abort or lose in-flight analysis results.
 * 2. Switching to another browser tab / app keeps the analysis alive and
 *    notifies the user when completed.
 * 3. Results are saved immediately to persistent draft storage.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { analyzePrompt, type PromptAnalysisResult } from '../../lib/openrouter';
import { draftPersistenceService } from '../draftPersistenceService';
import { securityUtils } from '../../utils/security';

export interface BackgroundAnalysisState {
  isAnalyzing: boolean;
  promptText: string;
  model: string;
  startTime: number;
  loadingStage: string;
  results: PromptAnalysisResult | null;
  error: string | null;
}

type Listener = (state: BackgroundAnalysisState) => void;

class BackgroundAnalysisManager {
  private state: BackgroundAnalysisState = {
    isAnalyzing: false,
    promptText: '',
    model: '',
    startTime: 0,
    loadingStage: '',
    results: null,
    error: null,
  };

  private listeners = new Set<Listener>();
  private activeAbortController: AbortController | null = null;
  private stageInterval: any = null;

  constructor() {
    // Restore any existing persisted analyzer draft on startup
    const saved = draftPersistenceService.getAnalyzerDraft();
    if (saved) {
      this.state.promptText = saved.promptText || '';
      if (saved.results && typeof saved.results === 'object' && (typeof saved.results.overall === 'number' || saved.results.improved)) {
        this.state.results = {
          ...saved.results,
          weakAreas: Array.isArray(saved.results.weakAreas) ? saved.results.weakAreas : [],
          suggestions: Array.isArray(saved.results.suggestions) ? saved.results.suggestions : [],
          securityIssues: Array.isArray(saved.results.securityIssues) ? saved.results.securityIssues : [],
          totalTokens: typeof saved.results.totalTokens === 'number' ? saved.results.totalTokens : 0,
          scoredCategories: typeof saved.results.scoredCategories === 'number' ? saved.results.scoredCategories : 0,
          overall: typeof saved.results.overall === 'number' ? saved.results.overall : 0,
          cost: typeof saved.results.cost === 'string' ? saved.results.cost : '$0.00',
        };
      } else {
        this.state.results = null;
      }
      this.state.model = saved.selectedModel || '';
    }
  }

  getState(): BackgroundAnalysisState {
    return { ...this.state };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const current = this.getState();
    this.listeners.forEach((l) => {
      try {
        l(current);
      } catch (err) {
        console.warn('[BackgroundAnalysisManager] Listener error:', err);
      }
    });
  }

  cancel() {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
    if (this.stageInterval) {
      clearInterval(this.stageInterval);
      this.stageInterval = null;
    }
    this.state.isAnalyzing = false;
    this.state.loadingStage = '';
    this.state.error = 'Analysis cancelled by user.';
    this.notify();
  }

  async startAnalysis(
    promptText: string,
    model: string,
    modelName?: string
  ): Promise<PromptAnalysisResult> {
    const cleanPrompt = promptText.trim();
    if (!cleanPrompt) {
      throw new Error('Prompt text cannot be empty.');
    }

    if (this.state.isAnalyzing && this.activeAbortController) {
      this.activeAbortController.abort();
    }

    const controller = new AbortController();
    this.activeAbortController = controller;

    const displayModel = modelName || model.split('/')[1] || model;

    this.state = {
      isAnalyzing: true,
      promptText: cleanPrompt,
      model,
      startTime: Date.now(),
      loadingStage: `Scanning prompt architecture with ${displayModel}...`,
      results: null,
      error: null,
    };
    this.notify();

    // Progressive stage updates
    const stages = [
      `1/5: Scanning prompt against 6 architectural rubrics (${displayModel})...`,
      '2/5: Evaluating structural constraints & dynamic variables...',
      '3/5: Checking prompt injection & security risk vectors...',
      '4/5: Calculating overall quality & confidence scores...',
      '5/5: Synthesizing hardened production architecture...',
    ];
    let stageIdx = 0;
    this.stageInterval = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, stages.length - 1);
      if (this.state.isAnalyzing) {
        this.state.loadingStage = stages[stageIdx];
        this.notify();
      }
    }, 1200);

    try {
      const sanitized = securityUtils.sanitizePromptInput(cleanPrompt);
      const res = await analyzePrompt(sanitized, { model, signal: controller.signal });

      if (this.stageInterval) {
        clearInterval(this.stageInterval);
        this.stageInterval = null;
      }

      this.state.isAnalyzing = false;
      this.state.loadingStage = '';
      this.state.results = res;
      this.state.error = null;
      this.activeAbortController = null;

      // Save to persistent draft store immediately
      draftPersistenceService.saveAnalyzerDraft({
        promptText: cleanPrompt,
        results: res,
        selectedModel: model,
      });

      this.notify();

      // Dispatch window event for UI toasts if user was on another screen
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('ph_background_analysis_completed', {
            detail: { promptText: cleanPrompt, results: res },
          })
        );
      }

      return res;
    } catch (err: any) {
      if (this.stageInterval) {
        clearInterval(this.stageInterval);
        this.stageInterval = null;
      }

      const isAborted = err?.name === 'AbortError' || err?.message?.includes('aborted');
      this.state.isAnalyzing = false;
      this.state.loadingStage = '';
      this.state.error = isAborted ? 'Analysis cancelled.' : err?.message || 'Analysis failed.';
      this.activeAbortController = null;

      this.notify();
      throw err;
    }
  }
}

export const backgroundAnalysisService = new BackgroundAnalysisManager();
