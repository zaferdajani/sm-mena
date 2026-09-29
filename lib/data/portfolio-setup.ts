import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { updateAgency } from "@/lib/data/agencies";
import { getClient, saveClient } from "@/lib/data/portfolio-clients";
import { createPostFromProcessed, type PostWriteHooks } from "@/lib/data/posts";
import { getItemForAgency } from "@/lib/data/social";
import { getDb } from "@/lib/db";
import { agencies, auditLogs, portfolioClients, portfolioSetupMedia, portfolioSetups, socialGrants, socialImportItems, socialResources, type SetupDraftData } from "@/lib/db/schema";
import { MAX_IMAGES_PER_POST, newAvatarKey, processAvatar, processImage, type ProcessedImage } from "@/lib/images";
import { BehanceImportError, importBehanceProject } from "@/lib/behance/import";
import { embedFor } from "@/lib/social/embed";
import { storage } from "@/lib/storage";
import { normalizeForSearch } from "@/lib/text";

// First-run portfolio setup (docs/53). One private draft per agency, resumable
// from the server: the step, the choices, and images staged in private storage.
// Every write names the version it read, so a stale tab or a repeated click is
// refused instead of overwriting newer work. Nothing becomes public until the
// owner explicitly publishes, and publishing happens once.

export const SETUP_STEPS = 5;
const MEDIA_KEEP_DAYS = 60;

export type SetupError = "stale" | "invalid" | "client" | "media" | "tooMany" | "noServices" | "noMedia" | "noProject" | "rights" | "item" | "duplicate" | "behance" | "done" | "generic";

export type SetupMediaView = { id: string; url: string; width: number; height: number };
export type SetupView = {
  status: "in_progress" | "paused" | "finished";
  step: number;
  version: number;
  data: SetupDraftData;
  postId: string | null;
  media: SetupMediaView[];
};

const mediaUrl = (id: string) => `/api/setup-media/${id}`;

async function row(agencyId: string) {
  const db = await getDb();
  const [r] = await db.select().from(portfolioSetups).where(eq(portfolioSetups.agencyId, agencyId));
  return r ?? null;
}

async function mediaOf(agencyId: string): Promise<SetupMediaView[]> {
  const db = await getDb();
  const rows = await db.select().from(portfolioSetupMedia).where(eq(portfolioSetupMedia.agencyId, agencyId)).orderBy(asc(portfolioSetupMedia.position), asc(portfolioSetupMedia.createdAt));
  return rows.map((m) => ({ id: m.id, url: mediaUrl(m.id), width: m.width, height: m.height }));
}

/** The saved setup, or null when this agency never opened it. */
export async function getSetup(agencyId: string): Promise<SetupView | null> {
  const r = await row(agencyId);
  if (!r) return null;
  return { status: r.status, step: r.step, version: r.version, data: r.data ?? {}, postId: r.postId, media: await mediaOf(agencyId) };
}

/** Opens (or resumes) the setup; a paused one continues where it stopped. */
export async function openSetup(agencyId: string, userId: string): Promise<SetupView> {
  const db = await getDb();
  await db.insert(portfolioSetups).values({ agencyId, userId }).onConflictDoNothing();
  await db.update(portfolioSetups).set({ status: "in_progress", updatedAt: new Date() }).where(and(eq(portfolioSetups.agencyId, agencyId), eq(portfolioSetups.status, "paused")));
  return (await getSetup(agencyId))!;
}

/**
 * Saves the step and the changed parts of the draft, only on the version the
 * caller read. Each top-level draft key is replaced whole; keys not sent stay.
 */
