import { modelCatalogService } from '../services/modelCatalogService';

/**
 * Cleanly format model ID to human-readable display name.
 * E.g. 'cohere/north-mini-code:free' -> 'North Mini Code (Free)'
 * E.g. 'openai/gpt-4o' -> 'GPT-4o'
 */
export function formatModelDisplayName(modelId: string): string {
  if (!modelId) return 'GPT-4o';

  // Check model catalog for official display name
  const catalog = modelCatalogService.getCachedCatalog();
  const found = catalog.find((m) => m.id === modelId || m.canonicalId === modelId);
  if (found?.name) {
    return found.name;
  }

  // Fallback heuristic parsing
  let base = modelId;
  if (base.includes('/')) {
    base = base.split('/')[1];
  }
  const isFree = base.endsWith(':free');
  base = base.replace(/:free$/, '');

  const words = base.split(/[-_.]/).map((w) => {
    if (/^\d+/.test(w)) return w;
    if (w.length <= 3 && !/^[a-z]+$/i.test(w)) return w.toUpperCase();
    return w.charAt(0).toUpperCase() + w.slice(1);
  });

  const formatted = words.join(' ');
  return isFree ? `${formatted} (Free)` : formatted;
}

/**
 * Short model name without suffixes for compact pills / buttons.
 */
export function formatModelShortName(modelId: string, maxLength = 18): string {
  if (!modelId) return 'GPT-4o';
  const full = formatModelDisplayName(modelId).replace(/\s*\(Free\)$/i, '');
  if (full.length <= maxLength) return full;
  return `${full.slice(0, maxLength - 1)}…`;
}

/**
 * Check if the model is a free tier model.
 */
export function isFreeModel(modelId: string): boolean {
  if (!modelId) return false;
  if (modelId.endsWith(':free') || modelId === 'openrouter/free') return true;
  const catalog = modelCatalogService.getCachedCatalog();
  const found = catalog.find((m) => m.id === modelId || m.canonicalId === modelId);
  return Boolean(found?.isFree || (found?.pricing?.prompt === 0 && found?.pricing?.completion === 0));
}

/**
 * Detect client operating system modifier key ('⌘' for macOS / iOS, 'Ctrl' for Windows / Linux).
 */
export function getPlatformModifierKey(): string {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'Ctrl';
  try {
    const nav = navigator as any;
    const platform = (nav.userAgentData?.platform || nav.platform || '').toLowerCase();
    const userAgent = (navigator.userAgent || '').toLowerCase();
    const isMac = platform.includes('mac') || userAgent.includes('mac') || platform.includes('iphone') || platform.includes('ipad');
    return isMac ? '⌘' : 'Ctrl';
  } catch {
    return 'Ctrl';
  }
}

/**
 * Historical free models that OpenRouter retired or removed from upstream routing.
 * Stale user drafts or localStorage holding these must be gracefully sanitized to 'openrouter/free'.
 */
export const RETIRED_FREE_MODELS = new Set([
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'meta-llama/llama-3.2-1b-instruct:free',
  'meta-llama/llama-3.1-70b-instruct:free',
  'qwen/qwen-2.5-coder-32b-instruct:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'deepseek/deepseek-r1:free',
  'deepseek/deepseek-chat:free',
  'mistralai/mistral-7b-instruct:free',
  'gryphe/mythomax-l2-13b:free',
  'liquid/lfm-40b:free',
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-2.0-flash-thinking-exp:free',
]);

/**
 * Returns true if a model ID corresponds to a retired/unavailable free model.
 */
export function isRetiredOrUnavailableFreeModel(modelId?: string | null): boolean {
  if (!modelId) return false;
  const normalized = modelId.trim().toLowerCase();
  return RETIRED_FREE_MODELS.has(normalized);
}
