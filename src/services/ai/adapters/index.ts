/**
 * src/services/ai/adapters/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Canonical Provider Adapter Registry for PromptHub Architecture.
 *
 * Exposes canonical adapters for:
 * 1. openrouter (FREE MODELS ONLY)
 * 2. aicredits (ALL AVAILABLE MODELS)
 * 3. sarvam (ALL AVAILABLE MODELS & SERVICES)
 * 4. deepgram (ALL AVAILABLE PUBLIC MODELS)
 * 5. assemblyai (ALL AVAILABLE PUBLIC MODELS)
 *
 * Plus standard direct BYOK adapters:
 * openai, anthropic, gemini, deepseek, groq, mistral, xai, cohere, together, you_com.
 *
 * NOTE: Decommissioned providers have ZERO ghost support.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export * from './geminiAdapter';
export * from './openaiAdapter';
export * from './anthropicAdapter';
export * from './openrouterAdapter';
export * from './aicreditsAdapter';
export * from './sarvamAdapter';
export * from './deepgramAdapter';
export * from './assemblyaiAdapter';
export * from './deepseekAdapter';
export * from './xaiAdapter';
export * from './cohereAdapter';
export * from './togetherAdapter';
export * from './groqAdapter';
export * from './mistralAdapter';
export * from './openAICompatibleAdapter';
export * from './youComAdapter';

import { geminiAdapter } from './geminiAdapter';
import { openaiAdapter } from './openaiAdapter';
import { anthropicAdapter } from './anthropicAdapter';
import { openrouterAdapter } from './openrouterAdapter';
import { aicreditsAdapter } from './aicreditsAdapter';
import { sarvamAdapter } from './sarvamAdapter';
import { deepgramAdapter } from './deepgramAdapter';
import { assemblyaiAdapter } from './assemblyaiAdapter';
import { deepseekAdapter } from './deepseekAdapter';
import { xaiAdapter } from './xaiAdapter';
import { cohereAdapter } from './cohereAdapter';
import { togetherAdapter } from './togetherAdapter';
import { groqAdapter } from './groqAdapter';
import { mistralAdapter } from './mistralAdapter';
import {
  codecraftAdapter,
  aihubmixAdapter,
  tokenrouterAdapter,
  bynaraAdapter,
  conduitAdapter,
  bluesmindsAdapter,
} from './openAICompatibleAdapter';
import { youComAdapter } from './youComAdapter';

export const PROVIDER_ADAPTERS: Record<string, any> = {
  openrouter: openrouterAdapter,
  aicredits: aicreditsAdapter,
  sarvam: sarvamAdapter,
  deepgram: deepgramAdapter,
  assemblyai: assemblyaiAdapter,
  gemini: geminiAdapter,
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  deepseek: deepseekAdapter,
  xai: xaiAdapter,
  cohere: cohereAdapter,
  together: togetherAdapter,
  groq: groqAdapter,
  mistral: mistralAdapter,
  codecraft: codecraftAdapter,
  codecraftapi: codecraftAdapter,
  aihubmix: aihubmixAdapter,
  tokenrouter: tokenrouterAdapter,
  bynara: bynaraAdapter,
  conduit: conduitAdapter,
  bluesminds: bluesmindsAdapter,
  you_com: youComAdapter,
  you: youComAdapter,
};

export function getProviderAdapter(providerId: string) {
  const canonical = (providerId || '').toLowerCase().trim();
  return PROVIDER_ADAPTERS[canonical] || aicreditsAdapter;
}
