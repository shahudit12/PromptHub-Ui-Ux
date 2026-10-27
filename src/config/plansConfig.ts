/**
 * src/config/plansConfig.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Re-exports the authoritative billing and plans configuration from billingConfig.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

export * from './billingConfig';
export { SUBSCRIPTION_PLANS as PROMPTHUB_PLANS } from './billingConfig';
export type { SubscriptionPlan as PlanDefinition } from './billingConfig';
