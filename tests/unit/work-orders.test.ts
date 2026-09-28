import "./setup-db";
import { and, eq, inArray } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SIGNATURE_PNG } from "./png";
import { createAgency } from "@/lib/data/agencies";
import { addWindow } from "@/lib/data/collab-availability";
import { capacityFor, expireHolds, holdFor } from "@/lib/data/capacity";
import { clientSign, createContract, getContractByToken, getContractForAgency, setCheck, submitMilestone, type ContractInput } from "@/lib/data/contracts";
import { applyProviderEvent } from "@/lib/data/payments";
import { createUser } from "@/lib/data/users";
import { acceptWorkOrder, addAsset, addComment, answerVersion, assetForDownload, createWorkOrder, decideSubmission, declineWorkOrder, endWorkOrder, linkContract, listWorkOrders, offerWorkOrder, postMessage, proposeVersion, submitWork, workspaceFor } from "@/lib/data/work-orders";
import { capacityLeft, paymentProjection, versionHash } from "@/lib/collab/work-orders";
import { closeDb, getDb } from "@/lib/db";
import { capacityReservations, milestoneShares, partnerRequests, workOrderVersions, type Agency } from "@/lib/db/schema";

// Work orders (docs/49): a buyer and a supplier agree a versioned scope, the
// supplier delivers files, the buyer reviews, and approval reaches the linked
// milestone only through the buyer's own contract view. In-memory PGlite.

let buyer: Agency;
let supplier: Agency;
let stranger: Agency;
const png = () => sharp({ create: { width: 900, height: 700, channels: 3, background: "#0e6b46" } }).png().toBuffer();

const mk = async (handle: string, kind: "agency" | "freelancer") => {
  const u = await createUser(`${handle}@wo.jo`, "password-1234");
  return createAgency(u.id, { handle, name: handle, city: "amman", services: ["photography"], kind, teamRoles: ["photographer"] });
};

beforeAll(async () => {
  buyer = await mk("wo.buyer", "agency");
  supplier = await mk("wo.photo", "freelancer");
  stranger = await mk("wo.other", "agency");
  await (await getDb()).insert(partnerRequests).values({ fromAgencyId: buyer.id, toAgencyId: supplier.id, roles: ["photographer"], status: "accepted" });
}, 60_000);
afterAll(() => closeDb());

const terms = { deliverables: [{ key: "photo_session", quantity: 1, platform: null }], scope: "Two mornings, 60 edited photos.", revisionAllowance: 2, dueOn: "2026-11-12", reviewDays: 7, compensationNote: "Per the partner contract, milestone 1", permissionScope: "Portfolio use after the client launch" };

/** A protected supplier→buyer contract, signed by the buyer as the client agency and funded. */
async function supplierContract() {
  const draft: ContractInput = {
    title: "Café shoot for Nour", summary: "", items: [], specialRequests: [], startDate: "2026-11-01", endDate: "2026-11-30", paymentMode: "protected", nda: false, ndaExtra: "",
    client: { name: buyer.name, phone: "+962790000001", email: "buyer@wo.jo" }, clientAgencyId: buyer.id,
    milestones: [{ title: "Shoot and edit", dueDate: "2026-11-12", amountFils: 300_000, checks: ["60 edited photos"] }],
    signerName: "Lina", signature: SIGNATURE_PNG, locale: "en",
  } as ContractInput;
  const created = await createContract(supplier.id, draft);
  if (!("token" in created)) throw new Error(created.error);
  expect(await clientSign(created.token, buyer.name, "1.2.3.4", SIGNATURE_PNG)).toEqual({ ok: true });
  const v = (await getContractByToken(created.token))!;
  const m = v.milestones[0];
  expect(await applyProviderEvent("mock", { id: `evt_wo_${m.id}`, type: "payment.succeeded", paymentRef: `ms_${m.id}`, providerRef: "mock_wo", amountFils: 300_000 })).toBe("ok");
  return { contractId: v.contract.id, milestoneId: m.id, token: created.token };
}

