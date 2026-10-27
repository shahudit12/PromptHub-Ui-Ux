/**
 * src/services/tools/firecrawlService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Firecrawl Web Scraping & Markdown Extraction Integration.
 *
 * NOTE: Firecrawl is NOT an LLM inference endpoint. It is a specialized web
 * crawler and page-to-markdown extraction engine used to ground prompts with
 * live web page context.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface FirecrawlScrapeResponse {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    metadata?: {
      title?: string;
      description?: string;
      sourceURL?: string;
      statusCode?: number;
    };
  };
  error?: string;
}

export class FirecrawlService {
  private readonly baseUrl = 'https://api.firecrawl.dev/v1';

  /**
   * Scrapes a web URL and converts content to clean markdown.
   */
  async scrapeUrl(url: string, apiKey?: string): Promise<FirecrawlScrapeResponse> {
    const key = (apiKey || '').trim();
    if (!key) {
      return {
        success: false,
        error: 'Firecrawl API key is required. Obtain a key at https://www.firecrawl.dev/app/ and configure FIRECRAWL_API_KEY.',
      };
    }

    try {
      const resp = await fetch(`${this.baseUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          url,
          formats: ['markdown'],
        }),
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        return {
          success: false,
          error: errJson?.error || `Firecrawl request failed with HTTP ${resp.status}`,
        };
      }

      const data = await resp.json();
      return {
        success: true,
        data: data?.data || data,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Network error connecting to Firecrawl: ${err?.message || err}`,
      };
    }
  }
}

export const firecrawlService = new FirecrawlService();
