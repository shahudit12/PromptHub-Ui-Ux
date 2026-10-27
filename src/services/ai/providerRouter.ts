/**
 * src/services/ai/providerRouter.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * PromptHub Centralized Provider Router & Circuit-Breaker Fallback Engine.
 *
 * Directs AI prompt workloads across authoritative provider pools:
 * 1. Paid & Frontier Models:
 *    - Primary: AICredits.in (https://aicredits.in)
 *    - Indic & Vernacular: Sarvam AI (https://api.sarvam.ai)
 * 2. Speech & Audio Intelligence:
 *    - Deepgram (Nova-3 / Nova-2 / Flux / Aura)
 *    - AssemblyAI (Universal-3.6 Pro / 3.5 Pro)
 * 3. Free Models:
 *    - OpenRouter Free Tier (0 prompt / 0 completion rate models)
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type ProviderLane = 'paid' | 'category2' | 'free' | 'specialized';

export type ProviderHealthStatus = 'HEALTHY' | 'DEGRADED' | 'OFFLINE';

export type ProviderServiceType = 'llm_inference' | 'search_research' | 'web_crawler' | 'consumer_tool';

export interface ProviderEndpoint {
  id: string;
  name: string;
  lane: ProviderLane;
  serviceType: ProviderServiceType;
  baseUrl: string;
  appUrl: string;
  priority: number; // 1 = highest
  creditDiscountMultiplier: number; // 1.0 = standard, 0.7 = 30% discount, 0 = free
  status: ProviderHealthStatus;
  consecutiveFailures: number;
  lastFailureTime?: number;
  averageLatencyMs?: number;
  hasApi?: boolean;
}

export class FreeBuffNotAnApiError extends Error {
  public readonly code = 'FREEBUFF_NOT_AN_API';
  constructor() {
    super(
      'FreeBuff is a consumer desktop/CLI application wrapper (fork of Codebuff) and does not provide an HTTP API endpoint. It cannot be used for LLM inference.'
    );
    this.name = 'FreeBuffNotAnApiError';
  }
}

/**
 * Active status flag for AICredits gateway (Mandatory connection).
 */
export const IS_AICREDITS_PAUSED = false;

/**
 * Authoritative provider registry matching Master Launch specifications.
 */
