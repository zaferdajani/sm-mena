import "./setup-db";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAgency, getAgencyByOwner, updateAgency } from "@/lib/data/agencies";
import {
  addClientOnce,
  addSetupMedia,
  getSetup,
  missingForPublish,
  openSetup,
  orderSetupMedia,
  patchProfile,
  publishSetup,
  purgeSetupMedia,
  readSetupMedia,
  restartSetup,
  writeSetup,
} from "@/lib/data/portfolio-setup";
import { listClients, saveClient } from "@/lib/data/portfolio-clients";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { agencies, auditLogs, portfolioSetupMedia, posts, socialGrants, socialImportItems, socialResources } from "@/lib/db/schema";
import { isPrivateKey } from "@/lib/storage";

// First-run portfolio setup (docs/53): private resumable drafts, only changed
// profile fields, owned clients only, one publish per draft.

let a: { id: string; user: string };
let b: { id: string; user: string };
let png: Buffer;

beforeAll(async () => {
  const ua = await createUser("setup-a@t.jo", "password-1234");
  const ub = await createUser("setup-b@t.jo", "password-1234");
  a = { id: (await createAgency(ua.id, { handle: "setup.a", name: "Studio A", city: "amman", services: ["photography"], whatsapp: "+962790000001" })).id, user: ua.id };
  b = { id: (await createAgency(ub.id, { handle: "setup.b", name: "Studio B", city: "amman", services: ["photography"] })).id, user: ub.id };
  await updateAgency(a.id, { email: "contact@a.jo", languages: ["ar", "en"], translation: { name: "Studio A (en)" } });
  png = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 200, g: 120, b: 40 } } }).png().toBuffer();
});
afterAll(() => closeDb());

describe("drafts", () => {
  it("opens once, saves on the version read, and refuses a stale write", async () => {
    const first = await openSetup(a.id, a.user);
    expect(first).toMatchObject({ status: "in_progress", step: 1, version: 0 });
    expect((await openSetup(a.id, a.user)).version).toBe(0);
    const saved = await writeSetup(a.id, 0, { step: 2, data: { source: "upload" } });
    expect(saved).toMatchObject({ step: 2, version: 1, data: { source: "upload" } });
    // A second tab still on version 0 cannot overwrite it.
    expect(await writeSetup(a.id, 0, { step: 5 })).toEqual({ error: "stale" });
    expect((await getSetup(a.id))!.step).toBe(2);
    // Pausing and reopening resumes the same draft.
    await writeSetup(a.id, 1, { status: "paused" });
    const resumed = await openSetup(a.id, a.user);
    expect(resumed).toMatchObject({ status: "in_progress", step: 2, data: { source: "upload" } });
  });

  it("keeps other agencies out", async () => {
    expect(await getSetup(b.id)).toBeNull();
    expect(await writeSetup(b.id, 0, { step: 3 })).toEqual({ error: "invalid" });
  });
});

describe("profile step", () => {
  it("changes only the fields shown, keeping contacts, languages and translations", async () => {
    const before = (await getAgencyByOwner(a.user))!;
    const r = await patchProfile(before, { name: "Studio A", bio: "Product photos for cafés", services: ["photography"] });
    expect(r).toEqual({ ok: true, changed: ["bio"] });
    const after = (await getAgencyByOwner(a.user))!;
    expect(after.bio).toBe("Product photos for cafés");
    expect(after.email).toBe("contact@a.jo");
    expect(after.whatsapp).toBe("+962790000001");
    expect(after.languages).toEqual(["ar", "en"]);
    expect(after.translation).toEqual({ name: "Studio A (en)" });
    expect(after.isVerified).toBe(before.isVerified);
  });
});

