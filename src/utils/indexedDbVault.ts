import type { StorageFile } from '../db/schema';
import { logger } from './logger';

const DB_NAME = 'prompthub_vault_db';
const DB_VERSION = 1;
const STORE_NAME = 'vault_files';

export interface VaultRecord {
  id: string;
  file: StorageFile;
  dataBlob?: Blob;
  dataUrl?: string;
  savedAt: string;
}

// In-memory fallback for environments without IndexedDB (e.g. Node tests, strict sandboxes)
const memoryStore = new Map<string, VaultRecord>();

const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB vault.'));
    };
  });
};

/**
 * Synchronously or asynchronously convert data URL to Blob with base64 safety
 */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const meta = parts[0];
    const mimeMatch = meta.match(/:(.*?);/) || meta.match(/:(.*?)$/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const isBase64 = meta.includes('base64');
    const rawData = parts[1];

    if (isBase64) {
      const binary = atob(rawData);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      return new Blob([array], { type: mime });
    } else {
      return new Blob([decodeURIComponent(rawData)], { type: mime });
    }
  } catch {
    return null;
  }
}

const normalizeRecordFile = (raw: any): StorageFile => {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `file_${Date.now()}`,
      userId: '',
      originalName: 'Untitled',
      sanitizedName: 'Untitled',
      mimeType: 'application/octet-stream',
      sizeBytes: 0,
      storageProvider: 'google_drive',
      googleDriveFileId: '',
      category: 'ai-knowledge',
      visibility: 'private',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  const originalName = String(raw.originalName || raw.original_name || raw.name || 'Untitled');
  return {
    ...raw,
    id: String(raw.id || `file_${Date.now()}`),
    userId: String(raw.userId || raw.user_id || ''),
    originalName,
    sanitizedName: String(raw.sanitizedName || raw.sanitized_name || originalName),
    mimeType: String(raw.mimeType || raw.mime_type || 'application/octet-stream'),
    sizeBytes: typeof raw.sizeBytes === 'number' ? raw.sizeBytes : Number(raw.sizeBytes || 0),
    storageProvider: raw.storageProvider || raw.storage_provider || 'google_drive',
    googleDriveFileId: String(raw.googleDriveFileId || raw.google_drive_file_id || raw.providerFileId || raw.id || ''),
    category: raw.category || 'ai-knowledge',
    visibility: raw.visibility || 'private',
    status: raw.status || 'active',
    createdAt: String(raw.createdAt || raw.created_at || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || raw.updated_at || new Date().toISOString()),
  };
};

