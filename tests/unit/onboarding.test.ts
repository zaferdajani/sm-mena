import "./setup-db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAgency } from "@/lib/data/agencies";
import { addDraftMedia, DRAFT_TTL_DAYS, ensureDraft, finishDraft, getDraft, patchDraft, purgeExpiredDrafts, removeDraftMedia, setDraftCover, startAnotherProject } from "@/lib/data/onboarding";
import { saveClient } from "@/lib/data/portfolio-clients";
import { getAgencyPostsForOwner } from "@/lib/data/posts";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { agencies, onboardingDrafts, postImages, posts } from "@/lib/db/schema";
import { processImage } from "@/lib/images";
import { storage } from "@/lib/storage";
import sharp from "sharp";

// First-run setup drafts (docs/53): private, per agency, version-checked,
// finished at most once into a real post, and purged when abandoned.

let a: Awaited<ReturnType<typeof createAgency>>;
let b: Awaited<ReturnType<typeof createAgency>>;
let image: Awaited<ReturnType<typeof processImage>>;
beforeAll(async () => {
  const ua = await createUser("setup-a@t.jo", "password-1234");
  const ub = await createUser("setup-b@t.jo", "password-1234");
  a = await createAgency(ua.id, { handle: "setup.a", name: "Setup A", city: "amman", services: ["photography"] });
  b = await createAgency(ub.id, { handle: "setup.b", name: "Setup B", city: "amman", services: ["photography"] });
  image = await processImage(await sharp({ create: { width: 640, height: 640, channels: 3, background: "#13784a" } }).png().toBuffer());
}, 90_000);
afterAll(() => closeDb());

