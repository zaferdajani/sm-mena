import { z } from "zod";

// Referral agents (docs/42-referral-agents.md): pure rules, unit tested.

/** An agent's personal code: sawwiq.org/j/<code>. */
export const REFERRAL_CODE = /^[a-z0-9][a-z0-9-]{2,23}$/;
export const normalizeCode = (raw: unknown) => (typeof raw === "string" ? raw.trim().toLowerCase().replace(/^@/, "") : "");
export const isReferralCode = (raw: unknown) => REFERRAL_CODE.test(normalizeCode(raw));

/** The cookie an agent's link sets, so the sign-up form fills in their code. */
export const REFERRAL_COOKIE = "sw_ref";
export const REFERRAL_COOKIE_DAYS = 60;

export type Tier = { at: number; bonusFils: number };
/** Extra pay when an agent reaches these numbers of active providers (Admin → Agents can change them). */
export const DEFAULT_TIERS: Tier[] = [
  { at: 10, bonusFils: 10_000 },
  { at: 25, bonusFils: 30_000 },
  { at: 50, bonusFils: 75_000 },
  { at: 100, bonusFils: 200_000 },
];
export const tiersSchema = z.array(z.object({ at: z.number().int().min(1).max(100_000), bonusFils: z.number().int().min(0).max(100_000_000) })).max(12);

/**
 * A referred provider counts (and pays) once it's really on Sawwiq: a real,
 * active page with a bio, services and at least one piece of work, not voided
 * by an admin. Empty sign-ups never pay.
 */
export type ReferredProvider = { isDemo: boolean; status: string; bio: string; services: string[]; postCount: number; referralVoidReason: string | null };
export function missingForActive(a: ReferredProvider): ("bio" | "services" | "post")[] {
  const missing: ("bio" | "services" | "post")[] = [];
  if (!a.bio.trim()) missing.push("bio");
  if (!a.services.length) missing.push("services");
  if (a.postCount < 1) missing.push("post");
  return missing;
}
export const isActiveReferral = (a: ReferredProvider) => !a.isDemo && a.status === "active" && !a.referralVoidReason && missingForActive(a).length === 0;

/** What an agent has earned: the rate per active provider plus every tier bonus reached. */
export function earnings(activeCount: number, rateFils: number, tiers: Tier[] = DEFAULT_TIERS) {
  const sorted = [...tiers].sort((a, b) => a.at - b.at);
  const bonuses = sorted.filter((t) => activeCount >= t.at).reduce((s, t) => s + t.bonusFils, 0);
  const next = sorted.find((t) => activeCount < t.at) ?? null;
  return { base: activeCount * rateFils, bonuses, total: activeCount * rateFils + bonuses, next, toNext: next ? next.at - activeCount : 0 };
}
