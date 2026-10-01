import "./setup-db";
import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createAgency } from "@/lib/data/agencies";
import { addProspect, importResearched, linkJoinedProspects, listProspects, removeProspect, researchedProspects, updateProspect } from "@/lib/data/prospects";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { prospectInput, prospectKey } from "@/lib/prospects";

afterAll(closeDb);

describe("launch prospects (docs/55)", () => {
  it("normalises names so one business is one row", () => {
    expect(prospectKey("The UPT House")).toBe(prospectKey("upt-house"));
    expect(prospectKey("Mrketly (ماركتلي)")).toBe(prospectKey("mrketly ماركتلي"));
    expect(prospectKey("Jeel Media")).not.toBe(prospectKey("Jeel Studio"));
  });

  it("accepts a bare domain and an @handle, refuses junk", () => {
    const ok = prospectInput.parse({ name: "UPT House", website: "upthouse.com", instagram: "@theupthouse" });
    expect(ok.website).toBe("https://upthouse.com");
    expect(ok.instagram).toBe("theupthouse");
    expect(prospectInput.safeParse({ name: "U" }).success).toBe(false);
    expect(prospectInput.safeParse({ name: "UPT", instagram: "has space" }).success).toBe(false);
  });

  it("imports the researched list once, keeps the owner's names and edits, and links a page that joined", async () => {
    const admin = await createUser(`admin-${Date.now()}@test.invalid`, "admin-pass-12345", "admin");
    const file = researchedProspects();
    expect(file.prospects.length).toBeGreaterThanOrEqual(25);
    expect(file.prospects.map((p) => p.name)).toEqual(expect.arrayContaining(["UPT House", "Muhannad"]));
    const first = await importResearched(admin.id);
    expect(first).toEqual({ added: file.prospects.length, skipped: 0 });
    const again = await importResearched(admin.id);
    expect(again).toEqual({ added: 0, skipped: file.prospects.length });

    // The owner's own spelling of an imported name does not duplicate it; a new name is added.
    const dup = await addProspect(prospectInput.parse({ name: "the upt house" }), admin.id);
    expect(dup.created).toBe(false);
    const mine = await addProspect(prospectInput.parse({ name: "Café Social Studio", website: "cafesocial.jo", services: ["social media"] }), admin.id);
    expect(mine.created).toBe(true);
    expect(mine.prospect.source).toBe("owner");

    expect(await updateProspect(mine.prospect.id, { status: "contacted", note: "Spoke to the studio; they asked for the demo link." }, admin.id)).toBe(true);
    const rows = await listProspects();
    const row = rows.find((r) => r.id === mine.prospect.id)!;
    expect(row.status).toBe("contacted");
    expect(row.contactedAt).toBeInstanceOf(Date);
    expect(rows.filter((r) => r.priority).map((r) => r.name)).toEqual(expect.arrayContaining(["UPT House", "Muhannad"]));
    expect(rows[0].priority).toBe(true);

    // A prospect whose website matches a real page that signed up is linked, not guessed.
    const owner = await createUser(`cafe-${Date.now()}@test.invalid`, "owner-pass-12345");
    const agency = await createAgency(owner.id, { handle: `cafesocial${Date.now().toString(36)}`, name: "Café Social Studio", city: "amman", bio: "Social media for cafés", services: ["social_media"], website: "https://www.cafesocial.jo" });
    await updateProspect(mine.prospect.id, { status: "new" }, admin.id);
    expect(await linkJoinedProspects()).toBe(1);
    const linked = (await listProspects()).find((r) => r.id === mine.prospect.id)!;
    expect(linked.status).toBe("joined");
    expect(linked.agencyHandle).toBe(agency.handle);

    expect(await removeProspect(mine.prospect.id, admin.id)).toBe(true);
    expect((await listProspects()).some((r) => r.id === mine.prospect.id)).toBe(false);
    const db = await getDb();
    const actions = (await db.select({ action: auditLogs.action }).from(auditLogs).where(eq(auditLogs.actorUserId, admin.id))).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(["prospect.imported", "prospect.added", "prospect.updated", "prospect.removed"]));
  }, 120_000);
});
