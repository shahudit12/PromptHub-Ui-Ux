// Prompt Data Access Repository — Standalone Client & Local Storage Mode
// Zero database queries, zero external network requests
import type { Prompt, PromptVersion } from '../db/schema';
import { logger } from '../utils/logger';
import { securityUtils } from '../utils/security';
import { INITIAL_SEED_PROMPTS } from '../data/seedPrompts';

const LOCAL_PROMPTS_KEY = 'prompthub_local_prompts_v2';
const LEGACY_LOCAL_PROMPTS_KEY = 'prompthub_local_prompts';
const USER_PURCHASES_KEY = 'prompthub_user_purchases';
const VERSIONS_KEY_PREFIX = 'prompthub_versions_';

function getLocalPrompts(): Prompt[] {
  if (typeof window === 'undefined') return INITIAL_SEED_PROMPTS;
  try {
    const raw = localStorage.getItem(LOCAL_PROMPTS_KEY) || localStorage.getItem(LEGACY_LOCAL_PROMPTS_KEY);
    if (!raw) {
      saveLocalPrompts(INITIAL_SEED_PROMPTS);
      return INITIAL_SEED_PROMPTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    saveLocalPrompts(INITIAL_SEED_PROMPTS);
    return INITIAL_SEED_PROMPTS;
  } catch {
    return INITIAL_SEED_PROMPTS;
  }
}

function saveLocalPrompts(prompts: Prompt[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_PROMPTS_KEY, JSON.stringify(prompts));
    localStorage.setItem(LEGACY_LOCAL_PROMPTS_KEY, JSON.stringify(prompts));
  } catch {}
}

export function toDeterministicUUID(str: string): string {
  if (securityUtils.isValidUUID(str)) return str;
  let h1 = 0xdeadbeef, h2 = 0x41c64e6d;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const hex3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0');
  const hex4 = ((h1 + h2) >>> 0).toString(16).padStart(8, '0');
  const full = (hex1 + hex2 + hex3 + hex4);
  return `${full.slice(0, 8)}-${full.slice(8, 12)}-4${full.slice(13, 16)}-a${full.slice(17, 20)}-${full.slice(20, 32)}`;
}

export interface MarketplaceQueryOptions {
  searchQuery?: string;
  category?: string;
  listingType?: 'all' | 'paid' | 'premium' | 'free';
  sortBy?: 'likes' | 'trending' | 'popular' | 'newest' | 'rating' | 'views' | 'copies';
  offset?: number;
  limit?: number;
  attachedImageSearch?: string | null;
}

export interface MarketplaceQueryResult {
  items: Prompt[];
  totalCount: number;
  hasMore: boolean;
  nextOffset: number;
}

export const MARKETPLACE_CARD_FIELDS = [
  'id',
  'title',
  'description',
  'category',
  'tags',
  'model',
  'authorId',
  'authorName',
  'authorAvatar',
  'likesCount',
  'forksCount',
  'viewsCount',
  'copiesCount',
  'priceInr',
  'isPremium',
  'createdAt',
];

export class PromptRepository {
  static mapRowToPrompt(row: any): Prompt {
    return row as Prompt;
  }

