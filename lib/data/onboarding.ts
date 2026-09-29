import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, lt, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { onboardingDrafts, portfolioClients, type Agency, type DraftMedia, type OnboardingDraft } from "@/lib/db/schema";
import { MAX_IMAGES_PER_POST, STORED_EXT, type ProcessedImage, type StoredFormat } from "@/lib/images";
import { storage } from "@/lib/storage";
import { createPostFromStoredImages, storeProcessedImages } from "./posts";

// First-run portfolio setup (docs/53). One private draft per agency, owned by
// the signed-in owner; every read and write is scoped by agency id, and the
// version column refuses writes from a stale tab. Media lives in the private
// portfolio bucket under drafts/ until the draft is finished, when the same
// keys become the post's images (no copy, no public URL in between).

export const DRAFT_TTL_DAYS = 30;
export const SETUP_STEPS = 5;
export type DraftSource = "upload" | "pdf" | "behance";
export type ClientMode = "client" | "personal" | "private";
export type DraftPatch = Partial<Pick<OnboardingDraft, "step" | "source" | "sourceUrl" | "clientMode" | "clientId" | "suggestedClient" | "title" | "contribution" | "services" | "platforms" | "cover">>;
export type DraftError = { error: "stale" | "not_found" | "client" | "too_many" | "no_media" | "no_services" | "finished" };

const expiry = (now = new Date()) => new Date(now.getTime() + DRAFT_TTL_DAYS * 86_400_000);
const keysFor = (agencyId: string) => (format: StoredFormat) => {
  const id = randomUUID();
  return { key: `portfolio/${agencyId}/drafts/${id}.${STORED_EXT[format]}`, thumbKey: `portfolio/${agencyId}/drafts/${id}-t.webp` };
};

export async function getDraft(agencyId: string): Promise<OnboardingDraft | null> {
  const db = await getDb();
  const [row] = await db.select().from(onboardingDrafts).where(eq(onboardingDrafts.agencyId, agencyId));
  return row ?? null;
}

/** The agency's draft, created on first use. A finished draft is returned as is (the caller offers "add another"). */
export async function ensureDraft(agency: Pick<Agency, "id" | "ownerUserId">): Promise<OnboardingDraft> {
  const existing = await getDraft(agency.id);
  if (existing) return existing;
  const db = await getDb();
  const [row] = await db
    .insert(onboardingDrafts)
    .values({ agencyId: agency.id, ownerUserId: agency.ownerUserId, expiresAt: expiry() })
    .onConflictDoNothing({ target: onboardingDrafts.agencyId })
    .returning();
  return row ?? (await getDraft(agency.id))!;
}

/** Applies a patch when the caller's version is current; bumps the version and the expiry. */
export async function patchDraft(agencyId: string, version: number, patch: DraftPatch): Promise<OnboardingDraft | DraftError> {
  const db = await getDb();
  if (patch.clientId) {
    const [c] = await db.select({ id: portfolioClients.id }).from(portfolioClients).where(and(eq(portfolioClients.id, patch.clientId), eq(portfolioClients.agencyId, agencyId)));
    if (!c) return { error: "client" };
  }
  const [row] = await db
    .update(onboardingDrafts)
    .set({ ...patch, version: sql`${onboardingDrafts.version} + 1`, updatedAt: new Date(), expiresAt: expiry() })
    .where(and(eq(onboardingDrafts.agencyId, agencyId), eq(onboardingDrafts.version, version), ne(onboardingDrafts.status, "finished")))
    .returning();
  if (row) return row;
  const current = await getDraft(agencyId);
  return { error: !current ? "not_found" : current.status === "finished" ? "finished" : "stale" };
}

/** Stores processed images in the draft's private space and appends them (up to the post limit). */
export async function addDraftMedia(agencyId: string, processed: ProcessedImage[], patch: DraftPatch = {}): Promise<OnboardingDraft | DraftError> {
  const draft = await getDraft(agencyId);
  if (!draft) return { error: "not_found" };
  if (draft.status === "finished") return { error: "finished" };
  if (draft.media.length + processed.length > MAX_IMAGES_PER_POST) return { error: "too_many" };
  const stored = await storeProcessedImages(agencyId, processed, keysFor(agencyId));
  const media: DraftMedia[] = stored.map((s, i) => ({ ...s, format: processed[i].fullFormat ?? "webp" }));
  const db = await getDb();
  const [row] = await db
    .update(onboardingDrafts)
    .set({ ...patch, media: sql`${onboardingDrafts.media} || ${JSON.stringify(media)}::jsonb`, version: sql`${onboardingDrafts.version} + 1`, updatedAt: new Date(), expiresAt: expiry() })
    .where(and(eq(onboardingDrafts.agencyId, agencyId), ne(onboardingDrafts.status, "finished")))
    .returning();
  if (!row) {
    await storage().remove(media.flatMap((m) => [m.key, m.thumbKey])).catch(() => {});
    return { error: "not_found" };
  }
  return row;
}

/** Removes one image from the draft (and from storage); the cover index is kept in range. */
export async function removeDraftMedia(agencyId: string, key: string): Promise<OnboardingDraft | DraftError> {
  const draft = await getDraft(agencyId);
  if (!draft) return { error: "not_found" };
  if (draft.status === "finished") return { error: "finished" };
  const gone = draft.media.find((m) => m.key === key);
  if (!gone) return draft;
  const media = draft.media.filter((m) => m.key !== key);
  const db = await getDb();
  const [row] = await db
    .update(onboardingDrafts)
    .set({ media, cover: Math.min(draft.cover, Math.max(0, media.length - 1)), version: sql`${onboardingDrafts.version} + 1`, updatedAt: new Date() })
    .where(eq(onboardingDrafts.agencyId, agencyId))
    .returning();
  await storage().remove([gone.key, gone.thumbKey]).catch(() => {});
  return row;
}

