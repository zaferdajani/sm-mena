import { and, arrayOverlaps, asc, desc, eq, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import { agencyConditions, inCountry } from "@/lib/data/agency-filters";
import { getDb } from "@/lib/db";
import { agencies, postImages, posts, type Agency } from "@/lib/db/schema";
import { newImageKeys, processImage, STORED_TYPE, type ProcessedImage } from "@/lib/images";
import { mediaUrl, storage } from "@/lib/storage";
import { normalizeForSearch } from "@/lib/text";

export type PostInput = {
  caption: string;
  services: string[];
  platforms: string[];
  industry?: string | null;
  result?: string | null;
  /** Portfolio client this work was for (lib/data/portfolio-clients.ts); checked by the caller. */
  clientId?: string | null;
};

export type FeedFilters = {
  q?: string;
  service?: string;
  city?: string;
  /** Agencies based in this country (lib/countries.ts). */
  country?: string;
  /** Any of these platforms. */
  platforms?: string[];
  industry?: string;
  /** Monthly budget range in JOD. */
  minPrice?: number;
  maxPrice?: number;
  /** Agencies that cover content, paid media and branding. */
  fullService?: boolean;
  verified?: boolean;
  agencyId?: string;
  /** The visitor chose the demo view (lib/demo-mode.ts); set on the server only. */
  includeDemo?: boolean;
};

export type ImageView = { url: string; thumbUrl: string; width: number; height: number; color: string; alt: string };

export type PostView = {
  id: string;
  caption: string;
  services: string[];
  platforms: string[];
  industry: string | null;
  result: string | null;
  /** Portfolio client this work was for, if tagged. */
  clientId: string | null;
  likeCount: number;
  saveCount: number;
  viewCount: number;
  createdAt: string;
  status: "published" | "hidden";
  images: ImageView[];
  agency: {
    id: string;
    handle: string;
    name: string;
    city: string;
    avatarUrl: string | null;
    isVerified: boolean;
    isDemo: boolean;
    whatsapp: string | null;
  };
  sponsored?: { promotionId: string };
  pinned?: boolean;
};

/** Creates a post from raw image buffers (already validated for count). */
export async function createPost(agencyId: string, input: PostInput, files: Buffer[]) {
  // Side by side: each image runs its own quality search (lib/images.ts).
  const processed: ProcessedImage[] = await Promise.all(files.map((file) => processImage(file)));
  return createPostFromProcessed(agencyId, input, processed);
}

export async function createPostFromProcessed(
  agencyId: string,
  input: PostInput,
  processed: ProcessedImage[],
  createdAt?: Date,
) {
  const db = await getDb();
  const [agency] = await db.select({ name: agencies.name }).from(agencies).where(eq(agencies.id, agencyId));
  const uploaded: { key: string; thumbKey: string; image: ProcessedImage }[] = [];
  for (const image of processed) {
    const format = image.fullFormat ?? "webp";
    const keys = newImageKeys(agencyId, format);
    await storage().put(keys.key, image.full, STORED_TYPE[format]);
    await storage().put(keys.thumbKey, image.thumb, "image/webp");
    uploaded.push({ ...keys, image });
  }
  return db.transaction(async (tx) => {
    const [post] = await tx
      .insert(posts)
      .values({
        agencyId,
        caption: input.caption,
        services: input.services,
        platforms: input.platforms,
        industry: input.industry ?? null,
        result: input.result ?? null,
        clientId: input.clientId ?? null,
        searchText: normalizeForSearch(`${input.caption} ${agency?.name ?? ""}`),
        ...(createdAt ? { createdAt } : {}),
      })
      .returning();
    await tx.insert(postImages).values(
      uploaded.map((u, position) => ({
        postId: post.id,
        position,
        key: u.key,
        thumbKey: u.thumbKey,
        width: u.image.width,
        height: u.image.height,
        color: u.image.color,
      })),
    );
    await tx
      .update(agencies)
      .set({ postCount: sql`${agencies.postCount} + 1` })
      .where(eq(agencies.id, agencyId));
    return post;
  });
}

export async function updatePost(postId: string, agencyId: string, input: PostInput) {
  const db = await getDb();
  const [agency] = await db.select({ name: agencies.name }).from(agencies).where(eq(agencies.id, agencyId));
  const [row] = await db
    .update(posts)
    .set({ ...input, searchText: normalizeForSearch(`${input.caption} ${agency?.name ?? ""}`) })
    .where(and(eq(posts.id, postId), eq(posts.agencyId, agencyId)))
    .returning();
  return row ?? null;
}

export async function deletePost(postId: string, agencyId: string) {
  const db = await getDb();
  const images = await db.select().from(postImages).where(eq(postImages.postId, postId));
  const deleted = await db.transaction(async (tx) => {
    const rows = await tx
      .delete(posts)
      .where(and(eq(posts.id, postId), eq(posts.agencyId, agencyId)))
      .returning({ id: posts.id, status: posts.status });
    if (rows.length) {
      await tx
        .update(agencies)
        .set({ postCount: sql`greatest(${agencies.postCount} - 1, 0)` })
        .where(eq(agencies.id, agencyId));
    }
    return rows.length > 0;
  });
  if (deleted) await storage().remove(images.flatMap((i) => [i.key, i.thumbKey]));
  return deleted;
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

type Cursor = { t: string; id: string };

export function encodeCursor(c: Cursor) {
  return Buffer.from(JSON.stringify(c)).toString("base64url");
}

export function decodeCursor(value: string | undefined | null): Cursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (typeof parsed.t === "string" && typeof parsed.id === "string" && !Number.isNaN(Date.parse(parsed.t))) {
      return parsed;
    }
  } catch {}
  return null;
}

