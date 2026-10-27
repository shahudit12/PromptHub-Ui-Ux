/**
 * src/lib/posthog.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dedicated PostHog Analytics Foundation Module for PromptHub.
 *
 * Handles single-instance SDK initialization, authenticated user identification
 * using Supabase UID, and session reset upon sign out.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import posthog from 'posthog-js';

// Singleton initialization tracker to prevent duplicate calls
let isInitialized = false;
let currentIdentifiedUid: string | null = null;

export interface PostHogUserProperties {
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  accountCreatedAt?: string | null;
  emailVerified?: boolean;
  provider?: string | null;
  accountType?: 'Free' | 'Pro' | string;
}

/**
 * Initializes PostHog analytics singleton safely.
 */
export function initPostHog(): void {
  // 1. Avoid duplicate initialization
  if (isInitialized) {
    return;
  }

  // 2. Ensure execution occurs only in browser environment
  if (typeof window === 'undefined') {
    return;
  }

  // 3. Read environment configuration
  const apiKey = import.meta.env.VITE_POSTHOG_KEY || '';
  const apiHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';
  const isProduction = import.meta.env.PROD;

  // 4. Disable analytics completely if no API key exists or if not in production build
  if (!apiKey || !isProduction) {
    console.info('[PostHog] Analytics disabled (missing API key or non-production build).');
    isInitialized = true;
    return;
  }

  try {
    // 5. Initialize PostHog SDK once with conservative foundation settings
    posthog.init(apiKey, {
      api_host: apiHost,
      autocapture: false, // Foundation phase: disable automatic DOM click capturing
      capture_pageview: true, // Capture standard pageview events
      disable_session_recording: true, // Disable session recording in foundation phase
      persistence: 'localStorage',
    });

    isInitialized = true;
    console.info('[PostHog] Analytics initialized successfully in production.');
  } catch (err: any) {
    console.warn('[PostHog] Initialization warning:', err?.message || err);
  }
}

/**
 * Helper to check if PostHog analytics is active.
 */
export function isPostHogActive(): boolean {
  return isInitialized && Boolean(import.meta.env.VITE_POSTHOG_KEY) && import.meta.env.PROD;
}

/**
 * Identifies an authenticated Supabase user in PostHog.
 * - Uses Supabase UID as distinct_id.
 * - Prevents duplicate identify() calls for the same UID within the active session.
 * - Never identifies anonymous visitors or attaches secrets (passwords, tokens, keys).
 */
export function identifyPostHogUser(uid: string, props?: PostHogUserProperties): void {
  if (!isPostHogActive() || !uid) {
    return;
  }

  // Guard: Avoid duplicate identify() calls for identical UID in current session
  if (currentIdentifiedUid === uid) {
    return;
  }

  try {
    const userProperties: Record<string, any> = {};
    if (props?.email) userProperties.email = props.email;
    if (props?.displayName) userProperties.name = props.displayName;
    if (props?.photoURL) userProperties.avatar_url = props.photoURL;
    if (props?.accountCreatedAt) userProperties.created_at = props.accountCreatedAt;
    if (props?.emailVerified !== undefined) userProperties.email_verified = props.emailVerified;
    if (props?.provider) userProperties.provider = props.provider;
    if (props?.accountType) userProperties.account_type = props.accountType;

    posthog.identify(uid, userProperties);
    currentIdentifiedUid = uid;
    console.info(`[PostHog] User identified with Supabase UID: ${uid}`);
  } catch (err: any) {
    console.warn('[PostHog] User identification warning:', err?.message || err);
  }
}

/**
 * Resets PostHog session identity upon logout to prevent cross-user data contamination.
 */
export function resetPostHog(): void {
  if (!isPostHogActive()) {
    currentIdentifiedUid = null;
    return;
  }

  try {
    posthog.reset();
    currentIdentifiedUid = null;
    console.info('[PostHog] Identity reset on user logout.');
  } catch (err: any) {
    console.warn('[PostHog] Reset session warning:', err?.message || err);
    currentIdentifiedUid = null;
  }
}