export async function writeSetup(
  agencyId: string,
  version: number,
  change: { step?: number; data?: Partial<SetupDraftData>; clear?: (keyof SetupDraftData)[]; status?: "in_progress" | "paused" },
): Promise<SetupView | { error: SetupError }> {
  const current = await row(agencyId);
  if (!current) return { error: "invalid" };
  if (current.status === "finished") return { error: "done" };
  const data: SetupDraftData = { ...(current.data ?? {}), ...(change.data ?? {}) };
  for (const k of change.clear ?? []) delete data[k];
  const step = change.step === undefined ? current.step : Math.min(SETUP_STEPS, Math.max(1, Math.trunc(change.step)));
  const db = await getDb();
  const [saved] = await db
    .update(portfolioSetups)
    .set({ step, data, status: change.status ?? "in_progress", version: sql`${portfolioSetups.version} + 1`, updatedAt: new Date() })
    .where(and(eq(portfolioSetups.agencyId, agencyId), eq(portfolioSetups.version, version), ne(portfolioSetups.status, "finished")))
    .returning({ version: portfolioSetups.version });
  if (!saved) return { error: "stale" };
  return (await getSetup(agencyId))!;
}

// ---------------------------------------------------------------------------
// Step 1: only the profile fields the short form shows, and only when changed.
// ---------------------------------------------------------------------------

export async function patchProfile(
  agency: { id: string; name: string; bio: string; services: string[]; avatarKey: string | null },
  input: { name?: string; bio?: string; services?: string[]; pendingServices?: number[]; avatar?: Buffer | null },
  checkpoint?: { version: number; userId: string },
): Promise<{ ok: true; changed: string[] } | { error: "avatar" | "stale" }> {
  const patch: Parameters<typeof updateAgency>[1] = {};
  const changed: string[] = [];
  if (input.name !== undefined && input.name !== agency.name) {
    patch.name = input.name;
    changed.push("name");
  }
  if (input.bio !== undefined && input.bio !== agency.bio) {
    patch.bio = input.bio;
    changed.push("bio");
  }
  if (input.services && [...input.services].sort().join() !== [...agency.services].sort().join()) {
    patch.services = input.services;
    changed.push("services");
  }
  if (input.pendingServices?.length) patch.pendingServices = input.pendingServices;
  let avatarKey: string | undefined;
  if (input.avatar) {
    try {
      avatarKey = newAvatarKey(agency.id);
      await storage().put(avatarKey, await processAvatar(input.avatar), "image/webp");
      patch.avatarKey = avatarKey;
      changed.push("avatar");
    } catch {
      return { error: "avatar" };
    }
  }
  try {
    if (checkpoint) {
      const db = await getDb();
      await db.transaction(async (tx) => {
        const [claimed] = await tx.update(portfolioSetups)
          .set({ step: 2, status: "in_progress", version: sql`${portfolioSetups.version} + 1`, updatedAt: new Date() })
          .where(and(eq(portfolioSetups.agencyId, agency.id), eq(portfolioSetups.version, checkpoint.version), ne(portfolioSetups.status, "finished"))).returning({ agencyId: portfolioSetups.agencyId });
        if (!claimed) throw new SetupPublishConflict("stale");
        if (Object.keys(patch).length) await updateAgency(agency.id, patch, tx);
        if (changed.length) await tx.insert(auditLogs).values({ actorUserId: checkpoint.userId, action: "agency.update", entity: "agency", entityId: agency.id, meta: { via: "setup", fields: changed } });
      });
    } else if (Object.keys(patch).length) await updateAgency(agency.id, patch);
  } catch (error) {
    if (avatarKey) await storage().remove([avatarKey]).catch(() => undefined);
    if (error instanceof SetupPublishConflict) return { error: "stale" };
    throw error;
  }
  if (avatarKey && agency.avatarKey) await storage().remove([agency.avatarKey]).catch(() => undefined);
  return { ok: true, changed };
}

// ---------------------------------------------------------------------------
// Step 3: an owned client, found or added once (a retry never adds a second).
// ---------------------------------------------------------------------------

export async function ownedClientId(agencyId: string, clientId: string): Promise<string | null> {
  return (await getClient(agencyId, clientId))?.id ?? null;
}

