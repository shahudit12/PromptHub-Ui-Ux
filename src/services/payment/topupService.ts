/**
 * PromptHub Wallet Top-Up & Financial Credit Engine — Standalone Client Mode
 * Zero database queries, zero payment credentials, zero external network requests
 */

import type { RazorpayPaymentSuccessPayload } from './razorpayClient';
import { saveWalletSessionState } from './walletPersistence';
import { securityUtils } from '../../utils/security';

export interface TopupOrderResponse {
  success: boolean;
  topupId: string;
  razorpayOrderId: string;
  order_id?: string;
  amountPaise: number;
  amountInr: number;
  currency: string;
  credits: number;
  conversionRate: number;
  keyId?: string;
  error?: string;
}

export interface TopupVerifyResponse {
  success: boolean;
  status: string;
  message?: string;
  orderId?: string;
  paymentId?: string;
  topupId?: string;
  creditsAdded?: number;
  walletBalance?: number;
  paidCredits?: number;
  amountInr?: number;
  isDuplicate?: boolean;
  requiresReconciliation?: boolean;
  verifiedAt?: string;
  error?: string;
}

export interface TopupCheckoutOptions {
  amountInr?: number;
  packageId?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  userId?: string;
  onSuccess: (payment: RazorpayPaymentSuccessPayload, verifyRes: TopupVerifyResponse) => void | Promise<void>;
  onFailure?: (error: any) => void;
  onDismiss?: () => void;
}

export interface TopupTransactionRecord {
  id: string;
  user_id: string;
  amount_inr: number;
  amount_paise: number;
  credit_amount: number;
  conversion_rate: number;
  currency: string;
  provider: string;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  completed_at?: string;
  created_at: string;
}

export interface WalletLedgerRecord {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  reference_id?: string;
  reference_type?: string;
  balance_before?: number;
  balance_after?: number;
  provider?: string;
  reason?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface LaunchPromoStatus {
  success: boolean;
  claimed: boolean;
  eligible: boolean;
  status: 'CLAIMED' | 'ELIGIBLE' | 'EXHAUSTED' | 'NOT_ELIGIBLE';
  claimsRemaining: number;
  credits: number;
  claimedAt?: string;
  error?: string;
}

const LOCAL_TOPUP_RECEIPTS_KEY = 'prompthub_topup_receipts';
const LOCAL_WALLET_LEDGER_KEY = 'prompthub_wallet_ledger';

export function saveLocalTopupReceipt(record: TopupTransactionRecord) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LOCAL_TOPUP_RECEIPTS_KEY);
    const list: TopupTransactionRecord[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(r => r.id !== record.id);
    filtered.unshift(record);
    localStorage.setItem(LOCAL_TOPUP_RECEIPTS_KEY, JSON.stringify(filtered.slice(0, 100)));
  } catch {}
}

export function saveLocalLedgerRecord(record: WalletLedgerRecord) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LOCAL_WALLET_LEDGER_KEY);
    const list: WalletLedgerRecord[] = raw ? JSON.parse(raw) : [];
    list.unshift(record);
    localStorage.setItem(LOCAL_WALLET_LEDGER_KEY, JSON.stringify(list.slice(0, 100)));
  } catch {}
}

export async function getLaunchPromoStatus(): Promise<LaunchPromoStatus> {
  return {
    success: true,
    claimed: false,
    eligible: true,
    status: 'ELIGIBLE',
    claimsRemaining: 24,
    credits: 500,
  };
}

export async function claimFirst30Promo(_payload?: { upiId?: string; notes?: string }): Promise<any> {
  return {
    success: true,
    status: 'CLAIMED',
    message: 'Welcome bonus promo applied (Demo Mode)',
    creditsAdded: 500,
  };
}

export async function adminApprovePromoClaim(_claimId: string): Promise<any> {
  return { success: true };
}

export async function adminRejectPromoClaim(_claimId: string, _reason?: string): Promise<any> {
  return { success: true };
}

export async function createTopupOrder(params: {
  amountInr?: number;
  packageId?: string;
  userId?: string;
}): Promise<TopupOrderResponse> {
  const amountInr = params.amountInr || 200;
  const credits = amountInr * 10;
  return {
    success: true,
    topupId: securityUtils.generateUUID(),
    razorpayOrderId: `order_topup_${Date.now()}`,
    amountInr,
    amountPaise: amountInr * 100,
    currency: 'INR',
    credits,
    conversionRate: 10,
    keyId: 'rzp_mock_demo',
  };
}

