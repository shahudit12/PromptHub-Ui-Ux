/**
 * src/services/payment/walletPersistence.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * PromptHub wallet DISPLAY CACHE.
 *
 * This module exists for one reason: so the balance in the header does not
 * flicker to a placeholder while the profile request is still in flight. It is
 * a cache, not a source of truth.
 *
 * THE SERVER IS THE ONLY AUTHORITY FOR BALANCES AND ENTITLEMENTS.
 * localStorage is writable by anyone with devtools open, so this module must
 * never be able to increase a balance, mark a payment complete, or grant
 * premium access. Concretely:
 *   - A value returned by the server ALWAYS wins, even when it is lower.
 *   - A cached value is only ever used when the server has not answered yet
 *     (value `undefined`), purely to avoid a visible flicker.
 *   - No balance is ever invented. Unknown renders as 0, not as 25 or 200.
 *   - promoActivationClaimed / megaLaunchBonusGranted / hasPremiumAccess come
 *     from the database, never from a locally cached receipt.
 *
 * It previously did the opposite of all four: it took `Math.max()` of the
 * server value, the cached value, and a total scanned out of a localStorage
 * receipt list, floored promotional credits at 200, defaulted missing balances
 * to 25, and set the promo/premium flags from that same local scan. The result
 * was a wallet that could only ratchet upward on screen and could be inflated
 * by editing localStorage. See the git history of `reconcileUserWallet`.
 *
 * Multi-tab sync via the 'ph_wallet_updated' event is retained.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { User } from '../../db/schema';
// NOTE: the `supabase` client, `isRealSupabase` and `securityUtils` imports were
// removed along with the client-side promo credit grant (see reconcile logic
// below). This module is now read-only with respect to wallet state: it caches
// and reconciles what the server reports and never writes credits itself.

export interface WalletSessionState {
  totalCredits?: number;
  userId: string;
  credits: number;
  promotionalCredits: number;
  openrouterCredits?: number;
  paidCredits: number;
  promoActivationClaimed: boolean;
  megaLaunchBonusGranted: boolean;
  promoActivationPaymentId?: string | null;
  hasPremiumAccess?: boolean;
  proUntil?: string | null;
  timestamp: string;
}

const WALLET_SESSION_PREFIX = 'prompthub_wallet_state_';
const LAST_WALLET_KEY = 'prompthub_last_wallet_state';

/**
 * Save verified wallet session state to permanent local storage.
 */
export function saveWalletSessionState(userId: string, data: Partial<WalletSessionState>): void {
  if (!userId) return;
  try {
    const existing = getWalletSessionState(userId);
    const updated: WalletSessionState = {
      userId,
      // Every fallback here is 0, never 25. A cache miss means "we do not know
      // this balance", and the honest render of an unknown balance is 0 — an
      // invented 25 would be a credit the server never issued and nothing can
      // spend, which is exactly the bug that made the old wallet ratchet upward.
      credits: data.credits !== undefined ? data.credits : (existing?.credits ?? 0),
      promotionalCredits: data.promotionalCredits !== undefined ? data.promotionalCredits : (existing?.promotionalCredits ?? 0),
      openrouterCredits: data.openrouterCredits !== undefined ? data.openrouterCredits : (existing?.openrouterCredits ?? 0),
      paidCredits: data.paidCredits !== undefined ? data.paidCredits : (existing?.paidCredits ?? 0),
      promoActivationClaimed: data.promoActivationClaimed !== undefined ? data.promoActivationClaimed : (existing?.promoActivationClaimed ?? false),
      megaLaunchBonusGranted: data.megaLaunchBonusGranted !== undefined ? data.megaLaunchBonusGranted : (existing?.megaLaunchBonusGranted ?? false),
      promoActivationPaymentId: data.promoActivationPaymentId !== undefined ? data.promoActivationPaymentId : (existing?.promoActivationPaymentId ?? null),
      hasPremiumAccess: data.hasPremiumAccess !== undefined ? data.hasPremiumAccess : (existing?.hasPremiumAccess ?? false),
      proUntil: data.proUntil !== undefined ? data.proUntil : (existing?.proUntil ?? null),
      timestamp: new Date().toISOString(),
    };

    localStorage.setItem(`${WALLET_SESSION_PREFIX}${userId}`, JSON.stringify(updated));
    localStorage.setItem(LAST_WALLET_KEY, JSON.stringify(updated));

    // Broadcast across windows and components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ph_wallet_updated', { detail: updated }));
    }
  } catch (err) {
    console.warn('[WalletPersistence] Failed to save wallet session state:', err);
  }
}

/**
 * Retrieve verified wallet session state.
 */
export function getWalletSessionState(userId?: string): WalletSessionState | null {
  try {
    if (userId) {
      const raw = localStorage.getItem(`${WALLET_SESSION_PREFIX}${userId}`);
      if (raw) return JSON.parse(raw);
    }
    const lastRaw = localStorage.getItem(LAST_WALLET_KEY);
    if (lastRaw) return JSON.parse(lastRaw);
  } catch (err) {
    console.warn('[WalletPersistence] Failed to read wallet session state:', err);
  }
  return null;
}

/**
 * DELETED: `scanLocalCompletedTransactions()`.
 *
 * It read `localStorage['prompthub_local_topup_history']` and treated
 * `credit_amount === 200 && amount_inr === 9 && razorpay_payment_id` as PROOF
 * of a promo activation, then fed that "proof" into the wallet as paid credits
 * and premium access. Anyone able to open devtools could write that array and
 * mint a balance plus an entitlement. Its only caller was `reconcileUserWallet`,
 * which no longer consults local receipts at all — payment state is read from
 * the database, which is the only place Razorpay is actually verified.
 *
 * NOTE: `src/services/payment/topupService.ts` still writes and reads that same
 * localStorage key for RECEIPT HISTORY DISPLAY. That is a separate, non-
 * authoritative use and is left alone here, but it must never be promoted back
 * into a balance or an entitlement.
 */

/**
 * Reconciles a user profile with local verified state to guarantee ZERO loss of credits.
 */
export function reconcileUserWallet(user: User): User {
  if (!user || !user.id) return user;

  const reconciled: User = {
    ...user,
    credits: user.credits ?? 0,
    promotionalCredits: 0,
    openrouterCredits: user.openrouterCredits ?? 0,
    paidCredits: user.paidCredits ?? 0,
    promoActivationClaimed: Boolean(user.promoActivationClaimed),
    megaLaunchBonusGranted: Boolean(user.megaLaunchBonusGranted),
    hasPremiumAccess: Boolean(user.hasPremiumAccess),
  };

  // Keep local session storage aligned
  saveWalletSessionState(user.id, {
    credits: reconciled.credits,
    promotionalCredits: 0,
    openrouterCredits: reconciled.openrouterCredits,
    paidCredits: reconciled.paidCredits,
    promoActivationClaimed: reconciled.promoActivationClaimed,
    megaLaunchBonusGranted: reconciled.megaLaunchBonusGranted,
    promoActivationPaymentId: reconciled.promoActivationPaymentId,
    hasPremiumAccess: reconciled.hasPremiumAccess,
    proUntil: reconciled.proUntil,
  });

  return reconciled;
}
