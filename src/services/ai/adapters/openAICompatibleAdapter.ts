/**
 * src/services/ai/adapters/openAICompatibleAdapter.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Generic OpenAI-Compatible Gateway Adapter for PromptHub.
 *
 * Powers dynamic execution and model discovery across:
 * - CodeCraft API (https://codecraftapi.com/v1)
 * - AIHubMix (https://aihubmix.com/v1)
 * - TokenRouter (https://api.tokenrouter.com/v1)
 * - Router by Nara (https://router.bynara.id/v1)
 * - Conduit (https://conduit.ozdoev.net/v1)
 * - BluesMinds (https://api.bluesminds.com/v1)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { capabilityResolver, type CanonicalAIRequest } from '../capabilityResolver';
import { classifyOpenAIError, NormalizedAIError } from '../providerErrors';
import { executionTracer, computeKeyFingerprint } from '../executionTracer';
import type { ProviderExecutionResponse } from './geminiAdapter';

export interface OpenAICompatibleConfig {
  providerId: string;
  providerName: string;
  defaultBaseUrl: string;
  authHeaderName?: string; // Default: 'Authorization'
  authPrefix?: string; // Default: 'Bearer '
}

export class OpenAICompatibleAdapter {
  public readonly providerId: string;
  public readonly name: string;
  public readonly apiBaseUrl: string;
  private readonly authHeaderName: string;
  private readonly authPrefix: string;

  constructor(config: OpenAICompatibleConfig) {
    this.providerId = config.providerId;
    this.name = config.providerName;
    this.apiBaseUrl = config.defaultBaseUrl.replace(/\/+$/, '');
    this.authHeaderName = config.authHeaderName || 'Authorization';
    this.authPrefix = config.authPrefix !== undefined ? config.authPrefix : 'Bearer ';
  }

  private buildHeaders(apiKey: string): Record<string, string> {
    const cleanKey = (apiKey || '').trim();
    return {
      'Content-Type': 'application/json',
      [this.authHeaderName]: `${this.authPrefix}${cleanKey}`,
    };
  }

  /**
   * Validates API key and checks connectivity to /models.
   */
  async validateKey(apiKey: string, customBaseUrl?: string): Promise<{
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
        message: `Please provide a ${this.name} API key to validate.`,
      };
    }

    const baseUrl = (customBaseUrl || this.apiBaseUrl).replace(/\/+$/, '');

    try {
      const resp = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: this.buildHeaders(cleanKey),
      });

      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        const modelsCount = Array.isArray(data?.data) ? data.data.length : undefined;
        return {
          valid: true,
          status: 'valid',
          message: `✓ ${this.name} credentials verified! (${modelsCount ?? 'Available'} models discovered)`,
          capabilities: { execution: true, modelsCount },
        };
      }

      const errData = await resp.json().catch(() => ({}));
      const classified = classifyOpenAIError(resp.status, errData, 'models-list');
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
        message: `❌ Network error connecting to ${this.name}: ${fetchErr?.message || fetchErr}`,
      };
    }
  }

  /**
   * Discovers available models dynamically from /v1/models endpoint.
   */
  async discoverModels(apiKey: string, customBaseUrl?: string): Promise<{
    models: Array<{ id: string; name: string; contextWindow?: number; ownedBy?: string }>;
    rawCount: number;
  }> {
    const cleanKey = (apiKey || '').trim();
    const baseUrl = (customBaseUrl || this.apiBaseUrl).replace(/\/+$/, '');

    const resp = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: this.buildHeaders(cleanKey),
    });

    if (!resp.ok) {
      throw new Error(`Failed to discover models from ${this.name} (HTTP ${resp.status})`);
    }

    const data = await resp.json();
    const rawList = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

    const models = rawList.map((m: any) => ({
      id: m.id || m.name,
      name: m.name || m.id,
      contextWindow: m.context_window || m.context_length || 128000,
      ownedBy: m.owned_by || this.name,
    }));

    return {
      models,
      rawCount: models.length,
    };
  }

  /**
   * Executes inference via /v1/chat/completions with streaming SSE support.
   */
  async execute(
    apiKey: string,
    request: CanonicalAIRequest,
    requestId: string = (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}`),
    customBaseUrl?: string
  ): Promise<ProviderExecutionResponse> {
    const startTime = Date.now();
    const cleanKey = (apiKey || '').trim();
    if (!cleanKey) {
      throw new NormalizedAIError({
        code: 'AUTH_MISSING',
        provider: this.name,
        model: request.modelId,
        message: `No ${this.name} API key configured. Please add your credentials.`,
      });
    }

    const { resolvedModelId, nativePayload, fieldsSent, fieldsRemoved, endpointFamily, apiVersion } =
      capabilityResolver.resolveOpenAIPayload(request);

    const baseUrl = (customBaseUrl || this.apiBaseUrl).replace(/\/+$/, '');
    const url = `${baseUrl}/chat/completions`;
    const keyFingerprint = await computeKeyFingerprint(cleanKey);

    if (request.stream || request.onChunk) {
      nativePayload.stream = true;
    }

    let resp: Response;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(cleanKey),
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
        adapter: 'openAICompatibleAdapter',
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
        message: `Network error connecting to ${this.name}: ${networkErr?.message || networkErr}`,
        isRetryable: true,
      });
    }

    const durationMs = Date.now() - startTime;

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      const classified = classifyOpenAIError(resp.status, errData, resolvedModelId);

      executionTracer.recordTrace({
        requestId,
        timestamp: startTime,
        provider: this.name,
        requestedModelId: request.modelId,
        resolvedModelId,
        adapter: 'openAICompatibleAdapter',
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
        provider: this.name,
        usage: undefined,
        usageMeasured: false,
        durationMs: Date.now() - startTime,
        requestId,
      };
    }

    const data = await resp.json();
    const output = data.choices?.[0]?.message?.content || '';
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
      adapter: 'openAICompatibleAdapter',
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
      provider: this.name,
      usage,
      usageMeasured: measured,
      durationMs,
      requestId,
    };
  }
}

// Pre-instantiated adapter singletons
export const codecraftAdapter = new OpenAICompatibleAdapter({
  providerId: 'codecraft',
  providerName: 'CodeCraft API',
  defaultBaseUrl: 'https://codecraftapi.com/v1',
});

export const aihubmixAdapter = new OpenAICompatibleAdapter({
  providerId: 'aihubmix',
  providerName: 'AIHubMix',
  defaultBaseUrl: 'https://aihubmix.com/v1',
});

export const tokenrouterAdapter = new OpenAICompatibleAdapter({
  providerId: 'tokenrouter',
  providerName: 'TokenRouter',
  defaultBaseUrl: 'https://api.tokenrouter.com/v1',
});

export const bynaraAdapter = new OpenAICompatibleAdapter({
  providerId: 'bynara',
  providerName: 'Router by Nara',
  defaultBaseUrl: 'https://router.bynara.id/v1',
});

export const conduitAdapter = new OpenAICompatibleAdapter({
  providerId: 'conduit',
  providerName: 'Conduit App Router',
  defaultBaseUrl: 'https://conduit.ozdoev.net/v1',
});


export const bluesmindsAdapter = new OpenAICompatibleAdapter({
  providerId: 'bluesminds',
  providerName: 'BluesMinds API',
  defaultBaseUrl: 'https://api.bluesminds.com/v1',
});
