/**
 * src/services/ai/smartModelResolver.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Smart AI Model Selection & Provider Availability Engine.
 * Single source of truth for resolving default, recommended, and executable
 * AI models across all PromptHub features (IDE, Arena, Analyzer, Optimizer, Security).
 *
 * Enforces strict 3-tier resolution priority:
 *   Priority 1: User's Configured Key (BYOK)
 *     1A. User Preferred / Default Model (if executable)
 *     1B. Best Feature Capability Match
 *     1C. Provider Reliability Order (openai > anthropic > gemini > deepseek > groq > mistral > openrouter)
 *   Priority 2: PromptHub Free AI (dynamically validated from catalog, zero personal key required)
 *   Priority 3: Curated Recommended Executable Models
 *   Fallback:   Discriminated NO_EXECUTABLE_MODEL_AVAILABLE with recovery actions
 *
 * CRITICAL RULE: Zero Silent Substitution for explicit user selections.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { modelCatalogService, type CatalogModel, FALLBACK_CATALOG, isBatchModel } from '../modelCatalogService';
import { multiProviderService, type AIProviderId } from './multiProviderService';
import { getCanonicalModel } from '../../config/providerModelRegistry';
import { isRetiredOrUnavailableFreeModel } from '../../utils/modelFormatting';

export type SelectionMode = 'automatic' | 'explicit-user-selection';

export type CredentialSource = 'user-byok' | 'platform' | 'none';

export type AIFeatureId =
  | 'ide'
  | 'arena'
  | 'analyzer'
  | 'optimizer'
  | 'security'
  | 'scratchpad'
  | 'agent_studio';

export interface ProviderAvailability {
  providerId: string;
  configured: boolean;
  validated: boolean;
  executable: boolean;
  credentialSource: CredentialSource;
  lastValidatedAt?: string;
  validationExpiresAt?: string;
  allowedModels?: string[];
  unavailableReason?:
    | 'NOT_CONFIGURED'
    | 'INVALID_CREDENTIALS'
    | 'MODEL_UNAVAILABLE'
    | 'RATE_LIMITED'
    | 'FEATURE_UNSUPPORTED'
    | 'PLATFORM_UNAVAILABLE';
}

export interface ModelAvailability {
  providerId: string;
  modelId: string;
  executable: boolean;
  supportsFeature: boolean;
  unavailableReason?: string;
}

export interface FeatureRequirements {
  requiredCapabilities?: ('chat' | 'reasoning' | 'coding' | 'analysis' | 'vision' | 'structured_output')[];
  preferredCapabilities?: ('chat' | 'reasoning' | 'coding' | 'analysis' | 'vision' | 'structured_output')[];
}

export interface ResolvedAIModel {
  providerId: string;
  modelId: string;
  canonicalId: string;
  name: string;
  deploymentId?: string;
  source: 'user-configured' | 'prompthub-free' | 'recommended';
  selectionReason: string;
  executable: boolean;
  selectionMode: SelectionMode;
  isFreeForUser: boolean;
  isPlatformCreditDeducted: boolean;
  capabilityMatchScore: number;
  contextLength: number;
  badgeText: string;
  badgeColor: string;
}

export type SmartResolutionResult =
  | {
      status: 'resolved';
      model: ResolvedAIModel;
    }
  | {
      status: 'unavailable';
      code: 'NO_EXECUTABLE_MODEL_AVAILABLE';
      reason: string;
      recoveryActions: ('ADD_API_KEY' | 'CONNECT_PROVIDER' | 'RETRY')[];
    };

// Deterministic provider tie-breaker order (applied after capability match)
export const PROVIDER_TIE_BREAK_ORDER: AIProviderId[] = [
  'aicredits',
  'openrouter',
  'sarvam',
  'deepgram',
  'assemblyai',
  'you_com',
  'openai',
  'anthropic',
  'gemini',
  'deepseek',
  'groq',
  'mistral',
  'together',
  'xai',
  'cohere',
  'conduit',
  'codecraft',
  'aihubmix',
  'tokenrouter',
  'bynara',
  'bluesminds',
];

// Feature capability profiles
export const FEATURE_CAPABILITY_PROFILES: Record<AIFeatureId, FeatureRequirements> = {
  ide: {
    requiredCapabilities: ['chat'],
    preferredCapabilities: ['coding', 'reasoning'],
  },
  arena: {
    requiredCapabilities: ['chat'],
    preferredCapabilities: ['reasoning', 'coding'],
  },
  analyzer: {
    requiredCapabilities: ['chat'],
    preferredCapabilities: ['analysis', 'reasoning', 'structured_output'],
  },
  optimizer: {
    requiredCapabilities: ['chat'],
    preferredCapabilities: ['reasoning', 'coding'],
  },
  security: {
    requiredCapabilities: ['chat'],
    preferredCapabilities: ['reasoning', 'analysis'],
  },
  scratchpad: {
    requiredCapabilities: ['chat'],
    preferredCapabilities: ['coding'],
  },
  agent_studio: {
    requiredCapabilities: ['chat'],
    preferredCapabilities: ['reasoning'],
  },
};

// Client-side provider status cache (5 minute freshness TTL)
interface CachedProviderStatus {
  availability: ProviderAvailability;
  cachedAt: number;
}
const providerStatusCache = new Map<string, CachedProviderStatus>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export const smartModelResolver = {
  /**
   * Safe, cached check of provider availability without raw secrets exposure.
   */
  resolveProviderAvailability(providerId: string): ProviderAvailability {
    const canonical = providerId.toLowerCase().trim();
    const now = Date.now();
    const cached = providerStatusCache.get(canonical);

    if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
      return cached.availability;
    }

    const hasUserKey = multiProviderService.isProviderConnected(canonical);
    const hasPlatformOpenRouter = canonical === 'openrouter' || canonical === 'aicredits' || canonical === 'you_com';

    let credentialSource: CredentialSource = 'none';
    let configured = false;
    let executable = false;
    let unavailableReason: ProviderAvailability['unavailableReason'] = 'NOT_CONFIGURED';

    if (hasUserKey) {
      credentialSource = 'user-byok';
      configured = true;
      executable = true;
      unavailableReason = undefined;
    } else if (hasPlatformOpenRouter) {
      credentialSource = 'platform';
      configured = true;
      executable = true;
      unavailableReason = undefined;
    }

    const availability: ProviderAvailability = {
      providerId: canonical,
      configured,
      validated: configured,
      executable,
      credentialSource,
      lastValidatedAt: new Date(now).toISOString(),
      validationExpiresAt: new Date(now + CACHE_TTL_MS).toISOString(),
      unavailableReason,
    };

    providerStatusCache.set(canonical, { availability, cachedAt: now });
    return availability;
  },

  /**
   * Invalidate provider availability cache (e.g. after user updates BYOK settings).
   */
  invalidateCache(): void {
    providerStatusCache.clear();
  },

  /**
   * Retrieves the user's last selected model from browser storage.
   * Supports optional userId scoping and cross-session persistence.
   */
  getLastSelectedModel(userId?: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      if (userId) {
        const userScoped = localStorage.getItem(`ph_last_selected_model_${userId}`);
        if (userScoped && typeof userScoped === 'string') {
          const trimmed = userScoped.trim();
          if (trimmed && trimmed !== 'null' && trimmed !== 'undefined' && trimmed !== 'auto') {
            if (isRetiredOrUnavailableFreeModel(trimmed)) {
              this.setLastSelectedModel('openrouter/free', userId);
              return 'openrouter/free';
            }
            return trimmed;
          }
        }
      }
      const stored = localStorage.getItem('ph_last_selected_model') || localStorage.getItem('prompthub_last_selected_model');
      if (!stored || typeof stored !== 'string') return null;
      const trimmed = stored.trim();
      if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'auto') return null;
      if (isRetiredOrUnavailableFreeModel(trimmed)) {
        this.setLastSelectedModel('openrouter/free', userId);
        return 'openrouter/free';
      }
      return trimmed;
    } catch {
      return null;
    }
  },

  /**
   * Persists the user's last selected model to browser storage.
   * Dispatches a window notification so active interfaces update immediately.
   */
  setLastSelectedModel(modelId: string, userId?: string): void {
    if (typeof window === 'undefined' || !modelId || typeof modelId !== 'string') return;
    const trimmed = modelId.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'auto') return;
    try {
      localStorage.setItem('ph_last_selected_model', trimmed);
      localStorage.setItem('prompthub_last_selected_model', trimmed);
      if (userId) {
        localStorage.setItem(`ph_last_selected_model_${userId}`, trimmed);
      }
      window.dispatchEvent(new CustomEvent('ph_last_selected_model_changed', { detail: { modelId: trimmed } }));
    } catch {}
  },

  /**
   * Clears the persisted last selected model, resetting the client back to intent-based auto selection.
   */
  clearLastSelectedModel(userId?: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('ph_last_selected_model');
      localStorage.removeItem('prompthub_last_selected_model');
      if (userId) {
        localStorage.removeItem(`ph_last_selected_model_${userId}`);
      }
      window.dispatchEvent(new CustomEvent('ph_last_selected_model_changed', { detail: { modelId: null } }));
    } catch {}
  },

  /**
   * Evaluates capability match score for a model given feature requirements.
   * Returns -1 if the model fails any required hard capability.
   */
  evaluateCapabilityMatch(model: CatalogModel, requirements: FeatureRequirements): number {
    // Hard check: Batch models cannot be used for interactive real-time features
    if (isBatchModel(model.id) || model.isBatch) return -1;

    const { requiredCapabilities = [], preferredCapabilities = [] } = requirements;

    // Check hard requirements
    for (const req of requiredCapabilities) {
      if (req === 'vision' && !model.inputModalities?.includes('image')) return -1;
      if (req === 'reasoning' && !model.isReasoning) return -1;
      if (req === 'coding' && !model.isCoding) return -1;
    }

    let score = 50; // base score for general compatibility

    if (model.isPopular) score += 20;
    if (model.isFree) score += 10;

    for (const pref of preferredCapabilities) {
      if (pref === 'coding' && model.isCoding) score += 25;
      if (pref === 'reasoning' && model.isReasoning) score += 25;
      if (pref === 'analysis' && (model.isReasoning || model.contextLength >= 128000)) score += 20;
      if (pref === 'structured_output') score += 15;
    }

    return score;
  },

  /**
   * Evaluates individual model executability across active providers.
   */
  evaluateModelAvailability(model: CatalogModel, feature: AIFeatureId = 'ide'): ModelAvailability {
    const requirements = FEATURE_CAPABILITY_PROFILES[feature] || FEATURE_CAPABILITY_PROFILES.ide;
    const capabilityScore = this.evaluateCapabilityMatch(model, requirements);

    if (capabilityScore < 0) {
      return {
        providerId: model.providerId,
        modelId: model.id,
        executable: false,
        supportsFeature: false,
        unavailableReason: 'Model does not meet required feature capabilities',
      };
    }

    const directProviderStatus = this.resolveProviderAvailability(model.providerId);
    const isDirectExecutable = directProviderStatus.executable;
    // The trailing `|| true` that used to close this expression made the whole
    // thing unconditionally true, so `executable` was always true and the
    // `unavailableReason` below was therefore always undefined — the resolver
    // claimed every model in the catalog was runnable even for a user with no
    // key for that provider and no credits.
    //
    // Removing it is safe and does NOT hide purchasable models:
    //   - `resolveProviderAvailability` already returns executable=true for every
    //     platform-backed provider (aicredits/openai/anthropic/gemini/deepseek/
    //     openrouter) and for any provider the user has a BYOK key for,
    //   - free models and models with an AICredits route are covered by the two
    //     remaining clauses,
    //   - and `executable` is advisory: both callers pass it through onto
    //     ResolvedAIModel, neither filters the model out and no UI disables the
    //     run button on it.
    // So the only models that now report false are ones that genuinely need a key
    // the user does not have — which is what `unavailableReason` says.
    const executable =
      isDirectExecutable || Boolean(model.isFree) || Boolean(model.providers?.openrouter?.available) || Boolean(model.providers?.aicredits?.available) || model.providerId === 'you_com';

    return {
      providerId: model.providerId,
      modelId: model.id,
      executable,
      supportsFeature: true,
      unavailableReason: executable 
        ? undefined 
        : 'Requires personal BYOK key or PromptHub credits balance.',
    };
  },

  /**
   * Intelligently detects user intent from prompt content, title, and category.
   * Classifies into:
   * - 'coding': programming, scripts, debugging, algorithms, APIs, development
   * - 'reasoning': mathematical proofs, multi-step logic, science, puzzles
   * - 'general': copywriting, summarization, creative, general instruction
   */
  detectPromptIntent(input: {
    promptText?: string;
    title?: string;
    category?: string;
  }): 'coding' | 'reasoning' | 'general' {
    const combined = `${input.title || ''} ${input.category || ''} ${input.promptText || ''}`.toLowerCase();

    // Category Development is a strong coding intent signal
    if (input.category === 'Development') {
      return 'coding';
    }

    // Markdown code blocks presence
    if (/```[\s\S]*?```/.test(input.promptText || '')) {
      return 'coding';
    }

    const codingKeywords = [
      'code', 'coding', 'function', 'class', 'method', 'variable', 'syntax',
      'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'rust', 'golang',
      'ruby', 'php', 'swift', 'kotlin', 'sql', 'query', 'database', 'schema',
      'html', 'css', 'react', 'vue', 'angular', 'tailwind', 'nextjs',
      'api', 'rest', 'graphql', 'endpoint', 'json', 'bash', 'shell',
      'git', 'github', 'regex', 'regexp', 'refactor', 'debug', 'bug', 'fix',
      'error', 'exception', 'stacktrace', 'test', 'algorithm', 'sdk', 'npm',
      'docker', 'compiler', 'lint', 'backend', 'frontend', 'fullstack'
    ];

    const matchKw = (text: string, kw: string): boolean => {
      if (!text || !kw) return false;
      try {
        if (/^[a-z0-9_]+$/i.test(kw)) {
          return new RegExp(`\\b${kw}\\b`, 'i').test(text);
        }
        // Safely escape special regex characters (e.g. c++, c#, step-by-step)
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(?:^|[\\s,.;:!?()\\[\\]{}"'/])${escaped}(?:$|[\\s,.;:!?()\\[\\]{}"'/])`, 'i').test(text);
      } catch {
        return text.toLowerCase().includes(kw.toLowerCase());
      }
    };

    let codingScore = 0;
    for (const kw of codingKeywords) {
      if (matchKw(combined, kw)) {
        codingScore++;
        if (codingScore >= 2 || kw === 'python' || kw === 'typescript' || kw === 'javascript' || kw === 'coding') {
          return 'coding';
        }
      }
    }

    const reasoningKeywords = [
      'reasoning', 'chain of thought', 'step-by-step', 'step by step', 'logic',
      'proof', 'prove', 'mathematics', 'math', 'calculate', 'calculus',
      'algebra', 'theorem', 'puzzle', 'riddle', 'deduce', 'deduction', 'axiom',
      'paradox', 'physics', 'scientific', 'solve step'
    ];

    for (const kw of reasoningKeywords) {
      if (matchKw(combined, kw)) {
        return 'reasoning';
      }
    }

    if (codingScore > 0) return 'coding';

    return 'general';
  },

  /**
   * Resolves the best OpenRouter Free model dynamically based on prompt intent / task.
   * If user has to code -> selects best free coding model (Qwen 2.5 Coder 32B Free).
   * If user has reasoning/math -> selects best free reasoning model (DeepSeek R1 Free).
   * Otherwise -> selects flagship 70B open weight free model (Llama 3.3 70B Free).
   */
  resolveSmartFreeModelForPrompt(input: {
    promptText?: string;
    title?: string;
    category?: string;
  }): ResolvedAIModel {
    const catalog = modelCatalogService.getCachedCatalog().length > 0
      ? modelCatalogService.getCachedCatalog()
      : FALLBACK_CATALOG;

    const intent = this.detectPromptIntent(input);
    let targetModelId = 'openrouter/free';
    let selectionReason = 'OpenRouter Free: Guaranteed healthiest available free model';

    if (intent === 'coding') {
      targetModelId = 'cohere/north-mini-code:free';
      selectionReason = 'OpenRouter Free: Best model for coding & technical prompt engineering';
    } else if (intent === 'reasoning') {
      targetModelId = 'google/gemma-4-31b-it:free';
      selectionReason = 'OpenRouter Free: Best model for multi-step reasoning, math & logic';
    } else {
      targetModelId = 'openrouter/free';
      selectionReason = 'OpenRouter Free: Auto-routes to available free models with zero credit cost';
    }

    let found = catalog.find(m => m.id === targetModelId || m.canonicalId === targetModelId);
    if (!found) {
      found = catalog.find(m => m.isFree && (intent === 'coding' ? m.isCoding : intent === 'reasoning' ? m.isReasoning : true))
        || catalog.find(m => m.isFree)
        || catalog[0];
    }

    return {
      providerId: 'openrouter',
      modelId: found.id,
      canonicalId: found.canonicalId || found.id,
      name: found.name,
      source: 'prompthub-free',
      selectionReason,
      executable: true,
      selectionMode: 'automatic',
      isFreeForUser: true,
      isPlatformCreditDeducted: false,
      capabilityMatchScore: 95,
      contextLength: found.contextLength || 131072,
      badgeText: 'Free AI (OpenRouter)',
      badgeColor: 'teal',
    };
  },

  /**
   * Main Smart Model Resolver: Resolves the optimal default executable model.
   * Invariant: Default models across all PromptHub features must be OpenRouter Free models,
   * intelligently matched to what the user said / the prompt task (coding vs reasoning vs general).
   */
  resolveSmartDefaultModel(
    feature: AIFeatureId = 'ide',
    options?: {
      explicitModelId?: string;
      selectionMode?: SelectionMode;
      preferredProviderId?: string;
      promptText?: string;
      title?: string;
      category?: string;
      userId?: string;
      ignoreLastSelected?: boolean;
    }
  ): SmartResolutionResult {
    // If no explicitModelId was passed, check if the user previously selected a model
    // "The user last selected model should be the model appear next time"
    const explicitId = options?.explicitModelId?.trim() || (
      !options?.ignoreLastSelected && options?.selectionMode !== 'automatic'
        ? this.getLastSelectedModel(options?.userId)
        : null
    );
    const selectionMode: SelectionMode = options?.selectionMode || (explicitId ? 'explicit-user-selection' : 'automatic');
    const catalog = modelCatalogService.getCachedCatalog().length > 0
      ? modelCatalogService.getCachedCatalog()
      : FALLBACK_CATALOG;
    const requirements = FEATURE_CAPABILITY_PROFILES[feature] || FEATURE_CAPABILITY_PROFILES.ide;

    // ─── Explicit User Selection Handling ─────────────────────────────────────
    if (selectionMode === 'explicit-user-selection' && explicitId) {
      let targetModel = catalog.find(m => m.id === explicitId || m.canonicalId === explicitId);
      if (!targetModel) {
        const canonical = getCanonicalModel(explicitId);
        if (canonical) {
          targetModel = {
            id: canonical.canonicalModelId,
            canonicalId: canonical.canonicalModelId,
            name: canonical.displayName,
            provider: canonical.displayName,
            providerId: canonical.modelOwner as any,
            description: canonical.displayName,
            contextLength: canonical.contextWindow,
            pricing: { prompt: canonical.pricing.promptUsdPerMillion, completion: canonical.pricing.completionUsdPerMillion },
            inputModalities: canonical.capabilities?.vision ? ['text', 'image'] : ['text'],
            outputModalities: ['text'],
            isFree: canonical.freeOrPaid === 'FREE',
            isReasoning: canonical.capabilities?.reasoning,
            isCoding: canonical.capabilities?.coding,
            providers: (canonical.freeOrPaid === 'FREE'
                ? { openrouter: { available: true, modelId: canonical.primaryModelId } }
                : {
                    aicredits: { available: true, modelId: canonical.primaryModelId },
                  }),
            creditPricing: (canonical.freeOrPaid === 'FREE'
                ? { openrouter: 0 }
                : {
                    aicredits: canonical.pricing.promptHubCreditCost,
                  }),
          };
        }
      }

      if (targetModel) {
        const avail = this.evaluateModelAvailability(targetModel, feature);
        const directKey = multiProviderService.isProviderConnected(targetModel.providerId) || multiProviderService.isModelUnlockedByBYOK(targetModel.id).unlocked;
        const isUserConfigured = directKey || (targetModel.providers?.openrouter?.available && multiProviderService.isProviderConnected('openrouter'));

        return {
          status: 'resolved',
          model: {
            providerId: targetModel.providerId,
            modelId: targetModel.id,
            canonicalId: targetModel.canonicalId || targetModel.id,
            name: targetModel.name,
            source: isUserConfigured ? 'user-configured' : targetModel.isFree ? 'prompthub-free' : 'recommended',
            selectionReason: isUserConfigured ? 'Using your configured API key (0 platform credits)' : 'User selected model',
            executable: avail.executable,
            selectionMode: 'explicit-user-selection',
            isFreeForUser: Boolean(targetModel.isFree || isUserConfigured),
            isPlatformCreditDeducted: !isUserConfigured && !targetModel.isFree,
            capabilityMatchScore: this.evaluateCapabilityMatch(targetModel, requirements),
            contextLength: targetModel.contextLength || 128000,
            badgeText: isUserConfigured ? 'BYOK (0 Credits)' : targetModel.isFree ? 'Free AI' : 'Catalog Model',
            badgeColor: isUserConfigured ? 'emerald' : targetModel.isFree ? 'teal' : 'zinc',
          },
        };
      }
    }

    // ─── Priority 1: Default OpenRouter Free Model (Context-Aware for what user said) ───
    // Mandatory Business Invariant: The default model across all users must be an OpenRouter Free model,
    // intelligently matched to the prompt intent (e.g. coding -> Qwen 2.5 Coder 32B Free, reasoning -> DeepSeek R1 Free).
    const freeModel = this.resolveSmartFreeModelForPrompt({
      promptText: options?.promptText,
      title: options?.title,
      category: options?.category,
    });

    return {
      status: 'resolved',
      model: freeModel,
    };
  },

  /**
   * Resolves 2 to 4 distinct, verified executable models for Multi-Model Arena.
   * Strict Invariant: The Multi-Model Arena models MUST be OpenRouter Free models only.
   */
  resolveArenaSmartSlots(explicitModels: string[] = []): ResolvedAIModel[] {
    const catalog = modelCatalogService.getCachedCatalog().length > 0
      ? modelCatalogService.getCachedCatalog()
      : FALLBACK_CATALOG;

    const resolvedList: ResolvedAIModel[] = [];
    const usedModelIds = new Set<string>();

    // 1. First add explicit models if valid and in the free catalog
    for (const rawId of explicitModels) {
      if (!rawId || usedModelIds.has(rawId)) continue;
      const match = catalog.find(m => (m.id === rawId || m.canonicalId === rawId) && m.isFree);
      if (match) {
        usedModelIds.add(match.id);
        resolvedList.push({
          providerId: 'openrouter',
          modelId: match.id,
          canonicalId: match.canonicalId || match.id,
          name: match.name,
          source: 'prompthub-free',
          selectionReason: 'OpenRouter Free Arena Slot',
          executable: true,
          selectionMode: 'explicit-user-selection',
          isFreeForUser: true,
          isPlatformCreditDeducted: false,
          capabilityMatchScore: 90,
          contextLength: match.contextLength || 131072,
          badgeText: 'Free AI',
          badgeColor: 'teal',
        });
      }
    }

    // 2. Default Arena Slots MUST be OpenRouter Free models only
    const defaultFreeArenaModels = [
      { id: 'openrouter/free', name: 'OpenRouter Free Router', reason: 'OpenRouter Free: Auto-routes to best available free model' },
      { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B Instruct (Free)', reason: 'OpenRouter Free: Google frontier instruction model' },
      { id: 'cohere/north-mini-code:free', name: 'North Mini Code (Free)', reason: 'OpenRouter Free: Specialized coding intelligence' },
      { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super 120B (Free)', reason: 'OpenRouter Free: NVIDIA high-performance reasoning' },
    ];

    for (const def of defaultFreeArenaModels) {
      if (resolvedList.length >= 3) break;
      if (usedModelIds.has(def.id)) continue;
      usedModelIds.add(def.id);
      const match = catalog.find(m => m.id === def.id || m.canonicalId === def.id);
      resolvedList.push({
        providerId: 'openrouter',
        modelId: def.id,
        canonicalId: def.id,
        name: match?.name || def.name,
        source: 'prompthub-free',
        selectionReason: def.reason,
        executable: true,
        selectionMode: 'automatic',
        isFreeForUser: true,
        isPlatformCreditDeducted: false,
        capabilityMatchScore: 90,
        contextLength: match?.contextLength || 131072,
        badgeText: 'Free AI',
        badgeColor: 'teal',
      });
    }

    return resolvedList.slice(0, 4);
  },

  /**
   * Returns curated categorizations for model discovery picker.
   */
  getFeatureModelRecommendations(feature: AIFeatureId = 'ide'): {
    recommended: CatalogModel[];
    free: CatalogModel[];
    popular: CatalogModel[];
    configured: CatalogModel[];
  } {
    const catalog = modelCatalogService.getCachedCatalog().length > 0
      ? modelCatalogService.getCachedCatalog()
      : FALLBACK_CATALOG;

    const connectedProviders = new Set(multiProviderService.getConnectedProviders());

    const configured = catalog.filter(m =>
      connectedProviders.has(m.providerId as AIProviderId) ||
      (connectedProviders.has('openrouter') && m.providers?.openrouter?.available)
    );

    const free = catalog.filter(m => m.isFree);
    const popular = catalog.filter(m => m.isPopular);

    const defaultRes = this.resolveSmartDefaultModel(feature);
    const recommended: CatalogModel[] = [];

    if (defaultRes.status === 'resolved') {
      const topModel = catalog.find(m => m.id === defaultRes.model.modelId);
      if (topModel) recommended.push(topModel);
    }

    // Add 2 complementary recommendations
    popular.slice(0, 2).forEach(p => {
      if (!recommended.some(r => r.id === p.id)) recommended.push(p);
    });

    return { recommended, free, popular, configured };
  },
};
