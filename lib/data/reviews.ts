import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, contracts, escrowLedger, inquiries, reviewRequests, reviews, type Review } from "@/lib/db/schema";
import { CONSENT_VERSION } from "./users";

export { reviewProvenance, type ReviewProvenance } from "@/lib/reviews/provenance";

const DAY = 24 * 3600 * 1000;
export const INVITE_DAYS = 30;
/** Days after contacting an agency before a visitor may review it (anti-fake). */
export const REVIEW_AFTER_INQUIRY_DAYS = Number(process.env.REVIEW_MIN_DAYS ?? 3);

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type RatingSummary = { average: number | null; count: number };

export function ratingSummary(a: { ratingSum: number; ratingCount: number }): RatingSummary {
  return { average: a.ratingCount ? Math.round((a.ratingSum / a.ratingCount) * 10) / 10 : null, count: a.ratingCount };
}

/** Creates a single-use review link for a client. Returns the raw token (shown once). */
export async function createReviewInvite(agencyId: string, clientName: string) {
  const db = await getDb();
  const token = randomBytes(18).toString("base64url");
  const [row] = await db
    .insert(reviewRequests)
    .values({ agencyId, tokenHash: hashToken(token), clientName: clientName.slice(0, 80), expiresAt: new Date(Date.now() + INVITE_DAYS * DAY) })
    .returning();
  return { token, request: row };
}

export async function listReviewInvites(agencyId: string) {
  const db = await getDb();
  return db.select().from(reviewRequests).where(eq(reviewRequests.agencyId, agencyId)).orderBy(desc(reviewRequests.createdAt)).limit(50);
}

/** A completed contract with live protected payments and money paid out to the agency. */
export async function isPaidCompletedContract(contractId: string) {
  const db = await getDb();
  const [c] = await db.select({ status: contracts.status, live: contracts.paymentsLive, mode: contracts.paymentMode }).from(contracts).where(eq(contracts.id, contractId));
  if (!c || c.status !== "completed" || c.mode !== "protected" || !c.live) return false;
  const [paid] = await db
    .select({ n: sql<number>`coalesce(sum(${escrowLedger.amountFils}), 0)::int` })
    .from(escrowLedger)
    .where(and(eq(escrowLedger.contractId, contractId), eq(escrowLedger.type, "release"), eq(escrowLedger.status, "succeeded")));
  return (paid?.n ?? 0) > 0;
}

/** Resolves an invite token to its agency if unused and unexpired. */
export async function resolveInvite(token: string) {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return null;
  const db = await getDb();
  const [row] = await db
    .select({ request: reviewRequests, agency: agencies })
    .from(reviewRequests)
    .innerJoin(agencies, eq(reviewRequests.agencyId, agencies.id))
    .where(and(eq(reviewRequests.tokenHash, hashToken(token)), isNull(reviewRequests.usedAt), gt(reviewRequests.expiresAt, new Date()), eq(agencies.status, "active")));
  return row ?? null;
}

/** A visitor may review an agency they contacted through Sawwiq at least N days ago, once. */
export async function canReviewAfterInquiry(visitorId: string | null, agencyId: string) {
  if (!visitorId) return false;
  const db = await getDb();
  const [existing] = await db.select({ id: reviews.id }).from(reviews).where(and(eq(reviews.agencyId, agencyId), eq(reviews.visitorId, visitorId)));
  if (existing) return false;
  const [inq] = await db
    .select({ id: inquiries.id })
    .from(inquiries)
    .where(and(eq(inquiries.agencyId, agencyId), eq(inquiries.visitorId, visitorId), lte(inquiries.createdAt, new Date(Date.now() - REVIEW_AFTER_INQUIRY_DAYS * DAY))))
    .limit(1);
  return Boolean(inq);
}

export type ReviewInput = {
  rating: number;
  quality?: number | null;
  communication?: number | null;
  value?: number | null;
  timeliness?: number | null;
  results?: number | null;
  body: string;
  reviewerName: string;
  reviewerBusiness?: string | null;
  service?: string | null;
  visitorId: string | null;
};

