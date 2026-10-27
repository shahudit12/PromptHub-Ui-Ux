/**
 * Platform Review Sanitization & Anti-Spam Guard
 *
 * Enforces authentic creator reviews by detecting:
 * - Keyboard mashing (e.g., 'klnlkknl', 'llhlhlhlhlhlhlh')
 * - Repeated consecutive character sequences
 * - Single review per account deduplication
 * - Out-of-bounds ratings
 */

export interface PlatformReview {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

/**
 * Detects whether a review comment or submission is spam, gibberish keyboard-mashing,
 * or mock test data.
 */
export function isSpamReview(rev: { comment?: string; userName?: string; rating?: number }): boolean {
  if (!rev) return true;
  const comment = (rev.comment || '').trim();

  if (comment) {
    // 1. Repeated consecutive identical characters 4+ times (e.g. 'aaaa', 'llll', 'hhhh')
    if (/(.)\1{3,}/.test(comment)) return true;

    // 2. Keyboard mashing: 6+ characters with vowel ratio < 0.15 or consonants only
    const letters = (comment.match(/[a-z]/gi) || []).length;
    const vowels = (comment.match(/[aeiou]/gi) || []).length;
    if (letters >= 6 && vowels / letters < 0.15) return true;

    // 3. Known keyboard spam / test mash patterns
    if (/klnl|knkl|fkkj|llhl|lkhl|asdf|qwer|zxcv/i.test(comment)) return true;

    // 4. Random punctuation inside words without spaces (e.g. 'b;knkl')
    if (/[a-z];[a-z]/i.test(comment)) return true;
  }

  // 5. Rating boundaries
  if (typeof rev.rating === 'number' && (rev.rating < 1 || rev.rating > 5)) {
    return true;
  }

  return false;
}

/**
 * Cleans a list of reviews:
 * - Drops any item that matches spam criteria
 * - Deduplicates reviews so that only the latest review per user/account is kept
 * - Sorts by createdAt descending
 */
export function sanitizeAndDeduplicateReviews(rawList: any[]): PlatformReview[] {
  if (!Array.isArray(rawList)) return [];
  const cleanList: PlatformReview[] = [];
  const seenUsers = new Set<string>();

  // Sort descending first so we retain the latest if duplicates exist
  const sorted = [...rawList].sort((a, b) => {
    const timeA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  for (const item of sorted) {
    if (!item || typeof item !== 'object') continue;
    if (isSpamReview(item)) continue;

    // Unique per user
    const uId = item.userId || item.userName;
    if (uId && seenUsers.has(uId)) continue;
    if (uId) seenUsers.add(uId);

    cleanList.push({
      id: String(item.id || ''),
      userId: String(item.userId || 'guest'),
      userName: String(item.userName || 'Verified Creator'),
      rating: Number(item.rating) || 5,
      comment: String(item.comment || '').trim(),
      createdAt: String(item.createdAt || new Date().toISOString()),
    });
  }

  return cleanList;
}
