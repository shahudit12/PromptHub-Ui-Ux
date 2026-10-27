/**
 * src/services/modelCatalogService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * PromptHub Multi-Provider Model Catalog Service (V2).
 *
 * CANONICAL MODEL ARCHITECTURE:
 * 1. OpenRouter Free Models (0 PromptHub credits, rate-limited free tier)
 * 2. AICredits.in Premium Models (Managed server-side executions with target-margin pricing)
 * 3. BYOK Models (Direct client-to-provider execution via user's API key)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { type AIProviderId } from './ai/multiProviderService';
import { getModelCreditCost } from '../config/modelCostCatalog';
import { isModelAvailableForUser } from '../config/providerRegistry';
import { getCanonicalModel } from '../config/providerModelRegistry';

export interface ModelProviderRouting {
  openrouter?: {
    available: boolean;
    modelId: string;
  };
  aicredits?: {
    available: boolean;
    modelId: string;
  };
  sarvam?: {
    available: boolean;
    modelId: string;
  };
  deepgram?: {
    available: boolean;
    modelId: string;
  };
  assemblyai?: {
    available: boolean;
    modelId: string;
  };
  you_com?: {
    available: boolean;
    modelId: string;
  };
  conduit?: {
    available: boolean;
    modelId: string;
  };
  codecraft?: {
    available: boolean;
    modelId: string;
  };
  aihubmix?: {
    available: boolean;
    modelId: string;
  };
  tokenrouter?: {
    available: boolean;
    modelId: string;
  };
  bynara?: {
    available: boolean;
    modelId: string;
  };
  bluesminds?: {
    available: boolean;
    modelId: string;
  };
  [key: string]:
    | {
        available: boolean;
        modelId: string;
      }
    | undefined;
}

export interface CatalogModel {
  id: string;
  canonicalId: string;
  name: string;
  provider: string;
  providerId: AIProviderId;
  description: string;
  contextLength: number;
  maxCompletionTokens?: number;
  pricing: {
    prompt: number; // USD per 1M tokens
    completion: number; // USD per 1M tokens
  };
  inputModalities: string[];
  outputModalities: string[];
  supportedParameters?: string[];
  category?: 'FREE' | 'PREMIUM' | 'BYOK';
  isFree: boolean;
  isRouter?: boolean;
  isPopular?: boolean;
  isReasoning?: boolean;
  isCoding?: boolean;
  isBatch?: boolean;

  // Model-Centric Provider Routing & Metadata (V3)
  primaryProvider?: string;
  fallbackProvider?: string;
  modelOwner?: string;
  capabilities?: {
    text: boolean;
    vision: boolean;
    audio?: boolean;
    video?: boolean;
    tools: boolean;
    functionCalling: boolean;
    streaming: boolean;
    structuredOutput: boolean;
    reasoning: boolean;
    coding?: boolean;
  };

  // Provider-Routing & Gateway Metadata
  providers?: ModelProviderRouting;
  creditPricing?: {
    openrouter?: number;
    aicredits?: number;
    sarvam?: number;
    deepgram?: number;
    assemblyai?: number;
    [key: string]: number | undefined;
  };
}

/**
 * Guaranteed Dynamic Free Routers
 */
export const GUARANTEED_FREE_ROUTER_MODEL: CatalogModel = {
  id: 'openrouter/free',
  canonicalId: 'openrouter/free',
  name: 'OpenRouter Free Router',
  provider: 'OpenRouter',
  providerId: 'openrouter',
  description: 'Automatically selects an available free OpenRouter model with dynamic capability filtering.',
  contextLength: 128000,
  pricing: { prompt: 0, completion: 0 },
  inputModalities: ['text', 'image'],
  outputModalities: ['text'],
  supportedParameters: ['temperature', 'max_tokens', 'top_p', 'response_format'],
  isFree: true,
  isRouter: true,
  isPopular: true,
  isReasoning: false,
  isCoding: false,
  providers: {
    openrouter: { available: true, modelId: 'openrouter/free' },
  },
  creditPricing: { openrouter: 0 },
};

