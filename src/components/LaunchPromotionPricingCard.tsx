import React, { useState } from 'react';
import {
  Zap,
  ArrowRight,
  CheckCircle2,
  Clock,
  TrendingDown,
  Lock,
  Layers,
  Activity,
} from 'lucide-react';
import {
  PROMOTION_CONFIG,
  isPromotionActive,
  getAllPromotionalPackages,
  type EffectivePricingResult,
} from '../config/promotionConfig';

interface LaunchPromotionPricingCardProps {
  onSelectPackage?: (pkg: EffectivePricingResult) => void;
  selectedPackageId?: string;
  isProcessing?: boolean;
  className?: string;
}

export const LaunchPromotionPricingCard: React.FC<LaunchPromotionPricingCardProps> = ({
  onSelectPackage,
  selectedPackageId = 'topup_starter',
  isProcessing = false,
  className = '',
}) => {
  const active = isPromotionActive();
  const packages = getAllPromotionalPackages();
  const [activePackageId, setActivePackageId] = useState<string>(selectedPackageId);
  const currentPkg = packages.find((p) => p.packageId === activePackageId) || packages[0];

  const handlePackageChange = (pkg: EffectivePricingResult) => {
    setActivePackageId(pkg.packageId);
  };

  const handleExecuteCheckout = (pkg: EffectivePricingResult) => {
    setActivePackageId(pkg.packageId);
    onSelectPackage?.(pkg);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ─── 1. TOP LAUNCH HERO BANNER ────────────────────────────────────────── */}
      {active ? (
        <div className="rounded-xl border border-border-default bg-bg-secondary p-6 sm:p-8 shadow-2xs text-left">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-mono font-semibold uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5" />
                <span>{PROMOTION_CONFIG.badgeText}</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bg-tertiary border border-border-default text-text-secondary text-xs font-mono">
                <Activity className="w-3.5 h-3.5 text-brand-primary" />
                <span>Launch rate active</span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-text-primary leading-tight">
                {PROMOTION_CONFIG.heroOfferHeadline}
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary max-w-2xl leading-relaxed">
                {PROMOTION_CONFIG.subheadline}
              </p>
            </div>

            {/* Quick Benefits Bar */}
            <div className="pt-3 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-mono text-text-secondary border-t border-border-subtle">
              <span className="flex items-center gap-1.5 text-text-primary font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary" />
                <span>Lifetime Validity (No Expiry)</span>
              </span>
              <span className="text-text-muted">•</span>
              <span className="flex items-center gap-1.5 text-text-primary font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary" />
                <span>Instant Wallet Credit</span>
              </span>
              <span className="text-text-muted">•</span>
              <span className="flex items-center gap-1.5 text-text-primary font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary" />
                <span>100+ Models Supported</span>
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border-default bg-bg-secondary p-5 text-left">
          <h2 className="text-xl font-bold font-display text-text-primary">
            PromptHub Credit Packages
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Top up on-demand credits for managed AI model execution with lifetime validity.
          </p>
        </div>
      )}

      {/* ─── 2. PACKAGE SELECTION TABS ────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 p-1.5 rounded-xl bg-bg-tertiary border border-border-default">
        {packages.map((pkg) => {
          const isSelected = activePackageId === pkg.packageId;
          return (
            <button
              key={pkg.packageId}
              type="button"
              onClick={() => handlePackageChange(pkg)}
              className={`relative py-3 px-2 sm:px-4 rounded-lg text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-1 min-h-[52px] ${
                isSelected
                  ? 'bg-bg-secondary text-text-primary shadow-2xs font-bold border border-brand-primary/40 ring-1 ring-brand-primary/20'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary/40 border border-transparent'
              }`}
            >
              {pkg.popular && active && (
                <span className="absolute -top-2 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-brand-primary text-white shadow-2xs">
                  {pkg.badge || 'POPULAR'}
                </span>
              )}
              <span className="text-xs sm:text-sm font-display font-bold tracking-tight truncate w-full">
                {pkg.name}
              </span>
              <span className="text-[10px] sm:text-xs font-mono text-brand-primary font-semibold">
                {pkg.credits.toLocaleString('en-IN')} Credits · ₹{pkg.priceInr}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── 3. THE HERO HIGH-CONVERSION OFFER CARD ──────────────────────────── */}
      <div className="rounded-xl border border-border-default bg-bg-secondary p-5 sm:p-7 md:p-8 pt-8 sm:pt-8 shadow-2xs relative overflow-hidden text-left">
        {/* Subtle accent corner tag */}
        <div className="absolute top-0 right-0 px-3 py-1.5 rounded-bl-lg bg-bg-tertiary border-b border-l border-border-default text-text-primary text-[10px] sm:text-[11px] font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 max-w-[80%] sm:max-w-none truncate">
          <Zap className="w-3.5 h-3.5 text-brand-primary shrink-0" />
          <span className="truncate">
            {currentPkg.isDiscounted
              ? `${currentPkg.discountPercentRounded}% OFF • SPECIAL OFFER`
              : 'STANDARD RATE'}
          </span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8 items-stretch">
          {/* Left / Upper (7 Cols): Visual Price Comparison & Value Proposition */}
          <div className="xl:col-span-7 space-y-5 sm:space-y-6 flex flex-col justify-between">
            {/* Header & Tagline */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-brand-primary uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5" />
                <span>{currentPkg.name}</span>
              </div>
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display tracking-tight text-text-primary flex items-baseline gap-2 flex-wrap">
                <span>{currentPkg.credits.toLocaleString('en-IN')}</span>
                <span className="text-base sm:text-lg font-bold text-text-secondary font-sans">
                  PromptHub Credits
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                {currentPkg.tagline}
              </p>
            </div>

            {/* Visual Price Comparison Deck: REGULAR vs LAUNCH */}
            <div className="p-4 sm:p-5 rounded-lg bg-bg-primary/80 border border-border-default space-y-4">
              {currentPkg.isDiscounted ? (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:gap-4 divide-x divide-border-default">
                    {/* Column 1: REGULAR PRICE */}
                    <div className="space-y-1 pr-2 sm:pr-3 min-w-0">
                      <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-text-muted truncate block">
                        REGULAR PRICE
                      </span>
                      <div className="text-xl sm:text-2xl md:text-3xl font-bold font-mono text-text-muted line-through decoration-rose-500/70 decoration-2">
                        ₹{currentPkg.standardPriceInr}
                      </div>
                      <div className="text-[10px] sm:text-[11px] font-mono text-text-muted">
                        ₹{currentPkg.standardRateInr.toFixed(2)} / credit
                      </div>
                    </div>

                    {/* Column 2: LAUNCH PRICE (HERO) */}
                    <div className="space-y-1 pl-2 sm:pl-4 min-w-0">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-brand-primary flex items-center gap-1">
                          <Zap className="w-3 h-3 text-brand-primary shrink-0" />
                          <span>LAUNCH PRICE</span>
                        </span>
                        <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 shadow-2xs shrink-0">
                          SAVE ₹{currentPkg.savingsInr}
                        </span>
                      </div>

                      <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-mono text-text-primary tracking-tight">
                        ₹{currentPkg.priceInr}
                      </div>

                      <div className="text-[11px] sm:text-xs font-mono font-bold text-brand-primary">
                        Just ₹{currentPkg.effectiveRateInr.toFixed(2)} / credit
                      </div>
                    </div>
                  </div>

                  {/* High Perceived Savings Callout Box */}
                  <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2 text-xs font-mono">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <TrendingDown className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      <span className="text-text-primary font-bold text-xs">
                        YOU SAVE ₹{currentPkg.savingsInr} TODAY
                      </span>
                    </div>
                    <span className="text-text-secondary font-medium text-[10px] sm:text-[11px]">
                      That&apos;s {currentPkg.discountPercentRounded}% less than standard rate.
                    </span>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold text-text-muted uppercase">STANDARD PRICE</span>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-text-primary">
                    ₹{currentPkg.standardPriceInr}
                  </div>
                  <div className="text-xs font-mono text-text-secondary">
                    ₹{currentPkg.standardRateInr.toFixed(2)} / credit
                  </div>
                </div>
              )}
            </div>

            {/* Why Buy Now / Clarification Callout */}
            {active && (
              <div className="space-y-1.5 text-xs">
                <div className="font-bold font-display text-text-primary flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Launch rate guarantee</span>
                </div>
                <p className="text-text-secondary leading-relaxed">
                  Introductory rate of <strong className="text-text-primary font-mono">₹{currentPkg.effectiveRateInr.toFixed(2)}/credit</strong> is active. Purchased credits are permanently added to your wallet and never expire.
                </p>
              </div>
            )}
          </div>

          {/* Right / Lower (5 Cols): Value Stack & Primary Action */}
          <div className="xl:col-span-5 flex flex-col justify-between space-y-6 bg-bg-tertiary/40 border border-border-subtle rounded-xl p-5 sm:p-6">
            <div className="space-y-4">
              <span className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider block">
                Included in this package:
              </span>

              <ul className="space-y-3 text-xs">
                {currentPkg.valueStack.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-text-primary">
                    <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* High-Conversion Value-Focused CTA */}
            <div className="space-y-3 pt-4 border-t border-border-default">
              <button
                type="button"
                onClick={() => handleExecuteCheckout(currentPkg)}
                disabled={isProcessing}
                className="w-full btn-primary py-3.5 px-6 rounded-xl font-mono font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] group"
              >
                <Zap className="w-4 h-4 text-white fill-current" />
                <span>{currentPkg.ctaText}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Security & Reassurance Footnotes */}
              <div className="space-y-1 text-center">
                <div className="text-[11px] font-mono text-text-muted flex items-center justify-center gap-2">
                  <Lock className="w-3 h-3 text-brand-primary" />
                  <span>256-bit Encrypted Razorpay Checkout</span>
                </div>
                <div className="text-[10px] text-text-muted">
                  Regular price ₹{currentPkg.standardPriceInr} • {currentPkg.isDiscounted ? `You save ₹${currentPkg.savingsInr}` : 'Standard billing'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