export async function addClientOnce(agencyId: string, name: string, checkpoint?: { version: number }): Promise<{ id: string } | { error: SetupError }> {
  const clean = name.trim().slice(0, 80);
  if (clean.length < 2) return { error: "invalid" };
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [draft] = checkpoint ? await tx.select().from(portfolioSetups).where(eq(portfolioSetups.agencyId, agencyId)).for("update") : [];
    if (checkpoint && (!draft || draft.version !== checkpoint.version || draft.status === "finished")) return { error: "stale" };
    const [owner] = await tx.select({ id: agencies.id }).from(agencies).where(eq(agencies.id, agencyId)).for("update");
    if (!owner) return { error: "client" };
    const wanted = normalizeForSearch(clean);
    const clients = await tx.select().from(portfolioClients).where(eq(portfolioClients.agencyId, agencyId));
    const existing = clients.find((c) => normalizeForSearch(c.name) === wanted);
    const saved = existing ? { ok: true as const, id: existing.id } : await saveClient(agencyId, null, { name: clean, industry: null, country: null, description: "", links: [] }, tx);
    if (!("ok" in saved)) return { error: "client" };
    if (checkpoint && draft) await tx.update(portfolioSetups).set({ step: 4, status: "in_progress", version: draft.version + 1,
      data: { ...draft.data, client: { mode: "existing", clientId: saved.id } }, updatedAt: new Date() }).where(eq(portfolioSetups.agencyId, agencyId));
    return { id: saved.id };
  });
}

// ---------------------------------------------------------------------------
// Step 4: images staged privately (drafts/…), shown only through an
// authenticated route; they reach public storage only when published.
// ---------------------------------------------------------------------------

export async function addSetupMedia(agencyId: string, files: Buffer[], source: "upload" | "pdf"): Promise<SetupMediaView[] | { error: SetupError }> {
  if (!files.length || files.length > MAX_IMAGES_PER_POST) return { error: "tooMany" };
  const db = await getDb();
  const keys: string[] = [];
  try {
    // Validate the whole batch before writing anything; a bad second image
    // cannot leave an invisible, partly accepted first image in the draft.
    const processed = await Promise.all(files.map((file) => processImage(file)));
    const staged = [];
    for (const image of processed) {
      const id = randomUUID();
      const key = `drafts/${agencyId}/${id}.webp`;
      keys.push(key);
      await storage().put(key, image.full, "image/webp");
      staged.push({ id, agencyId, key, width: image.width, height: image.height, source });
    }
    await db.transaction(async (tx) => {
      const [draft] = await tx.select().from(portfolioSetups).where(eq(portfolioSetups.agencyId, agencyId)).for("update");
      if (!draft || draft.status === "finished") throw new SetupPublishConflict("done");
      const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(portfolioSetupMedia).where(eq(portfolioSetupMedia.agencyId, agencyId));
      if (n + staged.length > MAX_IMAGES_PER_POST) throw new SetupPublishConflict("tooMany");
      await tx.insert(portfolioSetupMedia).values(staged.map((image, position) => ({ ...image, position: n + position })));
      await tx.update(portfolioSetups).set({ version: sql`${portfolioSetups.version} + 1`, updatedAt: new Date() }).where(eq(portfolioSetups.agencyId, agencyId));
    });
    return await mediaOf(agencyId);
  } catch (error) {
    await storage().remove(keys).catch(() => undefined);
    return { error: error instanceof SetupPublishConflict ? error.code : "media" };
  }
}

