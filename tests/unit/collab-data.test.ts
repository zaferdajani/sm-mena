import "./setup-db";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAgency } from "@/lib/data/agencies";
import { addWindow, availabilityStates, listWindows, reconfirmWindows } from "@/lib/data/collab-availability";
import { blockProvider } from "@/lib/data/collab-blocks";
import { discoverCollaborators } from "@/lib/data/collab-discovery";
import { acceptQuote, declineInquiry, inquiryForBuyer, inquiryForSupplier, listSupplying, sendInquiry, submitQuote, supplierProjection, withdrawInquiry } from "@/lib/data/collab-inquiries";
import { acceptInvite, createInvite, inviteByToken, revokeInvite } from "@/lib/data/collab-invites";
import { expireNeeds, listMyNeeds, listOpenNeedsFor, openNeedFor, publishNeed, replyToNeed, withdrawNeed } from "@/lib/data/collab-needs";
import { saveCollabProfile } from "@/lib/data/collab-profile";
import { listRoster, saveRosterEntry } from "@/lib/data/collab-roster";
import { listContractRequests } from "@/lib/data/contract-requests";
import { arePartners } from "@/lib/data/contracts";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { agencies, collabNeeds, partnerRequests, workInquiries, type Agency } from "@/lib/db/schema";

// Collaboration V2 data rules (docs/48): who may read what, the inquiry state
// machine, invitations without duplicates, and the handoff into the existing
// partner-contract request. In-memory PGlite; nothing here touches money.

let buyer: Agency; // an Amman agency
let rival: Agency; // another agency: must never see the buyer's private data
let photo: Agency; // a freelancer photographer in Amman
let editor: Agency; // a freelancer video editor in Irbid
let riyadh: Agency; // a Saudi photographer who does not serve Jordan

const mk = async (handle: string, over: Partial<Parameters<typeof createAgency>[1]> & { kind?: "agency" | "freelancer"; teamRoles?: string[] }, extra: Partial<Agency> = {}) => {
  const u = await createUser(`${handle}@collab2.jo`, "password-1234");
  return createAgency(u.id, { handle, name: handle, city: "amman", services: ["smm_management"], ...over }, extra);
};

beforeAll(async () => {
  buyer = await mk("v2.buyer", { kind: "agency", teamRoles: ["graphic_designer"], seeksRoles: ["photographer"] });
  rival = await mk("v2.rival", { kind: "agency" });
  photo = await mk("v2.photo", { kind: "freelancer", teamRoles: ["photographer"], services: ["photography"] });
  editor = await mk("v2.editor", { kind: "freelancer", city: "irbid", teamRoles: ["video_editor"], services: ["video_production"] });
  riyadh = await mk("v2.riyadh", { kind: "freelancer", city: "riyadh", teamRoles: ["photographer"], services: ["photography"] });
}, 60_000);
afterAll(() => closeDb());

const needInput = { title: "Product photographer for a café launch", roles: ["photographer"], services: ["photography"], scope: "Two shoot days in Amman.", workMode: "on_site" as const, city: "amman" as const, country: "jo", languages: ["ar" as const], startsOn: "2026-11-01", endsOn: "2026-11-10", budgetMin: "" as const, budgetMax: 400_000, modes: ["private" as const], audience: "public" as const, days: 30 };