export const PROVIDER_REGISTRY: ProviderEndpoint[] = [
  // ── Free Models Primary Gateway ───────────────────────────────────────────
  {
    id: 'openrouter',
    name: 'OpenRouter Free Tier',
    lane: 'free',
    serviceType: 'llm_inference',
    baseUrl: 'https://openrouter.ai/api/v1',
    appUrl: 'https://openrouter.ai/',
    priority: 0,
    creditDiscountMultiplier: 0.0,
    status: 'HEALTHY',
    consecutiveFailures: 0,
    hasApi: true,
  },
  // ── Paid Models Pool ────────────────────────────────────────────────────────
  {
    id: 'aicredits',
    name: 'AICredits.in Gateway',
    lane: 'paid',
    serviceType: 'llm_inference',
    baseUrl: 'https://aicredits.in/v1',
    appUrl: 'https://aicredits.in',
    priority: 1,
    creditDiscountMultiplier: 1.0,
    status: 'HEALTHY',
    consecutiveFailures: 0,
    hasApi: true,
  },
  {
    id: 'sarvam',
    name: 'Sarvam AI Gateway',
    lane: 'paid',
    serviceType: 'llm_inference',
    baseUrl: 'https://api.sarvam.ai/v1',
    appUrl: 'https://sarvam.ai',
    priority: 1,
    creditDiscountMultiplier: 1.0,
    status: 'HEALTHY',
    consecutiveFailures: 0,
    hasApi: true,
  },
  {
    id: 'deepgram',
    name: 'Deepgram Speech Gateway',
    lane: 'specialized',
    serviceType: 'llm_inference',
    baseUrl: 'https://api.deepgram.com/v1',
    appUrl: 'https://deepgram.com',
    priority: 1,
    creditDiscountMultiplier: 1.0,
    status: 'HEALTHY',
    consecutiveFailures: 0,
    hasApi: true,
  },
  {
    id: 'assemblyai',
    name: 'AssemblyAI Speech Gateway',
    lane: 'specialized',
    serviceType: 'llm_inference',
    baseUrl: 'https://api.assemblyai.com/v2',
    appUrl: 'https://assemblyai.com',
    priority: 1,
    creditDiscountMultiplier: 1.0,
    status: 'HEALTHY',
    consecutiveFailures: 0,
    hasApi: true,
  },

  // ── Category 2 Models Pool (Discounted Credits) ─────────────────────────────
  {
    id: 'codecraftapi',
    name: 'CodeCraft API',
    lane: 'category2',
    serviceType: 'llm_inference',
    baseUrl: 'https://codecraftapi.com/v1',
    appUrl: 'https://codecraftapi.com',
    priority: 1,
    creditDiscountMultiplier: 0.70,
    status: 'HEALTHY',
    consecutiveFailures: 0,
    hasApi: true,
  },
  {
    id: 'aihubmix',
    name: 'AIHubMix',
    lane: 'category2',
    serviceType: 'llm_inference',
    baseUrl: 'https://aihubmix.com/v1',
    appUrl: 'https://aihubmix.com',
    priority: 2,
    creditDiscountMultiplier: 0.70,
    status: 'HEALTHY',
    consecutiveFailures: 0,
    hasApi: true,
  },
  {
    id: 'tokenrouter',
    name: 'TokenRouter',
    lane: 'category2',
    serviceType: 'llm_inference',
    baseUrl: 'https://api.tokenrouter.com/v1',
    appUrl: 'https://www.tokenrouter.com/',
    priority: 3,
    creditDiscountMultiplier: 0.70,
    status: 'HEALTHY',
    consecutiveFailures: 0,
    hasApi: true,
  },
  {
    id: 'bynara',
    name: 'Router by Nara',
    lane: 'category2',
    serviceType: 'llm_inference',
    baseUrl: 'https://router.bynara.id/v1',
    appUrl: 'https://router.bynara.id/',
    priority: 4,
    creditDiscountMultiplier: 0.70,
    status: 'HEALTHY',
    consecutiveFailures: 0,
    hasApi: true,
  },
  {
    id: 'bluesminds',
    name: 'BluesMinds API',
    lane: 'category2',
    serviceType: 'llm_inference',
    baseUrl: 'https://api.bluesminds.com/v1',
    appUrl: 'https://api.bluesminds.com/',
    priority: 5,
    creditDiscountMultiplier: 0.70,
    status: 'OFFLINE', // Blocked by operator waitlist approval gate
    consecutiveFailures: 0,
    hasApi: true,
  },
  {
    id: 'freebuff',
    name: 'FreeBuff AI',
    lane: 'category2',
    serviceType: 'consumer_tool',
    baseUrl: 'https://freebuff.com',
    appUrl: 'https://freebuff.com/',
    priority: 6,
    creditDiscountMultiplier: 0.70,
    status: 'OFFLINE', // Strict NOT_AN_API status
    consecutiveFailures: 999,
    hasApi: false,
  },

  // ── Category 2 Specialized Tool Providers ───────────────────────────────────
  {
    id: 'you_com',
    name: 'You.com Router',
    lane: 'category2',
    serviceType: 'llm_inference',
    baseUrl: 'https://ydc-index.io/v1',
    appUrl: 'https://you.com/',
    priority: 7,
    creditDiscountMultiplier: 0.70,
    status: 'HEALTHY',
    consecutiveFailures: 0,
    hasApi: true,
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl Search & Extract',
    lane: 'category2',
    serviceType: 'web_crawler',
    baseUrl: 'https://api.firecrawl.dev/v1',
    appUrl: 'https://www.firecrawl.dev/app/',
    priority: 8,
    creditDiscountMultiplier: 0.70,
    status: 'HEALTHY',
    consecutiveFailures: 0,
    hasApi: true,
  },

  // ── Free Models Pool ────────────────────────────────────────────────────────
  {
    id: 'openrouter_free',
    name: 'OpenRouter Free',
    lane: 'free',
    serviceType: 'llm_inference',
    baseUrl: 'https://openrouter.ai/api/v1',
    appUrl: 'https://openrouter.ai',
    priority: 1,
    creditDiscountMultiplier: 0,
    status: 'HEALTHY',
    consecutiveFailures: 0,
    hasApi: true,
  },
];

/** Circuit-breaker failure thresholds */
const FAILURE_THRESHOLD_DEGRADED = 2;
const FAILURE_THRESHOLD_OFFLINE = 4;
const COOLDOWN_PERIOD_MS = 60 * 1000; // 1 minute before retry probe

/**
 * Returns all configured provider endpoints with their active health status.
 */
export function getProviderCatalog(): ProviderEndpoint[] {
  return [...PROVIDER_REGISTRY];
}

/**
 * Returns candidate providers for a given lane ordered by priority and health.
 */
