// PromptHub Razorpay Client — Standalone Frontend Mock Mode
// Zero payment gateway credentials, zero external network requests

export interface RazorpayPaymentSuccessPayload {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayOrderResponse {
  success: boolean;
  order_id: string;
  id?: string;
  amount: number;
  currency: string;
  receipt?: string;
  key_id?: string;
  error?: string;
}

export interface RazorpayVerifyResponse {
  purchaseId?: string;
  orderId?: string;
  amountPaid?: number;
  success: boolean;
  message?: string;
  error?: string;
  payment_id?: string;
  order_id?: string;
  verified_at?: string;
  isDuplicate?: boolean;
  creditsAdded?: number;
  walletBalance?: number;
  paidCredits?: number;
  entitlements?: {
    plan?: string | null;
    creditsAdded?: number;
    proUntil?: string | null;
  };
}

export interface RazorpayCheckoutOptions {
  amountInPaise: number;
  currency?: string;
  name?: string;
  description?: string;
  receipt?: string;
  notes?: Record<string, string>;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  themeColor?: string;
  onSuccess: (payment: RazorpayPaymentSuccessPayload, verifyRes: RazorpayVerifyResponse) => void | Promise<void>;
  onFailure?: (error: Error | { code?: string; description?: string }) => void;
  onDismiss?: () => void;
}

export interface MarketplaceCheckoutOptions {
  themeColor?: string;
  amountInPaise?: number;
  promptId: string;
  sellerId?: string;
  promptTitle?: string;
  currency?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  onSuccess: (payment: RazorpayPaymentSuccessPayload, verifyRes: RazorpayVerifyResponse) => void | Promise<void>;
  onFailure?: (error: Error | { code?: string; description?: string }) => void;
  onDismiss?: () => void;
}

export async function loadRazorpayScript(): Promise<boolean> {
  return true;
}

export async function createRazorpayOrder(params: {
  amountInPaise: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrderResponse> {
  return {
    success: true,
    order_id: `order_mock_${Date.now()}`,
    amount: params.amountInPaise,
    currency: params.currency || 'INR',
    receipt: params.receipt || `rcpt_${Date.now()}`,
    key_id: 'rzp_mock_demo',
  };
}

export async function verifyRazorpayPayment(payload: {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  receipt?: string;
}): Promise<RazorpayVerifyResponse> {
  return {
    success: true,
    message: 'Demo payment simulated successfully',
    payment_id: payload.razorpay_payment_id,
    order_id: payload.razorpay_order_id,
    verified_at: new Date().toISOString(),
  };
}

export function resolveRazorpayKeyId(_serverKeyId?: string | null): string {
  return 'rzp_mock_demo';
}

export async function initiateRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<void> {
  const fakePayload: RazorpayPaymentSuccessPayload = {
    razorpay_payment_id: `pay_mock_${Date.now()}`,
    razorpay_order_id: `order_mock_${Date.now()}`,
    razorpay_signature: `sig_mock_${Date.now()}`,
  };

  const fakeVerify: RazorpayVerifyResponse = {
    success: true,
    message: 'Demo payment simulated successfully',
    payment_id: fakePayload.razorpay_payment_id,
    order_id: fakePayload.razorpay_order_id,
    verified_at: new Date().toISOString(),
    creditsAdded: Math.round(options.amountInPaise / 100),
    walletBalance: 5000 + Math.round(options.amountInPaise / 100),
  };

  // Brief delay to simulate payment gateway interaction
  await new Promise(r => setTimeout(r, 600));
  await options.onSuccess(fakePayload, fakeVerify);
}

export async function createMarketplaceOrder(params: {
  amountInPaise: number;
  promptId: string;
  sellerId?: string;
  promptTitle?: string;
  currency?: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrderResponse> {
  return {
    success: true,
    order_id: `order_mkt_${Date.now()}`,
    amount: params.amountInPaise,
    currency: params.currency || 'INR',
    key_id: 'rzp_mock_demo',
  };
}

export async function verifyMarketplacePayment(payload: {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  promptId: string;
  sellerId?: string;
}): Promise<RazorpayVerifyResponse> {
  return {
    success: true,
    message: 'Demo marketplace payment verified',
    payment_id: payload.razorpay_payment_id,
    order_id: payload.razorpay_order_id,
  };
}

export async function initiateMarketplaceCheckout(options: MarketplaceCheckoutOptions): Promise<void> {
  const fakePayload: RazorpayPaymentSuccessPayload = {
    razorpay_payment_id: `pay_mkt_${Date.now()}`,
    razorpay_order_id: `order_mkt_${Date.now()}`,
    razorpay_signature: `sig_mkt_${Date.now()}`,
  };

  const fakeVerify: RazorpayVerifyResponse = {
    success: true,
    message: 'Demo prompt purchase simulated successfully',
    payment_id: fakePayload.razorpay_payment_id,
    order_id: fakePayload.razorpay_order_id,
    verified_at: new Date().toISOString(),
  };

  await new Promise(r => setTimeout(r, 600));
  await options.onSuccess(fakePayload, fakeVerify);
}
