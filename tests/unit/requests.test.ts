import "./setup-db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAgency } from "@/lib/data/agencies";
import { createPackage } from "@/lib/data/packages";
import { createProjectRequest, getRequestByToken, listOpportunities, submitProposal, setProposalStatus, getRequestForVisitor } from "@/lib/data/requests";
import { createUser } from "@/lib/data/users";
import { closeDb } from "@/lib/db";
import { findMatches, marketPrices } from "@/lib/matching";
import { setAgencyFlags } from "@/lib/data/admin";

let a: { id: string; services: string[] };
let b: { id: string; services: string[] };
let c: { id: string; services: string[] };

beforeAll(async () => {
  const mk = async (handle: string, services: string[], city: string, price: number, extra = {}) => {
    const u = await createUser(`${handle}@t.jo`, "password-123");
    const ag = await createAgency(u.id, { handle, name: handle, city, services, startingPriceJod: price }, extra);
    return { id: ag.id, services };
  };
  a = await mk("ads.amman", ["ads_meta", "smm_management"], "amman", 300, { isVerified: true });
  b = await mk("ads.irbid", ["ads_meta"], "irbid", 900);
  c = await mk("photo.only", ["photography"], "amman", 150);
  await createPackage(b.id, { title: "Lite", description: "", service: "ads_meta", priceJod: 250, billing: "monthly", deliverables: [] });
});
afterAll(() => closeDb());

describe("matching over the database", () => {
  it("ranks relevant agencies and skips those without the service", async () => {
    const matches = await findMatches({ services: ["ads_meta"], city: "amman", budgetMaxJod: 400 });
    expect(matches.map((m) => m.handle)).toEqual(["ads.amman", "ads.irbid"]);
    expect(matches[1].cheapestPackage?.priceJod).toBe(250); // package beats the 900 starting price
  });

  it("gives paid plans priority only while monetization is on", async () => {
    await setAgencyFlags(b.id, { plan: "business" });
    try {
      const free = await findMatches({ services: ["ads_meta"] });
      expect(free.some((m) => m.featured)).toBe(false);
      process.env.MONETIZATION_ENABLED = "true";
      const paid = await findMatches({ services: ["ads_meta"] });
      expect(paid.find((m) => m.id === b.id)?.featured).toBe(true);
    } finally {
      delete process.env.MONETIZATION_ENABLED;
      await setAgencyFlags(b.id, { plan: "free" });
    }
  });

  it("builds a budget range from starting prices and packages", async () => {
    const prices = await marketPrices("ads_meta");
    expect(prices.agencies).toBe(2);
    expect(prices.suggested).not.toBeNull();
  });
});

describe("project requests and proposals", () => {
  it("invites matches, lets agencies quote once, and closes on acceptance", async () => {
    const matches = await findMatches({ services: ["ads_meta"] });
    const { token, request } = await createProjectRequest(
      { clientName: "Lina", phone: "+962790000009", services: ["ads_meta"], platforms: [], description: "Meta ads for a new café", source: "ai", visitorId: "visitor-1" },
      matches.map((m) => ({ agencyId: m.id, score: m.score })),
    );

    const oppA = await listOpportunities(a);
    expect(oppA[0].invited).toBe(true);
    expect(await listOpportunities(c)).toHaveLength(0); // photography-only agency doesn't see it

    const p1 = await submitProposal(a, request.id, { priceJod: 350, billing: "monthly", timeline: "Start next week", message: "We run Meta ads for 20 cafés." });
    expect("proposal" in p1).toBe(true);
    expect(await submitProposal(a, request.id, { priceJod: 300, billing: "monthly", timeline: "x", message: "second try here" })).toEqual({ error: "exists" });
    const p2 = await submitProposal(b, request.id, { priceJod: 250, billing: "monthly", timeline: "Two weeks", message: "Lite package fits your budget." });

    const view = await getRequestByToken(token);
    expect(view?.proposals).toHaveLength(2);
    expect(view?.proposals[0].priceJod).toBe(250); // cheapest first
    expect(await getRequestForVisitor(request.id, "someone-else")).toBeNull();

    if (!("proposal" in p2) || !p2.proposal) throw new Error("expected a proposal");
    await setProposalStatus(request.id, p2.proposal.id, "accepted");
    const after = await getRequestByToken(token);
    expect(after?.request.status).toBe("closed");
    expect(after?.proposals.map((p) => p.status)).toEqual(["accepted", "declined"]);
    expect(await submitProposal(c, request.id, { priceJod: 1, billing: "one_off", timeline: "x", message: "late proposal here" })).toEqual({ error: "closed" });
  });
});
