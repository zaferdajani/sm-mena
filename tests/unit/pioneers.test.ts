import "./setup-db";
import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createAgency } from "@/lib/data/agencies";
import { claimPioneer, createInvitation, extendInvitation, invitationByCode, listInvitations, markWatched, recordScan } from "@/lib/data/pioneers";
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
  const agency = await createAgency(user.id, { handle: name, name, city: "amman", bio: "First Wave test", services: ["social_media"] });
  return { user, agency };
};

describe("First Wave seal (docs/57)", () => {
  it("codes have no look-alike characters and numbers print padded in both scripts", () => {
    for (let i = 0; i < 50; i++) expect(isPioneerCode(newPioneerCode())).toBe(true);
    expect(isPioneerCode("abc0o1li")).toBe(false);
    expect(sealNumber(12, "en")).toBe("012");
    expect(sealNumber(12, "ar")).toBe("٠١٢");
    expect(invitationState({ claimedAgencyId: null, expiresAt: new Date(Date.now() - 1000) })).toBe("expired");
  });

  it("numbers letters in order up to the cap, one per prospect, and counts scans and the watched video without visitor data", async () => {
    const admin = await createUser(`admin-${Date.now()}@test.invalid`, "admin-pass-12345", "admin");
    const p = await addProspect(prospectInput.parse({ name: `Wave Agency ${Date.now()}` }), admin.id);
    const first = await createInvitation({ name: p.prospect.name, prospectId: p.prospect.id }, admin.id);
    expect("invitation" in first).toBe(true);
    if (!("invitation" in first)) throw new Error("no invitation");
    expect(first.invitation.number).toBeGreaterThanOrEqual(1);
    expect(await createInvitation({ name: p.prospect.name, prospectId: p.prospect.id }, admin.id)).toEqual({ error: "exists" });
    const second = await createInvitation({ name: "Second Name" }, admin.id);
    if (!("invitation" in second)) throw new Error("no invitation");
    expect(second.invitation.number).toBe(first.invitation.number + 1);
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

  it("moves the seal from the letter to one page once; expired, taken, demo and second seals are refused; the prospect is marked joined", async () => {
    const admin = await createUser(`admin2-${Date.now()}@test.invalid`, "admin-pass-12345", "admin");
    const p = await addProspect(prospectInput.parse({ name: `Claim Agency ${Date.now()}` }), admin.id);
    const made = await createInvitation({ name: p.prospect.name, prospectId: p.prospect.id }, admin.id);
    if (!("invitation" in made)) throw new Error("no invitation");
    const { code, number } = made.invitation;
    const a = await account("wave");
    const b = await account("late");
    expect(await claimPioneer(a.agency.id, "zzzzzzzz", a.user.id)).toEqual({ ok: false, reason: "invalid" });
    expect(await claimPioneer(a.agency.id, code, a.user.id)).toEqual({ ok: true, number });
    expect(await claimPioneer(a.agency.id, code, a.user.id)).toEqual({ ok: false, reason: "already" });
    expect(await claimPioneer(b.agency.id, code, b.user.id)).toEqual({ ok: false, reason: "claimed" });
    const db = await getDb();
    expect((await db.select({ n: agencies.pioneerNumber }).from(agencies).where(eq(agencies.id, a.agency.id)))[0].n).toBe(number);
    const row = (await listProspects()).find((r) => r.id === p.prospect.id)!;
    expect(row.status).toBe("joined");
    expect(row.agencyHandle).toBe(a.agency.handle);
    const listed = (await listInvitations()).find((i) => i.code === code)!;
    expect(listed.state).toBe("claimed");
    expect(listed.claimedHandle).toBe(a.agency.handle);
    expect(await extendInvitation(listed.id, admin.id)).toBe(false);

    // A page holds one seal: a second letter cannot be claimed onto the same page.
    const other = await createInvitation({ name: "Another Letter" }, admin.id);
    if (!("invitation" in other)) throw new Error("no invitation");
    expect(await claimPioneer(a.agency.id, other.invitation.code, a.user.id)).toEqual({ ok: false, reason: "already" });

    // Expired letters refuse, and an extension reopens them.
    await db.update(pioneerInvitations).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(pioneerInvitations.id, other.invitation.id));
    expect(await claimPioneer(b.agency.id, other.invitation.code, b.user.id)).toEqual({ ok: false, reason: "expired" });
    expect(await extendInvitation(other.invitation.id, admin.id)).toBe(true);
    expect(await claimPioneer(b.agency.id, other.invitation.code, b.user.id)).toEqual({ ok: true, number: other.invitation.number });

    // Demo pages never carry a seal.
    const demo = await account("demo");
    await db.update(agencies).set({ isDemo: true }).where(eq(agencies.id, demo.agency.id));
    const third = await createInvitation({ name: "Third Letter" }, admin.id);
    if (!("invitation" in third)) throw new Error("no invitation");
    expect(await claimPioneer(demo.agency.id, third.invitation.code, demo.user.id)).toEqual({ ok: false, reason: "invalid" });
    expect(PIONEER.cap).toBe(50);
  }, 120_000);
});
