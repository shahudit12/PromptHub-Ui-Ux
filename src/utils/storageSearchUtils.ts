import type { StorageFile, FileCategory } from '../db/schema';

export type StorageSortOption = 'relevance' | 'newest' | 'oldest' | 'name_asc' | 'size_desc';

export interface FormatBadgeInfo {
  label: string;
  colorClass: string;
}

export type StorageFormatFilter = 'all' | 'md' | 'png' | 'jpg' | 'pdf' | 'json' | 'csv' | 'code' | 'archives';

/**
 * Common format definitions with extensions, MIME types, and aliases.
 */
const FORMAT_DEFINITIONS: Record<string, {
  extensions: string[];
  mimeTypes: string[];
  aliases: string[];
  badge: FormatBadgeInfo;
}> = {
  md: {
    extensions: ['md', 'markdown', 'mdown', 'mkd'],
    mimeTypes: ['text/markdown', 'text/x-markdown'],
    aliases: ['markdown', '.md', 'md'],
    badge: {
      label: 'MD',
      colorClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    },
  },
  png: {
    extensions: ['png'],
    mimeTypes: ['image/png'],
    aliases: ['png', '.png', 'image/png'],
    badge: {
      label: 'PNG',
      colorClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
    },
  },
  jpg: {
    extensions: ['jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp'],
    mimeTypes: ['image/jpeg', 'image/jpg'],
    aliases: ['jpg', '.jpg', 'jpeg', '.jpeg', 'image/jpeg'],
    badge: {
      label: 'JPG',
      colorClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
    },
  },
  pdf: {
    extensions: ['pdf'],
    mimeTypes: ['application/pdf'],
    aliases: ['pdf', '.pdf', 'document'],
    badge: {
      label: 'PDF',
      colorClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
    },
  },
  json: {
    extensions: ['json', 'jsonc', 'json5'],
    mimeTypes: ['application/json', 'text/json'],
    aliases: ['json', '.json'],
    badge: {
      label: 'JSON',
      colorClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    },
  },
  csv: {
    extensions: ['csv', 'tsv'],
    mimeTypes: ['text/csv', 'text/tab-separated-values'],
    aliases: ['csv', '.csv', 'tsv', 'dataset', 'spreadsheet'],
    badge: {
      label: 'CSV',
      colorClass: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30',
    },
  },
  code: {
    extensions: ['ts', 'tsx', 'js', 'jsx', 'py', 'html', 'css', 'sql', 'sh', 'yaml', 'yml', 'xml', 'rs', 'go', 'java'],
    mimeTypes: ['text/javascript', 'application/typescript', 'text/x-python', 'text/css', 'text/html'],
    aliases: ['code', 'script', 'ts', 'py', 'js'],
    badge: {
      label: 'CODE',
      colorClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
    },
  },
  archives: {
    extensions: ['zip', 'tar', 'gz', '7z', 'rar', 'bz2'],
    mimeTypes: ['application/zip', 'application/x-tar', 'application/gzip'],
    aliases: ['zip', '.zip', 'archive', 'tar', 'gz'],
    badge: {
      label: 'ZIP',
      colorClass: 'bg-amber-600/10 text-amber-700 dark:text-amber-300 border-amber-600/30',
    },
  },
};

/**
 * Extracts the file extension (lowercase without dot) from a filename.
 */
export function getFileExtension(filename: string): string {
  if (!filename) return '';
  const parts = filename.trim().split('.');
  if (parts.length <= 1) return '';
  return parts[parts.length - 1].toLowerCase();
}

/**
 * Resolves the visual format badge for a file.
 */
export function getFormatBadge(filename: string, mimeType?: string): FormatBadgeInfo {
  const ext = getFileExtension(filename);
  const mime = (mimeType || '').toLowerCase();

  for (const [, def] of Object.entries(FORMAT_DEFINITIONS)) {
    if (def.extensions.includes(ext) || (mime && def.mimeTypes.some(m => mime.includes(m)))) {
      return def.badge;
    }
  }

  // Fallbacks
  if (mime.startsWith('image/')) {
    return {
      label: ext ? ext.toUpperCase() : 'IMG',
      colorClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
    };
  }

  if (mime.startsWith('video/')) {
    return {
      label: ext ? ext.toUpperCase() : 'VID',
      colorClass: 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30',
    };
  }

  return {
    label: ext ? ext.toUpperCase() : 'FILE',
    colorClass: 'bg-bg-tertiary text-text-secondary border-border-default/60',
  };
}

/**
 * Checks if a file matches a specific format filter.
 */
export function matchesFormatFilter(file: StorageFile, filter: StorageFormatFilter): boolean {
  if (!filter || filter === 'all') return true;

  const ext = getFileExtension(file?.originalName || '');
  const mime = (file?.mimeType || '').toLowerCase();

  const def = FORMAT_DEFINITIONS[filter];
  if (def) {
    return def.extensions.includes(ext) || def.mimeTypes.some(m => mime.includes(m));
  }

  return true;
}

/**
 * Calculates a search relevance score for a file against a search query.
 * Higher score = higher ranking.
 * When the query is an extension or format (e.g. ".md", "md", ".png", "png", ".jpg", "jpg"),
 * files with matching extension/MIME receive a massive relevance boost (1000+ points).
 */
