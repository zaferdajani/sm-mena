import "./setup-db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAgency } from "@/lib/data/agencies";
import {
  approveMilestone,
  cancelContract,
  clientSign,
  closeDispute,
  createContract,
  escrowOverview,
  getContractByToken,
  getContractForAgency,
  markDirectPayment,
  nextFundable,
  openDispute,
  requestChanges,
  resolveMilestone,
  setCheck,
  startMilestoneFunding,
  submitMilestone,
  validateContract,
  type ContractInput,
} from "@/lib/data/contracts";
import { applyProviderEvent } from "@/lib/data/payments";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { milestoneChecks } from "@/lib/db/schema";
import { normalizeLines } from "@/lib/deliverables";

let agencyId: string;
beforeAll(async () => {
  const u = await createUser("studio@t.jo", "password-1234");
  agencyId = (await createAgency(u.id, { handle: "deal.studio", name: "Deal Studio", city: "amman", services: ["smm_management"] })).id;
});
afterAll(() => closeDb());

const draft = (over: Partial<ContractInput> = {}): ContractInput => ({
  title: "Instagram for Café Nour",
  summary: "Two months of content and account management.",
  items: normalizeLines([{ key: "reels", quantity: 8, platform: "instagram" }, { key: "account_management", quantity: 2, platform: "instagram" }, { key: "bogus", quantity: 1 }], ["instagram"]),
  specialRequests: [{ text: "Arabic captions reviewed by the owner before posting", milestone: 0 }],
  startDate: "2026-10-01",
  endDate: "2026-11-30",
  paymentMode: "protected",
  nda: true,
  ndaExtra: "Menu prices are confidential until launch.",
  client: { name: "Nour", phone: "+962790000001", email: "nour@cafe.jo" },
  milestones: [
    { title: "October", dueDate: "2026-10-31", amountFils: 250_000, checks: ["4 reels", "Account managed daily"] },
    { title: "November", dueDate: "2026-11-30", amountFils: 250_000, checks: ["4 reels", "Monthly report"] },
  ],
  signerName: "Sara Haddad",
  locale: "en",
  ...over,
});

const tickAll = async (token: string, by: "agency" | "client", index: number) => {
  const v = (await getContractByToken(token))!;
  const m = v.milestones[index];
  for (const c of m.checks) await setCheck(v.contract.id, m.id, c.id, by, true);
};

describe("contract drafts", () => {
  it("validates dates, milestones, amounts and checklists", () => {
    const d = draft();
    expect(validateContract(d)).toBeNull();
    expect(validateContract({ ...d, milestones: [] })).toBe("noMilestones");
    expect(validateContract({ ...d, endDate: "2026-09-01" })).toBe("dates");
    expect(validateContract({ ...d, milestones: [{ ...d.milestones[0], dueDate: "2027-01-01" }] })).toBe("milestoneDate");
    expect(validateContract({ ...d, milestones: [{ ...d.milestones[0], checks: [" "] }] })).toBe("emptyChecklist");
    expect(validateContract({ ...d, milestones: [{ ...d.milestones[0], amountFils: 0 }] })).toBe("amounts");
    expect(validateContract({ ...d, signerName: "S" })).toBe("signer");
    expect(d.items).toEqual([{ key: "reels", quantity: 8, platform: "instagram" }, { key: "account_management", quantity: 2, platform: "instagram" }]);
  });
});

