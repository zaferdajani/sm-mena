import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, auditLogs, type Agency } from "@/lib/db/schema";
import { monetizationEnabled } from "@/lib/monetization/plans";
import { mediaUrl } from "@/lib/storage";
import { normalizeForSearch } from "@/lib/text";

export type AgencyInput = {
  handle: string;
  name: string;
  bio?: string;
  city: string;
  services?: string[];
  platforms?: string[];
  industries?: string[];
  languages?: string[];
  startingPriceJod?: number | null;
  whatsapp?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  instagram?: string | null;
  foundedYear?: number | null;
  teamSize?: string | null;
};

export function agencySearchText(a: { name: string; handle: string; bio?: string | null }) {
  return normalizeForSearch(`${a.name} ${a.handle} ${a.bio ?? ""}`);
}

export async function createAgency(ownerUserId: string, input: AgencyInput, extra: Partial<Agency> = {}) {
  const db = await getDb();
  const [row] = await db
    .insert(agencies)
    .values({
      ...input,
      ...extra,
      handle: input.handle.toLowerCase(),
      ownerUserId,
      searchText: agencySearchText(input),
    })
    .returning();
  return row;
}

export async function updateAgency(agencyId: string, input: Partial<AgencyInput> & { avatarKey?: string | null }) {
  const db = await getDb();
  const [current] = await db.select().from(agencies).where(eq(agencies.id, agencyId));
  if (!current) return null;
  const merged = { ...current, ...input };
  const [row] = await db
    .update(agencies)
    .set({
      ...input,
      ...(input.handle ? { handle: input.handle.toLowerCase() } : {}),
      searchText: agencySearchText(merged),
      updatedAt: new Date(),
    })
    .where(eq(agencies.id, agencyId))
    .returning();
  return row;
}

export async function getAgencyByHandle(handle: string, { includeSuspended = false } = {}) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(agencies)
    .where(
      includeSuspended
        ? eq(agencies.handle, handle.toLowerCase())
        : and(eq(agencies.handle, handle.toLowerCase()), eq(agencies.status, "active")),
    );
  return row ?? null;
}

export async function getAgencyByOwner(userId: string) {
  const db = await getDb();
  const [row] = await db.select().from(agencies).where(eq(agencies.ownerUserId, userId));
  return row ?? null;
}

export async function isHandleTaken(handle: string, exceptAgencyId?: string) {
  const db = await getDb();
  const [row] = await db
    .select({ id: agencies.id })
    .from(agencies)
    .where(eq(agencies.handle, handle.toLowerCase()));
  return Boolean(row && row.id !== exceptAgencyId);
}

export type AgencySummary = {
  id: string;
  handle: string;
  name: string;
  city: string;
  avatarUrl: string | null;
  isVerified: boolean;
  plan: Agency["plan"];
  postCount: number;
  followerCount: number;
  services: string[];
  startingPriceJod: number | null;
  whatsapp: string | null;
  ratingAverage: number | null;
  ratingCount: number;
  googleRating: number | null;
  googleRatingCount: number | null;
};

export function toSummary(a: Agency): AgencySummary {
  return {
    id: a.id,
    handle: a.handle,
    name: a.name,
    city: a.city,
    avatarUrl: mediaUrl(a.avatarKey),
    isVerified: a.isVerified,
    plan: a.plan,
    postCount: a.postCount,
    followerCount: a.followerCount,
    services: a.services,
    startingPriceJod: a.startingPriceJod,
    whatsapp: a.whatsapp,
    ratingAverage: a.ratingCount ? Math.round((a.ratingSum / a.ratingCount) * 10) / 10 : null,
    ratingCount: a.ratingCount,
    googleRating: a.googleRating,
    googleRatingCount: a.googleRatingCount,
  };
}

/** Agencies for the stories-style strip: those that posted most recently. */
export async function listStripAgencies(limit = 20): Promise<AgencySummary[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(agencies)
    .where(and(eq(agencies.status, "active"), sql`${agencies.postCount} > 0`))
    .orderBy(
      desc(sql`(select max(p.created_at) from posts p where p.agency_id = ${agencies.id} and p.status = 'published')`),
    )
    .limit(limit);
  return rows.map(toSummary);
}

export async function listAgencies(filters: {
  q?: string;
  service?: string;
  city?: string;
  verified?: boolean;
  limit?: number;
}): Promise<AgencySummary[]> {
  const db = await getDb();
  const conditions = [eq(agencies.status, "active")];
  if (filters.service) conditions.push(sql`${filters.service} = any(${agencies.services})`);
  if (filters.city) conditions.push(eq(agencies.city, filters.city));
  if (filters.verified) conditions.push(eq(agencies.isVerified, true));
  if (filters.q) {
    conditions.push(sql`${agencies.searchText} like ${`%${normalizeForSearch(filters.q)}%`}`);
  }
  const rows = await db
    .select()
    .from(agencies)
    .where(and(...conditions))
    .orderBy(
      desc(agencies.isVerified),
      // Paid plans get a ranking boost only once monetization is switched on.
      ...(monetizationEnabled() ? [desc(sql`case ${agencies.plan} when 'business' then 2 when 'pro' then 1 else 0 end`)] : []),
      desc(agencies.followerCount),
      desc(agencies.postCount),
    )
    .limit(filters.limit ?? 30);
  return rows.map(toSummary);
}

export async function audit(actorUserId: string | null, action: string, entity: string, entityId?: string, meta: Record<string, unknown> = {}) {
  const db = await getDb();
  await db.insert(auditLogs).values({ actorUserId, action, entity, entityId, meta });
}
