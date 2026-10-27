/**
 * Image URL Resolver & Normalizer for PromptHub
 * Handles unwrapping Google Images search URLs, shortlinks, Bing, Imgur,
 * hotlink protection bypass, safe protocol validation, and graceful fallbacks.
 */

import { securityUtils } from './security';

export interface ResolvedImageResult {
  url: string;
  wasUnwrapped: boolean;
  sourceType: 'direct' | 'google_images' | 'google_share' | 'bing' | 'imgur' | 'gyazo' | 'redirect';
  isValid: boolean;
  error?: string;
}

/**
 * Common shortlink or redirect domains that require async resolution
 */
const SHORTLINK_DOMAINS = [
  'share.google',
  'images.app.goo.gl',
  'goo.gl',
  'bit.ly',
  't.co',
  'tinyurl.com',
  'is.gd',
  'buff.ly',
  'ow.ly',
];

/**
 * Synchronously extracts direct image URL from wrapped search engine links or known hosts.
 * Handles:
 * - Google Images search: https://www.google.com/imgres?imgurl=...
 * - Google redirect: https://www.google.com/url?q=... or url=...
 * - Bing Images search: https://www.bing.com/images/search?...&mediaurl=...
 * - DuckDuckGo Images: https://duckduckgo.com/iu/?u=...
 * - Yahoo Images: https://images.search.yahoo.com/search/images?...&imgurl=...
 * - Imgur page links: https://imgur.com/{id} -> https://i.imgur.com/{id}.png
 * - Gyazo links: https://gyazo.com/{id} -> https://i.gyazo.com/{id}.png
 * - Protocol upgrades: http:// -> https://
 * - Strips surrounding quotes, whitespace, angle brackets
 */
