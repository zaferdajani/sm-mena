import "./setup-db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SIGNATURE_PNG } from "./png";
import { createAgency } from "@/lib/data/agencies";
import { runMilestoneJobs } from "@/lib/data/contract-jobs";
import { approveMilestone, cancelContract, createContract, getContractByToken, setCheck, signAsClient, submitMilestone, type ContractInput } from "@/lib/data/contracts";
import { ledgerKey } from "@/lib/data/escrow";
import { applyProviderEvent } from "@/lib/data/payments";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { auditLogs, escrowLedger } from "@/lib/db/schema";
import { registerProvider, type MoneyResult, type PayoutInput, type RefundInput } from "@/lib/payments/provider";

// A stand-in for a licensed partner in live mode (docs/32): payouts are
// confirmed later by webhook; refunds fail once, then succeed.
const calls: { payouts: PayoutInput[]; refunds: RefundInput[] } = { payouts: [], refunds: [] };
let refundFailuresLeft = 1;
registerProvider({
  id: "fakepsp",
  label: "Fake partner",
  async createCheckout(i) {
    return { redirectPath: `/pay/${i.paymentRef}`, providerRef: `fk_${i.paymentRef}` };
  },
  async payout(i): Promise<MoneyResult> {
    calls.payouts.push(i);
    return { status: "pending", providerRef: `po_${i.idemKey}` };
  },
  async refund(i): Promise<MoneyResult> {
    calls.refunds.push(i);
    if (refundFailuresLeft-- > 0) return { status: "failed", providerRef: null, error: "bank offline" };
    return { status: "succeeded", providerRef: `rf_${i.idemKey}` };
  },
  parseWebhook: () => null,
});

const env = { ...process.env };
let agencyId = "";
beforeAll(async () => {
  process.env.PAYMENTS_PROVIDER = "fakepsp";
  process.env.PROTECTED_PAYMENTS_LIVE = "true";
  process.env.PLATFORM_FEE_PERCENT = "10";
  const u = await createUser("mo-agency@t.jo", "password-1234");
  agencyId = (await createAgency(u.id, { handle: "mo.studio", name: "MO", city: "amman", services: ["smm_management"] })).id;
});
afterAll(async () => {
  process.env = env;
  await closeDb();
});

const draft: ContractInput = {
  title: "Live launch",
  summary: "Two milestones.",
  items: [],
  specialRequests: [],
  startDate: "2026-10-01",
  endDate: "2026-12-31",
  paymentMode: "protected",
  nda: false,
  client: { name: "Rose", phone: "+962790000011", email: "rose@cafe.jo" },
  milestones: [
    { title: "Designs", dueDate: "2026-10-31", amountFils: 200_000, checks: ["Logo"] },
    { title: "Launch", dueDate: "2026-11-30", amountFils: 100_000, checks: ["Posts"] },
  ],
  signerName: "Sara Haddad",
  signature: SIGNATURE_PNG,
  locale: "en",
};

async function signed() {
  const created = await createContract(agencyId, draft);
  if (!("token" in created)) throw new Error(created.error);
  const v = (await getContractByToken(created.token))!;
  expect(v.contract.paymentsLive).toBe(true);
  expect(await signAsClient(v, "Rose Khalil", "1.2.3.4", SIGNATURE_PNG, null)).toEqual({ ok: true });
  return created.token;
}
const pay = (m: { id: string; amountFils: number }, evt = `evt_${m.id}`) =>
  applyProviderEvent("fakepsp", { id: evt, type: "payment.succeeded", paymentRef: `ms_${m.id}`, providerRef: `fk_${m.id}`, amountFils: m.amountFils, currency: "JOD" });
const entry = async (key: string) => (await (await getDb()).select().from(escrowLedger).where(eq(escrowLedger.idemKey, key)))[0];

describe("money out through a live partner", () => {
  it("asks the partner to pay the agency, stays pending until the webhook confirms, and never pays twice", async () => {
    const token = await signed();
    let v = (await getContractByToken(token))!;
    const m = v.milestones[0];
    expect(await pay(m)).toBe("ok");
    expect((await entry(ledgerKey("dep", m.id))).test).toBe(false);
    for (const c of m.checks) await setCheck(v.contract.id, m.id, c.id, "agency", true);
    v = (await getContractByToken(token))!;
    await submitMilestone(v, m.id, "done");
    v = (await getContractByToken(token))!;
    for (const c of v.milestones[0].checks) await setCheck(v.contract.id, m.id, c.id, "client", true);
    v = (await getContractByToken(token))!;
    expect(await approveMilestone(v, m.id)).toEqual({ ok: true });

    expect(calls.payouts).toHaveLength(1);
    expect(calls.payouts[0]).toMatchObject({ idemKey: ledgerKey("rel", m.id), amountFils: 180_000, feeFils: 20_000, agencyId, currency: "JOD" });
    expect(await entry(ledgerKey("rel", m.id))).toMatchObject({ status: "pending", providerRef: `po_rel:${m.id}` });
    // The daily job doesn't resend what the partner already took.
    await runMilestoneJobs();
    expect(calls.payouts).toHaveLength(1);

    const done = { id: "po_evt_1", type: "payout.succeeded" as const, paymentRef: ledgerKey("rel", m.id), providerRef: "po_final", amountFils: 180_000, currency: "JOD" };
    expect(await applyProviderEvent("fakepsp", done)).toBe("ok");
    expect(await entry(ledgerKey("rel", m.id))).toMatchObject({ status: "succeeded", providerRef: "po_final" });
    expect(await entry(ledgerKey("fee", m.id))).toMatchObject({ status: "succeeded" });
    expect(await applyProviderEvent("fakepsp", done)).toBe("duplicate");
    expect(await applyProviderEvent("fakepsp", { ...done, id: "po_evt_2", amountFils: 1 })).toBe("amount_mismatch");
  });

  it("refunds a payment that arrives after cancellation, retrying a failed refund with the same key", async () => {
    const token = await signed();
    let v = (await getContractByToken(token))!;
    expect(await cancelContract(v, "client", "Changed plans")).toEqual({ ok: true });
    v = (await getContractByToken(token))!;
    const m = v.milestones[1];
    expect(await pay(m)).toBe("refunded_late");
    expect(await pay(m, "evt_replay")).toBe("duplicate");
    expect(calls.refunds).toHaveLength(1);
    expect(await entry(ledgerKey("ref", m.id))).toMatchObject({ status: "failed", amountFils: 100_000 });
    await runMilestoneJobs();
    expect(calls.refunds).toHaveLength(2);
    expect(calls.refunds[1]).toMatchObject({ idemKey: ledgerKey("ref", m.id), depositProviderRef: `fk_${m.id}` });
    expect(await entry(ledgerKey("ref", m.id))).toMatchObject({ status: "succeeded", providerRef: `rf_ref:${m.id}` });
  });

  it("logs a chargeback for admins", async () => {
    const token = await signed();
    const m = (await getContractByToken(token))!.milestones[0];
    await pay(m);
    expect(await applyProviderEvent("fakepsp", { id: "cb_1", type: "chargeback.opened", paymentRef: `ms_${m.id}`, providerRef: "cb_ref", amountFils: m.amountFils })).toBe("ok");
    const logs = await (await getDb()).select().from(auditLogs).where(eq(auditLogs.action, "escrow.chargeback_opened"));
    expect(logs.some((l) => l.entityId === m.id)).toBe(true);
  });
});
