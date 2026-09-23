import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, events, follows, inquiries, likes, posts, reports, saves } from "@/lib/db/schema";
import { CONSENT_VERSION } from "./users";

type Channel = "whatsapp" | "phone" | "email" | "website" | "instagram";

/** Toggles a like; returns the new state and count. */
export async function toggleLike(postId: string, visitorId: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [post] = await tx.select({ agencyId: posts.agencyId }).from(posts).where(and(eq(posts.id, postId), eq(posts.status, "published")));
    if (!post) return null;
    const inserted = await tx.insert(likes).values({ postId, visitorId }).onConflictDoNothing().returning();
    const liked = inserted.length > 0;
    if (!liked) await tx.delete(likes).where(and(eq(likes.postId, postId), eq(likes.visitorId, visitorId)));
    const [row] = await tx
      .update(posts)
      .set({ likeCount: liked ? sql`${posts.likeCount} + 1` : sql`greatest(${posts.likeCount} - 1, 0)` })
      .where(eq(posts.id, postId))
      .returning({ likeCount: posts.likeCount });
    if (liked) await tx.insert(events).values({ type: "like", agencyId: post.agencyId, postId, visitorId });
    return { liked, count: row.likeCount };
  });
}

export async function toggleSave(postId: string, visitorId: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [post] = await tx.select({ agencyId: posts.agencyId }).from(posts).where(and(eq(posts.id, postId), eq(posts.status, "published")));
    if (!post) return null;
    const inserted = await tx.insert(saves).values({ postId, visitorId }).onConflictDoNothing().returning();
    const saved = inserted.length > 0;
    if (!saved) await tx.delete(saves).where(and(eq(saves.postId, postId), eq(saves.visitorId, visitorId)));
    await tx
      .update(posts)
      .set({ saveCount: saved ? sql`${posts.saveCount} + 1` : sql`greatest(${posts.saveCount} - 1, 0)` })
      .where(eq(posts.id, postId));
    if (saved) await tx.insert(events).values({ type: "save", agencyId: post.agencyId, postId, visitorId });
    return { saved };
  });
}

export async function toggleFollow(agencyId: string, visitorId: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [agency] = await tx.select({ id: agencies.id }).from(agencies).where(and(eq(agencies.id, agencyId), eq(agencies.status, "active")));
    if (!agency) return null;
    const inserted = await tx.insert(follows).values({ agencyId, visitorId }).onConflictDoNothing().returning();
    const following = inserted.length > 0;
    if (!following) await tx.delete(follows).where(and(eq(follows.agencyId, agencyId), eq(follows.visitorId, visitorId)));
    const [row] = await tx
      .update(agencies)
      .set({ followerCount: following ? sql`${agencies.followerCount} + 1` : sql`greatest(${agencies.followerCount} - 1, 0)` })
      .where(eq(agencies.id, agencyId))
      .returning({ followerCount: agencies.followerCount });
    if (following) await tx.insert(events).values({ type: "follow", agencyId, visitorId });
    return { following, count: row.followerCount };
  });
}

export async function visitorPostState(visitorId: string | null, postIds: string[]) {
  if (!visitorId || !postIds.length) return { liked: new Set<string>(), saved: new Set<string>() };
  const db = await getDb();
  const [likedRows, savedRows] = await Promise.all([
    db.select({ id: likes.postId }).from(likes).where(and(eq(likes.visitorId, visitorId), inArray(likes.postId, postIds))),
    db.select({ id: saves.postId }).from(saves).where(and(eq(saves.visitorId, visitorId), inArray(saves.postId, postIds))),
  ]);
  return { liked: new Set(likedRows.map((r) => r.id)), saved: new Set(savedRows.map((r) => r.id)) };
}

export async function isFollowing(visitorId: string | null, agencyId: string) {
  if (!visitorId) return false;
  const db = await getDb();
  const [row] = await db.select().from(follows).where(and(eq(follows.visitorId, visitorId), eq(follows.agencyId, agencyId)));
  return Boolean(row);
}

export async function savedPostIds(visitorId: string, limit = 60) {
  const db = await getDb();
  const rows = await db.select({ id: saves.postId }).from(saves).where(eq(saves.visitorId, visitorId)).orderBy(desc(saves.createdAt)).limit(limit);
  return rows.map((r) => r.id);
}

export async function followedAgencyIds(visitorId: string, limit = 60) {
  const db = await getDb();
  const rows = await db.select({ id: follows.agencyId }).from(follows).where(eq(follows.visitorId, visitorId)).orderBy(desc(follows.createdAt)).limit(limit);
  return rows.map((r) => r.id);
}

const DAY = 24 * 3600 * 1000;

/** Counts a profile or post view once per visitor per day. */
export async function recordView(kind: "profile_view" | "post_view", agencyId: string, postId: string | null, visitorId: string | null) {
  const db = await getDb();
  if (visitorId) {
    const conditions = [eq(events.visitorId, visitorId), eq(events.type, kind), eq(events.agencyId, agencyId), gt(events.createdAt, new Date(Date.now() - DAY))];
    if (postId) conditions.push(eq(events.postId, postId));
    const [seen] = await db.select({ id: events.id }).from(events).where(and(...conditions)).limit(1);
    if (seen) return false;
  }
  await db.insert(events).values({ type: kind, agencyId, postId, visitorId });
  if (kind === "post_view" && postId) {
    await db.update(posts).set({ viewCount: sql`${posts.viewCount} + 1` }).where(eq(posts.id, postId));
  }
  return true;
}

/** Counts a contact click once per visitor, agency and channel per hour. */
export async function recordContact(agencyId: string, channel: Channel, postId: string | null, visitorId: string | null) {
  const db = await getDb();
  if (visitorId) {
    const [seen] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.visitorId, visitorId), eq(events.type, "contact_click"), eq(events.agencyId, agencyId), eq(events.channel, channel), gt(events.createdAt, new Date(Date.now() - 3600 * 1000))))
      .limit(1);
    if (seen) return false;
  }
  await db.insert(events).values({ type: "contact_click", agencyId, postId, channel, visitorId });
  return true;
}

export async function createInquiry(input: {
  agencyId: string;
  postId?: string | null;
  name: string;
  phone: string;
  businessName?: string | null;
  service?: string | null;
  message: string;
  visitorId: string | null;
}) {
  const db = await getDb();
  const [row] = await db.insert(inquiries).values({ ...input, consentVersion: CONSENT_VERSION }).returning();
  await db.insert(events).values({ type: "inquiry", agencyId: input.agencyId, postId: input.postId ?? null, visitorId: input.visitorId });
  return row;
}

export async function createReport(input: {
  postId?: string | null;
  agencyId?: string | null;
  reason: "spam" | "stolen_work" | "misleading" | "inappropriate" | "other";
  details: string;
  visitorId: string | null;
}) {
  const db = await getDb();
  const [row] = await db.insert(reports).values(input).returning();
  return row;
}
