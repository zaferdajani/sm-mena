import "./setup-db";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { closeDb } from "@/lib/db";
import { contractPayerKey, creditVirtualWallet, debitVirtualWallet, openContractClientWallet, openVirtualWallet, readVirtualWallet, recordVirtualDecline } from "@/lib/payments/virtual-wallet";

afterAll(() => closeDb());
afterEach(() => vi.unstubAllEnvs());

function enable() {
  vi.stubEnv("STAGING_MODE", "true");
  vi.stubEnv("VIRTUAL_PAYMENTS", "sandbox");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  vi.stubEnv("PROTECTED_PAYMENTS_LIVE", "");
  vi.stubEnv("PAYMENTS_PROVIDER", "mock");
}

describe("virtual wallet", () => {
  it("opens a contract client's wallet once, with enough for the milestone (QA H-02)", async () => {
    enable();
    const contract = { id: "6f0c4c2e-0000-4000-8000-000000000001", clientEmail: null, currency: "JOD" };
    expect(contractPayerKey(contract)).toBe(`contract:${contract.id}`);
    await openContractClientWallet(contract, 50_000);
    await openContractClientWallet(contract, 50_000);
    expect((await readVirtualWallet(contractPayerKey(contract))).balances.JOD).toBe(2_000_000);
    expect(await debitVirtualWallet(contractPayerKey(contract), 50_000, "JOD", "dep:client", "milestone")).toEqual({ ok: true, balance: 1_950_000 });
    const big = { id: "6f0c4c2e-0000-4000-8000-000000000002", clientEmail: "Client@Example.test", currency: "JOD" };
    await openContractClientWallet(big, 5_000_000);
    expect((await readVirtualWallet("client@example.test")).balances.JOD).toBe(5_000_000);
  });
  it("opens a balance, debits once, records a decline, and credits a refund idempotently", async () => {
    enable();
    await openVirtualWallet("staging.owner.jo@sawwiq.test", "JOD", 2_000_000);
    await openVirtualWallet("staging.owner.jo@sawwiq.test", "JOD", 2_000_000);
    const opened = await readVirtualWallet("staging.owner.jo@sawwiq.test");
    expect(opened.balances.JOD).toBe(2_000_000);

    const paid = await debitVirtualWallet("staging.owner.jo@sawwiq.test", 150_000, "JOD", "dep:one", "milestone");
    expect(paid).toEqual({ ok: true, balance: 1_850_000 });
    const again = await debitVirtualWallet("staging.owner.jo@sawwiq.test", 150_000, "JOD", "dep:one", "milestone");
    expect(again).toEqual({ ok: true, balance: 1_850_000 });

    const short = await debitVirtualWallet("staging.owner.jo@sawwiq.test", 9_000_000, "JOD", "dep:too-big", "too big");
    expect(short).toEqual({ ok: false, reason: "insufficient" });
    await recordVirtualDecline("staging.owner.jo@sawwiq.test", 150_000, "JOD", "decline:card", "declined");

    await creditVirtualWallet("staging.owner.jo@sawwiq.test", 150_000, "JOD", "ref:one", "refund");
    await creditVirtualWallet("staging.owner.jo@sawwiq.test", 150_000, "JOD", "ref:one", "refund");
    const after = await readVirtualWallet("Staging.Owner.JO@sawwiq.test");
    expect(after.balances.JOD).toBe(2_000_000);
    expect(after.entries.map((e) => e.kind).sort()).toEqual(["credit", "debit", "decline", "open"]);
  });

  it("does nothing when the sandbox is off", async () => {
    vi.stubEnv("STAGING_MODE", "");
    vi.stubEnv("VIRTUAL_PAYMENTS", "sandbox");
    await openVirtualWallet("nobody@sawwiq.test", "JOD", 1000);
    expect(await debitVirtualWallet("nobody@sawwiq.test", 100, "JOD", "dep:x", "x")).toEqual({ ok: false, reason: "disabled" });
    expect((await readVirtualWallet("nobody@sawwiq.test")).entries).toEqual([]);
  });
});
