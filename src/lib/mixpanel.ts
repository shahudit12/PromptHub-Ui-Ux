/**
 * src/lib/mixpanel.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Mixpanel Analytics Foundation Module for PromptHub.
 *
 * Capabilities:
 * 1. Singleton initialization with environment-controlled project token.
 * 2. Simplified ID Merge compatible identity lifecycle (identify on login/restore,
 *    reset on logout).
 * 3. Group Analytics support for multi-tenant Team Workspaces ('team_id').
 * 4. Super Properties registration (platform, app_version, user_plan).
 * 5. CCPA/GDPR opt-in/opt-out support.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mixpanel, { type Dict } from 'mixpanel-browser';
import { featureFlags } from '../config/featureFlags';

let isInitialized = false;
let currentIdentifiedUid: string | null = null;

export interface MixpanelUserProperties {
  $name?: string | null;
  $email?: string | null;
  $avatar?: string | null;
  $created?: string | null;
  username?: string | null;
  role?: 'Admin' | 'User' | string;
  plan?: string | null;
  credits?: number;
  paid_credits?: number;
  promotional_credits?: number;
  is_paid_subscriber?: boolean;
  has_byok?: boolean;
  teams_count?: number;
}

/**
 * Initializes the Mixpanel analytics singleton safely.
 */
export function initMixpanel(): void {
  if (isInitialized) {
    return;
  }

  if (typeof window === 'undefined') {
    return;
  }

  if (!featureFlags.isMixpanelEnabled()) {
    console.info('[Mixpanel] Analytics disabled via feature flag.');
    isInitialized = true;
    return;
  }

  const token = import.meta.env.VITE_MIXPANEL_TOKEN;
  const isProd = import.meta.env.PROD;

  if (!token) {
    console.info('[Mixpanel] Analytics disabled: missing project token.');
    isInitialized = true;
    return;
  }

  try {
    mixpanel.init(token, {
      debug: !isProd,
      track_pageview: true,
      persistence: 'localStorage',
      ignore_dnt: false,
      ip: false, // Respect privacy by not capturing raw client IP addresses
      property_blacklist: ['$current_url'], // Security: strip full URL queries
    });

    // Register baseline super properties attached to all subsequent events
    mixpanel.register({
      platform: 'web',
      app_version: import.meta.env.VITE_APP_RELEASE || 'prompthub@2.0.0',
      environment: isProd ? 'production' : 'development',
    });

    isInitialized = true;
    if (!isProd) {
      console.info('[Mixpanel] Initialized successfully with debug logging enabled.');
    }
  } catch (err: any) {
    console.warn('[Mixpanel] Initialization error:', err?.message || err);
  }
}

/**
 * Helper to check if Mixpanel is active and ready.
 */
export function isMixpanelActive(): boolean {
  return isInitialized;
}

/**
 * Identifies an authenticated user in Mixpanel.
 *
 * Rules:
 * - Always pass a stable internal Supabase user UUID as distinct_id (never email).
 * - Calls mixpanel.identify() and sets user profile properties via mixpanel.people.set().
 * - Avoids redundant calls for identical UID in current session.
 */
export function identifyMixpanelUser(uid: string, props?: MixpanelUserProperties): void {
  if (!isMixpanelActive() || !uid) {
    return;
  }

  try {
    if (currentIdentifiedUid !== uid) {
      mixpanel.identify(uid);
      currentIdentifiedUid = uid;
    }

    if (props) {
      const sanitizedProps: Dict = {};
      if (props.$name) sanitizedProps.$name = props.$name;
      if (props.$email) sanitizedProps.$email = props.$email;
      if (props.$avatar) sanitizedProps.$avatar = props.$avatar;
      if (props.$created) sanitizedProps.$created = props.$created;
      if (props.username) sanitizedProps.username = props.username;
      if (props.role) sanitizedProps.role = props.role;
      if (props.plan) sanitizedProps.plan = props.plan;
      if (typeof props.credits === 'number') sanitizedProps.credits = props.credits;
      if (typeof props.paid_credits === 'number') sanitizedProps.paid_credits = props.paid_credits;
      if (typeof props.promotional_credits === 'number') sanitizedProps.promotional_credits = props.promotional_credits;
      if (typeof props.is_paid_subscriber === 'boolean') sanitizedProps.is_paid_subscriber = props.is_paid_subscriber;
      if (typeof props.has_byok === 'boolean') sanitizedProps.has_byok = props.has_byok;
      if (typeof props.teams_count === 'number') sanitizedProps.teams_count = props.teams_count;

      mixpanel.people.set(sanitizedProps);

      // Also register plan as a super property so it is joined with all events
      if (props.plan) {
        mixpanel.register({ user_plan: props.plan.toLowerCase() });
      }
    }
  } catch (err: any) {
    console.warn('[Mixpanel] User identification warning:', err?.message || err);
  }
}

