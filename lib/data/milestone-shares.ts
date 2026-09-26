import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { shareFils, shareTermsHash, SHAREABLE_STATUSES, type ShareInput } from "@/lib/contracts/shares";
import { getDb } from "@/lib/db";
import { agencies, contracts, milestoneChecks, milestones, milestoneShares, escrowLedger, type MilestoneShare } from "@/lib/db/schema";
import { audit } from "./agencies";
import { arePartners, logEvent } from "./contracts";
import { addNotifications } from "./notifications";

// Partners on a client milestone (docs/40-collaboration.md). The agency
// proposes a share of one milestone to an accepted partner; the partner
// accepts (frozen from then on) and can then deliver that milestone itself:
// tick its checklist and hand it to the client. The client's confirmation
// (or the end of the review period) pays the share straight to the partner
// through settleMilestone; the agency's other milestones don't hold it up.

export type ShareError = "notFound" | "notPartners" | "locked" | "exists" | "tooMuch" | "direct";

const live = ["proposed", "accepted"] as const;

async function milestoneWithContract(agencyId: string, contractId: string, milestoneId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ m: milestones, c: contracts })
    .from(milestones)
    .innerJoin(contracts, eq(milestones.contractId, contracts.id))
    .where(and(eq(milestones.id, milestoneId), eq(contracts.id, contractId), eq(contracts.agencyId, agencyId)));
  return row ?? null;
}

/** Agency: propose a partner's share of one of its milestones. */
export async function proposeShare(agency: { id: string; name: string }, contractId: string, milestoneId: string, partnerAgencyId: string, input: ShareInput): Promise<{ error: ShareError } | { share: MilestoneShare }> {
  const row = await milestoneWithContract(agency.id, contractId, milestoneId);
  if (!row) return { error: "notFound" };
  const { m, c } = row;
  if (["cancelled", "completed"].includes(c.status) || !(SHAREABLE_STATUSES as readonly string[]).includes(m.status)) return { error: "locked" };
  if (!(await arePartners(agency.id, partnerAgencyId))) return { error: "notPartners" };
  const amountFils = input.kind === "percent" ? shareFils({ kind: "percent", percent: input.percent }, m.amountFils) : Math.round(input.amount * 1000);
  if (amountFils <= 0 || amountFils > m.amountFils) return { error: "tooMuch" };
  const db = await getDb();
  try {
    const [share] = await db
      .insert(milestoneShares)
      .values({ contractId: c.id, milestoneId: m.id, agencyId: agency.id, partnerAgencyId, kind: input.kind, percent: input.kind === "percent" ? input.percent : null, amountFils, note: input.note || null })
      .returning();
    await addNotifications([{ agencyId: partnerAgencyId, kind: "share_proposed", href: "/studio/contracts#partner-work", params: { name: agency.name, milestone: m.title } }]);
    await audit(null, "share.proposed", "milestone_share", share.id, { contractId: c.id, milestoneId: m.id });
    return { share };
  } catch {
    // The unique index allows one live share per milestone.
    return { error: "exists" };
  }
}

/** Agency: withdraw a share the partner hasn't accepted yet. */
export async function cancelShare(agencyId: string, shareId: string): Promise<{ error?: ShareError }> {
  const db = await getDb();
  const [row] = await db
    .update(milestoneShares)
    .set({ status: "cancelled" })
    .where(and(eq(milestoneShares.id, shareId), eq(milestoneShares.agencyId, agencyId), eq(milestoneShares.status, "proposed")))
    .returning({ id: milestoneShares.id });
  return row ? {} : { error: "locked" };
}

/** Partner: accept (freezes the agreement) or decline a proposed share. */
export async function answerShare(partner: { id: string; name: string }, shareId: string, accept: boolean): Promise<{ error?: ShareError }> {
  const db = await getDb();
  const [s] = await db.select().from(milestoneShares).where(and(eq(milestoneShares.id, shareId), eq(milestoneShares.partnerAgencyId, partner.id), eq(milestoneShares.status, "proposed")));
  if (!s) return { error: "notFound" };
  const [m] = await db.select().from(milestones).where(eq(milestones.id, s.milestoneId));
  if (accept && (!m || !(SHAREABLE_STATUSES as readonly string[]).includes(m.status) || s.amountFils > m.amountFils)) return { error: "locked" };
  const now = new Date();
  const [done] = await db
    .update(milestoneShares)
    .set(
      accept
        ? {
            status: "accepted",
            acceptedAt: now,
            termsHash: shareTermsHash({ contractId: s.contractId, milestoneId: s.milestoneId, milestoneTitle: m!.title, milestoneFils: m!.amountFils, agencyId: s.agencyId, partnerAgencyId: s.partnerAgencyId, kind: s.kind, percent: s.percent, amountFils: s.amountFils, note: s.note }),
          }
        : { status: "declined" },
    )
    .where(and(eq(milestoneShares.id, s.id), eq(milestoneShares.status, "proposed")))
    .returning({ id: milestoneShares.id });
  if (!done) return { error: "locked" };
  await addNotifications([{ agencyId: s.agencyId, kind: accept ? "share_accepted" : "share_declined", href: `/studio/contracts/${s.contractId}`, params: { name: partner.name, milestone: m?.title ?? "" } }]);
  if (accept) await logEvent(s.contractId, "agency", "partner_joined", m!.title);
  await audit(null, accept ? "share.accepted" : "share.declined", "milestone_share", s.id);
  return {};
}

