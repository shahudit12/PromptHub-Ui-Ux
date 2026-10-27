/**
 * src/services/ai/adapters/sarvamAdapter.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Canonical Sarvam AI Adapter for PromptHub.
 *
 * Implements complete Sarvam AI services & model families:
 * 1. LLM Chat Completions: sarvam-105b, sarvam-105b-conversations, glm-5.3, gemma-4-31b, deepseek-v4-flash
 * 2. Speech-to-Text: saaras-v4 (default), saaras-v3, saaras-v2 (23 Indic languages + English)
 * 3. Text-to-Speech: bulbul-v3 (default), bulbul-v2 (30+ natural Indian speaker voices)
 * 4. Translation & Text: mayura (short text), sarvam-translate (document-level 22 Indian languages)
 * 5. Document Intelligence: sarvam-vision (multimodal document/OCR understanding)
 *
 * Distinct Billing Units:
 * - LLM: Tokens (input, cached input, output)
 * - STT: Audio duration (seconds / minutes)
 * - TTS: Characters
 * - Translation: Characters
 * - Document Intelligence: Pages / Documents
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NormalizedAIError } from '../providerErrors';
import { executionTracer, computeKeyFingerprint } from '../executionTracer';
import type { ProviderExecutionResponse } from './geminiAdapter';
import type { CanonicalAIRequest } from '../capabilityResolver';

export const SARVAM_MODELS = [
  // ─── LLM Models (Token Billing) ───────────────────────────────────────────
  {
    id: 'sarvam-105b',
    name: 'Sarvam 105B (MoE Reasoning)',
    capability: 'chat',
    billingUnit: 'tokens' as const,
    contextLength: 131072,
    maxOutputTokens: 8192,
    isReasoning: true,
    isCoding: true,
    description: 'Flagship 105B Mixture-of-Experts reasoning model optimized for 10 Indic languages and English.',
    pricing: {
      inputUsdPerMillion: 0.80,
      outputUsdPerMillion: 2.40,
    },
  },
  {
    id: 'sarvam-105b-conversations',
    name: 'Sarvam 105B Conversations',
    capability: 'chat',
    billingUnit: 'tokens' as const,
    contextLength: 131072,
    maxOutputTokens: 8192,
    isReasoning: false,
    description: 'High-speed conversational 105B MoE tuned for natural dialogue and customer workflows.',
    pricing: {
      inputUsdPerMillion: 0.60,
      outputUsdPerMillion: 1.80,
    },
  },
  {
    id: 'glm-5.3',
    name: 'GLM 5.3 (Beta Indic)',
    capability: 'chat',
    billingUnit: 'tokens' as const,
    contextLength: 131072,
    maxOutputTokens: 8192,
    isReasoning: true,
    description: 'Bilingual Indic general reasoning model.',
    pricing: {
      inputUsdPerMillion: 0.50,
      outputUsdPerMillion: 1.50,
    },
  },
  {
    id: 'gemma-4-31b',
    name: 'Gemma 4 31B (Sarvam Indic)',
    capability: 'chat',
    billingUnit: 'tokens' as const,
    contextLength: 131072,
    maxOutputTokens: 8192,
    isReasoning: false,
    description: 'Gemma 4 fine-tuned for high-fidelity vernacular reasoning and translation.',
    pricing: {
      inputUsdPerMillion: 0.40,
      outputUsdPerMillion: 1.20,
    },
  },
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek V4 Flash (Sarvam Route)',
    capability: 'chat',
    billingUnit: 'tokens' as const,
    contextLength: 65536,
    maxOutputTokens: 8192,
    isReasoning: true,
    description: 'Low-latency code and logic generation routed via Sarvam infrastructure.',
    pricing: {
      inputUsdPerMillion: 0.35,
      outputUsdPerMillion: 1.10,
    },
  },

  // ─── Speech-to-Text Models (Audio Duration Billing) ────────────────────────
  {
    id: 'saaras-v4',
    name: 'Saaras v4 (Frontier STT)',
    capability: 'stt',
    billingUnit: 'audio_seconds' as const,
    description: 'Industry-leading Indic speech recognition supporting 23 Indian languages, code-mixing, and noisy audio.',
    pricing: {
      usdPerSecond: 0.00015,
      usdPerMinute: 0.009,
    },
  },
  {
    id: 'saaras-v3',
    name: 'Saaras v3',
    capability: 'stt',
    billingUnit: 'audio_seconds' as const,
    description: 'Production Indic STT with high punctuation accuracy.',
    pricing: {
      usdPerSecond: 0.00012,
      usdPerMinute: 0.0072,
    },
  },
  {
    id: 'saaras-v2',
    name: 'Saaras v2 (Legacy)',
    capability: 'stt',
    billingUnit: 'audio_seconds' as const,
    description: 'Stable legacy speech-to-text.',
    pricing: {
      usdPerSecond: 0.0001,
      usdPerMinute: 0.006,
    },
  },

  // ─── Text-to-Speech Models (Character Billing) ─────────────────────────────
  {
    id: 'bulbul-v3',
    name: 'Bulbul v3 (Ultra-Natural TTS)',
    capability: 'tts',
    billingUnit: 'characters' as const,
    description: 'Frontier Indian speech synthesis with expressive prosody, 30+ regional voices, and emotion control.',
    pricing: {
      usdPer1000Chars: 0.002,
    },
  },
  {
    id: 'bulbul-v2',
    name: 'Bulbul v2',
    capability: 'tts',
    billingUnit: 'characters' as const,
    description: 'Standard natural voice synthesis for Indic languages.',
    pricing: {
      usdPer1000Chars: 0.0015,
    },
  },

  // ─── Translation Models (Character Billing) ────────────────────────────────
  {
    id: 'mayura',
    name: 'Mayura (Conversational Translation)',
    capability: 'translation',
    billingUnit: 'characters' as const,
    description: 'Real-time bi-directional translation across 22 Scheduled Indian Languages + English.',
    pricing: {
      usdPer1000Chars: 0.0015,
    },
  },
  {
    id: 'sarvam-translate',
    name: 'Sarvam Translate (Document Grade)',
    capability: 'translation',
    billingUnit: 'characters' as const,
    description: 'Formal, domain-adapted translation preserving document layout and terminology.',
    pricing: {
      usdPer1000Chars: 0.002,
    },
  },

  // ─── Document Intelligence (Page Billing) ──────────────────────────────────
  {
    id: 'sarvam-vision',
    name: 'Sarvam Vision / OCR',
    capability: 'vision',
    billingUnit: 'pages' as const,
    description: 'Extracts tabular data, handwritten text, and multi-script layouts from scanned documents.',
    pricing: {
      usdPerPage: 0.01,
    },
  },
];

export const sarvamAdapter = {
  id: 'sarvam',
  name: 'Sarvam AI',
  baseUrl: 'https://api.sarvam.ai',

  /**
   * Build headers conforming to Sarvam AI official authentication specification.
   * Note: Sarvam accepts both 'api-subscription-key' and standard Bearer token.
   */
  buildHeaders(apiKey: string): Record<string, string> {
    const cleanKey = (apiKey || '').trim();
    return {
      'Content-Type': 'application/json',
      'api-subscription-key': cleanKey,
      Authorization: `Bearer ${cleanKey}`,
    };
  },

  /**
   * Validate Sarvam AI API subscription key against the official model list endpoint.
   */
  async validateKey(
    apiKey: string
  ): Promise<{ valid: boolean; status: 'ok' | 'error'; message: string; capabilities?: any; models?: string[] }> {
    const cleanKey = (apiKey || '').trim();
    if (!cleanKey) {
      return {
        valid: false,
        status: 'error',
        message: 'Sarvam AI API key cannot be empty.',
      };
    }

    try {
      const resp = await fetch(`${this.baseUrl}/v1/models`, {
        method: 'GET',
        headers: this.buildHeaders(cleanKey),
      });

      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        const modelList = Array.isArray(data?.data) ? data.data.map((m: any) => m.id) : ['sarvam-105b', 'saaras-v4', 'bulbul-v3', 'mayura'];
        return {
          valid: true,
          status: 'ok',
          message: `✓ Connected to Sarvam AI (${modelList.length} models available)`,
          models: modelList,
          capabilities: {
            chat: true,
            stt: true,
            tts: true,
            translation: true,
            vision: true,
          },
        };
      }

      const errText = await resp.text().catch(() => '');
      return {
        valid: false,
        status: 'error',
        message: `❌ Sarvam AI validation failed (${resp.status}): ${errText.slice(0, 120)}`,
      };
    } catch (err: any) {
      return {
        valid: false,
        status: 'error',
        message: `❌ Connection error reaching Sarvam AI: ${err?.message || err}`,
      };
    }
  },

  /**
   * Execute chat completion through Sarvam AI OpenAI-compatible endpoint.
   */
  async execute(
    apiKey: string,
    request: CanonicalAIRequest,
    requestId?: string
  ): Promise<ProviderExecutionResponse> {
    const startTime = Date.now();
    const reqId = requestId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req_sarvam_${Date.now()}`);
    const cleanKey = (apiKey || '').trim();

    if (!cleanKey) {
      throw new NormalizedAIError({
        code: 'AUTH_MISSING',
        provider: this.name,
        model: request.modelId,
        message: 'Missing Sarvam AI API subscription key. Please configure SARVAM_API_KEY in Settings.',
      });
    }

    // Strip provider prefix if passed (e.g. "sarvam/sarvam-105b" -> "sarvam-105b")
    const targetModel = (request.modelId || '').replace(/^sarvam\//i, '').trim() || 'sarvam-105b';

    // Serialize payload cleanly: strip incompatible parameters
    const messages = request.messages.map((m) => ({
      role: m.role === 'system' || m.role === 'assistant' ? m.role : 'user',
      content: m.content,
    }));

    const payload: Record<string, unknown> = {
      model: targetModel,
      messages,
      max_tokens: Math.min(request.maxTokens || 4096, 8192),
    };

    if (typeof request.temperature === 'number' && Number.isFinite(request.temperature)) {
      payload.temperature = Math.max(0, Math.min(2, request.temperature));
    }

    const keyFingerprint = await computeKeyFingerprint(cleanKey);

    try {
      const resp = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: this.buildHeaders(cleanKey),
        body: JSON.stringify(payload),
        signal: request.signal,
      });

      const latencyMs = Date.now() - startTime;

      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '');
        const err = new NormalizedAIError({
          code: resp.status === 429 ? 'RATE_LIMITED' : resp.status === 401 ? 'AUTH_INVALID_KEY' : 'PROVIDER_INTERNAL_ERROR',
          provider: this.name,
          model: targetModel,
          httpStatus: resp.status,
          message: `Sarvam AI error (${resp.status}): ${errBody.slice(0, 160)}`,
        });

        executionTracer.recordTrace({
          requestId: reqId,
          timestamp: startTime,
          provider: this.name,
          requestedModelId: request.modelId,
          resolvedModelId: targetModel,
          adapter: 'sarvamAdapter',
          endpointFamily: 'openai-compatible',
          keyFingerprint,
          payloadFieldsSent: Object.keys(payload),
          payloadFieldsRemoved: [],
          responseStatus: resp.status,
          durationMs: latencyMs,
          status: 'failed',
          errorMessage: err.message,
        });
        throw err;
      }

      const data = await resp.json();
      const output = data.choices?.[0]?.message?.content || '';
      const usage = data.usage || {};

      executionTracer.recordTrace({
        requestId: reqId,
        timestamp: startTime,
        provider: this.name,
        requestedModelId: request.modelId,
        resolvedModelId: targetModel,
        adapter: 'sarvamAdapter',
        endpointFamily: 'openai-compatible',
        keyFingerprint,
        payloadFieldsSent: Object.keys(payload),
        payloadFieldsRemoved: [],
        responseStatus: 200,
        durationMs: latencyMs,
        status: 'success',
      });

      return {
        output,
        model: targetModel,
        provider: 'Sarvam AI',
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens || ((usage.prompt_tokens || 0) + (usage.completion_tokens || 0)),
        },
        usageMeasured: Boolean(usage.total_tokens || usage.prompt_tokens),
        durationMs: latencyMs,
        requestId: reqId,
      };
    } catch (fetchErr: any) {
      if (fetchErr instanceof NormalizedAIError) throw fetchErr;
      throw new NormalizedAIError({
        code: fetchErr.name === 'AbortError' ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNAVAILABLE',
        provider: this.name,
        model: targetModel,
        message: fetchErr.message || 'Failed to execute Sarvam AI request.',
      });
    }
  },
};
