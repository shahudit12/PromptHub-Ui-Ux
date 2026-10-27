/**
 * src/config/billingConfig.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Single Source of Truth for PromptHub Billing & Pricing.
 *
 * 1. SUBSCRIPTION PLANS (Strategy Source + Explicit Business INR Configuration):
 *    - Free:       $0 / ₹0         (25 Monthly Credits)
 *    - Pro (Hero): $9.99 / ₹799    (500 Monthly Credits)
 *    - Pro+:       $19.99 / ₹1,599 (2,000 Monthly Credits)
 *    - Team:       $49.00 / ₹3,999 (7,000 Monthly Credits, up to 5 seats)
 *    - Business:   $149+ / ₹11,999 (25,000 Monthly Credits)
 *    - Enterprise: Custom          (Custom allocation, SSO/SAML, SLA)
 *
 * 2. TOP-UP CREDIT WALLET (Separate Financial Product):
 *    - Conversion Policy: ₹100 INR = 200 Credits (₹0.50 / credit)
 *    - Range Limits: Minimum ₹1 to Maximum ₹20,000
 *    - Bundles: ₹10 (+20), ₹20 (+40), ₹50 (+100), ₹100 (+200), ₹200 (+400), ₹500 (+1,000), ₹1,000 (+2,000), ₹2,000 (+4,000), ₹5,000 (+10,000)
 *    - Notice: Top-Up cards communicate "+X Credits", NOT product tier names.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface PlanPricing {
  monthly: string;
  yearly: string;
}

export interface PlanAmountInMinorUnits {
  monthly: number; // paise for INR, cents for USD
  yearly: number;
}

export interface PlanFeature {
  text: string;
  highlight?: boolean;
}

export interface SubscriptionPlan {
  id: 'free' | 'pro' | 'pro_plus' | 'team' | 'business' | 'enterprise';
  name: 'Free' | 'Pro' | 'Pro+' | 'Team' | 'Business' | 'Enterprise';
  tagline: string;
  badge?: string;
  popular?: boolean;
  monthlyCredits: number;
  price: {
    USD: PlanPricing;
    INR: PlanPricing;
  };
  amountInMinorUnits: {
    USD: PlanAmountInMinorUnits; // in cents
    INR: PlanAmountInMinorUnits; // in paise
  };
  amountInPaise: {
    USD: PlanAmountInMinorUnits;
    INR: PlanAmountInMinorUnits;
  };
  period: string;
  ctaText: string;
  ctaDisabled?: boolean;
  features: PlanFeature[];
  target: string;
}

export interface TopupBundle {
  inr: number;
  formattedInr: string;
  credits: number;
  badge?: string;
  popular?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SUBSCRIPTION PLANS CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'For students, casual experimenters, and developers evaluating PromptHub.',
    badge: 'Free Forever',
    popular: false,
    monthlyCredits: 0,
    price: {
      USD: { monthly: '$0', yearly: '$0' },
      INR: { monthly: '₹0', yearly: '₹0' },
    },
    amountInMinorUnits: {
      USD: { monthly: 0, yearly: 0 },
      INR: { monthly: 0, yearly: 0 },
    },
    amountInPaise: {
      USD: { monthly: 0, yearly: 0 },
      INR: { monthly: 0, yearly: 0 },
    },
    period: 'forever',
    ctaText: 'Current Plan',
    ctaDisabled: true,
    features: [
      { text: 'Free OpenRouter Access (0 Credits Required)', highlight: true },
      { text: 'Basic Prompt Analysis & Diagnosis', highlight: false },
      { text: 'Limited Prompt Improvement', highlight: false },
      { text: 'Basic Prompt Arena (Head-to-head comparisons)', highlight: false },
      { text: 'Limited Prompt History & Saved Prompts', highlight: false },
      { text: 'Basic Model Comparison (GPT-4o mini, Gemini Flash)', highlight: false },
      { text: 'BYOK (Bring Your Own Key) Vault Included', highlight: true },
    ],
    target: 'Students & casual developers',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For individual AI users, creators, and prompt engineers shipping to production.',
    badge: 'Most Popular',
    popular: true,
    monthlyCredits: 1000,
    price: {
      USD: { monthly: '$8.99', yearly: '$7.19' },
      INR: { monthly: '₹749', yearly: '₹599' },
    },
    amountInMinorUnits: {
      USD: { monthly: 899, yearly: 8628 },
      INR: { monthly: 74900, yearly: 719000 }, // ₹749/mo or ₹7,190/yr
    },
    amountInPaise: {
      USD: { monthly: 899, yearly: 8628 },
      INR: { monthly: 74900, yearly: 719000 },
    },
    period: 'per month',
    ctaText: 'Upgrade to Pro',
    ctaDisabled: false,
    features: [
      { text: '1,000 Monthly AI Credits', highlight: true },
      { text: 'Everything in Free Tier', highlight: false },
      { text: 'Advanced Prompt Diagnosis & Optimization', highlight: true },
      { text: 'Full Claude 3.7 Sonnet, GPT-4o & DeepSeek R1', highlight: true },
      { text: 'Unlimited Saved Prompts, Collections & History', highlight: false },
      { text: 'Prompt Versioning & Diff Inspections', highlight: false },
      { text: 'Prompt Arena Benchmarking & Quality Scoring', highlight: true },
      { text: 'Export Functionality (JSON, Markdown, Code)', highlight: false },
      { text: 'Browser Extension & Curated Templates', highlight: false },
    ],
    target: 'Individual AI engineers & creators',
  },
  {
    id: 'pro_plus',
    name: 'Pro+',
    tagline: 'For power users, AI builders, and professional engineers running heavy evaluations.',
    badge: 'AI Builders',
    popular: false,
    monthlyCredits: 2000,
    price: {
      USD: { monthly: '$45.00', yearly: '$36.00' },
      INR: { monthly: '₹3,499', yearly: '₹2,799' },
    },
    amountInMinorUnits: {
      USD: { monthly: 4500, yearly: 43200 },
      INR: { monthly: 349900, yearly: 3358800 }, // ₹3,499/mo or ₹33,588/yr (20% off)
    },
    amountInPaise: {
      USD: { monthly: 4500, yearly: 43200 },
      INR: { monthly: 349900, yearly: 3358800 },
    },
    period: 'per month',
    ctaText: 'Get Pro+',
    ctaDisabled: false,
    features: [
      { text: '2,000 Monthly AI Credits', highlight: true },
      { text: 'Everything in Pro Tier', highlight: false },
      { text: 'Advanced Multi-Model Arena Shootouts', highlight: true },
      { text: 'A/B Testing & Regression Suite', highlight: true },
      { text: 'Custom Rubric Evaluation Criteria', highlight: false },
      { text: 'Batch Optimization & Auto-Tuning', highlight: true },
      { text: 'PromptHub Developer API & Webhooks Access', highlight: true },
      { text: 'In-Depth Latency, Quality & Cost Analytics', highlight: false },
    ],
    target: 'Power users & professional AI builders',
  },
  {
    id: 'team',
    name: 'Team',
    tagline: 'For startups, software agencies, and AI engineering teams collaborating on prompts.',
    badge: '5 Seats',
    popular: false,
    monthlyCredits: 7000,
    price: {
      USD: { monthly: '$149', yearly: '$119' },
      INR: { monthly: '₹11,999', yearly: '₹9,599' },
    },
    amountInMinorUnits: {
      USD: { monthly: 14900, yearly: 142800 },
      INR: { monthly: 1199900, yearly: 11518800 }, // ₹11,999/mo or ₹115,188/yr
    },
    amountInPaise: {
      USD: { monthly: 14900, yearly: 142800 },
      INR: { monthly: 1199900, yearly: 11518800 },
    },
    period: 'per month',
    ctaText: 'Start Team Plan',
    ctaDisabled: false,
    features: [
      { text: '7,000 Monthly Team Credits', highlight: true },
      { text: 'Up to 5 Included Team Member Seats', highlight: true },
      { text: 'Shared Prompt Libraries & Collaborative Workspaces', highlight: true },
      { text: 'Granular Role-Based Access (Admin, Editor, Viewer)', highlight: false },
      { text: 'Team Version Control & Branch Merging', highlight: false },
      { text: 'Team Arena Benchmarks & Shared Leaderboards', highlight: false },
      { text: 'Centralized Team API Keys & Billing', highlight: true },
      { text: 'Configurable Additional Seats on Demand', highlight: false },
    ],
    target: 'Small teams & agencies',
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'For scaling companies, AI product houses, and enterprises with strict governance.',
    badge: 'Organization',
    popular: false,
    monthlyCredits: 25000,
    price: {
      USD: { monthly: '$549', yearly: '$439' },
      INR: { monthly: '₹42,999', yearly: '₹34,399' },
    },
    amountInMinorUnits: {
      USD: { monthly: 54900, yearly: 526800 },
      INR: { monthly: 4299900, yearly: 41278800 }, // ₹42,999/mo or ₹412,788/yr
    },
    amountInPaise: {
      USD: { monthly: 54900, yearly: 526800 },
      INR: { monthly: 4299900, yearly: 41278800 },
    },
    period: 'per month',
    ctaText: 'Subscribe to Business',
    ctaDisabled: false,
    features: [
      { text: '25,000 Monthly Credits', highlight: true },
      { text: 'Everything in Team Plan', highlight: false },
      { text: 'Organization-Level Workspaces & RBAC', highlight: true },
      { text: 'Full Audit Logs & Security Telemetry', highlight: true },
      { text: 'Custom Evaluation Metrics & Fine-Tuned Rubrics', highlight: false },
      { text: 'Custom Model Gateway Configurations', highlight: false },
      { text: 'Enterprise Data Controls & Zero Retention Guarantees', highlight: true },
      { text: 'Priority Fast-Queue OpenRouter AI Routing', highlight: false },
      { text: 'Dedicated Priority Email & Discord Support', highlight: false },
    ],
    target: 'Scaling companies & AI startups',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For large organizations needing custom infrastructure, dedicated SLAs, and compliance.',
    badge: 'Custom Tailored',
    popular: false,
    monthlyCredits: 0,
    price: {
      USD: { monthly: 'Custom', yearly: 'Custom' },
      INR: { monthly: 'Custom', yearly: 'Custom' },
    },
    amountInMinorUnits: {
      USD: { monthly: 0, yearly: 0 },
      INR: { monthly: 0, yearly: 0 },
    },
    amountInPaise: {
      USD: { monthly: 0, yearly: 0 },
      INR: { monthly: 0, yearly: 0 },
    },
    period: 'contract',
    ctaText: 'Contact Enterprise Sales',
    ctaDisabled: false,
    features: [
      { text: 'Custom Monthly Credit Allocation', highlight: true },
      { text: 'SSO / SAML & SCIM User Provisioning', highlight: true },
      { text: 'Advanced RBAC & Departmental Partitioning', highlight: false },
      { text: 'Dedicated Infrastructure or Private VPC Deployment', highlight: true },
      { text: 'Custom Data Retention & Zero-Data-Logging SLA', highlight: true },
      { text: 'Custom Foundation Model Deployments', highlight: false },
      { text: '99.9% Uptime SLA Guarantee', highlight: false },
      { text: 'Dedicated Account Manager & Security Reviews', highlight: false },
      { text: 'Volume & Multi-Year Discounting', highlight: false },
    ],
    target: 'Large enterprises & regulated entities',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. TOP-UP WALLET CONFIGURATION (AUTHORITATIVE: 1 CREDIT = ₹0.50 INR, ₹100 = 200 CREDITS)
// ─────────────────────────────────────────────────────────────────────────────
import { INR_PER_CREDIT, CREDITS_PER_INR, inrToCredits } from './creditEconomics';

export const DEFAULT_TOPUP_CONVERSION_RATE = CREDITS_PER_INR; // 1 Credit = ₹0.50 INR (₹1 = 2 credits)
export const MIN_TOPUP_AMOUNT_INR = 1; // ₹1 minimum
export const MAX_TOPUP_AMOUNT_INR = 20000; // ₹20,000 maximum

export const TOPUP_BUNDLES: TopupBundle[] = [
  { inr: 10, formattedInr: '₹10', credits: Math.floor(10 / INR_PER_CREDIT), badge: 'Micro' },
  { inr: 20, formattedInr: '₹20', credits: Math.floor(20 / INR_PER_CREDIT) },
  { inr: 50, formattedInr: '₹50', credits: Math.floor(50 / INR_PER_CREDIT) },
  { inr: 100, formattedInr: '₹100', credits: Math.floor(100 / INR_PER_CREDIT), badge: 'Starter' },
  { inr: 200, formattedInr: '₹200', credits: Math.floor(200 / INR_PER_CREDIT), badge: 'Power Patron' },
  { inr: 500, formattedInr: '₹500', credits: Math.floor(500 / INR_PER_CREDIT), badge: 'Popular', popular: true },
  { inr: 1000, formattedInr: '₹1,000', credits: Math.floor(1000 / INR_PER_CREDIT), badge: 'Best value' },
  { inr: 2000, formattedInr: '₹2,000', credits: Math.floor(2000 / INR_PER_CREDIT) },
  { inr: 5000, formattedInr: '₹5,000', credits: Math.floor(5000 / INR_PER_CREDIT) },
];

/**
 * Format INR with standard Indian currency separator (e.g. 1000 -> "₹1,000")
 */