/** Live shares on one contract (the agency's contract page and the client's view). */
export async function sharesForContract(contractId: string) {
  const db = await getDb();
  return db
    .select({ share: milestoneShares, partner: { id: agencies.id, name: agencies.name, handle: agencies.handle } })
    .from(milestoneShares)
    .innerJoin(agencies, eq(milestoneShares.partnerAgencyId, agencies.id))
    .where(and(eq(milestoneShares.contractId, contractId), inArray(milestoneShares.status, [...live])));
}

/** A partner's shares: proposals to answer and milestones it delivers. */
export async function sharesForPartner(partnerAgencyId: string) {
  const db = await getDb();
  return db
    .select({
      share: milestoneShares,
      agency: { id: agencies.id, name: agencies.name, handle: agencies.handle },
      milestone: { id: milestones.id, title: milestones.title, status: milestones.status, amountFils: milestones.amountFils, dueDate: milestones.dueDate },
      contract: { id: contracts.id, number: contracts.number, currency: contracts.currency, paymentMode: contracts.paymentMode, status: contracts.status },
    })
    .from(milestoneShares)
    .innerJoin(agencies, eq(milestoneShares.agencyId, agencies.id))
    .innerJoin(milestones, eq(milestoneShares.milestoneId, milestones.id))
    .innerJoin(contracts, eq(milestoneShares.contractId, contracts.id))
    .where(and(eq(milestoneShares.partnerAgencyId, partnerAgencyId), inArray(milestoneShares.status, [...live])))
    .orderBy(desc(milestoneShares.createdAt));
}

/**
 * The partner's working view of one shared milestone: its checklist, status
 * and what was paid out to the partner. The client's name and the rest of the
 * contract stay private to the agency.
 */
export async function partnerWork(partnerAgencyId: string, shareId: string) {
  const db = await getDb();
  const [row] = (await sharesForPartner(partnerAgencyId)).filter((r) => r.share.id === shareId && r.share.status === "accepted");
  if (!row) return null;
  const checks = await db.select().from(milestoneChecks).where(eq(milestoneChecks.milestoneId, row.milestone.id)).orderBy(milestoneChecks.position);
  const paid = await db
    .select({ amountFils: escrowLedger.amountFils, status: escrowLedger.status, type: escrowLedger.type })
    .from(escrowLedger)
    .where(and(eq(escrowLedger.milestoneId, row.milestone.id), eq(escrowLedger.payeeAgencyId, partnerAgencyId)));
  const [full] = await db.select().from(milestones).where(eq(milestones.id, row.milestone.id));
  return { ...row, checks, paid, milestoneFull: full };
}

/** Direct payment mode: the agency says it paid the partner; the partner confirms it received it. */
export async function markSharePaid(shareId: string, by: { agencyId: string } | { partnerAgencyId: string }): Promise<{ error?: ShareError }> {
  const db = await getDb();
  const [s] = await db.select().from(milestoneShares).where(and(eq(milestoneShares.id, shareId), eq(milestoneShares.status, "accepted")));
  if (!s || ("agencyId" in by ? s.agencyId !== by.agencyId : s.partnerAgencyId !== by.partnerAgencyId)) return { error: "notFound" };
  const [m] = await db.select({ status: milestones.status }).from(milestones).where(eq(milestones.id, s.milestoneId));
  if (!m || !["approved", "released", "split"].includes(m.status)) return { error: "locked" };
  await db
    .update(milestoneShares)
    .set("agencyId" in by ? { paidByAgencyAt: new Date() } : { receivedByPartnerAt: new Date() })
    .where(eq(milestoneShares.id, s.id));
  return {};
}