const RAW_FALLBACK_CATALOG: CatalogModel[] = [
  GUARANTEED_FREE_ROUTER_MODEL,


  // ─── 1. FREE TIER MODELS (0 Credits, OpenRouter Verified Live) ─────────────
  {
    id: 'google/gemma-4-31b-it:free',
    canonicalId: 'google/gemma-4-31b-it:free',
    name: 'Gemma 4 31B Instruct (Free)',
    provider: 'Google',
    providerId: 'openrouter',
    description: 'Google frontier lightweight instruction model with 262K context at $0 cost.',
    contextLength: 262144,
    pricing: { prompt: 0, completion: 0 },
    inputModalities: ['text', 'image'],
    outputModalities: ['text'],
    isFree: true,
    isPopular: true,
    isReasoning: true,
    providers: {
      openrouter: { available: true, modelId: 'google/gemma-4-31b-it:free' },
    },
    creditPricing: { openrouter: 0 },
  },
  {
    id: 'cohere/north-mini-code:free',
    canonicalId: 'cohere/north-mini-code:free',
    name: 'North Mini Code (Free)',
    provider: 'Cohere',
    providerId: 'openrouter',
    description: 'Cohere specialized coding intelligence with 256K context at $0 cost.',
    contextLength: 256000,
    pricing: { prompt: 0, completion: 0 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: true,
    isPopular: true,
    isCoding: true,
    providers: {
      openrouter: { available: true, modelId: 'cohere/north-mini-code:free' },
    },
    creditPricing: { openrouter: 0 },
  },
  {
    id: 'nvidia/nemotron-3-super-120b-a12b:free',
    canonicalId: 'nvidia/nemotron-3-super-120b-a12b:free',
    name: 'Nemotron 3 Super 120B (Free)',
    provider: 'NVIDIA',
    providerId: 'openrouter',
    description: 'NVIDIA high-performance reasoning MoE model with 262K context window at $0 cost.',
    contextLength: 262144,
    pricing: { prompt: 0, completion: 0 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: true,
    isPopular: true,
    isReasoning: true,
    providers: {
      openrouter: { available: true, modelId: 'nvidia/nemotron-3-super-120b-a12b:free' },
    },
    creditPricing: { openrouter: 0 },
  },
  {
    id: 'nvidia/nemotron-3.5-lightning:free',
    canonicalId: 'nvidia/nemotron-3.5-lightning:free',
    name: 'Nemotron 3.5 Lightning (Free)',
    provider: 'NVIDIA',
    providerId: 'openrouter',
    description: 'NVIDIA ultra-fast lightning model with 1M context window for rapid prompt evaluation at $0 cost.',
    contextLength: 1000000,
    pricing: { prompt: 0, completion: 0 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: true,
    isPopular: true,
    providers: {
      openrouter: { available: true, modelId: 'nvidia/nemotron-3.5-lightning:free' },
    },
    creditPricing: { openrouter: 0 },
  },
  {
    id: 'google/gemma-4-26b-a4b-it:free',
    canonicalId: 'google/gemma-4-26b-a4b-it:free',
    name: 'Gemma 4 26B A4B (Free)',
    provider: 'Google',
    providerId: 'openrouter',
    description: 'Google MoE architecture instruction model with 262K context at $0 cost.',
    contextLength: 262144,
    pricing: { prompt: 0, completion: 0 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: true,
    providers: {
      openrouter: { available: true, modelId: 'google/gemma-4-26b-a4b-it:free' },
    },
    creditPricing: { openrouter: 0 },
  },
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    canonicalId: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    name: 'Nemotron 3 Ultra 550B (Free)',
    provider: 'NVIDIA',
    providerId: 'openrouter',
    description: 'NVIDIA 550B MoE flagship open weights model with deep instruction reasoning at $0 cost.',
    contextLength: 1000000,
    pricing: { prompt: 0, completion: 0 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: true,
    isReasoning: true,
    providers: {
      openrouter: { available: true, modelId: 'nvidia/nemotron-3-ultra-550b-a55b:free' },
    },
    creditPricing: { openrouter: 0 },
  },
  {
    id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    canonicalId: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    name: 'Nemotron 3 Nano Reasoning (Free)',
    provider: 'NVIDIA',
    providerId: 'openrouter',
    description: 'NVIDIA specialized multi-step reasoning and logic model at $0 cost.',
    contextLength: 131072,
    pricing: { prompt: 0, completion: 0 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: true,
    isReasoning: true,
    providers: {
      openrouter: { available: true, modelId: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free' },
    },
    creditPricing: { openrouter: 0 },
  },
  {
    id: 'dots-studio/dots-3-note-preview:free',
    canonicalId: 'dots-studio/dots-3-note-preview:free',
    name: 'Dots-3 Note Preview (Free)',
    provider: 'Dots Studio',
    providerId: 'openrouter',
    description: 'Dots Studio 512K context model specializing in technical prompt architecture at $0 cost.',
    contextLength: 512000,
    pricing: { prompt: 0, completion: 0 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: true,
    providers: {
      openrouter: { available: true, modelId: 'dots-studio/dots-3-note-preview:free' },
    },
    creditPricing: { openrouter: 0 },
  },
  {
    id: 'inclusionai/ling-3.0-flash-sante:free',
    canonicalId: 'inclusionai/ling-3.0-flash-sante:free',
    name: 'Ling 3.0 Flash Santé (Free)',
    provider: 'Inclusion AI',
    providerId: 'openrouter',
    description: 'Ultra-fast flash architecture with 262K context window optimized for prompt audits at $0 cost.',
    contextLength: 262144,
    pricing: { prompt: 0, completion: 0 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: true,
    providers: {
      openrouter: { available: true, modelId: 'inclusionai/ling-3.0-flash-sante:free' },
    },
    creditPricing: { openrouter: 0 },
  },
  {
    id: 'inclusionai/ling-3.1-flash',
    canonicalId: 'inclusionai/ling-3.1-flash',
    name: 'Ling 3.1 Flash (Free)',
    provider: 'Inclusion AI',
    providerId: 'openrouter',
    description: 'Next-generation low-latency flash reasoning model with $0 inference.',
    contextLength: 262144,
    pricing: { prompt: 0, completion: 0 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: true,
    providers: {
      openrouter: { available: true, modelId: 'inclusionai/ling-3.1-flash' },
    },
    creditPricing: { openrouter: 0 },
  },
  {
    id: 'apodex/apodex-1.1-mini:free',
    canonicalId: 'apodex/apodex-1.1-mini:free',
    name: 'Apodex 1.1 Mini (Free)',
    provider: 'Apodex',
    providerId: 'openrouter',
    description: 'Compact, efficient open-weight model for rapid testing and generation at $0 cost.',
    contextLength: 65536,
    pricing: { prompt: 0, completion: 0 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: true,
    providers: {
      openrouter: { available: true, modelId: 'apodex/apodex-1.1-mini:free' },
    },
    creditPricing: { openrouter: 0 },
  },
  {
    id: 'liquid/lfm-2.5-2.6b:free',
    canonicalId: 'liquid/lfm-2.5-2.6b:free',
    name: 'Liquid LFM 2.5 (Free)',
    provider: 'Liquid AI',
    providerId: 'openrouter',
    description: 'Liquid state-space foundation model engineered for low-latency prompt checks at $0 cost.',
    contextLength: 65536,
    pricing: { prompt: 0, completion: 0 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: true,
    providers: {
      openrouter: { available: true, modelId: 'liquid/lfm-2.5-2.6b:free' },
    },
    creditPricing: { openrouter: 0 },
  },
  {
    id: 'thinkingmachines/inkling:free',
    canonicalId: 'thinkingmachines/inkling:free',
    name: 'Inkling 1M (Free)',
    provider: 'Thinking Machines',
    providerId: 'openrouter',
    description: 'Open-weight multimodal MoE model with 1M token context window at $0 cost.',
    contextLength: 1048576,
    pricing: { prompt: 0, completion: 0 },
    inputModalities: ['text', 'image'],
    outputModalities: ['text'],
    isFree: true,
    providers: {
      openrouter: { available: true, modelId: 'thinkingmachines/inkling:free' },
    },
    creditPricing: { openrouter: 0 },
  },
  {
    id: 'thinkingmachines/inkling-small:free',
    canonicalId: 'thinkingmachines/inkling-small:free',
    name: 'Inkling Small (Free)',
    provider: 'Thinking Machines',
    providerId: 'openrouter',
    description: 'Lightweight high-speed multimodal MoE model at $0 cost.',
    contextLength: 262144,
    pricing: { prompt: 0, completion: 0 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: true,
    providers: {
      openrouter: { available: true, modelId: 'thinkingmachines/inkling-small:free' },
    },
    creditPricing: { openrouter: 0 },
  },
  {
    id: 'poolside/laguna-s-2.1:free',
    canonicalId: 'poolside/laguna-s-2.1:free',
    name: 'Laguna S 2.1 (Free)',
    provider: 'Poolside',
    providerId: 'openrouter',
    description: 'Poolside coding agent model optimized for software architecture and agentic execution.',
    contextLength: 262144,
    pricing: { prompt: 0, completion: 0 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: true,
    isCoding: true,
    providers: {
      openrouter: { available: true, modelId: 'poolside/laguna-s-2.1:free' },
    },
    creditPricing: { openrouter: 0 },
  },
  {
    id: 'poolside/laguna-xs-2.1:free',
    canonicalId: 'poolside/laguna-xs-2.1:free',
    name: 'Laguna XS 2.1 (Free)',
    provider: 'Poolside',
    providerId: 'openrouter',
    description: 'Poolside compact coding model with fast debugging and syntax synthesis.',
    contextLength: 131072,
    pricing: { prompt: 0, completion: 0 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: true,
    isCoding: true,
    providers: {
      openrouter: { available: true, modelId: 'poolside/laguna-xs-2.1:free' },
    },
    creditPricing: { openrouter: 0 },
  },

  // ─── 2. PAID FRONTIER MODELS (Primary: AICredits, Newest First) ───
  {
    id: 'anthropic/claude-3.7-sonnet',
    canonicalId: 'anthropic/claude-3.7-sonnet',
    name: 'Claude 3.7 Sonnet',
    provider: 'Anthropic',
    providerId: 'anthropic',
    description: 'Anthropic frontier hybrid model with adjustable chain-of-thought and coding mastery.',
    contextLength: 200000,
    maxCompletionTokens: 64000,
    pricing: { prompt: 3.00, completion: 15.00 },
    inputModalities: ['text', 'image'],
    outputModalities: ['text'],
    isFree: false,
    isPopular: true,
    isReasoning: true,
    isCoding: true,
    providers: {
      aicredits: { available: true, modelId: 'anthropic/claude-3.7-sonnet' },
    },
    creditPricing: { aicredits: 2 },
  },
  {
    id: 'deepseek/deepseek-r1',
    canonicalId: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1 (Dedicated)',
    provider: 'DeepSeek',
    providerId: 'deepseek',
    description: 'Full unconstrained reasoning model with zero rate-limit queueing.',
    contextLength: 64000,
    pricing: { prompt: 0.55, completion: 2.19 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: false,
    isReasoning: true,
    isPopular: true,
    providers: {
      aicredits: { available: true, modelId: 'deepseek/deepseek-r1' },
    },
    creditPricing: { aicredits: 1 },
  },
  {
    id: 'openai/o3-mini',
    canonicalId: 'openai/o3-mini',
    name: 'OpenAI o3-mini',
    provider: 'OpenAI',
    providerId: 'openai',
    description: 'High-speed reasoning model specialized for coding, math, and STEM reasoning.',
    contextLength: 200000,
    maxCompletionTokens: 100000,
    pricing: { prompt: 1.10, completion: 4.40 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: false,
    isReasoning: true,
    isCoding: true,
    providers: {
      aicredits: { available: true, modelId: 'openai/o3-mini' },
    },
    creditPricing: { aicredits: 1 },
  },
  {
    id: 'google/gemini-2.0-flash',
    canonicalId: 'google/gemini-2.0-flash',
    name: 'Gemini 2.0 Flash (Paid Production)',
    provider: 'Google',
    providerId: 'gemini',
    description: 'Production SLA Gemini 2.0 with multimodal streaming and sub-second latency.',
    contextLength: 1048576,
    pricing: { prompt: 0.10, completion: 0.40 },
    inputModalities: ['text', 'image'],
    outputModalities: ['text'],
    isFree: false,
    isPopular: true,
    providers: {
      aicredits: { available: true, modelId: 'google/gemini-2.0-flash' },
    },
    creditPricing: { aicredits: 1 },
  },
  {
    id: 'openai/gpt-4o',
    canonicalId: 'openai/gpt-4o',
    name: 'GPT-4o (Omni Flagship)',
    provider: 'OpenAI',
    providerId: 'openai',
    description: 'OpenAI flagship multimodal frontier model with state-of-the-art reasoning and speed.',
    contextLength: 128000,
    maxCompletionTokens: 16384,
    pricing: { prompt: 2.50, completion: 10.00 },
    inputModalities: ['text', 'image'],
    outputModalities: ['text'],
    isFree: false,
    isPopular: true,
    isCoding: true,
    providers: {
      aicredits: { available: true, modelId: 'openai/gpt-4o' },
    },
    creditPricing: { aicredits: 2 },
  },
  {
    id: 'openai/o1',
    canonicalId: 'openai/o1',
    name: 'OpenAI o1 (Deep Reasoning)',
    provider: 'OpenAI',
    providerId: 'openai',
    description: 'Complex STEM, logic, algorithmic reasoning, and code architecture proofing.',
    contextLength: 200000,
    maxCompletionTokens: 100000,
    pricing: { prompt: 15.00, completion: 60.00 },
    inputModalities: ['text', 'image'],
    outputModalities: ['text'],
    isFree: false,
    isReasoning: true,
    providers: {
      aicredits: { available: true, modelId: 'openai/o1' },
    },
    creditPricing: { aicredits: 5 },
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    canonicalId: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    providerId: 'anthropic',
    description: 'Industry benchmark for software engineering, complex system prompts, and nuance.',
    contextLength: 200000,
    maxCompletionTokens: 8192,
    pricing: { prompt: 3.00, completion: 15.00 },
    inputModalities: ['text', 'image'],
    outputModalities: ['text'],
    isFree: false,
    isPopular: true,
    isCoding: true,
    providers: {
      aicredits: { available: true, modelId: 'anthropic/claude-3.5-sonnet' },
    },
    creditPricing: { aicredits: 2 },
  },
  {
    id: 'deepseek/deepseek-chat',
    canonicalId: 'deepseek/deepseek-chat',
    name: 'DeepSeek Chat (V3)',
    provider: 'DeepSeek',
    providerId: 'deepseek',
    description: 'DeepSeek V3 flagship 671B MoE architecture for rapid coding and multi-turn chat.',
    contextLength: 128000,
    pricing: { prompt: 0.14, completion: 0.28 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: false,
    isCoding: true,
    isPopular: true,
    providers: {
      aicredits: { available: true, modelId: 'deepseek/deepseek-chat' },
    },
    creditPricing: { aicredits: 1 },
  },
  {
    id: 'google/gemini-1.5-pro',
    canonicalId: 'google/gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    providerId: 'gemini',
    description: 'Massive 2M token context window for ingesting entire codebases and books.',
    contextLength: 2097152,
    pricing: { prompt: 1.25, completion: 5.00 },
    inputModalities: ['text', 'image'],
    outputModalities: ['text'],
    isFree: false,
    providers: {
      aicredits: { available: true, modelId: 'google/gemini-1.5-pro' },
    },
    creditPricing: { aicredits: 2 },
  },
  {
    id: 'openai/gpt-4o-mini',
    canonicalId: 'openai/gpt-4o-mini',
    name: 'GPT-4o mini',
    provider: 'OpenAI',
    providerId: 'openai',
    description: 'Fast, lightweight intelligence for rapid prompt iteration and high-volume tasks.',
    contextLength: 128000,
    maxCompletionTokens: 16384,
    pricing: { prompt: 0.15, completion: 0.60 },
    inputModalities: ['text', 'image'],
    outputModalities: ['text'],
    isFree: false,
    isPopular: true,
    providers: {
      aicredits: { available: true, modelId: 'openai/gpt-4o-mini' },
    },
    creditPricing: { aicredits: 1 },
  },
  {
    id: 'anthropic/claude-3.5-haiku',
    canonicalId: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    providerId: 'anthropic',
    description: 'Next-generation ultra-fast Claude with incredible instruction-following.',
    contextLength: 200000,
    maxCompletionTokens: 8192,
    pricing: { prompt: 0.80, completion: 4.00 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: false,
    providers: {
      aicredits: { available: true, modelId: 'anthropic/claude-3.5-haiku' },
    },
    creditPricing: { aicredits: 1 },
  },
  {
    id: 'anthropic/claude-3-opus',
    canonicalId: 'anthropic/claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    providerId: 'anthropic',
    description: 'Anthropic powerful model for highly complex reasoning, nuanced analysis, and long-form synthesis.',
    contextLength: 200000,
    maxCompletionTokens: 4096,
    pricing: { prompt: 15.00, completion: 75.00 },
    inputModalities: ['text', 'image'],
    outputModalities: ['text'],
    isFree: false,
    isReasoning: true,
    providers: {
      aicredits: { available: true, modelId: 'anthropic/claude-3-opus' },
    },
    creditPricing: { aicredits: 5 },
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    canonicalId: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B Instruct',
    provider: 'Meta',
    providerId: 'openrouter',
    description: 'Dedicated high-throughput Llama 3.3 70B for dependable enterprise prompt workflows.',
    contextLength: 128000,
    pricing: { prompt: 0.40, completion: 0.40 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: false,
    isCoding: true,
    providers: {
      aicredits: { available: true, modelId: 'meta-llama/llama-3.3-70b-instruct' },
    },
    creditPricing: { aicredits: 1 },
  },
  {
    id: 'mistralai/mistral-large-2411',
    canonicalId: 'mistralai/mistral-large-2411',
    name: 'Mistral Large 2',
    provider: 'Mistral',
    providerId: 'mistral',
    description: 'Top-tier European flagship model with 128k context and multilingual fluency.',
    contextLength: 128000,
    pricing: { prompt: 2.00, completion: 6.00 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: false,
    providers: {
      aicredits: { available: true, modelId: 'mistralai/mistral-large-2411' },
    },
    creditPricing: { aicredits: 2 },
  },
  {
    id: 'x-ai/grok-2-1212',
    canonicalId: 'x-ai/grok-2-1212',
    name: 'Grok 2',
    provider: 'xAI',
    providerId: 'xai',
    description: 'State-of-the-art reasoning, code comprehension, and vision model from xAI.',
    contextLength: 128000,
    pricing: { prompt: 2.00, completion: 10.00 },
    inputModalities: ['text', 'image'],
    outputModalities: ['text'],
    isFree: false,
    providers: {
      aicredits: { available: true, modelId: 'x-ai/grok-2-1212' },
    },
    creditPricing: { aicredits: 2 },
  },
  {
    id: 'qwen/qwen-2.5-72b-instruct',
    canonicalId: 'qwen/qwen-2.5-72b-instruct',
    name: 'Qwen 2.5 72B Instruct',
    provider: 'Qwen',
    providerId: 'openrouter',
    description: 'Open-weight frontier model rivaling Claude 3.5 Sonnet in math, coding, and multilingual reasoning.',
    contextLength: 128000,
    pricing: { prompt: 0.35, completion: 0.40 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: false,
    isCoding: true,
    isReasoning: true,
    providers: {
      aicredits: { available: true, modelId: 'qwen/qwen-2.5-72b-instruct' },
    },
    creditPricing: { aicredits: 1 },
  },
  {
    id: 'qwen/qwen-2.5-coder-32b-instruct',
    canonicalId: 'qwen/qwen-2.5-coder-32b-instruct',
    name: 'Qwen 2.5 Coder 32B',
    provider: 'Qwen',
    providerId: 'openrouter',
    description: 'Premier open-weight coding benchmark model with deep syntax & multi-language debugging.',
    contextLength: 131072,
    pricing: { prompt: 0.66, completion: 1.00 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: false,
    isPopular: true,
    isCoding: true,
    isReasoning: true,
    providers: {
      openrouter: { available: true, modelId: 'qwen/qwen-2.5-coder-32b-instruct' },
      aicredits: { available: true, modelId: 'qwen/qwen-2.5-coder-32b-instruct' },
    },
    creditPricing: { openrouter: 1, aicredits: 1 },
  },

  // ─── 4. YOU.COM PAID INTELLIGENCE MODELS ─────────────────────────────────
  {
    id: 'you.com/answer',
    canonicalId: 'you.com/answer',
    name: 'You.com Answer API (Cited)',
    provider: 'You.com',
    providerId: 'you_com',
    description: 'Synthesized factual answers with grounded web citations and real-time verification.',
    contextLength: 65536,
    maxCompletionTokens: 8192,
    pricing: { prompt: 0.15, completion: 0.30 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: false,
    isPopular: true,
    capabilities: {
      text: true,
      vision: false,
      tools: true,
      functionCalling: true,
      streaming: true,
      structuredOutput: true,
      reasoning: false,
    },
    creditPricing: { aicredits: 1 },
  },
  {
    id: 'you.com/search',
    canonicalId: 'you.com/search',
    name: 'You.com Live Web Search',
    provider: 'You.com',
    providerId: 'you_com',
    description: 'Grounded web and news search designed for agent consumption with snippet extraction.',
    contextLength: 65536,
    maxCompletionTokens: 8192,
    pricing: { prompt: 0.10, completion: 0.20 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: false,
    isPopular: true,
    capabilities: {
      text: true,
      vision: false,
      tools: true,
      functionCalling: true,
      streaming: true,
      structuredOutput: true,
      reasoning: false,
    },
    creditPricing: { aicredits: 1 },
  },
  {
    id: 'you.com/research',
    canonicalId: 'you.com/research',
    name: 'You.com Deep Research Agent',
    provider: 'You.com',
    providerId: 'you_com',
    description: 'Autonomous multi-step research synthesis agent compiling comprehensive domain reports.',
    contextLength: 131072,
    maxCompletionTokens: 16384,
    pricing: { prompt: 0.40, completion: 0.80 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: false,
    isPopular: true,
    isReasoning: true,
    capabilities: {
      text: true,
      vision: false,
      tools: true,
      functionCalling: true,
      streaming: true,
      structuredOutput: true,
      reasoning: true,
    },
    creditPricing: { aicredits: 2 },
  },
  {
    id: 'you.com/finance',
    canonicalId: 'you.com/finance',
    name: 'You.com Financial Intelligence',
    provider: 'You.com',
    providerId: 'you_com',
    description: 'Financial analysis, SEC 10-K/10-Q filings, stock metrics, and valuation intelligence.',
    contextLength: 131072,
    maxCompletionTokens: 16384,
    pricing: { prompt: 0.40, completion: 0.80 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: false,
    isPopular: true,
    isReasoning: true,
    capabilities: {
      text: true,
      vision: false,
      tools: true,
      functionCalling: true,
      streaming: true,
      structuredOutput: true,
      reasoning: true,
    },
    creditPricing: { aicredits: 2 },
  },
  {
    id: 'conduit/default',
    canonicalId: 'conduit/default',
    name: 'Conduit Default Model',
    provider: 'Conduit',
    providerId: 'conduit',
    description: 'High-speed model execution routed via Conduit App Router.',
    contextLength: 128000,
    pricing: { prompt: 0.15, completion: 0.60 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: false,
    providers: {
      conduit: { available: true, modelId: 'conduit/default' },
    },
    creditPricing: { conduit: 1, aicredits: 1 },
  },
  {
    id: 'codecraft/default',
    canonicalId: 'codecraft/default',
    name: 'CodeCraft Router Model',
    provider: 'CodeCraft',
    providerId: 'codecraft',
    description: 'AI model inference routed via CodeCraft API.',
    contextLength: 128000,
    pricing: { prompt: 0.15, completion: 0.60 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: false,
    providers: {
      codecraft: { available: true, modelId: 'codecraft/default' },
    },
    creditPricing: { codecraft: 1, aicredits: 1 },
  },
  {
    id: 'aihubmix/default',
    canonicalId: 'aihubmix/default',
    name: 'AIHubMix Router Model',
    provider: 'AIHubMix',
    providerId: 'aihubmix',
    description: 'AI model inference routed via AIHubMix gateway.',
    contextLength: 128000,
    pricing: { prompt: 0.15, completion: 0.60 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: false,
    providers: {
      aihubmix: { available: true, modelId: 'aihubmix/default' },
    },
    creditPricing: { aihubmix: 1, aicredits: 1 },
  },
  {
    id: 'tokenrouter/default',
    canonicalId: 'tokenrouter/default',
    name: 'TokenRouter Model',
    provider: 'TokenRouter',
    providerId: 'tokenrouter',
    description: 'AI model inference routed via TokenRouter gateway.',
    contextLength: 128000,
    pricing: { prompt: 0.15, completion: 0.60 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: false,
    providers: {
      tokenrouter: { available: true, modelId: 'tokenrouter/default' },
    },
    creditPricing: { tokenrouter: 1, aicredits: 1 },
  },
  {
    id: 'bynara/default',
    canonicalId: 'bynara/default',
    name: 'Nara Router Model',
    provider: 'Nara',
    providerId: 'bynara',
    description: 'AI model inference routed via Router by Nara.',
    contextLength: 128000,
    pricing: { prompt: 0.15, completion: 0.60 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: false,
    providers: {
      bynara: { available: true, modelId: 'bynara/default' },
    },
    creditPricing: { bynara: 1, aicredits: 1 },
  },
  {
    id: 'bluesminds/default',
    canonicalId: 'bluesminds/default',
    name: 'BluesMinds Model',
    provider: 'BluesMinds',
    providerId: 'bluesminds',
    description: 'AI model inference routed via BluesMinds API.',
    contextLength: 128000,
    pricing: { prompt: 0.15, completion: 0.60 },
    inputModalities: ['text'],
    outputModalities: ['text'],
    isFree: false,
    providers: {
      bluesminds: { available: true, modelId: 'bluesminds/default' },
    },
    creditPricing: { bluesminds: 1, aicredits: 1 },
  },
];

export const FALLBACK_CATALOG: CatalogModel[] = RAW_FALLBACK_CATALOG.map((m) => {
  const canonical = getCanonicalModel(m.id);
  const isFree = m.isFree || m.id.endsWith(':free');
  return {
    ...m,
    primaryProvider: m.primaryProvider || canonical?.primaryProvider || (isFree ? 'openrouter' : 'aicredits'),
    fallbackProvider: m.fallbackProvider || (canonical?.fallbackProviders?.[0]) || (isFree ? undefined : 'aicredits'),
    modelOwner: m.modelOwner || canonical?.modelOwner || (m.id.split('/')[0] || 'AI'),
    capabilities: m.capabilities || canonical?.capabilities,
    creditPricing: {
      ...m.creditPricing,
      ...(canonical?.pricing?.promptHubCreditCost !== undefined
        ? {
            aicredits: canonical.pricing.promptHubCreditCost,
          }
        : {}),
      ...(isFree ? { openrouter: 0 } : {}),
    },
    providers: {
      ...m.providers,
      ...(isFree
        ? { openrouter: { available: true, modelId: m.id } }
        : {
            aicredits: { available: true, modelId: m.id },
          }),
    },
  };
});

// Helper: Filter non-text or batch models
export function isBatchModel(modelId: string): boolean {
  if (!modelId) return false;
  const lower = modelId.toLowerCase();
  return (
    lower.includes(':batch') ||
    lower.includes('whisper') ||
    lower.includes('tts') ||
    lower.includes('embedding') ||
    lower.includes('embed') ||
    lower.includes('lyria') ||
    lower.includes('audio') ||
    lower.includes('music') ||
    lower.includes('flux') ||
    lower.includes('dall-e') ||
    lower.includes('stable-diffusion') ||
    lower.includes('imagen') ||
    lower.includes('midjourney')
  );
}

class ModelCatalogService {
  private cachedCatalog: CatalogModel[] = FALLBACK_CATALOG;
  private lastFetchedAt = 0;
  private readonly CACHE_TTL_MS = 15 * 60 * 1000; // 15 Minutes

  /**
   * Returns all available models in the catalog.
   */
  public async getCatalog(forceRefresh = false): Promise<CatalogModel[]> {
    this.cachedCatalog = FALLBACK_CATALOG;
    this.lastFetchedAt = Date.now();
    return this.cachedCatalog;
  }

  /**
   * Synchronous cached catalog getter.
   */
  public getCachedCatalog(): CatalogModel[] {
    return this.cachedCatalog.length > 0 ? this.cachedCatalog : FALLBACK_CATALOG;
  }

  /**
   * Returns models strictly verified and allowed for user consumption (Available-Models-Only Rule).
   */
  public getUserAvailableCatalog(): CatalogModel[] {
    return this.getCachedCatalog().filter((m) => isModelAvailableForUser(m.id));
  }

  /**
   * Returns all free models available on OpenRouter.
   */
  public getFreeModels(): CatalogModel[] {
    return this.getUserAvailableCatalog().filter((m) => m.isFree);
  }

  /**
   * Returns all paid / premium models available on AICredits.
   */
  public getPremiumModels(): CatalogModel[] {
    return this.getUserAvailableCatalog().filter((m) => !m.isFree);
  }

  /**
   * Find a model by ID or canonical ID.
   */
  public findModel(modelId: string): CatalogModel | undefined {
    if (!modelId) return undefined;
    const clean = modelId.trim().toLowerCase();
    if (clean.includes('content-safety')) {
      return this.findModel('openrouter/free');
    }
    return this.getCachedCatalog().find(
      (m) =>
        m.id.toLowerCase() === clean ||
        m.canonicalId.toLowerCase() === clean ||
        m.id.toLowerCase().replace(/^(openrouter|aicredits)\//, '') === clean
    );
  }

  /**
   * Fetch catalog alias for backwards compatibility with UI components.
   */
  public async fetchCatalog(forceRefresh = false): Promise<CatalogModel[]> {
    return this.getCatalog(forceRefresh);
  }

  /**
   * Find model by ID alias.
   */
  public getModelById(id: string): CatalogModel | undefined {
    return this.findModel(id);
  }

  /**
   * Resolves a raw id to its canonical catalog id, or returns it unchanged when
   * the catalog does not know it. An unknown or empty id resolves to itself —
   * NOT to a model.
   *
   * This replaces a `normalizeModelId` that returned `'openrouter/free'` for an
   * empty id. Two problems with that: it duplicated the name of the execution-path
   * router's `normalizeModelId` (src/services/ai/modelRouter.ts) while doing the
   * opposite thing — that one throws UnroutableModelError on an empty id
   * precisely so a dropped selection cannot silently become a different model —
   * and it invented a model id out of no input, so a prompt saved with no model
   * matched the "openrouter/free" filter as though its author had chosen it.
   */
  public canonicalizeModelId(rawId: string): string {
    const clean = (rawId || '').trim();
    if (!clean) return '';
    if (clean.toLowerCase().includes('content-safety')) return 'openrouter/free';
    return this.findModel(clean)?.id ?? clean;
  }

  private mergeWithFallback(remoteModels: any[]): CatalogModel[] {
    const map = new Map<string, CatalogModel>();
    
    // Seed with static fallback
    FALLBACK_CATALOG.forEach((m) => map.set(m.id, m));

    // Overlay remote models (only for supported/known models or verified free models)
    remoteModels.forEach((rm) => {
      if (rm?.id && !isBatchModel(rm.id)) {
        const isFree = rm.isFree || rm.category === 'FREE' || rm.id.endsWith(':free');
        const canonical = getCanonicalModel(rm.id);
        const isSupported = isFree || map.has(rm.id) || Boolean(canonical);
        if (!isSupported) {
          // Reject unroutable arbitrary upstream models that lack backend execution support
          return;
        }
        const primaryProvider = rm.primaryProvider || canonical?.primaryProvider || (isFree ? 'openrouter' : 'aicredits');
        const fallbackProvider = rm.fallbackProvider || (canonical?.fallbackProviders?.[0]) || (isFree ? undefined : 'aicredits');
        const modelOwner = rm.modelOwner || canonical?.modelOwner || rm.vendor;
        const capabilities = rm.capabilities || canonical?.capabilities;

        map.set(rm.id, {
          id: rm.id,
          canonicalId: rm.canonicalId || rm.id,
          name: rm.name || rm.id,
          provider: rm.provider || (isFree ? 'OpenRouter' : 'AICredits'),
          providerId: (rm.providerId || (isFree ? 'openrouter' : 'openai')) as AIProviderId,
          primaryProvider,
          fallbackProvider,
          modelOwner,
          capabilities,
          description: rm.description || '',
          contextLength: rm.contextLength || 128000,
          pricing: rm.pricing || { prompt: 0, completion: 0 },
          inputModalities: rm.inputModalities || ['text'],
          outputModalities: rm.outputModalities || ['text'],
          isFree,
          isPopular: rm.isPopular || false,
          isReasoning: rm.isReasoning || Boolean(capabilities?.reasoning) || false,
          isCoding: rm.isCoding || Boolean(capabilities?.coding) || false,
          providers: isFree
            ? { openrouter: { available: true, modelId: rm.id } }
            : {
                aicredits: { available: true, modelId: rm.id },
              },
          creditPricing: isFree
            ? { openrouter: 0 }
            : { aicredits: getModelCreditCost(rm.id) },
        });
      }
    });

    return Array.from(map.values());
  }
}

export const MODEL_SHORTCUT_MAP: Record<string, string> = {
  'gemini-1-5-pro': 'google/gemini-pro-1.5',
  'gemini-2-5-pro': 'google/gemini-2.5-pro',
};

export function filterForRealTime(models: CatalogModel[]): CatalogModel[] {
  return models.filter((m) => !isBatchModel(m.id) && !m.isBatch);
}

export const modelCatalogService = new ModelCatalogService();