describe("the setup draft", () => {
  it("is created once per agency and offered only while the page is empty", async () => {
    const d1 = await ensureDraft(a);
    const d2 = await ensureDraft(a);
    expect(d2.id).toBe(d1.id);
    expect(d1.status).toBe("in_progress");
    expect(d1.step).toBe(1);
  });

  it("refuses a stale version and an unowned client, and bumps the version on every accepted write", async () => {
    const d = await ensureDraft(a);
    const ok = await patchDraft(a.id, d.version, { step: 2, title: "Café launch" });
    expect("error" in ok).toBe(false);
    if ("error" in ok) throw new Error(ok.error);
    expect(ok.version).toBe(d.version + 1);
    expect(await patchDraft(a.id, d.version, { title: "from a stale tab" })).toEqual({ error: "stale" });
    expect((await getDraft(a.id))!.title).toBe("Café launch");
    const other = await saveClient(b.id, null, { name: "B's client", industry: null, country: null, description: "", links: [] });
    if (!("ok" in other)) throw new Error("client");
    expect(await patchDraft(a.id, ok.version, { clientId: other.id, clientMode: "client" })).toEqual({ error: "client" });
    expect(await getDraft(b.id)).toBeNull(); // nothing leaked across agencies
  });

  it("keeps media in the agency's private draft space, reorders the cover, removes and caps at ten", async () => {
    let d = await addDraftMedia(a.id, [image, image], { source: "upload", step: 3 });
    if ("error" in d) throw new Error(d.error);
    expect(d.media).toHaveLength(2);
    expect(d.media.every((m) => m.key.startsWith(`portfolio/${a.id}/drafts/`) && m.thumbKey.endsWith("-t.webp"))).toBe(true);
    expect(await storage().get(d.media[0].key)).not.toBeNull();
    const first = d.media[0].key;
    d = await setDraftCover(a.id, d.version, 1) as typeof d;
    expect(d.media[1].key).toBe(first);
    d = await removeDraftMedia(a.id, d.media[1].key) as typeof d;
    expect(d.media).toHaveLength(1);
    expect(await storage().get(first)).toBeNull();
    expect(await addDraftMedia(a.id, Array.from({ length: 10 }, () => image))).toEqual({ error: "too_many" });
    expect(await removeDraftMedia(a.id, `portfolio/${b.id}/drafts/x.webp`)).toMatchObject({ media: d.media }); // foreign key ignored
    // Parallel adds cannot exceed the cap: the statement itself refuses, and the refused files are removed again.
    const results = await Promise.all([addDraftMedia(a.id, Array.from({ length: 5 }, () => image)), addDraftMedia(a.id, Array.from({ length: 5 }, () => image)), addDraftMedia(a.id, Array.from({ length: 5 }, () => image))]);
    const after = (await getDraft(a.id))!;
    expect(after.media.length).toBeLessThanOrEqual(10);
    expect(results.filter((r) => "error" in r).length).toBeGreaterThanOrEqual(1);
    // Two removes in flight: each removes exactly its own key; neither brings the other's file back.
    const [k1, k2] = [after.media[1].key, after.media[2].key];
    await Promise.all([removeDraftMedia(a.id, k1), removeDraftMedia(a.id, k2)]);
    const afterRemove = (await getDraft(a.id))!;
    expect(afterRemove.media.some((m) => m.key === k1 || m.key === k2)).toBe(false);
    expect(afterRemove.media).toHaveLength(after.media.length - 2);
    for (const m of afterRemove.media) expect(await storage().get(m.key)).not.toBeNull();
    // An unfinished draft cannot be reset by "another project"; nothing is dropped.
    const same = await startAnotherProject(a, false);
    expect(same.media).toHaveLength(afterRemove.media.length);
    // Back to one image for the finish test below.
    for (const m of afterRemove.media.slice(1)) await removeDraftMedia(a.id, m.key);
    d = (await getDraft(a.id))!;
    expect(d.media).toHaveLength(1);
  });

  it("finishes into exactly one real post, and a retried finish returns the same post", async () => {
    const d = await getDraft(a.id);
    const own = await saveClient(a.id, null, { name: "Own café", industry: null, country: null, description: "", links: [] });
    if (!("ok" in own) || !d) throw new Error("setup");
    const set = await patchDraft(a.id, d.version, { clientMode: "client", clientId: own.id, services: ["photography"], contribution: "Photos and post design", step: 5 });
    if ("error" in set) throw new Error(set.error);
    expect(await finishDraft(a.id, set.version - 1)).toEqual({ error: "stale" });
    const r1 = await finishDraft(a.id, set.version);
    if ("error" in r1) throw new Error(r1.error);
    expect(r1.created).toBe(true);
    const r2 = await finishDraft(a.id, set.version + 5); // any later submit
    expect(r2).toEqual({ postId: r1.postId, created: false });
    const own1 = await getAgencyPostsForOwner(a.id);
    expect(own1).toHaveLength(1);
    expect(own1[0].caption).toContain("Café launch");
    expect(own1[0].caption).toContain("Photos and post design");
    const db = await getDb();
    const [post] = await db.select().from(posts).where(eq(posts.id, r1.postId));
    expect(post.clientId).toBe(own.id);
    const imgs = await db.select().from(postImages).where(eq(postImages.postId, r1.postId));
    expect(imgs).toHaveLength(1);
    expect(imgs[0].key).toBe(set.media[0].key); // the same private key, no copy
    expect((await db.select().from(agencies).where(eq(agencies.id, a.id)))[0].postCount).toBe(1);
    expect((await getDraft(a.id))!.status).toBe("finished");
    expect(await patchDraft(a.id, set.version + 1, { title: "x" })).toEqual({ error: "finished" });
  });

  it("starts another project keeping the client, and a private/personal choice never names a client", async () => {
    const next = await startAnotherProject(a, true);
    expect(next.status).toBe("in_progress");
    expect(next.step).toBe(4);
    expect(next.clientMode).toBe("client");
    expect(next.media).toEqual([]);
    expect(next.postId).toBeNull();
    const priv = await patchDraft(a.id, next.version, { clientMode: "private", clientId: null, title: "Confidential", services: ["photography"], step: 5 });
    if ("error" in priv) throw new Error(priv.error);
    const withMedia = await addDraftMedia(a.id, [image]);
    if ("error" in withMedia) throw new Error(withMedia.error);
    const done = await finishDraft(a.id, withMedia.version);
    if ("error" in done) throw new Error(done.error);
    const db = await getDb();
    const [post] = await db.select().from(posts).where(eq(posts.id, done.postId));
    expect(post.clientId).toBeNull();
  });

  it("purges only abandoned drafts past their expiry, with their private media", async () => {
    const d = await ensureDraft(b);
    const withMedia = await addDraftMedia(b.id, [image]);
    if ("error" in withMedia) throw new Error(withMedia.error);
    const key = withMedia.media[0].key;
    expect(await purgeExpiredDrafts(new Date())).toBe(0);
    expect(await purgeExpiredDrafts(new Date(Date.now() + (DRAFT_TTL_DAYS + 1) * 86_400_000))).toBe(1);
    expect(await getDraft(b.id)).toBeNull();
    expect(await storage().get(key)).toBeNull();
    // A finished draft is history, not garbage.
    const db = await getDb();
    expect((await db.select().from(onboardingDrafts).where(eq(onboardingDrafts.agencyId, a.id)))[0].status).toBe("finished");
    expect(await purgeExpiredDrafts(new Date(Date.now() + 400 * 86_400_000))).toBe(0);
    expect(d.id).toBeTruthy();
  });
});
