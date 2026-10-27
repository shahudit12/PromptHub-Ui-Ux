/**
 * src/types/aiProvider.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Canonical AI Provider & Model Domain Types for PromptHub.
 *
 * UNIFIED MODEL IDENTITY:
 * Every model across PromptHub is uniquely identified by:
 *   provider_id + model_id + capability
 *
 * CANONICAL PROVIDER SET:
 * 1. openrouter  — FREE MODELS ONLY
 * 2. aicredits   — ALL AVAILABLE MODELS (400+ frontier & commercial)
 * 3. sarvam      — ALL AVAILABLE MODELS (Saaras v4, Bulbul v3, 105B, Translate, Vision, Beta)
 * 4. deepgram    — ALL AVAILABLE PUBLIC MODELS (Nova-3, Nova-2, Flux, Aura-2)
 * 5. assemblyai  — ALL AVAILABLE PUBLIC MODELS (Universal-3.6 Pro, 3.5 Pro, 2, Streaming, Sync, Dictation)
 *
 * PLUS DIRECT BYOK: openai, anthropic, gemini, deepseek, groq, mistral, xai, cohere, together, you_com.
 *
 * STRICTLY EXCLUDED: Deprecated legacy gateways.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type CanonicalProviderId =
  | 'openrouter'
  | 'aicredits'
  | 'sarvam'
  | 'deepgram'
  | 'assemblyai'
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'deepseek'
  | 'groq'
  | 'mistral'
  | 'xai'
  | 'cohere'
  | 'together'
  | 'you_com'
  | 'conduit'
  | 'codecraft'
  | 'aihubmix'
  | 'tokenrouter'
  | 'bynara'
  | 'bluesminds';

export type ModelCapability =
  | 'chat'
  | 'reasoning'
  | 'stt'
  | 'tts'
  | 'translation'
  | 'document_ocr'
  | 'realtime_stt';

export type BillingUnit =
  | 'tokens'
  | 'audio_duration_seconds'
  | 'audio_duration_minutes'
  | 'characters'
  | 'pages'
  | 'requests';

export interface ModelPricingSchema {
  pricingUnit: BillingUnit;

  // Upstream Provider Actual Cost (USD)
  inputUsdPerMillion?: number;
  outputUsdPerMillion?: number;
  cachedInputUsdPerMillion?: number;
  audioUsdPerMinute?: number;
  audioUsdPerSecond?: number;
  characterUsdPerThousand?: number;
  pageUsdPerPage?: number;
  perRequestUsd?: number;

  // PromptHub Internal Cost Calculation
  internalCostInr?: number;

  // PromptHub Customer Selling Price (Internal Platform Credits)
  promptHubCreditCost: number;

  effectiveFrom?: string;
  pricingVersion?: number;
}

export interface CanonicalModelDefinition {
  /** The provider hosting or serving this model execution */
  provider: CanonicalProviderId;
  providerDisplayName: string;

  /** The exact model ID recognized by the provider */
  modelId: string;

  /** The globally unique composite identity: `${provider}/${modelId}/${capability}` */
  canonicalModelId: string;

  /** User-friendly name */
  name: string;
  description?: string;

  /** Functional capability */
  capability: ModelCapability;

  /** Modality specifications */
  modality: {
    inputs: ('text' | 'image' | 'audio' | 'document')[];
    outputs: ('text' | 'audio' | 'image')[];
  };

  /** Context & Generation ceilings */
  contextWindow: number;
  maxOutputTokens: number;

  /** Feature flags & metadata */
  reasoningSupport: boolean;
  visionSupport: boolean;
  toolsSupport: boolean;
  streamingSupport: boolean;
  structuredOutputSupport: boolean;

  /** Model Lifecycle & Availability */
  status: 'active' | 'beta' | 'deprecated' | 'unavailable';
  freeOrPaid: 'FREE' | 'PAID';

  /** Upstream and platform pricing */
  pricing: ModelPricingSchema;

  /** Provider-specific Rate Limits */
  rateLimits?: {
    rpm?: number;
    tpm?: number;
    rpd?: number;
    concurrency?: number;
  };

  metadata?: Record<string, unknown>;
  lastVerifiedAt?: string;
  verificationStatus?: 'PASS' | 'FAIL' | 'UNVERIFIED' | 'NOT_TESTED_CREDENTIAL_MISSING';
}

/**
 * Standard Provider Lifecycle Interface
 */
export interface ProviderLifecycle {
  providerId: CanonicalProviderId;
  providerDisplayName: string;

  discoverModels(): Promise<CanonicalModelDefinition[]>;
  normalizeModels(rawModels: any[]): CanonicalModelDefinition[];
  getModel(modelId: string, capability?: ModelCapability): CanonicalModelDefinition | undefined;
  getPricing(modelId: string, capability?: ModelCapability): ModelPricingSchema | undefined;
  getCapabilities(modelId: string): ModelCapability[];
  healthCheck(): Promise<{ healthy: boolean; latencyMs?: number; message?: string }>;
  validateRequest(request: any): { valid: boolean; error?: string };
  execute(apiKey: string, request: any): Promise<any>;
  executeStream?(apiKey: string, request: any, onChunk: (chunk: string) => void): Promise<any>;
  calculateUsage(rawUsage: any, capability: ModelCapability): Record<string, number>;
  calculateProviderCost(usage: Record<string, number>, pricing: ModelPricingSchema): number;
}
