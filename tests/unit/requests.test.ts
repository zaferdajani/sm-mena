import "./setup-db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAgency } from "@/lib/data/agencies";
import { createPackage } from "@/lib/data/packages";
import { createProjectRequest, getRequestByToken, listOpportunities, newOpportunityCount, submitProposal, setProposalStatus, getRequestForVisitor } from "@/lib/data/requests";
import { listNotifications } from "@/lib/data/notifications";
import { getDb } from "@/lib/db";
import { notifications, projectRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { FOUNDING } from "@/lib/founding";
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
  // a and b are launch-ready founders (a founding seat, bio, service and
  // published work), so they see a new brief at once; c has the wrong service anyway.
  a = await mk("ads.amman", ["ads_meta", "smm_management"], "amman", 300, { isVerified: true, foundingSeat: 1, bio: "Meta ads for cafés and shops.", postCount: 1 });
  b = await mk("ads.irbid", ["ads_meta"], "irbid", 900, { foundingSeat: 2, bio: "Performance ads from Irbid.", postCount: 1 });
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

describe("founder head start on opportunities", () => {
  it("shows a relevant brief to an eligible founder now and to everyone else 24 hours later, with the same score", async () => {
    // Same service as a, but registration only: no bio, no work, no package.
    const u = await createUser("newcomer@t.jo", "password-123");
    const nf = await createAgency(u.id, { handle: "ads.newcomer", name: "Newcomer", city: "amman", services: ["ads_meta"], startingPriceJod: 200 }, { foundingSeat: 3 });
    const { request } = await createProjectRequest(
      { clientName: "Hala", phone: "+962790000010", services: ["ads_meta"], platforms: [], description: "Ads for a gym", source: "form", visitorId: "visitor-hs" },
      [
        { agencyId: a.id, score: 81 },
        { agencyId: nf.id, score: 81 },
      ],
    );
    const founderView = (await listOpportunities(a)).find((o) => o.request.id === request.id);
    expect(founderView?.score).toBe(81);
    expect((await listOpportunities(nf)).some((o) => o.request.id === request.id)).toBe(false);
    expect(await newOpportunityCount(nf)).toBe(0);
    // The newcomer is not alerted to a brief it cannot open; the alert is dated for when it can.
    expect((await listNotifications({ agencyId: nf.id })).some((n) => n.requestId === request.id)).toBe(false);
    const db = await getDb();
    const [scheduled] = await db.select().from(notifications).where(eq(notifications.agencyId, nf.id));
    expect(scheduled.requestId).toBe(request.id);
    expect(scheduled.createdAt.getTime() - request.createdAt.getTime()).toBe(FOUNDING.opportunityHeadStartHours * 3_600_000);

    // 25 hours later: same brief, same score, nothing about ranking changed.
    const earlier = new Date(Date.now() - 25 * 3_600_000);
    await db.update(projectRequests).set({ createdAt: earlier }).where(eq(projectRequests.id, request.id));
    await db.update(notifications).set({ createdAt: new Date(earlier.getTime() + FOUNDING.opportunityHeadStartHours * 3_600_000) }).where(eq(notifications.id, scheduled.id));
    const later = (await listOpportunities(nf)).find((o) => o.request.id === request.id);
    expect(later?.score).toBe(81);
    expect(later?.invited).toBe(founderView?.invited);
    expect(await newOpportunityCount(nf)).toBe(1);
    expect((await listNotifications({ agencyId: nf.id })).some((n) => n.requestId === request.id)).toBe(true);
  });

  it("ends with FOUNDER_HEAD_START_UNTIL: after that date newcomers see briefs at once", async () => {
    process.env.FOUNDER_HEAD_START_UNTIL = "2026-01-01T00:00:00Z";
    try {
      const u = await createUser("late@t.jo", "password-123");
      const nf = await createAgency(u.id, { handle: "ads.late", name: "Late", city: "amman", services: ["ads_meta"], startingPriceJod: 200 }, { foundingSeat: 4 });
      const { request } = await createProjectRequest(
        { clientName: "Sami", phone: "+962790000011", services: ["ads_meta"], platforms: [], description: "Ads after launch", source: "form", visitorId: "visitor-late" },
        [{ agencyId: nf.id, score: 70 }],
      );
      expect((await listOpportunities(nf)).some((o) => o.request.id === request.id)).toBe(true);
      expect((await listNotifications({ agencyId: nf.id })).some((n) => n.requestId === request.id)).toBe(true);
    } finally {
      delete process.env.FOUNDER_HEAD_START_UNTIL;
    }
  });
});
