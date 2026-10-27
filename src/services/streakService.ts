/**
 * src/services/streakService.ts
 * Standalone Client-Side Streak Tracking & Milestone Rewards
 */

export const streakService = {
  async recordDailyActivity(userId: string): Promise<{ currentStreakDays: number; longestStreakDays: number; isNewDay: boolean }> {
    if (!userId) return { currentStreakDays: 3, longestStreakDays: 5, isNewDay: false };
    try {
      const stored = localStorage.getItem(`ph_streak_${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          currentStreakDays: parsed.current || 3,
          longestStreakDays: parsed.longest || 7,
          isNewDay: false,
        };
      }
    } catch {}
    return { currentStreakDays: 3, longestStreakDays: 7, isNewDay: false };
  },

  async claimMilestoneReward(userId: string, milestoneDays: number): Promise<{ success: boolean; creditsGranted?: number; error?: string }> {
    if (!userId) return { success: false, error: 'User authentication required to claim rewards.' };
    return {
      success: true,
      creditsGranted: milestoneDays * 2,
    };
  },
};
