/**
 * AI News Hub Service — Standalone Client & Local Storage Mode
 * Zero database queries, zero external network requests
 */

import type { AINewsArticle, NewsCategory } from '../db/schema';
import { AI_NEWS_SEED_DATA } from '../data/aiNewsData';
import { securityUtils } from '../utils/security';

export const DEFAULT_NEWS_SEED: AINewsArticle[] = AI_NEWS_SEED_DATA;

const CUSTOM_NEWS_KEY = 'ph_admin_custom_news';
const DELETED_NEWS_KEY = 'ph_admin_deleted_news_ids';
const REAL_LIKES_STORE_KEY = 'ph_real_news_likes_store';

function getLocalCustomNews(): AINewsArticle[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_NEWS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCustomNews(articles: AINewsArticle[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CUSTOM_NEWS_KEY, JSON.stringify(articles));
  } catch {}
}

function getLocalDeletedNewsIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_NEWS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function getAllArticles(): AINewsArticle[] {
  const deleted = getLocalDeletedNewsIds();
  const custom = getLocalCustomNews();
  const combined = [...custom, ...AI_NEWS_SEED_DATA].filter(a => !deleted.has(a.id));
  const seen = new Set<string>();
  return combined.filter(a => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

export interface FetchNewsOptions {
  tag?: string;
  includeDrafts?: boolean;
  category?: NewsCategory | 'All';
  searchQuery?: string;
  limit?: number;
  offset?: number;
  featuredOnly?: boolean;
}

export class NewsService {
  static async listNews(options: FetchNewsOptions = {}): Promise<AINewsArticle[]> {
    let articles = getAllArticles();

    if (options.category && options.category !== 'All') {
      articles = articles.filter(a => a.category === options.category);
    }

    if (options.featuredOnly) {
      articles = articles.filter(a => a.isFeatured);
    }

    if (options.searchQuery?.trim()) {
      const q = options.searchQuery.toLowerCase().trim();
      articles = articles.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        (a.tags && a.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    articles.sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());

    if (options.offset || options.limit) {
      const offset = options.offset || 0;
      const limit = options.limit || articles.length;
      return articles.slice(offset, offset + limit);
    }

    return articles;
  }

  static async getUserLikedArticleIds(_userId?: string): Promise<string[]> {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(REAL_LIKES_STORE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static async toggleLike(articleId: string, _userId?: string): Promise<{ isLiked: boolean; likesCount: number }> {
    const likedIds = await this.getUserLikedArticleIds();
    const hasLiked = likedIds.includes(articleId);
    let updatedLikes: string[] = [];
    let isLiked = false;

    if (hasLiked) {
      updatedLikes = likedIds.filter(id => id !== articleId);
      isLiked = false;
    } else {
      updatedLikes = [...likedIds, articleId];
      isLiked = true;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(REAL_LIKES_STORE_KEY, JSON.stringify(updatedLikes));
    }

    const articles = getAllArticles();
    const target = articles.find(a => a.id === articleId);
    const count = target ? target.likesCount + (isLiked ? 1 : -1) : (isLiked ? 1 : 0);
    return { isLiked, likesCount: Math.max(0, count) };
  }

  static async getNewsByIdOrSlug(idOrSlug: string): Promise<AINewsArticle | null> {
    const articles = getAllArticles();
    return articles.find(a => a.id === idOrSlug || a.slug === idOrSlug) || null;
  }

  static async incrementViews(articleId: string, _userId?: string): Promise<void> {
    const custom = getLocalCustomNews();
    const target = custom.find(a => a.id === articleId);
    if (target) {
      target.viewsCount = (target.viewsCount || 0) + 1;
      saveLocalCustomNews(custom);
    }
  }

  static async createNews(article: {
    title: string;
    summary: string;
    content: string;
    category: NewsCategory;
    tags?: string[];
    sourceUrl?: string;
    sourceName?: string;
    imageUrl?: string;
    isFeatured?: boolean;
    isPublished?: boolean;
    customId?: string;
    id?: string;
    slug?: string;
    broadcast?: boolean;
  }): Promise<AINewsArticle & { success: boolean; error?: string }> {
    const id = article.customId || `news_${securityUtils.generateUUID()}`;
    const slug = article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const now = new Date().toISOString();

    const newArticle: AINewsArticle = {
      id,
      title: article.title,
      slug,
      summary: article.summary,
      content: article.content,
      category: article.category,
      tags: article.tags || [],
      sourceUrl: article.sourceUrl,
      sourceName: article.sourceName,
      imageUrl: article.imageUrl,
      isFeatured: Boolean(article.isFeatured),
      isPublished: article.isPublished !== false,
      authorId: 'admin',
      authorName: 'PromptHub Admin',
      authorAvatar: '/admin-avatar.png',
      viewsCount: 0,
      likesCount: 0,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const custom = getLocalCustomNews();
    saveLocalCustomNews([newArticle, ...custom]);
    return { ...newArticle, success: true, error: undefined };
  }

  static async updateNews(id: string, updates: Partial<AINewsArticle>): Promise<{ success: boolean; error?: string }> {
    const custom = getLocalCustomNews();
    const idx = custom.findIndex(a => a.id === id);
    if (idx !== -1) {
      custom[idx] = { ...custom[idx], ...updates, updatedAt: new Date().toISOString() };
      saveLocalCustomNews(custom);
    }
    return { success: true };
  }

  static async deleteNews(id: string): Promise<{ success: boolean; error?: string }> {
    const deleted = getLocalDeletedNewsIds();
    deleted.add(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(DELETED_NEWS_KEY, JSON.stringify(Array.from(deleted)));
    }
    const custom = getLocalCustomNews().filter(a => a.id !== id);
    saveLocalCustomNews(custom);
    return { success: true };
  }

  static async deleteAllNews(): Promise<{ success: boolean; error?: string }> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CUSTOM_NEWS_KEY);
      localStorage.setItem(DELETED_NEWS_KEY, JSON.stringify(AI_NEWS_SEED_DATA.map(a => a.id)));
    }
    return { success: true };
  }

  static async broadcastNews(_newsId: string, _title: string, _summary: string): Promise<{ success: boolean; count?: number; error?: string }> {
    return { success: true, count: 1 };
  }
}
