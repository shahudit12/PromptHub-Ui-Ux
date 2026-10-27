import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  CreditCard, 
  CheckCircle2, 
  History, 
  Sparkles, 
  Zap, 
  Loader2, 
  Receipt, 
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  MIN_TOPUP_AMOUNT_INR,
  MAX_TOPUP_AMOUNT_INR,
} from '../../config/billingConfig';
import {
  initiateTopupCheckout,
  fetchUserTopupHistory,
  fetchWalletLedger,
  type TopupTransactionRecord,
  type WalletLedgerRecord
} from '../../services/payment/topupService';

export const ProfileBillingTab: React.FC = () => {
  const { user, updateUser, showToast, isLoggedIn, setShowAuthModal } = useApp();

  const [selectedPackageId, setSelectedPackageId] = useState<string>('topup_starter');
  const [customInr, setCustomInr] = useState<string>('100');
  const [isProcessingTopup, setIsProcessingTopup] = useState(false);
  const [topupHistory, setTopupHistory] = useState<TopupTransactionRecord[]>([]);
  const [ledgerRecords, setLedgerRecords] = useState<WalletLedgerRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState<'receipts' | 'ledger'>('receipts');

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
      console.warn('[ProfileBillingTab] Failed to fetch wallet data:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

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
          const creditsAdded = typeof verifyRes?.creditsAdded === 'number' ? verifyRes.creditsAdded : null;

          if (verifyRes?.requiresReconciliation) {
            showToast(
              `Payment received (Txn: ${payment.razorpay_payment_id || 'completed'}), but credits are still being settled. Your money is safe.`,
              'info'
            );
          } else {
            showToast(
              creditsAdded
                ? `Payment successful! +${creditsAdded.toLocaleString('en-IN')} credits added.`
                : 'Payment verified successfully! Balance updated.',
              'success'
            );
          }
          await loadWalletData();
        },
        onFailure: (err: any) => {
          showToast(err?.message || 'Payment processing was cancelled or failed.', 'error');
        }
      });
    } catch (err: any) {
      showToast(err?.message || 'Failed to start payment checkout.', 'error');
    } finally {
      setIsProcessingTopup(false);
    }
  };

  const packages = [
    {
      id: 'topup_starter',
      name: 'Starter Pack',
      inr: 100,
      credits: 10000,
      bonus: null,
      description: 'Ideal for trying out Studio, quick generation & testing.'
    },
    {
      id: 'topup_builder',
      name: 'Builder Pack',
      inr: 500,
      credits: 55000,
      bonus: '+10% Bonus',
      popular: true,
      description: 'Most popular for developers building & benchmarking prompts.'
    },
    {
      id: 'topup_pro',
      name: 'Power Scale',
      inr: 2000,
      credits: 250000,
      bonus: '+25% Bonus',
      description: 'Bulk credits for high-throughput AI agent workflows & team pipelines.'
    }
  ];

  return (
    <div className="space-y-6 text-left">
      {/* 1. Live Balance & Plan Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Credits Card */}
        <div className="bg-bg-secondary border border-border-default rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">Total Available Balance</span>
            <div className="w-8 h-8 rounded-lg bg-brand-primary-light flex items-center justify-center text-brand-primary">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl sm:text-3xl font-bold font-mono text-text-primary">
                {(user?.credits ?? 0).toLocaleString('en-IN')}
              </h3>
              <span className="text-xs font-mono text-text-muted">credits</span>
            </div>
            <p className="text-[11px] text-text-secondary mt-1">
              ≈ ₹{((user?.credits ?? 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })} estimated run value
            </p>
          </div>
        </div>

        {/* Plan Tier Card */}
        <div className="bg-bg-secondary border border-border-default rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">Current Plan Tier</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xl sm:text-2xl font-bold font-display text-text-primary">
                {user?.plan === 'pro' || user?.hasPremiumAccess ? 'Pro Developer' : 'Free Explorer'}
              </h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                user?.plan === 'pro' || user?.hasPremiumAccess
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-bg-tertiary text-text-muted border-border-default'
              }`}>
                {user?.plan === 'pro' || user?.hasPremiumAccess ? 'PRO' : 'FREE'}
              </span>
            </div>
            <p className="text-[11px] text-text-secondary mt-1">
              {user?.plan === 'pro' || user?.hasPremiumAccess
                ? 'Unlimited workspace history & priority queue'
                : 'Free model tier, pay-per-token paid models'}
            </p>
          </div>
        </div>

        {/* Security & Billing Mode */}
        <div className="bg-bg-secondary border border-border-default rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">Billing Mode</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-base font-bold text-text-primary">Pay-As-You-Go Wallet</h3>
            <p className="text-[11px] text-text-secondary mt-1">
              Zero monthly commitments. Top up only what you use via UPI, Cards &amp; NetBanking.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Top-Up Packages Section */}
      <div className="bg-bg-secondary border border-border-default rounded-xl p-5 shadow-xs space-y-4">
        <div>
          <h4 className="text-sm font-bold font-display text-text-primary">Instant Credit Top-Up</h4>
          <p className="text-xs text-text-secondary mt-0.5">
            Select a discounted package or enter a custom amount. Credits are credited instantly to your wallet.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {packages.map(pkg => {
            const isSelected = selectedPackageId === pkg.id;
            return (
              <div
                key={pkg.id}
                onClick={() => {
                  setSelectedPackageId(pkg.id);
                  setCustomInr(String(pkg.inr));
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#E8F1ED] dark:bg-emerald-950/40 border-emerald-500 shadow-xs'
                    : 'bg-bg-tertiary/60 border-border-default hover:border-border-hover'
                }`}
              >
                {pkg.bonus && (
                  <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-600 text-white shadow-xs">
                    {pkg.bonus}
                  </span>
                )}
                <div>
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-text-primary">{pkg.name}</h5>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold font-mono text-text-primary">₹{pkg.inr}</span>
                    <span className="text-xs font-mono text-text-muted">({pkg.credits.toLocaleString('en-IN')} cr)</span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">{pkg.description}</p>
                </div>

                <button
                  type="button"
                  disabled={isProcessingTopup}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTopupCheckout(pkg.inr, pkg.id);
                  }}
                  className="mt-3.5 w-full min-h-[44px] sm:min-h-[36px] py-1.5 px-3 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isProcessingTopup && selectedPackageId === pkg.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  <span>Recharge ₹{pkg.inr}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Custom INR Amount Top-up */}
        <div className="p-4 rounded-xl bg-bg-tertiary/60 border border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="font-semibold text-text-primary">Custom Recharge Amount</span>
            <p className="text-text-muted text-[11px]">Enter any amount between ₹{MIN_TOPUP_AMOUNT_INR} and ₹{MAX_TOPUP_AMOUNT_INR.toLocaleString('en-IN')}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-text-muted">₹</span>
              <input
                type="number"
                min={MIN_TOPUP_AMOUNT_INR}
                max={MAX_TOPUP_AMOUNT_INR}
                value={customInr}
                onChange={(e) => {
                  setCustomInr(e.target.value);
                  setSelectedPackageId('');
                }}
                className="w-28 pl-7 pr-3 py-1.5 bg-bg-primary border border-border-default rounded-lg text-xs font-mono text-text-primary focus:border-brand-primary focus:outline-none min-h-[44px] sm:min-h-[36px]"
              />
            </div>
            <button
              type="button"
              disabled={isProcessingTopup}
              onClick={() => {
                const amount = parseInt(customInr, 10);
                if (!isNaN(amount)) handleTopupCheckout(amount);
              }}
              className="min-h-[44px] sm:min-h-[36px] px-4 py-1.5 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isProcessingTopup && !selectedPackageId ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CreditCard className="w-3.5 h-3.5" />
              )}
              <span>Pay with Razorpay / UPI</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Transaction History & Ledger */}
      <div className="bg-bg-secondary border border-border-default rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-default pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-brand-primary" />
            <h4 className="text-sm font-bold font-display text-text-primary">Wallet History &amp; Invoices</h4>
          </div>

          <div className="flex items-center gap-1 bg-bg-tertiary p-0.5 rounded-lg border border-border-default text-xs">
            <button
              type="button"
              onClick={() => setHistoryTab('receipts')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer min-h-[36px] sm:min-h-[28px] ${
                historyTab === 'receipts'
                  ? 'bg-bg-secondary text-text-primary font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Payment Receipts ({topupHistory.length})
            </button>
            <button
              type="button"
              onClick={() => setHistoryTab('ledger')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer min-h-[36px] sm:min-h-[28px] ${
                historyTab === 'ledger'
                  ? 'bg-bg-secondary text-text-primary font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Credit Ledger ({ledgerRecords.length})
            </button>
          </div>
        </div>

        {isLoadingHistory ? (
          <div className="py-8 text-center text-xs text-text-muted flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
            <span>Loading transaction history...</span>
          </div>
        ) : historyTab === 'receipts' ? (
          topupHistory.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted space-y-1">
              <History className="w-5 h-5 mx-auto text-text-muted/60" />
              <p>No top-up receipts recorded yet.</p>
              <p className="text-[11px]">When you purchase credits via UPI or Card, receipts appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border-default text-[10px] font-mono uppercase text-text-muted">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Transaction ID</th>
                    <th className="py-2 px-3">Amount</th>
                    <th className="py-2 px-3">Credits</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {topupHistory.map(item => (
                    <tr key={item.id} className="hover:bg-bg-tertiary/40">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-text-muted">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-text-primary">
                        {item.razorpay_payment_id || item.razorpay_order_id || item.id.slice(0, 8)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-text-primary">
                        ₹{item.amount_inr}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        +{item.credit_amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                          item.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          ledgerRecords.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted space-y-1">
              <History className="w-5 h-5 mx-auto text-text-muted/60" />
              <p>No credit ledger entries recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border-default text-[10px] font-mono uppercase text-text-muted">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Activity</th>
                    <th className="py-2 px-3">Change</th>
                    <th className="py-2 px-3">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {ledgerRecords.map(item => (
                    <tr key={item.id} className="hover:bg-bg-tertiary/40">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-text-muted">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 text-text-primary">
                        {item.reason || item.transaction_type || 'Credit update'}
                      </td>
                      <td className={`py-2.5 px-3 font-mono font-bold ${
                        item.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                      }`}>
                        {item.amount >= 0 ? `+${item.amount}` : item.amount}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-text-muted">
                        {item.balance_after?.toLocaleString('en-IN') ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
};
