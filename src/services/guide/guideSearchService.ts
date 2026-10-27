/**
 * PromptHub Guide — Search & Retrieval Service
 * 
 * Tokenized client-side ranking engine for instant, grounded retrieval
 * across the verified knowledge base.
 * 
 * Anti-AI Slop Invariants:
 * 1. Zero inverted substring containment (NEVER check if intent.includes(token)).
 * 2. Strict stop-word filtering to prevent false positives from conversational filler.
 * 3. Exact word boundary and token equality matching.
 */

import { GUIDE_KNOWLEDGE_BASE, type KnowledgeBaseArticle, type KnowledgeCategory } from '../../data/guideKnowledgeBase';
import type { TabType } from '../../context/AppContext';

export interface SearchResult {
  article: KnowledgeBaseArticle;
  score: number;
  matchedKeywords: string[];
}

const COMMON_STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any',
  'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between',
  'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during',
  'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her',
  'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into',
  'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no',
  'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 's', 'same', 'she', 'should', 'so', 'some', 'such',
  't', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
  'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
  'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom',
  'why', 'will', 'with', 'you', 'your', 'yours', 'yourself', 'yourselves', 'tell', 'show',
  'please', 'want', 'give', 'help', 'fk', 'fuck', 'shit', 'bitch', 'damn'
]);

/**
 * Tokenize and normalize query strings into clean, meaningful search terms.
 * Filters out stop words and short noise characters.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(token => token.length >= 3 && !COMMON_STOP_WORDS.has(token));
}

export class GuideSearchService {
  /**
   * Search knowledge base with strict exact-token and phrase relevance scoring (bm25Score).
   */
  search(query: string, options?: { category?: KnowledgeCategory; currentRoute?: TabType; limit?: number }): SearchResult[] {
    const trimmed = query.trim().toLowerCase();
    const limit = options?.limit ?? 6;

    if (!trimmed) {
      return this.getContextualRecommendations(options?.currentRoute, limit);
    }

    const queryTokens = tokenize(trimmed);
    if (queryTokens.length === 0) {
      return [];
    }

    const results: SearchResult[] = [];

    for (const article of GUIDE_KNOWLEDGE_BASE) {
      if (options?.category && article.category !== options.category) {
        continue;
      }

      let score = 0;
      const matchedKeywords: string[] = [];
      const titleLower = article.title.toLowerCase();
      const titleTokens = tokenize(article.title);
      const summaryTokens = tokenize(article.summary);
      const intentKeywords = article.intent.map(i => i.toLowerCase().trim());
      const intentTokens = article.intent.flatMap(i => tokenize(i));

      // 1. Full phrase match in title (Highest weight: 100)
      if (trimmed.length >= 4 && titleLower.includes(trimmed)) {
        score += 100;
        matchedKeywords.push('exact_title_match');
      }

      // 2. Exact match against an intent phrase
      for (const intent of intentKeywords) {
        if (intent.length >= 3 && (intent === trimmed || trimmed.includes(intent))) {
          score += 50;
          matchedKeywords.push(intent);
        }
      }

      // 3. Token-by-token strict equality checks
      let hasTokenMatch = false;
      for (const token of queryTokens) {
        // Intent token match (Weight: 25)
        if (intentTokens.includes(token)) {
          score += 25;
          matchedKeywords.push(token);
          hasTokenMatch = true;
        }

        // Title token match (Weight: 20)
        if (titleTokens.includes(token)) {
          score += 20;
          matchedKeywords.push(token);
          hasTokenMatch = true;
        }

        // Summary token match (Weight: 5)
        if (summaryTokens.includes(token)) {
          score += 5;
          matchedKeywords.push(token);
          hasTokenMatch = true;
        }
      }

      // 4. Route proximity boost (Only apply if at least one token actually matched)
      if (hasTokenMatch && options?.currentRoute && article.route === options.currentRoute) {
        score += 8;
      }

      if (score >= 20) {
        results.push({
          article,
          score,
          matchedKeywords: Array.from(new Set(matchedKeywords))
        });
      }
    }

    // Sort descending by score
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Get contextual recommendations based on user's active page
   */
  getContextualRecommendations(route?: TabType, limit = 5): SearchResult[] {
    const routeCategoryMap: Partial<Record<TabType, KnowledgeCategory>> = {
      workspace: 'studio',
      arena: 'arena',
      analyzer: 'analyzer',
      'models-guide': 'models',
      models: 'models',
      credentials: 'byok',
      pricing: 'billing',
      teams: 'teams',
      settings: 'settings',
      home: 'getting-started',
      marketplace: 'getting-started',
      library: 'studio',
      storage: 'getting-started'
    };

    const targetCategory = route ? routeCategoryMap[route] : 'getting-started';

    const matched = GUIDE_KNOWLEDGE_BASE.filter(
      a => (route && a.route === route) || (targetCategory && a.category === targetCategory)
    );

    const fallbacks = GUIDE_KNOWLEDGE_BASE.filter(
      a => !matched.some(m => m.id === a.id)
    );

    const combined = [...matched, ...fallbacks].slice(0, limit);

    return combined.map((article, idx) => ({
      article,
      score: 100 - idx * 5,
      matchedKeywords: ['contextual_recommendation']
    }));
  }

  /**
   * Get a single article by ID
   */
  getArticleById(id: string): KnowledgeBaseArticle | undefined {
    return GUIDE_KNOWLEDGE_BASE.find(a => a.id === id);
  }
}

export const guideSearchService = new GuideSearchService();

export const searchArticles = (query: string, options?: { category?: KnowledgeCategory; currentRoute?: TabType; limit?: number }): SearchResult[] =>
  guideSearchService.search(query, options);

export const getRelatedArticles = (route?: TabType, limit?: number): SearchResult[] =>
  guideSearchService.getContextualRecommendations(route, limit);
