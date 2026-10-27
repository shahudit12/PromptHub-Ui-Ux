/**
 * src/services/searchService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * PromptHub Search Service (Algolia)
 *
 * Provides instant search, filtering, and result highlighting for prompts.
 * Falls back gracefully to an empty result set when Algolia env vars are missing.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Environment ───────────────────────────────────────────────────────────────

const APP_ID   = import.meta.env.VITE_ALGOLIA_APP_ID   as string | undefined;
const API_KEY  = import.meta.env.VITE_ALGOLIA_SEARCH_KEY as string | undefined;
const INDEX    = import.meta.env.VITE_ALGOLIA_INDEX     as string | undefined || 'prompts';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SearchHit {
  objectID: string;
  id: string;
  title: string;
  description: string;
  rawContent: string;
  authorName: string;
  authorId: string;
  category: string;
  tags: string[];
  model: string;
  assetType: string;
  visibility: 'public' | 'private';
  isPremium: boolean;
  price?: number;
  likesCount: number;
  viewsCount: number;
  forksCount: number;
  commentsCount?: number;
  coverUrl?: string;
  thumbnail?: string;
  inputImageUrl?: string;
  outputImageUrl?: string;
  createdAt: number;
  /** Algolia highlighted attributes */
  _highlightResult?: {
    title?: { value: string; matchLevel: string };
    description?: { value: string; matchLevel: string };
    rawContent?: { value: string; matchLevel: string };
    authorName?: { value: string; matchLevel: string };
  };
}

export interface SearchFilters {
  category?: string;
  assetType?: string;
  model?: string;
  isPremium?: boolean;
  authorId?: string;
}

export interface SearchResult {
  hits: SearchHit[];
  total: number;
  page: number;
  totalPages: number;
  processingTimeMs: number;
}

// ── Lazy Algolia client ───────────────────────────────────────────────────────

let _clientPromise: Promise<any> | null = null;

async function getClient(): Promise<any | null> {
  if (!APP_ID || !API_KEY) return null;
  if (!_clientPromise) {
    _clientPromise = import('algoliasearch').then(({ algoliasearch }) => {
      return algoliasearch(APP_ID, API_KEY);
    }).catch(err => {
      console.warn('[searchService] Failed to load algoliasearch module:', err);
      _clientPromise = null;
      return null;
    });
  }
  return _clientPromise;
}

// ── Public Search API ─────────────────────────────────────────────────────────

export const searchService = {

  /** Returns true if Algolia is configured */
  isConfigured(): boolean {
    return Boolean(APP_ID && API_KEY);
  },

  /**
   * Perform an instant search query.
   * Falls back to empty results if Algolia is not configured.
   */
  async search(
    query: string,
    options: {
      filters?: SearchFilters;
      page?: number;
      hitsPerPage?: number;
    } = {}
  ): Promise<SearchResult> {
    const client = await getClient();

    // Graceful no-op when not configured
    if (!client) {
      return { hits: [], total: 0, page: 0, totalPages: 0, processingTimeMs: 0 };
    }

    const { filters, page = 0, hitsPerPage = 20 } = options;

    // Build Algolia filter string
    const filterParts: string[] = ['visibility:public'];
    if (filters?.category) filterParts.push(`category:"${filters.category}"`);
    if (filters?.assetType) filterParts.push(`assetType:"${filters.assetType}"`);
    if (filters?.model)     filterParts.push(`model:"${filters.model}"`);
    if (filters?.isPremium !== undefined) filterParts.push(`isPremium:${filters.isPremium}`);
    if (filters?.authorId) filterParts.push(`authorId:"${filters.authorId}"`);

    const result = await client.searchSingleIndex({
      indexName: INDEX,
      searchParams: {
        query,
        filters: filterParts.join(' AND '),
        page,
        hitsPerPage,
        attributesToHighlight: ['title', 'description', 'authorName'],
        highlightPreTag: '<mark class="search-highlight">',
        highlightPostTag: '</mark>',
      }
    }) as any;

    return {
      hits: result.hits as SearchHit[],
      total: result.nbHits,
      page: result.page,
      totalPages: result.nbPages,
      processingTimeMs: result.processingTimeMS,
    };
  },

  /**
   * Get search suggestions for autocomplete.
   */
  async suggest(query: string, hitsPerPage = 5): Promise<SearchHit[]> {
    const client = await getClient();
    if (!client || !query.trim()) return [];

    const result = await client.searchSingleIndex({
      indexName: INDEX,
      searchParams: {
        query,
        filters: 'visibility:public',
        hitsPerPage,
        attributesToRetrieve: ['id', 'title', 'authorName', 'category', 'assetType'],
      }
    }) as any;

    return result.hits as SearchHit[];
  },

  /**
   * Get the raw Algolia client for custom operations.
   */
  async getClient() {
    return await getClient();
  },
};