function filterConditions(filters: FeedFilters): SQL[] {
  const c: SQL[] = [eq(posts.status, "published"), eq(agencies.status, "active")];
  if (filters.agencyId) c.push(eq(posts.agencyId, filters.agencyId));
  // Demo work only in the demo view (an agency's own page always shows its posts).
  else if (!filters.includeDemo) c.push(eq(agencies.isDemo, false));
  if (filters.service) c.push(sql`${filters.service} = any(${posts.services})`);
  if (filters.platforms?.length) c.push(arrayOverlaps(posts.platforms, filters.platforms));
  if (filters.industry) c.push(eq(posts.industry, filters.industry));
  if (filters.country) c.push(inCountry(filters.country));
  if (filters.city) c.push(eq(agencies.city, filters.city));
  if (filters.verified) c.push(eq(agencies.isVerified, true));
  c.push(...agencyConditions(filters, { platformsOnAgency: false }));
  if (filters.q) {
    const like = `%${normalizeForSearch(filters.q)}%`;
    c.push(or(sql`${posts.searchText} like ${like}`, sql`${agencies.searchText} like ${like}`)!);
  }
  return c;
}

function agencyView(a: Agency): PostView["agency"] {
  return {
    id: a.id,
    handle: a.handle,
    name: a.name,
    city: a.city,
    avatarUrl: mediaUrl(a.avatarKey),
    isVerified: a.isVerified,
    isDemo: a.isDemo,
    whatsapp: a.whatsapp,
  };
}

async function attachImages(rows: { post: typeof posts.$inferSelect; agency: Agency }[]): Promise<PostView[]> {
  if (!rows.length) return [];
  const db = await getDb();
  const images = await db
    .select()
    .from(postImages)
    .where(inArray(postImages.postId, rows.map((r) => r.post.id)))
    .orderBy(asc(postImages.position));
  const byPost = new Map<string, ImageView[]>();
  for (const i of images) {
    const list = byPost.get(i.postId) ?? [];
    list.push({
      url: mediaUrl(i.key)!,
      thumbUrl: mediaUrl(i.thumbKey)!,
      width: i.width,
      height: i.height,
      color: i.color,
      alt: i.alt,
    });
    byPost.set(i.postId, list);
  }
  return rows.map(({ post, agency }) => ({
    id: post.id,
    caption: post.caption,
    services: post.services,
    platforms: post.platforms,
    industry: post.industry,
    result: post.result,
    clientId: post.clientId,
    likeCount: post.likeCount,
    saveCount: post.saveCount,
    viewCount: post.viewCount,
    createdAt: post.createdAt.toISOString(),
    status: post.status,
    images: byPost.get(post.id) ?? [],
    agency: agencyView(agency),
  }));
}

