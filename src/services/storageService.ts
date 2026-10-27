// Storage service — Standalone client mode
import { securityUtils } from '../utils/security';
import { indexedDbVault, dataUrlToBlob } from '../utils/indexedDbVault';
import { filterAndRankFiles, computeSearchRelevance } from '../utils/storageSearchUtils';
import type { 
  StorageFile, 
  StorageQuota, 
  StorageUploadOptions, 
  StorageFilterOptions 
} from '../db/schema';

export type { StorageFile, StorageQuota, StorageUploadOptions, StorageFilterOptions };

export interface StorageFilePreviewData {
  type: 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'json' | 'csv' | 'markdown' | 'code' | 'binary';
  content?: string;
  mediaUrl?: string;
  blob?: Blob;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
  parsedCsv?: { headers: string[]; rows: string[][] };
  error?: string;
}

export interface StorageUploadProgressCallback {
  (progress: number): void;
}

export const formatStorageBytes = (bytes: number, decimals = 1): string => {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export function normalizeStorageFile(raw: any): StorageFile {
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

  const originalName = raw.originalName || raw.original_name || raw.name || 'Untitled';
  const sanitizedName = raw.sanitizedName || raw.sanitized_name || originalName;
  const mimeType = raw.mimeType || raw.mime_type || 'application/octet-stream';
  const sizeBytes = Number(raw.sizeBytes ?? raw.size_bytes ?? raw.size ?? 0);
  const createdAt = raw.createdAt || raw.created_at || new Date().toISOString();
  const updatedAt = raw.updatedAt || raw.updated_at || createdAt;

  return {
    id: String(raw.id || `file_${Date.now()}`),
    userId: String(raw.userId || raw.user_id || ''),
    originalName: String(originalName),
    sanitizedName: String(sanitizedName),
    mimeType: String(mimeType),
    sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : 0,
    storageProvider: raw.storageProvider || raw.storage_provider || 'google_drive',
    googleDriveFileId: String(raw.googleDriveFileId || raw.google_drive_file_id || raw.providerFileId || raw.id || ''),
    googleDriveParentId: raw.googleDriveParentId || raw.google_drive_parent_id,
    category: raw.category || 'ai-knowledge',
    visibility: raw.visibility || 'private',
    status: raw.status || 'active',
    associatedPromptId: raw.associatedPromptId || raw.associated_prompt_id,
    metadata: raw.metadata || {},
    createdAt: String(createdAt),
    updatedAt: String(updatedAt),
    deletedAt: raw.deletedAt || raw.deleted_at,
    formattedSize: raw.formattedSize || formatStorageBytes(sizeBytes),
    directDownloadUrl: raw.directDownloadUrl || raw.download_url,
    ownerName: raw.ownerName || raw.owner_name,
  };
}

const LOCAL_VAULT_KEY = 'ph_storage_vault_files';

const getLocalVaultFiles = (): StorageFile[] => {
  try {
    const raw = localStorage.getItem(LOCAL_VAULT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeStorageFile) : [];
  } catch {
    return [];
  }
};

const saveLocalVaultFile = async (file: StorageFile, fileData?: Blob | File | string): Promise<void> => {
  // Strip huge data URI from file metadata so localStorage never exceeds 5MB quota
  const sanitizedMetadata = { ...file.metadata };
  delete sanitizedMetadata.downloadDataUrl;

  const lightweightFile: StorageFile = {
    ...file,
    metadata: sanitizedMetadata,
  };

  const normName = (file.originalName || '').toLowerCase().trim();

  try {
    const existing = getLocalVaultFiles();
    const updated = [
      lightweightFile,
      ...existing.filter(
        f => f.id !== file.id && (f.originalName || '').toLowerCase().trim() !== normName
      ),
    ];
    localStorage.setItem(LOCAL_VAULT_KEY, JSON.stringify(updated.slice(0, 100)));
  } catch (err) {
    console.warn('[storageService] Failed to save metadata to localStorage:', err);
  }

  // Persist full file and binary content in IndexedDB (auto-purging duplicate records by filename)
  try {
    await indexedDbVault.saveFile(lightweightFile, fileData || file.metadata?.downloadDataUrl);
  } catch (idbErr) {
    console.warn('[storageService] IndexedDB save notice:', idbErr);
  }
};

const removeLocalVaultFile = async (fileId: string): Promise<void> => {
  try {
    const existing = getLocalVaultFiles();
    const target = existing.find(f => f.id === fileId);
    const updated = existing.filter(f => f.id !== fileId);
    localStorage.setItem(LOCAL_VAULT_KEY, JSON.stringify(updated));
    if (target?.originalName) {
      await removeLocalVaultFilesByName(target.originalName, fileId).catch(() => {});
    }
  } catch {}
  try {
    await indexedDbVault.deleteFile(fileId);
  } catch {}
};

const removeLocalVaultFilesByName = async (originalName: string, exceptId?: string): Promise<void> => {
  const normName = (originalName || '').toLowerCase().trim();
  if (!normName) return;
  try {
    const existing = getLocalVaultFiles();
    const updated = existing.filter(
      f => f.id === exceptId || (f.originalName || '').toLowerCase().trim() !== normName
    );
    localStorage.setItem(LOCAL_VAULT_KEY, JSON.stringify(updated));
  } catch {}
  try {
    await indexedDbVault.deleteFilesByName(normName, exceptId);
  } catch {}
};

export const DEFAULT_AI_NEWS_STORAGE_FILES: StorageFile[] = [];

// In-flight upload promise cache to guarantee zero duplicate concurrent uploads
const inFlightUploads = new Map<string, Promise<StorageFile>>();
let isSyncingQueue = false;

// High-speed in-memory Stale-While-Revalidate cache for Drive files and quota
interface StorageCacheEntry<T> {
  data: T;
  timestamp: number;
}
const listFilesCache = new Map<string, StorageCacheEntry<{ files: StorageFile[]; total: number }>>();
let quotaCache: StorageCacheEntry<StorageQuota> | null = null;
const CACHE_TTL_MS = 2500; // 2.5 seconds for real-time reactivity

export const notifyStorageUpdated = () => {
  listFilesCache.clear();
  quotaCache = null;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ph_storage_updated', { detail: { timestamp: Date.now() } }));

    try {
      localStorage.setItem('ph_storage_sync_tick', Date.now().toString());
    } catch {}

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('ph_storage_broadcast');
        bc.postMessage({ type: 'storage_updated', timestamp: Date.now() });
        bc.close();
      }
    } catch {}

    // Realtime broadcast omitted in standalone mode
  }
};

