/**
 * src/services/ai/adapters/openrouterAdapter.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * OpenRouter Universal Gateway Provider Adapter for PromptHub.
 *
 * Universal BYOK execution & validation engine supporting 200+ models.
 *
 * STRICT INVARIANT: Zero silent model substitution or candidate model fallback loops.
 * Exact requested model IDs are preserved and dispatched to OpenRouter.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { capabilityResolver, type CanonicalAIRequest } from '../capabilityResolver';
import { classifyOpenRouterError, NormalizedAIError } from '../providerErrors';
import { executionTracer, computeKeyFingerprint } from '../executionTracer';
import type { ProviderExecutionResponse } from './geminiAdapter';

export const openrouterAdapter = {
  name: 'OpenRouter',
  providerId: 'openrouter',
  apiBaseUrl: 'https://openrouter.ai/api/v1',

  /**
   * Real provider-level key validation.
   */
  async validateKey(apiKey: string): Promise<{
    valid: boolean;
    status: 'valid' | 'error';
    message: string;
    error?: NormalizedAIError;
    capabilities?: {
      execution: boolean;
      label?: string;
      limit?: number;
      usage?: number;
      isFreeTier?: boolean;
    };
  }> {
    const cleanKey = (apiKey || '').trim();
    if (!cleanKey) {
      return {
        valid: false,
        status: 'error',
        message: 'Please provide an OpenRouter API key to validate.',
      };
    }

    try {
      const resp = await fetch(`${this.apiBaseUrl}/auth/key`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${cleanKey}`,
          'HTTP-Referer': 'https://prompthub.cloud',
          'X-Title': 'PromptHub Direct BYOK',
        },
      });

      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        const keyData = data?.data;
        const label = keyData?.label ? ` (${keyData.label})` : '';
        const limitStr = keyData?.limit != null ? ` · Limit: $${keyData.limit}` : '';
        const usageStr = keyData?.usage != null ? ` · Usage: $${keyData.usage.toFixed(2)}` : '';

        return {
          valid: true,
          status: 'valid',
          message: `✓ OpenRouter key verified!${label}${limitStr}${usageStr}`,
          capabilities: {
            execution: true,
            label: keyData?.label,
            limit: keyData?.limit,
            usage: keyData?.usage,
            isFreeTier: keyData?.is_free_tier,
          },
        };
      }

      const errData = await resp.json().catch(() => ({}));
      const classified = classifyOpenRouterError(resp.status, errData, 'key-validation');
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
        message: `❌ Network error reaching OpenRouter API: ${fetchErr?.message || fetchErr}`,
      };
    }
  },

  /**
   * Direct execution through OpenRouter universal gateway.
   * STRICT: Executes exact model, zero silent substitution loops.
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
        message: 'No OpenRouter API key configured. Please add your key in Settings.',
      });
    }

    const { resolvedModelId, nativePayload, fieldsSent, fieldsRemoved, endpointFamily, apiVersion } =
      capabilityResolver.resolveOpenRouterPayload(request);

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
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://prompthub.cloud',
          'X-Title': 'PromptHub.cloud Studio',
        },
        body: JSON.stringify(nativePayload),
        signal: request.signal,
      });

      // Intelligent parameter auto-recovery on 400 Bad Request
      if (!resp.ok && resp.status === 400) {
        const errClone = await resp.clone().json().catch(() => ({}));
        const rawErrStr = JSON.stringify(errClone).toLowerCase();
        let payloadModified = false;

        // 1. Strip response_format if rejected
        if (
          nativePayload.response_format &&
          (rawErrStr.includes('response_format') ||
            rawErrStr.includes('structured') ||
            rawErrStr.includes('schema') ||
            rawErrStr.includes('json_object'))
        ) {
          delete nativePayload.response_format;
          payloadModified = true;
        }

        // 2. Strip temperature if rejected (e.g. reasoning models or provider limitations)
        if (
          nativePayload.temperature !== undefined &&
          (rawErrStr.includes('temperature') ||
            rawErrStr.includes('param') ||
            rawErrStr.includes('not supported') ||
            rawErrStr.includes('unsupported'))
        ) {
          delete nativePayload.temperature;
          payloadModified = true;
        }

        // 3. Merge system role if model only supports user/assistant turns
        if (
          rawErrStr.includes('system') &&
          Array.isArray(nativePayload.messages) &&
          nativePayload.messages.some((m: any) => m.role === 'system')
        ) {
          const sysMsg = nativePayload.messages.find((m: any) => m.role === 'system')?.content || '';
          const nonSys = nativePayload.messages.filter((m: any) => m.role !== 'system');
          if (nonSys.length > 0) {
            nonSys[0].content = `[System Directive]: ${sysMsg}\n\n${nonSys[0].content}`;
          } else {
            nonSys.push({ role: 'user', content: sysMsg });
          }
          nativePayload.messages = nonSys;
          payloadModified = true;
        }

        if (payloadModified) {
          resp = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${cleanKey}`,
              'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://prompthub.cloud',
              'X-Title': 'PromptHub.cloud Studio',
            },
            body: JSON.stringify(nativePayload),
            signal: request.signal,
          });
        }
      }

      // Handle discontinued / unavailable :free model alias on BYOK OpenRouter key
      if (!resp.ok && (resp.status === 404 || resp.status === 400)) {
        const errClone = await resp.clone().json().catch(() => ({}));
        const rawErrStr = JSON.stringify(errClone).toLowerCase();
        if (
          (rawErrStr.includes('discontinued') || rawErrStr.includes('no longer available') || rawErrStr.includes('not found') || resp.status === 404) &&
          typeof nativePayload.model === 'string' &&
          nativePayload.model.endsWith(':free')
        ) {
          const stripped = nativePayload.model.replace(/:free$/, '');
          resp = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${cleanKey}`,
              'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://prompthub.cloud',
              'X-Title': 'PromptHub.cloud Studio',
            },
            body: JSON.stringify({ ...nativePayload, model: stripped }),
            signal: request.signal,
          });
        }
      }
    } catch (networkErr: any) {
      if (networkErr?.name === 'AbortError') throw networkErr;
      const durationMs = Date.now() - startTime;
      executionTracer.recordTrace({
        requestId,
        timestamp: startTime,
        provider: this.name,
        requestedModelId: request.modelId,
        resolvedModelId,
        adapter: 'openrouterAdapter',
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
        message: `Network error connecting to OpenRouter: ${networkErr?.message || networkErr}`,
        isRetryable: true,
      });
    }

    const durationMs = Date.now() - startTime;

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      const classified = classifyOpenRouterError(resp.status, errData, resolvedModelId);

      executionTracer.recordTrace({
        requestId,
        timestamp: startTime,
        provider: this.name,
        requestedModelId: request.modelId,
        resolvedModelId,
        adapter: 'openrouterAdapter',
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
      let streamedModel = resolvedModelId;

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
              if (chunkJson.error) {
                const errMsg = chunkJson.error.message || JSON.stringify(chunkJson.error);
                throw new Error(errMsg);
              }
              if (chunkJson.model) streamedModel = chunkJson.model;
              const deltaContent = chunkJson.choices?.[0]?.delta?.content || chunkJson.choices?.[0]?.text || '';
              const deltaReasoning = chunkJson.choices?.[0]?.delta?.reasoning_content || chunkJson.choices?.[0]?.delta?.reasoning || '';
              const delta = deltaContent || deltaReasoning;
              if (delta) {
                accumulated += delta;
                if (request.onChunk) {
                  request.onChunk(delta, accumulated);
                }
              }
            } catch (pErr: any) {
              if (pErr?.message && !pErr.message.includes('JSON')) {
                throw pErr;
              }
            }
          }
        }
      }

      return {
        output: accumulated,
        model: streamedModel,
        provider: 'OpenRouter (BYOK Gateway)',
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
    const output =
      data.choices?.[0]?.message?.content ||
      data.choices?.[0]?.message?.reasoning_content ||
      data.choices?.[0]?.text ||
      '';
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
    const actualModel = data.model || resolvedModelId;

    executionTracer.recordTrace({
      requestId,
      timestamp: startTime,
      provider: this.name,
      requestedModelId: request.modelId,
      resolvedModelId: actualModel,
      adapter: 'openrouterAdapter',
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
      model: actualModel,
      provider: 'OpenRouter (BYOK Gateway)',
      usage,
      usageMeasured: measured,
      durationMs,
      requestId,
    };
  },
};