/** Newest-first page of posts. Cursor paging (createdAt, id) never repeats or skips. */
export async function getFeed(
  filters: FeedFilters,
  cursor: string | null | undefined,
  limit = 12,
): Promise<{ items: PostView[]; nextCursor: string | null }> {
  const db = await getDb();
  const conditions = filterConditions(filters);
  // On an agency's own grid, pinned posts come first (page one only) and are
  // excluded from the chronological pages so they never repeat.
  const onProfile = Boolean(filters.agencyId && !filters.q && !filters.service && !filters.platforms?.length);
  if (onProfile) conditions.push(sql`${posts.pinnedAt} is null`);
  const c = decodeCursor(cursor);
  if (c) {
    const t = new Date(c.t);
    conditions.push(or(lt(posts.createdAt, t), and(eq(posts.createdAt, t), lt(posts.id, c.id)))!);
  }
  const rows = await db
    .select({ post: posts, agency: agencies })
    .from(posts)
    .innerJoin(agencies, eq(posts.agencyId, agencies.id))
    .where(and(...conditions))
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const pinned = onProfile && !c ? await pinnedPosts(filters.agencyId!) : [];
  return {
    items: [...pinned, ...(await attachImages(page))],
    nextCursor: rows.length > limit && last ? encodeCursor({ t: last.post.createdAt.toISOString(), id: last.post.id }) : null,
  };
}

async function pinnedPosts(agencyId: string): Promise<PostView[]> {
  const db = await getDb();
  const rows = await db
    .select({ post: posts, agency: agencies })
    .from(posts)
    .innerJoin(agencies, eq(posts.agencyId, agencies.id))
    .where(and(eq(posts.agencyId, agencyId), eq(posts.status, "published"), sql`${posts.pinnedAt} is not null`))
    .orderBy(desc(posts.pinnedAt));
  return (await attachImages(rows)).map((p) => ({ ...p, pinned: true }));
}

export async function getPostsByIds(ids: string[]): Promise<PostView[]> {
  if (!ids.length) return [];
  const db = await getDb();
  const rows = await db
    .select({ post: posts, agency: agencies })
    .from(posts)
    .innerJoin(agencies, eq(posts.agencyId, agencies.id))
    .where(and(inArray(posts.id, ids), eq(posts.status, "published"), eq(agencies.status, "active")));
  const views = await attachImages(rows);
  const order = new Map(ids.map((id, i) => [id, i]));
  return views.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

/** A single post. Hidden posts are only returned to their owner (ownerAgencyId). */
export async function getPost(postId: string, ownerAgencyId?: string): Promise<PostView | null> {
  const db = await getDb();
  if (!/^[0-9a-f-]{36}$/i.test(postId)) return null;
  const [row] = await db
    .select({ post: posts, agency: agencies })
    .from(posts)
    .innerJoin(agencies, eq(posts.agencyId, agencies.id))
    .where(eq(posts.id, postId));
  if (!row) return null;
  const isOwner = ownerAgencyId === row.agency.id;
  if (!isOwner && (row.post.status !== "published" || row.agency.status !== "active")) return null;
  const [view] = await attachImages([row]);
  return view;
}

/** All posts of one agency for the studio, including hidden ones. */
export async function getAgencyPostsForOwner(agencyId: string): Promise<PostView[]> {
  const db = await getDb();
  const rows = await db
    .select({ post: posts, agency: agencies })
    .from(posts)
    .innerJoin(agencies, eq(posts.agencyId, agencies.id))
    .where(eq(posts.agencyId, agencyId))
    .orderBy(desc(sql`${posts.pinnedAt} is not null`), desc(posts.pinnedAt), desc(posts.createdAt));
  const pinnedIds = new Set(rows.filter((r) => r.post.pinnedAt).map((r) => r.post.id));
  return (await attachImages(rows)).map((p) => ({ ...p, pinned: pinnedIds.has(p.id) }));
}

export const MAX_PINNED = 3;

/** Pins or unpins a post on the agency's profile grid (max three pinned). */
export async function togglePin(agencyId: string, postId: string): Promise<{ pinned: boolean } | { error: "limit" | "not_found" }> {
  const db = await getDb();
  const [post] = await db.select({ pinnedAt: posts.pinnedAt }).from(posts).where(and(eq(posts.id, postId), eq(posts.agencyId, agencyId)));
  if (!post) return { error: "not_found" };
  if (post.pinnedAt) {
    await db.update(posts).set({ pinnedAt: null }).where(eq(posts.id, postId));
    return { pinned: false };
  }
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(posts).where(and(eq(posts.agencyId, agencyId), sql`${posts.pinnedAt} is not null`));
  if (n >= MAX_PINNED) return { error: "limit" };
  await db.update(posts).set({ pinnedAt: new Date() }).where(eq(posts.id, postId));
  return { pinned: true };
}