export const invalidateStorageCache = () => {
  notifyStorageUpdated();
};

export const storageService = {
  /**
   * Client-side validation: size, type, and binary magic bytes.
   */
  async validateFile(file: File, maxSizeMB = 50): Promise<{ isValid: boolean; error?: string }> {
    if (!file) {
      return { isValid: false, error: 'No file selected.' };
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return { isValid: false, error: `File size (${formatStorageBytes(file.size)}) exceeds maximum limit of ${maxSizeMB} MB.` };
    }

    // Inspect first 16 bytes for executable headers
    try {
      const headerBytes = await new Promise<Uint8Array>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = (e) => {
          if (e.target?.result instanceof ArrayBuffer) {
            resolve(new Uint8Array(e.target.result));
          } else {
            reject(new Error('Failed to read file bytes'));
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file.slice(0, 16));
      });

      const hex = Array.from(headerBytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

      // Block executable signatures
      if (hex.startsWith('4D5A') || hex.startsWith('7F454C46') || hex.startsWith('FEEDFACE') || hex.startsWith('CAFEBABE')) {
        return { isValid: false, error: 'Executable program files are strictly blocked for security.' };
      }
    } catch {
      return { isValid: false, error: 'Failed to verify file integrity.' };
    }

    return { isValid: true };
  },

  /**
   * Helper to retrieve Supabase session JWT token for API calls.
   */
  async getAuthToken(): Promise<string | null> {
    return null;
  },

  /**
   * Uploads a file to PromptHub Google Drive storage via server API with resilient client fallback.
   * Strictly idempotent: guarantees zero concurrent duplicate uploads for the same file.
   */
  async uploadFile(file: File, options?: StorageUploadOptions): Promise<StorageFile> {
    const inFlightKey = `${(file.name || 'untitled').toLowerCase().trim()}::${file.size}`;
    if (inFlightUploads.has(inFlightKey)) {
      return inFlightUploads.get(inFlightKey)!;
    }

    const uploadPromise = (async (): Promise<StorageFile> => {
      // Rate limit check
      const rateCheck = securityUtils.rateLimit('storage_upload', 1000);
      if (!rateCheck.allowed) {
        throw new Error(rateCheck.error || 'Please wait a moment before uploading another file.');
      }

      // Validation
      const validation = await this.validateFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid file.');
      }

      const normName = (file.name || 'untitled').toLowerCase().trim();

      // Strict Idempotency: One upload should be done once only, unless overwriting backups/synced files
      const isOverwriteAllowed = Boolean(options?.allowOverwrite || options?.category === 'backups');
      const localVault = getLocalVaultFiles();
      const localDuplicate = localVault.find(
        f => (f.originalName || '').toLowerCase().trim() === normName
      );
      if (localDuplicate) {
        if (isOverwriteAllowed) {
          await removeLocalVaultFilesByName(file.name, localDuplicate.id).catch(() => {});
        } else {
          throw new Error(`File "${file.name}" has already been uploaded. Duplicate uploads are not allowed.`);
        }
      }

      try {
        const idbFiles = await indexedDbVault.listFiles();
        const idbDuplicate = idbFiles.find(
          f => (f.originalName || '').toLowerCase().trim() === normName
        );
        if (idbDuplicate) {
          if (isOverwriteAllowed) {
            await indexedDbVault.deleteFile(idbDuplicate.id).catch(() => {});
          } else {
            throw new Error(`File "${file.name}" has already been uploaded. Duplicate uploads are not allowed.`);
          }
        }
      } catch {}

      const token = await this.getAuthToken();

      // Convert file to Base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      if (options?.onProgress) options.onProgress(30);

      const payload = {
        fileName: file.name,
        fileBase64: base64Data,
        mimeType: file.type || 'application/octet-stream',
        category: options?.category || 'uploads',
        visibility: options?.visibility || 'private',
        associatedPromptId: options?.associatedPromptId,
        metadata: options?.metadata || {},
        allowOverwrite: isOverwriteAllowed,
      };

      if (options?.onProgress) options.onProgress(60);

      let uploadedFile: StorageFile | null = null;

      // 1. Primary: Serverless upload to Google Drive if authenticated
      if (token) {
        const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB chunks for large files

        if (file.size > 3.5 * 1024 * 1024 && file.size <= 50 * 1024 * 1024) {
          // Chunked upload for large videos, zips, datasets, and high-res media
          try {
            const uploadId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

            for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
              const start = chunkIdx * CHUNK_SIZE;
              const end = Math.min(file.size, start + CHUNK_SIZE);
              const chunkBlob = file.slice(start, end);

              const chunkBase64 = await new Promise<string>((resolve, reject) => {
                const r = new FileReader();
                r.onload = () => resolve(r.result as string);
                r.onerror = reject;
                r.readAsDataURL(chunkBlob);
              });

              const chunkPayload = {
                uploadId,
                chunkIndex: chunkIdx,
                totalChunks,
                chunkBase64,
                fileName: file.name,
                mimeType: file.type || 'application/octet-stream',
                category: options?.category || 'uploads',
                visibility: options?.visibility || 'private',
                associatedPromptId: options?.associatedPromptId,
                totalSizeBytes: file.size,
                metadata: options?.metadata || {},
              };

              const response = await fetch('/api/storage-upload', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(chunkPayload),
              });

              if (options?.onProgress) {
                const pct = Math.round(((chunkIdx + 1) / totalChunks) * 90);
                options.onProgress(pct);
              }

              if (response.ok) {
                const resJson = await response.json();
                if (chunkIdx === totalChunks - 1 && resJson.file) {
                  uploadedFile = normalizeStorageFile(resJson.file);
                }
              } else {
                const errText = await response.text();
                let errJson: any = null;
                try { errJson = JSON.parse(errText); } catch {}
                if (errJson?.code === 'QUOTA_EXCEEDED') {
                  throw new Error(errJson.error || 'Storage quota exceeded. Please upgrade your plan.');
                }
                if ((response.status === 409 || errJson?.code === 'DUPLICATE_FILE') && !isOverwriteAllowed) {
                  throw new Error(errJson?.error || `File "${file.name}" has already been uploaded. Duplicate uploads are not allowed.`);
                }
                console.warn(`[storageService] Chunk ${chunkIdx} failed:`, errJson || errText);
                break;
              }
            }
          } catch (chunkErr: any) {
            if (
              chunkErr.message?.includes('quota exceeded') ||
              chunkErr.message?.includes('upgrade your plan') ||
              chunkErr.message?.includes('already been uploaded') ||
              chunkErr.message?.includes('Duplicate uploads')
            ) {
              throw chunkErr;
            }
            console.warn('[storageService] Chunked upload notice:', chunkErr.message);
          }
        } else if (file.size <= 3.5 * 1024 * 1024) {
          // Single-shot upload for standard documents, photos, and smaller assets
          try {
            const response = await fetch('/api/storage-upload', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(payload),
            });

            if (response.ok) {
              const resJson = await response.json();
              if (resJson.file) {
                uploadedFile = normalizeStorageFile(resJson.file);
              }
            } else {
              const errText = await response.text();
              let errJson: any = null;
              try { errJson = JSON.parse(errText); } catch {}
              if (errJson?.code === 'QUOTA_EXCEEDED') {
                throw new Error(errJson.error || 'Storage quota exceeded. Please upgrade your plan.');
              }
              if ((response.status === 409 || errJson?.code === 'DUPLICATE_FILE') && !isOverwriteAllowed) {
                throw new Error(errJson?.error || `File "${file.name}" has already been uploaded. Duplicate uploads are not allowed.`);
              }
              console.warn('[storageService] API upload non-200 response, using fallback:', errJson || errText);
            }
          } catch (apiErr: any) {
            if (
              apiErr.message?.includes('quota exceeded') ||
              apiErr.message?.includes('upgrade your plan') ||
              apiErr.message?.includes('already been uploaded') ||
              apiErr.message?.includes('Duplicate uploads')
            ) {
              throw apiErr;
            }
            console.warn('[storageService] API upload notice:', apiErr.message);
          }
        }
      }

      if (options?.onProgress) options.onProgress(92);

      // 2. Resilient Fallback: Safe Local Storage Vault for client workspace cache or failed syncs
      if (!uploadedFile) {
        const simulatedFile: StorageFile = {
          id: `vault_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId: 'current_user',
          originalName: options?.originalName || file.name,
          sanitizedName: securityUtils.sanitizeInput(options?.sanitizedName || options?.originalName || file.name),
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          storageProvider: 'google_drive',
          googleDriveFileId: `vault_data_${Date.now()}`,
          category: options?.category || 'uploads',
          visibility: options?.visibility || 'private',
          status: 'active',
          associatedPromptId: options?.associatedPromptId,
          metadata: {
            ...options?.metadata,
            uploadedAt: new Date().toISOString(),
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await saveLocalVaultFile(simulatedFile, file);
        uploadedFile = simulatedFile;
      } else {
        // Authoritative server upload succeeded — purge any older local duplicates by name
        await removeLocalVaultFilesByName(file.name, uploadedFile.id).catch(() => {});
        await indexedDbVault.saveFile(uploadedFile, file).catch(() => {});
      }

      if (options?.onProgress) options.onProgress(100);

      // Invalidate cache so listFiles reflects the newly uploaded file immediately
      invalidateStorageCache();

      // Auto-trigger real-time queue sync in background
      setTimeout(() => {
        this.syncVaultQueue().catch(() => {});
      }, 1000);

      return uploadedFile;
    })();

    inFlightUploads.set(inFlightKey, uploadPromise);
    try {
      return await uploadPromise;
    } finally {
      inFlightUploads.delete(inFlightKey);
    }
  },

  /**
   * Generates a streaming URL for an asset, adding authenticated token query parameter for private assets.
   */
  async getFileUrl(fileId: string, isPrivate = true, fileHint?: StorageFile): Promise<string> {
    try {
      const blob = await indexedDbVault.getFileBlob(fileId, {
        originalName: fileHint?.originalName,
        driveFileId: fileHint?.googleDriveFileId,
      });
      if (blob) {
        return URL.createObjectURL(blob);
      }
    } catch {}

    const metaUri = fileHint?.metadata?.downloadDataUrl || fileHint?.metadata?.dataUrl || fileHint?.directDownloadUrl;
    if (metaUri) {
      return metaUri;
    }

    if (!isPrivate) {
      return `/api/storage-file?id=${encodeURIComponent(fileId)}`;
    }
    const token = await this.getAuthToken();
    if (token) {
      return `/api/storage-file?id=${encodeURIComponent(fileId)}&token=${encodeURIComponent(token)}`;
    }
    return `/api/storage-file?id=${encodeURIComponent(fileId)}`;
  },

  /**
   * Universal File Preview Resolver:
   * Dynamically loads text, media, documents, PDFs, and code across IndexedDB,
   * local data URIs, static bundle assets, and remote authenticated streams.
   */
  async getFilePreviewData(file: StorageFile): Promise<StorageFilePreviewData> {
    if (!file) {
      return {
        type: 'binary',
        mimeType: 'application/octet-stream',
        originalName: 'Unknown',
        sizeBytes: 0,
        error: 'No file specified.',
      };
    }

    const rawMime = (file.mimeType || '').toLowerCase();
    const rawName = (file.originalName || '').toLowerCase().trim();

    const isImage = rawMime.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif|svg)(\?.*)?$/i.test(rawName);
    const isVideo = rawMime.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi)(\?.*)?$/i.test(rawName);
    const isAudio = rawMime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i.test(rawName);
    const isPdf = rawMime === 'application/pdf' || rawName.endsWith('.pdf');
    const isJson = rawMime.includes('json') || rawName.endsWith('.json');
    const isCsv = rawMime.includes('csv') || rawName.endsWith('.csv') || rawName.endsWith('.tsv');
    const isMarkdown = rawMime.includes('markdown') || rawName.endsWith('.md') || rawName.endsWith('.markdown');
    const isCode = /\.(js|jsx|ts|tsx|html|css|scss|py|sql|sh|bash|go|rs|c|cpp|h|java|yaml|yml|xml|env|log|toml|ini)(\?.*)?$/i.test(rawName);
    const isText = isJson || isCsv || isMarkdown || isCode || rawMime.startsWith('text/') || rawName.endsWith('.txt');

    let previewType: StorageFilePreviewData['type'] = 'binary';
    if (isImage) previewType = 'image';
    else if (isVideo) previewType = 'video';
    else if (isAudio) previewType = 'audio';
    else if (isPdf) previewType = 'pdf';
    else if (isMarkdown) previewType = 'markdown';
    else if (isJson) previewType = 'json';
    else if (isCsv) previewType = 'csv';
    else if (isCode) previewType = 'code';
    else if (isText) previewType = 'text';

    // 1. Resolve Blob via multi-tier fallback
    let blob: Blob | null = null;
    let textContent: string | null = null;

    // Tier A: Check IndexedDB
    try {
      blob = await indexedDbVault.getFileBlob(file.id, {
        originalName: file.originalName,
        driveFileId: file.googleDriveFileId,
      });
    } catch {}

    // Tier B: Check file metadata (downloadDataUrl, dataUrl, content)
    const metaDataUrl = file.metadata?.downloadDataUrl || file.metadata?.dataUrl || file.directDownloadUrl;
    if (!blob && metaDataUrl) {
      if (metaDataUrl.startsWith('data:')) {
        const parts = metaDataUrl.split(',');
        if (parts[1]) {
          const isBase64 = parts[0].includes('base64');
          if (isText) {
            try {
              textContent = isBase64 ? atob(parts[1]) : decodeURIComponent(parts[1]);
            } catch {}
          }
        }
        blob = dataUrlToBlob(metaDataUrl);
      } else {
        try {
          const res = await fetch(metaDataUrl);
          if (res.ok) {
            if (isText) textContent = await res.text();
            blob = await res.blob();
          }
        } catch {}
      }
    }

    // Tier C: Check default seed catalog
    if (!blob && !textContent) {
      const seedMatch = DEFAULT_AI_NEWS_STORAGE_FILES.find(
        sf => sf.id === file.id || (sf.originalName || '').toLowerCase().trim() === rawName
      );
      if (seedMatch?.metadata?.downloadDataUrl) {
        const seedUrl = seedMatch.metadata.downloadDataUrl;
        if (seedUrl.startsWith('data:')) {
          const parts = seedUrl.split(',');
          if (parts[1]) {
            const isBase64 = parts[0].includes('base64');
            if (isText) {
              try { textContent = isBase64 ? atob(parts[1]) : decodeURIComponent(parts[1]); } catch {}
            }
          }
          blob = dataUrlToBlob(seedUrl);
        } else {
          try {
            const res = await fetch(seedUrl);
            if (res.ok) {
              if (isText) textContent = await res.text();
              blob = await res.blob();
            }
          } catch {}
        }
      }
    }

    // Tier D: Check local vault files
    if (!blob && !textContent) {
      const localFiles = getLocalVaultFiles();
      const localMatch = localFiles.find(
        lf => lf.id === file.id || (lf.originalName || '').toLowerCase().trim() === rawName
      );
      if (localMatch?.metadata?.downloadDataUrl) {
        const lUrl = localMatch.metadata.downloadDataUrl;
        if (lUrl.startsWith('data:')) {
          const parts = lUrl.split(',');
          if (parts[1]) {
            const isBase64 = parts[0].includes('base64');
            if (isText) {
              try { textContent = isBase64 ? atob(parts[1]) : decodeURIComponent(parts[1]); } catch {}
            }
          }
          blob = dataUrlToBlob(lUrl);
        } else {
          try {
            const res = await fetch(lUrl);
            if (res.ok) {
              if (isText) textContent = await res.text();
              blob = await res.blob();
            }
          } catch {}
        }
      }
    }

    // Tier E: Server stream endpoint fallback
    if (!blob && !textContent) {
      try {
        const token = await this.getAuthToken();
        const url = `/api/storage-file?id=${encodeURIComponent(file.id)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
        const res = await fetch(url);
        if (res.ok) {
          if (isText) textContent = await res.text();
          blob = await res.blob();
        } else if (file.googleDriveFileId && file.googleDriveFileId !== file.id) {
          const fallbackUrl = `/api/storage-file?id=${encodeURIComponent(file.googleDriveFileId)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
          const fallbackRes = await fetch(fallbackUrl);
          if (fallbackRes.ok) {
            if (isText) textContent = await fallbackRes.text();
            blob = await fallbackRes.blob();
          }
        }
      } catch {}
    }

    // If we have a blob and it's text, ensure textContent is read
    if (blob && isText && textContent === null) {
      try {
        textContent = await blob.text();
      } catch {}
    }

    // Construct media URL for audio, video, image, and pdf
    let mediaUrl: string | undefined = undefined;
    if (blob) {
      mediaUrl = URL.createObjectURL(blob);
    } else if (metaDataUrl) {
      mediaUrl = metaDataUrl;
    } else {
      mediaUrl = `/api/storage-file?id=${encodeURIComponent(file.id)}`;
    }

    // Handle CSV parsing for tabular preview
    let parsedCsv: StorageFilePreviewData['parsedCsv'] = undefined;
    if (isCsv && textContent) {
      try {
        const lines = textContent.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length > 0) {
          const parseRow = (line: string): string[] => {
            const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            if (matches) {
              return matches.map(m => m.replace(/^"|"$/g, '').trim());
            }
            return line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
          };
          const headers = parseRow(lines[0]);
          const rows = lines.slice(1, 101).map(parseRow);
          parsedCsv = { headers, rows };
        }
      } catch {}
    }

    // Handle JSON pretty formatting
    if (isJson && textContent) {
      try {
        const parsed = JSON.parse(textContent);
        textContent = JSON.stringify(parsed, null, 2);
      } catch {}
    }

    return {
      type: previewType,
      content: textContent || undefined,
      mediaUrl,
      blob: blob || undefined,
      mimeType: file.mimeType || 'application/octet-stream',
      originalName: file.originalName,
      sizeBytes: file.sizeBytes,
      parsedCsv,
    };
  },

  /**
   * Real-time Sync Queue: Scans for locally-queued vault files and auto-syncs them to Google Drive.
   * Cleans up local queue entries upon successful sync to prevent duplicate copies.
   */
  async syncVaultQueue(): Promise<{ syncedCount: number; errors: string[] }> {
    if (isSyncingQueue) return { syncedCount: 0, errors: [] };
    isSyncingQueue = true;

    try {
      const token = await this.getAuthToken();
      if (!token) return { syncedCount: 0, errors: [] };

      const localFiles = getLocalVaultFiles();
      const rawQueued = localFiles.filter(f => f.id.startsWith('vault_') && !f.metadata?.synced);
      if (rawQueued.length === 0) return { syncedCount: 0, errors: [] };

      // Deduplicate queue items by normalized name to prevent duplicate upload requests
      const seenQueueNames = new Set<string>();
      const queuedFiles: StorageFile[] = [];
      for (const qf of rawQueued) {
        const norm = (qf.originalName || '').toLowerCase().trim();
        if (norm && !seenQueueNames.has(norm)) {
          seenQueueNames.add(norm);
          queuedFiles.push(qf);
        } else if (!norm) {
          queuedFiles.push(qf);
        } else {
          // Remove duplicate queued metadata
          removeLocalVaultFile(qf.id).catch(() => {});
        }
      }

      let syncedCount = 0;
      const errors: string[] = [];

      for (const item of queuedFiles) {
        try {
          const binaryBlob = await indexedDbVault.getFileBlob(item.id);
          if (!binaryBlob) {
            // Orphaned metadata with no binary data; remove to prevent infinite sync loops
            await removeLocalVaultFile(item.id);
            continue;
          }

          const base64 = await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.onerror = reject;
            r.readAsDataURL(binaryBlob);
          });

          if (!base64) continue;

          const res = await fetch('/api/storage-upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              fileName: item.originalName,
              fileBase64: base64,
              mimeType: item.mimeType,
              category: item.category,
              visibility: item.visibility,
              associatedPromptId: item.associatedPromptId,
              metadata: {
                ...item.metadata,
                syncedFromVaultAt: new Date().toISOString(),
              },
            }),
          });

          if (res.ok) {
            const resJson = await res.json();
            if (resJson.file) {
              const serverFile = normalizeStorageFile(resJson.file);
              // Clean up original temporary local queue item and any other duplicates by name
              await removeLocalVaultFile(item.id);
              await removeLocalVaultFilesByName(item.originalName, serverFile.id);
              await indexedDbVault.deleteFile(item.id);
              await indexedDbVault.deleteFilesByName(item.originalName, serverFile.id);

              // Cache authoritative server file with its local blob in IndexedDB
              await saveLocalVaultFile({
                ...serverFile,
                metadata: {
                  ...serverFile.metadata,
                  synced: true,
                  driveSyncedAt: new Date().toISOString(),
                },
              }, binaryBlob);
              syncedCount++;
            }
          }
        } catch (syncErr: any) {
          errors.push(syncErr.message || 'Sync error');
        }
      }

      return { syncedCount, errors };
    } finally {
      isSyncingQueue = false;
    }
  },

  /**
   * Instant synchronous retrieval of cached files for zero-delay (0ms) render on mount.
   */
  getCachedFiles(filters?: StorageFilterOptions): StorageFile[] {
    const cacheKey = JSON.stringify(filters || {});
    const cachedEntry = listFilesCache.get(cacheKey);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
      return cachedEntry.data.files;
    }

    const localFiles = getLocalVaultFiles().filter(f => !this.isClutterFile(f));
    const deduped: StorageFile[] = [];
    const seenNames = new Set<string>();
    for (const f of localFiles) {
      const norm = (f.originalName || '').toLowerCase().trim();
      if (!norm || !seenNames.has(norm)) {
        if (norm) seenNames.add(norm);
        deduped.push(f);
      }
    }
    return filterAndRankFiles(deduped, {
      search: filters?.search,
      category: filters?.category,
    });
  },

  /**
   * Instant synchronous retrieval of cached quota.
   */
  getCachedQuota(): StorageQuota | null {
    if (quotaCache && Date.now() - quotaCache.timestamp < CACHE_TTL_MS) {
      return quotaCache.data;
    }
    return null;
  },

  /**
   * Invalidate in-memory cache to force fresh network refetch.
   */
  invalidateCache() {
    invalidateStorageCache();
  },

  /**
   * Retrieves list of files from server API with local cache blending and deduplication.
   * Strictly guarantees that each unique filename is represented only once and no clutter/scaffold files leak.
   */
  async listFiles(filters?: StorageFilterOptions): Promise<{ files: StorageFile[]; total: number }> {
    const cacheKey = JSON.stringify(filters || {});
    const cachedEntry = listFilesCache.get(cacheKey);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
      return cachedEntry.data;
    }

    // Proactively check and sync queue in background
    this.syncVaultQueue().catch(() => {});

    let localFiles = getLocalVaultFiles().filter(f => !this.isClutterFile(f));
    try {
      const idbFiles = await indexedDbVault.listFiles();
      const cleanIdbFiles = idbFiles.map(normalizeStorageFile).filter(f => !this.isClutterFile(f));
      if (cleanIdbFiles.length > 0) {
        const idbIds = new Set(cleanIdbFiles.map(f => f.id));
        localFiles = [...cleanIdbFiles, ...localFiles.filter(f => !idbIds.has(f.id))];
      }
    } catch {}

    const filteredLocal = localFiles.filter(f => {
      if (this.isClutterFile(f)) return false;
      if (filters?.category && filters.category !== 'all' && f.category !== filters.category) return false;
      if (filters?.search) {
        const relevance = computeSearchRelevance(f, filters.search);
        return relevance > 0;
      }
      return true;
    });

    const token = await this.getAuthToken();
    if (!token) {
      // Deduplicate local files strictly by ID and normalized originalName
      const seenLocalIds = new Set<string>();
      const seenLocalNames = new Set<string>();
      const dedupedLocal: StorageFile[] = [];
      for (const lf of filteredLocal) {
        if (this.isClutterFile(lf)) continue;
        const norm = (lf.originalName || '').toLowerCase().trim();
        if (!seenLocalIds.has(lf.id) && (!norm || !seenLocalNames.has(norm))) {
          seenLocalIds.add(lf.id);
          if (norm) seenLocalNames.add(norm);
          dedupedLocal.push(lf);
        }
      }

      const ranked = filterAndRankFiles(dedupedLocal, {
        search: filters?.search,
        category: filters?.category,
      });
      return { files: ranked, total: ranked.length };
    }

    const params = new URLSearchParams();
    if (filters?.category && filters.category !== 'all') params.set('category', filters.category);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));

    try {
      const res = await fetch(`/api/storage-list?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const rawServerFiles: StorageFile[] = Array.isArray(data.files)
          ? data.files.map(normalizeStorageFile)
          : [];
        
        // Deduplicate server files: keep only the newest one if duplicate uploads exist, ignore clutter
        const seenServerIds = new Set<string>();
        const seenServerNames = new Set<string>();
        const serverFiles: StorageFile[] = [];
        for (const sf of rawServerFiles) {
          if (this.isClutterFile(sf)) continue;
          const norm = (sf.originalName || '').toLowerCase().trim();
          if (!seenServerIds.has(sf.id) && (!norm || !seenServerNames.has(norm))) {
            seenServerIds.add(sf.id);
            if (norm) seenServerNames.add(norm);
            serverFiles.push(sf);
          }
        }

        // Clean up obsolete local vault_ files that match server files by name
        for (const lf of filteredLocal) {
          const norm = (lf.originalName || '').toLowerCase().trim();
          if (lf.id.startsWith('vault_') && norm && seenServerNames.has(norm)) {
            removeLocalVaultFile(lf.id).catch(() => {});
            removeLocalVaultFilesByName(norm, lf.id).catch(() => {});
          }
        }

        // Merge server files with local-only files avoiding duplicates by name or ID
        const uniqueLocalMatches: StorageFile[] = [];
        for (const lf of filteredLocal) {
          if (this.isClutterFile(lf)) continue;
          const norm = (lf.originalName || '').toLowerCase().trim();
          if (seenServerIds.has(lf.id)) continue;
          if (norm && seenServerNames.has(norm)) continue;
          seenServerIds.add(lf.id);
          if (norm) seenServerNames.add(norm);
          uniqueLocalMatches.push(lf);
        }

        const combined = [...serverFiles, ...uniqueLocalMatches].filter(f => !this.isClutterFile(f));

        const ranked = filterAndRankFiles(combined, {
          search: filters?.search,
          category: filters?.category,
        });

        const result = {
          files: ranked,
          total: ranked.length,
        };
        listFilesCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }
    } catch (listErr) {
      console.warn('[storageService] List files API notice, returning local files:', listErr);
    }

    const fallbackRanked = filterAndRankFiles(filteredLocal.filter(f => !this.isClutterFile(f)), {
      search: filters?.search,
      category: filters?.category,
    });
    const fallbackResult = { files: fallbackRanked, total: fallbackRanked.length };
    listFilesCache.set(cacheKey, { data: fallbackResult, timestamp: Date.now() });
    return fallbackResult;
  },

  /**
   * Retrieves current user storage quota and category breakdown.
   */
  async getQuota(): Promise<StorageQuota> {
    if (quotaCache && Date.now() - quotaCache.timestamp < CACHE_TTL_MS) {
      return quotaCache.data;
    }

    const localFiles = getLocalVaultFiles().filter(f => !this.isClutterFile(f));
    const offlineUsedBytes = localFiles.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);
    const limitBytes = 500 * 1024 * 1024; // 500 MB Free Tier Default
    const defaultFreeQuota: StorageQuota = {
      userId: '',
      usedBytes: offlineUsedBytes,
      limitBytes,
      remainingBytes: Math.max(0, limitBytes - offlineUsedBytes),
      usedPercentage: Math.min(100, Math.round((offlineUsedBytes / limitBytes) * 100)),
      fileCount: localFiles.length,
      tierName: 'Free (500 MB)',
    };

    const token = await this.getAuthToken();
    if (!token) {
      quotaCache = { data: defaultFreeQuota, timestamp: Date.now() };
      return defaultFreeQuota;
    }

    try {
      const res = await fetch('/api/storage-quota', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.quota) {
          quotaCache = { data: data.quota, timestamp: Date.now() };
          return data.quota;
        }
      }
    } catch (quotaErr) {
      console.warn('[storageService] Quota API notice, checking direct database:', quotaErr);
    }

    return defaultFreeQuota;
  },

  /**
   * Deletes a storage file.
   */
  async deleteFile(fileId: string): Promise<boolean> {
    removeLocalVaultFile(fileId);
    invalidateStorageCache();

    const token = await this.getAuthToken();
    if (!token) return true;

    try {
      const res = await fetch('/api/storage-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fileId }),
      });

      if (!res.ok) {
        const errText = await res.text();
        let msg = 'Failed to delete file.';
        try {
          const parsed = JSON.parse(errText);
          msg = parsed.error || msg;
        } catch {}
        console.warn('[storageService] Server delete notice:', msg);
      }
    } catch (delErr) {
      console.warn('[storageService] Network error during delete:', delErr);
    }

    return true;
  },

  /**
   * Downloads a file directly via authenticated streaming endpoint or local data URI.
   */
  async downloadFile(fileId: string, fileName?: string): Promise<void> {
    // 1. Check if stored in IndexedDB vault for instant download
    try {
      const idbBlob = await indexedDbVault.getFileBlob(fileId, { originalName: fileName });
      if (idbBlob) {
        const blobUrl = URL.createObjectURL(idbBlob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        return;
      }
    } catch {}

    // 2. Check if stored in local vault
    const localFiles = getLocalVaultFiles();
    const localMatch = localFiles.find(f => f.id === fileId || (fileName && f.originalName === fileName));
    if (localMatch?.metadata?.downloadDataUrl) {
      const a = document.createElement('a');
      a.href = localMatch.metadata.downloadDataUrl;
      a.download = fileName || localMatch.originalName || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // 3. Check seed files
    const seedMatch = DEFAULT_AI_NEWS_STORAGE_FILES.find(
      f => f.id === fileId || (fileName && f.originalName === fileName)
    );
    if (seedMatch?.metadata?.downloadDataUrl) {
      const a = document.createElement('a');
      a.href = seedMatch.metadata.downloadDataUrl;
      a.download = fileName || seedMatch.originalName || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    const token = await this.getAuthToken();
    const res = await fetch(`/api/storage-file?id=${encodeURIComponent(fileId)}&download=true${token ? `&token=${encodeURIComponent(token)}` : ''}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      throw new Error(`Download failed with status ${res.status}`);
    }

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  },

  /**
   * Reads text content of a storage file by ID.
   */
  async getFileText(fileId: string): Promise<string> {
    try {
      const idbBlob = await indexedDbVault.getFileBlob(fileId);
      if (idbBlob) {
        return await idbBlob.text();
      }
    } catch {}

    const localFiles = getLocalVaultFiles();
    const localMatch = localFiles.find(f => f.id === fileId);
    if (typeof localMatch?.metadata?.downloadDataUrl === 'string') {
      const dataUrl = localMatch.metadata.downloadDataUrl;
      const parts = dataUrl.split(',');
      if (parts.length > 1 && parts[1]) {
        try {
          return atob(parts[1]);
        } catch {}
      }
    }

    const url = await this.getFileUrl(fileId, true);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load file content (${res.status})`);
    }
    return await res.text();
  },

  /**
   * Reads raw Blob of a storage file by ID.
   */
  async getFileBlob(fileId: string): Promise<Blob> {
    try {
      const idbBlob = await indexedDbVault.getFileBlob(fileId);
      if (idbBlob) return idbBlob;
    } catch {}

    const url = await this.getFileUrl(fileId, true);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load file blob (${res.status})`);
    }
    return await res.blob();
  },

  /**
   * Initiates a workspace or system backup to Google Drive.
   */
  async backupWorkspace(backupData: any, backupType = 'workspace', notes = ''): Promise<any> {
    const token = await this.getAuthToken();
    if (!token) throw new Error('Authentication required to create backups.');

    const res = await fetch('/api/storage-backup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ backupData, backupType, notes }),
    });

    if (!res.ok) {
      const errText = await res.text();
      let msg = 'Backup failed.';
      try {
        const parsed = JSON.parse(errText);
        msg = parsed.error || msg;
      } catch {}
      throw new Error(msg);
    }

    return await res.json();
  },

  /**
   * Helper to determine whether a storage file is an unapproved auto-generated fake / scaffold file or clutter.
   * Real user workspace folders, project backups, and user uploads are NEVER clutter.
   */
  isClutterFile(file: StorageFile): boolean {
    if (!file) return false;
    // 0. Explicit protection: Project backups and user workspace vault bundles are NEVER clutter
    if (
      file.category === 'backups' ||
      file.metadata?.source === 'workspace_project_backup' ||
      file.metadata?.source === 'workspace_folder' ||
      file.metadata?.projectId ||
      (file.originalName && (file.originalName.includes('Folder Bundle') || file.originalName.includes('folder-backup')))
    ) {
      return false;
    }
    const name = (file.originalName || file.sanitizedName || '').toLowerCase().trim();
    const id = (file.id || '').toLowerCase().trim();
    const src = String(file.metadata?.source || '').toLowerCase().trim();

    // 1. Synthetic simulator or demo clutter only
    if (src === 'simulator' || src === 'demo') return true;
    if (id.startsWith('file_demo_') || id.startsWith('demo_')) return true;
    if (name.startsWith('customer_support_guidelines_2026')) return true;

    // 2. Demo prefixes
    if (name.startsWith('openai-gpt-5-') || name.startsWith('deepseek-r1-analysis') || name.startsWith('frontier-models-2026') || name.startsWith('prompt-engineering-best-practices')) return true;
    if (name.endsWith('.spec.json')) return true;

    return false;
  },

  /**
   * Identifies and permanently purges unapproved auto-saved background clutter,
   * temporary task JSONs, agent milestone dumps, and fake files from Supabase, IndexedDB, and localStorage.
   */
  async purgeClutterFiles(): Promise<{ purgedCount: number; deletedIds: string[] }> {
    const deletedIds: string[] = [];

    // 1. Purge from IndexedDB
    try {
      if (indexedDbVault.isAvailable()) {
        const idbFiles = await indexedDbVault.listFiles();
        for (const file of idbFiles) {
          if (this.isClutterFile(file)) {
            await indexedDbVault.deleteFile(file.id);
            if (file.originalName) {
              await indexedDbVault.deleteFilesByName(file.originalName);
            }
            deletedIds.push(file.id);
          }
        }
      }
    } catch (err) {
      console.warn('[storageService] IndexedDB clutter purge notice:', err);
    }

    // 2. Purge from local vault cache (localStorage)
    try {
      const local = getLocalVaultFiles();
      for (const file of local) {
        if (this.isClutterFile(file) && !deletedIds.includes(file.id)) {
          deletedIds.push(file.id);
        }
      }
      const cleanLocal = local.filter((f) => !this.isClutterFile(f));
      localStorage.setItem(LOCAL_VAULT_KEY, JSON.stringify(cleanLocal));
    } catch (err) {
      console.warn('[storageService] LocalStorage clutter purge notice:', err);
    }

    // 3. Purge from Server/Database if user is authenticated
    try {
      const token = await this.getAuthToken();
      if (token) {
        const res = await fetch('/api/storage-list?limit=100', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const serverFiles: StorageFile[] = Array.isArray(data.files)
            ? data.files.map(normalizeStorageFile)
            : [];
          for (const file of serverFiles) {
            if (this.isClutterFile(file)) {
              try {
                await this.deleteFile(file.id);
                if (!deletedIds.includes(file.id)) {
                  deletedIds.push(file.id);
                }
              } catch {}
            }
          }
        }
      }
    } catch (err) {
      console.warn('[storageService] Server clutter purge notice:', err);
    }

    return { purgedCount: deletedIds.length, deletedIds };
  },

  /**
   * Saves content to Drive vault only when explicit user approval is granted.
   */
  async autoSaveContent(
    fileName: string,
    content: string,
    category: 'prompt-assets' | 'generated' | 'exports' = 'generated',
    associatedPromptId?: string,
    userApproved = false
  ): Promise<StorageFile | null> {
    if (!userApproved) {
      console.debug('[StorageService] Auto-save skipped: User approval required.');
      return null;
    }

    try {
      const token = await this.getAuthToken();
      if (!token) return null;

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const file = new File([blob], fileName, { type: 'text/plain' });

      return await this.uploadFile(file, {
        category,
        visibility: 'private',
        associatedPromptId,
      });
    } catch (err) {
      console.debug('[StorageService] Save note:', err);
      return null;
    }
  },
};
