/**
 * src/config/creditEconomics.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Business Valuation & Credit Economics for PromptHub.cloud (V2).
 *
 * HARD BUSINESS RULES:
 *   Authoritative Canonical Valuation: 1 Credit = ₹0.50 INR (50 paise)
 *   Zero Credits Baseline: 0 initial credits on signup (Free OpenRouter tier with 0 credits required)
 *   Gross Margin Target: ≥ 40% on AICredits upstream token consumption
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const PROMPTHUB_ECONOMICS_VERSION = 'ph-econ-2026-08-v7';

/** Authoritative credit conversion constants */
export const INR_PER_CREDIT = 0.50; // ₹0.50 INR per 1 PromptHub credit
export const STANDARD_INR_PER_CREDIT = 0.50; // ₹0.50 INR canonical valuation
export const PAISE_PER_CREDIT = 50; // 50 paise per 1 PromptHub credit
export const CREDITS_PER_INR = 2.0; // 2.0 credits per ₹1 INR (at ₹0.50/credit)
export const CREDITS_PER_HUNDRED_INR = 200; // ₹100 user payment = 200 credits
export const USD_TO_INR_RATE = 86.50; // USD to INR exchange conversion
export const TARGET_GROSS_MARGIN_PERCENT = 30; // Target 30% gross platform margin
export const MIN_GROSS_MARGIN_PERCENT = 30; // Hard 30% gross platform margin floor

/** Discontinued Free Promo Constants (Retained for zero-credit baseline) */
export const FIRST_30_USERS_CREDITS = 0;
export const FIRST_30_USERS_TOTAL_SLOTS = 0;
export const FIRST_30_USERS_VALUE_INR = 0.00;
export const FIRST_30_USERS_PRICE_INR = 0;

// Backward-compatibility aliases
export const LAUNCH_BONUS_CREDITS = 0;
export const LAUNCH_BONUS_TOTAL_SLOTS = 0;
export const LAUNCH_BONUS_VALUE_INR = 0.00;
export const LAUNCH_BONUS_PRICE_INR = 0;

/** Category 2 Discounted Router & Free Model Invariants */
export const CATEGORY_2_DISCOUNT_PERCENT = 30; // 30% credit discount on Category 2 models
export const CATEGORY_2_CREDIT_MULTIPLIER = 0.70; // 0.70x credit multiplier
export const FREE_MODEL_CREDITS_REQUIRED = 0; // Free models consume 0 credits

/** 
 * Internal Provider Cost Economics (Strictly hidden from users):
 *   Owner cost: 1 aicredit.in = ₹1.00 INR
 *   Owner profit: ₹0.30 INR profit on every ₹1.00 upstream cost (30% profit)
 *   Customer charge: ₹1.30 INR per 1 aicredit.in
 *   PromptHub credits charged: ₹1.30 / ₹0.50 = 2.6 PromptHub credits per aicredit
 */
export const AICREDIT_COST_INR = 1.00;
export const TARGET_PROFIT_PER_AICREDIT_INR = 0.30;
export const CUSTOMER_INR_PER_AICREDIT = 1.30;
export const PROMPTHUB_CREDITS_PER_AICREDIT = 2.6;

/**
 * Converts upstream AICredits cost to PromptHub credits charged to the user.
 * Guarantees exactly 30% profit on every ₹1.00 of upstream cost (₹1.00 -> ₹1.30).
 */
export function calculatePromptHubCreditsFromAICredits(aicreditsCount: number): number {
  if (!aicreditsCount || aicreditsCount <= 0) return 0;
  return Math.ceil(aicreditsCount * PROMPTHUB_CREDITS_PER_AICREDIT);
}

/** New user baseline (0 credits — free models require 0 credits) */
export const USER_WELCOME_CREDITS_COUNT = 0;
export const USER_WELCOME_CREDIT_VALUE_INR = 0;

/** Top-Up Minimum and Maximum Limits */
export const MIN_TOPUP_AMOUNT_INR = 1; // ₹1 minimum (allows ₹9 kickoff package)
export const MAX_TOPUP_AMOUNT_INR = 20000; // ₹20,000 maximum top-up

/**
 * Calculates credit count given an INR top-up amount.
 * Example: ₹100 -> 200 credits at ₹0.50/credit.
 */
export function calculateCreditsFromInr(inrAmount: number): number {
  if (!inrAmount || inrAmount <= 0) return 0;
  return Math.floor(inrAmount / INR_PER_CREDIT);
}

export function inrToCredits(inrAmount: number): number {
  return calculateCreditsFromInr(inrAmount);
}

/**
 * Calculates INR cost given a target credit count.
 */
export function calculateInrFromCredits(credits: number): number {
  if (!credits || credits <= 0) return 0;
  return Math.ceil(credits * INR_PER_CREDIT);
}

export function creditsToInr(credits: number): number {
  return calculateInrFromCredits(credits);
}

/**
 * Formats INR currency cleanly.
 */
export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}