describe("client step", () => {
  it("adds a client once even when Continue is repeated", async () => {
    const one = await addClientOnce(a.id, "Café Nour");
    const two = await addClientOnce(a.id, "  café nour ");
    expect(one).toEqual(two);
    expect((await listClients(a.id)).filter((c) => c.name === "Café Nour")).toHaveLength(1);
  });

  it("will not publish with another agency's client", async () => {
    const other = await saveClient(b.id, null, { name: "B only", industry: null, country: null, description: "", links: [] });
    const v = (await getSetup(a.id))!;
    const w = await writeSetup(a.id, v.version, { data: { client: { mode: "existing", clientId: "ok" in other ? other.id : "" }, project: { title: "Menu launch", contribution: "I shot the photos.", services: ["photography"] } } });
    if ("error" in w) throw new Error(w.error);
    await addSetupMedia(a.id, [png], "upload");
    const r = await publishSetup({ agencyId: a.id, userId: a.user, version: (await getSetup(a.id))!.version, rights: true, personalLabel: "Personal" });
    expect(r).toEqual({ error: "client" });
    const db = await getDb();
    expect(await db.select().from(posts).where(eq(posts.agencyId, a.id))).toEqual([]);
  });
});

describe("media step", () => {
  it("stages images privately, for the owner only, and orders only its own ids", async () => {
    const db = await getDb();
    await addSetupMedia(a.id, [png], "upload");
    const rows = await db.select().from(portfolioSetupMedia).where(eq(portfolioSetupMedia.agencyId, a.id));
    expect(rows.every((m) => isPrivateKey(m.key) && m.key.startsWith(`drafts/${a.id}/`))).toBe(true);
    const ids = (await getSetup(a.id))!.media.map((m) => m.id);
    expect(await readSetupMedia(a.id, ids[0])).toBeInstanceOf(Buffer);
    expect(await readSetupMedia(b.id, ids[0])).toBeNull();
    expect(await orderSetupMedia(b.id, ids)).toEqual({ error: "invalid" });
    const reversed = await orderSetupMedia(a.id, [...ids].reverse());
    expect("error" in reversed ? null : reversed.map((m) => m.id)).toEqual([...ids].reverse());
    expect(await addSetupMedia(a.id, Array(9).fill(png), "upload")).toEqual({ error: "tooMany" });
  });
});

