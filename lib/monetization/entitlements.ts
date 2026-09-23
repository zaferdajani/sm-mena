import { monetizationEnabled, PLANS, type Plan, type PlanId } from "./plans";

export type Entitlements = Plan & { enforced: boolean };

/**
 * What an agency may do. While monetization is off, everyone gets the
 * Business allowance (unlimited posts, full insights) but keeps their own
 * badge state, so switching the flag on only ever tightens limits.
 */
export function entitlementsFor(agency: { plan: PlanId; planExpiresAt: Date | null }, now = new Date()): Entitlements {
  const active = agency.plan !== "free" && (!agency.planExpiresAt || agency.planExpiresAt > now) ? agency.plan : "free";
  if (!monetizationEnabled()) {
    return { ...PLANS.business, id: active, badge: PLANS[active].badge, rankingBoost: PLANS[active].rankingBoost, enforced: false };
  }
  return { ...PLANS[active], enforced: true };
}

export function canCreatePost(ent: Entitlements, currentPosts: number): boolean {
  return ent.maxPosts === null || currentPosts < ent.maxPosts;
}

export function canSendProposal(ent: Entitlements, sentThisMonth: number): boolean {
  return ent.proposalsPerMonth === null || sentThisMonth < ent.proposalsPerMonth;
}