export async function removeSetupMedia(agencyId: string, id: string): Promise<SetupMediaView[]> {
  const db = await getDb();
  const gone = await db.transaction(async (tx) => {
    const [draft] = await tx.select().from(portfolioSetups).where(eq(portfolioSetups.agencyId, agencyId)).for("update");
    if (!draft || draft.status === "finished") return null;
    const [removed] = await tx.delete(portfolioSetupMedia).where(and(eq(portfolioSetupMedia.id, id), eq(portfolioSetupMedia.agencyId, agencyId))).returning();
    if (removed) await tx.update(portfolioSetups).set({ version: sql`${portfolioSetups.version} + 1`, updatedAt: new Date() }).where(eq(portfolioSetups.agencyId, agencyId));
    return removed;
  });
  if (gone) await storage().remove([gone.key]).catch(() => undefined);
  return mediaOf(agencyId);
}

/** The cover and order are one write, serialized with media changes/publication. */
export async function orderSetupMedia(agencyId: string, ids: string[]): Promise<SetupMediaView[] | { error: SetupError }> {
  const db = await getDb();
  const result = await db.transaction(async (tx): Promise<{ error: SetupError } | null> => {
    const [draft] = await tx.select().from(portfolioSetups).where(eq(portfolioSetups.agencyId, agencyId)).for("update");
    if (!draft || draft.status === "finished") return { error: "invalid" };
    const current = await tx.select({ id: portfolioSetupMedia.id }).from(portfolioSetupMedia).where(eq(portfolioSetupMedia.agencyId, agencyId));
    if (ids.length !== current.length || new Set(ids).size !== ids.length || !ids.every((id) => current.some((m) => m.id === id))) return { error: "invalid" };
    for (const [position, id] of ids.entries()) {
      await tx.update(portfolioSetupMedia).set({ position }).where(and(eq(portfolioSetupMedia.id, id), eq(portfolioSetupMedia.agencyId, agencyId)));
    }
    await tx.update(portfolioSetups).set({ version: sql`${portfolioSetups.version} + 1`, updatedAt: new Date() }).where(eq(portfolioSetups.agencyId, agencyId));
    return null;
  });
  return result ?? mediaOf(agencyId);
}

/** A staged image's bytes for its owner only (the authenticated media route). */
export async function readSetupMedia(agencyId: string, id: string): Promise<Buffer | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = await getDb();
  const [m] = await db.select().from(portfolioSetupMedia).where(and(eq(portfolioSetupMedia.id, id), eq(portfolioSetupMedia.agencyId, agencyId)));
  return m ? storage().get(m.key) : null;
}

// ---------------------------------------------------------------------------
// Step 5: publish, deliberately and once.
// ---------------------------------------------------------------------------

export type PublishInput = { agencyId: string; userId: string; version: number; rights: boolean; personalLabel: string };

/** Everything the project needs before it can be previewed or published. */
export function missingForPublish(view: SetupView): SetupError | null {
  const p = view.data.project;
  if (!p || p.title.trim().length < 2 || p.contribution.trim().length < 2) return "noProject";
  if (!p.services.length) return "noServices";
  const hasMedia = view.media.length > 0 || (view.data.source === "behance" && (view.data.behance?.images.length ?? 0) > 0);
  if (!hasMedia) return "noMedia";
  return null;
}

