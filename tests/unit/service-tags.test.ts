import "./setup-db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAgency } from "@/lib/data/agencies";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { agencies, serviceTags } from "@/lib/db/schema";
import { BUILTIN_TAGS, exactTag, isKnownService, searchTags, tagLabel, withParents } from "@/lib/services/catalog";
import { listPendingTags, resolveServices, reviewTag, syncServiceCatalog } from "@/lib/services/tags";
import { allServices } from "@/lib/taxonomy";
import { eq } from "drizzle-orm";

describe("service catalog", () => {
  it("covers every core service and many more, with unique keys and valid parents", () => {
    const keys = BUILTIN_TAGS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBeGreaterThanOrEqual(120);
    for (const s of allServices) expect(keys).toContain(s.key);
    for (const t of BUILTIN_TAGS) expect(allServices.some((s) => s.key === t.parent)).toBe(true);
  });

  it("finds services from part of a name, in Arabic or English, ignoring letter variants", () => {
    expect(searchTags("photo").map((t) => t.key)).toContain("photography");
    expect(searchTags("تصوير").length).toBeGreaterThan(2);
    expect(searchTags("اعلانات").some((t) => t.key.startsWith("ads_"))).toBe(true);
    expect(searchTags("xyzzy")).toEqual([]);
    expect(exactTag("SEO")?.key).toBe("seo");
  });

  it("adds the core parent so hire pages and matching still find the agency", () => {
    const detailed = BUILTIN_TAGS.find((t) => t.parent && t.parent !== t.key)!;
    expect(withParents([detailed.key])).toEqual([detailed.key, detailed.parent]);
    expect(withParents(["not_a_service"])).toEqual([]);
  });
});

describe("typed services and admin review", () => {
  let agencyId = "";
  beforeAll(async () => {
    await syncServiceCatalog();
    const u = await createUser("tags@t.jo", "password-123");
    agencyId = (await createAgency(u.id, { handle: "tags.test", name: "Tags", city: "amman" })).id;
  });
  afterAll(() => closeDb());

  it("gives every built-in service a number", async () => {
    const db = await getDb();
    const rows = await db.select({ id: serviceTags.id }).from(serviceTags).where(eq(serviceTags.builtin, true));
    expect(rows.length).toBe(BUILTIN_TAGS.length);
    expect(await syncServiceCatalog()).toEqual({ added: 0, updated: 0 });
  });

  it("turns a known name into its tag and an unknown one into a pending proposal", async () => {
    const r = await resolveServices(agencyId, ["seo"], ["Photography", "Hologram stage shows"]);
    expect(r.services).toEqual(expect.arrayContaining(["seo", "photography"]));
    expect(r.pending).toHaveLength(1);
    // The same text from someone else joins the same proposal.
    expect((await resolveServices(null, [], ["hologram  stage shows"])).pending).toEqual(r.pending);
    const db = await getDb();
    await db.update(agencies).set({ services: r.services, pendingServices: r.pending }).where(eq(agencies.id, agencyId));
    const pending = await listPendingTags();
    expect(pending.map((p) => p.proposedText)).toContain("Hologram stage shows");
    expect(pending.find((p) => p.proposedText === "Hologram stage shows")!.agencies.map((a) => a.id)).toEqual([agencyId]);
  });

  it("approving makes it a tag on the agency's page; merging and rejecting clean up", async () => {
    const [p] = (await listPendingTags()).filter((x) => x.proposedText === "Hologram stage shows");
    const res = await reviewTag(p.id, { action: "approve", nameAr: "عروض الهولوغرام", nameEn: "Hologram shows", group: "offline", parent: "activations", roles: [], aliases: [] }, (await createUser("admin-tags@t.jo", "password-123", "admin")).id);
    expect(res).toMatchObject({ ok: true, agencies: 1, key: "hologram_shows" });
    expect(isKnownService("hologram_shows")).toBe(true);
    expect(tagLabel("hologram_shows", "ar")).toBe("عروض الهولوغرام");
    const db = await getDb();
    const [a] = await db.select().from(agencies).where(eq(agencies.id, agencyId));
    expect(a.services).toEqual(expect.arrayContaining(["hologram_shows", "activations"]));
    expect(a.pendingServices).toEqual([]);

    const typo = await resolveServices(agencyId, [], ["Fotografy"]);
    await db.update(agencies).set({ pendingServices: typo.pending }).where(eq(agencies.id, agencyId));
    const merged = await reviewTag(typo.pending[0], { action: "merge", into: "photography" }, a.ownerUserId);
    expect(merged).toMatchObject({ ok: true, agencies: 1 });
    // The typo now finds the tag it was merged into.
    const [photo] = await db.select().from(serviceTags).where(eq(serviceTags.key, "photography"));
    expect(photo.aliases).toContain("Fotografy");

    const junk = await resolveServices(agencyId, [], ["asdf qwer"]);
    await db.update(agencies).set({ pendingServices: junk.pending }).where(eq(agencies.id, agencyId));
    expect(await reviewTag(junk.pending[0], { action: "reject" }, a.ownerUserId)).toMatchObject({ ok: true, agencies: 1 });
    const [after] = await db.select().from(agencies).where(eq(agencies.id, agencyId));
    expect(after.pendingServices).toEqual([]);
  });
});
