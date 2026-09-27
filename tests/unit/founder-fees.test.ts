import "./setup-db";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { SIGNATURE_PNG } from "./png";
import { createAgency } from "@/lib/data/agencies";
import { cancelContract, createContract, getContractForAgency, hasFounderWaiver, type ContractInput } from "@/lib/data/contracts";
import { createProjectRequest } from "@/lib/data/requests";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { contracts } from "@/lib/db/schema";
import { normalizeLines } from "@/lib/deliverables";

// Real protected payments are live for this file (a partner adapter is out of
// scope here); everything else runs against the real database code paths.
let live = true;
vi.mock("@/lib/payments/readiness", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/payments/readiness")>();
  return { ...mod, protectedPaymentsLive: () => live };
});

let founder: string;
let newcomer: string;
let requestId: string;
let n = 0;

const provider = async (handle: string, extra: Record<string, unknown>) => {
  const u = await createUser(`${handle}@fees.jo`, "password-1234");
  return (await createAgency(u.id, { handle, name: handle, city: "amman", services: ["smm_management"] }, extra)).id;
};

beforeAll(async () => {
  process.env.FOUNDING_ACTIVATED_AT = "2026-01-01T00:00:00Z";
  founder = await provider("founder.studio", { foundingSeat: 1, bio: "Content and ads for restaurants.", postCount: 1 });
  newcomer = await provider("signup.only", { foundingSeat: 2 }); // a seat, but no bio and no work
  const { request } = await createProjectRequest(
    { clientName: "Nour", phone: "+962790000001", services: ["smm_management"], platforms: [], description: "Instagram for a café", source: "form", visitorId: "fees-client" },
    [
      { agencyId: founder, score: 90 },
      { agencyId: newcomer, score: 90 },
    ],
  );
  requestId = request.id;
});
afterEach(() => {
  live = true;
  process.env.FOUNDING_ACTIVATED_AT = "2026-01-01T00:00:00Z";
});
afterAll(() => {
  delete process.env.FOUNDING_ACTIVATED_AT;
  return closeDb();
});

const draft = (over: Partial<ContractInput> = {}): ContractInput => ({
  title: `Contract ${++n}`,
  summary: "Two months of content.",
  items: normalizeLines([{ key: "reels", quantity: 8, platform: "instagram" }], ["instagram"]),
  specialRequests: [],
  startDate: "2026-10-01",
  endDate: "2026-11-30",
  paymentMode: "protected",
  nda: false,
  client: { name: "Nour", phone: "+962790000001" },
  milestones: [{ title: "October", dueDate: "2026-10-31", amountFils: 250_000, checks: ["4 reels"] }],
  signerName: "Sara Haddad",
  signature: SIGNATURE_PNG,
  locale: "en",
  requestId,
  ...over,
});

const create = async (agencyId: string, over: Partial<ContractInput> = {}) => {
  const r = await createContract(agencyId, draft(over));
  if (!("contract" in r)) throw new Error(r.error);
  return r;
};

describe("Founder fees on real contracts", () => {
  it("waives the first live Sawwiq-acquired project, charges 7% next, and never discounts other flows", async () => {
    const first = await create(founder);
    expect(first.contract.feePercent).toBe(0);
    expect(first.contract.founderWaiver).toBe(true);
    expect(first.contract.paymentsLive).toBe(true);

    const second = await create(founder);
    expect(second.contract.feePercent).toBe(7);
    expect(second.contract.founderWaiver).toBe(false);

    // The agency's own client, paid through Sawwiq: standard rate, no invented discount.
    const own = await create(founder, { requestId: null, proposalId: null });
    expect(own.contract.feePercent).toBe(10);
    expect(own.contract.founderWaiver).toBe(false);

    // A direct contract carries no Sawwiq fee at all and no founder flag.
    const direct = await create(founder, { paymentMode: "direct" });
    expect(direct.contract.feePercent).toBe(0);
    expect(direct.contract.founderWaiver).toBe(false);

    // Registration alone is not a founder: standard rate on the same brief.
    const signup = await create(newcomer);
    expect(signup.contract.feePercent).toBe(10);
    expect(signup.contract.founderWaiver).toBe(false);

    // Cancelling the unsigned first contract frees the waiver for a real first project.
    const view = await getContractForAgency(founder, first.contract.id);
    expect(await cancelContract(view!, "agency", "client changed plans")).toEqual({ ok: true });
    expect(await hasFounderWaiver(founder)).toBe(false);
    const again = await create(founder);
    expect(again.contract.feePercent).toBe(0);
    expect(again.contract.founderWaiver).toBe(true);
    // The cancelled contract keeps its signed terms untouched.
    expect((await getContractForAgency(founder, first.contract.id))!.contract.feePercent).toBe(0);
  });

  it("never gives two simultaneous contracts the one-time waiver", async () => {
    const racer = await provider("racer.studio", { foundingSeat: 3, bio: "Ads for gyms.", postCount: 1 });
    const results = await Promise.all([create(racer), create(racer), create(racer)]);
    const waived = results.filter((r) => r.contract.founderWaiver);
    expect(waived).toHaveLength(1);
    expect(waived[0].contract.feePercent).toBe(0);
    expect(results.filter((r) => !r.contract.founderWaiver).map((r) => r.contract.feePercent)).toEqual([7, 7]);

    // The database itself refuses a second live waiver for the same agency.
    const db = await getDb();
    const other = results.find((r) => !r.contract.founderWaiver)!;
    const refused = await db
      .update(contracts)
      .set({ founderWaiver: true })
      .where(eq(contracts.id, other.contract.id))
      .then(() => null, (e: unknown) => e as { message?: string; cause?: { message?: string; code?: string } });
    expect(refused).not.toBeNull();
    expect(refused?.cause?.code ?? "").toBe("23505");
    expect(`${refused?.message ?? ""} ${refused?.cause?.message ?? ""}`).toMatch(/contracts_founder_waiver_idx/);
  });

  it("charges the standard fee while protected payments are in test mode or after the founder year", async () => {
    const fresh = await provider("later.studio", { foundingSeat: 4, bio: "Video for clinics.", postCount: 1 });
    live = false;
    const test = await create(fresh);
    expect(test.contract.feePercent).toBe(10);
    expect(test.contract.paymentsLive).toBe(false);
    expect(test.contract.founderWaiver).toBe(false);

    live = true;
    process.env.FOUNDING_ACTIVATED_AT = "2024-01-01T00:00:00Z";
    const expired = await create(fresh);
    expect(expired.contract.feePercent).toBe(10);
    expect(expired.contract.founderWaiver).toBe(false);
  });
});
