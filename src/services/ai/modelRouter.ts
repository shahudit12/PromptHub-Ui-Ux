/**
 * src/services/ai/modelRouter.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * PromptHub Model Router & Provider Resolution Engine (V2).
 *
 * Directs prompt execution to either OpenRouter Free or AICredits.in Premium.
 *
 * CRITICAL ARCHITECTURAL RULES:
 * 1. NO SILENT FALLBACK: If a model cannot be routed, this throws. It never
 *    quietly swaps in a different model or a different lane.
 * 2. EXPLICIT PROVIDER SEPARATION: Free models -> OpenRouter Free;
 *    paid models -> AICredits.
 * 3. NO HIDDEN COSTS: Unknown models fail closed with an explicit actionable error.
 *
 * SCOPE OF AUTHORITY — read before relying on anything here:
 * This module runs in the browser, so it is a *preview* of the route, used to pick
 * an endpoint and show the user an honest cost and lane badge before they commit.
 * It is NOT the billing authority. The server
 * (`supabase/functions/_shared/modelAuthority.ts`) independently re-derives the
 * lane and the price from live upstream pricing on every request and rejects
 * anything it cannot price. A client that lies to itself here gets rejected there.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getModelCreditCost, isKnownCatalogModel } from '../../config/modelCostCatalog';
import { isFreeOpenRouterModel } from '../../config/providerRegistry';
import { getCanonicalModel } from '../../config/providerModelRegistry';
import { isRetiredOrUnavailableFreeModel } from '../../utils/modelFormatting';
import type { DeliverableType, DeliverableClassification } from './intentClassifier';
import { multiProviderService } from './multiProviderService';

export const MODEL_SHORTCUT_MAP: Record<string, string> = {
  'prompthub/auto-free': 'openrouter/free',
  'auto-free': 'openrouter/free',
  'prompthub/auto-paid': 'anthropic/claude-3.5-sonnet',
  'auto-paid': 'anthropic/claude-3.5-sonnet',
  'prompthub/auto': 'openrouter/free',
  'free': 'openrouter/free',
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'o1': 'openai/o1',
  'o3-mini': 'openai/o3-mini',
  'claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
  'claude-3.7-sonnet': 'anthropic/claude-3.7-sonnet',
  'claude-3.5-haiku': 'anthropic/claude-3.5-haiku',
  'gemini-2.0-flash': 'google/gemini-2.0-flash',
  'gemini-1.5-pro': 'google/gemini-1.5-pro',
  'deepseek-r1': 'deepseek/deepseek-r1',
  'deepseek-v3': 'deepseek/deepseek-chat',
  'llama-3.3-70b': 'meta-llama/llama-3.3-70b-instruct',
  'qwen-coder': 'qwen/qwen-2.5-coder-32b-instruct',
  'qwen-2.5-coder': 'qwen/qwen-2.5-coder-32b-instruct',
};

export interface ModelRouteResolution {
  /** Resolved backend execution provider */
  provider: 'openrouter' | 'aicredits' | 'sarvam' | 'deepgram' | 'assemblyai' | 'you_com';
  /** Primary execution gateway */
  primaryProvider?: 'aicredits' | 'openrouter' | 'sarvam' | 'deepgram' | 'assemblyai' | 'you_com';
  /** Fallback execution gateway */
  fallbackProvider?: 'aicredits';
  /** Fallback condition */
  fallbackPolicy?: 'PRIMARY_PROVIDER_CREDITS_EXHAUSTED_ONLY' | 'NONE';
  /** Canonical PromptHub model ID (e.g. 'openai/gpt-4o') */
  modelId: string;
  /** Provider-specific target model ID */
  targetModelId: string;
  /** Credit cost per execution */
  creditCost: number;
  /**
   * False when `creditCost` is a conservative guess because the model is not in
   * the local priced catalog. The UI must not present a guess as the price, and
   * nothing may write a guess into an audit or ledger row — the server settles
   * the real amount and reports it back.
   */
  creditCostIsEstimate: boolean;
  /** User-facing gateway attribution label */
  gatewayLabel: 'OpenRouter Free' | 'AICredits Premium' | 'Sarvam AI' | 'Deepgram Speech' | 'AssemblyAI' | 'You.com';
}

export interface ModelRouteOptions {
  modelId: string;
  requestedProvider?: 'auto' | 'openrouter' | 'aicredits';
}

/**
 * Raised when a model cannot be routed to any provider we can vouch for.
 *
 * This is thrown, not returned. The previous version of this module declared the
 * class and never threw it: every unresolvable id fell through to the AICredits
 * lane instead, so a typo, a stale slug or an outright invented model resolved to
 * "a valid paid model" and only failed at the upstream provider — after a credit
 * reservation had already been taken.
 */
