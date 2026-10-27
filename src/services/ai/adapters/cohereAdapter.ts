/**
 * src/services/ai/adapters/cohereAdapter.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Cohere Direct Provider Adapter for PromptHub.
 *
 * Direct execution & validation engine supporting Command R+ and Command R
 * via Cohere v2 Chat API.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { capabilityResolver, type CanonicalAIRequest } from '../capabilityResolver';
import { classifyGenericProviderError, NormalizedAIError } from '../providerErrors';
import { executionTracer, computeKeyFingerprint } from '../executionTracer';
import type { ProviderExecutionResponse } from './geminiAdapter';

export const cohereAdapter = {
  name: 'Cohere',
  providerId: 'cohere',
  apiBaseUrl: 'https://api.cohere.com',

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
        message: 'Please provide a Cohere API key to validate.',
      };
    }

    try {
      const resp = await fetch(`${this.apiBaseUrl}/v1/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${cleanKey}`,
        },
      });

      if (resp.ok) {
        return {
          valid: true,
          status: 'valid',
          message: '✓ Cohere key verified! (Command R+ & Command R authorized)',
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
        message: `❌ Network error reaching Cohere API: ${fetchErr?.message || fetchErr}`,
      };
    }
  },

  /**
   * Direct model execution via Cohere v2 Chat API.
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
        message: 'No Cohere API key configured. Please add your key in Settings.',
      });
    }

    const cleanModel = capabilityResolver.resolveNativeModelId('cohere', request.modelId);
    const keyFingerprint = await computeKeyFingerprint(cleanKey);

    const cohereMessages = request.messages.map(m => ({
      role: m.role,
      content: { type: 'text', text: m.content || '' },
    }));

    const nativePayload: Record<string, any> = {
      model: cleanModel,
      messages: cohereMessages,
    };

    if (typeof request.temperature === 'number') {
      nativePayload.temperature = request.temperature;
    }
    if (typeof request.maxTokens === 'number') {
      nativePayload.max_tokens = request.maxTokens;
    }

    const url = `${this.apiBaseUrl}/v2/chat`;

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
        adapter: 'cohereAdapter',
        endpointFamily: 'v2.chat',
        apiVersion: 'v2',
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
        message: `Network error connecting to Cohere: ${networkErr?.message || networkErr}`,
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
        adapter: 'cohereAdapter',
        endpointFamily: 'v2.chat',
        apiVersion: 'v2',
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
    const output = data.message?.content?.[0]?.text || '';
    // Usage is reported only when Cohere measured it. The previous
    // `|| Math.ceil(length / 4)` fallback presented a character count divided by
    // four as a token measurement.
    const tokens = data.usage?.tokens;
    const measured =
      typeof tokens?.input_tokens === 'number' ||
      typeof tokens?.output_tokens === 'number' ||
      typeof tokens?.total_tokens === 'number';
    const usage = measured
      ? {
          promptTokens: tokens?.input_tokens,
          completionTokens: tokens?.output_tokens,
          totalTokens:
            tokens?.total_tokens ??
            ((tokens?.input_tokens ?? 0) + (tokens?.output_tokens ?? 0)),
        }
      : undefined;

    executionTracer.recordTrace({
      requestId,
      timestamp: startTime,
      provider: this.name,
      requestedModelId: request.modelId,
      resolvedModelId: cleanModel,
      adapter: 'cohereAdapter',
      endpointFamily: 'v2.chat',
      apiVersion: 'v2',
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
      provider: 'Cohere (Direct BYOK)',
      usage,
      usageMeasured: measured,
      durationMs,
      requestId,
    };
  },
};
