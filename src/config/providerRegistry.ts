/**
 * src/config/providerRegistry.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Canonical Provider Registry & Execution Boundaries for PromptHub.
 *
 * THE 3 PROMPTHUB AI EXECUTION PATHS:
 * 1. openrouter_free  -> Approved Free OpenRouter models (free tier & dynamic router)
 * 2. aicredits        -> Managed Premium / Paid models (AICredits.in gateway, 40% margin billing)
 * 3. byok             -> User's personal API keys (OpenAI, Anthropic, Gemini, DeepSeek, Groq, etc. at 0 PromptHub credits)
 */

import { getCanonicalModel } from './providerModelRegistry';

export type ProviderId = 'openrouter' | 'aicredits' | 'sarvam' | 'deepgram' | 'assemblyai' | 'conduit' | 'codecraft' | 'aihubmix' | 'tokenrouter' | 'bynara' | 'bluesminds' | 'you_com' | 'firecrawl' | 'freebuff';
export type CredentialMode = 'MANAGED' | 'BYOK';
export type BillingMode = 'PROMPTHUB' | 'EXTERNAL';
export type ProviderCategory = 'FREE' | 'PREMIUM' | 'CATEGORY2' | 'BYOK' | 'SPECIALIZED';
export type ServiceType = 'llm_inference' | 'search_research' | 'web_crawler' | 'consumer_tool';
export type ProviderLaunchStatus = 'ACTIVE' | 'MANUAL_CONFIGURATION_REQUIRED' | 'BLOCKED' | 'SPECIALIZED_TOOL' | 'NOT_AN_API';

export interface ProviderDefinition {
  id: string;
  provider: ProviderId;
  credentialMode: CredentialMode;
  billingMode: BillingMode;
  category: ProviderCategory;
  label: string;
  badge: string;
  description: string;
  serviceType?: ServiceType;
  status?: ProviderLaunchStatus;
  hasApi?: boolean;
  baseUrl?: string;
  docsUrl?: string;
  authHeaderFormat?: string;
  discoveryEndpoint?: string | null;
  chatEndpoint?: string | null;
  creditDiscountMultiplier?: number;
  actionRequired?: string;
}

