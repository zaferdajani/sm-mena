import "./setup-db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SIGNATURE_PNG } from "./png";
import { removeDemoData } from "@/lib/data/admin";
import { createAgency, getAgencyByHandle } from "@/lib/data/agencies";
import { createContract, getContractByToken, signAsClient, type ContractInput } from "@/lib/data/contracts";
import { deactivateAgency, reactivateAgency, testLedger, testLedgerCsv } from "@/lib/data/deactivation";
import { applyProviderEvent } from "@/lib/data/payments";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { agencies, auditLogs, contracts, escrowLedger, users } from "@/lib/db/schema";

const draft: ContractInput = {
  title: "Test launch",
  summary: "One milestone.",
  items: [],
  specialRequests: [],
  startDate: "2026-10-01",
  endDate: "2026-12-31",
  paymentMode: "protected",
  nda: false,
  client: { name: "Rose", phone: "+962790000011", email: "rose@cafe.jo" },
  milestones: [{ title: "Designs", dueDate: "2026-10-31", amountFils: 200_000, checks: ["Logo"] }],
  signerName: "Sara Haddad",
  signature: SIGNATURE_PNG,
  locale: "en",
};

/** An agency with a signed test contract whose first milestone was paid in (test money). */
async function agencyWithTestMoney(handle: string, demo = false) {
  const u = await createUser(`${handle}@t.jo`, "password-1234");
  const a = await createAgency(u.id, { handle, name: handle, city: "amman", services: ["smm_management"] });
  const db = await getDb();
  if (demo) await db.update(agencies).set({ isDemo: true }).where(eq(agencies.id, a.id));
  const created = await createContract(a.id, draft);
  if (!("token" in created)) throw new Error(created.error);
  const v = (await getContractByToken(created.token))!;
  expect(await signAsClient(v, "Rose Khalil", "1.2.3.4", SIGNATURE_PNG, null)).toEqual({ ok: true });
  const m = v.milestones[0];
  expect(await applyProviderEvent("mock", { id: `evt_${m.id}`, type: "payment.succeeded", paymentRef: `ms_${m.id}`, providerRef: "mock_x", amountFils: m.amountFils, currency: "JOD" })).toBe("ok");
  return { agencyId: a.id, userId: u.id, contractId: v.contract.id };
}

beforeAll(async () => {});
afterAll(() => closeDb());

describe("test money is marked and kept", () => {
  it("marks every built-in test checkout entry as test, and it can't be unmarked or deleted", async () => {
    const { contractId } = await agencyWithTestMoney("test.money");
    const db = await getDb();
    const rows = await db.select().from(escrowLedger).where(eq(escrowLedger.contractId, contractId));
    expect(rows.length).toBe(1);
    expect(rows[0].test).toBe(true);
    await expect(db.delete(escrowLedger).where(eq(escrowLedger.contractId, contractId))).rejects.toThrow();
    const log = await testLedger();
    expect(log.some((r) => r.agency === "test.money" && r.type === "deposit")).toBe(true);
    expect(testLedgerCsv(log).split("\n")[0]).toContain("mode");
  });
});

describe("deactivating an account", () => {
  it("hides the agency, stops sign-in, keeps contracts and ledger, and logs the test money", async () => {
    const { agencyId, userId, contractId } = await agencyWithTestMoney("closing.agency");
    const r = await deactivateAgency(agencyId, "self", userId);
    expect(r).toMatchObject({ ok: true, already: false });
    expect(await getAgencyByHandle("closing.agency")).toBeNull();
    const db = await getDb();
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    expect(u.disabledAt).not.toBeNull();
    expect((await db.select().from(contracts).where(eq(contracts.id, contractId))).length).toBe(1);
    expect((await db.select().from(escrowLedger).where(eq(escrowLedger.contractId, contractId))).length).toBe(1);
    const [entry] = await db.select().from(auditLogs).where(eq(auditLogs.entityId, agencyId));
    expect(entry.action).toBe("agency.deactivated.self");
    expect(entry.meta).toMatchObject({ testLedgerEntries: 1 });
    // Twice changes nothing; an admin can bring it back.
    expect(await deactivateAgency(agencyId, "self", userId)).toMatchObject({ ok: true, already: true });
    expect(await reactivateAgency(agencyId, userId)).toEqual({ ok: true });
    expect(await getAgencyByHandle("closing.agency")).not.toBeNull();
  });
});

describe("removing demo data", () => {
  it("deactivates demo agencies that took part in contracts and deletes the rest", async () => {
    const kept = await agencyWithTestMoney("demo.with.contract", true);
    const u = await createUser("demo-plain@t.jo", "password-1234");
    const plain = await createAgency(u.id, { handle: "demo.plain", name: "Plain", city: "amman", services: ["seo"] });
    const db = await getDb();
    await db.update(agencies).set({ isDemo: true }).where(eq(agencies.id, plain.id));

    expect(await removeDemoData(null)).toEqual({ deleted: 1, deactivated: 1 });
    expect((await db.select().from(agencies).where(eq(agencies.id, plain.id))).length).toBe(0);
    const [a] = await db.select().from(agencies).where(eq(agencies.id, kept.agencyId));
    expect(a).toMatchObject({ status: "deactivated", deactivationReason: "demo_cleanup" });
    expect((await testLedger()).some((r) => r.agency === "demo.with.contract" && r.agencyStatus === "deactivated")).toBe(true);
    // A demo agency can't be reactivated, and a second clean-up has nothing left to do.
    expect(await reactivateAgency(kept.agencyId, u.id)).toEqual({ error: "notAllowed" });
    expect(await removeDemoData(null)).toEqual({ deleted: 0, deactivated: 0 });
  });
});