export async function verifyTopupPayment(payload: {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  topupId?: string;
}): Promise<TopupVerifyResponse> {
  return {
    success: true,
    status: 'COMPLETED',
    message: 'Demo top-up payment completed successfully',
    paymentId: payload.razorpay_payment_id,
    orderId: payload.razorpay_order_id,
    topupId: payload.topupId,
    creditsAdded: 1000,
    walletBalance: 6000,
    verifiedAt: new Date().toISOString(),
  };
}

export async function initiateTopupCheckout(options: TopupCheckoutOptions): Promise<void> {
  const amountInr = options.amountInr || 200;
  const credits = amountInr * 10;
  const paymentId = `pay_mock_${Date.now()}`;
  const orderId = `order_mock_${Date.now()}`;
  const topupId = securityUtils.generateUUID();

  const fakePayment: RazorpayPaymentSuccessPayload = {
    razorpay_payment_id: paymentId,
    razorpay_order_id: orderId,
    razorpay_signature: `sig_mock_${Date.now()}`,
  };

  const fakeVerify: TopupVerifyResponse = {
    success: true,
    status: 'COMPLETED',
    message: 'Demo top-up simulated successfully',
    paymentId,
    orderId,
    topupId,
    creditsAdded: credits,
    walletBalance: 5000 + credits,
    amountInr,
    verifiedAt: new Date().toISOString(),
  };

  // Record in local cache
  saveLocalTopupReceipt({
    id: topupId,
    user_id: options.userId || 'demo-user',
    amount_inr: amountInr,
    amount_paise: amountInr * 100,
    credit_amount: credits,
    conversion_rate: 10,
    currency: 'INR',
    provider: 'razorpay',
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    status: 'COMPLETED',
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });

  saveLocalLedgerRecord({
    id: `led_${Date.now()}`,
    user_id: options.userId || 'demo-user',
    amount: credits,
    transaction_type: 'CREDIT_PURCHASE',
    reference_id: paymentId,
    reference_type: 'topup',
    balance_before: 5000,
    balance_after: 5000 + credits,
    reason: `Wallet Top-Up (₹${amountInr})`,
    created_at: new Date().toISOString(),
  });

  if (options.userId) {
    saveWalletSessionState(options.userId, {
      totalCredits: 5000 + credits,
      paidCredits: credits,
    });
  }

  // Simulate network interaction
  await new Promise(r => setTimeout(r, 600));
  await options.onSuccess(fakePayment, fakeVerify);
}

export async function fetchUserTopupHistory(_userId?: string): Promise<TopupTransactionRecord[]> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_TOPUP_RECEIPTS_KEY);
    return raw ? JSON.parse(raw) : [
      {
        id: 'topup_sample_01',
        user_id: '00000000-0000-4000-a000-000000000001',
        amount_inr: 500,
        amount_paise: 50000,
        credit_amount: 5000,
        conversion_rate: 10,
        currency: 'INR',
        provider: 'razorpay',
        razorpay_order_id: 'order_sample_01',
        razorpay_payment_id: 'pay_sample_01',
        status: 'COMPLETED',
        completed_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
    ];
  } catch {
    return [];
  }
}

export async function fetchWalletLedger(_userId?: string): Promise<WalletLedgerRecord[]> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_WALLET_LEDGER_KEY);
    return raw ? JSON.parse(raw) : [
      {
        id: 'led_sample_01',
        user_id: '00000000-0000-4000-a000-000000000001',
        amount: 5000,
        transaction_type: 'TOPUP',
        reference_id: 'pay_sample_01',
        reference_type: 'razorpay',
        balance_before: 0,
        balance_after: 5000,
        reason: 'Initial Starter Credits Top-Up',
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
    ];
  } catch {
    return [];
  }
}

export async function reconcilePaymentWithServer(_identifier?: string, _userId?: string): Promise<{
  reconciled: boolean;
  status: string;
  message: string;
  success: boolean;
  creditsAdded: number;
  walletBalance: number;
  promotionalCredits: number;
  paidCredits: number;
  error?: string;
}> {
  return {
    reconciled: true,
    status: 'COMPLETED',
    message: 'Payment synchronized (Standalone Mode)',
    success: true,
    creditsAdded: 500,
    walletBalance: 5500,
    promotionalCredits: 500,
    paidCredits: 5000,
  };
}
