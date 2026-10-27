/**
 * src/services/tools/youSearchService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * You.com Search & Research API Integration.
 *
 * NOTE: You.com Search API (ydc-index.io) is a specialized Web Search & RAG
 * retrieval engine, NOT an arbitrary LLM chat completion endpoint.
 * It provides grounded search hits and snippets for real-time prompt enhancement.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface YouSearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
}

export interface YouSearchResponse {
  success: boolean;
  results: YouSearchResult[];
  error?: string;
}

export class YouSearchService {
  private readonly baseUrl = 'https://ydc-index.io/v1';

  /**
   * Performs real-time web search for grounding AI prompts with live context.
   */
  async search(query: string, apiKey?: string, numResults: number = 5): Promise<YouSearchResponse> {
    const key = (apiKey || '').trim();

    // 1. Direct client call if key is provided
    if (key) {
      try {
        const url = `${this.baseUrl}/search?query=${encodeURIComponent(query)}&num_web_results=${numResults}`;
        const resp = await fetch(url, {
          method: 'GET',
          headers: {
            'X-API-Key': key,
          },
        });

        if (!resp.ok) {
          const errJson = await resp.json().catch(() => ({}));
          return {
            success: false,
            results: [],
            error: errJson?.message || `You.com search failed with HTTP ${resp.status}`,
          };
        }

        const data = await resp.json();
        const hits = Array.isArray(data?.hits) ? data.hits : [];
        const results: YouSearchResult[] = hits.map((hit: any) => ({
          title: hit.title || 'Web Result',
          url: hit.url || '',
          snippet: Array.isArray(hit.snippets) ? hit.snippets.join(' ') : hit.snippet || hit.description || '',
          publishedDate: hit.published_date || hit.page_age,
        }));

        return {
          success: true,
          results,
        };
      } catch (err: any) {
        return {
          success: false,
          results: [],
          error: err?.message || 'Network error executing You.com search.',
        };
      }
    }

    // 2. Server-side proxy call if running in browser and using platform YOU_COM_API_KEY
    if (typeof window !== 'undefined') {
      try {
        const proxyResp = await fetch('/api/provider-router', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'you-search', query, numResults }),
        });

        if (proxyResp.ok) {
          const proxyData = await proxyResp.json();
          if (proxyData.success && proxyData.data) {
            const hits = Array.isArray(proxyData.data.hits) ? proxyData.data.hits : [];
            const results: YouSearchResult[] = hits.map((hit: any) => ({
              title: hit.title || 'Web Result',
              url: hit.url || '',
              snippet: Array.isArray(hit.snippets) ? hit.snippets.join(' ') : hit.snippet || hit.description || '',
              publishedDate: hit.published_date || hit.page_age,
            }));
            return {
              success: true,
              results,
            };
          }
        }
      } catch {}
    }

    return {
      success: false,
      results: [],
      error: 'You.com API key is required. Obtain a developer key at https://you.com/platform and set YOU_COM_API_KEY.',
    };
  }
}

export const youSearchService = new YouSearchService();