export function formatInr(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

/**
 * Calculate credits client-side for UX estimation display only.
 * Authoritative valuation: 1 credit = ₹0.50 INR (₹1 = 2 credits).
 */
export function calculateEstimatedCredits(inr: number): number {
  if (!Number.isFinite(inr) || inr <= 0) return 0;
  return inrToCredits(inr);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PROMPTHUB 5-TIER SUBSCRIPTION PLANS
//    These are the canonical user-facing subscription plans shown in PricingView.
//    IDs: 'free' | 'starter' | 'pro' | 'growth' | 'studio'
// ─────────────────────────────────────────────────────────────────────────────

export interface PlanTier {
  id: 'free' | 'starter' | 'pro' | 'growth' | 'studio';
  name: string;
  tagline: string;
  badgeId: string;
  badgeLabel: string;
  credits: number;         // monthly credits
  priceInr: number;        // monthly launch price (₹)
  futurePriceInr: number;  // post-launch price (₹)
  analyzerRunsPerDay: number;
  teamSlots: number;
  optimizerDescription: string;
  storageMb: number;
  collectionsPerUser: number;
  outputQuality?: 'Standard' | 'Better' | 'Better+' | 'Best';
  priorityHighTraffic: boolean;
  prioritySupport: boolean;
  popular: boolean;
  isPrimary: boolean;
  features: string[];
  ctaText: string;
}

export const PLAN_TIERS: PlanTier[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Explore with open-source AI',
    badgeId: 'free_explorer',
    badgeLabel: 'Free Explorer',
    credits: 0,
    priceInr: 0,
    futurePriceInr: 0,
    analyzerRunsPerDay: 3,
    teamSlots: 1,
    optimizerDescription: '3 core modes (CO-STAR, Clarify, Token Compress)',
    storageMb: 500,
    collectionsPerUser: 3,
    outputQuality: 'Standard',
    priorityHighTraffic: false,
    prioritySupport: false,
    popular: false,
    isPrimary: false,
    features: [
      'Free OpenRouter models access',
      '3 analyses / day (free models)',
      '1 team workspace',
      '3 optimizer modes (CO-STAR, Clarify, Token Compress)',
      '500 MB storage vault · 3 collections',
      'Limited resource & upload access',
    ],
    ctaText: 'Start for Free',
  },
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'First step into serious prompting',
    badgeId: 'starter_member',
    badgeLabel: 'Starter Member',
    credits: 400,
    priceInr: 299,
    futurePriceInr: 499,
    analyzerRunsPerDay: 10,
    teamSlots: 3,
    optimizerDescription: 'All features & modes',
    storageMb: 2048,
    collectionsPerUser: 7,
    outputQuality: 'Standard',
    priorityHighTraffic: false,
    prioritySupport: false,
    popular: false,
    isPrimary: false,
    features: [
      '400 credits — usable on all AI models',
      '10 analyses / day (free models)',
      '3 team workspaces',
      'All optimizer features & modes',
      '2 GB storage vault · 7 collections',
      'More access & uploads than Free',
      'Official Premium Prompts included',
    ],
    ctaText: 'Get Starter',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Complete AI engineering studio',
    badgeId: 'pro_member',
    badgeLabel: 'Pro Member',
    credits: 1000,
    priceInr: 749,
    futurePriceInr: 1099,
    analyzerRunsPerDay: 20,
    teamSlots: 7,
    optimizerDescription: 'All features & modes',
    storageMb: 5120,
    collectionsPerUser: 15,
    outputQuality: 'Better',
    priorityHighTraffic: true,
    prioritySupport: false,
    popular: true,
    isPrimary: true,
    features: [
      '1,000 monthly credits — all AI models',
      '20 analyses / day (free models)',
      '7 team workspaces',
      'All optimizer features & modes',
      '5 GB storage vault · 15 collections',
      'More access & uploads than ₹299',
      'Priority high-traffic access',
      'Official Premium Prompts included',
    ],
    ctaText: 'Get Pro',
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'Scale your team and quality',
    badgeId: 'growth_member',
    badgeLabel: 'Growth Member',
    credits: 2000,
    priceInr: 1499,
    futurePriceInr: 2499,
    analyzerRunsPerDay: 40,
    teamSlots: 15,
    optimizerDescription: 'All features & modes',
    storageMb: 10240,
    collectionsPerUser: 30,
    outputQuality: 'Better+',
    priorityHighTraffic: true,
    prioritySupport: true,
    popular: false,
    isPrimary: false,
    features: [
      '2,000 credits — all AI models',
      '40 analyses / day (free models)',
      '15 team workspaces',
      'All optimizer features & modes',
      '10 GB storage vault · 30 collections',
      'Priority support',
      'Official Premium Prompts included',
    ],
    ctaText: 'Get Growth',
  },
  {
    id: 'studio',
    name: 'Studio',
    tagline: 'Maximum power for serious teams',
    badgeId: 'studio_elite',
    badgeLabel: 'Studio Elite',
    credits: 6500,
    priceInr: 4999,
    futurePriceInr: 7999,
    analyzerRunsPerDay: 100,
    teamSlots: 50,
    optimizerDescription: 'Full suite (all features)',
    storageMb: 30720,
    collectionsPerUser: 100,
    outputQuality: 'Best',
    priorityHighTraffic: true,
    prioritySupport: true,
    popular: false,
    isPrimary: false,
    features: [
      '6,500 credits — all AI models',
      '100 analyses / day (free models)',
      '50 team workspaces',
      'Full optimizer suite',
      '30 GB storage vault · 100 collections',
      'Priority support + high-traffic access',
      'Official Premium Prompts included',
    ],
    ctaText: 'Get Studio',
  },
];

