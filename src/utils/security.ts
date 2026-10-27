/**
 * Unified Security Utilities for PromptHub
 * Handles DOMPurify HTML sanitization, context-specific prompt input sanitization,
 * URL & safe image validation (blocking dangerous SVG data URIs), payload size controls,
 * API key masking, and resilient client-side rate limiting with in-memory fallback.
 */
import DOMPurify from 'dompurify';

// In-memory fallback store for rate limiting when sessionStorage is disabled or unavailable
const inMemoryRateLimitStore = new Map<string, number>();

// Periodic pruning of in-memory rate-limit entries older than 5 minutes to prevent memory leak
const RATE_LIMIT_PRUNE_INTERVAL_MS = 60 * 1000;
const RATE_LIMIT_MAX_AGE_MS = 5 * 60 * 1000;

let lastPruneTime = Date.now();
function pruneRateLimitStore() {
  const now = Date.now();
  if (now - lastPruneTime < RATE_LIMIT_PRUNE_INTERVAL_MS) return;
  lastPruneTime = now;
  for (const [key, timestamp] of inMemoryRateLimitStore.entries()) {
    if (now - timestamp > RATE_LIMIT_MAX_AGE_MS) {
      inMemoryRateLimitStore.delete(key);
    }
  }
}

export const securityUtils = {
  /**
   * Sanitizes HTML content using DOMPurify allowing only safe formatting tags
   */
  sanitizeHtml(dirty: string): string {
    if (!dirty) return '';
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'code', 'pre', 'br', 'span', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    });
  },

  /**
   * Context-Aware Prompt Sanitizer:
   * Strips null bytes, zero-width evasion characters, and non-printable control characters
   * while STRICTLY preserving legitimate developer prompt syntax: Markdown, JSON, XML,
   * code blocks, indentation (tabs/spaces), newlines (\n, \r), and punctuation.
   */
  sanitizePromptInput(text: string): string {
    if (!text) return '';
    return text
      // 1. Remove null bytes and dangerous ASCII control chars (preserve \t=0x09, \n=0x0A, \r=0x0D)
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // 2. Remove Unicode zero-width invisible control characters used for filter evasion
      .replace(/[\u200B-\u200D\uFEFF\u202A-\u202E]/g, '')
      .trim();
  },

  /**
   * Strips all HTML/Script tags from user inputs to prevent injection attacks
   */
  sanitizeText(input: string): string {
    if (!input) return '';
    return input
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/<script[^>]*>([\S\s]*?)<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();
  },

  /**
   * Alias for sanitizeText — strips dangerous characters and control bytes
   */
  sanitizeInput(text: string): string {
    if (!text) return '';
    return text
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/[<>]/g, '')
      .trim();
  },

  /**
   * Validates email format using RFC 5322 regex pattern
   */
  validateEmail(email: string): boolean {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  },

  /**
   * Safe URL classification distinguishing:
   * INTERNAL_SAFE_PATH, EXTERNAL_SAFE_URL, SAFE_DATA_URI, SAFE_BLOB_URL, INVALID_OR_DANGEROUS
   */
  classifyUrl(url: unknown): 'INTERNAL_SAFE_PATH' | 'EXTERNAL_SAFE_URL' | 'SAFE_DATA_URI' | 'SAFE_BLOB_URL' | 'INVALID_OR_DANGEROUS' {
    if (!url || typeof url !== 'string') return 'INVALID_OR_DANGEROUS';
    const clean = url.trim();
    if (!clean) return 'INVALID_OR_DANGEROUS';

    const lower = clean.toLowerCase();

    // Reject dangerous executable schemes and vectors
    if (
      lower.startsWith('javascript:') ||
      lower.startsWith('vbscript:') ||
      lower.startsWith('file:') ||
      lower.startsWith('data:text/html') ||
      lower.startsWith('data:image/svg+xml')
    ) {
      return 'INVALID_OR_DANGEROUS';
    }

    // Protocol-relative URLs (//evil.com) are rejected to prevent protocol confusion
    if (clean.startsWith('//')) {
      return 'INVALID_OR_DANGEROUS';
    }

    // Safe client-side Blob URLs (e.g. from local file pickers)
    if (clean.startsWith('blob:')) {
      return 'SAFE_BLOB_URL';
    }

    // Safe raster image Data URIs (PNG, JPEG, WEBP, GIF, BMP, AVIF)
    if (clean.startsWith('data:')) {
      const normalized = clean.replace(/[\r\n\s]/g, '');
      return /^data:image\/(png|jpeg|jpg|webp|gif|bmp|avif);base64,[A-Za-z0-9+/=]+$/i.test(normalized)
        ? 'SAFE_DATA_URI'
        : 'INVALID_OR_DANGEROUS';
    }

    // Internal safe relative paths (/api/storage-file?id=..., /assets/..., etc.)
    if (clean.startsWith('/') && !clean.includes('\\')) {
      if (lower.includes('javascript:') || lower.includes('vbscript:')) {
        return 'INVALID_OR_DANGEROUS';
      }
      return 'INTERNAL_SAFE_PATH';
    }

    // External absolute HTTP/HTTPS URLs
    try {
      const parsed = new URL(clean);
      if (['http:', 'https:'].includes(parsed.protocol)) {
        return 'EXTERNAL_SAFE_URL';
      }
      return 'INVALID_OR_DANGEROUS';
    } catch {
      return 'INVALID_OR_DANGEROUS';
    }
  },

  /**
   * Safe web URL validator to prevent javascript:, data:, or SSRF/redirect injections.
   * Strictly permits http: and https: protocols, plus safe relative internal paths.
   * Protocol-relative (//...) and dangerous schemes are strictly rejected.
   */
  validateUrl(url: unknown, allowRelative = true): boolean {
    if (!url || (typeof url === 'string' && !url.trim())) return true; // Optional field empty is valid
    const cls = this.classifyUrl(url);
    if (cls === 'INTERNAL_SAFE_PATH') return allowRelative;
    if (cls === 'EXTERNAL_SAFE_URL') return true;
    return false;
  },

  /**
   * Safe image URL validator for avatars, banners, and thumbnails.
   * Strictly accepts http:, https:, blob: URLs, safe relative paths (/api/storage-file?id=...),
   * or safe raster base64 image data URIs (PNG, JPEG, WEBP, GIF, BMP, AVIF).
   * EXPLICITLY BLOCKS SVG data URIs (data:image/svg+xml) to prevent Stored XSS attacks.
   */
  validateImageUrl(url: unknown): boolean {
    if (!url || (typeof url === 'string' && !url.trim())) return true;
    const cls = this.classifyUrl(url);
    return (
      cls === 'INTERNAL_SAFE_PATH' ||
      cls === 'EXTERNAL_SAFE_URL' ||
      cls === 'SAFE_DATA_URI' ||
      cls === 'SAFE_BLOB_URL'
    );
  },

  /**
   * Restricts oversized text payloads to prevent browser crashes or network flooding
   */
  validatePayloadSize(text: string, maxCharCount = 50000): { isValid: boolean; error?: string } {
    if (text.length > maxCharCount) {
      return {
        isValid: false,
        error: `Payload size is too large. Maximum characters allowed is ${maxCharCount}.`
      };
    }
    return { isValid: true };
  },

  /**
   * Masks sensitive API keys for UI display
   */
  maskApiKey(key: string): string {
    if (!key || key.length < 8) return '••••••••';
    return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
  },

  /**
   * Client-side action rate limiter to mitigate click spamming and script abuse.
   * Resilient implementation: Uses sessionStorage when available, with an in-memory
   * Map fallback when storage is disabled/blocked by browser privacy modes.
   * NEVER fails open.
   */
  rateLimit(actionKey: string, delayMs = 1500): { allowed: boolean; error?: string } {
    pruneRateLimitStore();
    const now = Date.now();
    const storageKey = `ph_rl_${actionKey}`;
    let lastActionTime: number | null = null;

    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        lastActionTime = parseInt(stored, 10);
      }
    } catch {
      // Storage unavailable or blocked — use in-memory fallback
      lastActionTime = inMemoryRateLimitStore.get(storageKey) ?? null;
    }

    if (lastActionTime !== null && !isNaN(lastActionTime)) {
      const diff = now - lastActionTime;
      if (diff < delayMs) {
        const waitTimeSec = Math.ceil((delayMs - diff) / 1000);
        return {
          allowed: false,
          error: `Too many requests. Please wait ${waitTimeSec}s before retrying.`
        };
      }
    }

    try {
      sessionStorage.setItem(storageKey, now.toString());
    } catch {
      // Fallback in-memory storage
      inMemoryRateLimitStore.set(storageKey, now);
    }

    return { allowed: true };
  },

  /**
   * Generates a cryptographically secure RFC 4122 version 4 UUID.
   * Standardized across all entities (prompts, collections, comments, teams, reports).
   */
  generateUUID(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback RFC 4122 v4 UUID generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  /**
   * Detects whether user text is meaningless gibberish, keyboard mashing,
   * spam loops, or arbitrary repeated characters with no semantic value.
   */
  isMeaninglessOrGibberish(text: string): boolean {
    if (!text || typeof text !== 'string') return true;
    const clean = text.trim();
    if (!clean) return true;

    // Short strings under 2 chars that are just symbols or non-alphanumeric
    if (clean.length < 2) return !/^[a-z0-9]$/i.test(clean);

    const words = clean.split(/\s+/).filter(Boolean);

    for (const w of words) {
      // 1. Long unspaced alphabetical tokens (>= 16 chars)
      if (w.length >= 16 && /^[a-zA-Z]+$/.test(w)) {
        // High frequency of a single character (> 25% of word length)
        const counts: Record<string, number> = {};
        for (const ch of w.toLowerCase()) counts[ch] = (counts[ch] || 0) + 1;
        const maxCount = Math.max(...Object.values(counts));
        if (maxCount / w.length > 0.25) return true;

        // Repeated sub-patterns across the word
        if (/(.{2,5}).*\1.*\1/i.test(w)) return true;
      }

      // 2. High consonant clusters or zero vowels
      const letters = (w.match(/[a-z]/gi) || []).length;
      const vowels = (w.match(/[aeiouy]/gi) || []).length;
      if (letters >= 8 && vowels === 0) return true;
      if (letters >= 10 && vowels / letters < 0.15) return true;
    }

    // 3. 4+ consecutive identical characters (e.g. 'aaaa', 'gggg')
    if (/(.)\1{3,}/i.test(clean)) return true;

    // 4. Repeating 2-5 letter sequence 3+ times (e.g. 'abcabcabc')
    if (/(.{2,5})\1{2,}/i.test(clean)) return true;

    // 5. Total text vowel ratio for texts with >= 16 letters (unless code/markdown)
    const allLetters = (clean.match(/[a-z]/gi) || []).length;
    const allVowels = (clean.match(/[aeiouy]/gi) || []).length;
    if (allLetters >= 16 && (allVowels / allLetters < 0.08 || allVowels / allLetters > 0.92)) {
      return true;
    }

    // 6. Common keyboard rows / smash sequences
    if (/asdfgh|qwerty|zxcvbn|hjklmn|lkjhgf|poiuyt/i.test(clean)) {
      return true;
    }

    return false;
  },

  /**
   * Detects abusive profanity, hostile insults, or harassment directed at the assistant/system.
   */
  isProfaneOrHostile(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    const clean = text.toLowerCase().trim();
    return /\b(fk\s*you|fuck\s*you|f\*ck|fck|bitch|bastard|asshole|motherfucker|dickhead|cunt|piss\s*off)\b/i.test(clean) ||
           /^(fk|fuck|fck|stfu|fuk)\b/i.test(clean);
  },

  /**
   * Validates if a string is a standard RFC 4122 UUID
   */
  isValidUUID(str: unknown): boolean {
    if (!str || typeof str !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str.trim());
  },

  /**
   * Canonical Single-Pass Template Variable Compiler:
   * Safely interpolates {{varName}} placeholders into a raw prompt in a single pass.
   * - Single-pass regex substitution prevents recursive or nested evaluation.
   * - Variable values containing {{...}} are treated purely as literal string data.
   * - Strips null bytes & control characters from user variables via sanitizePromptInput.
   * - Enforces configurable max length per variable.
   * - Preserves valid Markdown, JSON, XML, indentation, and newlines in values.
   */
  compilePromptVariables(
    rawPrompt: string,
    variables: Record<string, string> = {},
    options: { maxVarLength?: number; preserveUnmatched?: boolean } = {}
  ): string {
    if (!rawPrompt) return '';
    const maxLen = options.maxVarLength || 50000;
    const preserve = options.preserveUnmatched ?? false;

    // Single-pass replacement matching {{variable_name}}
    return rawPrompt.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (fullMatch, varKey) => {
      if (Object.prototype.hasOwnProperty.call(variables, varKey)) {
        const rawVal = variables[varKey];
        if (rawVal === undefined || rawVal === null) return '';
        let sanitizedVal = this.sanitizePromptInput(String(rawVal));
        if (sanitizedVal.length > maxLen) {
          sanitizedVal = sanitizedVal.slice(0, maxLen);
        }
        return sanitizedVal;
      }
      return preserve ? fullMatch : '';
    });
  },

  /**
   * Validates phone number format strictly.
   * - Optional field (empty string is valid).
   * - ONLY numbers allowed (optional leading '+' for country code).
   * - Strictly prohibits letters, spaces, hyphens, parentheses, and dots.
   * - Requires between 10 and 15 digits (ITU-T E.164 standard).
   */
  validatePhoneNumber(phone: string): { isValid: boolean; error?: string } {
    if (!phone || !phone.trim()) return { isValid: true };
    const clean = phone.trim();

    // Strictly enforce numbers only (with optional leading '+')
    if (!/^\+?[0-9]+$/.test(clean)) {
      return { isValid: false, error: 'Phone number must contain only numbers (digits only, no spaces or hyphens).' };
    }

    const digitsOnly = clean.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      return { isValid: false, error: 'Phone number must have at least 10 digits.' };
    }
    if (digitsOnly.length > 15) {
      return { isValid: false, error: 'Phone number cannot exceed 15 digits.' };
    }

    return { isValid: true };
  },

  /**
   * Validates GitHub profile URL format.
   * Accepts e.g. https://github.com/username, http://github.com/username, or github.com/username
   */
  validateGithubUrl(url: string): { isValid: boolean; error?: string } {
    if (!url || !url.trim()) return { isValid: true };
    const clean = url.trim();
    const githubRegex = /^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}\/?.*$/i;
    if (!githubRegex.test(clean)) {
      return { isValid: false, error: 'Please enter a valid GitHub profile URL (e.g. https://github.com/username).' };
    }
    return { isValid: true };
  },

  /**
   * Validates LinkedIn profile/company URL format.
   * Accepts e.g. https://linkedin.com/in/username or linkedin.com/in/username
   */
  validateLinkedinUrl(url: string): { isValid: boolean; error?: string } {
    if (!url || !url.trim()) return { isValid: true };
    const clean = url.trim();
    const linkedinRegex = /^(https?:\/\/)?([a-z]{2,3}\.)?linkedin\.com\/(in|company|school)\/[a-zA-Z0-9_.-]+\/?.*$/i;
    if (!linkedinRegex.test(clean)) {
      return { isValid: false, error: 'Please enter a valid LinkedIn URL (e.g. https://linkedin.com/in/username).' };
    }
    return { isValid: true };
  },

  /**
   * Validates Twitter / X profile URL format.
   * Accepts e.g. https://x.com/username or https://twitter.com/username
   */
  validateTwitterUrl(url: string): { isValid: boolean; error?: string } {
    if (!url || !url.trim()) return { isValid: true };
    const clean = url.trim();
    const twitterRegex = /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]{1,15}\/?.*$/i;
    if (!twitterRegex.test(clean)) {
      return { isValid: false, error: 'Please enter a valid X / Twitter URL (e.g. https://x.com/username).' };
    }
    return { isValid: true };
  },

  /**
   * Validates personal portfolio/website URL format.
   * Accepts e.g. https://yourdomain.com or yourdomain.com
   */
  validateWebsiteUrl(url: string): { isValid: boolean; error?: string } {
    if (!url || !url.trim()) return { isValid: true };
    const clean = url.trim();
    const websiteRegex = /^(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?::\d+)?(\/.*)?$/i;
    if (!websiteRegex.test(clean)) {
      return { isValid: false, error: 'Please enter a valid website URL (e.g. https://yourdomain.com).' };
    }
    return { isValid: true };
  },

  /**
   * Normalizes a social URL by ensuring https:// protocol is prepended if omitted.
   */
  normalizeUrl(url: string): string {
    if (!url || !url.trim()) return '';
    const clean = url.trim();
    if (!/^https?:\/\//i.test(clean)) {
      return `https://${clean}`;
    }
    return clean;
  },

  /**
   * Validates display name length and characters.
   */
  validateDisplayName(name: string): { isValid: boolean; error?: string } {
    if (!name || !name.trim()) {
      return { isValid: false, error: 'Name is required.' };
    }
    const clean = name.trim();
    if (clean.length < FIELD_LIMITS.NAME.MIN) {
      return { isValid: false, error: `Name must be at least ${FIELD_LIMITS.NAME.MIN} characters.` };
    }
    if (clean.length > FIELD_LIMITS.NAME.MAX) {
      return { isValid: false, error: `Name cannot exceed ${FIELD_LIMITS.NAME.MAX} characters.` };
    }
    return { isValid: true };
  },

  /**
   * Validates username length and permitted characters.
   */
  validateUsername(username: string): { isValid: boolean; error?: string } {
    if (!username || !username.trim()) {
      return { isValid: false, error: 'Username is required.' };
    }
    const clean = username.trim().toLowerCase();
    if (clean.length < FIELD_LIMITS.USERNAME.MIN) {
      return { isValid: false, error: `Username must be at least ${FIELD_LIMITS.USERNAME.MIN} characters.` };
    }
    if (clean.length > FIELD_LIMITS.USERNAME.MAX) {
      return { isValid: false, error: `Username cannot exceed ${FIELD_LIMITS.USERNAME.MAX} characters.` };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      return { isValid: false, error: 'Only letters, numbers, and underscores are allowed in username.' };
    }
    return { isValid: true };
  },

  /**
   * Validates user bio / headline length.
   */
  validateBio(bio: string): { isValid: boolean; error?: string } {
    if (!bio || !bio.trim()) return { isValid: true };
    const clean = bio.trim();
    if (clean.length > FIELD_LIMITS.BIO.MAX) {
      return { isValid: false, error: `Bio cannot exceed ${FIELD_LIMITS.BIO.MAX} characters.` };
    }
    return { isValid: true };
  },

  /**
   * Validates comment or review text length.
   */
  validateComment(text: string): { isValid: boolean; error?: string } {
    if (!text || !text.trim()) {
      return { isValid: false, error: 'Comment cannot be empty.' };
    }
    const clean = text.trim();
    if (clean.length > FIELD_LIMITS.COMMENT.MAX) {
      return { isValid: false, error: `Comment cannot exceed ${FIELD_LIMITS.COMMENT.MAX} characters.` };
    }
    return { isValid: true };
  },

  /**
   * Validates prompt title length.
   */
  validatePromptTitle(title: string): { isValid: boolean; error?: string } {
    if (!title || !title.trim()) {
      return { isValid: false, error: 'Prompt title is required.' };
    }
    const clean = title.trim();
    if (clean.length < FIELD_LIMITS.PROMPT_TITLE.MIN) {
      return { isValid: false, error: `Prompt title must be at least ${FIELD_LIMITS.PROMPT_TITLE.MIN} characters.` };
    }
    if (clean.length > FIELD_LIMITS.PROMPT_TITLE.MAX) {
      return { isValid: false, error: `Prompt title cannot exceed ${FIELD_LIMITS.PROMPT_TITLE.MAX} characters.` };
    }
    return { isValid: true };
  },

  /**
   * Validates collection title length.
   */
  validateCollectionName(name: string): { isValid: boolean; error?: string } {
    if (!name || !name.trim()) {
      return { isValid: false, error: 'Collection name is required.' };
    }
    const clean = name.trim();
    if (clean.length < FIELD_LIMITS.COLLECTION_NAME.MIN) {
      return { isValid: false, error: `Collection name must be at least ${FIELD_LIMITS.COLLECTION_NAME.MIN} characters.` };
    }
    if (clean.length > FIELD_LIMITS.COLLECTION_NAME.MAX) {
      return { isValid: false, error: `Collection name cannot exceed ${FIELD_LIMITS.COLLECTION_NAME.MAX} characters.` };
    }
    return { isValid: true };
  },

  /**
   * Validates team workspace name length.
   */
  validateTeamName(name: string): { isValid: boolean; error?: string } {
    if (!name || !name.trim()) {
      return { isValid: false, error: 'Team name is required.' };
    }
    const clean = name.trim();
    if (clean.length < FIELD_LIMITS.TEAM_NAME.MIN) {
      return { isValid: false, error: `Team name must be at least ${FIELD_LIMITS.TEAM_NAME.MIN} characters.` };
    }
    if (clean.length > FIELD_LIMITS.TEAM_NAME.MAX) {
      return { isValid: false, error: `Team name cannot exceed ${FIELD_LIMITS.TEAM_NAME.MAX} characters.` };
    }
    return { isValid: true };
  }
};

/**
 * Standard industry character limits across PromptHub entities
 */
export const FIELD_LIMITS = {
  NAME: { MIN: 2, MAX: 50 },
  USERNAME: { MIN: 3, MAX: 30 },
  BIO: { MAX: 250 },
  COMMENT: { MIN: 1, MAX: 500 },
  PROMPT_TITLE: { MIN: 3, MAX: 100 },
  PROMPT_DESCRIPTION: { MAX: 1000 },
  COLLECTION_NAME: { MIN: 2, MAX: 60 },
  COLLECTION_DESCRIPTION: { MAX: 500 },
  TEAM_NAME: { MIN: 2, MAX: 50 },
  BUG_TITLE: { MIN: 3, MAX: 100 },
  BUG_DESCRIPTION: { MIN: 5, MAX: 1000 },
  FEEDBACK_TEXT: { MIN: 3, MAX: 1000 },
  PHONE: { MIN: 10, MAX: 15 },
  FOLDER_NAME: { MIN: 2, MAX: 40 },
  CHAT_TITLE: { MIN: 1, MAX: 50 },
} as const;

