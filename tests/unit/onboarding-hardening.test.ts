import "./setup-db";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createAgency, getAgencyByOwner } from "@/lib/data/agencies";
import { createUser } from "@/lib/data/users";
import { addClientOnce, addSetupMedia, getSetup, openSetup, patchProfile, publishSetup, restartSetup, writeSetup } from "@/lib/data/portfolio-setup";
import { createPostFromProcessed } from "@/lib/data/posts";
import { browseItems, disconnectGrant, getItemForAgency, stageItem } from "@/lib/data/social";
import { closeDb, getDb } from "@/lib/db";
import { agencies, portfolioClients, portfolioSetupMedia, posts, socialGrants, socialImportItems, socialResources } from "@/lib/db/schema";
import { processImage } from "@/lib/images";
import { sealToken } from "@/lib/social/crypto";
import { ADAPTERS } from "@/lib/social/providers";
import { providerJson, ProviderError, setSocialTransport } from "@/lib/social/http";
import { storage } from "@/lib/storage";

let png: Buffer;
beforeAll(async () => {
  png = await sharp({ create: { width: 160, height: 120, channels: 3, background: "#227755" } }).png().toBuffer();
  process.env.GOOGLE_OAUTH_CLIENT_ID = "hardening-fixture.apps.test";
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "fixture-only";
  process.env.SOCIAL_PROVIDERS_APPROVED = "youtube";
});
afterEach(() => { vi.restoreAllMocks(); setSocialTransport(null); });
afterAll(() => closeDb());

async function actor() {
  const suffix = randomUUID().slice(0, 8);
  const user = await createUser(`qa-${suffix}@example.invalid`, "synthetic-test-password");
  const agency = await createAgency(user.id, { handle: `qa.${suffix}`, name: "Test studio", city: "amman", services: ["photography"] });
  await openSetup(agency.id, user.id);
  return { user, agency };
}
function latch() {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => { release = resolve; });
  return { wait, release };
}
async function ready() {
  const me = await actor();
  await addSetupMedia(me.agency.id, [png], "upload");
  const current = (await getSetup(me.agency.id))!;
  const view = await writeSetup(me.agency.id, current.version, { step: 5, data: { source: "upload", client: { mode: "private" }, project: { title: "A real draft", contribution: "Synthetic permissioned test image", services: ["photography"] } } });
  if ("error" in view) throw new Error(view.error);
  return { ...me, view, input: { agencyId: me.agency.id, userId: me.user.id, version: view.version, rights: true, personalLabel: "" } };
}

