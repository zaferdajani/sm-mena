import "./setup-db";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SIGNATURE_PNG } from "./png";
import {
  appealDeadline,
  canAppeal,
  checkSplit,
  cleanLinks,
  daysLeft,
  decisionFinal,
  defaultCancellationSplit,
  payout,
  reminderDue,
  reviewDeadline,
  roundsState,
  splitKind,
} from "@/lib/contracts/rules";
import { receiptsOf } from "@/lib/contracts/receipts";
import { createAgency } from "@/lib/data/agencies";
import { acceptCancellation, declineCancellation, proposeCancellation } from "@/lib/data/contract-cancel";
import { acceptDecision, addEvidence, appealDispute, decideDispute, finalizeDueDecisions } from "@/lib/data/contract-disputes";
import { runMilestoneJobs } from "@/lib/data/contract-jobs";
import { listContractRequests, requestContractFromPartner } from "@/lib/data/contract-requests";
import {
  approveMilestone,
  askExtraRound,
  clientSign,
  createContract,
  getContractByToken,
  getContractForAgency,
  getContractForClientAgency,
  grantExtraRound,
  openDispute,
  recordDeposit,
  requestChanges,
  setCheck,
  signAsClient,
  submitMilestone,
  type ContractInput,
} from "@/lib/data/contracts";
import { listNotifications } from "@/lib/data/notifications";
import { applyProviderEvent } from "@/lib/data/payments";
import { listReviews, submitInviteReview } from "@/lib/data/reviews";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { auditLogs, contracts, escrowLedger, partnerRequests, reviewRequests } from "@/lib/db/schema";
import { receiptDocument } from "@/lib/legal/receipt";
import { signWebhook, paymentProvider } from "@/lib/payments/provider";
import { protectedPaymentsCopy, protectedPaymentsLive } from "@/lib/payments/readiness";
import { renderLegalPdf } from "@/lib/pdf/legal-pdf";
import { reviewProvenance } from "@/lib/reviews/provenance";

const DAY = 86_400_000;
let agencyId: string;
let buyerId: string;
const VISITOR = "11111111-2222-4333-8444-555555555555";

beforeAll(async () => {
  const u = await createUser("ms-agency@t.jo", "password-1234");
  agencyId = (await createAgency(u.id, { handle: "ms.studio", name: "MS Studio", city: "amman", services: ["smm_management"] })).id;
  const u2 = await createUser("ms-buyer@t.jo", "password-1234");
  buyerId = (await createAgency(u2.id, { handle: "ms.buyer", name: "Buyer Agency", city: "amman", services: ["ads_meta"] })).id;
});
afterAll(() => closeDb());

const draft = (over: Partial<ContractInput> = {}): ContractInput => ({
  title: "Launch for Café Rose",
  summary: "Two milestones of content.",
  items: [],
  specialRequests: [],
  startDate: "2026-10-01",
  endDate: "2026-12-31",
  paymentMode: "protected",
  nda: false,
  client: { name: "Rose", phone: "+962790000011", email: "rose@cafe.jo" },
  milestones: [
    { title: "Designs", dueDate: "2026-10-31", amountFils: 200_000, checks: ["Logo", "Menu"] },
    { title: "Launch", dueDate: "2026-11-30", amountFils: 100_000, checks: ["Launch posts"] },
  ],
  signerName: "Sara Haddad",
  signature: SIGNATURE_PNG,
  locale: "en",
  ...over,
});

/** A signed contract with milestone 1 paid in and delivered. */
async function delivered(over: Partial<ContractInput> = {}) {
  const created = await createContract(agencyId, draft(over));
  if (!("token" in created)) throw new Error(created.error);
  const { token } = created;
  let v = (await getContractByToken(token))!;
  expect(await signAsClient(v, "Rose Khalil", "1.2.3.4", SIGNATURE_PNG, VISITOR)).toEqual({ ok: true });
  v = (await getContractByToken(token))!;
  const m = v.milestones[0];
  expect(await applyProviderEvent("mock", { id: `evt_${m.id}`, type: "payment.succeeded", paymentRef: `ms_${m.id}`, providerRef: "mock_x", amountFils: m.amountFils, currency: "JOD" })).toBe("ok");
  for (const c of m.checks) await setCheck(v.contract.id, m.id, c.id, "agency", true);
  v = (await getContractByToken(token))!;
  expect(await submitMilestone(v, m.id, "Files in the shared drive")).toEqual({ ok: true });
  return { token, v: (await getContractByToken(token))!, milestoneId: m.id };
}

