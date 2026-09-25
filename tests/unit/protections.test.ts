import "./setup-db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SIGNATURE_PNG } from "./png";
import { createAgency, listAgencies, updateAgency } from "@/lib/data/agencies";
import {
  canonicalTerms,
  clientSign,
  createContract,
  decideChange,
  getContractByToken,
  postUpdate,
  reportingState,
  requestChange,
  validateContract,
  withdrawChange,
  type ContractInput,
} from "@/lib/data/contracts";
import { createUser } from "@/lib/data/users";
import { isFullService } from "@/lib/full-service";
import { parseExploreParams } from "@/lib/explore-params";
import { scoreAgency, type AgencyFeatures } from "@/lib/matching/score";
import { closeDb } from "@/lib/db";

// What a client told us after firing his agency (docs/20-client-voice.md):
// weak results, "every time they want more money", and he had to chase them.

let agencyId: string;
beforeAll(async () => {
  const u = await createUser("growth@t.jo", "password-1234");
  agencyId = (await createAgency(u.id, { handle: "growth.co", name: "Growth Co", city: "amman", services: ["smm_content", "ads_meta", "brand_identity"] })).id;
  await updateAgency(agencyId, { platforms: ["instagram", "linkedin"], startingPriceJod: 400 });
  const u2 = await createUser("posts@t.jo", "password-1234");
  const other = await createAgency(u2.id, { handle: "posts.only", name: "Posts Only", city: "amman", services: ["smm_content"] });
  await updateAgency(other.id, { platforms: ["tiktok"], startingPriceJod: 120 });
});
afterAll(() => closeDb());

const draft = (over: Partial<ContractInput> = {}): ContractInput => ({
  title: "Growth for Accrues and Nashmi",
  summary: "Content, paid media and brand guidelines.",
  items: [],
  specialRequests: [],
  startDate: "2026-10-01",
  endDate: "2026-12-31",
  paymentMode: "direct",
  nda: false,
  client: { name: "Omar", phone: "+962790000009" },
  milestones: [{ title: "October", dueDate: "2026-10-31", amountFils: 900_000, checks: ["Brand guidelines", "Channel plan and budget split"] }],
  kpis: [
    { label: "B2B leads per month", target: "60" },
    { label: "Cost per lead", target: "≤ 8 JOD" },
  ],
  reportingCadence: "weekly",
  mediaBudgetJod: 1500,
  signerName: "Lina Growth",
  signature: SIGNATURE_PNG,
  locale: "en",
  ...over,
});

describe("terms v2", () => {
  it("signs targets, reporting rhythm, ad budget and the two protections; v1 fingerprints don't change", () => {
    const base = { ...draft(), number: "SW-1", agencyId: "a", feePercent: 0 };
    const v2 = JSON.parse(canonicalTerms(base));
    expect(v2.kpis).toEqual([["B2B leads per month", "60"], ["Cost per lead", "≤ 8 JOD"]]);
    expect(v2.reporting).toBe("weekly");
    expect(v2.mediaBudgetJod).toBe(1500);
    expect(v2.clauses).toEqual(["client-owns-accounts-and-files", "no-extra-charges-without-approved-change"]);
    const v1 = JSON.parse(canonicalTerms({ ...base, version: 1 }));
    expect(v1.kpis).toBeUndefined();
    expect(v1.v).toBe(1);
    expect(validateContract(draft({ kpis: [{ label: "Leads", target: "" }] }))).toBe("kpis");
  });

  it("the client signs a contract and sees the commitments", async () => {
    const created = await createContract(agencyId, draft());
    if ("error" in created) throw new Error(created.error);
    expect(await clientSign(created.token, "Omar Khalil", "1.1.1.1", SIGNATURE_PNG)).toEqual({ ok: true });
    const v = (await getContractByToken(created.token))!;
    expect(v.contract).toMatchObject({ termsVersion: 4, reportingCadence: "weekly", mediaBudgetJod: 1500, status: "active" });
    expect(v.contract.kpis).toHaveLength(2);
  });
});