export const PROVIDERS: Record<string, ProviderDefinition> = {
  openrouter_free: {
    id: 'openrouter_free',
    provider: 'openrouter',
    credentialMode: 'MANAGED',
    billingMode: 'PROMPTHUB',
    category: 'FREE',
    label: 'OpenRouter Free',
    badge: 'FREE',
    description: 'Explicitly approved free models on OpenRouter with rate-limited free access.',
  },
  aicredits: {
    id: 'aicredits',
    provider: 'aicredits',
    credentialMode: 'MANAGED',
    billingMode: 'PROMPTHUB',
    category: 'PREMIUM',
    label: 'AICredits Premium',
    badge: 'PREMIUM • AICREDITS',
    description: 'Frontier and paid commercial models routed through AICredits.in gateway with PromptHub credit billing.',
  },
  sarvam: {
    id: 'sarvam',
    provider: 'sarvam',
    credentialMode: 'MANAGED',
    billingMode: 'PROMPTHUB',
    category: 'PREMIUM',
    label: 'Sarvam AI',
    badge: 'INDIC • SARVAM',
    description: 'Frontier Indian language models, speech recognition (Saaras), and TTS (Bulbul).',
  },
  deepgram: {
    id: 'deepgram',
    provider: 'deepgram',
    credentialMode: 'MANAGED',
    billingMode: 'PROMPTHUB',
    category: 'SPECIALIZED',
    label: 'Deepgram Speech',
    badge: 'VOICE • DEEPGRAM',
    description: 'High-speed audio intelligence platform with Nova-3 ASR and Aura TTS.',
  },
  assemblyai: {
    id: 'assemblyai',
    provider: 'assemblyai',
    credentialMode: 'MANAGED',
    billingMode: 'PROMPTHUB',
    category: 'SPECIALIZED',
    label: 'AssemblyAI',
    badge: 'SPEECH • ASSEMBLYAI',
    description: 'Universal speech-to-text platform across 99+ languages.',
  },
  byok: {
    id: 'byok',
    provider: 'openrouter',
    credentialMode: 'BYOK',
    billingMode: 'EXTERNAL',
    category: 'BYOK',
    label: 'Bring Your Own Key',
    badge: 'BYOK • 0 CREDITS',
    description: 'Execute models directly with your own provider API keys with zero PromptHub credit deduction.',
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 1. FREE OPENROUTER MODELS ALLOWLIST
// ─────────────────────────────────────────────────────────────────────────────
export const FREE_OPENROUTER_MODELS: readonly string[] = [
  'openrouter/free',
  'openrouter/auto',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'cohere/north-mini-code:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'nvidia/nemotron-3.5-lightning:free',
  'dots-studio/dots-3-note-preview:free',
  'inclusionai/ling-3.0-flash-sante:free',
  'inclusionai/ling-3.1-flash',
  'apodex/apodex-1.1-mini:free',
  'liquid/lfm-2.5-2.6b:free',
  'thinkingmachines/inkling:free',
  'thinkingmachines/inkling-small:free',
  'poolside/laguna-s-2.1:free',
  'poolside/laguna-xs-2.1:free',
  'google/lyria-3-pro-preview',
  'google/lyria-3-clip-preview',
  // Legacy aliases supported via router fallback
  'qwen/qwen-2.5-coder-32b-instruct:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'deepseek/deepseek-r1:free',
  'google/gemini-2.0-flash-exp:free',
  'qwen/qwen3.8-27b:free',
] as const;

/**
 * Whether a model id belongs to the free managed lane.
 *
 * BILLING SAFETY: the ":free" suffix is OpenRouter's own naming convention, but
 * it is part of a string the client chooses, so it must not be trusted blind.
 * This function used to `return true` for anything ending in ":free", which meant
 * a request for `openai/gpt-4o:free` was classified FREE, priced at 0 credits and
 * dispatched on PromptHub's managed key. A fabricated suffix on a known paid model
 * is now rejected.
 *
 * This is a client-side hint used for badges and cost preview only. The server
 * (`supabase/functions/_shared/modelAuthority.ts`) independently re-derives the
 * lane from live upstream pricing and rejects anything it cannot price, so this
 * function is never the authority on what the user is charged.
 */
export function isFreeOpenRouterModel(modelId: string): boolean {
  if (!modelId) return false;
  const clean = modelId.trim().toLowerCase();
  if (
    clean === 'openrouter/free' ||
    clean === 'free' ||
    clean === 'prompthub/auto-free' ||
    clean === 'auto-free' ||
    clean === 'prompthub/auto' ||
    clean === 'auto'
  ) return true;
  if (
    FREE_OPENROUTER_MODELS.some(
      (m) => m.toLowerCase() === clean || m.replace(/^openrouter\//, '').toLowerCase() === clean
    )
  ) {
    return true;
  }
  if (clean.endsWith(':free')) {
    // Strip the suffix and refuse it if the base model is a known paid model.
    // `openai/gpt-4o:free` does not exist upstream; treating it as free is how a
    // frontier model gets run at zero cost.
    const base = clean.slice(0, -':free'.length);
    if (isAICreditsModel(base)) return false;
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. AICREDITS.IN PREMIUM MODELS ALLOWLIST
// ─────────────────────────────────────────────────────────────────────────────
export const AICREDITS_PREMIUM_MODELS: readonly string[] = [
  // OpenAI
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'openai/o1',
  'openai/o1-mini',
  'openai/o3-mini',
  'openai/gpt-4.5-preview',
  // Anthropic
  'anthropic/claude-3.7-sonnet',
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3.5-haiku',
  'anthropic/claude-3-opus',
  // Google
  'google/gemini-2.0-flash',
  'google/gemini-2.0-pro-exp-02-05',
  'google/gemini-1.5-pro',
  'google/gemini-1.5-flash',
  // DeepSeek
  'deepseek/deepseek-r1',
  'deepseek/deepseek-chat',
  // Meta Llama
  'meta-llama/llama-3.3-70b-instruct',
  'meta-llama/llama-3.1-405b-instruct',
  'meta-llama/llama-3.1-8b-instruct',
  // Mistral & Qwen
  'mistralai/mistral-large-2411',
  'mistralai/codestral-2501',
  'qwen/qwen-2.5-72b-instruct',
  'qwen/qwen-2.5-coder-32b-instruct',
  'x-ai/grok-2-1212',
] as const;

export function isAICreditsModel(modelId: string): boolean {
  if (!modelId) return false;
  const clean = modelId.trim().toLowerCase();
  return AICREDITS_PREMIUM_MODELS.some(
    (m) => m.toLowerCase() === clean || m.split('/')[1]?.toLowerCase() === clean
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CANONICAL ROUTE RESOLVER
// ─────────────────────────────────────────────────────────────────────────────
export interface RouteResolution {
  provider: ProviderId;
  credentialMode: CredentialMode;
  billingMode: BillingMode;
  category: ProviderCategory;
  canonicalModelId: string;
  isAllowed: boolean;
  rejectionCode?: string;
  rejectionReason?: string;
  primaryProvider?: ProviderId;
  fallbackProvider?: ProviderId;
  fallbackPolicy?: string;
  modelOwner?: string;
}

export function resolveExecutionRoute(
  modelId: string,
  requestedProvider?: string,
  _hasByokKey: boolean = false,
  forceByok: boolean = false
): RouteResolution {
  const clean = (modelId || '').trim();

  // 1. BYOK Path
  if (forceByok || (requestedProvider === 'openrouter_byok') || (requestedProvider === 'byok')) {
    return {
      provider: 'openrouter',
      primaryProvider: 'openrouter',
      credentialMode: 'BYOK',
      billingMode: 'EXTERNAL',
      category: 'BYOK',
      canonicalModelId: clean,
      isAllowed: true,
    };
  }

  // 2. Free OpenRouter Path
  if (isFreeOpenRouterModel(clean) || requestedProvider === 'openrouter_free') {
    const isAllowed = isFreeOpenRouterModel(clean);
    return {
      provider: 'openrouter',
      primaryProvider: 'openrouter',
      credentialMode: 'MANAGED',
      billingMode: 'PROMPTHUB',
      category: 'FREE',
      canonicalModelId: clean,
      isAllowed,
      rejectionCode: isAllowed ? undefined : 'MODEL_NOT_AVAILABLE_IN_FREE_ROUTER',
      rejectionReason: isAllowed
        ? undefined
        : `Model "${clean}" is not in the free catalog. Free models include openrouter/free, Llama 3.3 70B Free, DeepSeek R1 Free, and Gemini 2.0 Flash Free.`,
    };
  }

  // 2b. You.com Path
  if (clean.startsWith('you.com/') || clean.startsWith('you_com/') || requestedProvider === 'you_com') {
    return {
      provider: 'you_com',
      primaryProvider: 'you_com',
      credentialMode: _hasByokKey ? 'BYOK' : 'MANAGED',
      billingMode: 'PROMPTHUB',
      category: 'PREMIUM',
      canonicalModelId: clean,
      isAllowed: true,
    };
  }

  // 2c. Sarvam AI Path
  if (clean.startsWith('sarvam/') || clean.startsWith('sarvam')) {
    return {
      provider: 'sarvam',
      primaryProvider: 'sarvam',
      credentialMode: 'MANAGED',
      billingMode: 'PROMPTHUB',
      category: 'PREMIUM',
      canonicalModelId: clean,
      isAllowed: true,
    };
  }

  // 2d. Deepgram Speech Path
  if (clean.startsWith('deepgram/') || clean.startsWith('deepgram')) {
    return {
      provider: 'deepgram',
      primaryProvider: 'deepgram',
      credentialMode: 'MANAGED',
      billingMode: 'PROMPTHUB',
      category: 'SPECIALIZED',
      canonicalModelId: clean,
      isAllowed: true,
    };
  }

  // 2e. AssemblyAI Path
  if (clean.startsWith('assemblyai/') || clean.startsWith('assemblyai')) {
    return {
      provider: 'assemblyai',
      primaryProvider: 'assemblyai',
      credentialMode: 'MANAGED',
      billingMode: 'PROMPTHUB',
      category: 'SPECIALIZED',
      canonicalModelId: clean,
      isAllowed: true,
    };
  }

  // 3. Managed Paid Path -> Model-Centric Primary Gateway with AICredits Default
  const looksLikeSlug = /^[a-z0-9._-]+\/[a-z0-9._:-]+$/i.test(clean);
  if (!looksLikeSlug) {
    return {
      provider: 'aicredits',
      primaryProvider: 'aicredits',
      credentialMode: 'MANAGED',
      billingMode: 'PROMPTHUB',
      category: 'PREMIUM',
      canonicalModelId: clean,
      isAllowed: false,
      rejectionCode: 'MODEL_ID_MALFORMED',
      rejectionReason: clean
        ? `"${clean}" is not a recognised model id. Model ids look like "openai/gpt-4o". Pick a model from the model picker.`
        : 'No model was selected.',
    };
  }

  const canonical = getCanonicalModel(clean);
  const primaryProvider = (canonical?.primaryProvider as ProviderId) || 'aicredits';
  const fallbackProvider = (canonical?.fallbackProviders?.[0] as ProviderId) || undefined;

  return {
    provider: primaryProvider,
    primaryProvider,
    fallbackProvider,
    fallbackPolicy: canonical?.fallbackPolicy || 'PRIMARY_PROVIDER_CREDITS_EXHAUSTED_ONLY',
    modelOwner: canonical?.modelOwner,
    credentialMode: 'MANAGED',
    billingMode: 'PROMPTHUB',
    category: 'PREMIUM',
    canonicalModelId: canonical?.canonicalModelId || clean,
    isAllowed: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. AUTHORITATIVE 11 PROVIDERS CATALOG & AVAILABLE-MODELS-ONLY GOVERNANCE
// ─────────────────────────────────────────────────────────────────────────────
export interface ProviderGatewaySpec {
  id: string;
  name: string;
  lane: 'paid' | 'category2' | 'free' | 'specialized' | 'non_api';
  serviceType: ServiceType;
  status: ProviderLaunchStatus;
  hasApi: boolean;
  baseUrl: string;
  appUrl: string;
  docsUrl: string;
  authHeaderFormat: string;
  discoveryEndpoint: string | null;
  chatEndpoint: string | null;
  creditDiscountMultiplier: number;
  actionRequired: string;
}

export const AUTHORITATIVE_PROVIDER_SPECS: ProviderGatewaySpec[] = [
  // ── Paid Models Pool ──────────────────────────────────────────────────────
  {
    id: 'aicredits',
    name: 'AICredits.in Gateway',
    lane: 'paid',
    serviceType: 'llm_inference',
    status: 'ACTIVE',
    hasApi: true,
    baseUrl: 'https://aicredits.in/v1',
    appUrl: 'https://aicredits.in',
    docsUrl: 'https://aicredits.in/docs',
    authHeaderFormat: 'Authorization: Bearer <AICREDITS_API_KEY>',
    discoveryEndpoint: 'https://aicredits.in/v1/models',
    chatEndpoint: 'https://aicredits.in/v1/chat/completions',
    creditDiscountMultiplier: 1.0,
    actionRequired: 'Active and verified managed gateway routing 400+ frontier models.',
  },
  {
    id: 'sarvam',
    name: 'Sarvam AI Gateway',
    lane: 'paid',
    serviceType: 'llm_inference',
    status: 'ACTIVE',
    hasApi: true,
    baseUrl: 'https://api.sarvam.ai/v1',
    appUrl: 'https://sarvam.ai',
    docsUrl: 'https://docs.sarvam.ai',
    authHeaderFormat: 'api-subscription-key: <SARVAM_API_KEY>',
    discoveryEndpoint: 'https://api.sarvam.ai/v1/models',
    chatEndpoint: 'https://api.sarvam.ai/v1/chat/completions',
    creditDiscountMultiplier: 1.0,
    actionRequired: 'Active managed gateway routing Indic language models, Saaras STT, and Bulbul TTS.',
  },
  {
    id: 'deepgram',
    name: 'Deepgram Speech AI',
    lane: 'specialized',
    serviceType: 'consumer_tool',
    status: 'ACTIVE',
    hasApi: true,
    baseUrl: 'https://api.deepgram.com/v1',
    appUrl: 'https://deepgram.com',
    docsUrl: 'https://developers.deepgram.com',
    authHeaderFormat: 'Authorization: Token <DEEPGRAM_API_KEY>',
    discoveryEndpoint: 'https://api.deepgram.com/v1/projects',
    chatEndpoint: null,
    creditDiscountMultiplier: 1.0,
    actionRequired: 'Active speech intelligence gateway for Nova-3 ASR and Aura TTS.',
  },
  {
    id: 'assemblyai',
    name: 'AssemblyAI Speech Platform',
    lane: 'specialized',
    serviceType: 'consumer_tool',
    status: 'ACTIVE',
    hasApi: true,
    baseUrl: 'https://api.assemblyai.com/v2',
    appUrl: 'https://assemblyai.com',
    docsUrl: 'https://www.assemblyai.com/docs',
    authHeaderFormat: 'Authorization: <ASSEMBLYAI_API_KEY>',
    discoveryEndpoint: null,
    chatEndpoint: null,
    creditDiscountMultiplier: 1.0,
    actionRequired: 'Active speech platform for Universal-3.6 Pro Realtime and async transcription.',
  },
  {
    id: 'conduit',
    name: 'Conduit App Router',
    lane: 'paid',
    serviceType: 'llm_inference',
    status: 'MANUAL_CONFIGURATION_REQUIRED',
    hasApi: true,
    baseUrl: 'https://conduit.ozdoev.net/v1',
    appUrl: 'https://conduit.ozdoev.net/#app',
    docsUrl: 'https://conduit.ozdoev.net/#docs',
    authHeaderFormat: 'Authorization: Bearer <CONDUIT_API_KEY>',
    discoveryEndpoint: 'https://conduit.ozdoev.net/v1/models',
    chatEndpoint: 'https://conduit.ozdoev.net/v1/chat/completions',
    creditDiscountMultiplier: 1.0,
    actionRequired: 'Create account at https://conduit.ozdoev.net/#app, generate API key, and set CONDUIT_API_KEY environment variable.',
  },

  // ── Category 2 Models Pool (30% Discount / 0.70x Multiplier) ───────────────
  {
    id: 'codecraft',
    name: 'CodeCraft API',
    lane: 'category2',
    serviceType: 'llm_inference',
    status: 'MANUAL_CONFIGURATION_REQUIRED',
    hasApi: true,
    baseUrl: 'https://codecraftapi.com/v1',
    appUrl: 'https://codecraftapi.com',
    docsUrl: 'https://codecraftapi.com/docs',
    authHeaderFormat: 'Authorization: Bearer <CODECRAFT_API_KEY>',
    discoveryEndpoint: 'https://codecraftapi.com/v1/models',
    chatEndpoint: 'https://codecraftapi.com/v1/chat/completions',
    creditDiscountMultiplier: 0.70,
    actionRequired: 'Sign up at https://codecraftapi.com, generate API key in developer dashboard, and set CODECRAFT_API_KEY environment variable.',
  },
  {
    id: 'aihubmix',
    name: 'AIHubMix',
    lane: 'category2',
    serviceType: 'llm_inference',
    status: 'MANUAL_CONFIGURATION_REQUIRED',
    hasApi: true,
    baseUrl: 'https://aihubmix.com/v1',
    appUrl: 'https://aihubmix.com',
    docsUrl: 'https://aihubmix.com/docs',
    authHeaderFormat: 'Authorization: Bearer <AIHUBMIX_API_KEY>',
    discoveryEndpoint: 'https://aihubmix.com/v1/models',
    chatEndpoint: 'https://aihubmix.com/v1/chat/completions',
    creditDiscountMultiplier: 0.70,
    actionRequired: 'Register at https://aihubmix.com, generate token in API Keys, top up balance, and set AIHUBMIX_API_KEY environment variable.',
  },
  {
    id: 'tokenrouter',
    name: 'TokenRouter',
    lane: 'category2',
    serviceType: 'llm_inference',
    status: 'MANUAL_CONFIGURATION_REQUIRED',
    hasApi: true,
    baseUrl: 'https://api.tokenrouter.com/v1',
    appUrl: 'https://www.tokenrouter.com/',
    docsUrl: 'https://docs.token-router.org/reference/api/',
    authHeaderFormat: 'Authorization: Bearer vk_live_<TOKENROUTER_API_KEY>',
    discoveryEndpoint: 'https://api.tokenrouter.com/v1/models',
    chatEndpoint: 'https://api.tokenrouter.com/v1/chat/completions',
    creditDiscountMultiplier: 0.70,
    actionRequired: 'Sign up at https://www.tokenrouter.com, generate live key (vk_live_...), and set TOKENROUTER_API_KEY environment variable.',
  },
  {
    id: 'bynara',
    name: 'Router by Nara',
    lane: 'category2',
    serviceType: 'llm_inference',
    status: 'MANUAL_CONFIGURATION_REQUIRED',
    hasApi: true,
    baseUrl: 'https://router.bynara.id/v1',
    appUrl: 'https://router.bynara.id/',
    docsUrl: 'https://router.bynara.id/docs',
    authHeaderFormat: 'Authorization: Bearer sk-nry-<BYNARA_API_KEY>',
    discoveryEndpoint: 'https://router.bynara.id/v1/models',
    chatEndpoint: 'https://router.bynara.id/v1/chat/completions',
    creditDiscountMultiplier: 0.70,
    actionRequired: 'Sign in to https://router.bynara.id/, copy API key from dashboard, and set BYNARA_API_KEY environment variable.',
  },
  {
    id: 'bluesminds',
    name: 'BluesMinds API',
    lane: 'category2',
    serviceType: 'llm_inference',
    status: 'BLOCKED',
    hasApi: true,
    baseUrl: 'https://api.bluesminds.com/v1',
    appUrl: 'https://api.bluesminds.com/',
    docsUrl: 'https://api.bluesminds.com/docs',
    authHeaderFormat: 'Authorization: Bearer <BLUESMINDS_API_KEY>',
    discoveryEndpoint: 'https://api.bluesminds.com/v1/models',
    chatEndpoint: 'https://api.bluesminds.com/v1/chat/completions',
    creditDiscountMultiplier: 0.70,
    actionRequired: 'New registrations at https://api.bluesminds.com/ are placed on hold/waitlist requiring operator manual approval. Once approved, set BLUESMINDS_API_KEY.',
  },

  // ── Specialized Tool & Search Providers ───────────────────────────────────
  {
    id: 'you_com',
    name: 'You.com Search & Research API',
    lane: 'specialized',
    serviceType: 'search_research',
    status: 'ACTIVE',
    hasApi: true,
    baseUrl: 'https://ydc-index.io/v1',
    appUrl: 'https://you.com/',
    docsUrl: 'https://documentation.you.com/',
    authHeaderFormat: 'X-API-Key: <YOU_COM_API_KEY>',
    discoveryEndpoint: null,
    chatEndpoint: 'https://ydc-index.io/v1/search',
    creditDiscountMultiplier: 0.70,
    actionRequired: 'Active web search grounding & research synthesis gateway.',
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl Search & Extract',
    lane: 'specialized',
    serviceType: 'web_crawler',
    status: 'SPECIALIZED_TOOL',
    hasApi: true,
    baseUrl: 'https://api.firecrawl.dev/v1',
    appUrl: 'https://www.firecrawl.dev/app/',
    docsUrl: 'https://docs.firecrawl.dev/',
    authHeaderFormat: 'Authorization: Bearer <FIRECRAWL_API_KEY>',
    discoveryEndpoint: null,
    chatEndpoint: null,
    creditDiscountMultiplier: 0.70,
    actionRequired: 'Sign up at https://www.firecrawl.dev/app/ and get API key for web scraping and markdown extraction. Not an LLM; excluded from model picker.',
  },

  // ── Non-API Consumer Tools ─────────────────────────────────────────────────
  {
    id: 'freebuff',
    name: 'FreeBuff AI',
    lane: 'non_api',
    serviceType: 'consumer_tool',
    status: 'NOT_AN_API',
    hasApi: false,
    baseUrl: 'https://freebuff.com',
    appUrl: 'https://freebuff.com/',
    docsUrl: 'https://freebuff.com',
    authHeaderFormat: 'None (Consumer Tool Only)',
    discoveryEndpoint: null,
    chatEndpoint: null,
    creditDiscountMultiplier: 0.70,
    actionRequired: 'FreeBuff is a consumer desktop/CLI application wrapper with NO public HTTP API surface. Do NOT configure as an API adapter.',
  },

  // ── Free Models Pool ───────────────────────────────────────────────────────
  {
    id: 'openrouter_free',
    name: 'OpenRouter Free Tier',
    lane: 'free',
    serviceType: 'llm_inference',
    status: 'ACTIVE',
    hasApi: true,
    baseUrl: 'https://openrouter.ai/api/v1',
    appUrl: 'https://openrouter.ai',
    docsUrl: 'https://openrouter.ai/docs',
    authHeaderFormat: 'Authorization: Bearer <OPENROUTER_API_KEY>',
    discoveryEndpoint: 'https://openrouter.ai/api/v1/models',
    chatEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
    creditDiscountMultiplier: 0.0,
    actionRequired: 'Active and verified for zero-credit community access.',
  },
];

/**
 * Returns whether a provider is marked as active and verified.
 */
export function isProviderVerified(providerId: string): boolean {
  const spec = AUTHORITATIVE_PROVIDER_SPECS.find((p) => p.id === providerId);
  return spec?.status === 'ACTIVE';
}

/**
 * Standby Gating Mode:
 * Kept false for launch so all providers and models (OpenRouter Free, You.com, AICredits,
 * Sarvam, Deepgram, AssemblyAI, and BYOK) are active and selectable.
 */
export const STANDBY_MODE_ONLY_OPENROUTER_FREE_AND_YOUCOM = false;

/**
 * AVAILABLE-MODELS-ONLY RULE:
 * Ensures that normal users can only select and execute models that have
 * active, verified credentials or are in the verified free catalog.
 * Unverified providers and non-LLM tools (Firecrawl, FreeBuff) are strictly excluded.
 */
export function isModelAvailableForUser(modelId: string): boolean {
  if (!modelId) return false;
  const clean = modelId.toLowerCase().trim();

  // 1. Non-API consumer tools and web crawlers are strictly excluded from LLM models
  if (
    clean.includes('firecrawl') ||
    clean.includes('freebuff')
  ) {
    return false;
  }

  // 1b. You.com grounded search & research models are available
  if (clean.includes('you.com') || clean.includes('you_com')) {
    return true;
  }

  // 2. Verified Free Models are always available
  if (isFreeOpenRouterModel(clean)) {
    return true;
  }

  // 3. Standby Gating check (disabled for full launch)
  if (STANDBY_MODE_ONLY_OPENROUTER_FREE_AND_YOUCOM) {
    return false;
  }

  // 4. Category 2 models are available if active or requested
  const category2Prefixes = ['codecraft', 'aihubmix', 'tokenrouter', 'bynara', 'bluesminds'];
  for (const prefix of category2Prefixes) {
    if (clean.startsWith(prefix) || clean.includes('/' + prefix)) {
      return isProviderVerified(prefix);
    }
  }

  // 5. Standard Paid Models (AICredits / Sarvam / Deepgram / AssemblyAI / Frontier models)
  return true;
}
