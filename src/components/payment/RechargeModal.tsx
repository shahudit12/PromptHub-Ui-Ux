import React, { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Zap,
  Sparkles,
  ArrowRight,
  Loader2,
  ShieldCheck,
  CreditCard,
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Wallet
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

import { initiateTopupCheckout, fetchUserTopupHistory, type TopupTransactionRecord } from '../../services/payment/topupService';
import {
  getPreferredGateway,
  setPreferredGateway,
  type PaymentGateway,
} from '../../services/payment/payuClient';
import { PaymentGatewaySelector } from './PaymentGatewaySelector';
import {
  TOPUP_BUNDLES,
  MIN_TOPUP_AMOUNT_INR,
  MAX_TOPUP_AMOUNT_INR,
  formatInr,
  calculateEstimatedCredits
} from '../../config/billingConfig';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAmount?: number;
}

export const RechargeModal: React.FC<RechargeModalProps> = ({
  isOpen,
  onClose,
  initialAmount = 500,
}) => {
  const { user, updateUser, showToast, logActivity, setShowAuthModal, isLoggedIn, setActiveTab } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'topup' | 'history'>('topup');
  const [selectedInr, setSelectedInr] = useState<number>(initialAmount);
  const [customInr, setCustomInr] = useState<string>(String(initialAmount));
  const [agreeTerms, setAgreeTerms] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<TopupTransactionRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway>(() => getPreferredGateway());

  const handleSelectGateway = (gw: PaymentGateway) => {
    setSelectedGateway(gw);
    setPreferredGateway(gw);
  };

  const customAmountInputId = useId();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  // Load transaction history
  const loadHistory = async () => {
    if (!user?.id) return;
    setIsLoadingHistory(true);
    try {
      const records = await fetchUserTopupHistory(user.id);
      setHistoryRecords(records);
    } catch (err: any) {
      console.error('[RechargeModal] Failed to load history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeSubTab === 'history') {
      loadHistory();
    }
  }, [isOpen, activeSubTab]);

  const handleSelectPreset = (inr: number) => {
    setSelectedInr(inr);
    setCustomInr(String(inr));
    setStatusMessage(null);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '');
    if (rawVal === '') {
      setCustomInr('');
      setSelectedInr(0);
      setStatusMessage(null);
      return;
    }
    const num = Number(rawVal);
    if (!isNaN(num)) {
      if (num > MAX_TOPUP_AMOUNT_INR) {
        setCustomInr(MAX_TOPUP_AMOUNT_INR.toString());
        setSelectedInr(MAX_TOPUP_AMOUNT_INR);
        showToast(`Maximum recharge allowed is ₹${MAX_TOPUP_AMOUNT_INR.toLocaleString('en-IN')}.`, 'error');
      } else {
        setCustomInr(rawVal);
        setSelectedInr(num);
      }
    }
    setStatusMessage(null);
  };

  const parsedInr = Number(customInr) || selectedInr || 0;
  const estimatedCredits = calculateEstimatedCredits(parsedInr);
  const isValidAmount = parsedInr >= MIN_TOPUP_AMOUNT_INR && parsedInr <= MAX_TOPUP_AMOUNT_INR;

  const handlePay = async () => {
    if (!isLoggedIn) {
      onClose();
      setShowAuthModal(true);
      return;
    }

    if (!isValidAmount) {
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
        amountInr: parsedInr,
        userName: user?.name || user?.username || '',
        userEmail: user?.email || '',
        userId: user?.id,
        onSuccess: async (payment, verifyRes) => {
          // NOTE: This fires inside Razorpay's callback, AFTER the outer await resolves.
          //
          // Verification succeeding is not the same as credits having been granted.
          // `api/topup-verify.ts` answers HTTP 202 with `requiresReconciliation:
          // true, creditsAdded: 0` when the payment is captured but settlement did
          // not complete, and `isDuplicate: true` when this order was already
          // credited. Neither may be reported as "+N credits added".
          if (verifyRes?.requiresReconciliation) {
            showToast(
              `Payment received (Txn: ${payment.razorpay_payment_id}), but credits are still being settled.`,
              'info'
            );
            setStatusMessage({
              type: 'info',
              text: `Your payment of ${formatInr(parsedInr)} was received and verified (Txn ID: ${payment.razorpay_payment_id}), but credit settlement has not completed yet. Your money is safe — credits usually appear within a few minutes. Keep this Txn ID and use "Reconcile Payment" on the Recharge page, or send it to support, if the balance does not update.`,
            });
            setIsProcessing(false);
            await loadHistory();
            setActiveSubTab('history');
            return;
          }

          if (verifyRes?.isDuplicate) {
            showToast(
              `This payment was already credited. No additional credits were added. [Txn: ${payment.razorpay_payment_id}]`,
              'info'
            );
            setStatusMessage({
              type: 'info',
              text: `Payment ${payment.razorpay_payment_id} had already been credited, so it was not counted twice. Your balance is unchanged from the earlier settlement.`,
            });
            setIsProcessing(false);
            await loadHistory();
            setActiveSubTab('history');
            return;
          }

          // The granted amount is whatever the server says it granted. This used to
          // be `verifyRes?.creditsAdded ?? estimatedCredits`, so when the server
          // omitted the field the user was told a CLIENT-CALCULATED number of
          // credits had been added to their wallet — a figure the server had never
          // agreed to. Likewise the balances below fell back to
          // `currentTotal + addedCredits`, inventing a wallet balance out of client
          // arithmetic. When the server does not state the amount, nothing is
          // claimed and the balance is left to the next authoritative refresh.
          const addedCredits =
            typeof verifyRes?.creditsAdded === 'number' ? verifyRes.creditsAdded : null;

          if (typeof verifyRes?.walletBalance === 'number' || typeof verifyRes?.paidCredits === 'number') {
            try {
              updateUser({
                ...(typeof verifyRes.walletBalance === 'number' ? { credits: verifyRes.walletBalance } : {}),
                ...(typeof verifyRes.paidCredits === 'number' ? { paidCredits: verifyRes.paidCredits } : {}),
              } as any);
            } catch {
              // RLS may reject the DB write — wallet reconciliation ensures credits stay
            }
          }

          if (addedCredits === null) {
            showToast(
              `Payment verified (Txn: ${payment.razorpay_payment_id}). Your wallet is being updated.`,
              'success'
            );
            setStatusMessage({
              type: 'info',
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
            logActivity({
              type: 'purchase',
              description: `Recharged wallet with ${formatInr(parsedInr)} (+${addedCredits} credits) via Razorpay [ID: ${payment.razorpay_payment_id}]`,
            });
          }

          setIsProcessing(false);
          // Refresh history and switch to history tab so user sees receipt and ID immediately
          await loadHistory();
          setActiveSubTab('history');
        },
        onFailure: (err: any) => {
          const message = err?.description || err?.message || 'Payment was declined or cancelled at the gateway.';
          showToast(message, 'error');
          setStatusMessage({
            type: 'error',
            text: `Payment could not be completed: ${message}. No credits were deducted or added.`,
          });
          setIsProcessing(false);
        },
        onDismiss: () => {
          showToast('Checkout dismissed.', 'info');
          setIsProcessing(false);
        },
      });
      // initiateTopupCheckout returns after opening Razorpay (callbacks fire later).
      // Do NOT reset isProcessing here — wait for a callback.
    } catch (err: any) {
      console.error('[RechargeModal Checkout Error]:', err);
      showToast(err.message || 'Could not launch payment gateway', 'error');
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to initialize payment gateway.',
      });
      setIsProcessing(false);
    }
  };


  const totalCredits = user?.credits ?? 0;
  const paidCredits = (user as any)?.paidCredits ?? (user as any)?.paid_credits ?? 0;
  const subscriptionCredits = Math.max(0, totalCredits - paidCredits);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[700] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl bg-bg-secondary border border-border-default rounded-2xl p-5 sm:p-7 shadow-2xl overflow-hidden text-left z-10 space-y-5 max-h-[92vh] overflow-y-auto custom-scrollbar"
        >
          {/* Top Bar / Close Button */}
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-primary-light border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-text-primary font-display flex items-center gap-2">
                  <span>Recharge Credit Wallet</span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary dark:text-brand-accent border border-brand-primary/20">
                    Instant
                  </span>
                </h2>
                <p className="text-xs text-text-secondary">
                  Add non-expiring credits with secure UPI, Cards, and NetBanking.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex rounded-xl bg-bg-secondary p-1 border border-border-default text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveSubTab('topup')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSubTab === 'topup'
                  ? 'bg-bg-secondary text-text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-brand-primary" />
              <span>Add Credits</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('history')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSubTab === 'history'
                  ? 'bg-bg-secondary text-text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <History className="w-3.5 h-3.5 text-text-muted" />
              <span>Payment History</span>
            </button>
          </div>

          {/* Current Balance Summary Bar */}
          <div className="p-3 rounded-xl bg-bg-secondary border border-border-default grid grid-cols-4 gap-2 text-center text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Total</span>
              <div className="flex items-baseline gap-1 justify-center">
                <span className="text-lg sm:text-xl font-black font-mono text-text-primary">{totalCredits}</span>
                <span className="text-[9px] text-text-muted font-mono">pts</span>
              </div>
            </div>
            <div className="space-y-0.5 border-l border-border-subtle pl-2.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-semibold">Subscription</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-bold font-mono text-text-primary">{subscriptionCredits}</span>
                <span className="text-[9px] text-text-muted font-mono">monthly</span>
              </div>
            </div>
            <div className="space-y-0.5 border-l border-border-subtle pl-2.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-brand-primary dark:text-brand-accent font-semibold">Paid Top-Up</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-bold font-mono text-brand-primary dark:text-brand-accent">{paidCredits}</span>
                <span className="text-[9px] text-text-muted font-mono">permanent</span>
              </div>
            </div>
            <div className="space-y-0.5 border-l border-border-subtle pl-2.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-semibold">Free Models</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-bold font-mono text-text-primary">0 Cr</span>
                <span className="text-[9px] text-brand-primary dark:text-brand-accent font-mono font-semibold">Free</span>
              </div>
            </div>
          </div>

          {/* ACTIVE TAB 1: TOP-UP FLOW */}
          {activeSubTab === 'topup' && (
            <div className="space-y-5">
              {/* Presets Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary">Choose Top-Up Amount:</span>
                  <span className="text-[11px] font-mono font-bold text-brand-primary">Rate: ₹1 = 2 Credits</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {TOPUP_BUNDLES.map((bundle) => {
                    const isSelected = selectedInr === bundle.inr && customInr === String(bundle.inr);
                    return (
                      <button
                        key={bundle.inr}
                        type="button"
                        onClick={() => handleSelectPreset(bundle.inr)}
                        className={`relative p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[58px] flex flex-col justify-between ${
                          isSelected
                            ? 'bg-brand-primary-light border-brand-primary ring-2 ring-brand-primary/20 shadow-xs'
                            : 'bg-bg-secondary border-border-default hover:border-border-hover hover:bg-bg-tertiary'
                        }`}
                      >
                        {bundle.badge && (
                          <span className="absolute -top-2 right-2 text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-brand-primary text-white">
                            {bundle.badge}
                          </span>
                        )}
                        <div className="text-base font-black font-mono text-text-primary">
                          {bundle.formattedInr}
                        </div>
                        <div className="text-xs font-semibold font-mono text-brand-primary dark:text-brand-accent flex items-center gap-1">
                          <Zap className="w-3 h-3 text-brand-primary dark:text-brand-accent" />
                          <span>+{bundle.credits} credits</span>
                        </div>
                      </button>
                    );
                  })}

                  {/* Custom Amount Preset Card */}
                  <div
                    onClick={() => {
                      const input = document.getElementById(customAmountInputId);
                      input?.focus();
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer min-h-[58px] flex flex-col justify-between ${
                      !TOPUP_BUNDLES.some(p => p.inr === selectedInr)
                        ? 'bg-brand-primary-light border-brand-primary ring-2 ring-brand-primary/20 shadow-xs'
                        : 'bg-bg-secondary border-border-default hover:border-border-hover'
                    }`}
                  >
                    <label htmlFor={customAmountInputId} className="text-[10px] font-mono uppercase text-text-muted cursor-pointer font-semibold">
                      Custom (₹1 – ₹20,000)
                    </label>
                    <div className="flex items-center">
                      <span className="text-sm font-bold text-text-muted mr-1 font-mono">₹</span>
                      <input
                        id={customAmountInputId}
                        type="text"
                        value={customInr}
                        onChange={handleCustomChange}
                        placeholder="e.g. 750"
                        className="w-full bg-transparent font-mono font-bold text-sm text-text-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Validation Notice for Custom Input */}
                {!isValidAmount && parsedInr > 0 && (
                  <div className="text-[11px] font-mono text-rose-600 flex items-center gap-1 pt-0.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Enter an amount between ₹1 and ₹20,000.</span>
                  </div>
                )}
              </div>

              {/* Dynamic Live Conversion Estimate Display */}
              <div className="p-4 rounded-xl bg-bg-secondary border border-border-default space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">You are paying:</span>
                  <span className="text-sm font-black font-mono text-text-primary">{formatInr(parsedInr || 0)} INR</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Conversion Rate:</span>
                  <span className="font-mono font-bold text-brand-primary dark:text-brand-accent">₹1 INR = 2 PromptHub Credits</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-brand-primary" />
                    <span className="text-xs font-bold text-text-primary">You will receive:</span>
                  </div>
                  <span className="text-base sm:text-lg font-black font-mono text-brand-primary dark:text-brand-accent">
                    +{estimatedCredits} Credits
                  </span>
                </div>
                <div className="text-[11px] text-text-muted leading-relaxed pt-1">
                  * Top-up credits are added permanently to your paid balance and never expire. Top-up does not alter your subscription plan.
                </div>
              </div>

              {/* Status Notice */}
              {statusMessage && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    statusMessage.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200'
                      : statusMessage.type === 'error'
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/50 text-rose-900 dark:text-rose-200'
                      : 'bg-bg-tertiary border-border-default text-text-primary'
                  }`}
                >
                  {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />}
                  {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                        setActiveTab('legal');
                      }}
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

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={handlePay}
                disabled={!isValidAmount || isProcessing || !agreeTerms}
                className="w-full py-3.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[48px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Opening Razorpay Gateway...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 text-white" />
                    <span>Pay {formatInr(parsedInr || 0)} with Razorpay</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>

              {/* Security & Payment Methods */}
              <div className="flex flex-wrap items-center justify-center gap-3.5 text-[11px] text-text-muted pt-1">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-primary dark:text-brand-accent" />
                  <span>256-Bit SSL Encrypted</span>
                </div>
                <span>UPI (GPay / PhonePe / Paytm)</span>
                <span>Cards &amp; NetBanking</span>
              </div>
            </div>
          )}

          {/* ACTIVE TAB 2: TRANSACTION HISTORY */}
          {activeSubTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary">Recent Top-Up Receipts:</span>
                <button
                  type="button"
                  onClick={loadHistory}
                  disabled={isLoadingHistory}
                  className="text-xs text-brand-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {isLoadingHistory ? (
                <div className="py-12 text-center space-y-2 text-text-muted">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-primary mx-auto" />
                  <p className="text-xs">Loading transaction history...</p>
                </div>
              ) : historyRecords.length === 0 ? (
                <div className="py-10 text-center space-y-2 rounded-xl bg-bg-secondary border border-border-default p-4">
                  <Clock className="w-8 h-8 mx-auto text-text-muted/60" />
                  <p className="text-xs font-semibold text-text-primary">No Top-Up Transactions</p>
                  <p className="text-[11px] text-text-secondary">When you top up your credit wallet, receipts will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                  {historyRecords.map((record) => (
                    <div
                      key={record.id}
                      className="p-3 rounded-xl bg-bg-secondary border border-border-default flex items-center justify-between text-xs hover:bg-bg-tertiary transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-text-primary">{formatInr(Number(record.amount_inr))}</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold uppercase ${
                            record.status === 'COMPLETED'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                              : record.status === 'FAILED'
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
                              : 'bg-bg-tertiary text-text-muted border border-border-default'
                          }`}>
                            {record.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-text-muted font-mono">
                          {new Date(record.created_at).toLocaleString('en-IN')} · Ref: {record.razorpay_payment_id || record.razorpay_order_id}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          +{record.credit_amount} pts
                        </div>
                        <div className="text-[10px] text-text-muted font-mono">
                          Rate: {record.conversion_rate}x
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default RechargeModal;