describe("protected contract", () => {
  it("runs sign → fund → deliver → confirm → release, milestone by milestone", async () => {
    const created = await createContract(agencyId, draft());
    if (!("token" in created)) throw new Error(created.error);
    const { token, contract } = created;
    expect(contract.number).toMatch(/^SW-\d{4}-[2-9A-Z]{6}$/);
    expect(contract.totalFils).toBe(500_000);
    let v = (await getContractByToken(token))!;
    // The special request becomes a checklist item on milestone 1.
    expect(v.milestones[0].checks.map((c) => [c.text, c.source])).toContainEqual(["Arabic captions reviewed by the owner before posting", "special_request"]);
    expect(nextFundable(v)).toBeNull(); // not signed yet

    expect(await clientSign(token, "Nour Khalil", "1.2.3.4")).toEqual({ ok: true });
    expect(await clientSign(token, "Nour Khalil", "1.2.3.4")).toEqual({ error: "notSignable" });
    v = (await getContractByToken(token))!;
    expect(v.contract.status).toBe("active");

    // Can't deliver before the client pays in.
    await tickAll(token, "agency", 0);
    expect(await submitMilestone(v, v.milestones[0].id, "")).toEqual({ error: "notFunded" });

    const funding = await startMilestoneFunding(token, v.milestones[0].id);
    expect(funding?.redirectPath).toBe(`/c/${token}/fund/${v.milestones[0].id}`);
    expect(await startMilestoneFunding(token, v.milestones[1].id)).toBeNull(); // in order only
    const event = { id: "evt_ms1", type: "payment.succeeded" as const, paymentRef: `ms_${v.milestones[0].id}`, providerRef: "mock_1", amountFils: 250_000 };
    expect(await applyProviderEvent("mock", { ...event, id: "evt_bad", amountFils: 1 })).toBe("amount_mismatch");
    expect(await applyProviderEvent("mock", event)).toBe("ok");
    expect(await applyProviderEvent("mock", event)).toBe("duplicate");

    v = (await getContractByToken(token))!;
    expect(v.milestones[0].status).toBe("funded");
    expect(v.money.held).toBe(250_000);
    expect(await cancelContract(v, "client", "changed my mind")).toEqual({ error: "moneyHeld" });

    expect(await submitMilestone(v, v.milestones[0].id, "Reels are live: instagram.com/cafenour")).toEqual({ ok: true });
    v = (await getContractByToken(token))!;
    // Client must confirm every item, including the special request.
    expect(await approveMilestone(v, v.milestones[0].id)).toEqual({ error: "checklist" });
    expect(await requestChanges(v, v.milestones[0].id, "Captions weren't reviewed")).toEqual({ ok: true });
    v = (await getContractByToken(token))!;
    expect(v.milestones[0].status).toBe("changes_requested");
    expect(await submitMilestone(v, v.milestones[0].id, "Captions reviewed")).toEqual({ ok: true });
    await tickAll(token, "client", 0);
    v = (await getContractByToken(token))!;
    expect(await approveMilestone(v, v.milestones[0].id)).toEqual({ ok: true });

    v = (await getContractByToken(token))!;
    expect(v.milestones[0].status).toBe("released");
    expect(v.money).toMatchObject({ deposited: 250_000, released: 250_000, held: 0 });
    expect(nextFundable(v)?.id).toBe(v.milestones[1].id);
    expect(v.events.map((e) => e.type)).toEqual(expect.arrayContaining(["signed", "funded", "submitted", "changes_requested", "approved", "released"]));
  });

  it("refuses to sign terms that changed after the agency signed", async () => {
    const created = await createContract(agencyId, draft());
    if (!("token" in created)) throw new Error(created.error);
    const v = (await getContractByToken(created.token))!;
    const db = await getDb();
    await db.update(milestoneChecks).set({ text: "Only 1 reel" }).where(eq(milestoneChecks.id, v.milestones[0].checks[0].id));
    expect(await clientSign(created.token, "Nour Khalil", "1.2.3.4")).toEqual({ error: "tampered" });
  });

  it("takes the platform fee on release and lets an admin settle disputes", async () => {
    process.env.PLATFORM_FEE_PERCENT = "5";
    const created = await createContract(agencyId, draft({ milestones: [{ title: "All", dueDate: "2026-11-30", amountFils: 200_000, checks: ["Everything"] }] }));
    delete process.env.PLATFORM_FEE_PERCENT;
    if (!("token" in created)) throw new Error(created.error);
    const { token } = created;
    await clientSign(token, "Nour Khalil", "1.2.3.4");
    let v = (await getContractByToken(token))!;
    await applyProviderEvent("mock", { id: "evt_fee", type: "payment.succeeded", paymentRef: `ms_${v.milestones[0].id}`, providerRef: "mock_2", amountFils: 200_000 });
    v = (await getContractByToken(token))!;
    expect(await openDispute(v, "client", "Nothing delivered after 3 weeks")).toEqual({ ok: true });
    const overview = await escrowOverview();
    expect(overview.disputes.map((d) => d.contract.id)).toContain(v.contract.id);

    expect(await resolveMilestone(v.contract.id, v.milestones[0].id, "release", "Delivered, client unreachable")).toEqual({ ok: true });
    v = (await getContractByToken(token))!;
    expect(v.money).toMatchObject({ released: 190_000, fees: 10_000, held: 0 });
    expect(v.contract.status).toBe("completed");
    await closeDispute(v.contract.id, "settled");
  });

  it("refunds the client when an admin decides so", async () => {
    const created = await createContract(agencyId, draft({ milestones: [{ title: "All", dueDate: "2026-11-30", amountFils: 90_000, checks: ["Logo"] }] }));
    if (!("token" in created)) throw new Error(created.error);
    await clientSign(created.token, "Nour Khalil", "1.2.3.4");
    let v = (await getContractByToken(created.token))!;
    await applyProviderEvent("mock", { id: "evt_ref", type: "payment.succeeded", paymentRef: `ms_${v.milestones[0].id}`, providerRef: "mock_3", amountFils: 90_000 });
    v = (await getContractByToken(created.token))!;
    await openDispute(v, "client", "Agency stopped replying");
    expect(await resolveMilestone(v.contract.id, v.milestones[0].id, "refund", "No delivery")).toEqual({ ok: true });
    v = (await getContractByToken(created.token))!;
    expect(v.milestones[0].status).toBe("refunded");
    expect(v.money).toMatchObject({ refunded: 90_000, held: 0 });
  });
});

describe("direct contract", () => {
  it("tracks delivery and confirmations without holding money", async () => {
    const created = await createContract(agencyId, draft({ paymentMode: "direct", nda: false }));
    if (!("token" in created)) throw new Error(created.error);
    const { token, contract } = created;
    expect(contract.feePercent).toBe(0);
    await clientSign(token, "Nour Khalil", "5.6.7.8");
    let v = (await getContractByToken(token))!;
    expect(nextFundable(v)).toBeNull();
    await tickAll(token, "agency", 0);
    v = (await getContractByToken(token))!;
    expect(await submitMilestone(v, v.milestones[0].id, "done")).toEqual({ ok: true });
    await tickAll(token, "client", 0);
    v = (await getContractByToken(token))!;
    expect(await approveMilestone(v, v.milestones[0].id)).toEqual({ ok: true });
    expect(await markDirectPayment(v, v.milestones[0].id, "client")).toEqual({ ok: true });
    const agencyView = (await getContractForAgency(agencyId, contract.id))!;
    expect(agencyView.milestones[0]).toMatchObject({ status: "approved", clientPaidDirect: true });
    expect(agencyView.money.deposited).toBe(0);
    expect(await getContractForAgency("00000000-0000-0000-0000-000000000000", contract.id)).toBeNull();
    // Nothing held, so either side may cancel the rest.
    expect(await cancelContract(agencyView, "agency", "Client paused the project")).toEqual({ ok: true });
  });
});