export function extractDirectImageUrl(rawInput: string | null | undefined): string {
  if (!rawInput || typeof rawInput !== 'string') return '';

  let cleaned = rawInput.trim();

  // Strip wrapping quotes or brackets: "...", '...', <...>
  cleaned = cleaned.replace(/^["'<([\]]+|[>"')\]]+$/g, '').trim();

  if (!cleaned) return '';

  // If the whole string was URL-encoded (e.g. starts with http%3A%2F%2F or https%3A%2F%2F)
  if (/^https?%3A%2F%2F/i.test(cleaned)) {
    try {
      cleaned = decodeURIComponent(cleaned);
    } catch {
      // Keep cleaned as is
    }
  }

  // Handle protocol-relative URLs: //example.com/image.png -> https://example.com/image.png
  if (cleaned.startsWith('//')) {
    cleaned = `https:${cleaned}`;
  }

  // Auto-upgrade insecure http to https (prevents mixed-content blocking on prompthub.cloud)
  if (cleaned.startsWith('http://')) {
    // Only upgrade if not localhost
    if (!cleaned.startsWith('http://localhost') && !cleaned.startsWith('http://127.0.0.1')) {
      cleaned = `https://${cleaned.slice(7)}`;
    }
  }

  // If it's a safe base64 data URI, blob URL, or safe internal relative path (/api/storage-file?id=...)
  if (cleaned.startsWith('data:') || cleaned.startsWith('blob:') || (cleaned.startsWith('/') && !cleaned.startsWith('//'))) {
    return securityUtils.validateImageUrl(cleaned) ? cleaned : '';
  }

  try {
    const parsed = new URL(cleaned);

    // 1. Google Images search viewer: google.*/imgres?imgurl=...
    if (parsed.hostname.includes('google.') && parsed.pathname.includes('/imgres')) {
      const imgurl = parsed.searchParams.get('imgurl');
      if (imgurl) {
        return extractDirectImageUrl(decodeURIComponent(imgurl));
      }
      const imgrefurl = parsed.searchParams.get('imgrefurl');
      if (imgrefurl && isDirectImageFile(imgrefurl)) {
        return extractDirectImageUrl(decodeURIComponent(imgrefurl));
      }
    }

    // 2. Google Search redirect: google.*/url?q=... or url=...
    if (parsed.hostname.includes('google.') && parsed.pathname.includes('/url')) {
      const target = parsed.searchParams.get('q') || parsed.searchParams.get('url');
      if (target) {
        return extractDirectImageUrl(decodeURIComponent(target));
      }
    }

    // 3. Bing Images: bing.*/images/search?...&mediaurl=... or imgurl=...
    if (parsed.hostname.includes('bing.') && (parsed.pathname.includes('/images') || parsed.searchParams.has('mediaurl') || parsed.searchParams.has('imgurl'))) {
      const mediaurl = parsed.searchParams.get('mediaurl') || parsed.searchParams.get('imgurl');
      if (mediaurl) {
        return extractDirectImageUrl(decodeURIComponent(mediaurl));
      }
    }

    // 4. DuckDuckGo: duckduckgo.*/iu/?u=...
    if (parsed.hostname.includes('duckduckgo.') && parsed.pathname.includes('/iu')) {
      const u = parsed.searchParams.get('u');
      if (u) {
        return extractDirectImageUrl(decodeURIComponent(u));
      }
    }

    // 5. Yahoo Images: search.yahoo.*/search/images?...&imgurl=...
    if (parsed.hostname.includes('yahoo.') && parsed.searchParams.has('imgurl')) {
      const imgurl = parsed.searchParams.get('imgurl');
      if (imgurl) {
        return extractDirectImageUrl(decodeURIComponent(imgurl));
      }
    }

    // 6. Imgur direct image transformation: imgur.com/{id} -> i.imgur.com/{id}.png
    if ((parsed.hostname === 'imgur.com' || parsed.hostname === 'm.imgur.com') && !parsed.pathname.startsWith('/a/') && !parsed.pathname.startsWith('/gallery/')) {
      const match = parsed.pathname.match(/^\/([a-zA-Z0-9]{5,8})$/);
      if (match) {
        return `https://i.imgur.com/${match[1]}.png`;
      }
    }

    // 7. Gyazo direct image transformation: gyazo.com/{id} -> i.gyazo.com/{id}.png
    if (parsed.hostname === 'gyazo.com') {
      const match = parsed.pathname.match(/^\/([a-zA-Z0-9]{32})$/);
      if (match) {
        return `https://i.gyazo.com/${match[1]}.png`;
      }
    }

    // 8. Wikipedia / Wikimedia special handling: if thumbnail URL, can be used directly
    // Ensure protocol is https
    if (['http:', 'https:'].includes(parsed.protocol)) {
      return parsed.toString();
    }

    return '';
  } catch {
    // If URL parsing fails, return empty or original if valid
    return '';
  }
}

/**
 * Checks if a string or pathname ends with an image extension or has image query params
 */
export function isDirectImageFile(url: string): boolean {
  if (!url) return false;
  return /\.(png|jpe?g|webp|gif|bmp|avif)(\?.*)?$/i.test(url) ||
    /format=(png|jpe?g|webp|gif|avif)/i.test(url) ||
    /auto=format/i.test(url);
}

/**
 * Checks if a URL is likely a shortlink or search redirect that can be resolved via backend
 */
export function isPotentialImageRedirect(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url.trim());
    return SHORTLINK_DOMAINS.some(domain => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)) ||
      (parsed.hostname.includes('google.') && (parsed.pathname.includes('/imgres') || parsed.pathname.includes('/url')));
  } catch {
    return false;
  }
}

/**
 * Asynchronously resolves shortlinks (like share.google or images.app.goo.gl)
 * via PromptHub's /api/resolve-image endpoint, with instant client-side fallback.
 */
