// Collection Data Access Repository — Standalone Client & Local Storage Mode
// Zero database queries, zero external network requests
import type { Collection } from '../db/schema';
import { securityUtils } from '../utils/security';
import { INITIAL_SEED_COLLECTIONS } from '../data/seedPrompts';

const LOCAL_COLLECTIONS_KEY = 'prompthub_local_collections';

function getLocalCollections(): Collection[] {
  if (typeof window === 'undefined') return INITIAL_SEED_COLLECTIONS;
  try {
    const raw = localStorage.getItem(LOCAL_COLLECTIONS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_COLLECTIONS_KEY, JSON.stringify(INITIAL_SEED_COLLECTIONS));
      return INITIAL_SEED_COLLECTIONS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    localStorage.setItem(LOCAL_COLLECTIONS_KEY, JSON.stringify(INITIAL_SEED_COLLECTIONS));
    return INITIAL_SEED_COLLECTIONS;
  } catch {
    return INITIAL_SEED_COLLECTIONS;
  }
}

function saveLocalCollections(collections: Collection[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_COLLECTIONS_KEY, JSON.stringify(collections));
  } catch {}
}

export class CollectionRepository {
  static async syncLocalCollectionsToDb(_collections: Collection[], _userId: string): Promise<void> {
    // No-op in standalone mode
  }

  static async getCollectionsByUser(userId: string): Promise<Collection[]> {
    if (!userId) return [];
    return getLocalCollections().filter(c => !c.authorId || c.authorId === userId || c.authorId === 'admin');
  }

  static async getPublicCollections(): Promise<Collection[]> {
    return getLocalCollections().filter(c => !c.isPrivate);
  }

  static async getCollectionById(id: string): Promise<Collection | null> {
    if (!id) return null;
    return getLocalCollections().find(c => c.id === id) || null;
  }

  static async createCollection(col: Partial<Collection>): Promise<Collection> {
    const validId = col.id && securityUtils.isValidUUID(col.id)
      ? col.id
      : securityUtils.generateUUID();

    const newCol: Collection = {
      id: validId,
      name: col.name || 'Untitled Collection',
      description: col.description || '',
      authorId: col.authorId || 'admin',
      isPrivate: col.isPrivate ?? false,
      bannerUrl: col.bannerUrl,
      promptIds: col.promptIds || [],
      createdAt: new Date().toISOString(),
    };

    saveLocalCollections([newCol, ...getLocalCollections().filter(c => c.id !== newCol.id)]);
    return newCol;
  }

  static async updateCollection(id: string, updates: Partial<Collection>): Promise<void> {
    const all = getLocalCollections();
    saveLocalCollections(all.map(c => c.id === id ? { ...c, ...updates } : c));
  }

  static async deleteCollection(id: string): Promise<void> {
    saveLocalCollections(getLocalCollections().filter(c => c.id !== id));
  }

  static async addPromptToCollection(colId: string, promptId: string): Promise<void> {
    const all = getLocalCollections();
    saveLocalCollections(all.map(c => {
      if (c.id === colId && !c.promptIds.includes(promptId)) {
        return { ...c, promptIds: [...c.promptIds, promptId] };
      }
      return c;
    }));
  }

  static async removePromptFromCollection(colId: string, promptId: string): Promise<void> {
    const all = getLocalCollections();
    saveLocalCollections(all.map(c => {
      if (c.id === colId) {
        return { ...c, promptIds: c.promptIds.filter(id => id !== promptId) };
      }
      return c;
    }));
  }
}
