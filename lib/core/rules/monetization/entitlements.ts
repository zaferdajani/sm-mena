import { PLANS, type Plan, type PlanId } from "./plans";

export type Entitlements = Plan & { enforced: boolean };

/**
 * What an agency may do, given whether paid plans are enforced. While monetization is off, everyone
 * gets the Business allowance (unlimited posts, full insights) but keeps their own badge state, so
 * switching the flag on only ever tightens limits. Pure: the caller supplies the switch and the clock
 * (lib/monetization/entitlements.ts reads them from the platform).
 */
export function entitlementsFor(agency: { plan: PlanId; planExpiresAt: Date | null }, options: { enforced: boolean; now?: Date }): Entitlements {
  const now = options.now ?? new Date();
  const active = agency.plan !== "free" && (!agency.planExpiresAt || agency.planExpiresAt > now) ? agency.plan : "free";
  if (!options.enforced) {
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