export function getCandidatesForLane(lane: ProviderLane): ProviderEndpoint[] {
  const now = Date.now();
  return PROVIDER_REGISTRY
    .filter((p) => p.lane === lane && p.hasApi !== false && p.serviceType === 'llm_inference')
    .map((p) => {
      // Cooldown recovery check: if offline for longer than cooldown, promote to DEGRADED to allow probing
      // (Exception: freebuff is never an API and bluesminds requires manual admin unlock)
      if (
        p.status === 'OFFLINE' &&
        p.id !== 'freebuff' &&
        p.id !== 'bluesminds' &&
        p.lastFailureTime &&
        now - p.lastFailureTime > COOLDOWN_PERIOD_MS
      ) {
        p.status = 'DEGRADED';
      }
      return p;
    })
    .filter((p) => p.status !== 'OFFLINE')
    .sort((a, b) => {
      // Healthy first, then degraded, then by priority
      if (a.status !== b.status) {
        return a.status === 'HEALTHY' ? -1 : 1;
      }
      return a.priority - b.priority;
    });
}

/**
 * Returns the primary healthy provider for a lane, or the first available fallback.
 */
export function getNextHealthyProvider(lane: ProviderLane): ProviderEndpoint | null {
  const candidates = getCandidatesForLane(lane);
  return candidates[0] || null;
}

/**
 * Resolves the execution lane and fallback chain for a given model ID.
 */
export function resolveProviderRoute(modelId: string): {
  lane: ProviderLane;
  primaryProvider: ProviderEndpoint;
  fallbacks: ProviderEndpoint[];
  creditDiscountMultiplier: number;
} {
  const cleanId = (modelId || '').toLowerCase().trim();

  // FreeBuff rejection: strictly not an API
  if (cleanId.includes('freebuff')) {
    throw new FreeBuffNotAnApiError();
  }

  const isFree = cleanId.endsWith(':free') || cleanId === 'openrouter/free' || cleanId.startsWith('free/');
  const isCategory2 =
    cleanId.includes('codecraft') ||
    cleanId.includes('nara') ||
    cleanId.includes('tokenrouter') ||
    cleanId.includes('aihubmix') ||
    cleanId.includes('bluesminds') ||
    cleanId.includes('firecrawl') ||
    cleanId.includes('you_com') ||
    cleanId.includes('you.com');

  const lane: ProviderLane = isFree ? 'free' : isCategory2 ? 'category2' : 'paid';
  const candidates = getCandidatesForLane(lane);

  if (candidates.length === 0) {
    // If entire lane is down, fall back to default paid primary or free
    const fallback = PROVIDER_REGISTRY.find((p) => p.lane === lane) || PROVIDER_REGISTRY[0];
    return {
      lane,
      primaryProvider: fallback,
      fallbacks: [],
      creditDiscountMultiplier: fallback.creditDiscountMultiplier,
    };
  }

  const [primary, ...fallbacks] = candidates;
  return {
    lane,
    primaryProvider: primary,
    fallbacks,
    creditDiscountMultiplier: primary.creditDiscountMultiplier,
  };
}

/**
 * Updates circuit breaker statistics following a provider execution attempt.
 */
export function recordProviderExecution(
  providerId: string,
  success: boolean,
  durationMs: number = 0
): void {
  const endpoint = PROVIDER_REGISTRY.find((p) => p.id === providerId);
  if (!endpoint) return;

  if (success) {
    endpoint.consecutiveFailures = 0;
    endpoint.status = 'HEALTHY';
    if (durationMs > 0) {
      endpoint.averageLatencyMs = endpoint.averageLatencyMs
        ? Math.round((endpoint.averageLatencyMs * 0.7) + (durationMs * 0.3))
        : durationMs;
    }
  } else {
    endpoint.consecutiveFailures += 1;
    endpoint.lastFailureTime = Date.now();

    if (endpoint.consecutiveFailures >= FAILURE_THRESHOLD_OFFLINE) {
      endpoint.status = 'OFFLINE';
    } else if (endpoint.consecutiveFailures >= FAILURE_THRESHOLD_DEGRADED) {
      endpoint.status = 'DEGRADED';
    }
  }
}

/**
 * Resets all provider circuit breakers back to healthy (for testing or admin override).
 */
export function resetCircuitBreakers(): void {
  for (const endpoint of PROVIDER_REGISTRY) {
    endpoint.status = 'HEALTHY';
    endpoint.consecutiveFailures = 0;
    endpoint.lastFailureTime = undefined;
  }
}
