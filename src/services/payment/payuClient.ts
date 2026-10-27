/**
 * PromptHub PayU Hosted Web Checkout Client — Standalone Frontend Mock Mode
 * Zero external payment gateway credentials, zero server dependencies
 */

export type PaymentGateway = 'razorpay' | 'payu';

export const PREFERRED_GATEWAY_KEY = 'ph_preferred_payment_gateway';
export const PENDING_PAYU_TXN_KEY = 'ph_pending_payu_tx';

export interface PayuCheckoutOptions {
  type: 'topup' | 'subscription' | 'marketplace';
  amountInr?: number;
  packageId?: string;
  planId?: string;
  billingCycle?: 'monthly' | 'yearly';
  promptId?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  userId?: string;
  returnPath?: string;
  onFailure?: (error: any) => void;
}

export interface PayuCreatePaymentResponse {
  success: boolean;
  action: string;
  txnid: string;
  amountInr: number;
  currency: string;
  params: Record<string, string>;
  error?: string;
  code?: string;
}

export interface PayuVerifyResponse {
  success: boolean;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  txnid: string;
  mihpayid?: string;
  type?: 'topup' | 'subscription' | 'marketplace';
  amountInr?: number;
  creditAmount?: number;
  planId?: string;
  promptId?: string;
  completedAt?: string;
  error?: string;
  message?: string;
  settled?: boolean;
}

export function getPreferredGateway(): PaymentGateway {
  if (typeof window === 'undefined') return 'razorpay';
  try {
    const stored = localStorage.getItem(PREFERRED_GATEWAY_KEY);
    if (stored === 'payu' || stored === 'razorpay') return stored;
  } catch {}
  return 'razorpay';
}

export function setPreferredGateway(gateway: PaymentGateway): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFERRED_GATEWAY_KEY, gateway);
  } catch {}
}

export async function createPayuPayment(options: PayuCheckoutOptions): Promise<PayuCreatePaymentResponse> {
  return {
    success: true,
    action: '#',
    txnid: `payu_${Date.now()}`,
    amountInr: options.amountInr || 100,
    currency: 'INR',
    params: {
      key: 'mock_payu_key',
      txnid: `payu_${Date.now()}`,
      amount: String(options.amountInr || 100),
    },
  };
}

export async function initiatePayuCheckout(options: PayuCheckoutOptions): Promise<void> {
  const amount = options.amountInr || 100;
  // Simulate delay
  await new Promise(r => setTimeout(r, 600));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('ph_payment_completed', {
        detail: {
          gateway: 'payu',
          amountInr: amount,
          type: options.type,
        },
      })
    );
  }
}

export async function verifyPayuTransaction(txnid: string): Promise<PayuVerifyResponse> {
  return {
    success: true,
    status: 'COMPLETED',
    txnid,
    completedAt: new Date().toISOString(),
    settled: true,
  };
}