describe("atomic setup publication", () => {
  it("does not expose a new writable version while publication is still reading media", async () => {
    const { agency, view, input } = await ready();
    const entered = latch(); const resume = latch();
    const store = storage(); const get = store.get.bind(store);
    let held = false;
    vi.spyOn(store, "get").mockImplementation(async (key) => {
      if (!held && key.startsWith(`drafts/${agency.id}/`)) { held = true; entered.release(); await resume.wait; }
      return get(key);
    });
    const first = publishSetup(input);
    await entered.wait;
    const during = await getSetup(agency.id);
    // No externally visible claim before the final atomic post commit.
    expect(during!.version).toBe(view.version);
    const second = await publishSetup({ ...input, version: during!.version });
    resume.release();
    const one = await first;
    expect(one).toEqual(second);
    const db = await getDb();
    expect(await db.select().from(posts).where(eq(posts.agencyId, agency.id))).toHaveLength(1);
  });

  it("an edit during preprocessing prevents publishing stale reviewed content", async () => {
    const { agency, input } = await ready();
    const entered = latch(); const resume = latch();
    const store = storage(); const get = store.get.bind(store);
    vi.spyOn(store, "get").mockImplementation(async (key) => {
      if (key.startsWith(`drafts/${agency.id}/`)) { entered.release(); await resume.wait; }
      return get(key);
    });
    const pending = publishSetup(input);
    await entered.wait;
    const during = (await getSetup(agency.id))!;
    await writeSetup(agency.id, during.version, { step: 4, data: { project: { title: "New unsent version", contribution: "Must review this again", services: ["photography"] } } });
    resume.release();
    expect(await pending).toEqual({ error: "stale" });
    const db = await getDb();
    expect(await db.select().from(posts).where(eq(posts.agencyId, agency.id))).toHaveLength(0);
    expect((await getSetup(agency.id))!.media).toHaveLength(1);
  });

  it("a checkpoint error rolls back the post/count and removes only the failed attempt's uploads", async () => {
    const { agency } = await actor();
    const remove = vi.spyOn(storage(), "remove");
    await expect(createPostFromProcessed(agency.id, { caption: "Not committed", services: ["photography"], platforms: [] }, [await processImage(png)], undefined,
      { afterInsert: async () => { throw new Error("checkpoint fixture failure"); } })).rejects.toThrow("checkpoint fixture failure");
    const db = await getDb();
    expect(await db.select().from(posts).where(eq(posts.agencyId, agency.id))).toHaveLength(0);
    const [after] = await db.select().from(agencies).where(eq(agencies.id, agency.id));
    expect(after.postCount).toBe(0);
    const keys = remove.mock.calls.flatMap(([batch]) => batch);
    expect(keys).toHaveLength(2);
    for (const key of keys) expect(await storage().get(key)).toBeNull();
  });

  it("a stale profile step does not change the actual provider profile", async () => {
    const { agency, user } = await actor();
    await writeSetup(agency.id, 0, { step: 2 });
    expect(await patchProfile(agency, { name: "Stale tab overwrite", bio: "Must not save" }, { version: 0, userId: user.id })).toEqual({ error: "stale" });
    expect((await getAgencyByOwner(user.id))!.name).toBe("Test studio");
  });

  it("concurrent same-client requests create one client, and stale actions create none", async () => {
    const { agency } = await actor();
    const [a, b] = await Promise.all([addClientOnce(agency.id, "Example Café"), addClientOnce(agency.id, "  example café ")]);
    expect(a).toEqual(b);
    await writeSetup(agency.id, 0, { step: 3 });
    expect(await addClientOnce(agency.id, "Unapproved client", { version: 0 })).toEqual({ error: "stale" });
    const db = await getDb();
    expect(await db.select().from(portfolioClients).where(eq(portfolioClients.agencyId, agency.id))).toHaveLength(1);
  });

  it("rejects partial image batches and enforces the limit under concurrency", async () => {
    const { agency } = await actor();
    expect(await addSetupMedia(agency.id, [png, Buffer.from("not an image")], "upload")).toEqual({ error: "media" });
    expect((await getSetup(agency.id))!.media).toHaveLength(0);
    const results = await Promise.all([addSetupMedia(agency.id, Array(6).fill(png), "upload"), addSetupMedia(agency.id, Array(6).fill(png), "upload")]);
    expect(results.filter((r) => "error" in r)).toEqual([{ error: "tooMany" }]);
    expect((await getSetup(agency.id))!.media).toHaveLength(6);
  });

  it("restart cannot erase an unfinished draft, and a finished draft rejects late uploads", async () => {
    const { agency, user, view, input } = await ready();
    await restartSetup(agency.id, user.id);
    expect(await getSetup(agency.id)).toEqual(view);
    const result = await publishSetup(input);
    expect(result).toHaveProperty("postId");
    expect(await addSetupMedia(agency.id, [png], "upload")).toEqual({ error: "done" });
    const db = await getDb();
    expect(await db.select().from(portfolioSetupMedia).where(eq(portfolioSetupMedia.agencyId, agency.id))).toHaveLength(0);
  });
});

async function connected() {
  const { agency } = await actor();
  const db = await getDb();
  const id = randomUUID();
  const ctx = { owner: id, provider: "youtube", agencyId: agency.id };
  const [grant] = await db.insert(socialGrants).values({ id, agencyId: agency.id, provider: "youtube", providerSubject: "UC_fixture", consentVersion: "test",
    sealedAccess: sealToken("old-access", { ...ctx, purpose: "access" }), sealedRefresh: sealToken("rotating-refresh", { ...ctx, purpose: "refresh" }),
    accessExpiresAt: new Date(Date.now() + 3_600_000), scopes: ["https://www.googleapis.com/auth/youtube.readonly"] }).returning();
  const [resource] = await db.insert(socialResources).values({ grantId: id, agencyId: agency.id, provider: "youtube", providerResourceId: "UC_fixture", kind: "channel", displayName: "Fixture", ownership: "own", status: "selected" }).returning();
  return { agency, grant, resource, db };
}

