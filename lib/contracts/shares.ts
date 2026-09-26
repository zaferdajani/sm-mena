import { createHash } from "node:crypto";
import { z } from "zod";
import { payout } from "./rules";

// A partner's share of a client milestone (docs/40-collaboration.md). Pure
// rules shared by the form, the server and settleMilestone.

export const SHARE_KINDS = ["percent", "fixed"] as const;
export type ShareKind = (typeof SHARE_KINDS)[number];

export const shareInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("percent"), percent: z.coerce.number().int().min(1).max(100), note: z.string().trim().max(500).optional().default("") }),
  z.object({ kind: z.literal("fixed"), amount: z.coerce.number().positive().max(10_000_000), note: z.string().trim().max(500).optional().default("") }),
]);
export type ShareInput = z.infer<typeof shareInputSchema>;

/** The partner's share in fils, never more than the milestone. */
export function shareFils(input: { kind: "percent"; percent: number } | { kind: "fixed"; amountFils: number }, milestoneFils: number): number {
  const raw = input.kind === "percent" ? Math.round((milestoneFils * input.percent) / 100) : input.amountFils;
  return Math.max(0, Math.min(milestoneFils, Math.round(raw)));
}

/**
 * Splits what is released for a milestone between the agency and its partner.
 * A full release pays the whole share; a partial one (a dispute decision)
 * pays the share in proportion. Each part carries Sawwiq's fee on its own.
 */
export function splitRelease(releaseFils: number, milestoneFils: number, partnerShareFils: number, feePercent: number) {
  const partnerGross = milestoneFils <= 0 ? 0 : releaseFils >= milestoneFils ? Math.min(partnerShareFils, releaseFils) : Math.floor((partnerShareFils * releaseFils) / milestoneFils);
  const agencyGross = releaseFils - partnerGross;
  return { agency: payout(agencyGross, feePercent), partner: payout(partnerGross, feePercent) };
}

/** Fingerprint of the agreement both sides accepted, frozen with it. */
export function shareTermsHash(s: { contractId: string; milestoneId: string; milestoneTitle: string; milestoneFils: number; agencyId: string; partnerAgencyId: string; kind: string; percent: number | null; amountFils: number; note: string | null }) {
  const canonical = JSON.stringify([1, s.contractId, s.milestoneId, s.milestoneTitle, s.milestoneFils, s.agencyId, s.partnerAgencyId, s.kind, s.percent, s.amountFils, s.note ?? ""]);
  return createHash("sha256").update(canonical).digest("hex");
}

/** Milestone statuses where a share may still be proposed: the work hasn't been handed over yet. */
export const SHAREABLE_STATUSES = ["pending", "funded", "changes_requested"] as const;
