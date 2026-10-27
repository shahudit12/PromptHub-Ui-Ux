import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Zap,
  ArrowRight,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Users,
  HardDrive,
  Gauge,
  Award,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { PLAN_TIERS, type PlanTier } from '../../config/billingConfig';
import { PROMOTION_CONFIG } from '../../config/promotionConfig';

import type { PaymentGateway } from '../../services/payment/payuClient';
import { PaymentGatewaySelector } from '../payment/PaymentGatewaySelector';

interface SubscriptionPlansSectionProps {
  onSelectPlan: (plan: PlanTier) => void;
  currentPlanId?: string;
  isProcessing?: boolean;
  selectedGateway?: PaymentGateway;
  onSelectGateway?: (gateway: PaymentGateway) => void;
}

// Minimal, genuine launch countdown (Active for 28 days from launch reset - Ends Nov 18, 2026)
const LAUNCH_END_DATE = PROMOTION_CONFIG.endAt
  ? new Date(PROMOTION_CONFIG.endAt).getTime()
  : new Date('2026-11-18T23:59:59+05:30').getTime();

export const SubscriptionPlansSection: React.FC<SubscriptionPlansSectionProps> = ({
  onSelectPlan,
  currentPlanId = 'free',
  isProcessing = false,
  selectedGateway = 'razorpay',
  onSelectGateway,
}) => {
  const normalizedCurrentPlan = (currentPlanId || 'free').toLowerCase();
  const [activeTabPlanId, setActiveTabPlanId] = useState<string>(normalizedCurrentPlan);
  const [showComparison, setShowComparison] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (currentPlanId) {
      setActiveTabPlanId(currentPlanId.toLowerCase());
    }
  }, [currentPlanId]);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const diff = Math.max(0, LAUNCH_END_DATE - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const activePlan = PLAN_TIERS.find((p) => p.id === activeTabPlanId) || PLAN_TIERS[2];

  const getBadgeIcon = (badgeId: string) => {
    switch (badgeId) {
      case 'free_explorer':
        return <Terminal className="w-3.5 h-3.5 text-text-muted" />;
      case 'starter_member':
        return <Zap className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />;
      case 'pro_member':
        return <ShieldCheck className="w-3.5 h-3.5 text-brand-primary" />;
      case 'growth_member':
        return <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      case 'studio_elite':
        return <Award className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
      default:
        return <Award className="w-3.5 h-3.5 text-brand-primary" />;
    }
  };

  const getBadgeStyle = (badgeId: string) => {
    switch (badgeId) {
      case 'free_explorer':
        return 'bg-bg-tertiary text-text-secondary border-border-default';
      case 'starter_member':
        return 'bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-500/20';
      case 'pro_member':
        return 'bg-brand-primary/10 text-brand-primary border-brand-primary/20';
      case 'growth_member':
        return 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20';
      case 'studio_elite':
        return 'bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/20';
      default:
        return 'bg-bg-tertiary text-text-primary border-border-default';
    }
  };

  return (
    <section id="plans" className="py-10 sm:py-16 px-4 sm:px-6 lg:px-8 border-b border-border-default scroll-mt-12 bg-bg-primary">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── 1. Clean Developer Launch Window Banner ─────────────────────────── */}
        <div className="rounded-xl border border-border-default bg-bg-secondary p-4 sm:p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-9 h-9 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-primary">
                    Launch Pricing Active
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                    Introductory Rate Guaranteed
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  Early builder rates are locked for active subscriptions throughout membership.
                </p>
              </div>
            </div>

            {/* Restrained Ticker */}
            <div className="flex items-center gap-1.5 shrink-0 bg-bg-tertiary px-3 py-1.5 rounded-lg border border-border-default font-mono">
              <div className="text-center px-1">
                <span className="text-sm font-bold text-text-primary">{timeLeft.days}</span>
                <span className="block text-[9px] uppercase text-text-muted">Days</span>
              </div>
              <span className="text-text-muted text-xs">:</span>
              <div className="text-center px-1">
                <span className="text-sm font-bold text-text-primary">{String(timeLeft.hours).padStart(2, '0')}</span>
                <span className="block text-[9px] uppercase text-text-muted">Hrs</span>
              </div>
              <span className="text-text-muted text-xs">:</span>
              <div className="text-center px-1">
                <span className="text-sm font-bold text-text-primary">{String(timeLeft.minutes).padStart(2, '0')}</span>
                <span className="block text-[9px] uppercase text-text-muted">Min</span>
              </div>
              <span className="text-text-muted text-xs">:</span>
              <div className="text-center px-1">
                <span className="text-sm font-bold text-brand-primary">{String(timeLeft.seconds).padStart(2, '0')}</span>
                <span className="block text-[9px] uppercase text-text-muted">Sec</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. Section Header ───────────────────────────────────────────────── */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight text-text-primary leading-[1.15]">
            Choose your subscription tier.
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Every subscription includes monthly AI credits, team workspaces, prompt optimizer features, and an official verified profile badge.
          </p>
        </div>

        {/* ── 3. FOCUSED VIEW: Segmented Bar + Hero Spotlight Card ───────────── */}
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Clean Segmented Tab Strip */}
          <div className="flex items-center justify-start sm:justify-center overflow-x-auto no-scrollbar gap-2 p-1.5 bg-bg-secondary rounded-xl border border-border-default shadow-2xs">
            {PLAN_TIERS.map((plan) => {
              const isActive = activeTabPlanId === plan.id;
              const isUserCurrentPlan = normalizedCurrentPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setActiveTabPlanId(plan.id)}
                  className={`shrink-0 px-3.5 py-2 rounded-lg text-xs font-mono font-semibold transition-all duration-200 cursor-pointer flex items-center gap-2 min-h-[44px] ${
                    isActive
                      ? 'bg-brand-primary text-white shadow-2xs font-bold'
                      : 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                  }`}
                >
                  {getBadgeIcon(plan.badgeId)}
                  <span>{plan.name}</span>
                  <span className={`text-[11px] ${isActive ? 'text-blue-100' : 'text-text-muted'}`}>
                    {plan.priceInr === 0 ? '₹0' : `₹${plan.priceInr}`}
                  </span>
                  {isUserCurrentPlan && (
                    <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                      isActive ? 'bg-white/20 text-white border border-white/30' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                    }`}>
                      Current
                    </span>
                  )}
                  {plan.popular && !isUserCurrentPlan && (
                    <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                      isActive ? 'bg-white text-brand-primary' : 'bg-brand-primary/10 text-brand-primary'
                    }`}>
                      Popular
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Spotlight Card */}
          <motion.div
            key={activePlan.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="bg-bg-secondary rounded-xl border border-border-default p-6 sm:p-8 shadow-2xs space-y-6"
          >
            {/* Top Banner: Badge Reward Recognition */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg bg-bg-tertiary border border-border-default">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg border ${getBadgeStyle(activePlan.badgeId)}`}>
                  {getBadgeIcon(activePlan.badgeId)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-display text-text-primary">
                      Unlocks Official Profile Badge
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getBadgeStyle(activePlan.badgeId)}`}>
                      {activePlan.badgeLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Displayed on your prompts, profile page, and studio author listings.
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-2xl sm:text-3xl font-extrabold font-display font-mono text-text-primary">
                  ₹{activePlan.priceInr.toLocaleString('en-IN')}
                  <span className="text-xs font-normal text-text-muted font-sans ml-1">/ month</span>
                </div>
                {activePlan.futurePriceInr > activePlan.priceInr && (
                  <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold block">
                    Launch offer (standard ₹{activePlan.futurePriceInr.toLocaleString('en-IN')})
                  </span>
                )}
              </div>
            </div>

            {/* 4-Column Key Quotas Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-lg bg-bg-primary border border-border-default space-y-1">
                <span className="text-[11px] text-text-muted flex items-center gap-1 font-mono">
                  <Zap className="w-3 h-3 text-brand-primary" />
                  Monthly Credits
                </span>
                <span className="text-base font-extrabold font-mono text-text-primary block">
                  {activePlan.credits > 0 ? activePlan.credits.toLocaleString('en-IN') : '0 (Free)'}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-bg-primary border border-border-default space-y-1">
                <span className="text-[11px] text-text-muted flex items-center gap-1 font-mono">
                  <Gauge className="w-3 h-3 text-brand-primary" />
                  Free Analyses
                </span>
                <span className="text-base font-extrabold font-mono text-text-primary block">
                  {activePlan.analyzerRunsPerDay} / day
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-bg-primary border border-border-default space-y-1">
                <span className="text-[11px] text-text-muted flex items-center gap-1 font-mono">
                  <Users className="w-3 h-3 text-brand-primary" />
                  Team Workspaces
                </span>
                <span className="text-base font-extrabold font-mono text-text-primary block">
                  {activePlan.teamSlots} {activePlan.teamSlots === 1 ? 'workspace' : 'workspaces'}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-bg-primary border border-border-default space-y-1">
                <span className="text-[11px] text-text-muted flex items-center gap-1 font-mono">
                  <HardDrive className="w-3 h-3 text-brand-primary" />
                  Cloud Storage
                </span>
                <span className="text-base font-extrabold font-mono text-text-primary block">
                  {activePlan.storageMb >= 1024 ? `${activePlan.storageMb / 1024} GB` : `${activePlan.storageMb} MB`}
                </span>
              </div>
            </div>

            {/* Detailed Specs List */}
            <div className="p-4 rounded-lg bg-bg-tertiary/40 border border-border-subtle space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-text-secondary">
                Included in {activePlan.name}:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {activePlan.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-brand-primary shrink-0 mt-0.5 stroke-[2.5]" />
                    <span className="text-text-primary text-[11px]">{feat}</span>
                  </div>
                ))}
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-brand-primary shrink-0 mt-0.5 stroke-[2.5]" />
                  <span className="text-text-primary text-[11px]">
                    Optimizer: {activePlan.optimizerDescription}
                  </span>
                </div>
                {activePlan.priorityHighTraffic && (
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-brand-primary shrink-0 mt-0.5 stroke-[2.5]" />
                    <span className="text-text-primary text-[11px]">
                      Priority execution queue
                    </span>
                  </div>
                )}
                {activePlan.prioritySupport && (
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-brand-primary shrink-0 mt-0.5 stroke-[2.5]" />
                    <span className="text-text-primary text-[11px]">
                      Dedicated priority support
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Gateway Selector for Paid Plans */}
            {activePlan.priceInr > 0 && normalizedCurrentPlan !== activePlan.id && onSelectGateway && (
              <div className="pt-2 border-t border-border-default">
                <PaymentGatewaySelector
                  selectedGateway={selectedGateway}
                  onSelectGateway={onSelectGateway}
                  disabled={isProcessing}
                />
              </div>
            )}

            {/* Action Button */}
            <button
              type="button"
              onClick={() => onSelectPlan(activePlan)}
              disabled={isProcessing || normalizedCurrentPlan === activePlan.id}
              className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold font-mono transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 min-h-[48px] shadow-2xs ${
                normalizedCurrentPlan === activePlan.id
                  ? 'bg-bg-tertiary text-text-muted border border-border-default cursor-not-allowed'
                  : 'btn-primary'
              }`}
            >
              {isProcessing ? (
                <span>Processing Razorpay Checkout...</span>
              ) : normalizedCurrentPlan === activePlan.id ? (
                <span>Current Plan (Active)</span>
              ) : activePlan.priceInr === 0 ? (
                <span>Free Plan (Default)</span>
              ) : (
                <>
                  <span>Subscribe to {activePlan.name} — ₹{activePlan.priceInr.toLocaleString('en-IN')}/mo with Razorpay</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.div>
        </div>

        {/* ── 4. Comparison Matrix ────────────────────────────────────────────── */}
        <div className="bg-bg-secondary rounded-xl border border-border-default overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setShowComparison(!showComparison)}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left font-bold text-xs sm:text-sm text-text-primary hover:text-brand-primary transition-colors cursor-pointer min-h-[44px]"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-primary" />
              <span>Compare All 5 Plan Specifications Side-by-Side</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-text-secondary font-mono">
              <span>{showComparison ? 'Hide details' : 'Show full matrix'}</span>
              {showComparison ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          <AnimatePresence>
            {showComparison && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-x-auto border-t border-border-subtle"
              >
                <table className="w-full text-left text-xs font-mono min-w-[650px]">
                  <thead className="bg-bg-tertiary text-text-secondary text-[11px] border-b border-border-subtle">
                    <tr>
                      <th className="sticky left-0 bg-bg-tertiary z-10 px-4 py-3 font-sans font-semibold border-r border-border-subtle">
                        Dimension
                      </th>
                      <th className="px-3 py-3">Free (₹0)</th>
                      <th className="px-3 py-3">Starter (₹299)</th>
                      <th className="px-3 py-3 text-brand-primary font-bold">Pro (₹749)</th>
                      <th className="px-3 py-3">Growth (₹1,499)</th>
                      <th className="px-3 py-3">Studio (₹4,999)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle text-[11px]">
                    <tr className="hover:bg-bg-tertiary/40">
                      <td className="sticky left-0 bg-bg-secondary z-10 px-4 py-3 font-sans text-text-secondary font-medium border-r border-border-subtle">
                        Monthly AI Credits
                      </td>
                      <td className="px-3 py-3">0 (Free models)</td>
                      <td className="px-3 py-3 font-bold text-text-primary">400</td>
                      <td className="px-3 py-3 font-bold text-brand-primary">1,000</td>
                      <td className="px-3 py-3 font-bold text-text-primary">2,000</td>
                      <td className="px-3 py-3 font-bold text-purple-700 dark:text-purple-400">6,500</td>
                    </tr>
                    <tr className="hover:bg-bg-tertiary/40">
                      <td className="sticky left-0 bg-bg-secondary z-10 px-4 py-3 font-sans text-text-secondary font-medium border-r border-border-subtle">
                        Official Premium Prompts
                      </td>
                      <td className="px-3 py-3 text-text-muted">Locked (₹200+ topup or plan)</td>
                      <td className="px-3 py-3 text-brand-primary font-bold">Included</td>
                      <td className="px-3 py-3 text-brand-primary font-bold">Included</td>
                      <td className="px-3 py-3 text-brand-primary font-bold">Included</td>
                      <td className="px-3 py-3 text-brand-primary font-bold">Included</td>
                    </tr>
                    <tr className="hover:bg-bg-tertiary/40">
                      <td className="sticky left-0 bg-bg-secondary z-10 px-4 py-3 font-sans text-text-secondary font-medium border-r border-border-subtle">
                        Free Model Analyses
                      </td>
                      <td className="px-3 py-3">2 / day</td>
                      <td className="px-3 py-3">10 / day</td>
                      <td className="px-3 py-3 text-brand-primary font-bold">20 / day</td>
                      <td className="px-3 py-3">40 / day</td>
                      <td className="px-3 py-3 font-bold">100 / day</td>
                    </tr>
                    <tr className="hover:bg-bg-tertiary/40">
                      <td className="sticky left-0 bg-bg-secondary z-10 px-4 py-3 font-sans text-text-secondary font-medium border-r border-border-subtle">
                        Team Workspaces
                      </td>
                      <td className="px-3 py-3">1</td>
                      <td className="px-3 py-3">3</td>
                      <td className="px-3 py-3 text-brand-primary font-bold">7</td>
                      <td className="px-3 py-3">15</td>
                      <td className="px-3 py-3 font-bold">50</td>
                    </tr>
                    <tr className="hover:bg-bg-tertiary/40">
                      <td className="sticky left-0 bg-bg-secondary z-10 px-4 py-3 font-sans text-text-secondary font-medium border-r border-border-subtle">
                        Prompt Optimizer
                      </td>
                      <td className="px-3 py-3">3 core modes (Co-Star, Clarify, Compress)</td>
                      <td className="px-3 py-3 text-brand-primary font-bold">All features & modes</td>
                      <td className="px-3 py-3 text-brand-primary font-bold">All features & modes</td>
                      <td className="px-3 py-3 text-brand-primary font-bold">All features & modes</td>
                      <td className="px-3 py-3 font-bold">Full Suite</td>
                    </tr>
                    <tr className="hover:bg-bg-tertiary/40">
                      <td className="sticky left-0 bg-bg-secondary z-10 px-4 py-3 font-sans text-text-secondary font-medium border-r border-border-subtle">
                        Cloud Storage
                      </td>
                      <td className="px-3 py-3">500 MB</td>
                      <td className="px-3 py-3 text-brand-primary font-bold">2 GB</td>
                      <td className="px-3 py-3 text-brand-primary font-bold">5 GB</td>
                      <td className="px-3 py-3">10 GB</td>
                      <td className="px-3 py-3 font-bold">30 GB</td>
                    </tr>
                    <tr className="hover:bg-bg-tertiary/40">
                      <td className="sticky left-0 bg-bg-secondary z-10 px-4 py-3 font-sans text-text-secondary font-medium border-r border-border-subtle">
                        Collections Allowed
                      </td>
                      <td className="px-3 py-3">3</td>
                      <td className="px-3 py-3 text-brand-primary font-bold">7</td>
                      <td className="px-3 py-3 text-brand-primary font-bold">15</td>
                      <td className="px-3 py-3">30</td>
                      <td className="px-3 py-3 font-bold">100</td>
                    </tr>
                    <tr className="hover:bg-bg-tertiary/40">
                      <td className="sticky left-0 bg-bg-secondary z-10 px-4 py-3 font-sans text-text-secondary font-medium border-r border-border-subtle">
                        Peak Traffic Access
                      </td>
                      <td className="px-3 py-3 text-text-muted">Standard</td>
                      <td className="px-3 py-3 text-text-muted">Standard</td>
                      <td className="px-3 py-3 text-brand-primary font-bold">Priority queue</td>
                      <td className="px-3 py-3 font-bold">Priority queue</td>
                      <td className="px-3 py-3 font-bold text-purple-700 dark:text-purple-400">Dedicated Priority</td>
                    </tr>
                    <tr className="hover:bg-bg-tertiary/40">
                      <td className="sticky left-0 bg-bg-secondary z-10 px-4 py-3 font-sans text-text-secondary font-medium border-r border-border-subtle">
                        Support Level
                      </td>
                      <td className="px-3 py-3 text-text-muted">Community</td>
                      <td className="px-3 py-3 text-text-muted">Community</td>
                      <td className="px-3 py-3 text-text-muted">Standard</td>
                      <td className="px-3 py-3 text-brand-primary font-bold">Priority Support</td>
                      <td className="px-3 py-3 font-bold text-purple-700 dark:text-purple-400">Dedicated Priority</td>
                    </tr>
                    <tr className="hover:bg-bg-tertiary/40">
                      <td className="sticky left-0 bg-bg-secondary z-10 px-4 py-3 font-sans text-text-secondary font-medium border-r border-border-subtle">
                        Profile Badge
                      </td>
                      <td className="px-3 py-3">Free Explorer</td>
                      <td className="px-3 py-3 text-sky-700 dark:text-sky-400">Starter Member</td>
                      <td className="px-3 py-3 text-brand-primary font-bold">Pro Member</td>
                      <td className="px-3 py-3 text-amber-700 dark:text-amber-400 font-bold">Growth Member</td>
                      <td className="px-3 py-3 text-purple-700 dark:text-purple-400 font-bold">Studio Elite</td>
                    </tr>
                  </tbody>
                </table>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
};