describe("pure rules", () => {
  it("fingerprints terms deterministically and projects payment stages honestly", () => {
    expect(versionHash("wo", 1, terms)).toBe(versionHash("wo", 1, { ...terms, deliverables: [{ ...terms.deliverables[0] }] }));
    expect(versionHash("wo", 1, terms)).not.toBe(versionHash("wo", 2, terms));
    expect(paymentProjection(null, null, false).headline).toBe("no_contract");
    const c = { status: "active", paymentMode: "protected" as const, paymentsLive: false, clientSignedAt: new Date() };
    expect(paymentProjection(c, { status: "pending", clientPaidDirect: false, agencyConfirmedPaid: false, releasedAt: null }, false).headline).toBe("awaiting_funding");
    expect(paymentProjection(c, { status: "submitted", clientPaidDirect: false, agencyConfirmedPaid: false, releasedAt: null }, false).headline).toBe("awaiting_review");
    const released = paymentProjection(c, { status: "released", clientPaidDirect: false, agencyConfirmedPaid: false, releasedAt: new Date() }, true);
    expect(released.headline).toBe("approved_payout_initiated");
    expect(released.stages.receipt).toBe("pending"); // never "received" for a protected payout
    const direct = paymentProjection({ ...c, paymentMode: "direct" }, { status: "approved", clientPaidDirect: true, agencyConfirmedPaid: true, releasedAt: null }, false);
    expect(direct.headline).toBe("received");
  });
  it("counts capacity only where the provider declared it", () => {
    const w = [{ startsAt: new Date("2026-11-01"), endsAt: new Date("2026-11-30"), status: "available", capacityUnits: 2 }];
    const i = { start: new Date("2026-11-10"), end: new Date("2026-11-12") };
    expect(capacityLeft(w, [], i)).toBe(2);
    expect(capacityLeft(w, [{ startsAt: new Date("2026-11-11"), endsAt: new Date("2026-11-13"), units: 2, status: "confirmed" }], i)).toBe(0);
    expect(capacityLeft(w, [{ startsAt: new Date("2026-11-11"), endsAt: new Date("2026-11-13"), units: 2, status: "tentative" }], i)).toBe(2);
    expect(capacityLeft([{ ...w[0], capacityUnits: null }], [], i)).toBeNull();
    expect(capacityLeft([{ ...w[0], status: "busy" }], [], i)).toBeNull();
  });
});

