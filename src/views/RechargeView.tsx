import React, { useState, useEffect, useId } from 'react';
import {
  Wallet,
  Zap,
  Sparkles,
  CreditCard,
  History,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  ArrowRight,
  Loader2,
  TrendingUp,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { initiateTopupCheckout, fetchUserTopupHistory, fetchWalletLedger, reconcilePaymentWithServer, type TopupTransactionRecord, type WalletLedgerRecord } from '../services/payment/topupService';
import {
  getPreferredGateway,
  setPreferredGateway,
  type PaymentGateway,
} from '../services/payment/payuClient';
import { PaymentGatewaySelector } from '../components/payment/PaymentGatewaySelector';
import {
  MIN_TOPUP_AMOUNT_INR,
  MAX_TOPUP_AMOUNT_INR,
  formatInr,
  calculateEstimatedCredits
} from '../config/billingConfig';
import { trackOrderCompleted as trackMixpanelOrderCompleted } from '../lib/mixpanelEvents';
import { LaunchPromotionPricingCard } from '../components/LaunchPromotionPricingCard';

export const RechargeView: React.FC = () => {
  const { user, updateUser, showToast, setShowAuthModal, isLoggedIn, setActiveTab: navigateToTab } = useApp();
  const [activeTab, setActiveTab] = useState<'recharge' | 'history' | 'ledger'>('recharge');
  const [selectedInr, setSelectedInr] = useState<number>(500);
  const [customInr, setCustomInr] = useState<string>('500');
  const [agreeTerms, setAgreeTerms] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [topupHistory, setTopupHistory] = useState<TopupTransactionRecord[]>([]);
  const [ledgerRecords, setLedgerRecords] = useState<WalletLedgerRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'pending'; text: string } | null>(null);
  const [reconcileInputId, setReconcileInputId] = useState<string>('');
  const [isReconciling, setIsReconciling] = useState<boolean>(false);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway>(() => getPreferredGateway());

  const handleSelectGateway = (gw: PaymentGateway) => {
    setSelectedGateway(gw);
    setPreferredGateway(gw);
  };

  const customInputId = useId();

  // Load history & sync live balances on mount or tab change
  useEffect(() => {
    if (isLoggedIn && user?.id) {
      loadData();
    }
  }, [isLoggedIn, user?.id, activeTab]);

  const loadData = async () => {
    if (!user?.id) return;
    setIsLoadingHistory(true);
    try {
      // 2. Query transactions
      if (activeTab === 'history' || activeTab === 'recharge') {
        const topups = await fetchUserTopupHistory(user.id);
        setTopupHistory(topups);

        // Auto-reconcile check if user has any pending top-ups
        const hasPending = topups.some((t) => t.status === 'PENDING');
        if (hasPending) {
          reconcilePaymentWithServer(undefined, user.id)
            .then((res) => {
              if (res.success && res.creditsAdded && res.creditsAdded > 0) {
                updateUser({
                  credits: res.walletBalance ?? (user.credits ?? 0),
                  promotionalCredits: res.promotionalCredits ?? 0,
                  paidCredits: res.paidCredits ?? user.paidCredits,
                } as any);
                fetchUserTopupHistory(user.id)
                  .then((updated) => setTopupHistory(updated))
                  .catch(() => {});
              }
            })
            .catch(() => {});
        }
      }

      if (activeTab === 'ledger') {
        const ledger = await fetchWalletLedger(user.id);
        setLedgerRecords(ledger);
      }
    } catch (err) {
      console.warn('[RechargeView] Fetch history error:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleReconcilePayment = async (overrideId?: string) => {
    const targetId = (overrideId || reconcileInputId).trim();
    if (targetId && !targetId.startsWith('pay_') && !targetId.startsWith('order_')) {
      showToast('Please enter a valid Razorpay Payment ID (pay_...) or Order ID (order_...).', 'error');
      return;
    }

    if (!user?.id) {
      showToast('Please sign in to reconcile payments.', 'info');
      setShowAuthModal(true);
      return;
    }

    setIsReconciling(true);
    try {
      const res = await reconcilePaymentWithServer(targetId || undefined, user.id);
      if (res.success) {
        if (res.creditsAdded && res.creditsAdded > 0) {
          updateUser({
            credits: res.walletBalance ?? (user.credits ?? 0),
            promotionalCredits: res.promotionalCredits ?? 0,
            paidCredits: res.paidCredits ?? user.paidCredits,
          } as any);

          showToast(res.message || `🎉 Payment verified! +${res.creditsAdded} credits added to your account.`, 'success');
          setStatusMessage({
            type: 'success',
            text: res.message || `Payment verified. Credits added to your balance.`,
          });
          setReconcileInputId('');
          await loadData();
        } else {
          showToast(res.message || 'No uncredited captured payments found.', 'info');
        }
      } else {
        showToast(res.error || 'Payment reconciliation failed. Please verify the ID.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error reconciling payment.', 'error');
    } finally {
      setIsReconciling(false);
    }
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw === '') {
      setCustomInr('');
      setSelectedInr(0);
      setStatusMessage(null);
      return;
    }
    const num = Number(raw);
    if (!isNaN(num)) {
      if (num > MAX_TOPUP_AMOUNT_INR) {
        setCustomInr(MAX_TOPUP_AMOUNT_INR.toString());
        setSelectedInr(MAX_TOPUP_AMOUNT_INR);
        showToast(`Maximum recharge allowed is ₹${MAX_TOPUP_AMOUNT_INR.toLocaleString('en-IN')}.`, 'error');
      } else {
        setCustomInr(raw);
        setSelectedInr(num);
      }
    }
    setStatusMessage(null);
  };

  const parsedInr = Number(customInr) || selectedInr || 0;
  const estimatedCredits = calculateEstimatedCredits(parsedInr);
  const isValidAmount = parsedInr >= MIN_TOPUP_AMOUNT_INR && parsedInr <= MAX_TOPUP_AMOUNT_INR;

  const handlePay = async (overrideInr?: number, packageId?: string) => {
    if (!isLoggedIn) {
      showToast('Please sign in or create an account to top up credits.', 'info');
      setShowAuthModal(true);
      return;
    }

    const effectiveInr = overrideInr || parsedInr;

    if (!packageId && (effectiveInr < MIN_TOPUP_AMOUNT_INR || effectiveInr > MAX_TOPUP_AMOUNT_INR)) {
      showToast(`Please enter an amount between ${formatInr(MIN_TOPUP_AMOUNT_INR)} and ${formatInr(MAX_TOPUP_AMOUNT_INR)}.`, 'error');
      return;
    }

    if (!agreeTerms) {
      showToast('Please agree to the Terms & Conditions to proceed.', 'info');
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      await initiateTopupCheckout({
        amountInr: effectiveInr,
        packageId,
        userName: user?.name || user?.username || '',
        userEmail: user?.email || '',
        userId: user?.id,
        onSuccess: async (payment, verifyRes) => {
          // The signature was cryptographically verified server-side, but that does
          // not always mean credits were settled. api/topup-verify.ts returns HTTP
          // 202 + requiresReconciliation (creditsAdded: 0) when settlement has not
          // completed, and isDuplicate when this order was already credited. Neither
          // may be reported as "+N credits added".
          if (verifyRes?.requiresReconciliation) {
            showToast(
              `Payment received (Txn: ${payment.razorpay_payment_id}), but credits are still being settled. No credits have been added yet.`,
              'info'
            );
            setStatusMessage({
              type: 'pending',
              text: `Your payment of ${formatInr(parsedInr)} was received and verified (Txn ID: ${payment.razorpay_payment_id}), but the credit settlement has not completed yet. Your money is safe. Credits usually appear within a few minutes — use "Reconcile Payment" with this Txn ID, or contact support with it if the balance does not update.`,
            });
            await loadData();
            setActiveTab('history');
            return;
          }

          if (verifyRes?.isDuplicate) {
            showToast(
              `This payment was already credited to your wallet. No additional credits were added. [Txn: ${payment.razorpay_payment_id}]`,
              'info'
            );
            setStatusMessage({
              type: 'pending',
              text: `Payment ${payment.razorpay_payment_id} had already been credited, so it was not counted twice. Your balance is unchanged from the earlier settlement.`,
            });
            await loadData();
            setActiveTab('history');
            return;
          }

          // The granted amount is whatever the server says it granted. This was
          // `verifyRes?.creditsAdded ?? estimatedCredits`, so a response that omitted
          // the field made the UI announce a CLIENT-CALCULATED credit grant the
          // server had never agreed to. The balances below fell back to
          // `currentTotal + addedCredits` for the same reason, inventing a wallet
          // balance from client arithmetic on top of a possibly stale local one.
          //
          // Wallet columns are written by server-side verification
          // (api/topup-verify.ts), which grants the credit amount stored on the
          // server-created order. Only the values it returns are applied here; when
          // it returns none, nothing is claimed and the balance is left to the next
          // authoritative refresh (loadData below).
          const addedCredits =
            typeof verifyRes?.creditsAdded === 'number' ? verifyRes.creditsAdded : null;

          if (typeof verifyRes?.walletBalance === 'number' || typeof verifyRes?.paidCredits === 'number') {
            updateUser({
              ...(typeof verifyRes.walletBalance === 'number' ? { credits: verifyRes.walletBalance } : {}),
              ...(typeof verifyRes.paidCredits === 'number' ? { paidCredits: verifyRes.paidCredits } : {}),
            } as any);
          }

          if (addedCredits === null) {
            showToast(
              `Payment verified (Txn: ${payment.razorpay_payment_id}). Your wallet is being updated.`,
              'success'
            );
            setStatusMessage({
              type: 'pending',
              text: `Payment verified (Txn ID: ${payment.razorpay_payment_id}). The server did not report the credited amount in this response, so your balance will refresh from your account shortly. Keep this Txn ID if you need support.`,
            });
          } else {
            showToast(
              `${formatInr(parsedInr)} top-up successful — ${addedCredits} credits added. [Txn: ${payment.razorpay_payment_id}]`,
              'success'
            );
            setStatusMessage({
              type: 'success',
              text: `Payment verified (Txn ID: ${payment.razorpay_payment_id}). ${addedCredits} credits added to your balance.`,
            });
          }

          trackMixpanelOrderCompleted({
            orderId: payment.razorpay_order_id || payment.razorpay_payment_id,
            amountInr: parsedInr,
            creditsAdded: addedCredits ?? 0,
            packageId: packageId || 'custom_topup',
            paymentMethod: 'razorpay',
          });

          // Refresh history and ledger
          await loadData();

          // Automatically switch to history tab so user sees receipt and transaction ID
          setActiveTab('history');
        },
        onFailure: (err: any) => {
          const message = err?.description || err?.message || 'Payment was declined or cancelled at the gateway.';
          showToast(message, 'error');
          setStatusMessage({
            type: 'error',
            text: `Payment could not be completed: ${message}. No credits were deducted.`,
          });
        },
        onDismiss: () => {
          showToast('Checkout dismissed.', 'info');
        },
      });
    } catch (err: any) {
      console.error('[RechargeView Checkout Error]:', err);
      showToast(err.message || 'Could not launch payment gateway', 'error');
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to initialize payment gateway.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const totalCredits = user?.credits ?? 0;
  const paidCredits = (user as any)?.paidCredits ?? (user as any)?.paid_credits ?? 0;
  const subscriptionCredits = Math.max(0, totalCredits - paidCredits);

  return (
    <div className="flex-1 overflow-y-auto bg-bg-primary text-text-primary p-4 sm:p-6 md:p-10 space-y-8 text-left select-text">

      {/* Top Banner Header */}
      <div className="max-w-5xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary-light border border-brand-primary/20 text-brand-primary text-xs font-semibold font-mono">
          <Wallet className="w-3.5 h-3.5" />
          <span>PromptHub Credit Wallet</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black font-display tracking-tight text-text-primary leading-tight">
          Recharge Credits &amp; Financial Ledger
        </h1>

        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-2xl">
          Top up your developer wallet with Indian Rupees (INR) at the standard rate of ₹1 = 2 PromptHub Credits (₹0.50 per credit). Paid credits never expire and power multi-model executions across OpenAI, Claude 3.7 Sonnet, DeepSeek R1, and Google Gemini.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-5xl mx-auto flex items-center p-1 rounded-xl bg-bg-tertiary border border-border-default text-xs font-semibold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('recharge')}
          className={`flex-1 py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
            activeTab === 'recharge'
              ? 'bg-bg-secondary text-text-primary shadow-xs font-bold'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Zap className="w-4 h-4 text-brand-primary" />
          <span>Top-Up Credits</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
            activeTab === 'history'
              ? 'bg-bg-secondary text-text-primary shadow-xs font-bold'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <History className="w-4 h-4 text-text-muted" />
          <span>Payment Receipts</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`flex-1 py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
            activeTab === 'ledger'
              ? 'bg-bg-secondary text-text-primary shadow-xs font-bold'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-text-muted" />
          <span>Usage Ledger</span>
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (2 Cols): Active Tab Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* TAB 1: RECHARGE FLOW */}
          {activeTab === 'recharge' && (
            <div className="bg-bg-secondary border border-border-default rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-brand-primary" />
                    <span>Select Top-Up Amount</span>
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-brand-primary-light text-brand-primary border border-brand-primary/20">
                    Standard Rate: ₹1 = 2 Credits
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  Choose a top-up bundle or enter a custom amount in INR.
                </p>
              </div>

              {/* Launch Promotional Pricing Packages */}
              <LaunchPromotionPricingCard
                onSelectPackage={(pkg) => {
                  setSelectedInr(pkg.priceInr);
                  setCustomInr(pkg.priceInr.toString());
                  handlePay(pkg.priceInr, pkg.packageId);
                }}
                isProcessing={isProcessing}
              />

              {/* Custom Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor={customInputId} className="text-xs font-semibold text-text-primary block">
                    Or enter custom INR amount:
                  </label>
                  <span className="text-[11px] font-mono text-text-muted font-semibold">Min ₹1 · Max ₹20,000</span>
                </div>
                <div className="flex items-center rounded-xl bg-bg-secondary border border-border-default px-4 py-2.5 focus-within:border-brand-primary focus-within:ring-1 focus-within:ring-brand-primary">
                  <span className="text-sm font-bold text-text-muted mr-2 font-mono">₹</span>
                  <input
                    id={customInputId}
                    type="text"
                    value={customInr}
                    onChange={handleCustomChange}
                    placeholder="Enter amount between ₹1 and ₹20,000"
                    className="w-full bg-transparent font-mono font-bold text-sm text-text-primary focus:outline-none"
                  />
                  <span className="text-xs font-mono text-text-muted shrink-0">INR</span>
                </div>

                {/* Validation Notice for Custom Input */}
                {!isValidAmount && parsedInr > 0 && (
                  <div className="text-[11px] font-mono text-rose-600 flex items-center gap-1 pt-0.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Enter an amount between ₹1 and ₹20,000.</span>
                  </div>
                )}
              </div>

              {/* Dynamic Calculation Summary */}
              <div className="p-4 rounded-xl bg-bg-secondary border border-border-default space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Payable Amount:</span>
                  <span className="font-bold font-mono text-text-primary">{formatInr(parsedInr || 0)} INR</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Conversion Rate:</span>
                  <span className="font-bold font-mono text-brand-primary">₹1 INR = 2 PromptHub Credits</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Credit Allocation:</span>
                  <span className="font-mono text-text-muted font-semibold">Margin-Protected Permanent Balance</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                  <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                    <span>Credits to be Added:</span>
                  </span>
                  <span className="text-lg font-black font-mono text-brand-primary dark:text-brand-accent">
                    +{estimatedCredits} Credits
                  </span>
                </div>
                <div className="text-[11px] text-text-muted leading-relaxed pt-1">
                  * Top-up credits are added permanently to your paid balance and never expire. Top-up does not change your subscription tier.
                </div>
              </div>

              {/* Status Notice */}
              {statusMessage && (
                <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/50 text-rose-900 dark:text-rose-200'
                }`}>
                  {statusMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{statusMessage.text}</span>
                </div>
              )}

              {/* Gateway Selector */}
              <PaymentGatewaySelector
                selectedGateway={selectedGateway}
                onSelectGateway={handleSelectGateway}
                disabled={isProcessing}
              />

              {/* Terms & Conditions Notice and Consent */}
              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 rounded border-border-default text-brand-primary focus:ring-brand-primary cursor-pointer"
                  />
                  <span className="text-xs font-medium text-text-primary">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => navigateToTab('legal')}
                      className="text-brand-primary underline hover:text-brand-primary-hi font-bold inline cursor-pointer"
                    >
                      Terms &amp; Conditions
                    </button>
                    .
                  </span>
                </label>

                <p className="text-[11px] text-text-muted leading-relaxed">
                  <strong className="font-semibold text-text-primary">Terms &amp; Conditions apply to all transactions.</strong> By proceeding with a top-up or payment, you agree to PromptHub&apos;s applicable Terms &amp; Conditions, including payment, credit usage, refunds, and transaction policies.
                </p>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => handlePay()}
                disabled={!isValidAmount || isProcessing || !agreeTerms}
                className="w-full py-3.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[48px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Opening Razorpay Secure Gateway...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 text-white" />
                    <span>Pay {formatInr(parsedInr || 0)} with Razorpay</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-text-muted pt-2">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-primary dark:text-brand-accent" />
                  <span>256-Bit Encrypted</span>
                </div>
                <div>UPI (GPay / PhonePe / Paytm)</div>
                <div>Credit &amp; Debit Cards</div>
                <div>NetBanking</div>
              </div>
            </div>
          )}

          {/* TAB 2: TOP-UP HISTORY */}
          {activeTab === 'history' && (
            <div className="bg-bg-secondary border border-border-default rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
                <div>
                  <h3 className="text-base font-bold text-text-primary">Top-Up &amp; Activation Receipts</h3>
                  <p className="text-xs text-text-secondary">Official receipts and payment status from Razorpay.</p>
                </div>
                <button
                  type="button"
                  onClick={loadData}
                  disabled={isLoadingHistory}
                  className="self-start sm:self-auto text-xs font-semibold px-3 py-1.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-text-primary flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                  <span>Sync Balance</span>
                </button>
              </div>

              {/* Payment ID Reconciler Tool */}
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default space-y-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <h4 className="text-xs font-bold text-text-primary">Restore or Verify a Razorpay Payment</h4>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  If you completed a payment on UPI, another device, or window and your credits haven&apos;t reflected yet, enter your Razorpay Payment ID (<code className="text-brand-primary">pay_...</code>) or Order ID (<code className="text-brand-primary">order_...</code>) below, or click to auto-check recent pending payments.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={reconcileInputId}
                    onChange={(e) => setReconcileInputId(e.target.value)}
                    placeholder="e.g. pay_... or order_... (or leave blank to check pending)"
                    className="flex-1 px-3 py-2 rounded-lg bg-bg-secondary border border-border-default text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => handleReconcilePayment()}
                    disabled={isReconciling}
                    className="px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 min-h-[44px]"
                  >
                    {isReconciling ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{reconcileInputId.trim() ? 'Verify & Add Credits' : 'Check Pending Payments'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {isLoadingHistory ? (
                <div className="py-16 text-center space-y-2 text-text-muted">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-primary mx-auto" />
                  <p className="text-xs">Loading transaction records...</p>
                </div>
              ) : topupHistory.length === 0 ? (
                <div className="py-12 text-center space-y-2 rounded-xl bg-bg-secondary border border-border-default p-4">
                  <Clock className="w-8 h-8 mx-auto text-text-muted/60" />
                  <p className="text-xs font-semibold text-text-primary">No Top-Up Transactions</p>
                  <p className="text-[11px] text-text-secondary">When you top up your wallet, receipts will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
                  {topupHistory.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3.5 rounded-xl bg-bg-secondary border border-border-default flex items-center justify-between hover:bg-bg-tertiary transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-text-primary">
                            Top-Up {formatInr(Number(tx.amount_inr))}
                          </span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase ${
                            tx.status === 'COMPLETED'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                              : tx.status === 'FAILED'
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
                              : 'bg-bg-tertiary text-text-muted border border-border-default'
                          }`}>
                            {tx.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-text-muted font-mono">
                          {new Date(tx.created_at).toLocaleString('en-IN')} · Ref: {tx.razorpay_payment_id || tx.razorpay_order_id}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          +{tx.credit_amount} pts
                        </div>
                        <div className="text-[10px] text-text-muted font-mono">
                          Rate: {tx.conversion_rate}x
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: USAGE LEDGER */}
          {activeTab === 'ledger' && (
            <div className="bg-bg-secondary border border-border-default rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-text-primary">Wallet Usage &amp; Deduction Ledger</h3>
                  <p className="text-xs text-text-secondary">Immutable audit log of all grants, top-ups, and AI model deductions.</p>
                </div>
                <button
                  type="button"
                  onClick={loadData}
                  disabled={isLoadingHistory}
                  className="text-xs text-brand-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {isLoadingHistory ? (
                <div className="py-16 text-center space-y-2 text-text-muted">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-primary mx-auto" />
                  <p className="text-xs">Loading ledger entries...</p>
                </div>
              ) : ledgerRecords.length === 0 ? (
                <div className="py-12 text-center space-y-2 rounded-xl bg-bg-secondary border border-border-default p-4">
                  <Info className="w-8 h-8 mx-auto text-text-muted/60" />
                  <p className="text-xs font-semibold text-text-primary">No Ledger Entries</p>
                  <p className="text-[11px] text-text-secondary">Ledger activity will record as you execute completions.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
                  {ledgerRecords.map((item) => {
                    const isCredit = item.amount > 0;
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-bg-secondary border border-border-default flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-text-primary">
                            {item.reason || item.transaction_type}
                          </div>
                          <div className="text-[11px] text-text-muted font-mono">
                            {new Date(item.created_at).toLocaleString('en-IN')} · Type: {item.transaction_type}
                          </div>
                        </div>
                        <div className={`font-mono font-bold text-right ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {isCredit ? `+${item.amount}` : item.amount} pts
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Wallet Stats & Information */}
        <div className="space-y-6">
          {/* Authoritative Balance Breakdown Card */}
          <div className="bg-bg-secondary border border-border-default rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted">
                Current Wallet Balance
              </h4>
              <button
                type="button"
                onClick={loadData}
                disabled={isLoadingHistory}
                className="text-[11px] font-mono text-brand-primary hover:underline flex items-center gap-1 cursor-pointer"
                title="Fetch latest balance from server"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-brand-primary-light border border-brand-primary/20 space-y-1">
              <span className="text-[11px] font-mono text-brand-primary font-semibold">Total Available Credits</span>
              <div className="text-3xl font-black font-mono text-text-primary">
                {totalCredits} <span className="text-xs font-mono font-normal text-text-muted">credits</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border-subtle text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-text-secondary flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Subscription (Refreshes monthly)</span>
                </span>
                <span className="font-mono font-bold text-text-primary">{subscriptionCredits}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-text-secondary flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-primary" />
                  <span>Paid Top-Up (Never expires)</span>
                </span>
                <span className="font-mono font-bold text-text-primary">{paidCredits}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-text-secondary flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-accent" />
                  <span>Free Models (Zero Credits)</span>
                </span>
                <span className="font-mono font-bold text-brand-primary dark:text-brand-accent">Free Forever</span>
              </div>
            </div>
          </div>

          {/* Model Consumption Guide Card */}
          <div className="bg-bg-secondary border border-border-default rounded-2xl p-6 shadow-xs space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted">
              Model Consumption Rates
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-bg-secondary">
                <span className="text-text-primary font-medium">OpenAI o1 (Heavy Reasoning)</span>
                <span className="font-mono font-bold text-brand-primary">10 Credits</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-bg-secondary">
                <span className="text-text-primary font-medium">Claude 3.7 Sonnet / DeepSeek R1</span>
                <span className="font-mono font-bold text-brand-primary">5-6 Credits</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-bg-secondary">
                <span className="text-text-primary font-medium">GPT-4o / Claude 3.5 Sonnet / Mistral</span>
                <span className="font-mono font-bold text-brand-primary">3 Credits</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-bg-secondary">
                <span className="text-text-primary font-medium">GPT-4o mini / Gemini Flash / Llama 3.3</span>
                <span className="font-mono font-bold text-brand-primary">1 Credit</span>
              </div>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              💡 Tip: Connect your own provider keys (BYOK) in API settings for zero-credit executions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RechargeView;