export async function publishSetup(input: PublishInput): Promise<{ postId: string } | { error: SetupError }> {
  if (!input.rights) return { error: "rights" };
  const view = await getSetup(input.agencyId);
  if (!view) return { error: "invalid" };
  if (view.postId || view.status === "finished") return view.postId ? { postId: view.postId } : { error: "done" };
  if (view.version !== input.version) return { error: "stale" };
  const missing = missingForPublish(view);
  if (missing) return { error: missing };
  const d = view.data;

  let clientId: string | null = null;
  if (d.client?.mode === "existing") {
    clientId = d.client.clientId ? await ownedClientId(input.agencyId, d.client.clientId) : null;
    if (!clientId) return { error: "client" };
  }
  let social: { provider: string; itemId: string; permalink: string; embed: ReturnType<typeof embedFor> } | null = null;
  if (d.source === "social" && d.socialItemId) {
    const found = await getItemForAgency(input.agencyId, d.socialItemId);
    if (!found) return { error: "item" };
    const embed = embedFor(found.item.provider, found.item.providerItemId, found.item.permalink);
    social = { provider: found.item.provider, itemId: found.item.providerItemId, permalink: found.item.permalink, embed };
  }

  const db = await getDb();
  // Keep the exact media reviewed by this version. A later draft's images must never be cleared.
  const staged = await db.select().from(portfolioSetupMedia).where(eq(portfolioSetupMedia.agencyId, input.agencyId)).orderBy(asc(portfolioSetupMedia.position), asc(portfolioSetupMedia.createdAt));
  const stagedIds = staged.map((m) => m.id);
  const p = d.project!;
  const caption = [p.title.trim(), p.contribution.trim(), d.client?.mode === "personal" ? input.personalLabel : ""].filter(Boolean).join("\n\n").slice(0, 2200);
  const fields = { caption, services: p.services, platforms: [] as string[], industry: null, result: null, clientId };
  const hooks: PostWriteHooks = {
    beforeInsert: async (tx) => {
      // Authorization/revocation always lock the grant before its resources/items.
      // Holding the same lock until insertion commits prevents a disconnect from
      // missing a concurrently published player, without calling the provider here.
      if (social && d.socialItemId) {
        const [source] = await tx.select({ grantId: socialResources.grantId })
          .from(socialImportItems).innerJoin(socialResources, eq(socialResources.id, socialImportItems.resourceId))
          .where(and(eq(socialImportItems.id, d.socialItemId), eq(socialImportItems.agencyId, input.agencyId), eq(socialResources.agencyId, input.agencyId)));
        if (!source) throw new SetupPublishConflict("item");
        const [grant] = await tx.select().from(socialGrants)
          .where(and(eq(socialGrants.id, source.grantId), eq(socialGrants.agencyId, input.agencyId))).for("update");
        if (!grant || !["active", "limited"].includes(grant.status)) throw new SetupPublishConflict("item");
        const [item] = await tx.select({ id: socialImportItems.id }).from(socialImportItems)
          .innerJoin(socialResources, eq(socialResources.id, socialImportItems.resourceId))
          .where(and(eq(socialImportItems.id, d.socialItemId), eq(socialImportItems.agencyId, input.agencyId), eq(socialResources.status, "selected"), eq(socialResources.grantId, grant.id),
            sql`${socialImportItems.fetchedAt} > now() - interval '30 days'`));
        if (!item) throw new SetupPublishConflict("item");
      }
      // The version claim is in the SAME transaction as post, images, count,
      // final draft checkpoint and audit. A reload never observes an intermediate
      // writable version, and an interrupted insertion rolls the whole claim back.
      const [claimed] = await tx.update(portfolioSetups)
        .set({ version: sql`${portfolioSetups.version} + 1`, updatedAt: new Date() })
        .where(and(eq(portfolioSetups.agencyId, input.agencyId), eq(portfolioSetups.version, input.version), isNull(portfolioSetups.postId), ne(portfolioSetups.status, "finished")))
        .returning({ version: portfolioSetups.version });
      if (!claimed) throw new SetupPublishConflict("stale");
      if (clientId) {
        const [client] = await tx.select({ id: portfolioClients.id }).from(portfolioClients)
          .where(and(eq(portfolioClients.id, clientId), eq(portfolioClients.agencyId, input.agencyId)));
        if (!client) throw new SetupPublishConflict("client");
      }
      const currentMedia = await tx.select({ id: portfolioSetupMedia.id }).from(portfolioSetupMedia)
        .where(eq(portfolioSetupMedia.agencyId, input.agencyId)).orderBy(asc(portfolioSetupMedia.position), asc(portfolioSetupMedia.createdAt));
      if (currentMedia.map((m) => m.id).join() !== stagedIds.join()) throw new SetupPublishConflict("stale");
    },
    afterInsert: async (tx, post) => {
      await tx.update(portfolioSetups).set({ postId: post.id, status: "finished", step: SETUP_STEPS, updatedAt: new Date() })
        .where(eq(portfolioSetups.agencyId, input.agencyId));
      if (social && d.socialItemId) await tx.update(socialImportItems).set({ state: "published", postId: post.id })
        .where(and(eq(socialImportItems.id, d.socialItemId), eq(socialImportItems.agencyId, input.agencyId)));
      if (stagedIds.length) await tx.delete(portfolioSetupMedia)
        .where(and(eq(portfolioSetupMedia.agencyId, input.agencyId), inArray(portfolioSetupMedia.id, stagedIds)));
      await tx.insert(auditLogs).values({ actorUserId: input.userId, action: "setup.publish", entity: "post", entityId: post.id,
        meta: { source: d.source ?? "upload", client: d.client?.mode ?? "none" } });
    },
  };
  try {
    let postId: string;
    if (d.source === "behance" && d.behance) {
      const post = await importBehanceProject(input.agencyId, { projectUrl: d.behance.projectUrl, images: d.behance.images, publishedAt: d.behance.publishedAt ? new Date(d.behance.publishedAt) : null, ...fields }, undefined, hooks);
      postId = post.id;
    } else {
      const processed: ProcessedImage[] = [];
      for (const m of staged) {
        const buf = await storage().get(m.key);
        if (!buf) return { error: "media" };
        processed.push(await processImage(buf));
      }
      const post = await createPostFromProcessed(input.agencyId, {
        ...fields, sourceUrl: social?.permalink ?? null,
        source: social ? { provider: social.provider, itemId: social.itemId, embed: social.embed } : null,
      }, processed, undefined, hooks);
      postId = post.id;
    }
    // Best-effort bytes cleanup cannot convert a successfully committed project
    // into an error. The database no longer offers these staged URLs to anyone.
    await storage().remove(staged.map((m) => m.key)).catch(() => undefined);
    return { postId };
  } catch (e) {
    if (e instanceof SetupPublishConflict) {
      const latest = await row(input.agencyId);
      if (e.code === "stale" && latest?.postId) return { postId: latest.postId };
      return { error: e.code };
    }
    if (e instanceof Error && /posts_source_item_idx|duplicate key/i.test(`${e.message} ${(e as { cause?: Error }).cause?.message ?? ""}`)) return { error: "duplicate" };
    if (e instanceof BehanceImportError) return { error: "behance" };
    return { error: "generic" };
  }
}

