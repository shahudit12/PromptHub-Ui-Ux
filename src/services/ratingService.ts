import { securityUtils } from '../utils/security';

const LOCAL_RATINGS_KEY = 'prompthub_user_ratings';

function getLocalRatings(): Record<string, number> {
  try {
    const stored = localStorage.getItem(LOCAL_RATINGS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveLocalRating(promptId: string, rating: number): void {
  try {
    const current = getLocalRatings();
    current[promptId] = rating;
    localStorage.setItem(LOCAL_RATINGS_KEY, JSON.stringify(current));
  } catch {}
}

export const ratingService = {
  canUserRate(promptId: any, _userId?: any, _price?: any, _extra?: any): { allowed: boolean; reason: string } {
    return { allowed: true, reason: '' };
  },
  canUserRatePromptSync(promptId: any, _userId?: any, _price?: any, _extra?: any): { allowed: boolean; reason: string } {
    return { allowed: true, reason: '' };
  },
  getLocalRating(promptId: string, _userId?: string): number {
    const local = getLocalRatings();
    return local[promptId] || 0;
  },
  async canUserRatePrompt(promptId: string, userId: string, price: number = 0): Promise<{ allowed: boolean; reason: string }> {
    if (!userId) {
      return { allowed: false, reason: 'Please sign in to rate this prompt.' };
    }
    const local = getLocalRatings();
    if (local[promptId] && local[promptId] > 0) {
      return { allowed: false, reason: 'You have already reviewed this prompt. Each account may submit only one review.' };
    }
    return { allowed: true, reason: '' };
  },

  async getUserRating(promptId: string, _userId: string): Promise<number> {
    const local = getLocalRatings();
    return local[promptId] || 0;
  },

  async submitRating(
    promptId: string,
    _userId: string,
    rating: number
  ): Promise<{ success: boolean; averageRating?: number; ratingCount?: number }> {
    const rateCheck = securityUtils.rateLimit('submit_rating', 2000);
    if (!rateCheck.allowed) {
      throw new Error(rateCheck.error || 'Please wait before rating again.');
    }

    if (rating < 0.5 || rating > 5) {
      throw new Error('Rating must be between 0.5 and 5.');
    }

    const existingLocal = getLocalRatings()[promptId];
    if (existingLocal && existingLocal > 0) {
      throw new Error('You have already reviewed this prompt. You cannot review twice.');
    }

    saveLocalRating(promptId, rating);
    return { success: true, averageRating: rating, ratingCount: 1 };
  },
};