export async function resolveImageUrlAsync(rawInput: string): Promise<{ resolvedUrl: string; wasUnwrapped: boolean; error?: string }> {
  const syncUnwrapped = extractDirectImageUrl(rawInput);
  
  // If sync unwrapping changed the URL from the original raw input, we already succeeded!
  if (syncUnwrapped && syncUnwrapped !== rawInput.trim() && !isPotentialImageRedirect(syncUnwrapped)) {
    return { resolvedUrl: syncUnwrapped, wasUnwrapped: true };
  }

  // If it's a shortlink that needs server-side redirect following:
  if (isPotentialImageRedirect(rawInput)) {
    try {
      const res = await fetch(`/api/resolve-image?url=${encodeURIComponent(rawInput.trim())}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.resolvedUrl) {
          const finalCleaned = extractDirectImageUrl(data.resolvedUrl);
          return { resolvedUrl: finalCleaned || data.resolvedUrl, wasUnwrapped: true };
        }
      }
    } catch (err: any) {
      console.warn('[imageUrlResolver] Server resolution failed, using sync fallback:', err?.message);
    }
  }

  return { resolvedUrl: syncUnwrapped || rawInput.trim(), wasUnwrapped: Boolean(syncUnwrapped && syncUnwrapped !== rawInput.trim()) };
}

/**
 * Tests if an image URL actually loads in the browser
 */
export function testImageLoad(url: string, timeoutMs = 7000): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url) {
      resolve(false);
      return;
    }

    const img = new Image();
    let isSettled = false;

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        img.src = '';
        resolve(false);
      }
    }, timeoutMs);

    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        resolve(true);
      }
    };

    img.onerror = () => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        resolve(false);
      }
    };

    img.src = url;
  });
}

export interface PromptDisplayImages {
  inputImageUrl?: string;
  outputImageUrl?: string;
  coverUrl?: string;
  primaryImageUrl?: string;
  hasImages: boolean;
  hasBeforeAfter: boolean;
}

/**
 * Resolves and normalizes all display images for a prompt.
 * Seamlessly checks camelCase and snake_case properties, image thumbnails,
 * and embedded markdown images with safe direct-URL extraction.
 */
export function getPromptDisplayImages(prompt: any): PromptDisplayImages {
  if (!prompt || typeof prompt !== 'object') {
    return { hasImages: false, hasBeforeAfter: false };
  }

  // 1. Direct fields: input image
  let inputImg: string | undefined =
    (typeof prompt.inputImageUrl === 'string' && prompt.inputImageUrl.trim()) ||
    (typeof prompt.input_image_url === 'string' && prompt.input_image_url.trim()) ||
    undefined;

  // 2. Direct fields: output image
  let outputImg: string | undefined =
    (typeof prompt.outputImageUrl === 'string' && prompt.outputImageUrl.trim()) ||
    (typeof prompt.output_image_url === 'string' && prompt.output_image_url.trim()) ||
    undefined;

  // 3. Direct fields: cover image
  let coverImg: string | undefined =
    (typeof prompt.coverUrl === 'string' && prompt.coverUrl.trim()) ||
    (typeof prompt.cover_url === 'string' && prompt.cover_url.trim()) ||
    undefined;

  // 4. Thumbnail if it represents an actual URL (not a theme slug like 'editorial-forest')
  if (!coverImg && typeof prompt.thumbnail === 'string') {
    const thumb = prompt.thumbnail.trim();
    if (thumb.startsWith('http://') || thumb.startsWith('https://') || thumb.startsWith('/') || thumb.startsWith('data:')) {
      coverImg = thumb;
    }
  }

  // 5. Check rawContent / content markdown for embedded image: ![alt](url)
  if (!inputImg && !outputImg && !coverImg) {
    const text = prompt.rawContent || prompt.content || '';
    if (typeof text === 'string' && text.includes('![')) {
      const match = text.match(/!\[.*?\]\((https?:\/\/[^\s)]+|\/[^\s)]+|data:image\/[^\s)]+)\)/);
      if (match && match[1]) {
        coverImg = match[1];
      }
    }
  }

  // 6. Direct image unwrapping
  if (inputImg) inputImg = extractDirectImageUrl(inputImg) || inputImg;
  if (outputImg) outputImg = extractDirectImageUrl(outputImg) || outputImg;
  if (coverImg) coverImg = extractDirectImageUrl(coverImg) || coverImg;

  const hasBeforeAfter = Boolean(inputImg && outputImg);
  const primaryImageUrl = outputImg || coverImg || inputImg;
  const hasImages = Boolean(inputImg || outputImg || coverImg);

  return {
    inputImageUrl: inputImg,
    outputImageUrl: outputImg,
    coverUrl: coverImg,
    primaryImageUrl,
    hasImages,
    hasBeforeAfter,
  };
}
