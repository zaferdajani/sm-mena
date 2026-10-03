// The plan table lives in lib/core/rules/monetization/plans.ts (pure). This module adds the one
// thing that needs the platform: whether paid plans are switched on (Admin → Features;
// MONETIZATION_ENABLED is only the default).

import { cachedFeatureState } from "@/lib/features";

export { PLANS, PROMOTION_RULES, type Plan, type PlanId } from "@/lib/core/rules/monetization/plans";

export function monetizationEnabled(): boolean {
  return cachedFeatureState("paid_plans") === "on";
}
