import "./setup-db";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SIGNATURE_PNG } from "./png";
import { createAgency } from "@/lib/data/agencies";
import { approveMilestone, clientSign, createContract, getContractByToken, setCheck, submitMilestone, type ContractInput } from "@/lib/data/contracts";
import { answerShare, partnerWork, proposeShare, sharesForPartner } from "@/lib/data/milestone-shares";
import { applyProviderEvent } from "@/lib/data/payments";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { escrowLedger, milestoneShares, partnerRequests } from "@/lib/db/schema";

// An agency without a photographer brings one in on a milestone (docs/40).
let agency: { id: string; name: string };
let photographer: { id: string; name: string };
let stranger: { id: string; name: string };

beforeAll(async () => {
  const mk = async (handle: string, kind: "agency" | "freelancer") => {
    const u = await createUser(`${handle}@collab.jo`, "password-1234");
    const a = await createAgency(u.id, { handle, name: handle, city: "amman", services: ["smm_management"], kind });
    return { id: a.id, name: a.name };
  };
  agency = await mk("collab.agency", "agency");
  photographer = await mk("collab.photo", "freelancer");
  stranger = await mk("collab.stranger", "freelancer");
  await (await getDb()).insert(partnerRequests).values({ fromAgencyId: agency.id, toAgencyId: photographer.id, roles: ["photographer"], status: "accepted" });
});
afterAll(() => closeDb());

const draft: ContractInput = {
  title: "Launch campaign for Café Nour",
  summary: "Content and a product shoot.",
  items: [],
  specialRequests: [],
  startDate: "2026-10-01",
  endDate: "2026-11-30",
  paymentMode: "protected",
  nda: false,
  ndaExtra: "",
  client: { name: "Nour", phone: "+962790000009", email: "nour@collab.jo" },
  milestones: [
    { title: "Strategy and captions", dueDate: "2026-10-31", amountFils: 250_000, checks: ["Content plan"] },
    { title: "Product photography", dueDate: "2026-11-15", amountFils: 250_000, checks: ["30 edited photos"] },
  ],
  signerName: "Sara Haddad",
  signature: SIGNATURE_PNG,
  locale: "en",
};

describe("partners on client milestones", () => {
  it("pays the photographer's share straight from the held money when the client confirms, without waiting for the agency", async () => {
    const created = await createContract(agency.id, draft);
    if (!("token" in created)) throw new Error(created.error);
    const { token } = created;
    expect(await clientSign(token, "Nour", "1.2.3.4", SIGNATURE_PNG)).toEqual({ ok: true });
    let v = (await getContractByToken(token))!;
    const [strategy, photos] = v.milestones;

    // Only accepted partners, and never more than the milestone.
    expect(await proposeShare(agency, v.contract.id, photos.id, stranger.id, { kind: "percent", percent: 30, note: "" })).toEqual({ error: "notPartners" });
    expect(await proposeShare(agency, v.contract.id, photos.id, photographer.id, { kind: "fixed", amount: 300, note: "" })).toEqual({ error: "tooMuch" });
    const offer = await proposeShare(agency, v.contract.id, photos.id, photographer.id, { kind: "percent", percent: 30, note: "30 edited photos" });
    if (!("share" in offer)) throw new Error(offer.error);
    expect(offer.share.amountFils).toBe(75_000);
    expect(await proposeShare(agency, v.contract.id, photos.id, photographer.id, { kind: "percent", percent: 10, note: "" })).toEqual({ error: "exists" });

    expect((await sharesForPartner(photographer.id)).map((r) => r.share.status)).toEqual(["proposed"]);
    expect(await answerShare(photographer, offer.share.id, true)).toEqual({});
    // Accepted shares are frozen in the database.
    await expect((await getDb()).update(milestoneShares).set({ amountFils: 1 }).where(eq(milestoneShares.id, offer.share.id))).rejects.toThrow();

    // The client funds both milestones.
    for (const [i, m] of [strategy, photos].entries()) {
      expect(await applyProviderEvent("mock", { id: `evt_collab_${i}`, type: "payment.succeeded", paymentRef: `ms_${m.id}`, providerRef: `mock_c${i}`, amountFils: 250_000 })).toBe("ok");
    }

    // The agency is slow on its own milestone; the photographer delivers theirs.
    const work = (await partnerWork(photographer.id, offer.share.id))!;
    expect(work.milestone.status).toBe("funded");
    for (const c of work.checks) await setCheck(work.contract.id, work.milestone.id, c.id, "agency", true);
    v = (await getContractByToken(token))!;
    expect(v.partners[photos.id]?.name).toBe(photographer.name);
    expect(await submitMilestone(v, photos.id, "Gallery link")).toEqual({ ok: true });
    v = (await getContractByToken(token))!;
    for (const c of v.milestones[1].checks) await setCheck(v.contract.id, photos.id, c.id, "client", true);
    v = (await getContractByToken(token))!;
    expect(await approveMilestone(v, photos.id)).toEqual({ ok: true });

    // 250,000 held → photographer 75,000 (less 10%), agency 175,000 (less 10%).
    const rows = await (await getDb()).select().from(escrowLedger).where(and(eq(escrowLedger.milestoneId, photos.id)));
    const byKey = Object.fromEntries(rows.map((r) => [r.idemKey!.split(":")[0], r]));
    expect(byKey.prel).toMatchObject({ type: "release", amountFils: 67_500, payeeAgencyId: photographer.id });
    expect(byKey.pfee).toMatchObject({ type: "fee", amountFils: 7_500, payeeAgencyId: photographer.id });
    expect(byKey.rel).toMatchObject({ type: "release", amountFils: 157_500, payeeAgencyId: null });
    expect(byKey.fee).toMatchObject({ type: "fee", amountFils: 17_500 });
    v = (await getContractByToken(token))!;
    expect(v.heldBy[photos.id]).toBe(0);
    // The agency's own milestone is still waiting, and still fully held.
    expect(v.milestones[0].status).toBe("funded");
    expect(v.heldBy[strategy.id]).toBe(250_000);
    expect((await partnerWork(photographer.id, offer.share.id))!.paid.find((p) => p.type === "release")?.amountFils).toBe(67_500);
  });
});
