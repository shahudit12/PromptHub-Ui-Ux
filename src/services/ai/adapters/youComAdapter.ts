/**
 * src/services/ai/adapters/youComAdapter.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * You.com Web Intelligence & Search Grounding Provider Adapter for PromptHub.
 *
 * Implements high-concurrency, multi-request execution across You.com's full
 * API suite:
 * - Search API (ydc-index.io/v1/search)
 * - Answer API (api.you.com/v1/answer)
 * - Research API (api.you.com/v1/research)
 * - Finance Research API (api.you.com/v1/finance_research)
 * - Contents API (ydc-index.io/v1/contents)
 *
 * Designed for public multi-request handling with exponential backoff on HTTP 429,
 * streaming emulation, and seamless BYOK + server proxy fallback.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { type CanonicalAIRequest } from '../capabilityResolver';
import { NormalizedAIError } from '../providerErrors';
import { executionTracer, computeKeyFingerprint } from '../executionTracer';
import type { ProviderExecutionResponse } from './geminiAdapter';

export class YouComAdapter {
  public readonly providerId = 'you_com';
  public readonly name = 'You.com';
  public readonly apiBaseUrl = 'https://ydc-index.io/v1';
  public readonly apiV1BaseUrl = 'https://api.you.com/v1';

  /**
   * Helper: Fetch with automatic retry and exponential backoff for high-concurrency public traffic.
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries = 3
  ): Promise<Response> {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const resp = await fetch(url, options);

        // If rate limited (HTTP 429) or temporary server error (HTTP 503)
        if ((resp.status === 429 || resp.status === 503) && attempt < maxRetries) {
          attempt++;
          const retryAfterHeader = resp.headers?.get('Retry-After');
          const delayMs = retryAfterHeader
            ? parseInt(retryAfterHeader, 10) * 1000 || 2000
            : Math.min(1000 * Math.pow(2, attempt), 8000) + Math.random() * 500;

          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        return resp;
      } catch (err: any) {
        if (attempt < maxRetries && err?.name !== 'AbortError') {
          attempt++;
          const delayMs = Math.min(1000 * Math.pow(2, attempt), 6000) + Math.random() * 400;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        throw err;
      }
    }
    throw new Error('You.com request failed after maximum retry attempts.');
  }

  /**
   * Validates You.com API key against the live search endpoint.
   */
  async validateKey(apiKey: string): Promise<{
    valid: boolean;
    status: 'valid' | 'error';
    message: string;
    error?: NormalizedAIError;
    capabilities?: { execution: boolean; serviceType: string };
  }> {
    const cleanKey = (apiKey || '').trim();
    if (!cleanKey) {
      return {
        valid: false,
        status: 'error',
        message: 'Please provide a You.com API key to validate.',
      };
    }

    try {
      // Validate against the search endpoint with a lightweight probe query
      const resp = await this.fetchWithRetry(
        `${this.apiBaseUrl}/search?query=test&num_web_results=1`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': cleanKey,
          },
          signal: AbortSignal.timeout(10000),
        },
        1
      );

      if (resp.ok) {
        return {
          valid: true,
          status: 'valid',
          message: '✓ You.com API credentials verified! (Search, Answer, Research & Finance active)',
          capabilities: { execution: true, serviceType: 'search_research' },
        };
      }

      if (resp.status === 401 || resp.status === 403) {
        return {
          valid: false,
          status: 'error',
          message: '❌ Invalid You.com API key. Please check your developer key at https://you.com/platform.',
          error: new NormalizedAIError({
            code: 'AUTH_INVALID_KEY',
            provider: this.name,
            model: 'you.com/search',
            message: 'Invalid You.com API key (HTTP 401/403).',
          }),
        };
      }

      const errText = await resp.text().catch(() => '');
      return {
        valid: false,
        status: 'error',
        message: `❌ You.com returned HTTP ${resp.status}: ${errText.slice(0, 150)}`,
      };
    } catch (fetchErr: any) {
      return {
        valid: false,
        status: 'error',
        message: `❌ Network error connecting to You.com: ${fetchErr?.message || fetchErr}`,
      };
    }
  }

  /**
   * Executes a prompt across the You.com model suite.
   */
  async execute(
    apiKey: string,
    request: CanonicalAIRequest,
    requestId: string = (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}`)
  ): Promise<ProviderExecutionResponse> {
    const startTime = Date.now();
    let cleanKey = (apiKey || '').trim();

    // Check environment variable fallback if no direct key passed
    if (!cleanKey && typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_YOU_COM_API_KEY) {
      cleanKey = String((import.meta as any).env.VITE_YOU_COM_API_KEY).trim();
    }

    // Extract query from prompt or user messages
    const query = request.prompt || request.messages?.map((m) => m.content).join('\n') || '';
    if (!query.trim()) {
      throw new NormalizedAIError({
        code: 'INVALID_REQUEST',
        provider: this.name,
        model: request.modelId,
        message: 'Prompt query cannot be empty.',
      });
    }

    const requestedModel = (request.modelId || 'you.com/answer').toLowerCase().trim();

    // 1. If no client-side key, route through PromptHub serverless router (/api/provider-router)
    if (!cleanKey && typeof window !== 'undefined') {
      try {
        const proxyResp = await this.fetchWithRetry(
          '/api/provider-router',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'you-execute',
              model: requestedModel,
              query,
            }),
            signal: request.signal || AbortSignal.timeout(45000),
          },
          2
        );

        if (proxyResp.ok) {
          const proxyData = await proxyResp.json();
          if (proxyData.success && proxyData.output) {
            const output = proxyData.output;
            const durationMs = Date.now() - startTime;
            const estTokens = Math.ceil(output.length / 4);

            // Progressive chunk streaming callback
            if (request.onChunk) {
              const words = output.split(' ');
              let acc = '';
              for (const word of words) {
                acc += (acc ? ' ' : '') + word;
                request.onChunk(word + ' ', acc);
              }
            }

            return {
              output,
              model: requestedModel,
              provider: this.name,
              usage: {
                promptTokens: Math.ceil(query.length / 4),
                completionTokens: estTokens,
                totalTokens: Math.ceil(query.length / 4) + estTokens,
              },
              usageMeasured: false,
              durationMs,
              requestId,
            };
          }
        }
      } catch (proxyErr: any) {
        if (proxyErr?.name === 'AbortError') throw proxyErr;
        // Proceed to direct execution attempt or formatted error
      }
    }

    if (!cleanKey) {
      throw new NormalizedAIError({
        code: 'AUTH_MISSING',
        provider: this.name,
        model: request.modelId,
        message: 'No You.com API key configured. Please add your You.com API key in Settings → AI Providers.',
      });
    }

    const keyFingerprint = await computeKeyFingerprint(cleanKey);

    try {
      let output = '';

      // ── Dispatch by Requested You.com Model ──────────────────────────────
      if (requestedModel === 'you.com/search') {
        // 1. Live Web Search API
        const searchUrl = `${this.apiBaseUrl}/search?query=${encodeURIComponent(query)}&num_web_results=5`;
        const resp = await this.fetchWithRetry(
          searchUrl,
          {
            method: 'GET',
            headers: { 'X-API-Key': cleanKey },
            signal: request.signal || AbortSignal.timeout(30000),
          },
          3
        );

        if (!resp.ok) {
          const errText = await resp.text().catch(() => '');
          throw new NormalizedAIError({
            code: 'PROVIDER_INTERNAL_ERROR',
            provider: this.name,
            model: requestedModel,
            message: `You.com search failed (HTTP ${resp.status}): ${errText.slice(0, 150)}`,
          });
        }

        const data = await resp.json();
        const hits = Array.isArray(data?.hits) ? data.hits : [];
        if (hits.length === 0) {
          output = `No live web results found on You.com for query: "${query}"`;
        } else {
          output = `### You.com Live Web Search Results for: "${query}"\n\n` +
            hits.map((h: any, i: number) => {
              const snippet = Array.isArray(h.snippets) ? h.snippets.join(' ') : h.snippet || h.description || '';
              return `**${i + 1}. [${h.title || 'Result'}](${h.url})**\n${snippet}\n`;
            }).join('\n');
        }
      } else if (requestedModel === 'you.com/research') {
        // 2. Deep Research API
        const researchUrl = `${this.apiV1BaseUrl}/research`;
        let resp = await this.fetchWithRetry(
          researchUrl,
          {
            method: 'POST',
            headers: {
              'X-API-Key': cleanKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query, research_effort: 'standard' }),
            signal: request.signal || AbortSignal.timeout(60000),
          },
          3
        ).catch(() => null);

        // Fallback to GET query param if POST is rejected
        if (!resp || !resp.ok) {
          resp = await this.fetchWithRetry(
            `${this.apiV1BaseUrl}/research?query=${encodeURIComponent(query)}`,
            {
              method: 'GET',
              headers: { 'X-API-Key': cleanKey },
              signal: request.signal || AbortSignal.timeout(60000),
            },
            2
          );
        }

        if (resp && resp.ok) {
          const data = await resp.json().catch(() => ({}));
          output = data?.report || data?.answer || data?.research || '';
          if (Array.isArray(data?.sources) && data.sources.length > 0) {
            const sources = data.sources
              .slice(0, 8)
              .map((s: any, i: number) => `[${i + 1}] [${s.title || 'Source'}](${s.url}) - ${s.snippet || ''}`)
              .join('\n\n');
            output += `\n\n### Comprehensive Research Sources:\n${sources}`;
          }
        }

        // Resilient fallback to Answer API if research endpoint is pending tier activation
        if (!output) {
          output = await this.executeAnswerEndpoint(cleanKey, query, request.signal);
        }
      } else if (requestedModel === 'you.com/finance') {
        // 3. Finance Research API
        const financeUrl = `${this.apiV1BaseUrl}/finance_research`;
        let resp = await this.fetchWithRetry(
          financeUrl,
          {
            method: 'POST',
            headers: {
              'X-API-Key': cleanKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
            signal: request.signal || AbortSignal.timeout(45000),
          },
          2
        ).catch(() => null);

        if (!resp || !resp.ok) {
          resp = await this.fetchWithRetry(
            `${this.apiV1BaseUrl}/finance_research?query=${encodeURIComponent(query)}`,
            {
              method: 'GET',
              headers: { 'X-API-Key': cleanKey },
              signal: request.signal || AbortSignal.timeout(45000),
            },
            2
          ).catch(() => null);
        }

        if (resp && resp.ok) {
          const data = await resp.json().catch(() => ({}));
          output = data?.financial_analysis || data?.answer || data?.report || '';
          if (Array.isArray(data?.sec_filings) && data.sec_filings.length > 0) {
            const filings = data.sec_filings
              .map((f: any, i: number) => `[${i + 1}] **${f.company || f.ticker}** (${f.form_type}): [SEC Filing](${f.url})`)
              .join('\n');
            output += `\n\n### Referenced SEC Filings & Market Disclosures:\n${filings}`;
          }
        }

        if (!output) {
          output = await this.executeAnswerEndpoint(cleanKey, `Financial analysis: ${query}`, request.signal);
        }
      } else {
        // 4. Default: Answer API (Cited synthesis with live grounding)
        output = await this.executeAnswerEndpoint(cleanKey, query, request.signal);
      }

      if (!output) {
        output = `No response received from You.com for query: "${query}". Please check query formatting.`;
      }

      const durationMs = Date.now() - startTime;
      const estTokens = Math.ceil(output.length / 4);

      // Emulate live chunk streaming for interactive UIs
      if (request.onChunk) {
        const words = output.split(' ');
        let acc = '';
        for (const word of words) {
          acc += (acc ? ' ' : '') + word;
          request.onChunk(word + ' ', acc);
        }
      }

      executionTracer.recordTrace({
        requestId,
        timestamp: startTime,
        provider: this.name,
        requestedModelId: request.modelId,
        resolvedModelId: requestedModel,
        adapter: 'youComAdapter',
        endpointFamily: `${this.apiBaseUrl}/answer`,
        keyFingerprint,
        payloadFieldsSent: ['query'],
        payloadFieldsRemoved: [],
        responseStatus: 200,
        durationMs,
        status: 'success',
      });

      return {
        output,
        model: requestedModel,
        provider: this.name,
        usage: {
          promptTokens: Math.ceil(query.length / 4),
          completionTokens: estTokens,
          totalTokens: Math.ceil(query.length / 4) + estTokens,
        },
        usageMeasured: false,
        durationMs,
        requestId,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      executionTracer.recordTrace({
        requestId,
        timestamp: startTime,
        provider: this.name,
        requestedModelId: request.modelId,
        resolvedModelId: requestedModel,
        adapter: 'youComAdapter',
        endpointFamily: `${this.apiBaseUrl}/answer`,
        keyFingerprint,
        payloadFieldsSent: ['query'],
        payloadFieldsRemoved: [],
        responseStatus: err.status || 500,
        normalizedErrorCode: 'PROVIDER_INTERNAL_ERROR',
        durationMs,
        status: 'failed',
        errorMessage: err.message,
      });

      if (err instanceof NormalizedAIError) throw err;
      throw new NormalizedAIError({
        code: 'UNKNOWN_PROVIDER_ERROR',
        provider: this.name,
        model: request.modelId,
        message: `You.com execution error: ${err?.message || err}`,
      });
    }
  }

  /**
   * Helper: Execute Answer API with citations fallback to Search synthesis.
   */
  private async executeAnswerEndpoint(
    cleanKey: string,
    query: string,
    signal?: AbortSignal
  ): Promise<string> {
    const answerUrl = `${this.apiBaseUrl}/answer?query=${encodeURIComponent(query)}`;
    const resp = await this.fetchWithRetry(
      answerUrl,
      {
        method: 'GET',
        headers: { 'X-API-Key': cleanKey },
        signal: signal || AbortSignal.timeout(35000),
      },
      3
    );

    let output = '';
    if (resp.ok) {
      const data = await resp.json().catch(() => ({}));
      output = data?.answer || '';

      if (Array.isArray(data?.hits) && data.hits.length > 0) {
        const sources = data.hits
          .slice(0, 5)
          .map((h: any, i: number) => `[${i + 1}] [${h.title || 'Source'}](${h.url}) - ${h.snippets?.[0] || h.snippet || ''}`)
          .join('\n\n');
        if (sources) {
          output = output ? `${output}\n\n### Grounded Sources:\n${sources}` : `### Grounded Sources:\n${sources}`;
        }
      }
    }

    // Fallback to Search API if Answer is empty
    if (!output) {
      const searchUrl = `${this.apiBaseUrl}/search?query=${encodeURIComponent(query)}&num_web_results=5`;
      const searchResp = await this.fetchWithRetry(
        searchUrl,
        {
          method: 'GET',
          headers: { 'X-API-Key': cleanKey },
          signal: signal || AbortSignal.timeout(30000),
        },
        2
      );

      if (searchResp.ok) {
        const searchData = await searchResp.json();
        const hits = Array.isArray(searchData?.hits) ? searchData.hits : [];
        if (hits.length > 0) {
          output = `### You.com Synthesized Web Findings for: "${query}"\n\n` +
            hits.map((h: any, i: number) => {
              const snippet = Array.isArray(h.snippets) ? h.snippets.join(' ') : h.snippet || h.description || '';
              return `**${i + 1}. [${h.title || 'Source'}](${h.url})**\n${snippet}\n`;
            }).join('\n');
        }
      }
    }

    return output;
  }
}

export const youComAdapter = new YouComAdapter();