export const indexedDbVault = {
  /**
   * Check if native IndexedDB is available
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && Boolean(window.indexedDB);
  },

  /**
   * Delete any duplicate records matching originalName (except optionally keepId)
   */
  async deleteFilesByName(originalName: string, exceptId?: string): Promise<void> {
    const norm = (originalName || '').toLowerCase().trim();
    if (!norm) return;

    for (const [id, rec] of memoryStore.entries()) {
      if (id !== exceptId && (rec.file?.originalName || '').toLowerCase().trim() === norm) {
        memoryStore.delete(id);
      }
    }

    if (!this.isAvailable()) return;

    try {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const records: VaultRecord[] = req.result || [];
          for (const r of records) {
            if (r.id !== exceptId && (r.file?.originalName || '').toLowerCase().trim() === norm) {
              store.delete(r.id);
            }
          }
          resolve();
        };
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    } catch (err) {
      logger.warn('[indexedDbVault] Clean duplicate by name notice:', err);
    }
  },

  /**
   * Save a storage file record with its raw data (Blob, File, or DataURL)
   */
  async saveFile(file: StorageFile, fileData?: Blob | File | string): Promise<void> {
    // Purge any existing records with the same filename to ensure zero duplicates
    if (file.originalName) {
      await this.deleteFilesByName(file.originalName, file.id).catch(() => {});
    }

    const record: VaultRecord = {
      id: file.id,
      file,
      savedAt: new Date().toISOString(),
    };

    if (fileData instanceof Blob) {
      record.dataBlob = fileData;
    } else if (typeof fileData === 'string') {
      record.dataUrl = fileData;
    }

    if (!this.isAvailable()) {
      memoryStore.set(file.id, record);
      return;
    }

    try {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(record);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    } catch (err) {
      logger.warn('[indexedDbVault] IndexedDB write failed, caching in memory:', err);
      memoryStore.set(file.id, record);
    }
  },

  /**
   * Retrieve a file and its raw content by fileId with fallback hints
   */
  async getFile(fileId: string, hints?: { originalName?: string; driveFileId?: string }): Promise<VaultRecord | null> {
    const normTargetName = (hints?.originalName || '').toLowerCase().trim();
    const driveId = hints?.driveFileId;

    if (!this.isAvailable()) {
      let match = memoryStore.get(fileId) || null;
      if (!match && (normTargetName || driveId)) {
        for (const [id, rec] of memoryStore.entries()) {
          if (driveId && (id === driveId || rec.file?.googleDriveFileId === driveId)) {
            return rec;
          }
          if (normTargetName && (rec.file?.originalName || '').toLowerCase().trim() === normTargetName) {
            return rec;
          }
        }
      }
      return match;
    }

    try {
      const db = await openDatabase();
      return await new Promise<VaultRecord | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(fileId);

        req.onsuccess = () => {
          if (req.result) {
            db.close();
            resolve(req.result);
            return;
          }

          if (normTargetName || driveId) {
            const allReq = store.getAll();
            allReq.onsuccess = () => {
              db.close();
              const records: VaultRecord[] = allReq.result || [];
              for (const r of records) {
                if (driveId && (r.id === driveId || r.file?.googleDriveFileId === driveId)) {
                  resolve(r);
                  return;
                }
                if (normTargetName && (r.file?.originalName || '').toLowerCase().trim() === normTargetName) {
                  resolve(r);
                  return;
                }
              }
              resolve(memoryStore.get(fileId) || null);
            };
            allReq.onerror = () => {
              db.close();
              resolve(memoryStore.get(fileId) || null);
            };
          } else {
            db.close();
            resolve(memoryStore.get(fileId) || null);
          }
        };
        req.onerror = () => {
          db.close();
          reject(req.error);
        };
      });
    } catch (err) {
      logger.warn('[indexedDbVault] IndexedDB read notice, using memory fallback:', err);
      return memoryStore.get(fileId) || null;
    }
  },

  /**
   * List all stored files metadata from the vault
   */
  async listFiles(): Promise<StorageFile[]> {
    if (!this.isAvailable()) {
      return Array.from(memoryStore.values()).map(r => normalizeRecordFile(r.file));
    }

    try {
      const db = await openDatabase();
      return await new Promise<StorageFile[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          db.close();
          const records: VaultRecord[] = req.result || [];
          const files = records.map(r => normalizeRecordFile(r.file));
          
          // Merge with memory store if any
          const idSet = new Set(files.map(f => f.id));
          for (const [id, rec] of memoryStore.entries()) {
            if (!idSet.has(id)) files.push(normalizeRecordFile(rec.file));
          }

          resolve(files);
        };
        req.onerror = () => {
          db.close();
          reject(req.error);
        };
      });
    } catch (err) {
      logger.warn('[indexedDbVault] IndexedDB list notice:', err);
      return Array.from(memoryStore.values()).map(r => normalizeRecordFile(r.file));
    }
  },

  /**
   * Delete a file from the vault
   */
  async deleteFile(fileId: string): Promise<boolean> {
    memoryStore.delete(fileId);

    if (!this.isAvailable()) {
      return true;
    }

    try {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(fileId);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
      return true;
    } catch (err) {
      logger.warn('[indexedDbVault] IndexedDB delete notice:', err);
      return true;
    }
  },

  /**
   * Get a downloadable Blob for a file with fallback hints and data URL decoding
   */
  async getFileBlob(fileId: string, hints?: { originalName?: string; driveFileId?: string }): Promise<Blob | null> {
    const record = await this.getFile(fileId, hints);
    if (!record) return null;

    if (record.dataBlob) {
      return record.dataBlob;
    }

    if (record.dataUrl) {
      try {
        const res = await fetch(record.dataUrl);
        return await res.blob();
      } catch {
        const parsed = dataUrlToBlob(record.dataUrl);
        if (parsed) return parsed;
      }
    }

    const metaUri = record.file?.metadata?.downloadDataUrl || record.file?.metadata?.dataUrl;
    if (metaUri) {
      try {
        const res = await fetch(metaUri);
        return await res.blob();
      } catch {
        const parsed = dataUrlToBlob(metaUri);
        if (parsed) return parsed;
      }
    }

    return null;
  },

  /**
   * Completely erase all files from the vault (IndexedDB and memory store)
   */
  async clearAllFiles(): Promise<void> {
    memoryStore.clear();

    if (!this.isAvailable()) return;

    try {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    } catch (err) {
      logger.warn('[indexedDbVault] Error clearing vault files:', err);
    }
  },

  /**
   * Fully drop and purge the entire IndexedDB database for complete data erasure
   */
  async purgeEntireDatabase(): Promise<void> {
    memoryStore.clear();

    if (typeof window === 'undefined' || !window.indexedDB) return;

    try {
      window.indexedDB.deleteDatabase(DB_NAME);
    } catch (err) {
      logger.warn('[indexedDbVault] Error purging vault database:', err);
    }
  }
};
