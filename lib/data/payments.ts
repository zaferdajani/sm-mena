import "server-only";
import { and, desc, eq, gte, lt, ne, sql } from "drizzle-orm";
import { audit } from "@/lib/data/agencies";
import { getDb } from "@/lib/db";
import { agencies, paymentEvents, payments, type Payment } from "@/lib/db/schema";
import { PLANS, type PlanId } from "@/lib/monetization/plans";
import { jodToFils, paymentProvider, type ProviderEvent } from "@/lib/payments/provider";

// Agency payments to the platform: plan subscriptions (and promotions later).
// Client-to-agency milestone payments live in lib/data/contracts.ts.

const DAY = 24 * 3600 * 1000;
export const PLAN_MONTHS = [1, 3, 12] as const;
/** Paying for 12 months up front gets two months free. */
export const planPriceFils = (plan: PlanId, months: number) => jodToFils(PLANS[plan].priceJodMonthly * (months === 12 ? 10 : months));

export async function startPlanCheckout(agencyId: string, plan: Exclude<PlanId, "free">, months: number, userId: string) {
  const db = await getDb();
  const [agency] = await db.select({ id: agencies.id, name: agencies.name }).from(agencies).where(eq(agencies.id, agencyId));
  if (!agency) throw new Error("agency not found");
  const provider = paymentProvider();
  const [row] = await db
    .insert(payments)
    .values({ agencyId, agencyName: agency.name, kind: "subscription", plan, months, amountFils: planPriceFils(plan, months), provider: provider.id, method: "card", createdBy: userId })
    .returning();
  const checkout = await provider.createCheckout({ paymentRef: row.id, amountFils: row.amountFils, description: `Sawwiq ${plan} × ${months}`, returnPath: "/studio/billing" });
  await db.update(payments).set({ providerRef: checkout.providerRef }).where(eq(payments.id, row.id));
  return { payment: row, redirectPath: checkout.redirectPath };
}

/** Extends (or starts) the plan period a paid subscription covers. */
async function activate(p: Payment) {
  if (p.kind !== "subscription" || !p.plan || !p.months || !p.agencyId) return { start: null, end: null };
  const db = await getDb();
  const [agency] = await db.select({ plan: agencies.plan, until: agencies.planExpiresAt }).from(agencies).where(eq(agencies.id, p.agencyId));
  const now = new Date();
  // Renewing the same plan stacks on the remaining time; a new plan starts now.
  const start = agency?.plan === p.plan && agency.until && agency.until > now ? agency.until : now;
  const end = new Date(start.getTime() + p.months * 30 * DAY);
  await db.update(agencies).set({ plan: p.plan, planExpiresAt: end, updatedAt: now }).where(eq(agencies.id, p.agencyId));
  return { start, end };
}

/** Marks a payment paid (idempotent) and activates what it pays for. */
export async function markPaymentPaid(paymentId: string, providerRef?: string) {
  const db = await getDb();
  const [p] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (!p || p.status === "paid" || p.status === "refunded") return p ?? null;
  const period = await activate(p);
  const [updated] = await db
    .update(payments)
    .set({ status: "paid", paidAt: new Date(), providerRef: providerRef ?? p.providerRef, periodStart: period.start, periodEnd: period.end, updatedAt: new Date() })
    .where(and(eq(payments.id, paymentId), ne(payments.status, "paid")))
    .returning();
  return updated ?? p;
}

export async function markPaymentFailed(paymentId: string) {
  const db = await getDb();
  await db.update(payments).set({ status: "failed", updatedAt: new Date() }).where(and(eq(payments.id, paymentId), eq(payments.status, "pending")));
}

/** Handles a verified provider notification once (payment_events is unique per provider event). */
export async function applyProviderEvent(provider: string, event: ProviderEvent) {
  const db = await getDb();
  const inserted = await db
    .insert(paymentEvents)
    .values({ provider, eventId: event.id, paymentId: /^[0-9a-f-]{36}$/.test(event.paymentRef) ? event.paymentRef : null, type: event.type, payload: event as unknown as Record<string, unknown> })
    .onConflictDoNothing()
    .returning({ id: paymentEvents.id });
  if (!inserted.length) return "duplicate" as const;
  // Payouts, refunds and chargebacks of protected milestone payments (docs/32).
  if (event.type.startsWith("payout.") || event.type.startsWith("refund.") || event.type === "chargeback.opened") {
    const { applyMoneyOutEvent } = await import("./money-out");
    return applyMoneyOutEvent(provider, event);
  }
  // Milestone deposits for protected contracts use "ms_<milestone id>".
  if (event.paymentRef.startsWith("ms_")) {
    if (event.type !== "payment.succeeded") return "ok" as const;
    const { recordDeposit } = await import("./contracts");
    return recordDeposit(event.paymentRef.slice(3), event.amountFils, event.providerRef, { provider, currency: event.currency });
  }
  const [p] = await db.select().from(payments).where(eq(payments.id, event.paymentRef));
  if (!p) return "unknown_payment" as const;
  if (event.amountFils !== p.amountFils) return "amount_mismatch" as const;
  if (event.type === "payment.succeeded") await markPaymentPaid(p.id, event.providerRef);
  else await markPaymentFailed(p.id);
  return "ok" as const;
}

