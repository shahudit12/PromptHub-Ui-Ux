/**
 * src/config/pricingEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-Side Estimation Helper for PromptHub UI & Previews.
 *
 * CRITICAL ARCHITECTURAL GUARANTEE:
 * - This file provides UX-ONLY estimations for interactive UI components
 *   (e.g., displaying "Estimated: ~3 credits · Max exposure: 12 credits").
 * - The browser NEVER calculates, decides, or sends authoritative billing charges.
 * - The server's Dynamic Pricing & Settlement Engine remains the absolute authority.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { MODEL_COST_CATALOG, UNKNOWN_MODEL_FALLBACK_CREDIT_COST } from './modelCostCatalog';
import { INR_PER_CREDIT, USD_TO_INR_RATE, TARGET_GROSS_MARGIN_PERCENT } from './creditEconomics';
import { isFreeOpenRouterModel } from './providerRegistry';

export const PRICING_CONFIG = {
  promptHubCreditValueInr: INR_PER_CREDIT, // ₹0.50 INR per PromptHub Credit
  targetGrossMarginStandard: TARGET_GROSS_MARGIN_PERCENT / 100, // 0.35
  targetGrossMarginMin: 0.30,       // 30% floor
  targetGrossMarginMax: 0.40,       // 40% ceiling
  // `openRouterFreeCredits: 25` was removed. It had zero references anywhere in
  // the repo and it contradicted two standing decisions: the 25-credit OpenRouter
  // allowance was abolished (free models cost 0 and are gated by a rate limit,
  // not a balance), and signup now grants 0 credits. A constant that documents a
  // retired policy is how the retired policy gets reintroduced.
  usdToInrRate: USD_TO_INR_RATE,

  calculateCustomerCharge(providerCostInr: number, targetMargin: number = 0.35) {
    const customerChargeInr = providerCostInr / Math.max(0.01, 1 - targetMargin);
    const creditsCharged = Math.max(1, Math.ceil(customerChargeInr / this.promptHubCreditValueInr));
    const finalCustomerChargeInr = creditsCharged * this.promptHubCreditValueInr;
    const grossProfitInr = finalCustomerChargeInr - providerCostInr;
    const grossMarginPercent = finalCustomerChargeInr > 0 ? (grossProfitInr / finalCustomerChargeInr) * 100 : 0;

    return {
      customerChargeInr: finalCustomerChargeInr,
      creditsCharged,
      grossProfitInr,
      grossMarginPercent,
    };
  }
};

export interface UIEstimate {
  estimatedCredits: number;
  maximumReservedCredits: number;
  confidence: 'high' | 'medium' | 'conservative';
  tierLabel: string;
}

/**
 * Calculates a UX-only credit estimate for display in model selectors and studio panels.
 */
export function estimateUICredits(
  modelId?: string | null,
  promptLength: number = 200,
  maxOutputTokens: number = 2048
): UIEstimate {
  if (!modelId) {
    return {
      estimatedCredits: UNKNOWN_MODEL_FALLBACK_CREDIT_COST,
      maximumReservedCredits: UNKNOWN_MODEL_FALLBACK_CREDIT_COST * 2,
      confidence: 'conservative',
      tierLabel: 'Standard',
    };
  }

  const clean = modelId.toLowerCase().trim().replace(/^(openrouter\/|openai\/|anthropic\/|google\/)/, '');
  const entry = MODEL_COST_CATALOG[clean] || MODEL_COST_CATALOG[modelId];

  // A ":free" suffix is part of a string the CLIENT chose, so it cannot by itself
  // decide that something is free. This used to be
  // `if (modelId.endsWith(':free') || clean.includes(':free'))` → 0 credits and a
  // "Free AI" badge, which meant `openai/gpt-4o:free` was previewed to the user as
  // costing nothing. Delegating to the registry's hardened check strips the suffix
  // and refuses it when the base is a known paid model.
  //
  // This is an estimate, not a charge — the server settles the real amount — but a
  // preview that says "Free AI" for a frontier model is still a false statement to
  // the user, and it is the same defect class as the billing bug it mirrors.
  if (isFreeOpenRouterModel(modelId) || (entry && entry.creditCost === 0)) {
    return {
      estimatedCredits: 0,
      maximumReservedCredits: 0,
      confidence: 'high',
      tierLabel: 'Free AI',
    };
  }

  if (!entry) {
    return {
      estimatedCredits: UNKNOWN_MODEL_FALLBACK_CREDIT_COST,
      maximumReservedCredits: UNKNOWN_MODEL_FALLBACK_CREDIT_COST * 2,
      confidence: 'conservative',
      tierLabel: 'Standard',
    };
  }

  const estimatedPromptTokens = Math.max(1, Math.ceil(promptLength / 4));
  const estimatedCompletionTokens = Math.min(maxOutputTokens, entry.supportsReasoning ? 2048 : 800);

  const inputCostUsd = (estimatedPromptTokens * entry.inputCostPer1MTokensUsd) / 1_000_000;
  const outputCostUsd = (estimatedCompletionTokens * entry.outputCostPer1MTokensUsd) / 1_000_000;
  const totalCostUsd = inputCostUsd + outputCostUsd;

  // INR Paise conversion (~86.50 INR / USD, 1.08 overhead, 30% margin)
  const costPaise = totalCostUsd * 8650 * 1.08;
  const revPaise = Math.ceil(costPaise / 0.70);
  const computedCredits = Math.max(entry.creditCost, Math.round(revPaise / 97));

  const maxReserved = entry.supportsReasoning
    ? computedCredits * 2.5
    : computedCredits * 1.5;

  let tierLabel = 'Economy';
  if (entry.tier === 'standard') tierLabel = 'Standard';
  if (entry.tier === 'frontier') tierLabel = 'Frontier';
  if (entry.tier === 'reasoning') tierLabel = 'Reasoning';

  return {
    estimatedCredits: computedCredits,
    maximumReservedCredits: Math.ceil(maxReserved),
    confidence: entry.supportsReasoning ? 'conservative' : 'medium',
    tierLabel,
  };
}
