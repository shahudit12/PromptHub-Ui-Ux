/**
 * src/utils/errorMessages.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Normalizes raw infrastructure error strings into human-readable messages.
 *
 * Rules:
 * - Never destroy technical detail — always log the original error before
 *   surfacing the normalized message.
 * - Never suppress errors — only translate them.
 * - Keep messages concise and actionable.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface NormalizedError {
  /** Human-readable message safe to show in UI toast / error state */
  userMessage: string;
  /** Original raw error message for developer logging */
  rawMessage: string;
  /** Error code hint for conditional UI handling */
  code: 'AUTH_REQUIRED' | 'CREDITS_EXHAUSTED' | 'MODEL_NOT_AVAILABLE' | 'SCHEMA_MISMATCH' | 'RLS_DENIED' | 'NETWORK' | 'VALIDATION' | 'UNKNOWN';
}

/**
 * Convert a raw infrastructure error into a user-safe normalized error object.
 *
 * Usage:
 * ```ts
 * const norm = normalizeError(err);
 * logger.error('[Teams]', norm.rawMessage);
 * showToast(norm.userMessage, 'error');
 * ```
 */
export function normalizeError(err: unknown): NormalizedError {
  const raw = err instanceof Error ? err.message : String(err ?? 'Unknown error');
  const lower = raw.toLowerCase();

  // ── Supabase / PostgREST schema cache issues ──────────────────────────────
  if (lower.includes("schema cache") || lower.includes("column of") || lower.includes("could not find")) {
    return {
      userMessage: "We couldn't complete that action right now. The team is aware — please try again in a moment.",
      rawMessage: raw,
      code: 'SCHEMA_MISMATCH',
    };
  }

  // ── RLS / permission denied ───────────────────────────────────────────────
  if (lower.includes("row-level security") || lower.includes("permission denied") || lower.includes("rls policy")) {
    return {
      userMessage: "You don't have permission to perform this action.",
      rawMessage: raw,
      code: 'RLS_DENIED',
    };
  }

  // ── Authentication required ───────────────────────────────────────────────
  if (
    lower.includes("not authenticated") ||
    lower.includes("sign in") ||
    lower.includes("unauthorized") ||
    lower.includes("jwt") ||
    lower.includes("missing authorization") ||
    lower.includes("auth_required") ||
    lower.includes("syntax for type uuid: \"guest\"") ||
    lower.includes("syntax for type uuid: 'guest'") ||
    (lower.includes("syntax for type uuid") && lower.includes("guest"))
  ) {
    return {
      userMessage: "Please sign in or create an account to use this feature.",
      rawMessage: raw,
      code: 'AUTH_REQUIRED',
    };
  }

  // ── Preserved Normalized AI Errors (Provider-Specific BYOK / Gateway) ──────
  if (err && typeof err === 'object' && 'code' in err && 'message' in err && typeof (err as any).message === 'string') {
    const aiErr = err as { code?: string; provider?: string; message: string; remediationHint?: string };
    const provMsg = aiErr.message;
    if (aiErr.code === 'AUTH_INVALID_KEY' || aiErr.code === 'BILLING_REQUIRED' || aiErr.code === 'MODEL_ACCESS_DENIED' || aiErr.code === 'UNSUPPORTED_PARAMETER' || aiErr.code === 'RATE_LIMITED' || aiErr.code === 'MODEL_NOT_FOUND') {
      return {
        userMessage: provMsg,
        rawMessage: raw,
        code: 'UNKNOWN',
      };
    }

    if (aiErr.code === 'MODEL_NOT_AVAILABLE_IN_FREE_OPENROUTER' || (err as any).error_code === 'MODEL_NOT_AVAILABLE_IN_FREE_OPENROUTER') {
      return {
        userMessage: aiErr.message || "This model is not available in PromptHub's managed Free OpenRouter catalog. To run paid OpenRouter models, connect your personal OpenRouter API key in Settings → API Credentials.",
        rawMessage: raw,
        code: 'MODEL_NOT_AVAILABLE',
      };
    }

    if (aiErr.code === 'FREE_OPENROUTER_CREDITS_EXHAUSTED' || (err as any).error_code === 'FREE_OPENROUTER_CREDITS_EXHAUSTED') {
      return {
        userMessage: "Your free AI credits have been used. Top up PromptHub credits or connect your personal API key in Settings → API Credentials.",
        rawMessage: raw,
        code: 'CREDITS_EXHAUSTED',
      };
    }

    if (aiErr.code === 'INSUFFICIENT_CREDITS') {
      // If it's explicitly an external provider account (e.g. OpenRouter, OpenAI, Anthropic, AICredits, etc.)
      if (aiErr.provider && aiErr.provider !== 'PromptHub Cloud') {
        const fullMsg = aiErr.remediationHint
          ? `${provMsg} ${aiErr.remediationHint}`
          : provMsg;
        return {
          userMessage: fullMsg,
          rawMessage: raw,
          code: 'CREDITS_EXHAUSTED',
        };
      }
      return {
        userMessage: "You've run out of PromptHub AI credits. Top up your wallet in Pricing & Plans, or connect your own API key in Settings → API Credentials.",
        rawMessage: raw,
        code: 'CREDITS_EXHAUSTED',
      };
    }
  }

  // ── Specific Provider BYOK Account / Quota Errors ─────────────────────────
  if (
    (lower.includes("on your") && (lower.includes("account") || lower.includes("portal"))) ||
    lower.includes("openai quota") ||
    lower.includes("exceeded your current openai quota") ||
    lower.includes("openrouter account") ||
    lower.includes("anthropic account") ||
    lower.includes("deepseek account") ||
    lower.includes("groq account") ||
    lower.includes("aicredits") ||
    lower.includes("insufficient balance")
  ) {
    if (lower.includes("aicredits") && (lower.includes("balance") || lower.includes("insufficient"))) {
      return {
        userMessage: "Your AICredits.in wallet balance is empty (Insufficient Balance). Please top up credits on aicredits.in.",
        rawMessage: raw,
        code: 'CREDITS_EXHAUSTED',
      };
    }
    return {
      userMessage: raw.length <= 250 ? raw : "Your connected API key has exceeded its quota or has insufficient balance. Please check your provider account billing dashboard.",
      rawMessage: raw,
      code: 'CREDITS_EXHAUSTED',
    };
  }

  // ── Platform Credit exhaustion ────────────────────────────────────────────
  if (
    lower.includes("insufficient credits") ||
    lower.includes("credits_exhausted") ||
    lower.includes("credit deduction") ||
    lower.includes("not enough credits") ||
    lower.includes("credit balance")
  ) {
    return {
      userMessage: "You've run out of AI credits. Top up your wallet in Pricing & Plans, or connect your own API key in Settings → API Credentials.",
      rawMessage: raw,
      code: 'CREDITS_EXHAUSTED',
    };
  }

  // ── Model discontinued or deactivated ────────────────────────────────────
  if (
    lower.includes('discontinued by openrouter') ||
    lower.includes('discontinued by') ||
    lower.includes('model_discontinued') ||
    lower.includes('has been discontinued') ||
    lower.includes('deactivated') ||
    lower.includes('no longer available') ||
    (lower.includes('model') && lower.includes('deprecated')) ||
    (lower.includes('model') && lower.includes('not found'))
  ) {
    return {
      userMessage: raw.length <= 200 ? raw : 'This model has been discontinued by the provider. Please select another model from the model selector.',
      rawMessage: raw,
      code: 'UNKNOWN',
    };
  }

  // ── Network / fetch failures ──────────────────────────────────────────────
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network error") ||
    lower.includes("aborterror") ||
    lower.includes("timeout")
  ) {
    return {
      userMessage: "Network connection issue. Please check your connection and try again.",
      rawMessage: raw,
      code: 'NETWORK',
    };
  }

  // ── Validation errors ─────────────────────────────────────────────────────
  if (
    lower.includes("violates") ||
    lower.includes("constraint") ||
    lower.includes("not null") ||
    lower.includes("invalid value") ||
    lower.includes("check constraint")
  ) {
    return {
      userMessage: "Invalid data submitted. Please check your input and try again.",
      rawMessage: raw,
      code: 'VALIDATION',
    };
  }

  // ── Provider credit exhaustion & fallback ─────────────────────────────────
  if (
    lower.includes("model_fallback_unavailable") ||
    (lower.includes("primary provider") && lower.includes("credits exhausted"))
  ) {
    return {
      userMessage: "Platform provider credits for this paid model are currently exhausted. Switch to one of the Free models (Qwen 3.8, Gemma 4, Liquid LFM, OpenRouter Free) for instant zero-credit execution, or connect your personal API key in Settings → API Credentials.",
      rawMessage: raw,
      code: 'CREDITS_EXHAUSTED',
    };
  }

  // ── Default: pass through readable messages, sanitize developer stack traces ──
  const isInternalStack = raw.includes("node:internal") || raw.includes("    at ") || raw.includes("TypeError: ");
  let userMessage = raw;
  if (isInternalStack || raw.length > 400) {
    userMessage = raw.length <= 120 && !isInternalStack ? raw : "An unexpected error occurred. Please try again.";
  }
  return {
    userMessage,
    rawMessage: raw,
    code: 'UNKNOWN',
  };
}
