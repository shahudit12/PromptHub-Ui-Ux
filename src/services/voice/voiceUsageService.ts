/**
 * src/services/voice/voiceUsageService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Daily Voice Usage Limiter & Quota Service (30 Minutes / User / Day).
 *
 * Enforces:
 * - 30 minutes (1,800 seconds) maximum voice conversation per calendar day.
 * - Tracks elapsed seconds locally per day and synchronizes with workspace state.
 * - Automatically cuts off voice streaming once quota is depleted to prevent runaway costs.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const DAILY_VOICE_LIMIT_SECONDS = 1800; // 30 minutes = 1,800 seconds

export interface VoiceQuotaState {
  usedSeconds: number;
  remainingSeconds: number;
  formattedRemaining: string;
  isLimitReached: boolean;
  percentageUsed: number;
}

class VoiceUsageService {
  constructor() {
    this.cleanupLegacyKeys();
  }

  /**
   * Remove any stale contaminated keys from the background timer bug so users start clean
   */
  private cleanupLegacyKeys(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const today = new Date().toISOString().slice(0, 10);
      const currentPrefix = 'ph_voice_usage_v2_';
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('ph_voice_usage_') && (!k.startsWith(currentPrefix) || !k.endsWith(today))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
  }

  private getStorageKey(userId?: string): string {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const uid = userId || 'anonymous_user';
    return `ph_voice_usage_v2_${uid}_${today}`;
  }

  public getUsedSeconds(userId?: string): number {
    try {
      const key = this.getStorageKey(userId);
      const raw = localStorage.getItem(key);
      const parsed = raw ? parseInt(raw, 10) : 0;
      return isNaN(parsed) ? 0 : Math.max(0, parsed);
    } catch {
      return 0;
    }
  }

  public recordUsage(seconds: number, userId?: string): VoiceQuotaState {
    const current = this.getUsedSeconds(userId);
    const updated = Math.min(DAILY_VOICE_LIMIT_SECONDS, current + seconds);
    try {
      const key = this.getStorageKey(userId);
      localStorage.setItem(key, updated.toString());
    } catch {}
    return this.getQuotaState(userId);
  }

  public getQuotaState(userId?: string): VoiceQuotaState {
    const usedSeconds = this.getUsedSeconds(userId);
    const remainingSeconds = Math.max(0, DAILY_VOICE_LIMIT_SECONDS - usedSeconds);
    const isLimitReached = remainingSeconds <= 0;
    const percentageUsed = Math.min(100, Math.round((usedSeconds / DAILY_VOICE_LIMIT_SECONDS) * 100));

    const minutesLeft = Math.floor(remainingSeconds / 60);
    const secondsLeft = remainingSeconds % 60;
    const formattedRemaining = isLimitReached
      ? '0m (Limit reached)'
      : minutesLeft > 0
      ? `${minutesLeft}m ${secondsLeft}s left today`
      : `${secondsLeft}s left today`;

    return {
      usedSeconds,
      remainingSeconds,
      formattedRemaining,
      isLimitReached,
      percentageUsed,
    };
  }

  public resetQuota(userId?: string): void {
    try {
      const key = this.getStorageKey(userId);
      localStorage.removeItem(key);
    } catch {}
  }
}

export const voiceUsageService = new VoiceUsageService();