/** Puts the chosen image first (the cover) by reordering the media list. */
export async function setDraftCover(agencyId: string, version: number, index: number): Promise<OnboardingDraft | DraftError> {
  const draft = await getDraft(agencyId);
  if (!draft) return { error: "not_found" };
  if (index < 0 || index >= draft.media.length) return draft;
  const media = [draft.media[index], ...draft.media.filter((_, i) => i !== index)];
  const db = await getDb();
  const [row] = await db
    .update(onboardingDrafts)
    .set({ media, cover: 0, version: sql`${onboardingDrafts.version} + 1`, updatedAt: new Date() })
    .where(and(eq(onboardingDrafts.agencyId, agencyId), eq(onboardingDrafts.version, version), ne(onboardingDrafts.status, "finished")))
    .returning();
  return row ?? { error: "stale" };
}

/**
 * Turns the draft into a real post through the same rows as Studio → New and
 * marks the draft finished. Idempotent: a draft that already produced a post
 * returns that post's id, so a retried or double-submitted finish never
 * creates a second post. Publication (visibility) is untouched: the post is
 * as visible as the agency's page is, and nothing else changes.
 */
export async function finishDraft(agencyId: string, version: number): Promise<{ postId: string; created: boolean } | DraftError> {
  const draft = await getDraft(agencyId);
  if (!draft) return { error: "not_found" };
  if (draft.status === "finished" && draft.postId) return { postId: draft.postId, created: false };
  if (draft.version !== version) return { error: "stale" };
  if (!draft.media.length) return { error: "no_media" };
  if (!draft.services.length) return { error: "no_services" };
  const db = await getDb();
  // Claim the draft first (version-checked), so two concurrent finishes cannot both create a post.
  const [claimed] = await db
    .update(onboardingDrafts)
    .set({ status: "finished", version: sql`${onboardingDrafts.version} + 1`, updatedAt: new Date() })
    .where(and(eq(onboardingDrafts.agencyId, agencyId), eq(onboardingDrafts.version, version), ne(onboardingDrafts.status, "finished")))
    .returning();
  if (!claimed) return { error: "stale" };
  try {
    const caption = [draft.title.trim(), draft.contribution.trim()].filter(Boolean).join("\n\n");
    const post = await createPostFromStoredImages(agencyId, { caption, services: draft.services, platforms: draft.platforms, clientId: draft.clientMode === "client" ? draft.clientId : null, sourceUrl: draft.sourceUrl }, draft.media);
    await db.update(onboardingDrafts).set({ postId: post.id, finishedAt: new Date(), media: [] }).where(eq(onboardingDrafts.agencyId, agencyId));
    return { postId: post.id, created: true };
  } catch (error) {
    // Give the draft back so the person can retry; the media is still there.
    await db.update(onboardingDrafts).set({ status: "in_progress" }).where(and(eq(onboardingDrafts.agencyId, agencyId), eq(onboardingDrafts.id, claimed.id)));
    throw error;
  }
}

/** After a finished project: a fresh draft for the next one, keeping the client when asked. */
export async function startAnotherProject(agency: Pick<Agency, "id" | "ownerUserId">, keepClient: boolean): Promise<OnboardingDraft> {
  const db = await getDb();
  const current = await ensureDraft(agency);
  const [row] = await db
    .update(onboardingDrafts)
    .set({
      status: "in_progress", step: keepClient && current.clientId ? 4 : 3, version: sql`${onboardingDrafts.version} + 1`,
      source: null, sourceUrl: null, suggestedClient: null, title: "", contribution: "", services: current.services, platforms: [], media: [], cover: 0, postId: null, finishedAt: null,
      clientMode: keepClient ? current.clientMode : null, clientId: keepClient ? current.clientId : null, updatedAt: new Date(), expiresAt: expiry(),
    })
    .where(eq(onboardingDrafts.agencyId, agency.id))
    .returning();
  return row;
}

export async function pauseDraft(agencyId: string) {
  const db = await getDb();
  await db.update(onboardingDrafts).set({ status: "paused", updatedAt: new Date() }).where(and(eq(onboardingDrafts.agencyId, agencyId), ne(onboardingDrafts.status, "finished")));
}

/** Unfinished drafts past their expiry lose their private media and row (the daily cron). Returns how many. */
export async function purgeExpiredDrafts(now = new Date()) {
  const db = await getDb();
  const rows = await db.delete(onboardingDrafts).where(and(ne(onboardingDrafts.status, "finished"), lt(onboardingDrafts.expiresAt, now))).returning({ media: onboardingDrafts.media });
  const keys = rows.flatMap((r) => r.media.flatMap((m) => [m.key, m.thumbKey]));
  if (keys.length) await storage().remove(keys).catch(() => {});
  return rows.length;
}

/** Whether the wizard should open for this provider by itself: a new page with nothing on it yet and no finished setup. */
export async function shouldOfferSetup(agency: Pick<Agency, "id" | "postCount">) {
  if (agency.postCount > 0) return false;
  const draft = await getDraft(agency.id);
  return !draft || draft.status !== "finished";
}

export const draftMediaUrl = (m: Pick<DraftMedia, "thumbKey">) => `/api/portfolio-media/${m.thumbKey}`;