export async function recordManualPayment(
  input: { agencyId: string; plan: Exclude<PlanId, "free">; months: number; method: "cliq" | "bank_transfer" | "cash" | "card"; amountJod: number; reference?: string; note?: string },
  adminId: string,
) {
  const db = await getDb();
  const [agency] = await db.select({ name: agencies.name }).from(agencies).where(eq(agencies.id, input.agencyId));
  if (!agency) throw new Error("agency not found");
  const [row] = await db
    .insert(payments)
    .values({
      agencyId: input.agencyId,
      agencyName: agency.name,
      kind: "subscription",
      plan: input.plan,
      months: input.months,
      amountFils: jodToFils(input.amountJod),
      provider: "manual",
      method: input.method,
      providerRef: input.reference || null,
      note: input.note || null,
      createdBy: adminId,
    })
    .returning();
  const paid = await markPaymentPaid(row.id, input.reference);
  await audit(adminId, "payment.manual", "payment", row.id, { amountFils: row.amountFils, method: input.method });
  return paid;
}

export async function refundPayment(paymentId: string, adminId: string, reason: string, endPlan: boolean) {
  const db = await getDb();
  const [p] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (!p || p.status !== "paid") return null;
  await db.update(payments).set({ status: "refunded", refundedAt: new Date(), refundReason: reason.slice(0, 500), updatedAt: new Date() }).where(eq(payments.id, paymentId));
  if (endPlan && p.agencyId && p.kind === "subscription") {
    await db.update(agencies).set({ plan: "free", planExpiresAt: null, updatedAt: new Date() }).where(eq(agencies.id, p.agencyId));
  }
  await audit(adminId, "payment.refund", "payment", paymentId, { reason, endPlan });
  return p;
}

export async function listPayments(status: Payment["status"] | "all" = "all", agencyId?: string) {
  const db = await getDb();
  const where = and(status === "all" ? undefined : eq(payments.status, status), agencyId ? eq(payments.agencyId, agencyId) : undefined);
  return db.select().from(payments).where(where).orderBy(desc(payments.createdAt)).limit(500);
}

export async function getPayment(id: string) {
  const db = await getDb();
  const [p] = await db.select().from(payments).where(eq(payments.id, id));
  return p ?? null;
}

/** Headline money numbers for the admin console (fils). */
export async function paymentSummary(now = new Date()) {
  const db = await getDb();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const sumPaid = (from: Date, to?: Date) =>
    db
      .select({ n: sql<number>`coalesce(sum(${payments.amountFils}), 0)::int` })
      .from(payments)
      .where(and(eq(payments.status, "paid"), gte(payments.paidAt, from), to ? lt(payments.paidAt, to) : undefined));
  const [[thisMonth], [lastMonth], [pending], [refunds], active] = await Promise.all([
    sumPaid(monthStart),
    sumPaid(lastMonthStart, monthStart),
    db.select({ n: sql<number>`count(*)::int` }).from(payments).where(eq(payments.status, "pending")),
    db.select({ n: sql<number>`coalesce(sum(${payments.amountFils}), 0)::int` }).from(payments).where(and(eq(payments.status, "refunded"), gte(payments.refundedAt, monthStart))),
    db
      .select({ plan: agencies.plan, n: sql<number>`count(*)::int` })
      .from(agencies)
      .where(and(ne(agencies.plan, "free"), sql`(${agencies.planExpiresAt} is null or ${agencies.planExpiresAt} > ${now})`))
      .groupBy(agencies.plan),
  ]);
  const mrr = active.reduce((s, r) => s + jodToFils(PLANS[r.plan].priceJodMonthly) * r.n, 0);
  return { thisMonth: thisMonth.n, lastMonth: lastMonth.n, pending: pending.n, refunds: refunds.n, mrr, paidAgencies: active.reduce((s, r) => s + r.n, 0) };
}

export function paymentsCsv(rows: Payment[]) {
  const esc = (v: unknown) => {
    const s = v instanceof Date ? v.toISOString() : v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const cols: (keyof Payment)[] = ["id", "createdAt", "paidAt", "status", "agencyName", "kind", "plan", "months", "amountFils", "currency", "provider", "method", "providerRef", "periodStart", "periodEnd", "refundedAt", "refundReason", "note"];
  return [cols.map((c) => (c === "amountFils" ? "amountJod" : c)).join(","), ...rows.map((r) => cols.map((c) => esc(c === "amountFils" ? (r.amountFils / 1000).toFixed(3) : r[c])).join(","))].join("\n");
}