const ledgerOf = async (contractId: string) => (await getDb()).select().from(escrowLedger).where(eq(escrowLedger.contractId, contractId));
const balanced = (rows: { type: string; amountFils: number }[]) => rows.reduce((s, r) => s + (r.type === "deposit" ? r.amountFils : -r.amountFils), 0);

describe("rules", () => {
  it("reminds two days and one day before the deadline, once each, and catches up late", () => {
    const due = new Date("2026-10-10T10:00:00Z");
    expect(reminderDue(due, 0, new Date("2026-10-08T03:00:00Z"))).toBeNull(); // 2.3 days left: 3 days, rounded up
    expect(reminderDue(due, 0, new Date("2026-10-08T12:00:00Z"))).toBe(1); // 2 days left
    expect(reminderDue(due, 1, new Date("2026-10-08T12:00:00Z"))).toBeNull();
    expect(reminderDue(due, 1, new Date("2026-10-09T12:00:00Z"))).toBe(2);
    expect(reminderDue(due, 0, new Date("2026-10-09T12:00:00Z"))).toBe(2); // late job: only the latest
    expect(reminderDue(due, 2, new Date("2026-10-09T12:00:00Z"))).toBeNull();
    expect(reminderDue(due, 0, new Date("2026-10-11T00:00:00Z"))).toBeNull(); // overdue: auto-approval instead
    expect(daysLeft(due, new Date("2026-10-08T03:00:00Z"))).toBe(3);
    expect(reviewDeadline(new Date("2026-10-01T00:00:00Z"), 7).toISOString()).toBe("2026-10-08T00:00:00.000Z");
  });

  it("counts revision rounds, validates splits and takes the fee only on the paid part", () => {
    expect(roundsState({ revisionRounds: 2 }, { changeRounds: 1, extraRounds: 0 })).toEqual({ included: 2, extra: 0, used: 1, left: 1 });
    expect(roundsState({ revisionRounds: 2 }, { changeRounds: 3, extraRounds: 1 }).left).toBe(0);
    expect(checkSplit({ releaseFils: 60_000, refundFils: 40_000 }, 100_000)).toBeNull();
    expect(checkSplit({ releaseFils: 60_000, refundFils: 50_000 }, 100_000)).toBe("sum");
    expect(checkSplit({ releaseFils: -1, refundFils: 100_001 }, 100_000)).toBe("negative");
    expect(checkSplit({ releaseFils: 0.5, refundFils: 99_999.5 }, 100_000)).toBe("integer");
    expect(splitKind({ releaseFils: 1, refundFils: 0 })).toBe("release");
    expect(splitKind({ releaseFils: 0, refundFils: 1 })).toBe("refund");
    expect(splitKind({ releaseFils: 1, refundFils: 1 })).toBe("split");
    expect(payout(60_000, 10)).toEqual({ gross: 60_000, fee: 6_000, net: 54_000 });
    expect(defaultCancellationSplit([{ id: "a", status: "funded", amountFils: 5 }, { id: "b", status: "pending", amountFils: 7 }])).toEqual([{ milestoneId: "a", releaseFils: 0, refundFils: 5 }]);
    expect(cleanLinks("https://drive.example/x javascript:alert(1) http://a.b/c ftp://x")).toEqual(["https://drive.example/x", "http://a.b/c"]);
  });

  it("allows one appeal within 7 days and makes a decision final after that or when both accept", () => {
    const decidedAt = new Date("2026-10-01T00:00:00Z");
    const d = { status: "decided", appealedAt: null, appealDeadline: appealDeadline(decidedAt), agencyAcceptedAt: null, clientAcceptedAt: null };
    expect(canAppeal(d, new Date("2026-10-05T00:00:00Z"))).toBe(true);
    expect(canAppeal(d, new Date("2026-10-09T00:00:00Z"))).toBe(false);
    expect(canAppeal({ ...d, appealedAt: decidedAt }, new Date("2026-10-02T00:00:00Z"))).toBe(false);
    expect(decisionFinal(d, new Date("2026-10-05T00:00:00Z"))).toBe(false);
    expect(decisionFinal(d, new Date("2026-10-08T00:00:01Z"))).toBe(true);
    expect(decisionFinal({ ...d, agencyAcceptedAt: decidedAt, clientAcceptedAt: decidedAt }, decidedAt)).toBe(true);
  });
});

