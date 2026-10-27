import type { User, Prompt } from '../db/schema';

/**
 * Returns true if a prompt is a creator-owned paid prompt requiring individual purchase.
 * Creator earns 70% of the purchase amount, platform takes 30%.
 */
export const isPaidPrompt = (
  prompt: { priceInr?: number; price?: number } | null | undefined
): boolean => {
  if (!prompt) return false;
  const price = Number(prompt.priceInr ?? prompt.price ?? 0);
  return price > 0;
};

/**
 * Returns true if a prompt is an official admin-managed premium prompt (not a paid community prompt).
 * Admin-managed premium prompts are included for subscribers or users who topped up ₹200+.
 */
export const isAdminPremiumPrompt = (
  prompt: { isPremium?: boolean; priceInr?: number; price?: number } | null | undefined
): boolean => {
  if (!prompt) return false;
  return Boolean(prompt.isPremium) && !isPaidPrompt(prompt);
};

/**
 * Returns true if a prompt is free to all users.
 */
export const isFreePrompt = (
  prompt: { isPremium?: boolean; priceInr?: number; price?: number } | null | undefined
): boolean => {
  return !isPaidPrompt(prompt) && !isAdminPremiumPrompt(prompt);
};

/**
 * Returns true ONLY if a user has an active, purchased subscription plan
 * (starter, pro, growth, studio, pro_plus, team, business, enterprise).
 */
export const isSubscribedUser = (user: User | null | undefined): boolean => {
  if (!user) return false;

  const paidPlans = ['starter', 'pro', 'growth', 'studio', 'pro_plus', 'team', 'business', 'enterprise'];
  const userPlan = (user.plan ?? '').toLowerCase();

  // Active paid plan check
  const isPaidPlan = paidPlans.includes(userPlan);
  if (!isPaidPlan && !user.hasPremiumAccess) {
    return false;
  }

  // If user has a proUntil expiration timestamp, verify it is still active
  if (user.proUntil) {
    const expiresAt = new Date(user.proUntil).getTime();
    if (expiresAt <= Date.now()) {
      return false; // Subscription expired
    }
  }

  return true;
};

/**
 * Returns true if the user has topped up ₹200 or more in credits.
 * (₹200 spend, or 100+ paid credits at ₹1 = 0.5cr, or holds the 'power_patron' badge).
 */
export const hasDone200Topup = (user: User | null | undefined): boolean => {
  if (!user) return false;

  if ((user.totalCreditSpendInr ?? 0) >= 200) {
    return true;
  }

  if ((user.paidCredits ?? 0) >= 100) {
    return true;
  }

  if (Array.isArray(user.badges) && user.badges.includes('power_patron')) {
    return true;
  }

  return false;
};

/**
 * Returns true if a user qualifies for access to Admin-Managed Premium Prompts:
 * 1. Admin users
 * 2. Active subscription plan subscribers (Starter, Pro, Growth, Studio, etc.)
 * 3. Users who have completed ₹200+ in credit top-ups
 */
export const hasPremiumPromptAccess = (user: User | null | undefined): boolean => {
  if (!user) return false;
  if (user.role === 'Admin') return true;
  if (isSubscribedUser(user)) return true;
  if (hasDone200Topup(user)) return true;
  if (user.hasPremiumAccess) return true;
  return false;
};

/**
 * Backward compatibility alias: checks if user has premium prompt access.
 */
export const isPaidUser = (user: User | null | undefined): boolean => {
  return hasPremiumPromptAccess(user);
};

/**
 * Checks whether a specific prompt is locked for a specific user.
 */
export const isPromptLockedForUser = (
  prompt: Prompt | null | undefined,
  user: User | null | undefined,
  userPurchases: Array<{ promptId?: string; prompt_id?: string; status?: string }> = []
): boolean => {
  if (!prompt) return false;

  // Free prompt: never locked
  if (isFreePrompt(prompt)) return false;

  // Unauthenticated users are locked for any non-free prompt
  if (!user) return true;

  // Author or Admin: always unlocked
  if (prompt.authorId === user.id || user.role === 'Admin') return false;

  // Check direct purchase
  const hasPurchased = userPurchases.some(
    p => (p.promptId === prompt.id || p.prompt_id === prompt.id) && p.status === 'completed'
  );
  if (hasPurchased) return false;

  // If it's a creator's Paid Prompt: must be purchased! Subscriptions do not bypass.
  if (isPaidPrompt(prompt)) {
    return true;
  }

  // If it's an admin Premium Prompt: unlocked if user has active plan or ₹200+ top-up
  if (isAdminPremiumPrompt(prompt)) {
    return !hasPremiumPromptAccess(user);
  }

  return false;
};

/**
 * Returns user-facing reason / call-to-action text for why access is locked.
 */
export const getPremiumBlockReason = (
  prompt?: { priceInr?: number; price?: number; isPremium?: boolean } | null
): string => {
  if (prompt && isPaidPrompt(prompt)) {
    const price = prompt.priceInr ?? prompt.price ?? 0;
    return `This is a Paid Marketplace Prompt (₹${price}). Purchase a license to unlock full instructions and fork into your studio (70% goes directly to the creator).`;
  }
  return 'This is an Official Premium Prompt — included free with any active subscription plan or a ₹200+ credit top-up.';
};
