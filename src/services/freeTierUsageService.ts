/**
 * src/services/freeTierUsageService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Free Tier Daily Execution & Rate Limiting Service for PromptHub Studio.
 *
 * RULES:
 * 1. Free tier users without BYOK (no connected personal API keys) are strictly
 *    limited to 3 I/O runs per calendar day.
 * 2. Users with at least one active BYOK key have UNLIMITED free runs (0 platform credits).
 * 3. Users on paid plans or paying with wallet credits have UNLIMITED runs.
 * 4. Daily usage is tracked by UTC date key (e.g. "2026-10-22").
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface FreeTierLimitStatus {
  allowed: boolean;
  usedToday: number;
  maxRuns: number;
  remaining: number;
  isExempt: boolean;
  exemptionReason?: 'byok' | 'paid_plan' | 'paid_model';
}

const STORAGE_PREFIX = 'ph_daily_free_runs_';
export const FREE_TIER_DAILY_LIMIT = 3;

/**
 * Gets the current ISO calendar date string (YYYY-MM-DD).
 */
export function getTodayDateKey(): string {
  try {
    return new Date().toISOString().split('T')[0];
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

/**
 * Gets the number of free runs executed today.
 */
export function getDailyFreeRunsCount(): number {
  try {
    const key = `${STORAGE_PREFIX}${getTodayDateKey()}`;
    const val = localStorage.getItem(key);
    if (!val) return 0;
    const num = parseInt(val, 10);
    return Number.isFinite(num) && num >= 0 ? num : 0;
  } catch {
    return 0;
  }
}

/**
 * Increments the daily run counter for free tier users.
 */
export function recordFreeRunExecution(): number {
  try {
    const todayKey = getTodayDateKey();
    const currentKey = `${STORAGE_PREFIX}${todayKey}`;
    const currentCount = getDailyFreeRunsCount();
    const newCount = currentCount + 1;
    localStorage.setItem(currentKey, String(newCount));

    // Clean up stale daily counters older than 7 days
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX) && key !== currentKey) {
          // Remove keys older than today
          localStorage.removeItem(key);
        }
      }
    } catch {}

    return newCount;
  } catch {
    return 1;
  }
}

/**
 * Checks whether the user is permitted to execute a run based on BYOK status,
 * subscription plan, model tier, and daily usage.
 */
export function checkFreeTierExecutionStatus(params: {
  hasByok: boolean;
  isPaidPlan?: boolean;
  isPaidModel?: boolean;
}): FreeTierLimitStatus {
  // 1. Paid models consume credits and are governed by wallet credit balance
  if (params.isPaidModel) {
    return {
      allowed: true,
      usedToday: getDailyFreeRunsCount(),
      maxRuns: FREE_TIER_DAILY_LIMIT,
      remaining: Math.max(0, FREE_TIER_DAILY_LIMIT - getDailyFreeRunsCount()),
      isExempt: true,
      exemptionReason: 'paid_model',
    };
  }

  // 2. Users with active BYOK keys have unlimited runs
  if (params.hasByok) {
    return {
      allowed: true,
      usedToday: getDailyFreeRunsCount(),
      maxRuns: FREE_TIER_DAILY_LIMIT,
      remaining: Infinity,
      isExempt: true,
      exemptionReason: 'byok',
    };
  }

  // 3. Paid plan subscribers have unlimited runs
  if (params.isPaidPlan) {
    return {
      allowed: true,
      usedToday: getDailyFreeRunsCount(),
      maxRuns: FREE_TIER_DAILY_LIMIT,
      remaining: Infinity,
      isExempt: true,
      exemptionReason: 'paid_plan',
    };
  }

  // 4. Free tier without BYOK: strictly capped at FREE_TIER_DAILY_LIMIT runs per day
  const used = getDailyFreeRunsCount();
  const remaining = Math.max(0, FREE_TIER_DAILY_LIMIT - used);
  const allowed = used < FREE_TIER_DAILY_LIMIT;

  return {
    allowed,
    usedToday: used,
    maxRuns: FREE_TIER_DAILY_LIMIT,
    remaining,
    isExempt: false,
  };
}