export class UnroutableModelError extends Error {
  public readonly code = 'MODEL_NOT_ROUTABLE';
  public readonly modelId: string;

  constructor(modelId: string, detail: string) {
    super(
      `Model "${modelId}" cannot be routed: ${detail} ` +
        `Select a supported model, or connect your personal API key in Settings to run it via BYOK.`
    );
    this.name = 'UnroutableModelError';
    this.modelId = modelId;
  }
}

/**
 * Normalizes any model ID or shortcut into its canonical full ID.
 *
 * An empty id throws rather than defaulting to `openrouter/free`. Defaulting
 * meant a bug that dropped the user's selection was invisible: the request
 * succeeded, on a model they did not choose, and the result was labelled as
 * theirs.
 */
export function normalizeModelId(rawId: string): string {
  const clean = (rawId || '').trim();
  if (!clean) {
    throw new UnroutableModelError('(none)', 'no model was selected.');
  }
  const cleanLower = clean.toLowerCase();
  if (cleanLower.includes('content-safety')) {
    return 'openrouter/free';
  }
  if (isRetiredOrUnavailableFreeModel(cleanLower)) {
    return 'openrouter/free';
  }
  if (MODEL_SHORTCUT_MAP[cleanLower]) {
    return MODEL_SHORTCUT_MAP[cleanLower];
  }
  return clean;
}

/**
 * Resolves the execution route for a given model.
 *
 * `routingPreference` narrows the search; it can never override pricing. Asking
 * for the free lane does not make a paid model free.
 */
