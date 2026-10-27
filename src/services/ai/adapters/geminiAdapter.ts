/**
 * src/services/ai/adapters/geminiAdapter.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Google Gemini / Google AI Studio Direct Provider Adapter for PromptHub.
 *
 * Direct execution & validation engine supporting Gemini 2.5 Flash, 2.5 Pro,
 * 2.0 Flash, 1.5 Pro, 1.5 Flash via Google AI Studio API.
 *
 * Deep error classification for:
 * - API_NOT_ENABLED (GCP Generative Language API disabled)
 * - AUTH_KEY_RESTRICTION (IP / Referrer restrictions)
 * - BILLING_REQUIRED
 * - MODEL_NOT_FOUND
 * - RATE_LIMITED
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { capabilityResolver, type CanonicalAIRequest } from '../capabilityResolver';
import { classifyGeminiError, NormalizedAIError } from '../providerErrors';
import { executionTracer, computeKeyFingerprint } from '../executionTracer';

export interface ProviderExecutionResponse {
  output: string;
  model: string;
  provider: string;
  /**
   * Provider-reported token usage. Present only when the upstream response
   * actually carried usage numbers. Individual fields are optional because a
   * provider may report a total without a breakdown (or vice versa).
   */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  /**
   * True only when the numbers in `usage` came from the provider. False means
   * they are absent — callers must not present them as measured. Adapters
   * previously substituted `Math.ceil(text.length / 4)`, so a character count
   * divided by four was rendered to users as a token measurement.
   */
  usageMeasured?: boolean;
  durationMs: number;
  requestId: string;
}

export const geminiAdapter = {
  name: 'Google Gemini',
  providerId: 'gemini',
  apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',

  /**
   * Real provider-level key validation.
   * Performs an authoritative models list check against Google AI Studio.
   */
  async validateKey(apiKey: string): Promise<{
    valid: boolean;
    status: 'valid' | 'error';
    message: string;
    error?: NormalizedAIError;
    capabilities?: { execution: boolean; modelsCount?: number };
  }> {
    const cleanKey = (apiKey || '').trim();
    if (!cleanKey) {
      return {
        valid: false,
        status: 'error',
        message: 'Please provide a Google Gemini API key to validate.',
      };
    }

    try {
      const resp = await fetch(`${this.apiBaseUrl}/models?key=${cleanKey}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        const modelsCount = Array.isArray(data?.models) ? data.models.length : undefined;
        return {
          valid: true,
          status: 'valid',
          message: `✓ Google Gemini key verified! (${modelsCount || 'Multiple'} models authorized)`,
          capabilities: { execution: true, modelsCount },
        };
      }

      const errData = await resp.json().catch(() => ({}));
      const classified = classifyGeminiError(resp.status, errData, 'models-list');
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
        message: `❌ Network connection failed while reaching Google AI Studio: ${fetchErr?.message || fetchErr}`,
      };
    }
  },

  /**
   * Direct model execution via Google AI Studio API.
   * Preserves exact model requested without silent substitutions.
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
        message: 'No Google Gemini API key configured. Please add your key in Settings.',
      });
    }

    const { resolvedModelId, nativePayload, fieldsSent, fieldsRemoved, endpointFamily, apiVersion } =
      capabilityResolver.resolveGeminiPayload(request);

    const url = `${this.apiBaseUrl}/models/${resolvedModelId}:generateContent?key=${cleanKey}`;
    const keyFingerprint = await computeKeyFingerprint(cleanKey);

    let resp: Response;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': cleanKey,
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
        adapter: 'geminiAdapter',
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
        message: `Network error connecting to Google AI Studio: ${networkErr?.message || networkErr}`,
        isRetryable: true,
      });
    }

    const durationMs = Date.now() - startTime;

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      const classified = classifyGeminiError(resp.status, errData, resolvedModelId);

      executionTracer.recordTrace({
        requestId,
        timestamp: startTime,
        provider: this.name,
        requestedModelId: request.modelId,
        resolvedModelId,
        adapter: 'geminiAdapter',
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
    const output = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // Usage is reported only when Gemini measured it. The previous code derived
    // promptTokens/completionTokens from `Math.ceil(length / 4)` and only read
    // `usageMetadata.totalTokenCount` for the total, so the breakdown shown to
    // users was a character count divided by four presented as a measurement.
    const meta = data.usageMetadata;
    const measured =
      typeof meta?.promptTokenCount === 'number' ||
      typeof meta?.candidatesTokenCount === 'number' ||
      typeof meta?.totalTokenCount === 'number';
    const usage = measured
      ? {
          promptTokens: meta?.promptTokenCount,
          completionTokens: meta?.candidatesTokenCount,
          totalTokens:
            meta?.totalTokenCount ??
            ((meta?.promptTokenCount ?? 0) + (meta?.candidatesTokenCount ?? 0)),
        }
      : undefined;

    executionTracer.recordTrace({
      requestId,
      timestamp: startTime,
      provider: this.name,
      requestedModelId: request.modelId,
      resolvedModelId,
      adapter: 'geminiAdapter',
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
      provider: 'Google Gemini (Direct BYOK)',
      usage,
      usageMeasured: measured,
      durationMs,
      requestId,
    };
  },
};