describe("published needs", () => {
  it("are seen only by providers who cover the role, in the country, and vanish when withdrawn or expired", async () => {
    const need = await publishNeed(buyer, needInput);
    expect(need.status).toBe("published");
    expect((await listOpenNeedsFor(photo)).map((n) => n.id)).toContain(need.id);
    expect((await listOpenNeedsFor(editor)).map((n) => n.id)).not.toContain(need.id); // wrong role
    expect((await listOpenNeedsFor(riyadh)).map((n) => n.id)).not.toContain(need.id); // other country
    expect((await listOpenNeedsFor(buyer)).map((n) => n.id)).not.toContain(need.id); // own need

    expect(await replyToNeed(photo, need.id, "Happy to shoot both days.")).toEqual({ ok: true });
    expect(await replyToNeed(photo, need.id, "again")).toEqual({ error: "exists" });
    expect(await replyToNeed(editor, need.id, "me too")).toEqual({ error: "notFound" });
    const mine = await listMyNeeds(buyer.id);
    expect(mine[0].replies.map((r) => r.provider.handle)).toEqual(["v2.photo"]);
    expect(await listMyNeeds(rival.id)).toEqual([]);

    expect(await withdrawNeed(rival.id, need.id)).toBe(false);
    expect(await withdrawNeed(buyer.id, need.id)).toBe(true);
    expect(await openNeedFor(photo, need.id)).toBeNull();
    expect(await replyToNeed(photo, need.id, "late")).toEqual({ error: "notFound" });
  });

  it("expire on schedule and partner-only needs stay with partners", async () => {
    const old = await publishNeed(buyer, { ...needInput, title: "Old need", days: 1 });
    await (await getDb()).update(collabNeeds).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(collabNeeds.id, old.id));
    expect(await expireNeeds()).toBeGreaterThanOrEqual(1);
    expect((await listOpenNeedsFor(photo)).map((n) => n.id)).not.toContain(old.id);

    const closed = await publishNeed(buyer, { ...needInput, title: "Partners only", audience: "partners" });
    expect((await listOpenNeedsFor(photo)).map((n) => n.id)).not.toContain(closed.id);
    await (await getDb()).insert(partnerRequests).values({ fromAgencyId: buyer.id, toAgencyId: photo.id, roles: ["photographer"], status: "accepted" });
    expect((await listOpenNeedsFor(photo)).map((n) => n.id)).toContain(closed.id);
    await withdrawNeed(buyer.id, closed.id);
  });
});

