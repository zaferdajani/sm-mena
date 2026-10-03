// Platform binding of the pure entitlement rules (lib/core/rules/monetization/entitlements.ts):
// the "Paid plans" switch is read here so every caller keeps its one-argument call.

import { entitlementsFor as entitlementsWhen, type Entitlements } from "@/lib/core/rules/monetization/entitlements";
import { monetizationEnabled, type PlanId } from "./plans";

export { canCreatePost, canSendProposal, type Entitlements } from "@/lib/core/rules/monetization/entitlements";

export function entitlementsFor(agency: { plan: PlanId; planExpiresAt: Date | null }, now = new Date()): Entitlements {
  return entitlementsWhen(agency, { enforced: monetizationEnabled(), now });
}
