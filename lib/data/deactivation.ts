import "server-only";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { destroyAllSessions } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { agencies, contracts, escrowLedger, milestones, users } from "@/lib/db/schema";
import { audit } from "./agencies";

// Deactivating an account (docs/32-payment-partner.md). Any agency
// can close its account at any time; the demo cleanup uses the same path for
// demo agencies that took part in contracts. A deactivated agency is hidden
// everywhere and can't sign in, but its contracts and every ledger entry stay:
// money records are never deleted (the ledger is append-only).

export type DeactivateBy = "self" | "admin" | "demo_cleanup";

/** Contracts where this agency is the agency or the buying partner. */
const involving = (agencyId: string) => or(eq(contracts.agencyId, agencyId), eq(contracts.clientAgencyId, agencyId));

/**
 * What stops an agency from closing its own account: a real contract still
 * running, or real money still held for it. Test contracts never block.
 */
export async function deactivationBlockers(agencyId: string) {
  const db = await getDb();
  const open = await db
    .select({ number: contracts.number })
    .from(contracts)
    .where(and(involving(agencyId), inArray(contracts.status, ["sent", "active", "disputed"]), eq(contracts.paymentsLive, true)));
  const [held] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(milestones)
    .innerJoin(contracts, eq(contracts.id, milestones.contractId))
    .where(and(involving(agencyId), eq(contracts.paymentsLive, true), inArray(milestones.status, ["funded", "submitted", "changes_requested"])));
  return { openContracts: open.map((c) => c.number), heldMilestones: held?.n ?? 0 };
}

/** Summary of the test-mode money that ran through an agency's contracts (for the audit log). */
export async function testMoneySummary(agencyId: string) {
  const db = await getDb();
  const rows = await db
    .select({ number: contracts.number, type: escrowLedger.type, n: sql<number>`count(*)::int`, fils: sql<number>`coalesce(sum(${escrowLedger.amountFils}), 0)::int` })
    .from(escrowLedger)
    .innerJoin(contracts, eq(contracts.id, escrowLedger.contractId))
    .where(and(involving(agencyId), eq(escrowLedger.test, true)))
    .groupBy(contracts.number, escrowLedger.type);
  const contractNumbers = [...new Set(rows.map((r) => r.number))];
  return { contracts: contractNumbers, entries: rows.reduce((a, r) => a + r.n, 0), byType: rows };
}

/**
 * Closes an agency's account: hidden everywhere, owner signed out and unable
 * to sign in. Contracts and ledger entries are kept; test ones stay marked as
 * test. Logged with a summary of the test money involved.
 */
export async function deactivateAgency(agencyId: string, by: DeactivateBy, actorUserId: string | null, note?: string) {
  const db = await getDb();
  const [a] = await db.select().from(agencies).where(eq(agencies.id, agencyId));
  if (!a) return { error: "notFound" as const };
  if (a.status === "deactivated") return { ok: true as const, already: true };
  if (by === "self") {
    const b = await deactivationBlockers(agencyId);
    if (b.openContracts.length || b.heldMilestones) return { error: "openContracts" as const, ...b };
  }
  const now = new Date();
  const summary = await testMoneySummary(agencyId);
  await db.transaction(async (tx) => {
    await tx.update(agencies).set({ status: "deactivated", deactivatedAt: now, deactivationReason: by, updatedAt: now }).where(eq(agencies.id, agencyId));
    await tx.update(users).set({ disabledAt: now }).where(eq(users.id, a.ownerUserId));
  });
  await destroyAllSessions(a.ownerUserId);
  await audit(actorUserId, `agency.deactivated.${by}`, "agency", agencyId, {
    handle: a.handle,
    demo: a.isDemo,
    note: note?.slice(0, 500) ?? null,
    testContracts: summary.contracts,
    testLedgerEntries: summary.entries,
    testLedgerByType: summary.byType,
  });
  return { ok: true as const, already: false, summary };
}

/** Admin: brings a deactivated (non-demo) agency back. */
export async function reactivateAgency(agencyId: string, actorUserId: string) {
  const db = await getDb();
  const [a] = await db.select().from(agencies).where(eq(agencies.id, agencyId));
  if (!a || a.status !== "deactivated" || a.isDemo) return { error: "notAllowed" as const };
  await db.transaction(async (tx) => {
    await tx.update(agencies).set({ status: "active", deactivatedAt: null, deactivationReason: null, updatedAt: new Date() }).where(eq(agencies.id, agencyId));
    await tx.update(users).set({ disabledAt: null }).where(eq(users.id, a.ownerUserId));
  });
  await audit(actorUserId, "agency.reactivated", "agency", agencyId, { handle: a.handle });
  return { ok: true as const };
}

export type TestLedgerRow = {
  id: number;
  createdAt: Date;
  contract: string;
  agency: string;
  agencyStatus: string;
  demo: boolean;
  type: string;
  amountFils: number;
  currency: string;
  idemKey: string | null;
};

/**
 * Every test-mode money movement ever recorded, including those of agencies
 * that were deactivated or cleaned up (Admin → Payments, CSV export).
 */
export async function testLedger(limit = 5000): Promise<TestLedgerRow[]> {
  const db = await getDb();
  return db
    .select({
      id: escrowLedger.id,
      createdAt: escrowLedger.createdAt,
      contract: contracts.number,
      agency: agencies.handle,
      agencyStatus: agencies.status,
      demo: agencies.isDemo,
      type: escrowLedger.type,
      amountFils: escrowLedger.amountFils,
      currency: contracts.currency,
      idemKey: escrowLedger.idemKey,
    })
    .from(escrowLedger)
    .innerJoin(contracts, eq(contracts.id, escrowLedger.contractId))
    .innerJoin(agencies, eq(agencies.id, contracts.agencyId))
    .where(eq(escrowLedger.test, true))
    .orderBy(asc(escrowLedger.id))
    .limit(limit);
}

export async function testLedgerCount() {
  const db = await getDb();
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(escrowLedger).where(eq(escrowLedger.test, true));
  return row?.n ?? 0;
}

const csvCell = (v: unknown) => {
  const s = v instanceof Date ? v.toISOString() : String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV of every test transaction (amounts in the contract currency, 3 decimals). */
export function testLedgerCsv(rows: TestLedgerRow[]) {
  const head = ["id", "created_at", "contract", "agency", "agency_status", "demo", "type", "amount", "currency", "key", "mode"];
  const lines = rows.map((r) => [r.id, r.createdAt, r.contract, r.agency, r.agencyStatus, r.demo ? "yes" : "no", r.type, (r.amountFils / 1000).toFixed(3), r.currency, r.idemKey ?? "", "TEST"].map(csvCell).join(","));
  return [head.join(","), ...lines].join("\n");
}