export function computeSearchRelevance(file: StorageFile, query: string): number {
  const q = (query || '').trim().toLowerCase();
  if (!q) return 0;

  const fileName = (file.originalName || '').toLowerCase();
  const ext = getFileExtension(fileName);
  const mime = (file.mimeType || '').toLowerCase();
  const category = (file.category || '').toLowerCase();

  let score = 0;

  // 1. Format / Extension Priority Check
  const isDotQuery = q.startsWith('.');
  const extCandidate = isDotQuery ? q.slice(1) : q;

  // Check against format definitions
  for (const [key, def] of Object.entries(FORMAT_DEFINITIONS)) {
    const isTargetFormat = 
      q === `.${key}` || 
      q === key || 
      def.aliases.includes(q) || 
      def.extensions.includes(extCandidate);

    if (isTargetFormat) {
      if (def.extensions.includes(ext)) {
        score += 1500; // Exact extension match takes absolute priority
      } else if (mime && def.mimeTypes.some(m => mime.includes(m))) {
        score += 1200; // Matching MIME type for the format
      }
    }
  }

  // Check arbitrary dot extension: e.g. ".py", ".sql", ".txt"
  if (isDotQuery && extCandidate) {
    if (ext === extCandidate) {
      score += 1500;
    } else if (fileName.endsWith(q)) {
      score += 1400;
    }
  } else if (!isDotQuery && ext && ext === q) {
    // Exact extension without dot, e.g. "md", "png", "pdf"
    score += 1300;
  }

  // 2. Compound query handling (e.g. "agent .md" or "architecture .png")
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    let tokenMatches = 0;
    let formatMatched = false;

    for (const token of tokens) {
      if (token.startsWith('.')) {
        const tokenExt = token.slice(1);
        if (ext === tokenExt || fileName.endsWith(token)) {
          formatMatched = true;
          tokenMatches++;
        }
      } else if (fileName.includes(token)) {
        tokenMatches++;
      }
    }

    if (formatMatched && tokenMatches === tokens.length) {
      score += 1800; // Both specific format and keywords matched!
    } else if (tokenMatches === tokens.length) {
      score += 800;
    }
  }

  // 3. Exact Filename Match
  if (fileName === q) {
    score += 1000;
  }

  // 4. Prefix Match (Filename begins with query)
  if (fileName.startsWith(q)) {
    score += 600;
  }

  // 5. Base Name Starts With Query (e.g. "PromptHub" for "PromptHub_Architecture.png")
  const baseName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
  if (baseName.startsWith(q)) {
    score += 500;
  }

  // 6. Word-boundary or token match (e.g. "prompt_notes.md" matches "notes")
  const words = fileName.split(/[\s_\-.]+/).filter(Boolean);
  if (words.includes(q)) {
    score += 400;
  }

  // 7. Substring Match in Filename
  if (fileName.includes(q)) {
    score += 200;
  }

  // 8. Category / MIME / Metadata Match
  if (category.includes(q)) {
    score += 100;
  }
  if (mime.includes(q)) {
    score += 100;
  }

  // 9. Recency tie-breaker: Newest files get slight boost within the same relevance tier
  try {
    const time = new Date(file.createdAt).getTime();
    if (!Number.isNaN(time)) {
      // Fraction up to 0.999 based on epoch
      const recencyBonus = (time / 10000000000000);
      score += Math.min(0.999, Math.max(0, recencyBonus));
    }
  } catch {}

  return score;
}

/**
 * Filter, sort, and rank storage files with support for category tabs,
 * format filter pills, search relevance, and secondary sorting options.
 */
export function filterAndRankFiles(
  files: StorageFile[],
  options: {
    search?: string;
    category?: FileCategory | 'all';
    formatFilter?: StorageFormatFilter;
    sortBy?: StorageSortOption;
  }
): StorageFile[] {
  const { search = '', category = 'all', formatFilter = 'all', sortBy = 'relevance' } = options;
  const trimmedSearch = search.trim();

  // 1. Filter by category tab
  let filtered = files.filter(f => {
    if (category && category !== 'all' && f.category !== category) {
      return false;
    }
    return true;
  });

  // 2. Filter by format pill
  if (formatFilter && formatFilter !== 'all') {
    filtered = filtered.filter(f => matchesFormatFilter(f, formatFilter));
  }

  // 3. Filter by search query if provided
  if (trimmedSearch) {
    filtered = filtered.filter(f => {
      const score = computeSearchRelevance(f, trimmedSearch);
      return score > 0;
    });
  }

  // 4. Sort files
  return [...filtered].sort((a, b) => {
    // If search or format filter is active and sortBy is 'relevance', prioritize search score
    if (sortBy === 'relevance' && trimmedSearch) {
      const scoreA = computeSearchRelevance(a, trimmedSearch);
      const scoreB = computeSearchRelevance(b, trimmedSearch);
      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Highest relevance score first
      }
    }

    switch (sortBy) {
      case 'oldest':
        return new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime();
      case 'name_asc':
        return (a?.originalName || '').localeCompare(b?.originalName || '', undefined, { sensitivity: 'base' });
      case 'size_desc':
        return (Number(b?.sizeBytes) || 0) - (Number(a?.sizeBytes) || 0);
      case 'newest':
      case 'relevance':
      default:
        // Default to newest first
        return new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime();
    }
  });
}
