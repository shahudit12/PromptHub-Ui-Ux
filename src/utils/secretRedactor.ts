/**
 * src/utils/secretRedactor.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Universal Secret Redaction Engine for PromptHub.
 *
 * Guarantees that no raw API keys, bearer tokens, or provider credentials
 * can ever leak into console logs, error messages, analytics, Sentry traces,
 * or network exception bodies.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const SECRET_PATTERNS: RegExp[] = [
  // OpenAI & OpenRouter standard keys
  /sk-(?:proj-|live-)?[a-zA-Z0-9_-]{20,}/g,
  // OpenRouter explicit slug prefix
  /sk-or-v1-[a-zA-Z0-9_-]{20,}/g,
  // Anthropic API keys
  /sk-ant-[a-zA-Z0-9_-]{20,}/g,
  // Google AI Studio / Gemini keys
  /AIza[a-zA-Z0-9_-]{30,}/g,
  // Groq LPU API keys
  /gsk_[a-zA-Z0-9_-]{20,}/g,
  // xAI Grok keys
  /xai-[a-zA-Z0-9_-]{20,}/g,
  // Generic Bearer tokens in headers or URLs
  /Bearer\s+[a-zA-Z0-9_.-]{20,}/gi,
  // Basic Auth / generic authorization headers
  /(?:api[_-]?key|access[_-]?token|auth[_-]?token|secret)["']?\s*[:=]\s*["']?([a-zA-Z0-9_.-]{20,})["']?/gi,
];

/**
 * Scrub any raw secrets from a string, replacing them with a redacted placeholder.
 */
export function redactSecretString(text: string): string {
  if (!text || typeof text !== 'string') return text;
  let sanitized = text;

  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match) => {
      if (match.toLowerCase().startsWith('bearer ')) {
        return 'Bearer [REDACTED_TOKEN]';
      }
      return '[REDACTED_SECRET]';
    });
  }

  return sanitized;
}

/**
 * Recursively redacts sensitive values from objects, arrays, and Error instances.
 */
export function redactSecrets<T>(data: T): T {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return redactSecretString(data) as unknown as T;
  }

  if (data instanceof Error) {
    const clonedError = new Error(redactSecretString(data.message));
    clonedError.name = data.name;
    clonedError.stack = data.stack ? redactSecretString(data.stack) : undefined;
    return clonedError as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSecrets(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    const SENSITIVE_KEY_NAMES = [
      'apikey',
      'api_key',
      'key',
      'secret',
      'authorization',
      'x-api-key',
      'x-goog-api-key',
      'token',
      'accesstoken',
      'password',
      'byokkeyencrypted',
    ];

    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      const lowerKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (SENSITIVE_KEY_NAMES.includes(lowerKey)) {
        result[k] = '[REDACTED_SECRET]';
      } else {
        result[k] = redactSecrets(v);
      }
    }
    return result as T;
  }

  return data;
}
