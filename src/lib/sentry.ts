/**
 * src/lib/sentry.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Modular Sentry Error Monitoring & Tracing Service for PromptHub Frontend.
 *
 * Captures JS exceptions, unhandled rejections, React crashes, Supabase/Cloudinary
 * failures, and AI request errors with automatic privacy data scrubbing.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as Sentry from '@sentry/react';
import { env } from '../config/env';
import { featureFlags } from '../config/featureFlags';

let isInitialized = false;

declare global {
  interface Window {
    __ph_sentry_handlers_attached?: boolean;
  }
}

/**
 * Initializes Sentry Error Monitoring singleton.
 */
export function initSentry(): void {
  if (isInitialized) return;

  if (!featureFlags.isSentryEnabled()) {
    console.info('[Sentry] Sentry disabled via feature flag.');
    isInitialized = true;
    return;
  }

  // Attach window unhandled rejection listener for runtime safety
  if (typeof window !== 'undefined' && !window.__ph_sentry_handlers_attached) {
    window.__ph_sentry_handlers_attached = true;
    window.addEventListener('unhandledrejection', (event) => {
      captureException(event.reason || new Error('Unhandled Promise Rejection'), {
        category: 'runtime.unhandledrejection',
      });
    });
  }

  const dsn = env.VITE_SENTRY_DSN || (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SENTRY_DSN : '') || '';
  const environment = import.meta.env.VITE_APP_ENV || (import.meta.env.DEV ? 'development' : 'production');
  const release = import.meta.env.VITE_APP_RELEASE || 'prompthub@1.0.0';

  if (!dsn) {
    console.info('[Sentry] VITE_SENTRY_DSN not configured. Operating in console fallback mode.');
    isInitialized = true;
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment,
      release,
      tracesSampleRate: environment === 'production' ? 0.2 : 1.0,
      
      // Privacy & Security Data Scrubbing
      beforeSend(event) {
        // 1. Scrub Authorization headers, tokens, and sensitive keys from request headers
        if (event.request?.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['authorization'];
          delete event.request.headers['X-Api-Key'];
        }

        // 2. Scrub prompt content or sensitive parameters from extra / breadcrumb data
        if (event.extra) {
          const sensitiveKeys = ['promptText', 'rawContent', 'compiledPrompt', 'apiKey', 'apiSecret', 'password', 'token'];
          sensitiveKeys.forEach(key => {
            if (key in event.extra!) {
              event.extra![key] = '[SCRUBBED]';
            }
          });
        }

        // 3. Scrub breadcrumbs containing sensitive URLs or payloads
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
            if (breadcrumb.data) {
              ['promptText', 'rawContent', 'apiKey', 'password'].forEach(k => {
                if (k in breadcrumb.data!) {
                  breadcrumb.data![k] = '[SCRUBBED]';
                }
              });
            }
            return breadcrumb;
          });
        }

        return event;
      },
    });

    isInitialized = true;
    console.info(`[Sentry] Frontend Monitoring active (Env: ${environment}, Release: ${release}).`);
  } catch (err: any) {
    console.warn('[Sentry] Failed to initialize Sentry SDK:', err?.message || err);
  }
}

/**
 * Sets authenticated user context (UID, Email, Display Name ONLY).
 * Never attaches passwords, API keys, or prompt content.
 */
export function setSentryUser(user: { uid: string; email?: string | null; displayName?: string | null } | null): void {
  if (!isInitialized) return;

  if (user) {
    Sentry.setUser({
      id: user.uid,
      email: user.email || undefined,
      username: user.displayName || undefined,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Captures an exception with optional category & extra context tags.
 */
export function captureException(error: unknown, context?: { category?: string; extra?: Record<string, any> }): void {
  console.error('[App Error Captured]', error);

  if (context?.category) {
    Sentry.setTag('category', context.category);
  }

  if (context?.extra) {
    // Sanitize extra context keys before passing to Sentry
    const sanitizedExtra = { ...context.extra };
    ['promptText', 'rawContent', 'compiledPrompt', 'apiKey', 'password'].forEach(k => {
      if (k in sanitizedExtra) {
        sanitizedExtra[k] = '[SCRUBBED]';
      }
    });
    Sentry.setExtras(sanitizedExtra);
  }

  Sentry.captureException(error);
}

/**
 * Performance tracing wrapper for key client workflows.
 */
export async function tracePerformance<T>(
  name: string,
  op: 'navigation' | 'ai.analysis' | 'ai.workspace' | 'media.upload' | 'client.db',
  callback: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  try {
    const result = await callback();
    const duration = performance.now() - startTime;
    Sentry.addBreadcrumb({
      category: op,
      message: `${name} completed in ${duration.toFixed(2)}ms`,
      level: 'info',
    });
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    Sentry.addBreadcrumb({
      category: op,
      message: `${name} failed after ${duration.toFixed(2)}ms`,
      level: 'error',
    });
    captureException(error, { category: op, extra: { name, durationMs: duration } });
    throw error;
  }
}
