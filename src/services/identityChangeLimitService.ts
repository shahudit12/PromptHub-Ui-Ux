/**
 * src/services/identityChangeLimitService.ts
 *
 * Enforces PromptHub Identity Policy:
 * "The name and username should be changed twice as per week and not more than that , also tell this to user"
 *
 * Rules:
 * - Max 2 changes per 7-day rolling window for Display Name.
 * - Max 2 changes per 7-day rolling window for Creator Username Handle.
 * - Informs the user of remaining change quotas and unlock dates.
 */

export const MAX_CHANGES_PER_WEEK = 2;
export const ROLLING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

export interface IdentityChangeQuota {
  allowed: boolean;
  remaining: number;
  max: number;
  history: number[]; // Epoch timestamps of changes within rolling window
  nextAvailableMs?: number;
  nextAvailableDateFormatted?: string;
  timeRemainingFormatted?: string;
  message: string;
}

function cleanHistory(rawTimestamps: any[]): number[] {
  if (!Array.isArray(rawTimestamps)) return [];
  const now = Date.now();
  const threshold = now - ROLLING_WINDOW_MS;
  return rawTimestamps
    .map((t) => (typeof t === 'number' ? t : new Date(t).getTime()))
    .filter((t) => !isNaN(t) && t > threshold && t <= now)
    .sort((a, b) => a - b);
}

function getStoredHistory(key: string): number[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return cleanHistory(JSON.parse(raw));
  } catch {
    return [];
  }
}

function setStoredHistory(key: string, history: number[]): void {
  try {
    const cleaned = cleanHistory(history);
    localStorage.setItem(key, JSON.stringify(cleaned));
  } catch {}
}

export function formatNextAvailableDate(timestampMs: number): string {
  const d = new Date(timestampMs);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatTimeRemaining(timestampMs: number): string {
  const ms = Math.max(0, timestampMs - Date.now());
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return `${days} day${days === 1 ? '' : 's'}`;
}

export const identityChangeLimitService = {
  MAX_CHANGES_PER_WEEK,
  ROLLING_WINDOW_MS,

  /**
   * Get filtered history for display name changes within rolling window.
   */
  getNameChangeHistory(userId?: string): number[] {
    if (!userId) return [];
    return getStoredHistory(`ph_name_changes_${userId}`);
  },

  /**
   * Get filtered history for username handle changes within rolling window.
   */
  getUsernameChangeHistory(userId?: string): number[] {
    if (!userId) return [];
    return getStoredHistory(`ph_username_changes_${userId}`);
  },

  /**
   * Check name change quota for a user.
   */
  checkNameChangeQuota(userId?: string): IdentityChangeQuota {
    if (!userId) {
      return {
        allowed: true,
        remaining: MAX_CHANGES_PER_WEEK,
        max: MAX_CHANGES_PER_WEEK,
        history: [],
        message: `Display name can be changed twice per week (${MAX_CHANGES_PER_WEEK} of ${MAX_CHANGES_PER_WEEK} changes remaining this week).`,
      };
    }

    const history = getStoredHistory(`ph_name_changes_${userId}`);
    const remaining = Math.max(0, MAX_CHANGES_PER_WEEK - history.length);
    const allowed = history.length < MAX_CHANGES_PER_WEEK;

    if (allowed) {
      return {
        allowed: true,
        remaining,
        max: MAX_CHANGES_PER_WEEK,
        history,
        message: `Display name can be changed twice per week (${remaining} of ${MAX_CHANGES_PER_WEEK} changes remaining this week).`,
      };
    }

    const oldest = Math.min(...history);
    const nextAvailableMs = oldest + ROLLING_WINDOW_MS;
    const dateFormatted = formatNextAvailableDate(nextAvailableMs);
    const timeRemaining = formatTimeRemaining(nextAvailableMs);

    return {
      allowed: false,
      remaining: 0,
      max: MAX_CHANGES_PER_WEEK,
      history,
      nextAvailableMs,
      nextAvailableDateFormatted: dateFormatted,
      timeRemainingFormatted: timeRemaining,
      message: `Weekly limit reached (0 of ${MAX_CHANGES_PER_WEEK} changes remaining). Next name change available in ${timeRemaining} (${dateFormatted}).`,
    };
  },

  /**
   * Check username change quota for a user.
   */
  checkUsernameChangeQuota(userId?: string): IdentityChangeQuota {
    if (!userId) {
      return {
        allowed: true,
        remaining: MAX_CHANGES_PER_WEEK,
        max: MAX_CHANGES_PER_WEEK,
        history: [],
        message: `Username can be changed twice per week (${MAX_CHANGES_PER_WEEK} of ${MAX_CHANGES_PER_WEEK} changes remaining this week).`,
      };
    }

    const history = getStoredHistory(`ph_username_changes_${userId}`);
    const remaining = Math.max(0, MAX_CHANGES_PER_WEEK - history.length);
    const allowed = history.length < MAX_CHANGES_PER_WEEK;

    if (allowed) {
      return {
        allowed: true,
        remaining,
        max: MAX_CHANGES_PER_WEEK,
        history,
        message: `Username can be changed twice per week (${remaining} of ${MAX_CHANGES_PER_WEEK} changes remaining this week).`,
      };
    }

    const oldest = Math.min(...history);
    const nextAvailableMs = oldest + ROLLING_WINDOW_MS;
    const dateFormatted = formatNextAvailableDate(nextAvailableMs);
    const timeRemaining = formatTimeRemaining(nextAvailableMs);

    return {
      allowed: false,
      remaining: 0,
      max: MAX_CHANGES_PER_WEEK,
      history,
      nextAvailableMs,
      nextAvailableDateFormatted: dateFormatted,
      timeRemainingFormatted: timeRemaining,
      message: `Weekly limit reached (0 of ${MAX_CHANGES_PER_WEEK} changes remaining). Next username change available in ${timeRemaining} (${dateFormatted}).`,
    };
  },

  /**
   * Record that a name change occurred. Returns updated history array.
   */
  recordNameChange(userId: string): number[] {
    if (!userId) return [];
    const history = getStoredHistory(`ph_name_changes_${userId}`);
    history.push(Date.now());
    const cleaned = cleanHistory(history);
    setStoredHistory(`ph_name_changes_${userId}`, cleaned);
    return cleaned;
  },

  /**
   * Record that a username change occurred. Returns updated history array.
   */
  recordUsernameChange(userId: string): number[] {
    if (!userId) return [];
    const history = getStoredHistory(`ph_username_changes_${userId}`);
    history.push(Date.now());
    const cleaned = cleanHistory(history);
    setStoredHistory(`ph_username_changes_${userId}`, cleaned);
    return cleaned;
  },

  /**
   * Seed history from existing user profile if localStorage is empty.
   */
  syncFromUser(userId: string, nameHistory?: string[], usernameHistory?: string[]): void {
    if (!userId) return;
    if (nameHistory && nameHistory.length > 0) {
      const existing = getStoredHistory(`ph_name_changes_${userId}`);
      if (existing.length === 0) {
        setStoredHistory(`ph_name_changes_${userId}`, cleanHistory(nameHistory));
      }
    }
    if (usernameHistory && usernameHistory.length > 0) {
      const existing = getStoredHistory(`ph_username_changes_${userId}`);
      if (existing.length === 0) {
        setStoredHistory(`ph_username_changes_${userId}`, cleanHistory(usernameHistory));
      }
    }
  },
};