describe("provider concurrency and display eligibility", () => {
  it("sends a rotating refresh token to its provider only once for simultaneous reads", async () => {
    const { agency, grant, resource, db } = await connected();
    await db.update(socialGrants).set({ accessExpiresAt: new Date(0) }).where(eq(socialGrants.id, grant.id));
    const refresh = vi.spyOn(ADAPTERS.youtube, "refresh").mockResolvedValue({ accessToken: "new-access", refreshToken: "new-refresh", expiresIn: 3600, scopes: grant.scopes });
    vi.spyOn(ADAPTERS.youtube, "listItems").mockResolvedValue({ items: [], next: null, units: 1 });
    const results = await Promise.all([browseItems(agency.id, resource.id, null), browseItems(agency.id, resource.id, null)]);
    expect(results.every((r) => !("error" in r))).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("a delayed list response cannot restore a disconnected grant or its items", async () => {
    const { agency, grant, resource, db } = await connected();
    const entered = latch(); const resume = latch();
    vi.spyOn(ADAPTERS.youtube, "listItems").mockImplementation(async () => { entered.release(); await resume.wait; return { items: [], next: null, units: 1 }; });
    vi.spyOn(ADAPTERS.youtube, "revoke").mockResolvedValue(true);
    const reading = browseItems(agency.id, resource.id, null);
    await entered.wait;
    expect(await disconnectGrant(agency.id, grant.id)).toEqual({ ok: true, remote: "revoked" });
    resume.release();
    expect(await reading).toEqual({ error: "permission" });
    const [after] = await db.select().from(socialGrants).where(eq(socialGrants.id, grant.id));
    expect(after).toMatchObject({ status: "revoked", sealedAccess: null, sealedRefresh: null });
    expect(after.version).toBeGreaterThan(grant.version);
    expect(await db.select().from(socialImportItems).where(eq(socialImportItems.agencyId, agency.id))).toHaveLength(0);
  });

  it("unembeddable work is never a selectable server record, including formerly eligible work", async () => {
    const { agency, resource, db } = await connected();
    const [old] = await db.insert(socialImportItems).values({ agencyId: agency.id, resourceId: resource.id, provider: "youtube", providerItemId: "abcDEF12345", mediaKind: "video", permalink: "https://www.youtube.com/watch?v=abcDEF12345" }).returning();
    vi.spyOn(ADAPTERS.youtube, "listItems").mockResolvedValue({ items: [{ id: "abcDEF12345", title: "No longer public", caption: "", mediaKind: "video", permalink: old.permalink, thumbnailUrl: null, publishedAt: null, displayable: false }], next: null, units: 1 });
    const result = await browseItems(agency.id, resource.id, null);
    expect(result).not.toHaveProperty("error");
    expect(await getItemForAgency(agency.id, old.id)).toBeNull();
    expect(await stageItem(agency.id, old.id)).toEqual({ error: "not_found" });
    expect(await db.select().from(socialImportItems).where(and(eq(socialImportItems.agencyId, agency.id), eq(socialImportItems.providerItemId, old.providerItemId)))).toHaveLength(0);
  });

  it("expired metadata cannot be selected before the daily cleanup runs", async () => {
    const { agency, resource, db } = await connected();
    const [item] = await db.insert(socialImportItems).values({ agencyId: agency.id, resourceId: resource.id, provider: "youtube", providerItemId: "abcDEF12345", mediaKind: "video", permalink: "https://www.youtube.com/watch?v=abcDEF12345", fetchedAt: new Date(Date.now() - 31 * 86_400_000) }).returning();
    expect(await getItemForAgency(agency.id, item.id)).toBeNull();
  });

  it("bounds chunked UTF-8 response bytes before buffering the whole body", async () => {
    let pulled = 0; let canceled = false;
    setSocialTransport((async () => new Response(new ReadableStream({ pull(controller) { pulled++; controller.enqueue(new TextEncoder().encode("ع".repeat(100_000))); }, cancel() { canceled = true; } }), { status: 200 })) as typeof fetch);
    await expect(providerJson("https://www.googleapis.com/fixture")).rejects.toBeInstanceOf(ProviderError);
    expect(canceled).toBe(true);
    expect(pulled).toBeLessThan(10);
  });
});