/**
 * Resolves the active PlanTier definition for a given user.
 * Admin users inherit maximum Studio Elite allocations.
 */
export function getUserPlanTier(
  user: { plan?: string; role?: string; hasPremiumAccess?: boolean; proUntil?: string | null } | null | undefined
): PlanTier {
  if (!user) {
    return PLAN_TIERS[0]; // Free tier
  }

  if (user.role === 'Admin') {
    return PLAN_TIERS[4]; // Studio Elite
  }

  const rawPlan = (user.plan || '').toLowerCase().trim();

  // If subscription has expired, revert to Free
  if (user.proUntil) {
    const expiresAt = new Date(user.proUntil).getTime();
    if (expiresAt <= Date.now() && rawPlan !== 'free') {
      return PLAN_TIERS[0];
    }
  }

  if (rawPlan === 'studio' || rawPlan === 'studio_elite' || rawPlan === 'business' || rawPlan === 'enterprise') {
    return PLAN_TIERS[4];
  }
  if (rawPlan === 'growth' || rawPlan === 'growth_member' || rawPlan === 'team') {
    return PLAN_TIERS[3];
  }
  if (rawPlan === 'pro' || rawPlan === 'pro_member' || rawPlan === 'pro_plus' || user.hasPremiumAccess) {
    return PLAN_TIERS[2];
  }
  if (rawPlan === 'starter' || rawPlan === 'starter_member') {
    return PLAN_TIERS[1];
  }

  return PLAN_TIERS[0];
}