describe("availability and discovery", () => {
  it("shows partner-only windows to partners, nothing to strangers, and never a busy note", async () => {
    await addWindow(photo.id, { from: "2026-11-01", to: "2026-11-15", timezone: "Asia/Amman", status: "available", capacityUnits: 6, capacityUnit: "days", visibility: "partners", note: "Cairo trip after the 15th" });
    const period = { start: new Date("2026-11-02T00:00:00Z"), end: new Date("2026-11-05T00:00:00Z") };
    expect((await availabilityStates([photo.id], period, { partnerIds: new Set([photo.id]) })).get(photo.id)).toBe("confirmed");
    expect((await availabilityStates([photo.id], period, { partnerIds: new Set() })).get(photo.id)).toBe("unknown");
    const [w] = await listWindows(photo.id);
    expect(w.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(await reconfirmWindows(photo.id)).toBe(1);
  });

  it("ranks with reasons, respects blocks and opt-outs, and keeps the Saudi photographer out of a Jordan search", async () => {
    const r1 = await discoverCollaborators(buyer, { roles: ["photographer"], from: "2026-11-02", to: "2026-11-04" });
    expect(r1.items.map((x) => x.card.handle)).toEqual(["v2.photo"]);
    expect(r1.items[0].group).toBe("ready");
    expect(r1.items[0].reasons).toEqual(expect.arrayContaining(["role", "same_city", "partner", "available"]));
    // Any role: both Jordanian freelancers, never the buyer itself or the Saudi one.
    const all = await discoverCollaborators(buyer, { roles: [] });
    expect(all.items.map((x) => x.card.handle).sort()).toEqual(["v2.editor", "v2.photo", "v2.rival"]);
    // The editor opts out of collaboration: gone. A block: gone both ways.
    await saveCollabProfile(editor.id, { modes: [], workModes: [], openToWork: false });
    expect((await discoverCollaborators(buyer, { roles: [] })).items.map((x) => x.card.handle)).not.toContain("v2.editor");
    await blockProvider(rival.id, buyer.id);
    expect((await discoverCollaborators(buyer, { roles: [] })).items.map((x) => x.card.handle)).not.toContain("v2.rival");
    expect((await discoverCollaborators(rival, { roles: [] })).items.map((x) => x.card.handle)).not.toContain("v2.buyer");
  });
});

describe("private roster", () => {
  it("is readable by its owner only and never tells the provider", async () => {
    await saveRosterEntry(buyer.id, { providerAgencyId: photo.id, groupName: "Shoots", tags: ["food"], notes: "Agreed 120/day last time; needs a driver.", rateFils: 120_000, rateUnit: "day", rateCurrency: "JOD" });
    const mine = await listRoster(buyer.id);
    expect(mine).toHaveLength(1);
    expect(mine[0].notes).toContain("120/day");
    expect(await listRoster(rival.id)).toEqual([]);
    expect(await listRoster(photo.id)).toEqual([]);
    expect(await saveRosterEntry(buyer.id, { providerAgencyId: buyer.id, groupName: "", tags: [], notes: "", rateFils: null, rateUnit: null, rateCurrency: null })).toBeNull();
  });
});

describe("invitations", () => {
  it("link an existing account as partners once, expire, and can be revoked", async () => {
    const { token, invite } = await createInvite(rival, { label: "Lina", roles: ["video_editor"] });
    expect((await inviteByToken(token))?.from.handle).toBe("v2.rival");
    expect(await inviteByToken("not-a-real-token-at-all-xx")).toBeNull();
    expect(await acceptInvite(rival, token)).toEqual({ error: "self" });
    const first = await acceptInvite(editor, token);
    expect(first).toEqual({ ok: true, fromId: rival.id, alreadyPartners: false });
    expect(await arePartners(rival.id, editor.id)).toBe(true);
    // Same person again: same answer, still exactly one partner row.
    expect(await acceptInvite(editor, token)).toEqual({ ok: true, fromId: rival.id, alreadyPartners: true });
    const rows = await (await getDb()).select().from(partnerRequests).where(and(eq(partnerRequests.fromAgencyId, rival.id), eq(partnerRequests.toAgencyId, editor.id)));
    expect(rows).toHaveLength(1);
    expect((await listRoster(rival.id)).map((r) => r.provider.handle)).toEqual(["v2.editor"]);
    // Somebody else with the used link: nothing.
    expect(await acceptInvite(photo, token)).toEqual({ error: "notFound" });
    expect(await revokeInvite(rival.id, invite.id)).toBe(false);

    const other = await createInvite(rival, { label: "", roles: [] });
    expect(await revokeInvite(buyer.id, other.invite.id)).toBe(false);
    expect(await revokeInvite(rival.id, other.invite.id)).toBe(true);
    expect((await inviteByToken(other.token))?.status).toBe("revoked");
  });
});

const inquiryInput = { title: "Café launch shoot", role: "photographer", deliverables: [{ key: "photo_session", quantity: 2, platform: null }], scope: "Two mornings, natural light.", assetsNote: "Brand guide shared on acceptance.", startsOn: "2026-11-03", dueOn: "2026-11-12", timezone: "Asia/Amman", workMode: "on_site" as const, city: "amman" as const, budget: 350_000, privacyMode: "private" as const, responseDays: 7, recipients: [] as string[], needId: "" as const, parentContractId: "" as const };

describe("work inquiries", () => {
  it("send only to checked recipients, show suppliers one projection, keep quotes private, and hand off to the partner-contract request", async () => {
    expect(await sendInquiry(buyer, { ...inquiryInput, recipients: [buyer.id] })).toEqual({ error: "recipients" });
    expect(await sendInquiry(buyer, { ...inquiryInput, recipients: [rival.id] })).toEqual({ error: "recipients" }); // blocked
    expect(await sendInquiry(buyer, { ...inquiryInput, recipients: [photo.id], parentContractId: "00000000-0000-4000-8000-000000000000" })).toEqual({ error: "parentContract" });
    const sent = await sendInquiry(buyer, { ...inquiryInput, recipients: [photo.id, riyadh.id] });
    if (!("ok" in sent)) throw new Error(sent.error);

    // The supplier sees the shared projection and only itself; a stranger sees nothing.
    const asPhoto = await inquiryForSupplier(photo.id, sent.id);
    expect(asPhoto?.buyer.handle).toBe("v2.buyer");
    expect(asPhoto?.inquiry).toEqual(supplierProjection((await inquiryForBuyer(buyer.id, sent.id))!));
    expect(Object.keys(asPhoto!.inquiry)).not.toContain("parentContractId");
    expect(await inquiryForSupplier(editor.id, sent.id)).toBeNull();
    expect(await inquiryForBuyer(rival.id, sent.id)).toBeNull();
    expect((await listSupplying(photo.id)).map((r) => r.inquiry.id)).toContain(sent.id);

    // Two quotes from the photographer: the second supersedes; Riyadh declines.
    expect(await submitQuote(photo, sent.id, { amount: 380_000, currency: "JOD", startsOn: "2026-11-03", dueOn: "2026-11-12", scopeNote: "Includes 60 edited photos.", exclusions: "Props" })).toEqual({ ok: true, version: 1 });
    expect(await submitQuote(photo, sent.id, { amount: 360_000, currency: "JOD", startsOn: "", dueOn: "", scopeNote: "Includes 50 edited photos.", exclusions: "Props" })).toEqual({ ok: true, version: 2 });
    expect(await declineInquiry(riyadh, sent.id)).toEqual({ ok: true });
    expect(await submitQuote(riyadh, sent.id, { amount: 1, currency: "SAR", startsOn: "", dueOn: "", scopeNote: "", exclusions: "" })).toEqual({ error: "closed" });
    expect(await submitQuote(editor, sent.id, { amount: 1, currency: "JOD", startsOn: "", dueOn: "", scopeNote: "", exclusions: "" })).toEqual({ error: "notFound" });

    const view = (await inquiryForBuyer(buyer.id, sent.id))!;
    expect(view.status).toBe("replied");
    expect(view.quotes.map((q) => [q.version, q.status])).toEqual([[2, "open"], [1, "superseded"]]);
    // Riyadh, as a supplier, cannot see the photographer's quote.
    expect((await inquiryForSupplier(riyadh.id, sent.id))!.myQuotes).toEqual([]);

    // Accept the open quote: converted, the loser passed, and (already partners) a contract request for the photographer to write the contract.
    const open = view.quotes.find((q) => q.status === "open")!;
    const accepted = await acceptQuote(buyer, sent.id, open.id);
    expect(accepted).toEqual({ ok: true, handoff: "contract_request" });
    const after = (await inquiryForBuyer(buyer.id, sent.id))!;
    expect(after.status).toBe("converted");
    expect(after.contractRequestId).toBeTruthy();
    expect(after.recipients.map((r) => [r.supplier.handle, r.status]).sort()).toEqual([["v2.photo", "accepted"], ["v2.riyadh", "declined"]]);
    const requests = await listContractRequests(photo.id);
    expect(requests.incoming[0]).toMatchObject({ title: "Café launch shoot", budgetFils: 360_000, fromAgencyId: buyer.id });
    // Idempotent: accepting again returns the same outcome; another quote can no longer win.
    expect(await acceptQuote(buyer, sent.id, open.id)).toEqual({ ok: true, handoff: "contract_request" });
    expect(await acceptQuote(buyer, sent.id, view.quotes[1].id)).toEqual({ error: "closed" });
    expect(await acceptQuote(rival, sent.id, open.id)).toEqual({ error: "notFound" });
  });

  it("route a non-partner acceptance to a partnership request first, and let the buyer withdraw", async () => {
    const sent = await sendInquiry(buyer, { ...inquiryInput, title: "Reels edit", role: "video_editor", recipients: [editor.id] });
    if (!("ok" in sent)) throw new Error(sent.error);
    expect(await submitQuote(editor, sent.id, { amount: 90_000, currency: "JOD", startsOn: "", dueOn: "", scopeNote: "", exclusions: "" })).toEqual({ ok: true, version: 1 });
    const q = (await inquiryForBuyer(buyer.id, sent.id))!.quotes[0];
    expect(await acceptQuote(buyer, sent.id, q.id)).toEqual({ ok: true, handoff: "partner_request" });
    const [pr] = await (await getDb()).select().from(partnerRequests).where(and(eq(partnerRequests.fromAgencyId, buyer.id), eq(partnerRequests.toAgencyId, editor.id)));
    expect(pr.status).toBe("pending");

    const second = await sendInquiry(buyer, { ...inquiryInput, title: "Another", recipients: [editor.id] });
    if (!("ok" in second)) throw new Error(second.error);
    expect(await withdrawInquiry(rival.id, second.id)).toBe(false);
    expect(await withdrawInquiry(buyer.id, second.id)).toBe(true);
    expect(await submitQuote(editor, second.id, { amount: 1, currency: "JOD", startsOn: "", dueOn: "", scopeNote: "", exclusions: "" })).toEqual({ error: "closed" });
    const [row] = await (await getDb()).select({ status: workInquiries.status }).from(workInquiries).where(eq(workInquiries.id, second.id));
    expect(row.status).toBe("withdrawn");
    expect((await (await getDb()).select({ id: agencies.id }).from(agencies)).length).toBeGreaterThan(0);
  });
});