async function insertReview(agencyId: string, source: Review["source"], input: ReviewInput, requestId: string | null, contractId: string | null = null) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (requestId) {
      const used = await tx
        .update(reviewRequests)
        .set({ usedAt: new Date() })
        .where(and(eq(reviewRequests.id, requestId), isNull(reviewRequests.usedAt)))
        .returning({ id: reviewRequests.id });
      if (!used.length) return null; // link already used (double submit)
    }
    const [review] = await tx
      .insert(reviews)
      .values({ agencyId, requestId, source, contractId, ...input, consentVersion: CONSENT_VERSION })
      .onConflictDoNothing()
      .returning();
    if (!review) return null;
    await tx
      .update(agencies)
      .set({ ratingSum: sql`${agencies.ratingSum} + ${input.rating}`, ratingCount: sql`${agencies.ratingCount} + 1` })
      .where(eq(agencies.id, agencyId));
    return review;
  });
}

export async function submitInviteReview(token: string, input: ReviewInput) {
  const invite = await resolveInvite(token);
  if (!invite) return null;
  const contractId = invite.request.contractId;
  // "Completed project (via Sawwiq)" only when backed by a completed, paid contract.
  if (contractId && (await isPaidCompletedContract(contractId))) return insertReview(invite.agency.id, "contract", input, invite.request.id, contractId);
  return insertReview(invite.agency.id, "invite", input, invite.request.id);
}

export async function submitInquiryReview(agencyId: string, input: ReviewInput) {
  if (!(await canReviewAfterInquiry(input.visitorId, agencyId))) return null;
  return insertReview(agencyId, "inquiry", input, null);
}

export async function listReviews(agencyId: string, { includeHidden = false, limit = 50 } = {}) {
  const db = await getDb();
  return db
    .select()
    .from(reviews)
    .where(includeHidden ? eq(reviews.agencyId, agencyId) : and(eq(reviews.agencyId, agencyId), eq(reviews.status, "published")))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
}

/** Average sub-scores for the profile breakdown. */
export async function subScores(agencyId: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      quality: sql<number | null>`round(avg(${reviews.quality})::numeric, 1)`,
      communication: sql<number | null>`round(avg(${reviews.communication})::numeric, 1)`,
      value: sql<number | null>`round(avg(${reviews.value})::numeric, 1)`,
      timeliness: sql<number | null>`round(avg(${reviews.timeliness})::numeric, 1)`,
      results: sql<number | null>`round(avg(${reviews.results})::numeric, 1)`,
    })
    .from(reviews)
    .where(and(eq(reviews.agencyId, agencyId), eq(reviews.status, "published")));
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v === null ? null : Number(v)])) as Record<"quality" | "communication" | "value" | "timeliness" | "results", number | null>;
}

export async function replyToReview(agencyId: string, reviewId: string, reply: string) {
  const db = await getDb();
  const rows = await db
    .update(reviews)
    .set({ reply: reply.trim().slice(0, 1000) || null, repliedAt: reply.trim() ? new Date() : null })
    .where(and(eq(reviews.id, reviewId), eq(reviews.agencyId, agencyId)))
    .returning({ id: reviews.id });
  return rows.length > 0;
}

/** Admin moderation: hiding removes the review from the average. */
export async function setReviewStatus(reviewId: string, status: Review["status"]) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(reviews).where(eq(reviews.id, reviewId));
    if (!current || current.status === status) return false;
    await tx.update(reviews).set({ status }).where(eq(reviews.id, reviewId));
    const delta = status === "hidden" ? -1 : 1;
    await tx
      .update(agencies)
      .set({
        ratingSum: sql`greatest(${agencies.ratingSum} + ${delta * current.rating}, 0)`,
        ratingCount: sql`greatest(${agencies.ratingCount} + ${delta}, 0)`,
      })
      .where(eq(agencies.id, current.agencyId));
    return true;
  });
}

export async function recentReviewsForAdmin(limit = 100) {
  const db = await getDb();
  return db
    .select({ review: reviews, handle: agencies.handle, name: agencies.name })
    .from(reviews)
    .innerJoin(agencies, eq(reviews.agencyId, agencies.id))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
}