/**
 * Binds the current session to a Team Workspace Group (Group Analytics).
 */
export function setMixpanelTeamGroup(teamId: string, teamProperties?: Dict): void {
  if (!isMixpanelActive() || !teamId) {
    return;
  }

  try {
    mixpanel.set_group('team_id', teamId);
    if (teamProperties) {
      mixpanel.get_group('team_id', teamId).set(teamProperties);
    }
  } catch (err: any) {
    console.warn('[Mixpanel] Team group set warning:', err?.message || err);
  }
}

/**
 * Resets Mixpanel distinct_id and session cache upon user logout.
 */
export function resetMixpanel(): void {
  if (!isMixpanelActive()) {
    currentIdentifiedUid = null;
    return;
  }

  try {
    mixpanel.reset();
    currentIdentifiedUid = null;
    // Re-register baseline super properties
    mixpanel.register({
      platform: 'web',
      app_version: import.meta.env.VITE_APP_RELEASE || 'prompthub@2.0.0',
      environment: import.meta.env.PROD ? 'production' : 'development',
    });
  } catch (err: any) {
    console.warn('[Mixpanel] Reset warning:', err?.message || err);
    currentIdentifiedUid = null;
  }
}

export interface MixpanelLogEntry {
  id: string;
  eventName: string;
  properties?: Dict;
  distinctId?: string | null;
  timestamp: string;
}

const MAX_EVENT_HISTORY = 150;
const STORAGE_KEY = 'ph_mixpanel_recent_events';

function getStoredEvents(): MixpanelLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistEvents(events: MixpanelLogEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENT_HISTORY)));
  } catch {}
}

let inMemoryEvents: MixpanelLogEntry[] = getStoredEvents();

/**
 * Tracks an arbitrary event safely in Mixpanel.
 */
export function trackMixpanelEvent(eventName: string, properties?: Dict): void {
  const timestamp = new Date().toISOString();
  const entry: MixpanelLogEntry = {
    id: `mp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    eventName,
    properties: properties ? { ...properties } : {},
    distinctId: currentIdentifiedUid,
    timestamp,
  };

  inMemoryEvents = [entry, ...inMemoryEvents.slice(0, MAX_EVENT_HISTORY - 1)];
  persistEvents(inMemoryEvents);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ph_mixpanel_event_logged', { detail: entry }));
  }

  if (!isMixpanelActive()) {
    return;
  }

  try {
    mixpanel.track(eventName, properties);
  } catch (err: any) {
    console.warn(`[Mixpanel] Failed to track "${eventName}":`, err?.message || err);
  }
}

/**
 * Retrieves the live recent history of Mixpanel events for Admin Telemetry.
 */
export function getMixpanelEventHistory(): MixpanelLogEntry[] {
  return inMemoryEvents;
}

/**
 * Computes aggregated event counts for quick telemetry dashboards.
 */
export function getMixpanelEventCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of inMemoryEvents) {
    counts[item.eventName] = (counts[item.eventName] || 0) + 1;
  }
  return counts;
}

/**
 * Clears the local Mixpanel telemetry buffer.
 */
export function clearMixpanelEventHistory(): void {
  inMemoryEvents = [];
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    window.dispatchEvent(new CustomEvent('ph_mixpanel_event_logged', { detail: null }));
  }
}

/**
 * Registers global super properties attached to all subsequent events.
 */
export function registerMixpanelSuperProperties(properties: Dict): void {
  if (!isMixpanelActive()) {
    return;
  }

  try {
    mixpanel.register(properties);
  } catch (err: any) {
    console.warn('[Mixpanel] Super properties warning:', err?.message || err);
  }
}

/**
 * Compliance helpers for opt-in / opt-out (CCPA / GDPR).
 */
export function optOutMixpanel(): void {
  if (!isMixpanelActive()) return;
  try {
    mixpanel.opt_out_tracking();
  } catch {}
}

export function optInMixpanel(): void {
  if (!isMixpanelActive()) return;
  try {
    mixpanel.opt_in_tracking();
  } catch {}
}

export default mixpanel;

