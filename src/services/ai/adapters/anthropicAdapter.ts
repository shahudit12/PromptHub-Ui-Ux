/**
 * src/services/ai/adapters/anthropicAdapter.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Anthropic Direct Provider Adapter for PromptHub.
 *
 * Direct execution & validation engine supporting Claude 3.7 Sonnet,
 * Claude 3.5 Sonnet, Claude 3.5 Haiku, and Claude 3 Opus via Anthropic Messages API.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { capabilityResolver, type CanonicalAIRequest } from '../capabilityResolver';
import { classifyAnthropicError, NormalizedAIError } from '../providerErrors';
import { executionTracer, computeKeyFingerprint } from '../executionTracer';
import type { ProviderExecutionResponse } from './geminiAdapter';

export const anthropicAdapter = {
  name: 'Anthropic Claude',
  providerId: 'anthropic',
  apiBaseUrl: 'https://api.anthropic.com/v1',

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
        message: 'Please provide an Anthropic API key to validate.',
      };
    }

    try {
      const resp = await fetch(`${this.apiBaseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': cleanKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });

      if (resp.ok || resp.status === 200) {
        return {
          valid: true,
          status: 'valid',
          message: '✓ Anthropic Claude key verified! (Claude 3.7 & 3.5 models authorized)',
          capabilities: { execution: true },
        };
      }

      const errData = await resp.json().catch(() => ({}));
      const classified = classifyAnthropicError(resp.status, errData, 'validation-ping');
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
        message: `❌ Network error reaching Anthropic Messages API: ${fetchErr?.message || fetchErr}`,
      };
    }
  },

  /**
   * Direct model execution via Anthropic Messages API.
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
        message: 'No Anthropic API key configured. Please add your key in Settings.',
      });
    }

    const { resolvedModelId, nativePayload, fieldsSent, fieldsRemoved, endpointFamily, apiVersion } =
      capabilityResolver.resolveAnthropicPayload(request);

    const url = `${this.apiBaseUrl}/messages`;
    const keyFingerprint = await computeKeyFingerprint(cleanKey);

    let resp: Response;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': cleanKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
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
        adapter: 'anthropicAdapter',
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
        message: `Network error connecting to Anthropic: ${networkErr?.message || networkErr}`,
        isRetryable: true,
      });
    }

    const durationMs = Date.now() - startTime;

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      const classified = classifyAnthropicError(resp.status, errData, resolvedModelId);

      executionTracer.recordTrace({
        requestId,
        timestamp: startTime,
        provider: this.name,
        requestedModelId: request.modelId,
        resolvedModelId,
        adapter: 'anthropicAdapter',
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

    const data = await resp.json();
    const output = data.content?.[0]?.text || '';
    // Usage is reported only when Anthropic measured it. The previous
    // `|| Math.ceil((request.prompt?.length || 100) / 4)` fallback presented a
    // character count divided by four — or a hardcoded 100 characters when there
    // was no prompt string at all — as a token measurement.
    const measured =
      typeof data.usage?.input_tokens === 'number' ||
      typeof data.usage?.output_tokens === 'number';
    const usage = measured
      ? {
          promptTokens: data.usage?.input_tokens,
          completionTokens: data.usage?.output_tokens,
          totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
        }
      : undefined;

    executionTracer.recordTrace({
      requestId,
      timestamp: startTime,
      provider: this.name,
      requestedModelId: request.modelId,
      resolvedModelId,
      adapter: 'anthropicAdapter',
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
      provider: 'Anthropic Claude (Direct BYOK)',
      usage,
      usageMeasured: measured,
      durationMs,
      requestId,
    };
  },
};
