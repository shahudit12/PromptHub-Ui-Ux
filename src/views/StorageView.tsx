import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import DOMPurify from 'dompurify';
import { useApp } from '../context/AppContext';
import { useConfirm } from '../hooks/useConfirm';
import { storageService, formatStorageBytes, type StorageFilePreviewData, notifyStorageUpdated } from '../services/storageService';
import { supabase } from '../lib/supabase';
import { indexedDbVault } from '../utils/indexedDbVault';
import type { StorageFile, StorageQuota, FileCategory } from '../db/schema';
import {
  Upload,
  FileText,
  FileCode,
  Image as ImageIcon,
  Video,
  Archive,
  Database,
  Search,
  RefreshCw,
  Trash2,
  Download,
  Plus,
  Clock,
  Sparkles,
  Shield,
  Layers,
  FolderOpen,
  Terminal,
  Filter,
  X,
  Check,
  Eye,
  Play,
  Newspaper,
  Music,
  ExternalLink,
  Copy,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Table,
} from 'lucide-react';
import { PromptStorageIcon } from '../components/icons/PromptHubIcons';
import { motion, AnimatePresence } from 'framer-motion';
import {
  filterAndRankFiles,
  getFormatBadge,
  type StorageSortOption,
  type StorageFormatFilter,
} from '../utils/storageSearchUtils';

const CATEGORY_TABS: { id: FileCategory | 'all'; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'all', label: 'All Files', icon: Layers },
  { id: 'ai-news', label: 'AI News', icon: Newspaper },
  { id: 'ai-knowledge', label: 'AI Knowledge / Docs', icon: FileText },
  { id: 'prompt-assets', label: 'Prompt Attachments', icon: FileCode },
  { id: 'uploads', label: 'General Uploads', icon: FolderOpen },
  { id: 'generated', label: 'AI Generated Assets', icon: Sparkles },
  { id: 'backups', label: 'Drive Backups', icon: Archive },
];

const FORMAT_PILLS: { id: StorageFormatFilter; label: string }[] = [
  { id: 'all', label: 'All Formats' },
  { id: 'md', label: '.md Markdown' },
  { id: 'png', label: '.png Images' },
  { id: 'jpg', label: '.jpg / .jpeg' },
  { id: 'pdf', label: '.pdf Docs' },
  { id: 'json', label: '.json Config' },
  { id: 'csv', label: '.csv Data' },
  { id: 'code', label: 'Code Scripts' },
  { id: 'archives', label: 'Archives' },
];

const getFileIcon = (mimeType?: string | null, category?: string | null, originalName?: string | null) => {
  const m = (typeof mimeType === 'string' ? mimeType : '').toLowerCase();
  const name = (typeof originalName === 'string' ? originalName : '').toLowerCase();

  if (m.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif|svg)(\?.*)?$/i.test(name)) return ImageIcon;
  if (m.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi)(\?.*)?$/i.test(name)) return Video;
  if (m.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i.test(name)) return Music;
  if (category === 'ai-news' || name.includes('ai-news') || name.includes('news')) return Newspaper;
  if (m.includes('pdf') || name.endsWith('.pdf')) return FileText;
  if (m.includes('text') || m.includes('markdown') || name.endsWith('.txt') || name.endsWith('.md')) return FileText;
  if (m.includes('json') || m.includes('javascript') || m.includes('typescript') || /\.(json|js|ts|tsx|jsx|py|html|css)(\?.*)?$/i.test(name)) return FileCode;
  if (m.includes('zip') || m.includes('tar') || m.includes('archive') || /\.(zip|tar|gz|7z|rar)(\?.*)?$/i.test(name)) return Archive;
  if (m.includes('csv') || category === 'ai-knowledge' || name.endsWith('.csv')) return Database;
  return FileText;
};

