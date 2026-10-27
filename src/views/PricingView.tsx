import React, { useState, useEffect, useId } from 'react';
import { motion } from 'framer-motion';
import {
  Zap, 
  ChevronDown, 
  Loader2, 
  CreditCard,
  Wallet,
  History,
  CheckCircle2,
  Info,
  Receipt,
  FileText,
  AlertCircle,
  Shield,
  Headphones,
  Globe,
  Phone,
  MessageCircle,
  Mail,
  Cpu,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppFooter } from '../components/common/AppFooter';
import {
  MIN_TOPUP_AMOUNT_INR,
  MAX_TOPUP_AMOUNT_INR,
  formatInr,
  calculateEstimatedCredits,
  type PlanTier
} from '../config/billingConfig';
import {
  initiateTopupCheckout,
  fetchUserTopupHistory,
  fetchWalletLedger,
  type TopupTransactionRecord,
  type WalletLedgerRecord
} from '../services/payment/topupService';
import { initiateRazorpayCheckout } from '../services/payment/razorpayClient';
import {
  getPreferredGateway,
  setPreferredGateway,
  type PaymentGateway,
} from '../services/payment/payuClient';
import { PaymentGatewaySelector } from '../components/payment/PaymentGatewaySelector';
import {
  trackOrderCompleted as trackMixpanelOrderCompleted,
  trackSubscriptionUpgraded as trackMixpanelSubscriptionUpgraded,
} from '../lib/mixpanelEvents';
import { LaunchPromotionPricingCard } from '../components/LaunchPromotionPricingCard';
import { SubscriptionPlansSection } from '../components/pricing/SubscriptionPlansSection';
import { ByokLogo } from '../components/ByokLogo';

