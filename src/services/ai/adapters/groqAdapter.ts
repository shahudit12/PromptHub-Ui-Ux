/**
 * src/services/ai/adapters/groqAdapter.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Groq LPU Ultra-Fast Inference Provider Adapter for PromptHub.
 *
 * Direct execution & validation engine supporting Llama 3.3 70B, Llama 3.1 8B,
 * DeepSeek R1 Distill, Mixtral 8x7B via Groq API.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { capabilityResolver, type CanonicalAIRequest } from '../capabilityResolver';
import { classifyGenericProviderError, NormalizedAIError } from '../providerErrors';
import { executionTracer, computeKeyFingerprint } from '../executionTracer';
import type { ProviderExecutionResponse } from './geminiAdapter';

export const groqAdapter = {
  name: 'Groq LPU',
  providerId: 'groq',
  apiBaseUrl: 'https://api.groq.com/openai/v1',

  /**
   * Real provider-level key validation.
   */
  async validateKey(apiKey: string): Promise<{
    valid: boolean;
    status: 'valid' | 'error';
    message: string;
    error?: NormalizedAIError;
    capabilities?: { execution: boolean };
  }> {
    const cleanKey = (apiKey || '').trim();
    if (!cleanKey) {
      return {
        valid: false,
        status: 'error',
        message: 'Please provide a Groq API key to validate.',
      };
    }

    try {
      const resp = await fetch(`${this.apiBaseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${cleanKey}`,
        },
      });

      if (resp.ok) {
        return {
          valid: true,
          status: 'valid',
          message: '✓ Groq LPU key verified! (Ultra-fast inference models authorized)',
          capabilities: { execution: true },
        };
      }

      const errData = await resp.json().catch(() => ({}));
      const classified = classifyGenericProviderError(this.name, resp.status, errData, 'models-list');
      return {
        valid: false,
        status: 'error',
        message: `❌ ${classified.message}`,
        error: classified,
      };
    } catch (fetchErr: any) {
      return {
        valid: false,
        status: 'error',
        message: `❌ Network error reaching Groq API: ${fetchErr?.message || fetchErr}`,
      };
    }
  },

  /**
   * Direct model execution via Groq OpenAI-compatible Chat Completions API.
   */
  async execute(
    apiKey: string,
    request: CanonicalAIRequest,
    requestId: string = (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}`)
  ): Promise<ProviderExecutionResponse> {
    const startTime = Date.now();
    const cleanKey = (apiKey || '').trim();
    if (!cleanKey) {
      throw new NormalizedAIError({
        code: 'AUTH_MISSING',
        provider: this.name,
        model: request.modelId,
        message: 'No Groq API key configured. Please add your key in Settings.',
      });
    }

    const { resolvedModelId, nativePayload, fieldsSent, fieldsRemoved, endpointFamily, apiVersion } =
      capabilityResolver.resolveGenericPayload('groq', request);

    const url = `${this.apiBaseUrl}/chat/completions`;
    const keyFingerprint = await computeKeyFingerprint(cleanKey);

    if (request.stream || request.onChunk) {
      nativePayload.stream = true;
    }

    let resp: Response;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanKey}`,
        },
        body: JSON.stringify(nativePayload),
        signal: request.signal,
      });
    } catch (networkErr: any) {
      if (networkErr?.name === 'AbortError') throw networkErr;
      const durationMs = Date.now() - startTime;
      executionTracer.recordTrace({
        requestId,
        timestamp: startTime,
        provider: this.name,
        requestedModelId: request.modelId,
        resolvedModelId,
        adapter: 'groqAdapter',
        endpointFamily,
        apiVersion,
        keyFingerprint,
        payloadFieldsSent: fieldsSent,
        payloadFieldsRemoved: fieldsRemoved,
        durationMs,
        status: 'failed',
        errorMessage: networkErr?.message,
      });

      throw new NormalizedAIError({
        code: 'PROVIDER_TIMEOUT',
        provider: this.name,
        model: request.modelId,
        message: `Network error connecting to Groq: ${networkErr?.message || networkErr}`,
        isRetryable: true,
      });
    }

    const durationMs = Date.now() - startTime;

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      const classified = classifyGenericProviderError(this.name, resp.status, errData, resolvedModelId);

      executionTracer.recordTrace({
        requestId,
        timestamp: startTime,
        provider: this.name,
        requestedModelId: request.modelId,
        resolvedModelId,
        adapter: 'groqAdapter',
        endpointFamily,
        apiVersion,
        keyFingerprint,
        payloadFieldsSent: fieldsSent,
        payloadFieldsRemoved: fieldsRemoved,
        responseStatus: resp.status,
        normalizedErrorCode: classified.code,
        durationMs,
        status: 'failed',
        errorMessage: classified.message,
      });

      throw classified;
    }

    // ── STREAMING CONSUMER ──
    if ((request.stream || request.onChunk) && resp.body) {
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const chunkJson = JSON.parse(trimmed.slice(6));
              const delta = chunkJson.choices?.[0]?.delta?.content || chunkJson.choices?.[0]?.text || '';
              if (delta) {
                accumulated += delta;
                if (request.onChunk) {
                  request.onChunk(delta, accumulated);
                }
              }
            } catch {
              // ignore partial chunk
            }
          }
        }
      }

      return {
        output: accumulated,
        model: resolvedModelId,
        provider: 'Groq LPU (Direct BYOK)',
        // The SSE stream carries no usage block, so nothing is reported. The
        // previous code returned `Math.ceil(length / 4)` for both prompt and
        // completion tokens, i.e. a character count divided by four rendered as
        // a token measurement.
        usage: undefined,
        usageMeasured: false,
        durationMs: Date.now() - startTime,
        requestId,
      };
    }

    const data = await resp.json();
    const output = data.choices?.[0]?.message?.content || '';
    // Usage is reported only when the provider measured it. The previous
    // `|| Math.ceil(length / 4)` fallback presented a character count divided by
    // four as a token measurement.
    const measured =
      typeof data.usage?.prompt_tokens === 'number' ||
      typeof data.usage?.completion_tokens === 'number' ||
      typeof data.usage?.total_tokens === 'number';
    const usage = measured
      ? {
          promptTokens: data.usage?.prompt_tokens,
          completionTokens: data.usage?.completion_tokens,
          totalTokens:
            data.usage?.total_tokens ??
            ((data.usage?.prompt_tokens ?? 0) + (data.usage?.completion_tokens ?? 0)),
        }
      : undefined;

    executionTracer.recordTrace({
      requestId,
      timestamp: startTime,
      provider: this.name,
      requestedModelId: request.modelId,
      resolvedModelId,
      adapter: 'groqAdapter',
      endpointFamily,
      apiVersion,
      keyFingerprint,
      payloadFieldsSent: fieldsSent,
      payloadFieldsRemoved: fieldsRemoved,
      responseStatus: 200,
      durationMs,
      status: 'success',
    });

    return {
      output,
      model: resolvedModelId,
      provider: 'Groq LPU (Direct BYOK)',
      usage,
      usageMeasured: measured,
      durationMs,
      requestId,
    };
  },
};
