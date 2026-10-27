/**
 * src/services/homepageAnalyzerService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dedicated Real OpenRouter Analysis Service for PromptHub's Homepage Studio.
 * Handles one-time free model persistence, secure AI gateway execution,
 * strict schema validation, 0-100 score normalization, and error recovery.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { modelCatalogService, type CatalogModel, GUARANTEED_FREE_ROUTER_MODEL } from './modelCatalogService';
import { aiService } from './ai';
import { securityUtils } from '../utils/security';

export const HOMEPAGE_MODEL_STORAGE_KEY = 'prompthub.home.analysis.model';
export const HOMEPAGE_TRIAL_TOKEN_KEY = 'prompthub.home.trial.token';
export const DEFAULT_FREE_HOMEPAGE_MODEL = 'openrouter/free';

/**
 * The anonymous trial token this browser presents to `ai-analyze-trial`.
 *
 * Stable so the server's one-shot lock (`claim_anonymous_trial_lock`, which
 * marks the token hash `consumed`) applies to the same visitor across reloads
 * and tabs. Falls back to a per-call token only when storage is unavailable, so
 * a privacy-mode visitor still gets an answer instead of an error.
 */
function readOrCreateTrialToken(): string {
  const mint = () =>
    'ph_tr_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  try {
    if (typeof localStorage === 'undefined') return mint();
    const existing = localStorage.getItem(HOMEPAGE_TRIAL_TOKEN_KEY);
    if (existing && existing.startsWith('ph_tr_')) return existing;
    const token = mint();
    localStorage.setItem(HOMEPAGE_TRIAL_TOKEN_KEY, token);
    return token;
  } catch {
    return mint();
  }
}

export interface HomepageAnalysisDimension {
  id: 'clarity' | 'structure' | 'constraints' | 'ambiguity' | 'safety';
  label: string;
  score: number;
  grade: string;
  status: 'good' | 'warning' | 'alert';
  highlightText: string;
  /** null when the model gave no finding for this dimension. */
  diagnosis: string | null;
  /** null when the model gave no recommendation for this dimension. */
  recommendation: string | null;
  /**
   * True when the score is computed from other scores rather than reported by
   * the model, so the UI can label it instead of implying a direct measurement.
   */
  derived?: boolean;
  /**
   * True for the pre-analysis template shown before the visitor runs anything.
   * The UI must render dashes rather than numbers for these — the placeholder
   * previously carried concrete scores (72, 55, 40, 45, 90) and letter grades
   * (C, D, F, A), so the homepage displayed a graded report card for a prompt
   * that had never been analyzed.
   */
  placeholder?: boolean;
}

export interface HomepageAnalysisResult {
  requestId: string;
  timestamp: number;
  requestedModel: string;
  /** The model the gateway actually served. */
  actualModel: string;
  overallScore: number;
  /** How many rubric categories the model actually scored. */
  scoredCategories: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  /** Only dimensions the model actually scored appear here. */
  dimensions: HomepageAnalysisDimension[];
  strengths: string[];
  issues: string[];
  recommendations: string[];
  /** null when the model returned no rewrite — never the user's own prompt. */
  improvedPrompt: string | null;
  summary: string | null;
  /** null when the provider reported no usage. Never an estimate. */
  tokens: number | null;
  tokensMeasured: boolean;
  cost: string;
  isRealExecution: boolean;
}

function computeGrade(score: number): string {
  if (score >= 93) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 78) return 'B';
  if (score >= 68) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function computeStatus(score: number): 'good' | 'warning' | 'alert' {
  if (score >= 75) return 'good';
  if (score >= 55) return 'warning';
  return 'alert';
}

class HomepageAnalyzerService {
  /**
   * Get the persisted free model choice from localStorage.
   * Validates that the model actually exists in the free catalog.
   */
  getSavedModelId(): string | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      const saved = localStorage.getItem(HOMEPAGE_MODEL_STORAGE_KEY);
      if (!saved) return null;

      // Verify that the saved model exists in the catalog and is free
      const freeModels = modelCatalogService.getFreeModels();
      const match = freeModels.find(
        (m) => m.id === saved || m.canonicalId === saved
      );

      if (match) {
        return match.id;
      }

      // If saved model is no longer available in catalog, check by ID lookup
      const catalogMatch = modelCatalogService.getModelById(saved);
      if (catalogMatch && (catalogMatch.isFree || catalogMatch.pricing.prompt === 0)) {
        return catalogMatch.id;
      }

      // Invalid or discontinued model -> clear preference
      localStorage.removeItem(HOMEPAGE_MODEL_STORAGE_KEY);
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Save chosen model preference to localStorage (one-time selection).
   */
  saveModelId(modelId: string): void {
    try {
      if (typeof localStorage !== 'undefined' && modelId) {
        localStorage.setItem(HOMEPAGE_MODEL_STORAGE_KEY, modelId);
      }
    } catch {
      // Storage access gracefully ignored
    }
  }