export const PricingView: React.FC = () => {
  const { showToast, isLoggedIn, setShowAuthModal, user, updateUser, logActivity, setActiveTab } = useApp();

  // ── Navigation & Accordion State ───────────────────────────────────────────
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // ── Top-Up & Wallet State ──────────────────────────────────────────────────
  const [selectedPackageId, setSelectedPackageId] = useState<string>('topup_starter');
  const [customInr, setCustomInr] = useState<string>('100');
  const [isProcessingTopup, setIsProcessingTopup] = useState(false);
  const [isProcessingPlan, setIsProcessingPlan] = useState(false);
  const [topupHistory, setTopupHistory] = useState<TopupTransactionRecord[]>([]);
  const [ledgerRecords, setLedgerRecords] = useState<WalletLedgerRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historySubTab, setHistorySubTab] = useState<'receipts' | 'ledger'>('receipts');
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway>(() => getPreferredGateway());

  const handleSelectGateway = (gw: PaymentGateway) => {
    setSelectedGateway(gw);
    setPreferredGateway(gw);
  };

  const customInputId = useId();

  // ── Load History & Sync Live Balances ──────────────────────────────────────
  useEffect(() => {
    if (isLoggedIn && user?.id) {
      loadWalletData();
    }
  }, [isLoggedIn, user?.id]);

  const loadWalletData = async () => {
    if (!user?.id) return;
    setIsLoadingHistory(true);
    try {
      const [topups, ledger] = await Promise.all([
        fetchUserTopupHistory(user.id),
        fetchWalletLedger(user.id),
      ]);
      setTopupHistory(topups);
      setLedgerRecords(ledger);
    } catch (err) {
      console.warn('[PricingView] Fetch wallet data error:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // ── Scroll to Section Anchor Helper ─────────────────────────────────────────
  const scrollToAnchor = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const container = el.closest('.overflow-y-auto') || document.querySelector('#main-content .overflow-y-auto') || document.getElementById('main-content');
    if (container && container instanceof HTMLElement) {
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const relativeTop = elRect.top - containerRect.top + container.scrollTop;
      container.scrollTo({ top: Math.max(0, relativeTop - 20), behavior: 'smooth' });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // ── On-Demand Credit Top-Up Checkout ───────────────────────────────────────
  const handleTopupCheckout = async (amountInr: number, packageId?: string) => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }

    if (!packageId && (amountInr < MIN_TOPUP_AMOUNT_INR || amountInr > MAX_TOPUP_AMOUNT_INR)) {
      showToast(`Recharge amount must be between ₹${MIN_TOPUP_AMOUNT_INR} and ₹${MAX_TOPUP_AMOUNT_INR.toLocaleString('en-IN')}.`, 'error');
      return;
    }

    setIsProcessingTopup(true);

    try {
      await initiateTopupCheckout({
        amountInr,
        packageId,
        userName: user?.name || user?.username || 'PromptHub User',
        userEmail: user?.email || '',
        userId: user?.id,
        onSuccess: async (payment: any, verifyRes?: any) => {
          const paymentId = payment.razorpay_payment_id || verifyRes?.paymentId || 'completed';

          // `verifyRes?.creditsAdded ?? calculateEstimatedCredits(amountInr)` announced
          // a CLIENT-CALCULATED credit grant whenever the server did not state one,
          // and the balances below were `currentTotal + creditsAdded` — client
          // arithmetic layered on possibly stale local state. Only what the server
          // reports is shown or applied; loadWalletData() supplies the rest.
          const creditsAdded =
            typeof verifyRes?.creditsAdded === 'number' ? verifyRes.creditsAdded : null;

          if (verifyRes?.requiresReconciliation) {
            showToast(
              `Payment received (Txn: ${paymentId}), but credits are still being settled. Your money is safe.`,
              'info'
            );
          } else if (verifyRes?.isDuplicate) {
            showToast(
              `This payment was already credited. No additional credits were added. [Txn: ${paymentId}]`,
              'info'
            );
          } else if (creditsAdded === null) {
            showToast(`Payment verified (Txn: ${paymentId}). Your wallet is being updated.`, 'success');
          } else {
            showToast(`Recharge successful — ${creditsAdded} credits added. [Txn: ${paymentId}]`, 'success');
            logActivity({
              type: 'purchase',
              description: `Recharged wallet with ${formatInr(amountInr)} (+${creditsAdded} Credits) [Txn: ${paymentId}]`,
              promptTitle: `${creditsAdded} Credits`,
            });
          }

          trackMixpanelOrderCompleted({
            orderId: payment.razorpay_order_id || paymentId,
            amountInr,
            creditsAdded: creditsAdded ?? 0,
            packageId: packageId || 'topup',
            paymentMethod: 'razorpay',
          });

          if (typeof verifyRes?.walletBalance === 'number' || typeof verifyRes?.paidCredits === 'number') {
            updateUser({
              ...(typeof verifyRes.walletBalance === 'number' ? { credits: verifyRes.walletBalance } : {}),
              ...(typeof verifyRes.paidCredits === 'number' ? { paidCredits: verifyRes.paidCredits } : {}),
            } as any);
          }

          await loadWalletData();
        },
        onDismiss: () => {
          showToast('Recharge checkout cancelled.', 'info');
        },
      });
    } catch (err: any) {
      showToast(`Could not start recharge: ${err.message}`, 'error');
    } finally {
      setIsProcessingTopup(false);
    }
  };

  // ── Subscription Plan Checkout ─────────────────────────────────────────────
  const handlePlanCheckout = async (plan: PlanTier) => {
    if (plan.priceInr === 0) {
      if (!isLoggedIn) {
        setShowAuthModal(true);
        return;
      }
      showToast('You are active on the Free Explorer plan.', 'info');
      return;
    }

    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }

    setIsProcessingPlan(true);

    try {
      await initiateRazorpayCheckout({
        amountInPaise: plan.priceInr * 100,
        currency: 'INR',
        name: 'PromptHub',
        description: `${plan.name} Membership (${plan.credits} Monthly Credits)`,
        notes: {
          planId: plan.id,
          billingCycle: 'monthly',
          type: 'subscription',
        },
        prefill: {
          name: user?.name || user?.username || 'PromptHub User',
          email: user?.email || '',
        },
        onSuccess: async (payment, verifyRes) => {
          const paymentId = payment.razorpay_payment_id || verifyRes?.payment_id || 'completed';
          const creditsAdded = verifyRes?.creditsAdded ?? plan.credits;

          showToast(`Subscribed to ${plan.name}! +${creditsAdded} monthly credits added. [Txn: ${paymentId}]`, 'success');

          logActivity({
            type: 'purchase',
            description: `Subscribed to ${plan.name} Plan (₹${plan.priceInr}/mo) [Txn: ${paymentId}]`,
            promptTitle: `${plan.name} Membership`,
          });

          trackMixpanelSubscriptionUpgraded({
            plan: plan.id,
            amountInr: plan.priceInr,
            billingPeriod: 'monthly',
          });

          // Atomically update user state with new plan & credited balances
          updateUser({
            plan: plan.id,
            credits: typeof verifyRes?.walletBalance === 'number' ? verifyRes.walletBalance : ((user?.credits ?? 0) + creditsAdded),
            paidCredits: typeof verifyRes?.paidCredits === 'number' ? verifyRes.paidCredits : ((user as any)?.paidCredits ?? 0),
          } as any);

          await loadWalletData();
        },
        onFailure: (err: any) => {
          const message = err?.description || err?.message || 'Subscription checkout was declined or cancelled.';
          showToast(message, 'error');
        },
        onDismiss: () => {
          showToast('Subscription checkout dismissed.', 'info');
        },
      });
    } catch (err: any) {
      console.error('[PricingView Plan Checkout Error]:', err);
      showToast(err.message || 'Could not start subscription checkout', 'error');
    } finally {
      setIsProcessingPlan(false);
    }
  };

  const handleCustomInrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw === '') {
      setCustomInr('');
      return;
    }
    const val = parseInt(raw, 10);
    if (isNaN(val)) return;
    if (val > MAX_TOPUP_AMOUNT_INR) {
      setCustomInr(MAX_TOPUP_AMOUNT_INR.toString());
      showToast(`Maximum recharge allowed is ₹${MAX_TOPUP_AMOUNT_INR.toLocaleString('en-IN')}.`, 'error');
      return;
    }
    setCustomInr(val.toString());
  };

  const rawCustomNum = parseInt(customInr, 10);
  const isCustomValid = !isNaN(rawCustomNum) && rawCustomNum >= MIN_TOPUP_AMOUNT_INR && rawCustomNum <= MAX_TOPUP_AMOUNT_INR;
  const isCustomOverMax = !isNaN(rawCustomNum) && rawCustomNum > MAX_TOPUP_AMOUNT_INR;
  const parsedCustomInr = isNaN(rawCustomNum) ? 0 : Math.min(MAX_TOPUP_AMOUNT_INR, Math.max(0, rawCustomNum));
  const estimatedCustomCredits = isCustomValid ? calculateEstimatedCredits(parsedCustomInr) : 0;

  return (
    <div className="w-full flex-1 flex flex-col bg-bg-primary text-text-primary font-sans antialiased selection:bg-brand-primary/20 pb-32 select-text">

      {/* ─── Hero Header & Quick Navigation Bar ─────────────────────────────── */}
      <section className="pt-8 pb-6 px-4 sm:px-6 lg:px-8 border-b border-border-default bg-bg-secondary/40">
        <div className="max-w-6xl mx-auto space-y-4 text-center">
          <div className="space-y-2 max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight text-text-primary leading-[1.15]">
              Simple, transparent pricing. <span className="text-brand-primary">Built for engineers.</span>
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Unlock dedicated monthly plan allocations with team workspaces and prompt optimizer tools, or recharge your on-demand credit wallet anytime at ₹1 = 2 Credits. BYOK API keys remain 100% free.
            </p>
          </div>

          {/* Quick Jump Sub-Navigation Anchors */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {[
              { id: 'plans', label: 'Subscription Plans', icon: Shield },
              { id: 'wallet', label: 'Credit Wallet & Top-Up', icon: Wallet },
              { id: 'economics', label: 'Model Rates & Estimates', icon: Cpu },
              { id: 'history', label: 'Receipts & Ledger', icon: History },
              { id: 'faq', label: 'Billing FAQ', icon: Info },
            ].map((anchor) => {
              const Icon = anchor.icon;
              return (
                <button
                  key={anchor.id}
                  onClick={() => scrollToAnchor(anchor.id)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-bg-tertiary hover:bg-border-subtle text-text-secondary hover:text-text-primary border border-border-default transition-all flex items-center gap-1.5 cursor-pointer min-h-[38px] shadow-2xs hover:border-brand-primary/40"
                >
                  <Icon className="w-3.5 h-3.5 text-brand-primary" />
                  <span>{anchor.label}</span>
                </button>
              );
            })}
          </div>

          {/* ─── Logged-In User Live Balance Banner ──────────────────────────── */}
          {isLoggedIn && user && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto mt-6 bg-bg-secondary border border-border-default rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4 text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted">Live Wallet Balance</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                      Non-Expiring Balance
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold font-display font-mono text-text-primary">
                      {user.credits ?? 0}
                    </span>
                    <span className="text-xs font-semibold text-text-secondary">Total Credits Available</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-text-muted font-mono mt-0.5">
                    <span>Plan Credits: {user.planCredits ?? 0}</span>
                    <span>•</span>
                    <span>Top-Up Wallet: {user.paidCredits ?? 0}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto">
                <button
                  onClick={() => scrollToAnchor('plans')}
                  className="flex-1 md:flex-initial btn-primary text-xs font-semibold px-5 py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs min-h-[44px]"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>View Plans</span>
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* ─── SECTION 0: PROMPTHUB 5-TIER SUBSCRIPTION PLANS ───────────────── */}
      <SubscriptionPlansSection
        onSelectPlan={handlePlanCheckout}
        currentPlanId={user?.plan || 'free'}
        isProcessing={isProcessingPlan}
        selectedGateway={selectedGateway}
        onSelectGateway={handleSelectGateway}
      />

      {/* ─── SECTION 1: CREDIT WALLET & ON-DEMAND RECHARGE ─────────────────── */}
      <section id="wallet" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-t border-border-default bg-bg-secondary/30 scroll-mt-12">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold font-display tracking-tight text-text-primary">
              On-demand credit wallet.
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary max-w-2xl mx-auto">
              Credits never expire. Instant micro-top-ups start at ₹10 via Razorpay UPI, Cards, NetBanking, and Wallets.
            </p>
          </div>

          {/* Full-Width High-Conversion Launch Promotion Card */}
          <div className="w-full" data-tour="tour-credit-packages">
            <LaunchPromotionPricingCard
              selectedPackageId={selectedPackageId}
              onSelectPackage={(pkg) => {
                setSelectedPackageId(pkg.packageId);
                setCustomInr(pkg.priceInr.toString());
                handleTopupCheckout(pkg.priceInr, pkg.packageId);
              }}
              isProcessing={isProcessingTopup}
            />
          </div>

          {/* Custom Amount Calculator & Direct Assistance Deck */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch pt-4 border-t border-border-default" data-tour="tour-payment-methods">
            {/* Custom Amount Input (Equal 50% Col) */}
            <div className="bg-bg-secondary rounded-xl border border-border-default p-5 sm:p-6 space-y-4 shadow-2xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold font-display text-text-primary">Custom Top-Up Recharge (₹)</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                      ₹200+ Unlocks Official Premium Prompts
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-brand-primary font-bold">1 Rupee = 2 PromptHub Credits</span>
                    <span className="text-text-muted">(₹{MIN_TOPUP_AMOUNT_INR} - ₹{MAX_TOPUP_AMOUNT_INR.toLocaleString('en-IN')})</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-text-muted font-mono">₹</span>
                    <input
                      id={customInputId}
                      type="number"
                      name="customInr"
                      aria-label="Custom recharge amount in Indian Rupees"
                      min={MIN_TOPUP_AMOUNT_INR}
                      max={MAX_TOPUP_AMOUNT_INR}
                      step={10}
                      value={customInr}
                      onChange={handleCustomInrChange}
                      placeholder="Enter amount (e.g. 100)"
                      className="w-full pl-8 pr-4 py-2.5 bg-bg-secondary border border-border-default rounded-xl text-sm font-bold font-mono text-text-primary focus:outline-none focus:border-brand-primary transition-all min-h-[44px]"
                    />
                  </div>

                  <div className="px-4 py-2.5 bg-bg-tertiary border border-border-default rounded-xl flex items-center justify-between sm:justify-start gap-3 min-h-[44px]">
                    <span className="text-xs text-text-secondary font-medium">You Receive:</span>
                    <span className="text-sm font-black font-display text-brand-primary font-mono">
                      ~{estimatedCustomCredits.toLocaleString('en-IN')} Credits
                    </span>
                  </div>
                </div>

                {isCustomOverMax && (
                  <p className="text-[11px] font-mono text-rose-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Maximum allowed top-up is ₹{MAX_TOPUP_AMOUNT_INR.toLocaleString('en-IN')}.</span>
                  </p>
                )}

                <div className="pt-2 border-t border-border-default">
                  <PaymentGatewaySelector
                    selectedGateway={selectedGateway}
                    onSelectGateway={handleSelectGateway}
                    disabled={isProcessingTopup}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleTopupCheckout(parsedCustomInr)}
                disabled={isProcessingTopup || !isCustomValid}
                className="w-full btn-primary text-xs font-semibold py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {isProcessingTopup ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isCustomValid ? (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Pay {formatInr(parsedCustomInr)} with Razorpay</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Enter amount between ₹{MIN_TOPUP_AMOUNT_INR} and ₹{MAX_TOPUP_AMOUNT_INR.toLocaleString('en-IN')}</span>
                  </>
                )}
              </button>
            </div>

            {/* Direct Support & Payment Assistance Card (Equal 50% Col) */}
            <div className="bg-bg-secondary rounded-xl border border-border-default p-5 sm:p-6 space-y-4 text-xs shadow-2xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-bold text-text-primary">
                  <Headphones className="w-4 h-4 text-brand-primary" />
                  <span>Didn&apos;t Receive Credits or Need Payment Help?</span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  If your money was debited but credits didn&apos;t reflect immediately, or you have any questions about plans or top-ups, don&apos;t worry! Simply DM or contact us directly:
                </p>
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 pt-2 border-t border-border-subtle/60">
                <a
                  href="mailto:Prompthub.cloud@gmail.com"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-bg-tertiary hover:bg-bg-primary text-text-primary border border-border-default transition-colors text-xs font-mono font-semibold min-h-[44px]"
                >
                  <Mail className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Prompthub.cloud@gmail.com</span>
                </a>
                <a
                  href="https://prompthub.cloud"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-bg-tertiary hover:bg-bg-primary text-text-primary border border-border-default transition-colors text-xs font-mono font-semibold min-h-[44px]"
                >
                  <Globe className="w-3.5 h-3.5 text-brand-primary" />
                  <span>prompthub.cloud</span>
                </a>
                <a
                  href="tel:+919409185557"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-bg-tertiary hover:bg-bg-primary text-text-primary border border-border-default transition-colors text-xs font-mono font-semibold min-h-[44px]"
                >
                  <Phone className="w-3.5 h-3.5 text-brand-primary" />
                  <span>+91 9409185557</span>
                </a>
                <a
                  href="https://wa.me/919409185557"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 transition-colors text-xs font-mono font-semibold min-h-[44px]"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>WhatsApp: +91 9409185557</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 2: UNIT ECONOMICS & MODEL ESTIMATES ────────────────────── */}
      <section id="economics" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-t border-border-default bg-bg-secondary/20 scroll-mt-6">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-4xl font-extrabold font-display tracking-tight text-text-primary">
              How far do your credits go?
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary max-w-2xl mx-auto">
              Credits are deducted transparently based on model weight and token length. Fast models cost a fraction of a rupee per run.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Card 1: Fast Everyday Models */}
            <div className="p-6 rounded-xl bg-bg-secondary border border-border-default flex flex-col justify-between space-y-4 shadow-2xs">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-brand-primary/10 text-brand-primary border border-brand-primary/20 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-text-primary">Fast / Everyday LLMs</h3>
                <p className="text-xs text-text-secondary">
                  Google Gemini 2.0 Flash, Claude 3.5 Haiku, Llama 3.3 70B, GPT-4o-mini.
                </p>
                <div className="pt-2 border-t border-border-subtle">
                  <div className="text-2xl font-black font-mono text-text-primary">~0.1 - 0.5 <span className="text-xs text-text-muted font-sans font-normal">credits / run</span></div>
                  <p className="text-[11px] text-text-muted mt-1 font-mono">₹100 gives you 200+ prompt test runs</p>
                </div>
              </div>
            </div>

            {/* Card 2: Frontier & Reasoning Models */}
            <div className="p-6 rounded-xl bg-bg-secondary border border-border-default flex flex-col justify-between space-y-4 shadow-2xs">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-brand-primary/10 text-brand-primary border border-brand-primary/20 flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-text-primary">Frontier &amp; Deep Reasoning</h3>
                <p className="text-xs text-text-secondary">
                  Claude 3.7 Sonnet, DeepSeek R1, OpenAI GPT-4o, Grok 4.6.
                </p>
                <div className="pt-2 border-t border-border-subtle">
                  <div className="text-2xl font-black font-mono text-text-primary">~1.0 - 2.5 <span className="text-xs text-text-muted font-sans font-normal">credits / run</span></div>
                  <p className="text-[11px] text-text-muted mt-1 font-mono">₹100 gives you 40-70 deep reasoning audits</p>
                </div>
              </div>
            </div>

            {/* Card 3: 100% Free BYOK Keys */}
            <div className="p-6 rounded-xl bg-bg-secondary border border-border-default flex flex-col justify-between space-y-4 shadow-2xs">
              <div className="space-y-3">
                <ByokLogo size={42} showTile={true} />
                <h3 className="text-base font-bold text-text-primary">Direct BYOK API Keys</h3>
                <p className="text-xs text-text-secondary">
                  Connect your personal OpenAI, Anthropic, Gemini, or OpenRouter keys in Settings.
                </p>
                <div className="pt-2 border-t border-border-subtle">
                  <div className="text-2xl font-black font-mono text-brand-primary">0 Credits <span className="text-xs text-text-muted font-sans font-normal">charged</span></div>
                  <p className="text-[11px] text-text-muted mt-1 font-mono">100% Free platform tool usage</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('credentials')}
                className="w-full py-2.5 rounded-lg text-xs font-semibold btn-secondary min-h-[40px] cursor-pointer"
              >
                Configure BYOK Keys
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 3: TRANSACTION RECEIPTS & LEDGER ──────────────────────── */}
      <section id="history" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6 scroll-mt-6 w-full max-w-full min-w-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border-default pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-primary font-mono uppercase tracking-wider">
              <History className="w-3.5 h-3.5" />
              <span>Account Billing Activity</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-text-primary mt-1">
              Receipts & Wallet Ledger
            </h2>
          </div>

          <div className="flex flex-wrap sm:inline-flex items-center p-1 rounded-xl bg-bg-secondary border border-border-default w-full sm:w-auto">
            <button
              onClick={() => setHistorySubTab('receipts')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5 ${
                historySubTab === 'receipts'
                  ? 'bg-surface-inverse text-white shadow-2xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Top-Up Receipts ({topupHistory.length})</span>
            </button>
            <button
              onClick={() => setHistorySubTab('ledger')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5 ${
                historySubTab === 'ledger'
                  ? 'bg-surface-inverse text-white shadow-2xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Usage Ledger ({ledgerRecords.length})</span>
            </button>
          </div>
        </div>

        {/* Content Container */}
        <div className="bg-bg-secondary rounded-xl border border-border-default overflow-hidden shadow-2xs w-full max-w-full min-w-0">
          {!isLoggedIn ? (
            <div className="p-8 text-center space-y-3">
              <History className="w-8 h-8 text-text-muted mx-auto" />
              <h3 className="text-sm font-bold text-text-primary">Sign in to view billing receipts</h3>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                Access your complete transaction history, payment IDs, and wallet ledger statements.
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="btn-primary text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer min-h-[40px]"
              >
                Sign In
              </button>
            </div>
          ) : isLoadingHistory ? (
            <div className="p-8 text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-brand-primary mx-auto" />
              <span className="text-xs text-text-muted">Loading account history...</span>
            </div>
          ) : historySubTab === 'receipts' ? (
            topupHistory.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Receipt className="w-8 h-8 text-text-muted mx-auto" />
                <p className="text-xs font-semibold text-text-secondary">No top-up receipts found yet.</p>
                <p className="text-[11px] text-text-muted">Completed Razorpay recharges will automatically show up here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar w-full">
                <table className="w-full text-left text-xs">
                  <thead className="bg-bg-secondary/60 text-text-muted font-mono uppercase text-[10px] border-b border-border-subtle">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Amount (INR)</th>
                      <th className="px-4 py-3">Credits Added</th>
                      <th className="px-4 py-3">Payment ID</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {topupHistory.map((txn) => (
                      <tr key={txn.id} className="hover:bg-bg-secondary/40 transition-colors font-mono">
                        <td className="px-4 py-3 text-text-secondary">
                          {new Date(txn.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3 font-bold text-text-primary">
                          {formatInr(txn.amount_inr)}
                        </td>
                        <td className="px-4 py-3 font-bold text-brand-primary">
                          +{txn.credit_amount} Credits
                        </td>
                        <td className="px-4 py-3 text-text-muted truncate max-w-[150px]">
                          {txn.razorpay_payment_id || txn.id}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>COMPLETED</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : ledgerRecords.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <FileText className="w-8 h-8 text-text-muted mx-auto" />
              <p className="text-xs font-semibold text-text-secondary">No credit ledger records found.</p>
              <p className="text-[11px] text-text-muted">Prompt evaluations and model executions will log entries here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar w-full">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg-secondary/60 text-text-muted font-mono uppercase text-[10px] border-b border-border-subtle">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Credits</th>
                    <th className="px-4 py-3">Balance After</th>
                    <th className="px-4 py-3">Reason / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {ledgerRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-bg-secondary/40 transition-colors font-mono">
                      <td className="px-4 py-3 text-text-secondary">
                        {new Date(rec.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.amount > 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                        }`}>
                          {rec.transaction_type}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-bold ${rec.amount > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                        {rec.amount > 0 ? `+${rec.amount}` : rec.amount}
                      </td>
                      <td className="px-4 py-3 font-bold text-text-primary">
                        {rec.balance_after}
                      </td>
                      <td className="px-4 py-3 text-text-secondary font-sans text-xs truncate max-w-[250px]">
                        {rec.reason || 'AI Execution'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ─── SECTION 4: BILLING & CREDITS FAQ ───────────────────────────────── */}
      <section id="faq" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-t border-border-default bg-bg-secondary/20 scroll-mt-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-4xl font-extrabold font-display tracking-tight text-text-primary">
              Frequently asked questions
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary">
              Everything you need to know about PromptHub on-demand credits, BYOK, and payment security.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'How do PromptHub Credits work?',
                a: '1 Credit = ~1 standard prompt execution on fast models (e.g. Gemini 2.0 Flash, GPT-4o-mini, Claude 3.5 Haiku). Frontier reasoning models (e.g. Claude 3.7 Sonnet, DeepSeek R1, Grok) consume between 1 to 2.5 credits based on token length and model weights.',
              },
              {
                q: 'Do on-demand credits ever expire?',
                a: 'No! Credits purchased through on-demand wallet recharges have lifetime validity and never expire. You only consume credits when executing prompt requests.',
              },
              {
                q: 'Are there any recurring monthly charges?',
                a: 'No. PromptHub uses a pure pay-as-you-go credit wallet model. You are never automatically charged or locked into recurring subscription contracts.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major payment methods via Razorpay: Instant UPI (Google Pay, PhonePe, Paytm, BHIM), all Credit/Debit cards (Visa, Mastercard, RuPay, Amex), and NetBanking across 50+ banks.',
              },
              {
                q: 'Can I bring my own API keys (BYOK)?',
                a: 'Yes! PromptHub provides full BYOK (Bring Your Own Key) support for OpenAI, Anthropic, Google Gemini, and OpenRouter. When BYOK is enabled in Settings, all studio executions route directly to your key at 0 platform credit cost.',
              },
            ].map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-bg-secondary border border-border-default rounded-xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 font-semibold text-xs sm:text-sm text-text-primary hover:text-brand-primary transition-colors cursor-pointer min-h-[44px]"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-primary' : 'text-text-muted'}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs text-text-secondary leading-relaxed border-t border-border-subtle bg-bg-secondary/30">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* High-Craft Studio Footer */}
      <AppFooter />
    </div>
  );
};
