import "./setup-db";
import { afterAll, describe, expect, it } from "vitest";
import { eq, isNotNull, sql } from "drizzle-orm";
import { createAgency } from "@/lib/data/agencies";
import { claimPioneer, createInvitation, extendInvitation, invitationByCode, listInvitations, markWatched, medalsLeft, recordScan } from "@/lib/data/pioneers";
import { addProspect, listProspects } from "@/lib/data/prospects";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { agencies, pioneerInvitations } from "@/lib/db/schema";
import { PIONEER, invitationState, isPioneerCode, newPioneerCode, sealNumber } from "@/lib/pioneers";
import { prospectInput } from "@/lib/prospects";

afterAll(closeDb);

const account = async (prefix: string) => {
  const name = `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const user = await createUser(`${name}@test.invalid`, "password-12345");
  const agency = await createAgency(user.id, { handle: name, name, city: "amman", bio: "Founding Member test", services: ["social_media"] });
  return { user, agency };
};
const letter = async (by: string, name = `Letter ${Date.now()} ${Math.random()}`) => {
  const made = await createInvitation({ name }, by);
  if (!("invitation" in made)) throw new Error(JSON.stringify(made));
  return made.invitation;
};

describe("Founding Member medal (docs/57)", () => {
  it("codes have no look-alike characters, numbers print padded in both scripts, states follow the rules", () => {
    for (let i = 0; i < 50; i++) expect(isPioneerCode(newPioneerCode())).toBe(true);
    expect(isPioneerCode("abc0o1li")).toBe(false);
    expect(sealNumber(12, "en")).toBe("012");
    expect(sealNumber(12, "ar")).toBe("٠١٢");
    const later = new Date(Date.now() + 1000);
    expect(invitationState({ claimedAgencyId: null, number: null, expiresAt: new Date(Date.now() - 1000) }, 5)).toBe("expired");
    expect(invitationState({ claimedAgencyId: null, number: null, expiresAt: later }, 5)).toBe("open");
    expect(invitationState({ claimedAgencyId: null, number: null, expiresAt: later }, 0)).toBe("full");
    expect(invitationState({ claimedAgencyId: "a", number: 7, expiresAt: later }, 0)).toBe("claimed");
    expect(invitationState({ claimedAgencyId: "a", number: null, expiresAt: later }, 0)).toBe("late");
  });

  it("letters carry no number; one per prospect; scans and the watched video are counted without visitor data", async () => {
    const admin = await createUser(`admin-${Date.now()}@test.invalid`, "admin-pass-12345", "admin");
    const p = await addProspect(prospectInput.parse({ name: `Wave Agency ${Date.now()}` }), admin.id);
    const first = await createInvitation({ name: p.prospect.name, prospectId: p.prospect.id }, admin.id);
    if (!("invitation" in first)) throw new Error("no invitation");
    expect(first.invitation.number).toBeNull();
    expect(await createInvitation({ name: p.prospect.name, prospectId: p.prospect.id }, admin.id)).toEqual({ error: "exists" });
    expect(await createInvitation({ name: "x" }, admin.id)).toEqual({ error: "name" });
    await recordScan(first.invitation.code);
    await recordScan(first.invitation.code);
    expect(await markWatched(first.invitation.code)).toBe(true);
    expect(await markWatched(first.invitation.code)).toBe(false);
    const v = (await invitationByCode(first.invitation.code.toUpperCase()))!;
    expect(v.scans).toBe(2);
    expect(v.watchedAt).toBeInstanceOf(Date);
    expect(v.state).toBe("open");
    expect(await invitationByCode("nope")).toBeNull();
  });

  it("numbers medals in claim order, needs the video, gives one per page, refuses replays, expired letters and demo pages, and links the prospect", async () => {
    const admin = await createUser(`admin2-${Date.now()}@test.invalid`, "admin-pass-12345", "admin");
    const p = await addProspect(prospectInput.parse({ name: `Claim Agency ${Date.now()}` }), admin.id);
    const made = await createInvitation({ name: p.prospect.name, prospectId: p.prospect.id }, admin.id);
    if (!("invitation" in made)) throw new Error("no invitation");
    const second = await letter(admin.id);
    const a = await account("wave");
    const b = await account("next");
    const db = await getDb();
    const [{ max }] = (await db.select({ max: sql<number | null>`max(${pioneerInvitations.number})` }).from(pioneerInvitations)) as { max: number | null }[];

    expect(await claimPioneer(a.agency.id, "zzzzzzzz", a.user.id)).toEqual({ ok: false, reason: "invalid" });
    // The video comes first (the letter's page records it).
    expect(await claimPioneer(a.agency.id, made.invitation.code, a.user.id, { requireWatched: true })).toEqual({ ok: false, reason: "notWatched" });
    await markWatched(made.invitation.code);
    await markWatched(second.code);
    // The second letter is claimed first: it gets the lower number.
    expect(await claimPioneer(b.agency.id, second.code, b.user.id, { requireWatched: true })).toEqual({ ok: true, number: (max ?? 0) + 1 });
    expect(await claimPioneer(a.agency.id, made.invitation.code, a.user.id, { requireWatched: true })).toEqual({ ok: true, number: (max ?? 0) + 2 });
    expect(await claimPioneer(a.agency.id, made.invitation.code, a.user.id)).toEqual({ ok: false, reason: "already" });
    expect(await claimPioneer(b.agency.id, made.invitation.code, b.user.id)).toEqual({ ok: false, reason: "claimed" });
    expect((await db.select({ n: agencies.pioneerNumber }).from(agencies).where(eq(agencies.id, a.agency.id)))[0].n).toBe((max ?? 0) + 2);
    const row = (await listProspects()).find((r) => r.id === p.prospect.id)!;
    expect(row.status).toBe("joined");
    expect(row.agencyHandle).toBe(a.agency.handle);
    const listed = (await listInvitations()).find((i) => i.code === made.invitation.code)!;
    expect(listed.state).toBe("claimed");
    expect(listed.claimedHandle).toBe(a.agency.handle);
    expect(await extendInvitation(listed.id, admin.id)).toBe(false);

    // A page holds one medal.
    const other = await letter(admin.id);
    expect(await claimPioneer(a.agency.id, other.code, a.user.id, { requireWatched: false })).toEqual({ ok: false, reason: "already" });

    // Expired letters refuse; an extension reopens them.
    const c = await account("late");
    await db.update(pioneerInvitations).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(pioneerInvitations.id, other.id));
    expect(await claimPioneer(c.agency.id, other.code, c.user.id, { requireWatched: false })).toEqual({ ok: false, reason: "expired" });
    expect(await extendInvitation(other.id, admin.id)).toBe(true);

    // Demo pages never carry a medal.
    const demo = await account("demo");
    await db.update(agencies).set({ isDemo: true }).where(eq(agencies.id, demo.agency.id));
    const third = await letter(admin.id);
    expect(await claimPioneer(demo.agency.id, third.code, demo.user.id, { requireWatched: false })).toEqual({ ok: false, reason: "invalid" });

    // Fill the remaining medals; the next invitee still joins, recorded as late, without a medal.
    const given = (await db.select({ n: pioneerInvitations.number }).from(pioneerInvitations).where(isNotNull(pioneerInvitations.number))).length;
    const top = (await db.select({ max: sql<number>`max(${pioneerInvitations.number})` }).from(pioneerInvitations))[0].max;
    for (let n = 1; n <= PIONEER.cap - given; n++) {
      await db.insert(pioneerInvitations).values({ code: newPioneerCode(), name: `Filler ${n}`, number: top + n, expiresAt: new Date(Date.now() + 86_400_000), claimedAt: new Date() });
    }
    expect(await medalsLeft()).toBe(0);
    expect((await invitationByCode(other.code))!.state).toBe("full");
    expect(await claimPioneer(c.agency.id, other.code, c.user.id, { requireWatched: false })).toEqual({ ok: false, reason: "full" });
    const late = (await invitationByCode(other.code))!;
    expect(late.state).toBe("late");
    expect(late.number).toBeNull();
    expect((await db.select({ n: agencies.pioneerNumber }).from(agencies).where(eq(agencies.id, c.agency.id)))[0].n).toBeNull();
  }, 120_000);
});
