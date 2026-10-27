/**
 * src/config/promotionConfig.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Single Source of Truth for PromptHub Launch Promotional Pricing.
 *
 * HARD ECONOMIC RULES:
 * 1. Promotional pricing affects the customer purchase price ONLY.
 * 2. It does NOT alter:
 *    - provider cost calculation (OpenRouter / AICredits)
 *    - token usage and AI execution settlement
 *    - target-margin pricing engine (35% target gross margin)
 *    - credit consumption per request
 *    - BYOK zero-cost execution
 * 3. When promotion expires, standardPriceInr automatically becomes the purchase price.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  standardPriceInr: number;
  launchPriceInr: number;
  discountPercent: number; // e.g. 33.33 for 33.33% off
  popular?: boolean;
  tagline?: string;
  badge?: string;
  valueStack?: string[];
}

export interface PromotionConfig {
  enabled: boolean;
  name: string;
  label: string;
  headline: string;
  subheadline: string;
  badgeText: string;
  heroOfferHeadline: string;
  heroOfferSubheadline: string;
  startAt: string; // ISO string
  endAt: string | null; // ISO string or null for ongoing launch
  packages: Record<string, CreditPackage>;
}

export const PROMOTION_CONFIG: PromotionConfig = {
  enabled: true,
  name: 'NEW_LAUNCH',
  label: 'Launch Special',
  headline: '🚀 Launch Special: Up to 30% Off Top-Up Bundles!',
  subheadline: 'Standard rate: ₹1 = 2 Credits. Top up and start prompting across frontier AI models.',
  badgeText: '⚡ LAUNCH DISCOUNT',
  heroOfferHeadline: 'SPECIAL LAUNCH RATES ON DEVELOPER CREDITS.',
  heroOfferSubheadline: 'Get up to 30% off top-up packages. Credits never expire.',
  startAt: '2026-10-21T00:00:00+05:30',
  endAt: '2026-11-18T23:59:59+05:30', // Launch offer active for 28 days (Ends November 18, 2026)
  packages: {
    topup_starter: {
      id: 'topup_starter',
      name: 'Starter Bundle',
      credits: 200,
      standardPriceInr: 100, // 200 credits at ₹1 = 2 credits is ₹100
      launchPriceInr: 70, // 30% launch discount off standard ₹100
      discountPercent: 30.0,
      popular: true,
      tagline: 'Ideal for prompt architects, rapid prototyping, and exploring frontier models.',
      badge: '🚀 Launch Special',
      valueStack: [
        '200 PromptHub Credits (Lifetime Validity)',
        'Full access to 100+ AI models (Claude 3.7, DeepSeek R1, GPT-4o)',
        'Instant wallet top-up via Razorpay (UPI, Cards, NetBanking)',
        'Standard rate: ₹1 = 2 Credits (30% launch discount)',
      ],
    },
    topup_pro: {
      id: 'topup_pro',
      name: 'Pro Bundle',
      credits: 500,
      standardPriceInr: 250, // 500 credits at ₹1 = 2 credits is ₹250
      launchPriceInr: 175, // 30% launch discount off standard ₹250
      discountPercent: 30.0,
      popular: false,
      tagline: 'For daily prompt engineers, builders, and continuous workflow automation.',
      badge: 'Best Value',
      valueStack: [
        '500 PromptHub Credits (Lifetime Validity)',
        'Full access to all reasoning & frontier model tiers',
        'Priority concurrency & instant credit settlement',
        'Standard rate: ₹1 = 2 Credits (30% launch discount)',
      ],
    },
    topup_power: {
      id: 'topup_power',
      name: 'Power Bundle',
      credits: 1000,
      standardPriceInr: 500, // 1000 credits at ₹1 = 2 credits is ₹500
      launchPriceInr: 350, // 30% launch discount off standard ₹500
      discountPercent: 30.0,
      popular: false,
      tagline: 'High-throughput studio workloads, batch prompt evaluation, and team experiments.',
      badge: 'Power Architect',
      valueStack: [
        '1,000 PromptHub Credits (Lifetime Validity)',
        'Unrestricted multi-model batch evaluations',
        'Permanent credit balance — never expires',
        'Standard rate: ₹1 = 2 Credits (30% launch discount)',
      ],
    },
  },
};

/**
 * Determines whether the launch promotion is currently active.
 */