const renderSimpleMarkdown = (content: string): string => {
  if (!content) return '';
  let html = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks: ```lang\ncode\n```
  html = html.replace(/```([\s\S]*?)```/g, (_m, code) => {
    return `<pre class="my-3 p-3 bg-bg-tertiary rounded-lg font-mono text-xs overflow-x-auto border border-border-default"><code>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-bg-tertiary text-brand-primary font-mono text-xs rounded border border-border-subtle">$1</code>');

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold text-text-primary mt-4 mb-1.5">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-base font-bold text-text-primary mt-5 mb-2 border-b border-border-subtle pb-1">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-lg font-bold text-text-primary mt-6 mb-2 border-b border-border-default pb-1.5">$1</h1>');

  // Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-text-primary">$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-text-secondary">$1</em>');

  // Blockquotes
  html = html.replace(/^&gt; (.*$)/gim, '<blockquote class="border-l-2 border-brand-primary pl-3 my-2 text-text-secondary italic text-xs">$1</blockquote>');

  // Bullet items
  html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li class="ml-4 list-disc text-xs text-text-primary my-1">$1</li>');

  // Paragraph linebreaks
  html = html.replace(/\n\n/g, '<br/><br/>');

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'strong', 'em', 'code', 'pre', 'blockquote', 'li', 'ul', 'ol', 'br', 'span', 'div'],
    ALLOWED_ATTR: ['class'],
  });
};

interface StorageFileThumbnailProps {
  file: StorageFile;
  authToken: string | null;
  onOpenPreview: (file: StorageFile) => void;
}


interface StorageDocumentSnippetProps {
  file: StorageFile;
  onOpenPreview: (file: StorageFile) => void;
}

const StorageDocumentSnippet: React.FC<StorageDocumentSnippetProps> = ({ file, onOpenPreview }) => {
  const [snippet, setSnippet] = useState<string | null>(null);
  const [lineCount, setLineCount] = useState<number>(0);
  const [isCsv, setIsCsv] = useState<boolean>(false);

  const safeName = file?.originalName || file?.sanitizedName || 'Untitled Document';
  const getExt = () => {
    if (typeof safeName === 'string' && safeName.includes('.')) {
      return safeName.split('.').pop()?.toUpperCase() || 'DATA';
    }
    return 'DATA';
  };

  useEffect(() => {
    let active = true;
    const loadSnippet = async () => {
      try {
        const preview = await storageService.getFilePreviewData(file);
        if (!active) return;
        if (typeof preview?.content === 'string') {
          const lines = preview.content.split('\n');
          setLineCount(lines.length);
          setSnippet(lines.slice(0, 5).join('\n'));
        } else if (preview?.type === 'csv' && preview.parsedCsv && Array.isArray(preview.parsedCsv.rows) && preview.parsedCsv.rows.length > 0) {
          setIsCsv(true);
          const headerStr = (preview.parsedCsv.headers || []).slice(0, 4).join(' | ');
          const firstRow = (preview.parsedCsv.rows[0] || []).slice(0, 4).join(' | ');
          setLineCount(preview.parsedCsv.rows.length);
          setSnippet(`${headerStr}\n${firstRow}\n... (${preview.parsedCsv.rows.length} total rows)`);
        } else {
          const ext = getExt();
          setSnippet(`// ${safeName}\n// Format: ${ext} • ${formatStorageBytes(file?.sizeBytes || 0)}\n// Click to inspect structured contents`);
        }
      } catch {
        if (active) {
          const ext = getExt();
          setSnippet(`[${ext} Document • ${formatStorageBytes(file?.sizeBytes || 0)}]\nClick to preview full file contents.`);
        }
      }
    };
    loadSnippet();
    return () => { active = false; };
  }, [file, safeName]);

  const fileExt = getExt();

  return (
    <div
      onClick={() => onOpenPreview(file)}
      className="relative w-full h-36 rounded-xl overflow-hidden bg-bg-tertiary/70 border border-border-default cursor-pointer p-3 flex flex-col justify-between hover:border-brand-primary/40 transition-colors group/doc shadow-2xs select-none"
      title={`Click to preview: ${safeName}`}
    >
      <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle/60 text-[10px] font-mono text-text-muted">
        <span className="flex items-center gap-1 font-semibold text-brand-primary dark:text-[#41A2D9]">
          <FileText className="w-3.5 h-3.5" />
          <span>{isCsv ? 'CSV Dataset' : fileExt}</span>
        </span>
        <span className="text-[9px] bg-bg-secondary px-1.5 py-0.2 rounded border border-border-subtle">
          {lineCount > 0 ? `${lineCount} lines` : formatStorageBytes(file?.sizeBytes || 0)}
        </span>
      </div>

      <div className="flex-1 my-1 overflow-hidden font-mono text-[10px] text-text-secondary leading-relaxed opacity-85">
        <pre className="whitespace-pre-wrap font-mono line-clamp-4 overflow-hidden break-all text-[10px]">
          {snippet || 'Loading document preview...'}
        </pre>
      </div>

      <div className="pt-1 border-t border-border-subtle/50 flex items-center justify-between text-[9px] font-mono text-text-muted">
        <span className="group-hover/doc:text-brand-primary transition-colors flex items-center gap-1">
          <Eye className="w-2.5 h-2.5" /> Click to Inspect Text
        </span>
        <span className="px-1.5 py-0.2 rounded bg-bg-primary border border-border-default font-semibold text-[8.5px]">
          OPEN
        </span>
      </div>
    </div>
  );
};