describe("work orders", () => {
  it("run offer → accept → deliver → review, freeze accepted terms, and approve the linked milestone through the contract", async () => {
    const { contractId, milestoneId, token } = await supplierContract();
    // The buyer's own client contract is the private parent project.
    const parent = await createContract(buyer.id, { title: "Nour's launch", summary: "", items: [], specialRequests: [], startDate: "2026-11-01", endDate: "2026-12-31", paymentMode: "direct", nda: false, ndaExtra: "", client: { name: "Nour", phone: "+962790000002", email: "nour@wo.jo" }, milestones: [{ title: "Launch", dueDate: "2026-12-01", amountFils: 900_000, checks: ["Live"] }], signerName: "Buyer", signature: SIGNATURE_PNG, locale: "en" } as ContractInput);
    if (!("token" in parent)) throw new Error(parent.error);
    const c = await createWorkOrder(buyer, { supplierAgencyId: supplier.id, title: "Café shoot", mode: "private", contractId, milestoneId, parentContractId: parent.contract.id, terms });
    if (!("ok" in c)) throw new Error(c.error);
    // A draft is invisible to the supplier; only the buyer can offer; only the supplier can accept; strangers see nothing.
    expect(await workspaceFor(supplier.id, c.id)).toBeNull();
    expect((await listWorkOrders(supplier.id)).some((r) => r.order.id === c.id)).toBe(false);
    expect(await proposeVersion(supplier, c.id, terms)).toEqual({ error: "notFound" });
    expect(await offerWorkOrder(supplier, c.id)).toEqual({ error: "notFound" });
    expect(await offerWorkOrder(buyer, c.id)).toEqual({ ok: true });
    expect(await workspaceFor(stranger.id, c.id)).toBeNull();
    // Once offered, the supplier may not rewrite the terms and then accept its own version.
    expect(await proposeVersion(supplier, c.id, { ...terms, permissionScope: "Unlimited portfolio use" })).toEqual({ error: "locked" });
    expect(await acceptWorkOrder(buyer, c.id)).toEqual({ error: "notFound" });
    expect(await acceptWorkOrder(supplier, c.id)).toEqual({ ok: true, capacityLeft: null });
    expect(await acceptWorkOrder(supplier, c.id)).toEqual({ ok: true, capacityLeft: null }); // retry: same outcome
    const db = await getDb();
    const [v1] = await db.select().from(workOrderVersions).where(and(eq(workOrderVersions.workOrderId, c.id), eq(workOrderVersions.version, 1)));
    expect(v1.status).toBe("accepted");
    expect(v1.termsHash).toBe(versionHash(c.id, 1, v1));
    // Frozen in the database.
    await expect(db.update(workOrderVersions).set({ scope: "changed" }).where(eq(workOrderVersions.id, v1.id))).rejects.toThrow();

    // Private notes are the buyer's only; the shared thread is both.
    expect(await postMessage(buyer, c.id, "private", "Our margin on this is 30%.")).toEqual({ ok: true });
    expect(await postMessage(supplier, c.id, "private", "x")).toEqual({ error: "notFound" });
    expect(await postMessage(supplier, c.id, "shared", "Shooting Tuesday.")).toEqual({ ok: true });
    const asSupplier = (await workspaceFor(supplier.id, c.id))!;
    expect(asSupplier.messages.map((m) => m.scope)).toEqual(["shared"]);
    expect("parentContractId" in asSupplier.order).toBe(false);
    expect((await listWorkOrders(supplier.id)).map((r) => "parentContractId" in r.order)).toEqual([false]);
    const asBuyer = (await workspaceFor(buyer.id, c.id))!;
    expect(asBuyer.order.parentContractId).toBe(parent.contract.id);
    expect((await listWorkOrders(buyer.id)).find((r) => r.order.id === c.id)?.order.parentContractId).toBe(parent.contract.id);
    // The link is fixed once set.
    expect(await linkContract(buyer, c.id, contractId, null)).toEqual({ error: "locked" });
    expect(asBuyer.messages.map((m) => m.scope).sort()).toEqual(["private", "shared"]);
    expect(asBuyer.payment.headline).toBe("in_delivery");

    // Files: version 2 supersedes version 1 but keeps it and its comments; a stranger cannot download.
    const a1 = await addAsset(supplier, c.id, { name: "cover.png", buffer: await png() });
    if (!("ok" in a1)) throw new Error(a1.error);
    expect(await addComment(buyer, a1.assetId, "Lighter on the left", { x: 20, y: 40 })).toEqual({ ok: true });
    const group = (await workspaceFor(buyer.id, c.id))!.assets[0].groupId;
    const a2 = await addAsset(supplier, c.id, { name: "cover.png", buffer: await png(), groupId: group });
    expect("ok" in a2 && a2.version).toBe(2);
    const ws = (await workspaceFor(buyer.id, c.id))!;
    expect(ws.assets.map((a) => [a.version, a.status, a.comments.length])).toEqual([[1, "superseded", 1], [2, "current", 0]]);
    expect(ws.order.status).toBe("in_progress");
    expect(await assetForDownload(stranger.id, a1.assetId, false)).toBeNull();
    expect((await assetForDownload(buyer.id, a1.assetId, true))?.key).toMatch(/-t\.webp$/);
    expect(await addAsset(supplier, c.id, { name: "bad", buffer: Buffer.from("not an image") })).toMatchObject({ error: "image" });

    // Hand over on the contract too (the supplier ticks its checklist and submits the milestone), then in the work order.
    const sv = (await getContractForAgency(supplier.id, contractId))!;
    for (const ch of sv.milestones[0].checks) await setCheck(contractId, milestoneId, ch.id, "agency", true);
    expect(await submitMilestone((await getContractForAgency(supplier.id, contractId))!, milestoneId, "Done")).toEqual({ ok: true });
    expect(await submitWork(buyer, c.id, "x")).toEqual({ error: "notFound" });
    expect(await submitWork(supplier, c.id, "60 photos in the folder.")).toEqual({ ok: true, round: 1 });
    expect((await workspaceFor(buyer.id, c.id))!.payment.headline).toBe("awaiting_review");

    // Changes use the contract's revision round; then a new submission; then approval pays the protected milestone out.
    expect(await decideSubmission(supplier, c.id, "approved", "")).toEqual({ error: "notFound" });
    expect(await decideSubmission(buyer, c.id, "changes_requested", "Two photos are soft.")).toEqual({ ok: true, effect: "milestone_changes_requested" });
    let cv = (await getContractByToken(token))!;
    expect(cv.milestones[0].status).toBe("changes_requested");
    for (const ch of cv.milestones[0].checks) await setCheck(contractId, milestoneId, ch.id, "agency", true);
    expect(await submitMilestone((await getContractForAgency(supplier.id, contractId))!, milestoneId, "Fixed")).toEqual({ ok: true });
    expect(await submitWork(supplier, c.id, "Re-edited.")).toEqual({ ok: true, round: 2 });
    expect(await decideSubmission(buyer, c.id, "approved", "")).toEqual({ ok: true, effect: "milestone_approved" });
    cv = (await getContractByToken(token))!;
    expect(cv.milestones[0].status).toBe("released");
    const done = (await workspaceFor(supplier.id, c.id))!;
    expect(done.order.status).toBe("approved");
    expect(done.payment.headline).toBe("approved_payout_initiated");
    expect(done.payment.stages.receipt).toBe("pending");
    expect(done.submissions.map((s) => [s.round, s.decision, s.contractEffect])).toEqual([[1, "changes_requested", "milestone_changes_requested"], [2, "approved", "milestone_approved"]]);
    expect((await listWorkOrders(supplier.id)).map((r) => r.role)).toEqual(["supplier"]);
  }, 60_000);

  it("amend by new version with the other side's acceptance, decline, and withdraw", async () => {
    const { contractId } = await supplierContract();
    const c = await createWorkOrder(buyer, { supplierAgencyId: supplier.id, title: "Reels", mode: "private", contractId, terms });
    if (!("ok" in c)) throw new Error(c.error);
    // A stranger cannot create against someone else's contract.
    expect(await createWorkOrder(stranger, { supplierAgencyId: supplier.id, title: "x", mode: "private", contractId, terms })).toEqual({ error: "contract" });
    expect(await offerWorkOrder(buyer, c.id)).toEqual({ ok: true });
    expect(await declineWorkOrder(supplier, c.id)).toEqual({ ok: true });
    expect(await acceptWorkOrder(supplier, c.id)).toEqual({ error: "locked" });

    const d = await createWorkOrder(buyer, { supplierAgencyId: supplier.id, title: "Reels 2", mode: "private", contractId, terms });
    if (!("ok" in d)) throw new Error(d.error);
    await offerWorkOrder(buyer, d.id);
    await acceptWorkOrder(supplier, d.id);
    const p = await proposeVersion(supplier, d.id, { ...terms, scope: "Three mornings instead of two." });
    expect(p).toEqual({ ok: true, version: 2 });
    // The proposer cannot accept its own amendment; the buyer can; v1 is superseded but still there.
    expect(await answerVersion(supplier, d.id, 2, true)).toEqual({ error: "locked" });
    expect(await answerVersion(buyer, d.id, 2, true)).toEqual({ ok: true });
    const ws = (await workspaceFor(buyer.id, d.id))!;
    expect(ws.versions.map((v) => [v.version, v.status, v.intact])).toEqual([[1, "superseded", true], [2, "accepted", true]]);
    expect(ws.current?.scope).toBe("Three mornings instead of two.");
    expect(await endWorkOrder(supplier, d.id, "withdraw")).toEqual({ error: "notFound" });
    expect(await endWorkOrder(supplier, d.id, "cancel")).toEqual({ ok: true });
    expect(await submitWork(supplier, d.id, "late")).toEqual({ error: "locked" });
  }, 60_000);

  it("bounds rounds by the allowance, moves the hold with an accepted due date, and records disclosed decisions without touching the milestone", async () => {
    const db = await getDb();
    const { contractId, milestoneId } = await supplierContract();
    const c = await createWorkOrder(buyer, { supplierAgencyId: supplier.id, title: "Disclosed reels", mode: "disclosed", contractId, milestoneId, terms: { ...terms, revisionAllowance: 0, dueOn: "2026-11-20" } });
    if (!("ok" in c)) throw new Error(c.error);
    // The buyer may edit the offer before acceptance; the hold follows the new due date.
    await offerWorkOrder(buyer, c.id);
    expect((await holdFor(c.id))?.startsAt.toISOString()).toBe("2026-11-19T21:00:00.000Z");
    expect(await proposeVersion(buyer, c.id, { ...terms, revisionAllowance: 0, dueOn: "2026-11-25" })).toEqual({ ok: true, version: 2 });
    expect((await holdFor(c.id))?.startsAt.toISOString()).toBe("2026-11-24T21:00:00.000Z");
    expect(await acceptWorkOrder(supplier, c.id)).toEqual({ ok: true, capacityLeft: null });
    expect((await workspaceFor(buyer.id, c.id))!.versions.map((v) => [v.version, v.status])).toEqual([[1, "superseded"], [2, "accepted"]]);
    // An accepted amendment with another due date moves the confirmed hold.
    expect(await proposeVersion(supplier, c.id, { ...terms, revisionAllowance: 0, dueOn: "2026-11-28" })).toEqual({ ok: true, version: 3 });
    expect(await answerVersion(buyer, c.id, 3, true)).toEqual({ ok: true });
    const hold = (await holdFor(c.id))!;
    expect([hold.status, hold.startsAt.toISOString()]).toEqual(["confirmed", "2026-11-27T21:00:00.000Z"]);
    // Superseded history is immutable too.
    const [v1] = await db.select().from(workOrderVersions).where(and(eq(workOrderVersions.workOrderId, c.id), eq(workOrderVersions.version, 1)));
    await expect(db.update(workOrderVersions).set({ scope: "rewritten" }).where(eq(workOrderVersions.id, v1.id))).rejects.toThrow();
    // Disclosed mode: the share exists; the buyer's decision is a record only, the milestone stays as the client left it.
    await db.insert(milestoneShares).values({ contractId, milestoneId, agencyId: supplier.id, partnerAgencyId: buyer.id, kind: "fixed", amountFils: 100_000, status: "accepted" });
    expect(await submitWork(supplier, c.id, "round 1")).toEqual({ ok: true, round: 1 });
    expect(await decideSubmission(buyer, c.id, "changes_requested", "Tighter crop.")).toEqual({ ok: true, effect: "disclosed_client_reviews" });
    expect((await getContractForAgency(supplier.id, contractId))!.milestones[0].status).toBe("funded");
    // Allowance 0 means one round only.
    expect(await submitWork(supplier, c.id, "round 2")).toEqual({ error: "locked", detail: "rounds" });
    expect((await workspaceFor(buyer.id, c.id))!.submissions.map((s) => [s.round, s.decision, s.contractEffect])).toEqual([[1, "changes_requested", "disclosed_client_reviews"]]);
  }, 60_000);

  it("confirms capacity atomically: two acceptances cannot both take the last declared unit, and holds expire", async () => {
    const db = await getDb();
    await addWindow(supplier.id, { from: "2026-12-01", to: "2026-12-31", timezone: "Asia/Amman", status: "available", capacityUnits: 1, capacityUnit: "projects", visibility: "partners", note: "" });
    const { contractId } = await supplierContract();
    const dec = { ...terms, dueOn: "2026-12-10" };
    const a = await createWorkOrder(buyer, { supplierAgencyId: supplier.id, title: "Dec A", mode: "private", contractId, terms: dec });
    const b = await createWorkOrder(buyer, { supplierAgencyId: supplier.id, title: "Dec B", mode: "private", contractId, terms: dec });
    if (!("ok" in a) || !("ok" in b)) throw new Error("create");
    await offerWorkOrder(buyer, a.id);
    await offerWorkOrder(buyer, b.id);
    expect((await holdFor(a.id))?.status).toBe("tentative");
    const before = await capacityFor(db, supplier.id, { start: new Date("2026-12-09T21:00:00Z"), end: new Date("2026-12-10T21:00:00Z") });
    expect(before).toEqual({ declared: 1, left: 1, ok: true });
    const [ra, rb] = await Promise.all([acceptWorkOrder(supplier, a.id), acceptWorkOrder(supplier, b.id)]);
    const outcomes = [ra, rb].map((r) => ("ok" in r ? "ok" : r.error)).sort();
    expect(outcomes).toEqual(["capacity", "ok"]);
    const confirmed = await db.select().from(capacityReservations).where(and(inArray(capacityReservations.workOrderId, [a.id, b.id]), eq(capacityReservations.status, "confirmed")));
    expect(confirmed).toHaveLength(1);
    // The losing one stays tentative and expires on schedule.
    const loser = "ok" in ra ? b.id : a.id;
    await db.update(capacityReservations).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(capacityReservations.workOrderId, loser));
    expect(await expireHolds()).toBeGreaterThanOrEqual(1);
    expect((await holdFor(loser))).toBeNull();
    // With the hold gone, acceptance re-checks the declared capacity: still full.
    expect(await acceptWorkOrder(supplier, loser)).toEqual({ error: "capacity" });
  }, 60_000);
});