describe("payments go-live switch", () => {
  it("is off with the test checkout, even when PROTECTED_PAYMENTS_LIVE is set", () => {
    expect(paymentProvider().id).toBe("mock");
    process.env.PROTECTED_PAYMENTS_LIVE = "true";
    expect(protectedPaymentsLive()).toBe(false);
    process.env.PAYMENTS_PROVIDER = "not-connected";
    expect(protectedPaymentsLive()).toBe(false); // unknown providers fall back to the test checkout
    delete process.env.PAYMENTS_PROVIDER;
    delete process.env.PROTECTED_PAYMENTS_LIVE;
    expect(protectedPaymentsCopy("en")).toMatch(/test mode: no real money/);
    expect(protectedPaymentsCopy("ar")).toMatch(/وضع التجربة/);
    expect(protectedPaymentsCopy("en", true)).toMatch(/Sawwiq's licensed payment partner/);
    expect(protectedPaymentsCopy("en", true)).not.toMatch(/held by Sawwiq/i);
  });
});

describe("authenticated, idempotent payment events", () => {
  it("rejects bad signatures and malformed payloads", () => {
    const body = JSON.stringify({ id: "evt_sig", type: "payment.succeeded", paymentRef: "ms_x", providerRef: "p", amountFils: 1000 });
    const headers = (sig: string) => new Headers({ "x-sawwiq-signature": sig });
    expect(paymentProvider().parseWebhook(body, headers(signWebhook(body)))?.id).toBe("evt_sig");
    expect(paymentProvider().parseWebhook(body, headers("0".repeat(64)))).toBeNull();
    const bad = JSON.stringify({ id: "evt_bad", type: "payment.refunded", paymentRef: "ms_x", providerRef: "p", amountFils: -5 });
    expect(paymentProvider().parseWebhook(bad, headers(signWebhook(bad)))).toBeNull();
  });

  it("applies a replayed or repeated deposit once, checks amount and currency, and releases once on a double approval", async () => {
    const created = await createContract(agencyId, draft());
    if (!("token" in created)) throw new Error(created.error);
    await clientSign(created.token, "Rose Khalil", "1.2.3.4", SIGNATURE_PNG);
    let v = (await getContractByToken(created.token))!;
    const m = v.milestones[0];
    const event = { id: "evt_replay", type: "payment.succeeded" as const, paymentRef: `ms_${m.id}`, providerRef: "mock_r", amountFils: m.amountFils, currency: "JOD" };
    expect(await applyProviderEvent("mock", { ...event, id: "evt_cur", currency: "USD" })).toBe("currency_mismatch");
    expect(await applyProviderEvent("mock", { ...event, id: "evt_amt", amountFils: 1 })).toBe("amount_mismatch");
    const results = await Promise.all([applyProviderEvent("mock", event), applyProviderEvent("mock", event), applyProviderEvent("mock", { ...event, id: "evt_other" })]);
    expect(results.filter((r) => r === "ok")).toHaveLength(1);
    expect(await recordDeposit(m.id, m.amountFils, "again", { provider: "mock" })).toBe("duplicate");
    // A real provider's money can't fund a test-mode contract.
    expect(await recordDeposit(v.milestones[1].id, v.milestones[1].amountFils, "live_1", { provider: "hyperpay" })).toBe("wrong_mode");

    for (const c of m.checks) await setCheck(v.contract.id, m.id, c.id, "agency", true);
    v = (await getContractByToken(created.token))!;
    await submitMilestone(v, m.id, "");
    for (const c of m.checks) await setCheck(v.contract.id, m.id, c.id, "client", true);
    v = (await getContractByToken(created.token))!;
    const approvals = await Promise.all([approveMilestone(v, m.id), approveMilestone(v, m.id), approveMilestone(v, m.id)]);
    expect(approvals.filter((r) => "ok" in r)).toHaveLength(1);
    const rows = await ledgerOf(v.contract.id);
    expect(rows.filter((r) => r.type === "deposit")).toHaveLength(1);
    expect(rows.filter((r) => r.type === "release")).toHaveLength(1);
    expect(rows.filter((r) => r.type === "fee")).toHaveLength(1);
    expect(balanced(rows)).toBe(0);
    // The ledger is append-only.
    const db = await getDb();
    await expect(db.update(escrowLedger).set({ amountFils: 1 }).where(eq(escrowLedger.id, rows[0].id))).rejects.toThrow();
    await expect(db.delete(escrowLedger).where(eq(escrowLedger.id, rows[0].id))).rejects.toThrow();
    // Receipts: deposit and payout with gross, fee and net, marked test.
    const receipts = receiptsOf((await getContractByToken(created.token))!);
    expect(receipts.map((r) => [r.kind, r.grossFils, r.feeFils, r.netFils, r.test])).toEqual([
      ["deposit", 200_000, 20_000, 180_000, true],
      ["payout", 200_000, 20_000, 180_000, true],
    ]);
    const pdf = await renderLegalPdf(receiptDocument(receipts[1], v.contract, { agency: "MS Studio", client: "Rose" }, "ar"));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});

describe("acceptance deadline", () => {
  it("reminds the client, then accepts and pays out after the review period, once", async () => {
    const { token, v, milestoneId } = await delivered();
    const m = v.milestones[0];
    expect(m.reviewDueAt!.getTime() - m.submittedAt!.getTime()).toBe(7 * DAY);
    const due = m.reviewDueAt!;
    // Two days before, twice (a retried job): one reminder.
    const twoDays = new Date(due.getTime() - 1.5 * DAY);
    expect((await runMilestoneJobs(twoDays)).reminders).toBeGreaterThanOrEqual(1);
    await runMilestoneJobs(twoDays);
    const reminders = (await listNotifications({ visitorId: VISITOR })).filter((n) => n.kind === "review_reminder" && n.params.milestone === "Designs" && n.href === `/c/${v.contract.id}`);
    expect(reminders.length).toBeGreaterThanOrEqual(1);
    const before = reminders.length;
    await runMilestoneJobs(twoDays);
    expect((await listNotifications({ visitorId: VISITOR })).filter((n) => n.kind === "review_reminder" && n.href === `/c/${v.contract.id}`)).toHaveLength(before);

    // After the deadline: deemed accepted and paid out, audited; running again changes nothing.
    const late = new Date(due.getTime() + DAY);
    await runMilestoneJobs(late);
    await runMilestoneJobs(late);
    const after = (await getContractByToken(token))!;
    expect(after.milestones[0]).toMatchObject({ status: "released", approvedBy: "deadline" });
    const rows = (await ledgerOf(v.contract.id)).filter((r) => r.milestoneId === milestoneId);
    expect(rows.filter((r) => r.type === "release")).toHaveLength(1);
    expect(balanced(rows)).toBe(0);
    const logs = await (await getDb()).select().from(auditLogs).where(and(eq(auditLogs.action, "escrow.auto_release"), eq(auditLogs.entityId, milestoneId)));
    expect(logs).toHaveLength(1);
    const agencyNotes = await listNotifications({ agencyId });
    expect(agencyNotes.some((n) => n.kind === "milestone_auto_approved")).toBe(true);
  });

  it("does not auto-accept a delivery sent back for changes or under dispute", async () => {
    const { token, v, milestoneId } = await delivered();
    await requestChanges(v, milestoneId, "Menu prices wrong");
    await runMilestoneJobs(new Date(Date.now() + 30 * DAY));
    expect((await getContractByToken(token))!.milestones[0].status).toBe("changes_requested");
  });
});

describe("revision rounds", () => {
  it("uses the included rounds, then needs an extra round from the agency", async () => {
    const { token, milestoneId } = await delivered({ revisionRounds: 1 });
    let v = (await getContractByToken(token))!;
    expect(v.contract.revisionRounds).toBe(1);
    const [a, b] = await Promise.all([requestChanges(v, milestoneId, "Round one"), requestChanges(v, milestoneId, "Round one again")]);
    expect([a, b].filter((r) => "ok" in r)).toHaveLength(1); // a double click uses one round
    v = (await getContractByToken(token))!;
    expect(v.milestones[0].changeRounds).toBe(1);
    const agencyView = (await getContractForAgency(agencyId, v.contract.id))!;
    await submitMilestone(agencyView, milestoneId, "Fixed");
    v = (await getContractByToken(token))!;
    expect(await requestChanges(v, milestoneId, "One more")).toEqual({ error: "noRounds" });
    expect(await askExtraRound(v, milestoneId)).toEqual({ ok: true });
    expect(await askExtraRound(v, milestoneId)).toEqual({ error: "locked" });
    expect(await grantExtraRound((await getContractForAgency(agencyId, v.contract.id))!, milestoneId)).toEqual({ ok: true });
    v = (await getContractByToken(token))!;
    expect(v.milestones[0]).toMatchObject({ extraRounds: 1, extraRoundAskedAt: null });
    expect(await requestChanges(v, milestoneId, "Thanks, one more")).toEqual({ ok: true });
  });
});

describe("disputes", () => {
  it("collects evidence, decides a split, allows one appeal, then moves the money once on the final decision", async () => {
    const { token, v, milestoneId } = await delivered();
    expect(await openDispute(v, "client", "The menu was never delivered", milestoneId)).toEqual({ ok: true });
    expect(await openDispute(v, "client", "Again", milestoneId)).toEqual({ error: "exists" }); // one open dispute per milestone
    let cv = (await getContractByToken(token))!;
    expect(cv.contract.status).toBe("disputed");
    const d = cv.disputes[0];
    expect(await addEvidence(cv, "client", d.id, "Only the logo arrived", "https://drive.example/logo javascript:x")).toEqual({ ok: true });
    const av = (await getContractForAgency(agencyId, cv.contract.id))!;
    expect(await addEvidence(av, "agency", d.id, "Menu was sent by email", ["https://mail.example/thread"])).toEqual({ ok: true });
    cv = (await getContractByToken(token))!;
    expect(cv.disputes[0].evidence.map((e) => [e.side, e.links])).toEqual([
      ["client", ["https://drive.example/logo"]],
      ["agency", ["https://mail.example/thread"]],
    ]);

    const admin = (await createUser("ms-admin@t.jo", "password-1234")).id;
    expect(await decideDispute(admin, d.id, { releaseFils: 150_000, refundFils: 40_000, reason: "Logo delivered, menu half done" })).toEqual({ error: "sum" });
    expect(await decideDispute(admin, d.id, { releaseFils: 120_000, refundFils: 80_000, reason: "Logo delivered, menu half done" })).toEqual({ ok: true });
    // Nothing moves before the decision is final.
    expect((await ledgerOf(cv.contract.id)).filter((r) => r.type !== "deposit")).toHaveLength(0);

    cv = (await getContractByToken(token))!;
    expect(await appealDispute(cv, "client", d.id, "The menu was not half done at all")).toEqual({ ok: true });
    cv = (await getContractByToken(token))!;
    expect(await appealDispute(cv, "agency", d.id, "We also want to appeal this one")).toEqual({ error: "locked" }); // one appeal
    expect(await decideDispute(admin, d.id, { releaseFils: 100_000, refundFils: 100_000, reason: "On appeal: menu not delivered, logo was" })).toEqual({ ok: true });
    expect(await decideDispute(admin, d.id, { releaseFils: 200_000, refundFils: 0, reason: "Trying to decide twice" })).toEqual({ error: "locked" });

    cv = (await getContractByToken(token))!;
    expect(cv.disputes[0]).toMatchObject({ status: "final", decision: "split", releaseFils: 100_000, refundFils: 100_000 });
    expect(cv.disputes[0].firstDecision).toMatchObject({ releaseFils: 120_000, refundFils: 80_000 });
    expect(cv.milestones[0].status).toBe("split");
    expect(cv.contract.status).toBe("active");
    const rows = (await ledgerOf(cv.contract.id)).filter((r) => r.milestoneId === milestoneId);
    // Fee only on the part paid out: 10% of 100 = 10.
    expect(rows.map((r) => [r.type, r.amountFils]).sort()).toEqual([
      ["deposit", 200_000],
      ["fee", 10_000],
      ["refund", 100_000],
      ["release", 90_000],
    ]);
    expect(balanced(rows)).toBe(0);
    expect(receiptsOf(cv).map((r) => r.kind)).toEqual(["deposit", "payout", "refund"]);
  });

  it("makes a decision final when both sides accept it, or when the appeal window closes", async () => {
    const admin = (await createUser("ms-admin2@t.jo", "password-1234")).id;
    const one = await delivered();
    await openDispute(one.v, "agency", "Client stopped answering", one.milestoneId);
    let cv = (await getContractByToken(one.token))!;
    await decideDispute(admin, cv.disputes[0].id, { releaseFils: 200_000, refundFils: 0, reason: "Delivered in full, per checklist" });
    cv = (await getContractByToken(one.token))!;
    expect(await acceptDecision(cv, "client", cv.disputes[0].id)).toEqual({ ok: true });
    expect((await getContractByToken(one.token))!.disputes[0].status).toBe("decided");
    expect(await acceptDecision((await getContractForAgency(agencyId, cv.contract.id))!, "agency", cv.disputes[0].id)).toEqual({ ok: true });
    cv = (await getContractByToken(one.token))!;
    expect(cv.disputes[0].status).toBe("final");
    expect(cv.milestones[0].status).toBe("released");

    const two = await delivered();
    await openDispute(two.v, "client", "Wrong colours everywhere", two.milestoneId);
    cv = (await getContractByToken(two.token))!;
    await decideDispute(admin, cv.disputes[0].id, { releaseFils: 0, refundFils: 200_000, reason: "Nothing matched the brief" });
    expect(await finalizeDueDecisions(new Date(Date.now() + 3 * DAY))).toBe(0);
    expect(await finalizeDueDecisions(new Date(Date.now() + 8 * DAY))).toBeGreaterThanOrEqual(1);
    expect(await finalizeDueDecisions(new Date(Date.now() + 9 * DAY))).toBe(0);
    cv = (await getContractByToken(two.token))!;
    expect(cv.milestones[0].status).toBe("refunded");
    expect(cv.money.refunded).toBe(200_000);
  });
});

describe("mutual cancellation", () => {
  it("settles each held milestone as agreed and closes the contract; a decline leaves everything as it was", async () => {
    const a = await delivered();
    expect(await proposeCancellation(a.v, "client", "Budget cut", [{ milestoneId: a.milestoneId, releaseFils: 50_000, refundFils: 100_000 }])).toEqual({ error: "split" });
    expect(await proposeCancellation(a.v, "client", "Budget cut")).toEqual({ ok: true }); // default: full refund
    let cv = (await getContractByToken(a.token))!;
    const p = cv.cancellations[0];
    expect(p.splits).toEqual([{ milestoneId: a.milestoneId, releaseFils: 0, refundFils: 200_000 }]);
    expect(await acceptCancellation(cv, "client", p.id)).toEqual({ error: "locked" }); // not your own proposal
    expect(await declineCancellation((await getContractForAgency(agencyId, cv.contract.id))!, "agency", p.id)).toEqual({ ok: true });
    cv = (await getContractByToken(a.token))!;
    expect(cv.contract.status).toBe("active");
    expect(cv.money.held).toBe(200_000);

    expect(await proposeCancellation((await getContractForAgency(agencyId, cv.contract.id))!, "agency", "Let's part ways", [{ milestoneId: a.milestoneId, releaseFils: 80_000, refundFils: 120_000 }])).toEqual({ ok: true });
    cv = (await getContractByToken(a.token))!;
    const again = cv.cancellations.find((x) => x.status === "pending")!;
    const [r1, r2] = await Promise.all([acceptCancellation(cv, "client", again.id), acceptCancellation(cv, "client", again.id)]);
    expect([r1, r2].filter((r) => "ok" in r)).toHaveLength(1);
    cv = (await getContractByToken(a.token))!;
    expect(cv.contract.status).toBe("cancelled");
    expect(cv.money).toMatchObject({ released: 72_000, fees: 8_000, refunded: 120_000, held: 0 });
    expect(cv.milestones.map((m) => m.status)).toEqual(["split", "cancelled"]);
  });
});

describe("partner contracts", () => {
  it("needs an accepted partnership, then the buying agency signs from its studio and both are notified", async () => {
    const buyer = { id: buyerId, name: "Buyer Agency" } as Parameters<typeof requestContractFromPartner>[0];
    expect(await requestContractFromPartner(buyer, agencyId, { title: "Ads for our client", brief: "" })).toEqual({ error: "notPartner" });
    expect(await createContract(agencyId, draft({ clientAgencyId: buyerId }))).toEqual({ error: "partner" });
    await (await getDb()).insert(partnerRequests).values({ fromAgencyId: buyerId, toAgencyId: agencyId, status: "accepted" });
    const req = await requestContractFromPartner(buyer, agencyId, { title: "Ads for our client", brief: "Meta ads for a gym", budgetFils: 300_000 });
    if (!("ok" in req)) throw new Error(req.error);
    expect((await listNotifications({ agencyId })).some((n) => n.kind === "contract_request")).toBe(true);
    expect((await listContractRequests(agencyId)).incoming.map((r) => r.status)).toEqual(["pending"]);

    const created = await createContract(agencyId, draft({ clientAgencyId: buyerId, contractRequestId: req.id, client: { name: "Buyer Agency", phone: "+962790000099" } }));
    if (!("token" in created)) throw new Error(created.error);
    expect((await listContractRequests(agencyId)).incoming[0]).toMatchObject({ status: "contracted", contractId: created.contract.id });
    expect((await listNotifications({ agencyId: buyerId })).some((n) => n.kind === "contract_received" && n.href === `/studio/contracts/${created.contract.id}`)).toBe(true);
    expect(await getContractForClientAgency(agencyId, created.contract.id)).toBeNull();
    const bv = (await getContractForClientAgency(buyerId, created.contract.id))!;
    expect(bv.clientAgency?.name).toBe("Buyer Agency");
    expect(await signAsClient(bv, "Buyer Owner", "5.5.5.5", SIGNATURE_PNG)).toEqual({ ok: true });
    expect((await listNotifications({ agencyId })).some((n) => n.kind === "contract_signed")).toBe(true);
  });
});

describe("completed-project reviews", () => {
  it("invites the client once a contract completes; only a live, paid contract gives a 'completed project' review", async () => {
    // Test mode: an ordinary invite.
    const t = await delivered({ milestones: [{ title: "All", dueDate: "2026-10-31", amountFils: 100_000, checks: ["Logo"] }] });
    for (const c of t.v.milestones[0].checks) await setCheck(t.v.contract.id, t.milestoneId, c.id, "client", true);
    expect(await approveMilestone((await getContractByToken(t.token))!, t.milestoneId)).toEqual({ ok: true });
    const tv = (await getContractByToken(t.token))!;
    expect(tv.contract.status).toBe("completed");
    expect(tv.reviewToken).toBeTruthy();
    const review = { rating: 5, body: "Great work on the logo and very fast.", reviewerName: "Rose", visitorId: null };
    const r1 = await submitInviteReview(tv.reviewToken!, review);
    expect(r1?.source).toBe("invite");
    expect(reviewProvenance(r1!)).toBe("invited");

    // Live and paid out: a verified completed project.
    const created = await createContract(agencyId, draft({ milestones: [{ title: "All", dueDate: "2026-10-31", amountFils: 100_000, checks: ["Logo"] }] }));
    if (!("token" in created)) throw new Error(created.error);
    await clientSign(created.token, "Rose Khalil", "1.2.3.4", SIGNATURE_PNG);
    const db = await getDb();
    await db.update(contracts).set({ paymentsLive: true }).where(eq(contracts.id, created.contract.id));
    let lv = (await getContractByToken(created.token))!;
    const m = lv.milestones[0];
    expect(await recordDeposit(m.id, m.amountFils, "mock_live", { provider: "mock" })).toBe("wrong_mode");
    expect(await recordDeposit(m.id, m.amountFils, "live_1", { provider: "hyperpay", currency: "JOD" })).toBe("ok");
    for (const c of m.checks) await setCheck(lv.contract.id, m.id, c.id, "agency", true);
    await submitMilestone((await getContractByToken(created.token))!, m.id, "");
    for (const c of m.checks) await setCheck(lv.contract.id, m.id, c.id, "client", true);
    await approveMilestone((await getContractByToken(created.token))!, m.id);
    // A real partner confirms the payout by webhook (docs/32); only then was money paid out.
    const [rel] = await db.select().from(escrowLedger).where(eq(escrowLedger.idemKey, `rel:${m.id}`));
    expect(rel.status).toBe("pending");
    expect(await applyProviderEvent("hyperpay", { id: "po_live_1", type: "payout.succeeded", paymentRef: `rel:${m.id}`, providerRef: "po_1", amountFils: rel.amountFils, currency: "JOD" })).toBe("ok");
    lv = (await getContractByToken(created.token))!;
    const r2 = await submitInviteReview(lv.reviewToken!, { ...review, visitorId: "22222222-2222-4333-8444-555555555555" });
    expect(r2).toMatchObject({ source: "contract", contractId: created.contract.id });
    expect(reviewProvenance(r2!)).toBe("completed_project");
    expect((await listReviews(agencyId)).some((r) => r.contractId === created.contract.id)).toBe(true);
    const invites = await db.select().from(reviewRequests).where(eq(reviewRequests.contractId, created.contract.id));
    expect(invites).toHaveLength(1);
  });
});
