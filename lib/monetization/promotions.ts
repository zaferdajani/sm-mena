import "server-only";
import { and, eq, gt, inArray, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, events, promotions } from "@/lib/db/schema";
import { inCountry } from "@/lib/data/agency-filters";
import { getPostsByIds, type FeedFilters, type PostView } from "@/lib/data/posts";
import { PROMOTION_RULES } from "./plans";

type Placement = "feed" | "strip" | "explore";

/** Active promotions for a placement. Eligibility is checked at serve time. */
export async function activePromotions(placement: Placement, filters: FeedFilters = {}) {
  const db = await getDb();
  const now = new Date();
  const rows = await db
    .select({ promotion: promotions })
    .from(promotions)
    .innerJoin(agencies, eq(promotions.agencyId, agencies.id))
    .where(
      and(
        eq(promotions.placement, placement),
        eq(promotions.status, "active"),
        lte(promotions.startsAt, now),
        gt(promotions.endsAt, now),
        eq(agencies.status, "active"),
        filters.includeDemo ? undefined : eq(agencies.isDemo, false),
        // Sponsored slots stay in the visitor's country.
        filters.country ? inCountry(filters.country) : undefined,
      ),
    );
  return rows
    .map((r) => r.promotion)
    .filter((p) => (!p.service || p.service === filters.service) && (!p.city || p.city === filters.city))
    .filter((p) => !filters.agencyId || p.agencyId !== filters.agencyId);
}

async function countImpressions(ids: string[], visitorId: string | null) {
  if (!ids.length) return;
  const db = await getDb();
  await db.update(promotions).set({ impressions: sql`${promotions.impressions} + 1` }).where(inArray(promotions.id, ids));
  await db.insert(events).values(ids.map((promotionId) => ({ type: "promotion_impression" as const, promotionId, visitorId })));
}

/**
 * Inserts sponsored posts into a page of organic posts: one after every
 * `feedEvery` organic items in the feed, one at the top of explore results.
 * Never duplicates a post already on the page.
 */
export async function injectPromotions(
  items: PostView[],
  ctx: { placement: "feed" | "explore"; filters: FeedFilters; firstPage: boolean; visitorId: string | null },
): Promise<PostView[]> {
  if (!items.length) return items;
  const promos = (await activePromotions(ctx.placement, ctx.filters)).filter((p) => p.postId);
  if (!promos.length) return items;
  const onPage = new Set(items.map((p) => p.id));
  const shuffled = promos.sort(() => Math.random() - 0.5).filter((p) => !onPage.has(p.postId!));
  const slots = ctx.placement === "explore" ? (ctx.firstPage ? PROMOTION_RULES.exploreTop : 0) : Math.floor(items.length / PROMOTION_RULES.feedEvery);
  const chosen = shuffled.slice(0, slots);
  if (!chosen.length) return items;
  // Paid placement never overrides relevance: in a feed narrowed to one business
  // type, a sponsored post must be of that type too (docs/36-feed.md).
  const sponsoredPosts = (await getPostsByIds(chosen.map((p) => p.postId!))).filter((p) => !ctx.filters.industry || p.industry === ctx.filters.industry);
  if (!sponsoredPosts.length) return items;
  const byPost = new Map(chosen.map((p) => [p.postId!, p.id]));
  const sponsored = sponsoredPosts.map((p) => ({ ...p, sponsored: { promotionId: byPost.get(p.id)! } }));
  await countImpressions(sponsored.map((p) => p.sponsored.promotionId), ctx.visitorId);

  if (ctx.placement === "explore") return [...sponsored, ...items];
  const result: PostView[] = [];
  let next = 0;
  items.forEach((item, index) => {
    result.push(item);
    if ((index + 1) % PROMOTION_RULES.feedEvery === 0 && next < sponsored.length) result.push(sponsored[next++]);
  });
  return result;
}

export async function recordPromotionClick(promotionId: string, visitorId: string | null) {
  const db = await getDb();
  const [row] = await db
    .update(promotions)
    .set({ clicks: sql`${promotions.clicks} + 1` })
    .where(eq(promotions.id, promotionId))
    .returning({ agencyId: promotions.agencyId });
  if (row) await db.insert(events).values({ type: "promotion_click", promotionId, agencyId: row.agencyId, visitorId });
}