describe("publishing", () => {
  it("needs a project, a service, an image and the rights confirmation", async () => {
    const v = (await getSetup(a.id))!;
    expect(missingForPublish({ ...v, data: {} })).toBe("noProject");
    expect(missingForPublish({ ...v, data: { project: { title: "x y", contribution: "my part", services: [] } } })).toBe("noServices");
    expect(missingForPublish({ ...v, media: [], data: { project: { title: "x y", contribution: "my part", services: ["photography"] } } })).toBe("noMedia");
    expect(await publishSetup({ agencyId: a.id, userId: a.user, version: v.version, rights: false, personalLabel: "" })).toEqual({ error: "rights" });
  });

  it("publishes once: a retry or a second tab cannot create another project", async () => {
    const client = await addClientOnce(a.id, "Café Nour");
    const v0 = (await getSetup(a.id))!;
    const w = await writeSetup(a.id, v0.version, { data: { client: { mode: "existing", clientId: "id" in client ? client.id : "" } } });
    if ("error" in w) throw new Error(w.error);
    const input = { agencyId: a.id, userId: a.user, version: w.version, rights: true, personalLabel: "Personal" };
    const [one, two] = await Promise.all([publishSetup(input), publishSetup(input)]);
    const ok = [one, two].filter((r) => "postId" in r);
    expect(ok.length).toBeGreaterThanOrEqual(1);
    const db = await getDb();
    const published = await db.select().from(posts).where(eq(posts.agencyId, a.id));
    expect(published).toHaveLength(1);
    expect(published[0].caption).toBe("Menu launch\n\nI shot the photos.");
    expect(published[0].status).toBe("published");
    // Staged images are gone from private storage once published.
    expect(await db.select().from(portfolioSetupMedia).where(eq(portfolioSetupMedia.agencyId, a.id))).toEqual([]);
    const done = (await getSetup(a.id))!;
    expect(done).toMatchObject({ status: "finished", postId: published[0].id });
    // Calling again returns the same project.
    expect(await publishSetup({ ...input, version: done.version })).toEqual({ postId: published[0].id });
    expect((await db.select().from(auditLogs).where(eq(auditLogs.action, "setup.publish"))).length).toBe(1);
    const [agency] = await db.select().from(agencies).where(eq(agencies.id, a.id));
    expect(agency.postCount).toBe(1);
  });

  it("starts another project from a clean draft", async () => {
    await restartSetup(a.id, a.user);
    const v = (await getSetup(a.id))!;
    expect(v).toMatchObject({ status: "in_progress", step: 2, data: {}, postId: null, media: [] });
  });

  it("personal work is labelled, and a connected item becomes one project with its player", async () => {
    const db = await getDb();
    const [grant] = await db.insert(socialGrants).values({ agencyId: a.id, provider: "youtube", providerSubject: "UC1", consentVersion: "t" }).returning();
    const [resource] = await db.insert(socialResources).values({ grantId: grant.id, agencyId: a.id, provider: "youtube", kind: "channel", providerResourceId: "UC1", displayName: "Mine", ownership: "own", status: "selected" }).returning();
    const [item] = await db.insert(socialImportItems).values({ agencyId: a.id, resourceId: resource.id, provider: "youtube", providerItemId: "abcDEF12345", mediaKind: "video", title: "Launch film", permalink: "https://www.youtube.com/watch?v=abcDEF12345", state: "draft" }).returning();
    // Another agency's draft cannot point at it.
    await openSetup(b.id, b.user);
    const vb = (await getSetup(b.id))!;
    const wb = await writeSetup(b.id, vb.version, { data: { source: "social", socialItemId: item.id, client: { mode: "personal" }, project: { title: "Stolen", contribution: "Not mine", services: ["photography"] } } });
    if ("error" in wb) throw new Error(wb.error);
    await addSetupMedia(b.id, [png], "upload");
    expect(await publishSetup({ agencyId: b.id, userId: b.user, version: (await getSetup(b.id))!.version, rights: true, personalLabel: "Personal" })).toEqual({ error: "item" });

    const v = (await getSetup(a.id))!;
    const w = await writeSetup(a.id, v.version, { data: { source: "social", socialItemId: item.id, client: { mode: "personal" }, project: { title: "Launch film", contribution: "I edited it.", services: ["photography"] } } });
    if ("error" in w) throw new Error(w.error);
    await addSetupMedia(a.id, [png], "upload");
    const r = await publishSetup({ agencyId: a.id, userId: a.user, version: (await getSetup(a.id))!.version, rights: true, personalLabel: "Personal or practice project" });
    if (!("postId" in r)) throw new Error(JSON.stringify(r));
    const [post] = await db.select().from(posts).where(eq(posts.id, r.postId));
    expect(post.caption).toContain("Personal or practice project");
    expect(post.clientId).toBeNull();
    expect(post.embed).toEqual({ provider: "youtube", itemId: "abcDEF12345", url: "https://www.youtube-nocookie.com/embed/abcDEF12345" });
    expect(post.sourceUrl).toBe("https://www.youtube.com/watch?v=abcDEF12345");
    const [after] = await db.select().from(socialImportItems).where(eq(socialImportItems.id, item.id));
    expect(after).toMatchObject({ state: "published", postId: r.postId });

    // The same item cannot become a second project.
    await restartSetup(a.id, a.user);
    const again = (await getSetup(a.id))!;
    const w2 = await writeSetup(a.id, again.version, { data: { source: "social", socialItemId: item.id, client: { mode: "private" }, project: { title: "Again", contribution: "Same video", services: ["photography"] } } });
    if ("error" in w2) throw new Error(w2.error);
    await addSetupMedia(a.id, [png], "upload");
    expect(await publishSetup({ agencyId: a.id, userId: a.user, version: (await getSetup(a.id))!.version, rights: true, personalLabel: "" })).toEqual({ error: "duplicate" });
  });

  it("deletes staged images left for 60 days", async () => {
    const db = await getDb();
    await db.update(portfolioSetupMedia).set({ createdAt: new Date(Date.now() - 61 * 86_400_000) });
    expect(await purgeSetupMedia()).toBeGreaterThan(0);
    expect(await db.select().from(portfolioSetupMedia)).toEqual([]);
  });
});