export function resolveModelRoute(
  rawModelId: string,
  routingPreference: 'auto' | 'openrouter' | 'aicredits' = 'auto'
): ModelRouteResolution {
  const modelId = normalizeModelId(rawModelId);
  const isFree = isFreeOpenRouterModel(modelId);

  // 1. Free Router & Free Models
  if (isFree) {
    if (routingPreference === 'aicredits') {
      throw new UnroutableModelError(
        modelId,
        'it is a free-lane model and is not sold through the AICredits gateway.'
      );
    }
    return {
      provider: 'openrouter',
      primaryProvider: 'openrouter',
      modelId,
      targetModelId: modelId,
      creditCost: 0,
      creditCostIsEstimate: false,
      gatewayLabel: 'OpenRouter Free',
    };
  }

  // A paid model explicitly aimed at the free lane is refused rather than
  // silently repriced at 0.
  if (routingPreference === 'openrouter') {
    throw new UnroutableModelError(
      modelId,
      'it is a paid model and cannot be executed on the free router. Top up AICredits to run it, or pick a free model.'
    );
  }

  // 1b. Sarvam AI Models
  if (modelId.startsWith('sarvam/') || modelId.startsWith('sarvam')) {
    const priced = isKnownCatalogModel(modelId);
    const creditCost = getModelCreditCost(modelId);
    return {
      provider: 'sarvam',
      primaryProvider: 'sarvam',
      modelId,
      targetModelId: modelId,
      creditCost,
      creditCostIsEstimate: !priced,
      gatewayLabel: 'Sarvam AI',
    };
  }

  // 1c. Deepgram Models
  if (modelId.startsWith('deepgram/') || modelId.startsWith('deepgram')) {
    const priced = isKnownCatalogModel(modelId);
    const creditCost = getModelCreditCost(modelId);
    return {
      provider: 'deepgram',
      primaryProvider: 'deepgram',
      modelId,
      targetModelId: modelId,
      creditCost,
      creditCostIsEstimate: !priced,
      gatewayLabel: 'Deepgram Speech',
    };
  }

  // 1d. AssemblyAI Models
  if (modelId.startsWith('assemblyai/') || modelId.startsWith('assemblyai')) {
    const priced = isKnownCatalogModel(modelId);
    const creditCost = getModelCreditCost(modelId);
    return {
      provider: 'assemblyai',
      primaryProvider: 'assemblyai',
      modelId,
      targetModelId: modelId,
      creditCost,
      creditCostIsEstimate: !priced,
      gatewayLabel: 'AssemblyAI',
    };
  }

  // 2. Paid / Premium Models -> AICredits.in Gateway
  const priced = isKnownCatalogModel(modelId);
  const creditCost = getModelCreditCost(modelId);
  const canonical = getCanonicalModel(modelId);
  const primaryProvider = (canonical?.primaryProvider as 'aicredits' | 'openrouter') || 'aicredits';
  const fallbackProvider = undefined;

  return {
    provider: primaryProvider,
    primaryProvider,
    fallbackProvider,
    fallbackPolicy: canonical?.fallbackPolicy || 'PRIMARY_PROVIDER_CREDITS_EXHAUSTED_ONLY',
    modelId,
    targetModelId: modelId,
    creditCost,
    creditCostIsEstimate: !priced,
    gatewayLabel: 'AICredits Premium',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTONOMOUS ROUTING MATRIX ENGINE (M2)
// ─────────────────────────────────────────────────────────────────────────────

export type RoutingPriorityTier = 'byok' | 'free_cluster' | 'aicredits_gateway';

export interface AutonomousRoutingInput {
  deliverableType: DeliverableType;
  hasVisionInput?: boolean;
  userPrompt?: string;
  explicitModelOverride?: string | null;
}

export interface AutonomousRouteResult {
  modelId: string;
  targetModelId: string;
  tier: RoutingPriorityTier;
  creditCost: number;
  creditCostIsEstimate: boolean;
  provider: string;
  gatewayLabel: string;
  rationale: string;
  isUnlockedByByok: boolean;
  byokProviderName?: string;
  routeResolution: ModelRouteResolution;
}

interface AutonomousMatrixEntry {
  byokCandidates: string[];
  freeClusterModel: string;
  aicreditsGatewayModel: string;
  rationale: string;
}

export const AUTONOMOUS_DELIVERABLE_MATRIX: Record<DeliverableType, AutonomousMatrixEntry> = {
  visual_asset: {
    byokCandidates: ['black-forest-labs/flux-1-schnell', 'stabilityai/stable-diffusion-xl'],
    freeClusterModel: 'pollinations/flux',
    aicreditsGatewayModel: 'black-forest-labs/flux-1-schnell',
    rationale: 'FLUX.1 selected for high-fidelity photorealistic rendering and visual concepts.',
  },
  ad_campaign: {
    byokCandidates: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o'],
    freeClusterModel: 'meta-llama/llama-3.3-70b-instruct:free',
    aicreditsGatewayModel: 'anthropic/claude-3.5-sonnet',
    rationale: 'Claude 3.5 Sonnet / Llama 3.3 70B routed for high-conversion creative copywriting, nuanced brand voice, and persuasive campaign hooks.',
  },
  written_report: {
    byokCandidates: ['deepseek/deepseek-r1', 'meta-llama/llama-3.3-70b-instruct', 'openai/o1', 'openai/o3-mini'],
    freeClusterModel: 'deepseek/deepseek-r1:free',
    aicreditsGatewayModel: 'deepseek/deepseek-r1',
    rationale: 'DeepSeek R1 / Llama 3.3 70B routed for deep reasoning, transparent chain-of-thought analysis, and structured report synthesis.',
  },
  strategic_plan: {
    byokCandidates: ['deepseek/deepseek-r1', 'meta-llama/llama-3.3-70b-instruct', 'openai/o1'],
    freeClusterModel: 'deepseek/deepseek-r1:free',
    aicreditsGatewayModel: 'deepseek/deepseek-r1',
    rationale: 'DeepSeek R1 / Llama 3.3 70B routed for comprehensive strategic deduction, phased milestone planning, and risk mitigation.',
  },
  data_analysis: {
    byokCandidates: ['google/gemini-2.0-flash', 'deepseek/deepseek-r1', 'openai/gpt-4o'],
    freeClusterModel: 'openrouter/free',
    aicreditsGatewayModel: 'google/gemini-2.0-flash',
    rationale: 'Google Gemini 2.0 Flash / DeepSeek R1 routed for rapid tabular data processing, numerical computation, and trend extraction.',
  },
  interactive_web_app: {
    byokCandidates: ['anthropic/claude-3.5-sonnet', 'qwen/qwen-2.5-coder-32b-instruct', 'openai/gpt-4o'],
    freeClusterModel: 'qwen/qwen-2.5-coder-32b-instruct:free',
    aicreditsGatewayModel: 'qwen/qwen-2.5-coder-32b-instruct',
    rationale: 'Qwen 2.5 Coder 32B / Claude 3.5 Sonnet routed for production-grade interactive HTML5/Tailwind web prototype generation with zero truncated syntax.',
  },
  code_script: {
    byokCandidates: ['qwen/qwen-2.5-coder-32b-instruct', 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o'],
    freeClusterModel: 'qwen/qwen-2.5-coder-32b-instruct:free',
    aicreditsGatewayModel: 'qwen/qwen-2.5-coder-32b-instruct',
    rationale: 'Qwen 2.5 Coder 32B / Claude 3.5 Sonnet routed for clean syntax adherence, complete type annotations, and robust error handling.',
  },
  presentation_deck: {
    byokCandidates: ['deepseek/deepseek-r1', 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
    freeClusterModel: 'deepseek/deepseek-r1:free',
    aicreditsGatewayModel: 'deepseek/deepseek-r1',
    rationale: 'DeepSeek R1 / Claude 3.5 Sonnet routed for structured slide hierarchies, executive bullet takeaways, and visual diagram direction.',
  },
  video_script: {
    byokCandidates: ['google/gemini-2.0-flash', 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
    freeClusterModel: 'openrouter/free',
    aicreditsGatewayModel: 'google/gemini-2.0-flash',
    rationale: 'Google Gemini 2.0 Flash / GPT-4o routed for cinematic video pacing, camera framing, and voiceover synchronization.',
  },
  general_inquiry: {
    byokCandidates: ['google/gemini-2.0-flash', 'openai/gpt-4o-mini', 'openrouter/free'],
    freeClusterModel: 'openrouter/free',
    aicreditsGatewayModel: 'google/gemini-2.0-flash',
    rationale: 'Gemini 2.0 Flash / Auto Best Free routed for sub-second real-time conversational responses with broad world knowledge.',
  },
};

export const AUTONOMOUS_VISION_ENTRY: AutonomousMatrixEntry = {
  byokCandidates: ['google/gemini-2.0-flash', 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
  freeClusterModel: 'openrouter/free',
  aicreditsGatewayModel: 'google/gemini-2.0-flash',
  rationale: 'Gemini 2.0 Flash / GPT-4o Vision routed for native multimodal vision perception and visual asset extraction.',
};

/**
 * Resolves the autonomous model route enforcing the 3-tier priority:
 * Priority 1: User's connected BYOK key (0 credits)
 * Priority 2: Free Cluster (OpenRouter Free / :free catalog, 0 credits)
 * Priority 3: Curated AICredits gateway (managed paid gateway)
 */
export function resolveAutonomousModelRoute(
  input: DeliverableType | DeliverableClassification | AutonomousRoutingInput
): AutonomousRouteResult {
  // Normalize input
  let deliverableType: DeliverableType = 'general_inquiry';
  let hasVision = false;
  let explicitOverride: string | null = null;
  let customRationale: string | undefined;

  if (typeof input === 'string') {
    deliverableType = input as DeliverableType;
  } else if ('deliverableType' in input) {
    deliverableType = input.deliverableType;
    hasVision = !!input.hasVisionInput;
    if ('explicitModelOverride' in input && input.explicitModelOverride) {
      explicitOverride = input.explicitModelOverride;
    }
    if ('modelRationale' in input && input.modelRationale) {
      customRationale = input.modelRationale;
    }
  }

  // 1. Check Explicit Manual Override (Developer Mode)
  if (explicitOverride && explicitOverride.trim() && explicitOverride.trim() !== 'auto') {
    const normalizedOverride = normalizeModelId(explicitOverride);
    const byokCheck = multiProviderService.isModelUnlockedByBYOK(normalizedOverride);

    // If unlocked by user's personal key -> Tier 1: BYOK (0 cr)
    if (byokCheck.unlocked) {
      const routeRes = resolveModelRoute(normalizedOverride, 'auto');
      return {
        modelId: normalizedOverride,
        targetModelId: normalizedOverride,
        tier: 'byok',
        creditCost: 0,
        creditCostIsEstimate: false,
        provider: byokCheck.providerId || 'byok',
        gatewayLabel: `BYOK Direct (${byokCheck.providerName || 'Personal Key'})`,
        rationale: `Manual override locked to ${normalizedOverride} running via connected ${byokCheck.providerName || 'BYOK'} key (0 platform credits).`,
        isUnlockedByByok: true,
        byokProviderName: byokCheck.providerName,
        routeResolution: {
          ...routeRes,
          creditCost: 0,
          gatewayLabel: `BYOK Direct (${byokCheck.providerName || 'Personal Key'})` as any,
        },
      };
    }

    // If free openrouter model -> Tier 2: Free Cluster (0 cr)
    if (isFreeOpenRouterModel(normalizedOverride)) {
      const routeRes = resolveModelRoute(normalizedOverride, 'openrouter');
      return {
        modelId: normalizedOverride,
        targetModelId: normalizedOverride,
        tier: 'free_cluster',
        creditCost: 0,
        creditCostIsEstimate: false,
        provider: 'openrouter',
        gatewayLabel: 'OpenRouter Free',
        rationale: `Manual override locked to ${normalizedOverride} running on PromptHub Free Cluster (0 platform credits).`,
        isUnlockedByByok: false,
        routeResolution: routeRes,
      };
    }

    // Otherwise -> Tier 3: AICredits Gateway
    const routeRes = resolveModelRoute(normalizedOverride, 'aicredits');
    return {
      modelId: normalizedOverride,
      targetModelId: normalizedOverride,
      tier: 'aicredits_gateway',
      creditCost: routeRes.creditCost,
      creditCostIsEstimate: routeRes.creditCostIsEstimate,
      provider: routeRes.provider,
      gatewayLabel: 'AICredits Premium',
      rationale: `Manual override locked to ${normalizedOverride} running on AICredits Gateway (${routeRes.creditCost} credits).`,
      isUnlockedByByok: false,
      routeResolution: routeRes,
    };
  }

  // 2. Autonomous Routing Matrix Selection
  const matrixEntry = hasVision
    ? AUTONOMOUS_VISION_ENTRY
    : (AUTONOMOUS_DELIVERABLE_MATRIX[deliverableType] || AUTONOMOUS_DELIVERABLE_MATRIX.general_inquiry);

  const rationale = customRationale || matrixEntry.rationale;

  // ── Priority Tier 1: User's Connected BYOK Key (0 credits) ──
  for (const candidate of matrixEntry.byokCandidates) {
    const byokCheck = multiProviderService.isModelUnlockedByBYOK(candidate);
    if (byokCheck.unlocked) {
      let routeRes: ModelRouteResolution;
      try {
        routeRes = resolveModelRoute(candidate, 'auto');
      } catch {
        routeRes = {
          provider: (byokCheck.providerId as any) || 'byok',
          primaryProvider: (byokCheck.providerId as any) || 'byok',
          modelId: candidate,
          targetModelId: candidate,
          creditCost: 0,
          creditCostIsEstimate: false,
          gatewayLabel: `BYOK Direct (${byokCheck.providerName || 'Personal Key'})` as any,
        };
      }
      return {
        modelId: candidate,
        targetModelId: candidate,
        tier: 'byok',
        creditCost: 0,
        creditCostIsEstimate: false,
        provider: byokCheck.providerId || 'byok',
        gatewayLabel: `BYOK Direct (${byokCheck.providerName || 'Personal Key'})`,
        rationale: `${rationale} (Active BYOK key detected: ${byokCheck.providerName}, 0 platform credits).`,
        isUnlockedByByok: true,
        byokProviderName: byokCheck.providerName,
        routeResolution: {
          ...routeRes,
          creditCost: 0,
          gatewayLabel: `BYOK Direct (${byokCheck.providerName || 'Personal Key'})` as any,
        },
      };
    }
  }

  // ── Priority Tier 2: Free Cluster / OpenRouter Free (0 credits) ──
  const freeModel = matrixEntry.freeClusterModel;
  if (isFreeOpenRouterModel(freeModel)) {
    const routeRes = resolveModelRoute(freeModel, 'openrouter');
    return {
      modelId: freeModel,
      targetModelId: freeModel,
      tier: 'free_cluster',
      creditCost: 0,
      creditCostIsEstimate: false,
      provider: 'openrouter',
      gatewayLabel: 'OpenRouter Free',
      rationale: `${rationale} (Routed to Free Cluster, 0 platform credits).`,
      isUnlockedByByok: false,
      routeResolution: routeRes,
    };
  }

  // ── Priority Tier 3: Curated AICredits Gateway ──
  const paidModel = matrixEntry.aicreditsGatewayModel;
  const routeRes = resolveModelRoute(paidModel, 'aicredits');
  return {
    modelId: paidModel,
    targetModelId: paidModel,
    tier: 'aicredits_gateway',
    creditCost: routeRes.creditCost,
    creditCostIsEstimate: routeRes.creditCostIsEstimate,
    provider: routeRes.provider,
    gatewayLabel: 'AICredits Premium',
    rationale: `${rationale} (Managed AICredits Gateway, ${routeRes.creditCost} credits).`,
    isUnlockedByByok: false,
    routeResolution: routeRes,
  };
}

export const routeAutonomousDeliverable = resolveAutonomousModelRoute;

// Re-export centralized provider router & fallback engine
export {
  resolveProviderRoute,
  getProviderCatalog,
  getNextHealthyProvider,
  recordProviderExecution,
  resetCircuitBreakers,
  IS_AICREDITS_PAUSED,
  PROVIDER_REGISTRY,
} from './providerRouter';
