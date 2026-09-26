import "server-only";
import { and, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { contracts, escrowLedger } from "@/lib/db/schema";
import { providerById, type ProviderEvent } from "@/lib/payments/provider";
import { audit } from "./agencies";
import { ledgerKey } from "./escrow";

// Money out through the payment partner (docs/32-payment-partner.md).
// settleMilestone writes the ledger entries first (the decision, guarded and
// idempotent); this asks the partner that took the deposit to move the money,
// and records what it says. Entries stay "pending" until the partner confirms
// (at once, or by webhook). A "failed" entry is retried by the daily job with
// the same idempotency key, so the partner can never pay twice; after
// MAX_TRIES it stays failed and shows up for admins.

const MAX_TRIES = 5;

type Entry = typeof escrowLedger.$inferSelect;

async function send(entry: Entry) {
  const db = await getDb();
  const provider = providerById(entry.provider);
  if (!provider || !entry.milestoneId || !entry.idemKey) return "skipped" as const;
  const [c] = await db.select({ agencyId: contracts.agencyId, currency: contracts.currency }).from(contracts).where(eq(contracts.id, entry.contractId));
  if (!c) return "skipped" as const;
  let result;
  if (entry.type === "release") {
    const [fee] = await db.select({ amountFils: escrowLedger.amountFils }).from(escrowLedger).where(eq(escrowLedger.idemKey, ledgerKey("fee", entry.milestoneId)));
    result = await provider.payout({ idemKey: entry.idemKey, contractId: entry.contractId, milestoneId: entry.milestoneId, agencyId: c.agencyId, amountFils: entry.amountFils, feeFils: fee?.amountFils ?? 0, currency: c.currency });
  } else {
    const [dep] = await db.select({ providerRef: escrowLedger.providerRef }).from(escrowLedger).where(eq(escrowLedger.idemKey, ledgerKey("dep", entry.milestoneId)));
    result = await provider.refund({ idemKey: entry.idemKey, contractId: entry.contractId, milestoneId: entry.milestoneId, depositProviderRef: dep?.providerRef ?? null, amountFils: entry.amountFils, currency: c.currency });
  }
  // A pending answer still records the partner's reference, so we don't send it again.
  await setStatus(entry, result.status, result.providerRef ?? `sent:${entry.idemKey}`, result.error);
  return result.status;
}

/** Updates an outgoing entry (and, for a payout, Sawwiq's fee beside it). Only status and reference may change (ledger trigger). */
async function setStatus(entry: Pick<Entry, "idemKey" | "milestoneId" | "type" | "note">, status: "succeeded" | "pending" | "failed", providerRef: string | null, error?: string) {
  const db = await getDb();
  const keys = [entry.idemKey!];
  if (entry.type === "release" && entry.milestoneId) keys.push(ledgerKey("fee", entry.milestoneId));
  const tries = status === "failed" ? triesOf(entry.note) + 1 : triesOf(entry.note);
  await db
    .update(escrowLedger)
    .set({ status, providerRef, ...(status === "failed" ? { note: withTries(entry.note, tries, error) } : {}) })
    .where(inArray(escrowLedger.idemKey, keys));
}

// The retry count lives in the entry's note ("… [tries:2]"), which the ledger trigger lets us update.
const triesOf = (note: string | null) => Number(/\[tries:(\d+)\]/.exec(note ?? "")?.[1] ?? 0);
const withTries = (note: string | null, tries: number, error?: string) => `${(note ?? "").replace(/\s*\[tries:\d+\].*$/, "")} [tries:${tries}]${error ? ` ${error.slice(0, 200)}` : ""}`.trim();

/**
 * Sends outgoing entries that the partner hasn't taken yet: for one milestone
 * right after a decision, or all of them (daily job), including failed ones
 * under MAX_TRIES. Test entries are already "succeeded" and never sent.
 */
export async function dispatchMoneyOut(scope: { milestoneId?: string; olderThan?: Date } = {}) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(escrowLedger)
    .where(
      and(
        inArray(escrowLedger.type, ["release", "refund"]),
        or(and(eq(escrowLedger.status, "pending"), isNull(escrowLedger.providerRef)), eq(escrowLedger.status, "failed")),
        scope.milestoneId ? eq(escrowLedger.milestoneId, scope.milestoneId) : undefined,
        scope.olderThan ? lt(escrowLedger.createdAt, scope.olderThan) : undefined,
      ),
    );
  const out = { sent: 0, succeeded: 0, failed: 0, gaveUp: 0 };
  for (const r of rows) {
    if (r.status === "failed" && triesOf(r.note) >= MAX_TRIES) {
      out.gaveUp++;
      continue;
    }
    out.sent++;
    try {
      const s = await send(r);
      if (s === "succeeded") out.succeeded++;
      if (s === "failed") out.failed++;
    } catch (e) {
      out.failed++;
      await setStatus(r, "failed", r.providerRef, e instanceof Error ? e.message : String(e));
    }
  }
  return out;
}

/** Payout, refund and chargeback notifications from the partner (signature already checked). */
export async function applyMoneyOutEvent(provider: string, event: ProviderEvent) {
  const db = await getDb();
  if (event.type === "chargeback.opened") {
    // The client's bank reversed a card payment. Terms v4: the client stays
    // liable; admins decide with the agency (notice and 14 days to contest).
    const milestoneId = event.paymentRef.startsWith("ms_") ? event.paymentRef.slice(3) : null;
    const [dep] = milestoneId ? await db.select().from(escrowLedger).where(eq(escrowLedger.idemKey, ledgerKey("dep", milestoneId))) : [];
    await audit(null, "escrow.chargeback_opened", "milestone", milestoneId ?? event.paymentRef, { provider, providerRef: event.providerRef, amountFils: event.amountFils, contractId: dep?.contractId ?? null });
    return dep ? ("ok" as const) : ("unknown_payment" as const);
  }
  const [entry] = await db.select().from(escrowLedger).where(eq(escrowLedger.idemKey, event.paymentRef));
  const wanted = event.type.startsWith("payout.") ? "release" : "refund";
  if (!entry || entry.type !== wanted || entry.provider !== provider) return "unknown_payment" as const;
  if (entry.amountFils !== event.amountFils) return "amount_mismatch" as const;
  if (entry.status === "succeeded") return "duplicate" as const;
  await setStatus(entry, event.type.endsWith(".succeeded") ? "succeeded" : "failed", event.providerRef, event.type.endsWith(".failed") ? "partner reported failure" : undefined);
  return "ok" as const;
}
