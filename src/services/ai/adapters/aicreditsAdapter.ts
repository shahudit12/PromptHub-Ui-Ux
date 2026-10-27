/**
 * src/services/ai/adapters/aicreditsAdapter.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * AICredits.in Direct BYOK & Gateway Provider Adapter for PromptHub.
 *
 * Direct client-to-gateway execution & validation engine supporting 400+ models.
 * Base URL: https://aicredits.in/v1
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { type CanonicalAIRequest } from '../capabilityResolver';
import { classifyAICreditsError, NormalizedAIError } from '../providerErrors';
import { executionTracer, computeKeyFingerprint } from '../executionTracer';
import type { ProviderExecutionResponse } from './geminiAdapter';

export const aicreditsAdapter = {
  name: 'AICredits',
  providerId: 'aicredits',
  apiBaseUrl: 'https://aicredits.in/v1',

  /**
   * Real provider-level key validation using a micro-probe request.
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
        message: 'Please provide an AICredits.in API key to validate.',
      };
    }

    try {
      const resp = await fetch(`${this.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cleanKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://prompthub.cloud',
          'X-Title': 'PromptHub Direct BYOK',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(10000),
      });

      const bodyText = await resp.text().catch(() => '');
      const lowerBody = bodyText.toLowerCase();

      if (resp.status === 200) {
        return {
          valid: true,
          status: 'valid',
          message: '✓ AICredits.in API key verified and ready for execution!',
          capabilities: {
            execution: true,
            label: 'AICredits Verified',
          },
        };
      }

      if (resp.status === 401 || resp.status === 403 || lowerBody.includes('invalid api key') || lowerBody.includes('unauthorized')) {
        const classified = classifyAICreditsError(401, { error: { message: 'Invalid API Key' } }, 'key-validation');
        return {
          valid: false,
          status: 'error',
          message: '❌ Invalid AICredits.in API key. Please check your key in the aicredits.in dashboard.',
          error: classified,
        };
      }

      if (resp.status === 402 || lowerBody.includes('insufficient balance') || lowerBody.includes('credit')) {
        const classified = classifyAICreditsError(402, { error: { message: 'Insufficient Balance' } }, 'key-validation');
        return {
          valid: true,
          status: 'valid',
          message: '⚠️ Key is valid, but your AICredits.in wallet balance is empty. Please recharge balance on aicredits.in.',
          error: classified,
          capabilities: {
            execution: false,
            label: 'Insufficient Balance',
          },
        };
      }

      let errData: any = {};
      try {
        errData = JSON.parse(bodyText);
      } catch {
        errData = { message: bodyText };
      }

      const classified = classifyAICreditsError(resp.status, errData, 'key-validation');
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
        message: `❌ Network error reaching AICredits.in API: ${fetchErr?.message || fetchErr}`,
      };
    }
  },

  /**
   * Direct execution through AICredits universal gateway.
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
        code: 'AUTH_INVALID_KEY',
        provider: 'AICredits',
        model: request.modelId,
        httpStatus: 401,
        message: 'No AICredits.in API key provided.',
        isRetryable: false,
      });
    }

    const payload: Record<string, any> = {
      model: request.modelId,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: request.temperature ?? 0.7,
      stream: request.stream || Boolean(request.onChunk),
    };

    if (request.maxTokens) {
      payload.max_tokens = request.maxTokens;
    }

    const keyFingerprint = await computeKeyFingerprint(cleanKey);

    // ── Hang protection ───────────────────────────────────────────────────────────
    // This fetch previously passed only `request.signal`, giving the execution path no
    // ceiling of its own: if AICredits accepted the connection and then never answered,
    // the promise never settled and the run hung forever. The key-validation probe above
    // already used AbortSignal.timeout(10000) — only execution was unguarded.
    //
    // That is more than a UX problem. A request reaches this adapter with a server-side
    // credit reservation already held, and a reservation that is never settled nor
    // released stays locked against the user's balance.
    //
    // The caller's signal is COMPOSED with our ceiling, not replaced, so user
    // cancellation still works and whichever fires first wins. The linkage is explicit
    // rather than via AbortSignal.any(), which is not available in every runtime
    // PromptHub targets.
    //
    // The timer is re-armed after every streamed chunk below, making it an IDLE timeout:
    // a long but healthy generation is never truncated, while a stalled stream still
    // fails instead of hanging.
    const RESPONSE_TIMEOUT_MS = 60000;
    const STREAM_IDLE_TIMEOUT_MS = 60000;

    const controller = new AbortController();
    let timedOut = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const armTimeout = (ms: number) => {
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, ms);
    };
    const disarmTimeout = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    };

    if (request.signal) {
      if (request.signal.aborted) {
        controller.abort(request.signal.reason);
      } else {
        request.signal.addEventListener('abort', () => controller.abort(request.signal?.reason), {
          once: true,
        });
      }
    }

    // Built directly instead of via classifyAICreditsError(), which has no timeout branch:
    // an aborted fetch would land in its PROVIDER_INTERNAL_ERROR default and be reported
    // as isRetryable: false, when a timeout is precisely the retryable case.
    const timeoutError = (phase: string, ms: number) =>
      new NormalizedAIError({
        code: 'PROVIDER_TIMEOUT',
        provider: 'AICredits',
        model: request.modelId,
        httpStatus: 408,
        message: `AICredits.in stopped responding ${phase} (no data for ${Math.round(
          ms / 1000
        )}s). The run was cancelled and produced no output.`,
        remediationHint: 'Please try again, or select a different model.',
        isRetryable: true,
      });

    const traceFailure = (responseStatus: number, code: string | undefined, message: string) => {
      executionTracer.recordTrace({
        requestId,
        timestamp: startTime,
        provider: this.name,
        requestedModelId: request.modelId,
        resolvedModelId: request.modelId,
        adapter: 'aicreditsAdapter',
        endpointFamily: 'openai',
        keyFingerprint,
        payloadFieldsSent: Object.keys(payload),
        payloadFieldsRemoved: [],
        responseStatus,
        normalizedErrorCode: code,
        durationMs: Date.now() - startTime,
        status: 'failed',
        errorMessage: message,
      });
    };

    let resp: Response;
    armTimeout(RESPONSE_TIMEOUT_MS);
    try {
      resp = await fetch(`${this.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanKey}`,
          'HTTP-Referer': 'https://prompthub.cloud',
          'X-Title': 'PromptHub Direct BYOK',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      disarmTimeout();
      // Checked BEFORE the AbortError branch: our own timeout aborts the controller, so
      // fetch rejects with name 'AbortError' too. Without this ordering a timeout would
      // be reported to the user as though they had cancelled the run themselves.
      if (timedOut) {
        const timeoutErr = timeoutError('before sending a response', RESPONSE_TIMEOUT_MS);
        traceFailure(408, timeoutErr.code, timeoutErr.message);
        throw timeoutErr;
      }
      if (fetchErr?.name === 'AbortError') throw fetchErr;
      const classified = classifyAICreditsError(0, fetchErr, request.modelId);
      traceFailure(0, classified.code, classified.message);
      throw classified;
    }

    const durationMs = Date.now() - startTime;

    if (!resp.ok) {
      let errData: any = {};
      try {
        errData = await resp.json();
      } catch {
        errData = { message: await resp.text().catch(() => `HTTP ${resp.status}`) };
      }
      disarmTimeout();
      const classified = classifyAICreditsError(resp.status, errData, request.modelId);
      executionTracer.recordTrace({
        requestId,
        timestamp: startTime,
        provider: this.name,
        requestedModelId: request.modelId,
        resolvedModelId: request.modelId,
        adapter: 'aicreditsAdapter',
        endpointFamily: 'openai',
        keyFingerprint,
        payloadFieldsSent: Object.keys(payload),
        payloadFieldsRemoved: [],
        responseStatus: resp.status,
        normalizedErrorCode: classified.code,
        durationMs,
        status: 'failed',
        errorMessage: classified.message,
      });
      throw classified;
    }

    // ── Streaming Path ───────────────────────────────────────────────────────────
    if (payload.stream && resp.body) {
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Re-arm on every chunk so the ceiling measures SILENCE, not total duration —
          // a legitimately long generation must never be cut off mid-stream.
          armTimeout(STREAM_IDLE_TIMEOUT_MS);

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (trimmed === 'data: [DONE]') continue;
            if (trimmed.startsWith('data: ')) {
              try {
                const chunk = JSON.parse(trimmed.slice(6));
                const delta = chunk.choices?.[0]?.delta?.content || '';
                if (delta) {
                  fullText += delta;
                  request.onChunk?.(delta, fullText);
                }
              } catch {
                // Ignore partial JSON chunks
              }
            }
          }
        }
      } catch (streamErr: any) {
        disarmTimeout();
        // Same ordering rationale as the fetch catch above: our idle timeout surfaces as
        // an AbortError, and must not be misreported as a user cancellation.
        if (timedOut) {
          const timeoutErr = timeoutError('mid-stream', STREAM_IDLE_TIMEOUT_MS);
          traceFailure(408, timeoutErr.code, timeoutErr.message);
          throw timeoutErr;
        }
        if (streamErr?.name === 'AbortError') throw streamErr;
        executionTracer.recordTrace({
          requestId,
          timestamp: startTime,
          provider: this.name,
          requestedModelId: request.modelId,
          resolvedModelId: request.modelId,
          adapter: 'aicreditsAdapter',
          endpointFamily: 'openai',
          keyFingerprint,
          payloadFieldsSent: Object.keys(payload),
          payloadFieldsRemoved: [],
          responseStatus: 500,
          durationMs: Date.now() - startTime,
          status: 'failed',
          errorMessage: streamErr?.message || 'Streaming failed',
        });
        throw classifyAICreditsError(0, streamErr, request.modelId);
      }

      disarmTimeout();

      const streamDuration = Date.now() - startTime;
      // The SSE stream carries no usage block, so nothing is reported. The
      // previous code derived promptTokens from the summed message lengths / 4
      // and completionTokens from `fullText.length / 4`, i.e. a character count
      // divided by four rendered to the user as a token measurement.
      const usage = undefined;

      executionTracer.recordTrace({
        requestId,
        timestamp: startTime,
        provider: this.name,
        requestedModelId: request.modelId,
        resolvedModelId: request.modelId,
        adapter: 'aicreditsAdapter',
        endpointFamily: 'openai',
        keyFingerprint,
        payloadFieldsSent: Object.keys(payload),
        payloadFieldsRemoved: [],
        responseStatus: 200,
        durationMs: streamDuration,
        status: 'success',
      });

      return {
        output: fullText,
        model: request.modelId,
        usage,
        usageMeasured: false,
        durationMs: streamDuration,
        provider: 'AICredits',
        requestId,
      };
    }

    // ── Standard Non-Streaming Path ──────────────────────────────────────────────
    // This was `await resp.json().catch(() => ({}))`, which swallowed a truncated or
    // malformed body and carried on to return `output: ''` as a SUCCESS — reporting a
    // completed run, and feeding a settlement, for output the user never received. A 200
    // whose body cannot be read is a failed execution and must surface as one.
    let data: any;
    try {
      data = await resp.json();
    } catch (parseErr: any) {
      disarmTimeout();
      if (timedOut) {
        const timeoutErr = timeoutError('while returning its response body', RESPONSE_TIMEOUT_MS);
        traceFailure(408, timeoutErr.code, timeoutErr.message);
        throw timeoutErr;
      }
      if (parseErr?.name === 'AbortError') throw parseErr;
      const classified = new NormalizedAIError({
        code: 'PROVIDER_INTERNAL_ERROR',
        provider: 'AICredits',
        model: request.modelId,
        httpStatus: resp.status,
        rawMessage: parseErr?.message,
        message:
          'AICredits.in returned a response that could not be read as JSON, so this run produced no usable output.',
        remediationHint: 'Please try again.',
        isRetryable: true,
      });
      traceFailure(resp.status, classified.code, classified.message);
      throw classified;
    }
    disarmTimeout();

    const totalDuration = Date.now() - startTime;
    const outputText = data.choices?.[0]?.message?.content || '';
    // Usage is reported only when AICredits measured it. The previous fallback was
    // `Math.ceil((request.prompt?.length || 0) / 4)` for the prompt and
    // `Math.ceil(outputText.length / 4)` for the completion — a character count
    // divided by four, surfaced to the user as a token measurement. (Before that it
    // was even worse: `Math.ceil(request.prompt?.length || 0 / 4)` parsed as
    // `length || (0 / 4)`, so the raw character count was reported undivided.)
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
      resolvedModelId: request.modelId,
      adapter: 'aicreditsAdapter',
      endpointFamily: 'openai',
      keyFingerprint,
      payloadFieldsSent: Object.keys(payload),
      payloadFieldsRemoved: [],
      responseStatus: 200,
      durationMs: totalDuration,
      status: 'success',
    });

    return {
      output: outputText,
      model: data.model || request.modelId,
      usage,
      usageMeasured: measured,
      durationMs: totalDuration,
      provider: 'AICredits',
      requestId,
    };
  },
};
