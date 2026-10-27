/**
 * src/services/ai/adapters/togetherAdapter.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Together AI Provider Adapter for PromptHub.
 *
 * Direct execution & validation engine supporting open foundation models:
 * Llama 3.3 70B Turbo, Qwen 2.5 72B Turbo, DeepSeek R1 via Together AI API.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { capabilityResolver, type CanonicalAIRequest } from '../capabilityResolver';
import { classifyGenericProviderError, NormalizedAIError } from '../providerErrors';
import { executionTracer, computeKeyFingerprint } from '../executionTracer';
import type { ProviderExecutionResponse } from './geminiAdapter';

export const togetherAdapter = {
  name: 'Together AI',
  providerId: 'together',
  apiBaseUrl: 'https://api.together.xyz/v1',

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
        message: 'Please provide a Together AI API key to validate.',
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
          message: '✓ Together AI key verified! (Open weights foundation models authorized)',
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
        message: `❌ Network error reaching Together AI API: ${fetchErr?.message || fetchErr}`,
      };
    }
  },

  /**
   * Direct model execution via Together AI Chat Completions API.
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
        message: 'No Together AI API key configured. Please add your key in Settings.',
      });
    }

    const cleanModel = capabilityResolver.resolveNativeModelId('together', request.modelId);
    const keyFingerprint = await computeKeyFingerprint(cleanKey);
    const nativePayload: Record<string, any> = {
      model: cleanModel,
      messages: request.messages.map(m => ({ role: m.role, content: m.content })),
    };

    if (typeof request.temperature === 'number') {
      nativePayload.temperature = request.temperature;
    }
    if (typeof request.maxTokens === 'number') {
      nativePayload.max_tokens = request.maxTokens;
    }
    if (request.responseFormat) {
      nativePayload.response_format = request.responseFormat;
    }

    const url = `${this.apiBaseUrl}/chat/completions`;

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
        resolvedModelId: cleanModel,
        adapter: 'togetherAdapter',
        endpointFamily: 'chat.completions',
        apiVersion: 'v1',
        keyFingerprint,
        payloadFieldsSent: ['model', 'messages'],
        payloadFieldsRemoved: [],
        durationMs,
        status: 'failed',
        errorMessage: networkErr?.message,
      });

      throw new NormalizedAIError({
        code: 'PROVIDER_TIMEOUT',
        provider: this.name,
        model: request.modelId,
        message: `Network error connecting to Together AI: ${networkErr?.message || networkErr}`,
        isRetryable: true,
      });
    }

    const durationMs = Date.now() - startTime;

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      const classified = classifyGenericProviderError(this.name, resp.status, errData, cleanModel);

      executionTracer.recordTrace({
        requestId,
        timestamp: startTime,
        provider: this.name,
        requestedModelId: request.modelId,
        resolvedModelId: cleanModel,
        adapter: 'togetherAdapter',
        endpointFamily: 'chat.completions',
        apiVersion: 'v1',
        keyFingerprint,
        payloadFieldsSent: ['model', 'messages'],
        payloadFieldsRemoved: [],
        responseStatus: resp.status,
        normalizedErrorCode: classified.code,
        durationMs,
        status: 'failed',
        errorMessage: classified.message,
      });

      throw classified;
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
      resolvedModelId: cleanModel,
      adapter: 'togetherAdapter',
      endpointFamily: 'chat.completions',
      apiVersion: 'v1',
      keyFingerprint,
      payloadFieldsSent: ['model', 'messages'],
      payloadFieldsRemoved: [],
      responseStatus: 200,
      durationMs,
      status: 'success',
    });

    return {
      output,
      model: cleanModel,
      provider: 'Together AI (Direct BYOK)',
      usage,
      usageMeasured: measured,
      durationMs,
      requestId,
    };
  },
};