export function isPromotionActive(config: PromotionConfig = PROMOTION_CONFIG, now: Date = new Date()): boolean {
  if (!config.enabled) return false;

  const startTime = new Date(config.startAt).getTime();
  if (now.getTime() < startTime) return false;

  if (config.endAt) {
    const endTime = new Date(config.endAt).getTime();
    if (now.getTime() > endTime) return false;
  }

  return true;
}

export interface EffectivePricingResult {
  packageId: string;
  name: string;
  credits: number;
  priceInr: number;
  standardPriceInr: number;
  launchPriceInr: number;
  isDiscounted: boolean;
  discountPercent: number;
  discountPercentRounded: number;
  discountAmountInr: number;
  savingsInr: number;
  effectiveRateInr: number; // e.g. 0.50
  standardRateInr: number; // e.g. 0.75
  badge?: string;
  popular?: boolean;
  tagline?: string;
  valueStack: string[];
  promotionLabel: string;
  ctaText: string;
}

/**
 * Computes the authoritative customer price and discount details for a package.
 */
export function getEffectivePackagePricing(
  packageOrId: string | CreditPackage,
  config: PromotionConfig = PROMOTION_CONFIG,
  now: Date = new Date()
): EffectivePricingResult {
  let pkg: CreditPackage | undefined;
  if (typeof packageOrId === 'string') {
    const key = packageOrId.startsWith('topup_') ? packageOrId : `topup_${packageOrId}`;
    pkg = config.packages[key] || config.packages[packageOrId] || Object.values(config.packages).find(p => p.id === packageOrId || p.id === key);
  } else {
    pkg = packageOrId;
  }

  if (!pkg) {
    throw new Error(`Invalid package: ${typeof packageOrId === 'string' ? packageOrId : 'unknown'}`);
  }

  const active = isPromotionActive(config, now);
  const isDiscounted = active && pkg.launchPriceInr < pkg.standardPriceInr;
  const effectivePriceInr = isDiscounted ? pkg.launchPriceInr : pkg.standardPriceInr;
  const savingsInr = isDiscounted ? pkg.standardPriceInr - pkg.launchPriceInr : 0;
  const discountPercent = isDiscounted
    ? Math.round(((pkg.standardPriceInr - pkg.launchPriceInr) / pkg.standardPriceInr) * 10000) / 100
    : 0;

  const effectiveRateInr = Math.round((effectivePriceInr / pkg.credits) * 100) / 100;
  const standardRateInr = Math.round((pkg.standardPriceInr / pkg.credits) * 100) / 100;

  return {
    packageId: pkg.id,
    name: pkg.name,
    credits: pkg.credits,
    priceInr: effectivePriceInr,
    standardPriceInr: pkg.standardPriceInr,
    launchPriceInr: pkg.launchPriceInr,
    isDiscounted,
    discountPercent,
    discountPercentRounded: Math.round(discountPercent),
    discountAmountInr: savingsInr,
    savingsInr,
    effectiveRateInr,
    standardRateInr,
    badge: pkg.badge,
    popular: pkg.popular,
    tagline: pkg.tagline,
    valueStack: pkg.valueStack || [
      `${pkg.credits.toLocaleString()} PromptHub Credits`,
      'Instant wallet top-up',
      'Transparent usage tracking',
      'No expiration date',
    ],
    promotionLabel: config.label,
    ctaText: `GET ${pkg.credits.toLocaleString()} CREDITS — ₹${effectivePriceInr}`,
  };
}

/**
 * Returns all packages with their active promotional pricing.
 */
export function getAllPromotionalPackages(
  config: PromotionConfig = PROMOTION_CONFIG,
  now: Date = new Date()
): EffectivePricingResult[] {
  return Object.values(config.packages).map(pkg => getEffectivePackagePricing(pkg, config, now));
}