const StorageFileThumbnail: React.FC<StorageFileThumbnailProps> = ({ file, authToken, onOpenPreview }) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const safeName = file?.originalName || file?.sanitizedName || 'Image';

  useEffect(() => {
    let active = true;
    let createdBlobUrl: string | null = null;

    const resolveThumb = async () => {
      setIsLoading(true);
      setHasError(false);

      // 1. Check direct metadata URL (e.g. data URI)
      const metaUrl = file?.metadata?.downloadDataUrl || file?.metadata?.dataUrl || file?.directDownloadUrl;
      if (metaUrl) {
        if (active) {
          setThumbUrl(metaUrl);
          setIsLoading(false);
        }
        return;
      }

      // 2. Check local IndexedDB Blob
      try {
        const blob = await indexedDbVault.getFileBlob(file.id, {
          originalName: safeName,
          driveFileId: file?.googleDriveFileId,
        });
        if (blob && active) {
          createdBlobUrl = URL.createObjectURL(blob);
          setThumbUrl(createdBlobUrl);
          setIsLoading(false);
          return;
        }
      } catch {}

      // 3. Fall back to stream URL
      const streamUrl = authToken
        ? `/api/storage-file?id=${encodeURIComponent(file.id)}&token=${encodeURIComponent(authToken)}`
        : `/api/storage-file?id=${encodeURIComponent(file.id)}`;
      if (active) {
        setThumbUrl(streamUrl);
        setIsLoading(false);
      }
    };

    resolveThumb();

    return () => {
      active = false;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [file?.id, safeName, file?.googleDriveFileId, file?.metadata?.downloadDataUrl, file?.metadata?.dataUrl, authToken]);

  if (hasError) {
    return (
      <div
        onClick={() => onOpenPreview(file)}
        className="relative w-full h-36 rounded-xl overflow-hidden bg-bg-tertiary border border-border-default cursor-pointer flex flex-col items-center justify-center gap-1.5 p-3 hover:border-brand-primary/40 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
          <ImageIcon className="w-5 h-5" />
        </div>
        <span className="text-[11px] font-medium text-text-secondary truncate max-w-[90%]">
          {safeName}
        </span>
        <span className="text-[9px] font-mono text-text-muted">Click to Preview</span>
      </div>
    );
  }

  return (
    <div
      onClick={() => onOpenPreview(file)}
      className="relative w-full h-36 rounded-xl overflow-hidden bg-bg-tertiary border border-border-default cursor-pointer group/thumb flex items-center justify-center"
    >
      {isLoading ? (
        <div className="flex items-center justify-center text-text-muted">
          <RefreshCw className="w-4 h-4 animate-spin text-brand-primary" />
        </div>
      ) : (
        <img
          src={thumbUrl || ''}
          alt={safeName}
          loading="lazy"
          className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
          onError={() => setHasError(true)}
        />
      )}
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
        <span className="min-h-[44px] px-3 py-1.5 rounded-lg bg-black/80 text-white text-[11px] font-mono flex items-center gap-1.5 shadow-sm">
          <Eye className="w-3.5 h-3.5" />
          <span>View Photo</span>
        </span>
      </div>
    </div>
  );
};

export const StorageView: React.FC = () => {
  const { showToast, setActiveTab, user } = useApp();
  const confirm = useConfirm();

  // Instant cache-first initialization eliminates perceived loading time
  const [files, setFiles] = useState<StorageFile[]>(() => {
    try {
      return storageService.getCachedFiles();
    } catch {
      return [];
    }
  });
  const [quota, setQuota] = useState<StorageQuota | null>(() => {
    try {
      return storageService.getCachedQuota();
    } catch {
      return null;
    }
  });
  const [isQuotaLoading, setIsQuotaLoading] = useState<boolean>(() => {
    try {
      return !storageService.getCachedQuota();
    } catch {
      return true;
    }
  });
  const [isLoading, setIsLoading] = useState(() => files.length === 0);
  const [selectedCategory, setSelectedCategory] = useState<FileCategory | 'all'>('all');
  const [selectedFormatFilter, setSelectedFormatFilter] = useState<StorageFormatFilter>('all');
  const [sortBy, setSortBy] = useState<StorageSortOption>('relevance');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadCategory, setUploadCategory] = useState<FileCategory>('ai-knowledge');
  const [isDragOver, setIsDragOver] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<StorageFile | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<StorageFilePreviewData | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [rawViewMode, setRawViewMode] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [hasCopiedContent, setHasCopiedContent] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeRequestIdRef = useRef(0);
  const inFlightUploadsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    storageService.getAuthToken().then(setAuthToken);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('category');
      if (cat === 'ai-news') {
        setSelectedCategory('ai-news');
      }
    }
  }, []);

  // Debounce search query to eliminate rapid request racing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleClosePreview = useCallback(() => {
    setPreviewMediaUrl((prevUrl) => {
      if (prevUrl && prevUrl.startsWith('blob:')) {
        URL.revokeObjectURL(prevUrl);
      }
      return null;
    });
    setPreviewFile(null);
    setPreviewContent(null);
    setPreviewData(null);
    setRawViewMode(false);
    setZoomScale(1);
    setHasCopiedContent(false);
  }, []);

  useEffect(() => {
    return () => {
      if (previewMediaUrl && previewMediaUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewMediaUrl);
      }
    };
  }, [previewMediaUrl]);

  const handleOpenPreview = async (file: StorageFile) => {
    if (!file) return;
    handleClosePreview();
    setPreviewFile(file);
    setIsPreviewLoading(true);
    setZoomScale(1);
    setRawViewMode(false);
    setHasCopiedContent(false);

    try {
      const data = await storageService.getFilePreviewData(file);
      setPreviewData(data);
      if (data.mediaUrl) {
        setPreviewMediaUrl(data.mediaUrl);
      }
      if (data.content) {
        setPreviewContent(data.content);
      }
    } catch (err) {
      console.warn('[StorageView] Failed to load preview data:', err);
      setPreviewContent('(Unable to load preview)');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const loadData = useCallback(async (isSilent = false) => {
    const currentRequestId = ++activeRequestIdRef.current;
    if (!isSilent) {
      // Only display loading skeleton if we have zero files in cache
      setFiles((prev) => {
        if (prev.length === 0) {
          setIsLoading(true);
        }
        return prev;
      });
      setIsQuotaLoading(true);
    }
    try {
      const [filesResult, quotaResult] = await Promise.allSettled([
        storageService.listFiles({
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          search: debouncedSearch.trim() || undefined,
        }),
        storageService.getQuota(),
      ]);

      if (currentRequestId === activeRequestIdRef.current) {
        let loadedFiles: StorageFile[] = [];
        if (filesResult.status === 'fulfilled' && filesResult.value?.files) {
          loadedFiles = filesResult.value.files;
          setFiles(loadedFiles);
        }

        const fileSum = loadedFiles.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);

        if (quotaResult.status === 'fulfilled' && quotaResult.value) {
          const q = quotaResult.value;
          const effectiveUsed = Math.max(q.usedBytes || 0, fileSum);
          setQuota({
            ...q,
            usedBytes: effectiveUsed,
            remainingBytes: Math.max(0, (q.limitBytes || 0) - effectiveUsed),
            usedPercentage: q.limitBytes > 0 ? Math.min(100, Math.round((effectiveUsed / q.limitBytes) * 100)) : 0,
            fileCount: Math.max(q.fileCount || 0, loadedFiles.length),
          });
        } else {
          const isAdmin = (user as any)?.role === 'Admin';
          const limitBytes = isAdmin ? 5497558138880 : 524288000;
          setQuota({
            userId: user?.id || '',
            usedBytes: fileSum,
            limitBytes,
            remainingBytes: Math.max(0, limitBytes - fileSum),
            usedPercentage: Math.min(100, Math.round((fileSum / limitBytes) * 100)),
            fileCount: loadedFiles.length,
            tierName: isAdmin ? 'Admin (5 TB Platform)' : 'Free (500 MB)',
          });
        }
      }
    } catch (err: any) {
      if (currentRequestId === activeRequestIdRef.current) {
        console.warn('[StorageView] Load warning:', err);
      }
    } finally {
      if (currentRequestId === activeRequestIdRef.current) {
        setIsLoading(false);
        setIsQuotaLoading(false);
      }
    }
  }, [selectedCategory, debouncedSearch, user]);

  useEffect(() => {
    // Proactively purge legacy fake/clutter files on mount
    storageService.purgeClutterFiles().catch(() => {});
  }, []);

  useEffect(() => {
    // 1. Initial load
    loadData();

    // 2. CustomEvent listener for in-window real-time updates
    const handleStorageUpdated = () => {
      loadData(true);
    };
    window.addEventListener('ph_storage_updated', handleStorageUpdated);

    // 3. LocalStorage storage event for cross-tab sync
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'ph_storage_sync_tick' || e.key === 'ph_storage_vault_files') {
        loadData(true);
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    // 4. BroadcastChannel for instant same-origin tab sync
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('ph_storage_broadcast');
        bc.onmessage = () => {
          loadData(true);
        };
      }
    } catch {}

    // 5. Supabase Realtime channel subscription
    let subscription: any = null;
    try {
      if (supabase && typeof (supabase as any).channel === 'function') {
        subscription = (supabase as any)
          .channel('ph_storage_realtime_view')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'storage_files' },
            () => {
              loadData(true);
            }
          )
          .on('broadcast', { event: 'storage_updated' }, () => {
            loadData(true);
          })
          .subscribe((status: string) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              // Gracefully handled without unhandled exception logging
            }
          });
      }
    } catch {}

    // 6. Fast visibility-aware heartbeat polling (every 4s while tab is visible)
    const pollInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadData(true);
      }
    }, 4000);

    return () => {
      window.removeEventListener('ph_storage_updated', handleStorageUpdated);
      window.removeEventListener('storage', handleStorageEvent);
      if (bc) {
        try { bc.close(); } catch {}
      }
      if (subscription && supabase && typeof (supabase as any).removeChannel === 'function') {
        try { (supabase as any).removeChannel(subscription); } catch {}
      }
      window.clearInterval(pollInterval);
    };
  }, [loadData]);

  // Client-side instant format filtering and relevance ranking with strict deduplication
  const displayedFiles = React.useMemo(() => {
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    const uniqueFiles: StorageFile[] = [];
    for (const f of files) {
      if (!f) continue;
      if (storageService.isClutterFile(f)) continue;
      const normName = (f.originalName || f.sanitizedName || '').toLowerCase().trim();
      if (!seenIds.has(f.id) && (!normName || !seenNames.has(normName))) {
        seenIds.add(f.id);
        if (normName) seenNames.add(normName);
        uniqueFiles.push(f);
      }
    }

    return filterAndRankFiles(uniqueFiles, {
      search: searchQuery.trim() || debouncedSearch.trim(),
      category: selectedCategory,
      formatFilter: selectedFormatFilter,
      sortBy: sortBy,
    });
  }, [files, searchQuery, debouncedSearch, selectedCategory, selectedFormatFilter, sortBy]);

  const handleFileUpload = async (file: File) => {
    const normName = (file.name || 'untitled').toLowerCase().trim();
    if (inFlightUploadsRef.current.has(normName) || isUploading) {
      return;
    }

    // Strict Idempotency: One upload should be done once only, no copies allowed
    const fileExists = files.some(
      (f) => (f.originalName || f.sanitizedName || '').toLowerCase().trim() === normName
    );
    if (fileExists) {
      showToast(`File "${file.name}" has already been uploaded. Duplicate uploads are not allowed.`, 'info');
      return;
    }

    inFlightUploadsRef.current.add(normName);
    setIsUploading(true);
    setUploadProgress(10);
    try {
      const uploaded = await storageService.uploadFile(file, {
        category: uploadCategory,
        visibility: 'private',
        onProgress: (p) => setUploadProgress(p),
      });

      showToast(`File "${file.name}" uploaded successfully to Storage Vault!`, 'success');
      // Strictly deduplicate by ID and normalized name before setting state
      setFiles((prev) => {
        const uploadedNorm = (uploaded.originalName || uploaded.sanitizedName || '').toLowerCase().trim();
        const filtered = prev.filter(
          f => f.id !== uploaded.id && (f.originalName || f.sanitizedName || '').toLowerCase().trim() !== uploadedNorm
        );
        return [uploaded, ...filtered];
      });
      // Refresh quota
      const updatedQuota = await storageService.getQuota();
      setQuota(updatedQuota);
      notifyStorageUpdated();
    } catch (err: any) {
      const isDuplicate = err.message?.includes('already been uploaded') || err.message?.includes('Duplicate');
      showToast(err.message || 'File upload failed.', isDuplicate ? 'info' : 'error');
    } finally {
      inFlightUploadsRef.current.delete(normName);
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (file && !isUploading) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    const ok = await confirm({
      title: 'Delete Storage File',
      message: `Are you sure you want to delete "${fileName}"? This will remove the file from your Google Drive storage.`,
      confirmText: 'Delete File',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    setDeletingFileId(fileId);
    try {
      await storageService.deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      showToast('File deleted successfully.', 'info');
      const updatedQuota = await storageService.getQuota();
      setQuota(updatedQuota);
      notifyStorageUpdated();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete file.', 'error');
    } finally {
      setDeletingFileId(null);
    }
  };

  const handleCleanClutter = async () => {
    const clutterFiles = files.filter((f) => storageService.isClutterFile(f));
    const count = clutterFiles.length;
    if (count === 0) {
      showToast('No unapproved clutter found. Your storage only contains your approved files.', 'info');
      return;
    }

    const ok = await confirm({
      title: 'Clean Auto-Saved Clutter',
      message: `PromptHub identified ${count} auto-generated background files (agent backups, reports, or test files). Would you like to permanently delete them and keep only your approved files?`,
      confirmText: `Clean Clutter (${count} Files)`,
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    setIsPurging(true);
    try {
      const res = await storageService.purgeClutterFiles();
      showToast(`Cleaned ${res.purgedCount} clutter files successfully.`, 'success');
      await loadData();
      notifyStorageUpdated();
    } catch (err: any) {
      showToast(err.message || 'Failed to clean clutter files.', 'error');
    } finally {
      setIsPurging(false);
    }
  };

  const handleDownload = async (file: StorageFile) => {
    try {
      const fileName = file?.originalName || file?.sanitizedName || 'download';
      await storageService.downloadFile(file.id, fileName);
    } catch (err: any) {
      showToast(err.message || 'Download failed.', 'error');
    }
  };

  const handleAttachToIDE = (file: StorageFile) => {
    try {
      const fileName = file?.originalName || file?.sanitizedName || 'Document';
      const snippet = `\n\n[Knowledge Source: ${fileName} (${formatStorageBytes(file?.sizeBytes || 0)})]\n`;
      navigator.clipboard.writeText(snippet);
    } catch {}
    setActiveTab('workspace');
  };

  // Same rule as the allowance above: with no quota loaded there are no per-category
  // bytes either. `|| 0` used to render a measured-looking "0 B" for every category.
  const categoryBytes = (key: string) =>
    quota ? formatStorageBytes((quota as any).breakdown?.[key]?.bytes || 0) : '—';

  return (
    <div className="flex-1 min-h-0 bg-bg-primary overflow-y-auto custom-scrollbar p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-default">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
              <PromptStorageIcon className="w-4 h-4" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold font-display text-text-primary">
              Asset &amp; Knowledge Vault
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-primary/10 text-brand-primary dark:text-brand-accent border border-brand-primary/20">
              Powered by Google Drive
            </span>
          </div>
          <p className="text-xs text-text-secondary">
            Store documents, AI knowledge PDFs, datasets, prompt attachments, and workspace backups powered by Google Drive cloud infrastructure.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-brand-primary/10 text-brand-primary dark:text-brand-accent border border-brand-primary/20">
              <Shield className="w-3 h-3 text-brand-primary dark:text-brand-accent shrink-0" />
              <span>Strict User Approval Policy: Zero unapproved background saving</span>
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {files.some((f) => storageService.isClutterFile(f)) && (
            <button
              onClick={handleCleanClutter}
              disabled={isPurging || isLoading}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Purge auto-generated background backups & unapproved clutter"
            >
              <Trash2 className={`w-3.5 h-3.5 ${isPurging ? 'animate-spin' : ''}`} />
              <span>Clean Auto-Saved Clutter ({files.filter((f) => storageService.isClutterFile(f)).length})</span>
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Upload File</span>
          </button>

          <button
            onClick={() => loadData()}
            aria-label="Refresh storage list"
            title="Refresh"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quota Dashboard Card */}
      <div className="p-5 rounded-2xl bg-bg-secondary border border-border-default shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-brand-primary shrink-0" />
            <h2 className="text-xs font-bold text-text-primary font-sans uppercase tracking-wider">
              Storage Allowance:{' '}
              <span className={`text-brand-primary ${!quota && isQuotaLoading ? 'animate-pulse' : ''}`}>
                {quota
                  ? quota.tierName
                  : isQuotaLoading
                    ? 'Calculating storage telemetry…'
                    : (user as any)?.role === 'Admin'
                      ? 'Admin (5 TB Platform)'
                      : 'Free Plan (500 MB)'}
              </span>
            </h2>
          </div>
          <div className="text-xs text-text-muted font-mono">
            {quota ? (
              <>Used: <strong className="text-text-primary">{formatStorageBytes(quota.usedBytes)}</strong> of {formatStorageBytes(quota.limitBytes)} ({quota.usedPercentage}%)</>
            ) : isQuotaLoading ? (
              <span className="text-text-muted animate-pulse">Synchronizing vault telemetry…</span>
            ) : (
              <span>Used: <strong className="text-text-primary">0 B</strong> of {(user as any)?.role === 'Admin' ? '5 TB' : '500 MB'} (0%)</span>
            )}
          </div>
        </div>

        {/* Progress Bar — Always present, smooth skeleton shimmer during initialization */}
        <div className="w-full h-2.5 bg-bg-tertiary rounded-full overflow-hidden border border-border-subtle relative">
          {quota ? (
            <div
              className="h-full bg-brand-primary rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, quota.usedPercentage || 0)}%` }}
            />
          ) : isQuotaLoading ? (
            <div className="h-full bg-brand-primary/40 rounded-full animate-pulse w-1/4" />
          ) : (
            <div className="h-full bg-brand-primary/20 rounded-full w-0" />
          )}
        </div>

        {/* Category Breakdown Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
          <div className="p-2.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 flex items-center justify-between text-xs">
            <span className="text-text-muted flex items-center gap-1.5 truncate">
              <Newspaper className="w-3.5 h-3.5 text-brand-primary shrink-0" />
              <span>AI News</span>
            </span>
            <span className="font-mono font-semibold text-text-primary">
              {categoryBytes('ai-news')}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 flex items-center justify-between text-xs">
            <span className="text-text-muted flex items-center gap-1.5 truncate">
              <FileText className="w-3.5 h-3.5 text-brand-primary shrink-0" />
              <span>AI Knowledge</span>
            </span>
            <span className="font-mono font-semibold text-text-primary">
              {categoryBytes('ai-knowledge')}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 flex items-center justify-between text-xs">
            <span className="text-text-muted flex items-center gap-1.5 truncate">
              <FileCode className="w-3.5 h-3.5 text-brand-primary shrink-0" />
              <span>Prompt Assets</span>
            </span>
            <span className="font-mono font-semibold text-text-primary">
              {categoryBytes('prompt-assets')}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 flex items-center justify-between text-xs">
            <span className="text-text-muted flex items-center gap-1.5 truncate">
              <FolderOpen className="w-3.5 h-3.5 text-brand-primary shrink-0" />
              <span>Uploads</span>
            </span>
            <span className="font-mono font-semibold text-text-primary">
              {categoryBytes('uploads')}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 flex items-center justify-between text-xs">
            <span className="text-text-muted flex items-center gap-1.5 truncate">
              <Archive className="w-3.5 h-3.5 text-brand-primary shrink-0" />
              <span>Backups</span>
            </span>
            <span className="font-mono font-semibold text-text-primary">
              {categoryBytes('backups')}
            </span>
          </div>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`p-6 md:p-8 rounded-2xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center gap-3 cursor-pointer ${
          isDragOver
            ? 'border-brand-primary bg-brand-primary/5 scale-[0.99]'
            : 'border-border-default bg-bg-secondary hover:border-border-hover'
        }`}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <div className="w-12 h-12 rounded-2xl bg-bg-tertiary border border-border-default flex items-center justify-center text-brand-primary shadow-xs">
          <Upload className={`w-6 h-6 ${isUploading ? 'animate-pulse' : ''}`} />
        </div>

        <div className="space-y-1 max-w-md">
          <h3 className="text-sm font-bold text-text-primary font-sans">
            {isUploading
              ? `Uploading to Storage Vault (${uploadProgress || 0}%)...`
              : 'Drag & drop files or click to upload'}
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            Support for PDFs, Markdown, JSON, CSV datasets, code files, PNG/JPEG images, and archives up to 50 MB.
          </p>
        </div>

        {/* Upload Category Selector */}
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="flex items-center gap-2 text-xs pt-2"
        >
          <span className="text-text-muted font-medium">Target Category:</span>
          <select
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value as FileCategory)}
            className="px-3 py-1.5 rounded-lg bg-bg-tertiary border border-border-default text-text-primary text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-primary"
          >
            <option value="ai-news">AI News</option>
            <option value="ai-knowledge">AI Knowledge / Docs</option>
            <option value="prompt-assets">Prompt Attachments</option>
            <option value="uploads">General Uploads</option>
            <option value="generated">Generated Assets</option>
            <option value="backups">Backups</option>
          </select>
        </div>

        {isUploading && uploadProgress !== null && (
          <div className="w-full max-w-xs mt-2">
            <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden border border-border-subtle">
              <div
                className="h-full bg-brand-primary transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          className="hidden"
          accept=".pdf,.txt,.md,.json,.csv,.png,.jpg,.jpeg,.webp,.gif,.zip,.mp4,.tar,.gz,.docx,.xlsx,.pptx,.py,.js,.ts,.tsx,.jsx,.html,.css,.yaml,.yml,.sql,.xml,.svg,.jfif,.bmp"
        />
      </div>

      {/* Category Tabs, Search and Sort Bar */}
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            {CATEGORY_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-brand-primary text-white font-semibold shadow-2xs'
                      : 'bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Input & Sort Selector */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search format (.md, .png, .jpg)..."
                className="w-full min-h-[44px] pl-9 pr-8 py-1.5 rounded-xl bg-bg-secondary border border-border-default text-text-primary text-xs placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search input"
                  className="min-h-[44px] min-w-[32px] absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center text-text-muted hover:text-text-primary cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as StorageSortOption)}
                aria-label="Sort files"
                className="min-h-[44px] px-3 py-1.5 rounded-xl bg-bg-secondary border border-border-default text-text-secondary hover:text-text-primary text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer"
              >
                <option value="relevance">Best Match / Relevance</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name_asc">Name (A–Z)</option>
                <option value="size_desc">Size (Largest)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Format Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 pt-0.5">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>Format:</span>
          </span>
          {FORMAT_PILLS.map((pill) => {
            const isPillActive = selectedFormatFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setSelectedFormatFilter(pill.id)}
                className={`min-h-[44px] px-3 py-1 rounded-xl text-xs font-mono font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isPillActive
                    ? 'bg-text-primary text-bg-primary font-bold shadow-xs'
                    : 'bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>{pill.label}</span>
                {isPillActive && <Check className="w-3 h-3 stroke-[2.5]" />}
              </button>
            );
          })}

          {(searchQuery || selectedFormatFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedFormatFilter('all');
              }}
              className="min-h-[44px] px-2.5 py-1 rounded-xl text-xs text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors flex items-center gap-1 cursor-pointer shrink-0 ml-auto"
            >
              <X className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Files List / Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-bg-secondary border border-border-default" />
          ))}
        </div>
      ) : displayedFiles.length === 0 ? (
        files.length === 0 ? (
          <div className="py-16 text-center rounded-2xl bg-bg-secondary border border-border-default space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-bg-tertiary flex items-center justify-center text-text-muted">
              <PromptStorageIcon className="w-6 h-6 text-text-muted/60" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-text-primary font-display">Your Storage Vault is Clean</h4>
              <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
                PromptHub enforces a strict <strong className="text-text-primary">Zero Auto-Save Policy</strong>. Files and backups are only stored when you explicitly upload them or approve saving them.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Upload File with Approval</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-14 text-center rounded-2xl bg-bg-secondary border border-border-default space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-bg-tertiary flex items-center justify-center text-text-muted">
              <Search className="w-6 h-6 text-text-muted/60" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-text-primary">No matching files found</h4>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                No files matched {searchQuery ? `"${searchQuery}"` : ''} {selectedFormatFilter !== 'all' ? `with format ${selectedFormatFilter.toUpperCase()}` : ''} in this tab.
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedFormatFilter('all');
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-bg-tertiary hover:bg-bg-tertiary/80 text-text-primary text-xs font-semibold inline-flex items-center gap-2 border border-border-default transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Search &amp; Format Filters</span>
            </button>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {displayedFiles.map((file) => {
            const safeName = file?.originalName || file?.sanitizedName || 'Untitled Document';
            const safeCategory = file?.category || 'ai-knowledge';
            const Icon = getFileIcon(file?.mimeType, safeCategory, safeName);
            const formatBadge = getFormatBadge(safeName, file?.mimeType || undefined);
            const isDeleting = deletingFileId === file.id;
            const fileMime = (typeof file?.mimeType === 'string' ? file.mimeType : '').toLowerCase();
            const fileName = safeName.toLowerCase();
            const isImage = fileMime.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif|svg)(\?.*)?$/i.test(fileName);
            const isVideo = fileMime.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi)(\?.*)?$/i.test(fileName);

            return (
              <motion.div
                key={file.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="p-4 rounded-2xl bg-bg-secondary border border-border-default hover:border-border-hover transition-all shadow-xs flex flex-col justify-between gap-3 group"
              >
                <div className="space-y-2.5">
                  {/* Photo Thumbnail */}
                  {isImage && (
                    <StorageFileThumbnail
                      file={file}
                      authToken={authToken}
                      onOpenPreview={handleOpenPreview}
                    />
                  )}

                  {/* Video Preview Card */}
                  {isVideo && (
                    <div 
                      onClick={() => handleOpenPreview(file)}
                      className="relative w-full h-36 rounded-xl overflow-hidden bg-bg-tertiary border border-border-default cursor-pointer flex flex-col items-center justify-center gap-1 group/vid hover:border-brand-primary/40 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center group-hover/vid:scale-110 transition-transform">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                      <span className="text-[10px] font-mono text-text-muted">Click to Play Video</span>
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-mono">
                        VIDEO
                      </span>
                    </div>
                  )}

                  {/* Document / Text / CSV Snippet Preview (Eliminates empty space) */}
                  {!isImage && !isVideo && (
                    <StorageDocumentSnippet
                      file={file}
                      onOpenPreview={handleOpenPreview}
                    />
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div 
                        onClick={() => handleOpenPreview(file)}
                        className="w-9 h-9 rounded-xl bg-bg-tertiary border border-border-default flex items-center justify-center text-brand-primary shrink-0 cursor-pointer hover:bg-brand-primary/10 transition-colors"
                        title="Click to preview file"
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden min-w-0">
                        <h4 
                          onClick={() => handleOpenPreview(file)}
                          className="text-xs font-semibold text-text-primary truncate font-sans cursor-pointer hover:text-brand-primary transition-colors" 
                          title={`Click to preview: ${safeName}`}
                        >
                          {safeName}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-mono flex-wrap">
                          <span>{formatStorageBytes(file?.sizeBytes || 0)}</span>
                          <span>•</span>
                          <span className="capitalize">{safeCategory.replace('-', ' ')}</span>
                          {safeCategory === 'backups' && (
                            <>
                              <span>•</span>
                              <span className="text-amber-500 font-semibold flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-500/10 border border-amber-500/20">
                                <Archive className="w-2.5 h-2.5" />
                                <span>Workspace Backup</span>
                              </span>
                            </>
                          )}
                          {file.metadata?.folder && (
                            <>
                              <span>•</span>
                              <span className="text-brand-primary font-semibold flex items-center gap-0.5 px-1 py-0.2 rounded bg-brand-primary/10 border border-brand-primary/20">
                                <FolderOpen className="w-2.5 h-2.5" />
                                <span className="truncate max-w-[110px]">{file.metadata.folder}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${formatBadge.colorClass}`}>
                        {formatBadge.label}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-medium bg-bg-tertiary text-text-secondary border border-border-subtle">
                        Drive
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-text-muted pt-0.5">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{file?.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'Recent'}</span>
                    </div>

                    {/* Security Badge */}
                    <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                      <Shield className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Private (Only you)</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-border-subtle gap-1.5">
                  <button
                    onClick={() => handleAttachToIDE(file)}
                    title="Attach reference to Prompt IDE"
                    className="min-h-[44px] px-3 py-1.5 rounded-xl bg-bg-tertiary hover:bg-brand-primary hover:text-white text-text-secondary text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Attach to IDE</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenPreview(file)}
                      title="Preview file"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                      aria-label="Preview file"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDownload(file)}
                      title="Download file"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                      aria-label="Download file"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteFile(file.id, safeName)}
                      disabled={isDeleting}
                      title="Delete file"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-text-muted hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
                      aria-label="Delete file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Media & File Preview Modal ────────────────────────────── */}
      {typeof document !== 'undefined' && previewFile && createPortal(
        <AnimatePresence>
          <div
            className="fixed inset-0 z-[700] flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleClosePreview();
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-bg-secondary border border-border-default rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-border-default gap-3 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-text-primary truncate" title={previewFile.originalName || previewFile.sanitizedName || 'Document'}>
                      {previewFile.originalName || previewFile.sanitizedName || 'Document'}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-text-muted font-mono flex-wrap">
                      <span>{formatStorageBytes(previewFile.sizeBytes || 0)}</span>
                      <span>•</span>
                      <span className="uppercase text-[10px] font-semibold px-1.5 py-0.2 rounded bg-bg-tertiary text-text-secondary border border-border-subtle">
                        {previewData?.type || 'file'}
                      </span>
                      <span>•</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">Drive &amp; Vault Synced</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-auto shrink-0 flex-wrap">
                  {/* Copy Text Button */}
                  {previewData?.content && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(previewData.content || '');
                        setHasCopiedContent(true);
                        showToast('Content copied to clipboard', 'info');
                        setTimeout(() => setHasCopiedContent(false), 2000);
                      }}
                      className="min-h-[44px] px-3 py-1.5 rounded-xl bg-bg-tertiary hover:bg-bg-tertiary/80 text-text-primary text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-border-subtle"
                      title="Copy content"
                    >
                      {hasCopiedContent ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{hasCopiedContent ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}

                  {/* Toggle Formatted / Raw for Markdown */}
                  {previewData?.type === 'markdown' && (
                    <button
                      onClick={() => setRawViewMode(prev => !prev)}
                      className="min-h-[44px] px-3 py-1.5 rounded-xl bg-bg-tertiary hover:bg-bg-tertiary/80 text-text-primary text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-border-subtle"
                      title="Toggle Formatted / Raw Markdown"
                    >
                      <FileText className="w-3.5 h-3.5 text-brand-primary" />
                      <span>{rawViewMode ? 'Formatted' : 'Raw'}</span>
                    </button>
                  )}

                  {/* Toggle Table / Raw for CSV */}
                  {previewData?.type === 'csv' && (
                    <button
                      onClick={() => setRawViewMode(prev => !prev)}
                      className="min-h-[44px] px-3 py-1.5 rounded-xl bg-bg-tertiary hover:bg-bg-tertiary/80 text-text-primary text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-border-subtle"
                      title="Toggle Table / Raw View"
                    >
                      <Table className="w-3.5 h-3.5 text-brand-primary" />
                      <span>{rawViewMode ? 'Table' : 'Raw'}</span>
                    </button>
                  )}

                  {/* Open Media in New Tab */}
                  {previewMediaUrl && (
                    <a
                      href={previewMediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] px-3 py-1.5 rounded-xl bg-bg-tertiary hover:bg-bg-tertiary/80 text-text-primary text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-border-subtle"
                      title="Open in new window"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Open</span>
                    </a>
                  )}

                  {/* Download */}
                  <button
                    onClick={() => handleDownload(previewFile)}
                    className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>

                  {/* Close */}
                  <button
                    onClick={handleClosePreview}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                    aria-label="Close preview"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body Content */}
              <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col items-center justify-center bg-bg-primary/50">
                {isPreviewLoading ? (
                  <div className="py-24 text-center text-xs text-text-muted space-y-3">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-brand-primary" />
                    <p className="font-semibold text-sm text-text-primary">Loading file preview...</p>
                    <p className="text-[11px] text-text-muted">Resolving document stream from Google Drive vault</p>
                  </div>
                ) : previewData?.type === 'image' ? (
                  <div className="flex flex-col w-full h-full space-y-3">
                    {/* Zoom Toolbar */}
                    <div className="flex items-center justify-between px-3 py-1 bg-bg-tertiary/80 rounded-xl border border-border-subtle text-xs">
                      <span className="text-[11px] font-mono text-text-muted">
                        Zoom: {Math.round(zoomScale * 100)}%
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setZoomScale(z => Math.max(0.5, z - 0.25))}
                          disabled={zoomScale <= 0.5}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-bg-secondary text-text-secondary disabled:opacity-40 cursor-pointer"
                          title="Zoom out"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setZoomScale(1)}
                          className="min-h-[44px] px-2.5 flex items-center justify-center rounded-lg hover:bg-bg-secondary text-text-secondary text-xs font-mono cursor-pointer"
                          title="Reset zoom"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" />
                          <span>Reset</span>
                        </button>
                        <button
                          onClick={() => setZoomScale(z => Math.min(3, z + 0.25))}
                          disabled={zoomScale >= 3}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-bg-secondary text-text-secondary disabled:opacity-40 cursor-pointer"
                          title="Zoom in"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Image Display */}
                    <div className="flex-1 min-h-[300px] max-h-[66vh] overflow-auto rounded-xl bg-black/15 dark:bg-black/40 flex items-center justify-center p-4 border border-border-default">
                      <img
                        src={previewMediaUrl || ''}
                        alt={previewFile.originalName || previewFile.sanitizedName || 'Image'}
                        style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center' }}
                        className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-md transition-transform duration-150"
                      />
                    </div>
                  </div>
                ) : previewData?.type === 'video' ? (
                  <div className="w-full max-h-[68vh] flex items-center justify-center rounded-xl overflow-hidden bg-black shadow-lg">
                    <video
                      controls
                      autoPlay
                      src={previewMediaUrl || ''}
                      className="w-full max-h-[68vh] object-contain rounded-xl"
                    />
                  </div>
                ) : previewData?.type === 'audio' ? (
                  <div className="w-full py-12 px-6 flex flex-col items-center justify-center bg-bg-tertiary/60 rounded-xl border border-border-default space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shadow-xs">
                      <Music className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <h4 className="text-sm font-bold text-text-primary">{previewFile.originalName || previewFile.sanitizedName || 'Audio'}</h4>
                      <p className="text-xs text-text-muted font-mono mt-0.5">
                        {formatStorageBytes(previewFile.sizeBytes || 0)} • {previewFile.mimeType || 'audio'}
                      </p>
                    </div>
                    <audio
                      controls
                      autoPlay
                      src={previewMediaUrl || ''}
                      className="w-full max-w-md mt-2"
                    />
                  </div>
                ) : previewData?.type === 'pdf' ? (
                  <div className="w-full flex flex-col h-[68vh] space-y-2">
                    <iframe
                      src={`${previewMediaUrl}#toolbar=1`}
                      title={previewFile.originalName || previewFile.sanitizedName || 'PDF Document'}
                      className="w-full h-full rounded-xl border border-border-default bg-white"
                    />
                  </div>
                ) : previewData?.type === 'csv' ? (
                  !rawViewMode && previewData.parsedCsv && previewData.parsedCsv.rows.length > 0 ? (
                    <div className="w-full flex flex-col space-y-2 max-h-[68vh]">
                      <div className="flex items-center justify-between text-xs text-text-muted font-mono px-1">
                        <span>Structured CSV Data Table</span>
                        <span>Showing {previewData.parsedCsv.rows.length} rows • {previewData.parsedCsv.headers.length} columns</span>
                      </div>
                      <div className="w-full overflow-auto border border-border-default rounded-xl bg-bg-secondary custom-scrollbar flex-1 max-h-[62vh]">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-bg-tertiary sticky top-0 z-10 border-b border-border-default">
                            <tr>
                              <th className="px-3 py-2 font-mono text-[10px] text-text-muted border-r border-border-default w-10 text-center">#</th>
                              {previewData.parsedCsv.headers.map((h, i) => (
                                <th key={i} className="px-3 py-2 font-mono font-semibold text-text-primary border-r border-border-subtle whitespace-nowrap">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.parsedCsv.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="border-b border-border-subtle hover:bg-bg-tertiary/40">
                                <td className="px-3 py-1.5 font-mono text-[10px] text-text-muted border-r border-border-default text-center">{rIdx + 1}</td>
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="px-3 py-1.5 font-mono text-text-secondary border-r border-border-subtle whitespace-nowrap">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <pre className="w-full max-h-[65vh] overflow-auto p-4 bg-bg-tertiary border border-border-default rounded-xl font-mono text-xs text-text-primary leading-relaxed whitespace-pre-wrap select-text custom-scrollbar">
                      {previewContent || '(Empty document)'}
                    </pre>
                  )
                ) : previewData?.type === 'markdown' ? (
                  !rawViewMode ? (
                    <div className="w-full max-h-[65vh] overflow-auto p-6 bg-bg-secondary border border-border-default rounded-xl text-text-primary leading-relaxed custom-scrollbar space-y-2 select-text">
                      <div dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(previewContent || '') }} />
                    </div>
                  ) : (
                    <pre className="w-full max-h-[65vh] overflow-auto p-4 bg-bg-tertiary border border-border-default rounded-xl font-mono text-xs text-text-primary leading-relaxed whitespace-pre-wrap select-text custom-scrollbar">
                      {previewContent || '(Empty markdown document)'}
                    </pre>
                  )
                ) : previewData?.type === 'json' ? (
                  <div className="w-full space-y-2">
                    <div className="flex items-center justify-between text-xs text-text-muted font-mono px-1">
                      <span>Formatted JSON Document</span>
                      <span>{typeof previewContent === 'string' ? `${previewContent.split('\n').length} lines` : ''}</span>
                    </div>
                    <pre className="w-full max-h-[62vh] overflow-auto p-4 bg-bg-tertiary border border-border-default rounded-xl font-mono text-xs text-text-primary leading-relaxed whitespace-pre select-text custom-scrollbar">
                      {previewContent || '{}'}
                    </pre>
                  </div>
                ) : (previewData?.type === 'code' || previewData?.type === 'text') && previewContent !== null ? (
                  <pre className="w-full max-h-[65vh] overflow-auto p-4 bg-bg-tertiary border border-border-default rounded-xl font-mono text-xs text-text-primary leading-relaxed whitespace-pre select-text custom-scrollbar">
                    {previewContent || '(Empty document)'}
                  </pre>
                ) : previewContent !== null ? (
                  <pre className="w-full max-h-[65vh] overflow-auto p-4 bg-bg-tertiary border border-border-default rounded-xl font-mono text-xs text-text-primary leading-relaxed whitespace-pre-wrap select-text custom-scrollbar">
                    {previewContent}
                  </pre>
                ) : (
                  <div className="py-16 text-center text-xs text-text-muted space-y-4 max-w-sm mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-bg-tertiary border border-border-default text-text-muted flex items-center justify-center mx-auto shadow-xs">
                      <Archive className="w-7 h-7" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="font-semibold text-sm text-text-primary">{previewFile.originalName || previewFile.sanitizedName || 'Binary Asset'}</p>
                      <p className="text-[11px] text-text-secondary">
                        Binary asset ({formatStorageBytes(previewFile.sizeBytes || 0)}). Download to view or unpack in your local environment.
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownload(previewFile)}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download File</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default StorageView;