class SetupPublishConflict extends Error {
  constructor(public readonly code: SetupError) { super(code); }
}

/** Starts a new project after the first: a fresh draft that keeps nothing from the published one. */
export async function restartSetup(agencyId: string, userId: string) {
  const db = await getDb();
  await db.insert(portfolioSetups).values({ agencyId, userId, step: 2 }).onConflictDoNothing();
  await db.transaction(async (tx) => {
    const [current] = await tx.select().from(portfolioSetups).where(eq(portfolioSetups.agencyId, agencyId)).for("update");
    if (!current || current.status !== "finished") return;
    await tx.update(portfolioSetups).set({ status: "in_progress", step: 2, data: {}, postId: null, version: current.version + 1, updatedAt: new Date() })
      .where(eq(portfolioSetups.agencyId, agencyId));
  });
}

/** Daily: staged images untouched for 60 days are deleted (the draft keeps its text). */
export async function purgeSetupMedia(now = new Date()) {
  const db = await getDb();
  const cutoff = new Date(now.getTime() - MEDIA_KEEP_DAYS * 86_400_000);
  const gone = await db.delete(portfolioSetupMedia).where(lt(portfolioSetupMedia.createdAt, cutoff)).returning({ key: portfolioSetupMedia.key });
  if (gone.length) await storage().remove(gone.map((g) => g.key)).catch(() => undefined);
  return gone.length;
}