  /**
   * Clear saved model preference (allows user to re-trigger one-time picker).
   */
  clearSavedModel(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(HOMEPAGE_MODEL_STORAGE_KEY);
      }
    } catch {}
  }

  /**
   * Resolve an active free model object from ID or fallback.
   */
  resolveFreeModel(requestedId?: string | null): CatalogModel {
    const freeModels = modelCatalogService.getFreeModels();
    if (requestedId) {
      const match = freeModels.find(
        (m) => m.id === requestedId || m.canonicalId === requestedId
      );
      if (match) return match;
    }

    const savedId = this.getSavedModelId();
    if (savedId) {
      const match = freeModels.find(
        (m) => m.id === savedId || m.canonicalId === savedId
      );
      if (match) return match;
    }

    // Default to openrouter/free (Dynamic Free Router) or top available free model
    const routerModel = freeModels.find((m) => m.id === 'openrouter/free');
    if (routerModel) return routerModel;

    return freeModels[0] || GUARANTEED_FREE_ROUTER_MODEL;
  }

  /**
   * Real OpenRouter-powered prompt analysis for the homepage.
   */
  async analyzePrompt(
    promptText: string,
    modelId: string,
    _signal?: AbortSignal
  ): Promise<HomepageAnalysisResult> {
    const cleanPrompt = securityUtils.sanitizePromptInput((promptText || '').trim());
    if (!cleanPrompt) {
      throw new Error('Please enter a prompt to analyze.');
    }

    if (cleanPrompt.length > 8000) {
      throw new Error('Prompt exceeds maximum test length of 8,000 characters.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODEL FIDELITY: the id the visitor picked is sent to the server verbatim.
    //
    // This block previously did two rewrites, both of which meant the analysis
    // could come back from a model the visitor never chose:
    //   1. `resolveFreeModel(modelId)` silently fell back to `openrouter/free`
    //      (or `freeModels[0]`) whenever the requested id was not in the locally
    //      cached free catalog — a stale cache was enough to swap the model.
    //   2. It appended ':free' to any id that did not already contain "free",
    //      inventing slugs like `openai/gpt-4o:free` that either do not exist or
    //      resolve to a different model than the one displayed.
    //
    // The server (`ai-analyze-trial` → `resolveModelAuthority`) is the only thing
    // allowed to decide whether a model is free, and it rejects paid models
    // rather than substituting. So the id travels unchanged and a rejection is
    // surfaced to the visitor.
    // ─────────────────────────────────────────────────────────────────────────
    const targetModelId = (modelId || '').trim();
    if (!targetModelId) {
      throw new Error('Select a model before running the analysis.');
    }

    // Used only for the display label. `find` — not a fallback — so a model that
    // is not in the cached catalog shows its raw id rather than another model's
    // name.
    const catalogEntry =
      modelCatalogService.getFreeModels().find(
        (m) => m.id === targetModelId || m.canonicalId === targetModelId
      ) ?? null;

    // Trial token for the server-side one-shot lock. STABLE per browser.
    //
    // This minted a fresh random token on every call, so
    // `claim_anonymous_trial_lock` — which keys the "1 free analysis" on the
    // token hash and marks it `consumed` — never saw the same token twice. The
    // one-shot lock therefore locked nothing, and the real ceiling on this
    // anonymous LLM path was the RPC's 30-trials-per-IP-per-hour backstop, while
    // the UI told the visitor they had one free analysis.
    //
    // ponytail: localStorage, so clearing site data mints a new token. That is
    // deliberate — the per-IP hourly cap is the enforcement, this is the honest
    // per-browser accounting. A cookie or a signed server-issued token would
    // raise the floor; neither is worth it while the cap holds.
    const trialToken = readOrCreateTrialToken();

    const res = await aiService.analyzeAnonymousTrial(
      cleanPrompt,
      trialToken,
      targetModelId,
      'improve'
    );

    if (!res.success || !res.result) {
      const errMsg = res.error || 'AI analysis could not be completed. Please try again or switch free models.';
      throw new Error(errMsg);
    }

    const raw = res.result;

    // ─────────────────────────────────────────────────────────────────────────
    // MAPPING RULE: this layer reshapes the server's analysis for the homepage
    // widget. It does not add findings.
    //
    // It previously defaulted clarity to 70, specificity to 65, structure to 60,
    // constraints to 45 and safety to 90 (from `100 - (securityRiskScore || 10)`),
    // then attached canned diagnoses and recommendations to every dimension. A
    // model that returned only a clarity score therefore produced a five-
    // dimension report card, graded A-, almost entirely invented — including a
    // "Safety & Guardrails: 90, safe parameter handling" verdict on a prompt
    // whose security was never assessed.
    // ─────────────────────────────────────────────────────────────────────────
    const num = (val: unknown): number | null => {
      const n = typeof val === 'number' ? val : parseInt(String(val ?? ''), 10);
      if (!Number.isFinite(n)) return null;
      return Math.min(100, Math.max(0, Math.round(n)));
    };

    const clarity = num(raw.clarity);
    const specificity = num(raw.specificity);
    const structure = num(raw.structure);
    const constraints = num(raw.constraints);
    const securityRiskScore = num(raw.securityRiskScore);
    const safety = securityRiskScore !== null ? 100 - securityRiskScore : null;
    const ambiguity =
      clarity !== null && specificity !== null
        ? 100 - Math.round((clarity + specificity) / 2)
        : null;

    // The server already computes `overall` as the mean of the categories the
    // model actually scored, so it is used as-is rather than recomputed here
    // over defaulted values.
    const serverOverall = num(raw.overall);
    if (serverOverall === null) {
      throw new Error('The analysis came back without an overall score. Please try again.');
    }
    const overall = serverOverall;

    const difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' =
      overall >= 85 ? 'Expert' : overall >= 70 ? 'Advanced' : overall >= 40 ? 'Intermediate' : 'Beginner';

    // Extract first 15 words of the prompt as snippet
    const words = cleanPrompt.split(/\s+/);
    const snippet = words.slice(0, Math.min(12, words.length)).join(' ') + (words.length > 12 ? '...' : '');

    const modelWeakAreas: string[] = Array.isArray(raw.weakAreas) ? raw.weakAreas : [];
    const modelMissingInfo: string[] = Array.isArray(raw.missingInfo) ? raw.missingInfo : [];
    const modelSuggestions: string[] = Array.isArray(raw.suggestions) ? raw.suggestions : [];
    const modelSecurityIssues: string[] = Array.isArray(raw.securityIssues) ? raw.securityIssues : [];

    // Only dimensions the model actually scored are shown. A dimension with no
    // score is omitted rather than filled in.
    const dimensions: HomepageAnalysisDimension[] = [];

    if (clarity !== null) {
      dimensions.push({
        id: 'clarity',
        label: 'Clarity',
        score: clarity,
        grade: computeGrade(clarity),
        status: computeStatus(clarity),
        highlightText: snippet,
        diagnosis: modelMissingInfo[0] ?? null,
        recommendation: modelSuggestions[0] ?? null,
      });
    }

    if (structure !== null) {
      dimensions.push({
        id: 'structure',
        label: 'Structure',
        score: structure,
        grade: computeGrade(structure),
        status: computeStatus(structure),
        highlightText: snippet,
        diagnosis: modelWeakAreas[0] ?? null,
        recommendation: modelSuggestions[1] ?? null,
      });
    }

    if (constraints !== null) {
      dimensions.push({
        id: 'constraints',
        label: 'Constraints',
        score: constraints,
        grade: computeGrade(constraints),
        status: computeStatus(constraints),
        highlightText: cleanPrompt.length > 60 ? cleanPrompt.substring(0, 60) + '...' : cleanPrompt,
        diagnosis: modelWeakAreas[1] ?? null,
        recommendation: modelSuggestions[2] ?? null,
      });
    }

    if (ambiguity !== null) {
      dimensions.push({
        id: 'ambiguity',
        label: 'Ambiguity',
        score: ambiguity,
        grade: ambiguity <= 25 ? 'Low' : ambiguity <= 50 ? 'Moderate' : 'High',
        status: ambiguity <= 30 ? 'good' : ambiguity <= 60 ? 'warning' : 'alert',
        highlightText: snippet,
        // Derived from the clarity and specificity scores, not separately measured.
        derived: true,
        diagnosis: null,
        recommendation: modelSuggestions[3] ?? null,
      });
    }

    if (safety !== null) {
      dimensions.push({
        id: 'safety',
        label: 'Safety & Guardrails',
        score: safety,
        grade: computeGrade(safety),
        status: computeStatus(safety),
        highlightText: cleanPrompt.includes('{{') ? '{{variable_slots}}' : snippet,
        // Reports the model's own security findings, or nothing.
        diagnosis: modelSecurityIssues[0] ?? null,
        recommendation: null,
      });
    }

    const improved =
      typeof raw.improved === 'string' && raw.improved.trim().length > 0 ? raw.improved.trim() : null;

    const tokens = num(raw.tokens) !== null ? Number(raw.tokens) : null;

    return {
      requestId: raw.requestId || `req_${Date.now()}`,
      timestamp: Date.now(),
      requestedModel: catalogEntry?.name ?? targetModelId,
      // The model the gateway reported serving, falling back to the id we asked
      // for — never a different model's name.
      actualModel: res.servedModel || res.model || targetModelId,
      overallScore: overall,
      scoredCategories: typeof raw.scoredCategories === 'number' ? raw.scoredCategories : dimensions.length,
      difficulty,
      dimensions,
      strengths: modelSuggestions.slice(0, 2),
      issues: modelWeakAreas,
      recommendations: modelSuggestions,
      improvedPrompt: improved,
      summary: typeof raw.summary === 'string' && raw.summary.trim() ? raw.summary.trim() : null,
      tokens,
      tokensMeasured: raw.usageMeasured === true && tokens !== null,
      cost: 'Free',
      isRealExecution: true,
    };
  }
}

export const homepageAnalyzerService = new HomepageAnalyzerService();
