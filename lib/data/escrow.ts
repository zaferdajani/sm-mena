import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, type DB } from "@/lib/db";
import { escrowLedger, milestones, type Contract } from "@/lib/db/schema";
import { checkSplit, HELD_STATUSES, payout, splitKind, type Split } from "@/lib/contracts/rules";
import { paymentProvider } from "@/lib/payments/provider";

// Money out of protection, once. Every payout and refund for a milestone goes
// through settleMilestone: a status transition guarded in SQL (only from a
// held status) and ledger rows with one idempotency key per milestone and
// kind ("rel:", "fee:", "ref:"), in one transaction. A second call — a
// double click, a replayed job, two admins at once — changes nothing.

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

export const ledgerKey = (kind: "dep" | "rel" | "fee" | "ref", milestoneId: string) => `${kind}:${milestoneId}`;

/** What is held for one milestone right now: deposits − payouts − fees − refunds. */
export async function heldFor(milestoneId: string, ex?: Tx | DB) {
  const db = ex ?? (await getDb());
  const [row] = await db
    .select({
      held: sql<number>`coalesce(sum(case when ${escrowLedger.type} = 'deposit' then ${escrowLedger.amountFils} else -${escrowLedger.amountFils} end), 0)::int`,
    })
    .from(escrowLedger)
    .where(and(eq(escrowLedger.milestoneId, milestoneId), eq(escrowLedger.status, "succeeded")));
  return row?.held ?? 0;
}

export type SettleResult = "ok" | "already" | "mismatch";

/**
 * Pays `releaseFils` of a held milestone to the agency (less Sawwiq's fee on
 * that part only) and refunds `refundFils` to the client. The two must add up
 * to what is held. The milestone becomes released, refunded or split.
 */
export async function settleMilestone(
  contract: Pick<Contract, "id" | "feePercent" | "paymentMode">,
  milestoneId: string,
  s: Split,
  opts: { from?: readonly string[]; note?: string | null; approvedBy?: "client" | "deadline" | "admin" | null } = {},
): Promise<SettleResult> {
  const db = await getDb();
  const kind = splitKind(s);
  const now = new Date();
  let result: SettleResult;
  try {
    result = await db.transaction(async (tx) => {
      const [m] = await tx
        .update(milestones)
        .set({
          status: kind === "release" ? "released" : kind === "refund" ? "refunded" : "split",
          ...(kind !== "refund" ? { releasedAt: now } : {}),
          ...(opts.approvedBy ? { approvedAt: now, approvedBy: opts.approvedBy } : {}),
        })
        .where(and(eq(milestones.id, milestoneId), eq(milestones.contractId, contract.id), inArray(milestones.status, [...(opts.from ?? HELD_STATUSES)] as never[])))
        .returning();
      if (!m) return "already" as const;
      const held = await heldFor(milestoneId, tx);
      if (checkSplit(s, held)) throw new MismatchError();
      // Money goes back out through the partner that took it in.
      const [dep] = await tx.select({ provider: escrowLedger.provider }).from(escrowLedger).where(eq(escrowLedger.idemKey, ledgerKey("dep", milestoneId)));
      const provider = dep?.provider ?? paymentProvider().id;
      // Test money moves at once; a real partner confirms each payout and refund (lib/data/money-out.ts).
      const status = provider === "mock" ? "succeeded" : "pending";
      const note = opts.note?.slice(0, 500) ?? null;
      const { fee, net } = payout(s.releaseFils, contract.feePercent);
      const rows: (typeof escrowLedger.$inferInsert)[] = [];
      if (s.releaseFils > 0) {
        rows.push({ contractId: contract.id, milestoneId, type: "release", amountFils: net, provider, status, note, idemKey: ledgerKey("rel", milestoneId) });
        if (fee > 0) rows.push({ contractId: contract.id, milestoneId, type: "fee", amountFils: fee, provider, status, note, idemKey: ledgerKey("fee", milestoneId) });
      }
      if (s.refundFils > 0) rows.push({ contractId: contract.id, milestoneId, type: "refund", amountFils: s.refundFils, provider, status, note, idemKey: ledgerKey("ref", milestoneId) });
      if (rows.length) await tx.insert(escrowLedger).values(rows);
      return "ok" as const;
    });
  } catch (e) {
    if (e instanceof MismatchError) return "mismatch";
    // A unique idempotency key means another request settled it first.
    if (isUniqueViolation(e)) return "already";
    throw e;
  }
  // After commit: ask the partner to move the money (a failure is retried by the daily job).
  if (result === "ok") {
    const { dispatchMoneyOut } = await import("./money-out");
    await dispatchMoneyOut({ milestoneId }).catch((e) => console.error("[money-out]", e));
  }
  return result;
}

class MismatchError extends Error {}

export function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string }; message?: string } | null;
  return err?.code === "23505" || err?.cause?.code === "23505" || /duplicate key|unique constraint/i.test(err?.message ?? "");
}