describe("no surprise charges", () => {
  it("extra money only through a change request the client accepts", async () => {
    const created = await createContract(agencyId, draft());
    if ("error" in created) throw new Error(created.error);
    await clientSign(created.token, "Omar Khalil", "1.1.1.1", SIGNATURE_PNG);
    let v = (await getContractByToken(created.token))!;
    const total = v.contract.totalFils;

    expect(await requestChange(v, { title: "Extra", reason: "", amountFils: 1, dueDate: "2026-11-01", checks: ["x"] })).toEqual({ error: "note" });
    expect(await requestChange(v, { title: "Neo launch campaign", reason: "The store opens earlier than planned", amountFils: 300_000, dueDate: "2026-11-15", checks: ["Launch creatives", "Launch ads setup"] })).toEqual({ ok: true });
    v = (await getContractByToken(created.token))!;
    expect(v.contract.totalFils).toBe(total); // nothing changes while it waits
    const pending = v.changes[0];
    expect(pending.status).toBe("pending");

    expect(await decideChange(v, pending.id, true, "")).toEqual({ error: "signer" });
    expect(await decideChange(v, pending.id, true, "Omar Khalil")).toEqual({ ok: true });
    v = (await getContractByToken(created.token))!;
    expect(v.contract.totalFils).toBe(total + 300_000);
    expect(v.milestones.at(-1)).toMatchObject({ title: "Neo launch campaign", amountFils: 300_000 });
    expect(v.milestones.at(-1)!.checks.map((c) => c.text)).toEqual(["Launch creatives", "Launch ads setup"]);

    await requestChange(v, { title: "More reels", reason: "Asked again", amountFils: 100_000, dueDate: "2026-12-01", checks: ["4 reels"] });
    v = (await getContractByToken(created.token))!;
    const second = v.changes.find((c) => c.status === "pending")!;
    expect(await decideChange(v, second.id, false, "")).toEqual({ ok: true }); // declining needs no signature
    await requestChange(v, { title: "Another", reason: "Something else", amountFils: 50_000, dueDate: "2026-12-01", checks: ["x"] });
    v = (await getContractByToken(created.token))!;
    expect(await withdrawChange(v, v.changes.find((c) => c.status === "pending")!.id)).toEqual({ ok: true });
    v = (await getContractByToken(created.token))!;
    expect(v.contract.totalFils).toBe(total + 300_000);
    expect(v.changes.map((c) => c.status).sort()).toEqual(["accepted", "declined", "withdrawn"]);
  });
});

describe("no chasing the agency", () => {
  it("flags an overdue update against the agreed rhythm", async () => {
    const signed = new Date("2026-10-01T00:00:00Z");
    const c = { reportingCadence: "weekly", status: "active" as const, clientSignedAt: signed };
    expect(reportingState(c, null, new Date("2026-10-05T00:00:00Z")).overdue).toBe(false);
    expect(reportingState(c, null, new Date("2026-10-11T00:00:00Z")).overdue).toBe(true);
    expect(reportingState(c, new Date("2026-10-09T00:00:00Z"), new Date("2026-10-11T00:00:00Z")).overdue).toBe(false);
    expect(reportingState({ ...c, reportingCadence: null }, null, new Date("2027-01-01")).overdue).toBe(false);
  });

  it("updates reset the clock", async () => {
    const created = await createContract(agencyId, draft());
    if ("error" in created) throw new Error(created.error);
    await clientSign(created.token, "Omar Khalil", "1.1.1.1", SIGNATURE_PNG);
    let v = (await getContractByToken(created.token))!;
    expect(await postUpdate(v, "short")).toEqual({ error: "note" });
    expect(await postUpdate(v, "Week 1: brand guidelines drafted, Meta pixel installed, 14 leads at 7.2 JOD each.")).toEqual({ ok: true });
    v = (await getContractByToken(created.token))!;
    expect(v.reporting.lastUpdateAt).not.toBeNull();
    expect(v.reporting.overdue).toBe(false);
  });
});

describe("finding one team for everything", () => {
  it("full service means content, paid media and branding", () => {
    expect(isFullService(["smm_content", "ads_meta", "brand_identity"])).toBe(true);
    expect(isFullService(["smm_content", "ads_meta"])).toBe(false);
  });

  it("explore takes several platforms, a budget range and the full-service switch", async () => {
    const p = parseExploreParams({ platforms: "linkedin,nope,instagram", min: "600", max: "300", full: "1" });
    expect(p.platforms).toEqual(["linkedin", "instagram"]);
    expect([p.minPrice, p.maxPrice]).toEqual([300, 600]); // swapped into order
    expect(p.fullService).toBe(true);
    expect(parseExploreParams({ platform: "tiktok" }).platforms).toEqual(["tiktok"]); // old links still work

    const handles = async (f: Parameters<typeof listAgencies>[0]) => (await listAgencies(f)).map((a) => a.handle).sort();
    expect(await handles({ platforms: ["linkedin", "tiktok"] })).toEqual(["growth.co", "posts.only"]);
    expect(await handles({ platforms: ["linkedin"] })).toEqual(["growth.co"]);
    expect(await handles({ maxPrice: 200 })).toEqual(["posts.only"]);
    expect(await handles({ fullService: true })).toEqual(["growth.co"]);
  });

  it("matching prefers full-service agencies when the client asks for A to Z", () => {
    const base: AgencyFeatures = {
      id: "x", services: ["smm_content"], platforms: [], industries: [], city: "amman", startingPriceJod: null, cheapestPackageJod: null,
      isVerified: false, ratingSum: 0, ratingCount: 0, googleRating: null, googleRatingCount: null, servicePosts: 0, plan: "free", planActive: false,
    };
    const full = { ...base, id: "full", services: ["smm_content", "ads_meta", "brand_identity"] };
    const need = { services: ["smm_content"], fullService: true };
    const a = scoreAgency(need, base)!;
    const b = scoreAgency(need, full)!;
    expect(b.relevance).toBeGreaterThan(a.relevance);
    expect(b.reasons.some((r) => r.code === "full_service")).toBe(true);
    expect(scoreAgency({ services: ["smm_content"] }, full)!.reasons.some((r) => r.code === "full_service")).toBe(false);
  });
});
