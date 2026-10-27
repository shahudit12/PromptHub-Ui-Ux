import type { BadgeType, User, Prompt, BugReport } from '../db/schema';
import { isPaidUser } from '../utils/isPaidUser';

/**
 * Early Pioneer Cutoff Date: September 1, 2026 (1/09/2026)
 * Users who signed up / signed in before this date are awarded Early Pioneer.
 */
export const EARLY_PIONEER_CUTOFF_TIMESTAMP = new Date('2026-09-01T00:00:00+05:30').getTime();

/**
 * Checks if a user qualifies for the Early Pioneer badge.
 * Rule: User signs in / creates account before 1/09/2026.
 */
export function isEarlyPioneerEligible(joinDateOrCreatedAt?: string | null): boolean {
  if (!joinDateOrCreatedAt) {
    // If no explicit timestamp is stored, verify if current system time is before the cutoff
    return Date.now() < EARLY_PIONEER_CUTOFF_TIMESTAMP;
  }
  const timestamp = new Date(joinDateOrCreatedAt).getTime();
  if (isNaN(timestamp)) {
    return Date.now() < EARLY_PIONEER_CUTOFF_TIMESTAMP;
  }
  return timestamp < EARLY_PIONEER_CUTOFF_TIMESTAMP;
}

/**
 * Checks if a user qualifies for the Bug Hunter badge.
 * Rule: User reports a bug and the bug report is approved/resolved by an admin.
 */
export function isBugHunterEligible(
  userId?: string | null,
  bugReports?: BugReport[],
  existingBadges?: BadgeType[]
): boolean {
  if (existingBadges && existingBadges.includes('bug_hunter')) {
    return true;
  }
  if (!userId || !Array.isArray(bugReports) || bugReports.length === 0) {
    return false;
  }
  return bugReports.some(
    (b) =>
      b.userId === userId &&
      (b.status === 'resolved' || (b.status as string) === 'approved' || b.rewardGranted === true)
  );
}

/**
 * Calculates top prompt score based on engagement metrics:
 * Score = (Likes * 3) + (Forks * 5) + (Views * 0.1) + (Real Rating * 2)
 */
export function calculatePromptScore(prompt: Prompt): number {
  const rating = ((prompt.ratingCount || 0) > 0 && prompt.averageRating) ? prompt.averageRating : 0;
  return (
    (prompt.likesCount || 0) * 3 +
    (prompt.forksCount || 0) * 5 +
    (prompt.viewsCount || 0) * 0.1 +
    (rating * 2)
  );
}

/**
 * Checks if a user qualifies for the Top Creator badge.
 * Rule: User prompt is on top of the leaderboard (ranked #1 among public prompts).
 */
export function isTopCreatorEligible(
  userId?: string | null,
  prompts?: Prompt[]
): boolean {
  if (!userId || !Array.isArray(prompts) || prompts.length === 0) {
    return false;
  }

  const publicPrompts = prompts.filter((p) => p.visibility === 'public');
  if (publicPrompts.length === 0) return false;

  // Sort prompts to find the top leaderboard prompt
  const sorted = [...publicPrompts].sort((a, b) => calculatePromptScore(b) - calculatePromptScore(a));
  const topPrompt = sorted[0];

  return Boolean(topPrompt && topPrompt.authorId === userId);
}

/**
 * Resolves the accurate list of badges earned by a user according to the strict badge rules.
 * Never gives unearned badges.
 */
export function resolveUserBadges(params: {
  user?: User | null;
  prompts?: Prompt[];
  bugReports?: BugReport[];
}): BadgeType[] {
  const { user, prompts = [], bugReports = [] } = params;
  if (!user) return [];

  const earnedBadges = new Set<BadgeType>();

  // 1. Early Pioneer: account signed in / created before 1/09/2026
  const userJoinDate = user.joinDate || (user as any).createdAt || (user as any).created_at;
  if (isEarlyPioneerEligible(userJoinDate)) {
    earnedBadges.add('early_pioneer');
  }

  // 2. Bug Hunter: reported a bug that was approved by admin
  if (isBugHunterEligible(user.id, bugReports, user.badges)) {
    earnedBadges.add('bug_hunter');
  }

  // 3. Top Creator: user's prompt is on top of the leaderboard
  if (isTopCreatorEligible(user.id, prompts)) {
    earnedBadges.add('top_creator');
  }

  // 4. Plan and Subscription Badges: strictly based on active paid plan status
  const userPlan = (user.plan || 'free').toLowerCase();
  if (isPaidUser(user)) {
    if (userPlan === 'starter') {
      earnedBadges.add('starter_member');
    } else if (userPlan === 'growth') {
      earnedBadges.add('growth_member');
    } else if (userPlan === 'studio') {
      earnedBadges.add('studio_elite');
    } else {
      // pro, pro_plus, business, team, enterprise
      earnedBadges.add('pro_member');
    }
  } else {
    earnedBadges.add('free_explorer');
  }

  // 5. Power Patron: user purchased >= ₹200 in credits (₹200 = 400 credits at ₹0.50/credit)
  if (
    (user.paidCredits && user.paidCredits >= 400) ||
    (user.totalCreditSpendInr && user.totalCreditSpendInr >= 200) ||
    (Array.isArray(user.badges) && user.badges.includes('power_patron'))
  ) {
    earnedBadges.add('power_patron');
  }

  // Preserve Core Contributor if Admin
  if (user.role === 'Admin') {
    earnedBadges.add('core_contributor');
  }

  return Array.from(earnedBadges);
}