  static async getMarketplacePrompts(options: MarketplaceQueryOptions = {}): Promise<MarketplaceQueryResult> {
    const {
      searchQuery = '',
      category = '',
      listingType = 'all',
      sortBy = 'newest',
      offset = 0,
      limit = 24,
    } = options;

    let all = getLocalPrompts();

    if (category && category.toLowerCase() !== 'all') {
      all = all.filter(p => p.category?.toLowerCase() === category.toLowerCase());
    }

    if (listingType === 'paid') {
      all = all.filter(p => p.isPaid || (p.priceInr && p.priceInr > 0));
    } else if (listingType === 'free') {
      all = all.filter(p => !p.isPaid && (!p.priceInr || p.priceInr === 0));
    } else if (listingType === 'premium') {
      all = all.filter(p => p.isPremium);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      all = all.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(q))) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
    }

    // Sort
    all = [...all].sort((a, b) => {
      if (sortBy === 'popular' || sortBy === 'views') {
        return (b.viewsCount || 0) - (a.viewsCount || 0);
      }
      if (sortBy === 'likes' || sortBy === 'trending') {
        return (b.likesCount || 0) - (a.likesCount || 0);
      }
      if (sortBy === 'copies') {
        return (b.copiesCount || 0) - (a.copiesCount || 0);
      }
      if (sortBy === 'rating') {
        return (b.averageRating || 0) - (a.averageRating || 0);
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    const totalCount = all.length;
    const items = all.slice(offset, offset + limit);
    const nextOffset = offset + items.length;
    const hasMore = nextOffset < totalCount;

    return {
      items,
      totalCount,
      hasMore,
      nextOffset,
    };
  }

  static async getMarketplaceCounts(): Promise<{ all: number; paid: number; premium: number; free: number }> {
    const allPrompts = getLocalPrompts();
    let paid = 0;
    let premium = 0;
    let free = 0;

    for (const p of allPrompts) {
      if (p.isPremium) premium++;
      if (p.isPaid || (p.priceInr && p.priceInr > 0)) paid++;
      else free++;
    }

    return {
      all: allPrompts.length,
      paid,
      premium,
      free,
    };
  }

  static async getMarketplaceCategoryCounts(): Promise<Record<string, number>> {
    const all = getLocalPrompts();
    const counts: Record<string, number> = {};
    for (const p of all) {
      const cat = p.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }

  static async getMarketplaceCatalog(): Promise<Prompt[]> {
    return getLocalPrompts();
  }

  static async getLeaderboardData(): Promise<{
    topCreators: Array<{
      id: string;
      name: string;
      username: string;
      avatarUrl: string;
      totalPrompts: number;
      totalLikes: number;
      totalViews: number;
      reputationScore: number;
      badge?: string;
    }>;
    topPrompts: Prompt[];
  }> {
    const all = getLocalPrompts();
    const topPrompts = [...all]
      .sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0))
      .slice(0, 10);

    const creatorsMap = new Map<string, any>();
    for (const p of all) {
      const authorId = p.authorId || 'admin';
      if (!creatorsMap.has(authorId)) {
        creatorsMap.set(authorId, {
          id: authorId,
          name: p.authorName || 'PromptHub Creator',
          username: (p.authorName || 'creator').toLowerCase().replace(/\s+/g, '_'),
          avatarUrl: p.authorAvatar || '/admin-avatar.png',
          totalPrompts: 0,
          totalLikes: 0,
          totalViews: 0,
          reputationScore: 0,
          badge: 'Top Contributor',
        });
      }
      const c = creatorsMap.get(authorId);
      c.totalPrompts++;
      c.totalLikes += (p.likesCount || 0);
      c.totalViews += (p.viewsCount || 0);
      c.reputationScore = c.totalLikes * 10 + c.totalViews + c.totalPrompts * 5;
    }

    const topCreators = Array.from(creatorsMap.values())
      .sort((a, b) => b.reputationScore - a.reputationScore)
      .slice(0, 10);

    return { topCreators, topPrompts };
  }

  static async getPublicPromptsByCreator(creatorIdOrName: string): Promise<Prompt[]> {
    const all = getLocalPrompts();
    const q = creatorIdOrName.toLowerCase();
    return all.filter(p =>
      p.authorId?.toLowerCase() === q ||
      p.authorName?.toLowerCase() === q
    );
  }

  static async getAuthorizedPromptContent(promptId: string): Promise<{
    prompt: Prompt | null;
    isAuthorized: boolean;
    reason?: string;
    content: string;
    variables?: any[];
  }> {
    const prompt = await this.getPromptById(promptId);
    return {
      prompt,
      isAuthorized: true,
      content: prompt?.rawContent || '',
      variables: prompt?.variables || [],
    };
  }

  static async getUserPurchases(_userId: string): Promise<any[]> {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(USER_PURCHASES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static async getAdminCatalogPrompts(): Promise<Prompt[]> {
    return getLocalPrompts();
  }

  static async adminBatchUpsertPrompts(promptsToSync: Prompt[]): Promise<{ count: number; error?: string }> {
    const existing = getLocalPrompts();
    const map = new Map(existing.map(p => [p.id, p]));
    for (const p of promptsToSync) {
      map.set(p.id, { ...map.get(p.id), ...p });
    }
    const updated = Array.from(map.values());
    saveLocalPrompts(updated);
    return { count: promptsToSync.length };
  }

  static async getAllPrompts(limit: number = 20): Promise<Prompt[]> {
    return getLocalPrompts().slice(0, limit);
  }

  static async getPromptsByUser(userId: string): Promise<Prompt[]> {
    return getLocalPrompts().filter(p => p.authorId === userId);
  }

  static async getUserForkOfPrompt(userId: string, originalPromptId: string): Promise<Prompt | null> {
    const match = getLocalPrompts().find(
      p => p.authorId === userId && p.forkedFromId === originalPromptId
    );
    return match || null;
  }

  static async getPromptById(id: string): Promise<Prompt | null> {
    const all = getLocalPrompts();
    const match = all.find(p => p.id === id || toDeterministicUUID(p.id) === id);
    return match || null;
  }

  static async getPromptsByIds(ids: string[]): Promise<Prompt[]> {
    const idSet = new Set(ids);
    return getLocalPrompts().filter(p => idSet.has(p.id) || idSet.has(toDeterministicUUID(p.id)));
  }

  static async createPrompt(promptData: Partial<Prompt>): Promise<Prompt> {
    const id = promptData.id || securityUtils.generateUUID();
    const now = new Date().toISOString();
    const newPrompt: Prompt = {
      id,
      title: promptData.title || 'Untitled Prompt',
      description: promptData.description || '',
      rawContent: promptData.rawContent || '',
      variables: promptData.variables || [],
      category: promptData.category || 'Development',
      tags: promptData.tags || [],
      model: promptData.model || 'anthropic/claude-3.7-sonnet',
      visibility: promptData.visibility || 'public',
      authorId: promptData.authorId || 'admin',
      authorName: promptData.authorName || 'PromptHub Admin',
      authorAvatar: promptData.authorAvatar || '/admin-avatar.png',
      likesCount: 0,
      forksCount: 0,
      viewsCount: 0,
      copiesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      isPremium: Boolean(promptData.isPremium),
      priceInr: promptData.priceInr || 0,
      difficulty: promptData.difficulty || 'Intermediate',
      versionCount: 1,
      assetType: promptData.assetType || 'prompt',
      license: promptData.license || 'MIT',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      ...promptData,
    };

    const prompts = getLocalPrompts();
    saveLocalPrompts([newPrompt, ...prompts]);
    logger.info(`[PromptRepository] Created prompt: ${id}`);
    return newPrompt;
  }

  static async updatePrompt(id: string, updates: Partial<Prompt>): Promise<Prompt> {
    const prompts = getLocalPrompts();
    const index = prompts.findIndex(p => p.id === id || toDeterministicUUID(p.id) === id);
    if (index === -1) {
      throw new Error(`Prompt not found: ${id}`);
    }

    const updated: Prompt = {
      ...prompts[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    prompts[index] = updated;
    saveLocalPrompts(prompts);
    return updated;
  }

  static async deletePrompt(id: string): Promise<void> {
    const prompts = getLocalPrompts();
    const filtered = prompts.filter(p => p.id !== id && toDeterministicUUID(p.id) !== id);
    saveLocalPrompts(filtered);
    logger.info(`[PromptRepository] Deleted prompt: ${id}`);
  }

  static async incrementPromptStat(
    promptId: string,
    stat: 'views' | 'copies' | 'forks' | 'likes' | 'comments' | 'shares'
  ): Promise<void> {
    const prompts = getLocalPrompts();
    const p = prompts.find(item => item.id === promptId || toDeterministicUUID(item.id) === promptId);
    if (!p) return;

    if (stat === 'views') p.viewsCount = (p.viewsCount || 0) + 1;
    if (stat === 'copies') p.copiesCount = (p.copiesCount || 0) + 1;
    if (stat === 'forks') p.forksCount = (p.forksCount || 0) + 1;
    if (stat === 'likes') p.likesCount = (p.likesCount || 0) + 1;
    if (stat === 'comments') p.commentsCount = (p.commentsCount || 0) + 1;
    if (stat === 'shares') p.sharesCount = (p.sharesCount || 0) + 1;

    saveLocalPrompts(prompts);
  }

  static async decrementPromptStat(
    promptId: string,
    stat: 'views' | 'copies' | 'forks' | 'likes' | 'comments' | 'shares'
  ): Promise<void> {
    const prompts = getLocalPrompts();
    const p = prompts.find(item => item.id === promptId || toDeterministicUUID(item.id) === promptId);
    if (!p) return;

    if (stat === 'likes') p.likesCount = Math.max(0, (p.likesCount || 0) - 1);
    if (stat === 'copies') p.copiesCount = Math.max(0, (p.copiesCount || 0) - 1);
    if (stat === 'views') p.viewsCount = Math.max(0, (p.viewsCount || 0) - 1);
    if (stat === 'forks') p.forksCount = Math.max(0, (p.forksCount || 0) - 1);
    if (stat === 'comments') p.commentsCount = Math.max(0, (p.commentsCount || 0) - 1);
    if (stat === 'shares') p.sharesCount = Math.max(0, (p.sharesCount || 0) - 1);

    saveLocalPrompts(prompts);
  }

  static async recordPromptView(
    promptId: string,
    _userId?: any,
    _deviceViewerId?: string
  ): Promise<{ viewsCount: number }> {
    const p = await this.getPromptById(promptId);
    const newViews = (p?.viewsCount || 0) + 1;
    await this.incrementPromptStat(promptId, 'views');
    return { viewsCount: newViews };
  }
  static async _legacyRecordPromptView(promptId: string, _options: { userId?: string } = {}): Promise<void> {
    await this.incrementPromptStat(promptId, 'views');
  }

  static async getVersionsForPrompt(promptId: string): Promise<PromptVersion[]> {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(`${VERSIONS_KEY_PREFIX}${promptId}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    const p = await this.getPromptById(promptId);
    if (!p) return [];
    return [{
      id: `v1_${promptId}`,
      promptId,
      version: 1,
      versionNumber: 1,
      content: p.rawContent,
      rawContent: p.rawContent,
      updateNotes: 'Initial release',
      authorId: p.authorId || 'admin',
      createdAt: p.createdAt || new Date().toISOString(),
    }];
  }

  static async saveVersion(promptId: string, content: string, updateNotes: string, authorId: string): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const existing = await this.getVersionsForPrompt(promptId);
      const nextVer = existing.length + 1;
      const newVersion: PromptVersion = {
        id: `v${nextVer}_${promptId}`,
        promptId,
        version: nextVer,
        versionNumber: nextVer,
        content,
        rawContent: content,
        updateNotes,
        authorId,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(`${VERSIONS_KEY_PREFIX}${promptId}`, JSON.stringify([newVersion, ...existing]));
    } catch {}
  }

  static async getUserLikes(_userId: string): Promise<string[]> {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('prompthub_liked_prompts');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static async likePromptOnce(promptId: string, userId: string): Promise<{ isLiked: boolean; alreadyLiked: boolean }> {
    const likes = await this.getUserLikes(userId);
    const hasLiked = likes.includes(promptId);
    if (hasLiked) {
      return { isLiked: true, alreadyLiked: true };
    }
    const updated = [...likes, promptId];
    localStorage.setItem('prompthub_liked_prompts', JSON.stringify(updated));
    await this.incrementPromptStat(promptId, 'likes');
    return { isLiked: true, alreadyLiked: false };
  }

  static async toggleLike(promptId: string, userId: string): Promise<{ isLiked: boolean; likesCount?: number }> {
    const likes = await this.getUserLikes(userId);
    const hasLiked = likes.includes(promptId);
    let isLiked = false;
    let updatedLikes: string[] = [];

    if (hasLiked) {
      updatedLikes = likes.filter(id => id !== promptId);
      await this.decrementPromptStat(promptId, 'likes');
      isLiked = false;
    } else {
      updatedLikes = [...likes, promptId];
      await this.incrementPromptStat(promptId, 'likes');
      isLiked = true;
    }

    localStorage.setItem('prompthub_liked_prompts', JSON.stringify(updatedLikes));
    const p = await this.getPromptById(promptId);
    return { isLiked, likesCount: p?.likesCount || 0 };
  }
}
