import "server-only";
import { getFeed, type FeedFilters, type PostView } from "@/lib/data/posts";
import { visitorPostState } from "@/lib/data/interactions";
import { injectPromotions } from "@/lib/monetization/promotions";

export type FeedItem = PostView & { liked: boolean; saved: boolean };

export type FeedPage = { items: FeedItem[]; nextCursor: string | null };

/** One page of posts with the visitor's like/save state and sponsored slots. */
export async function feedPage(
  filters: FeedFilters,
  cursor: string | null,
  visitorId: string | null,
  options: { limit?: number; placement?: "feed" | "explore" | null } = {},
): Promise<FeedPage> {
  const { items, nextCursor } = await getFeed(filters, cursor, options.limit ?? 12);
  const withAds = options.placement
    ? await injectPromotions(items, { placement: options.placement, filters, firstPage: !cursor, visitorId })
    : items;
  return withState(withAds, visitorId, nextCursor);
}

export async function withState(items: PostView[], visitorId: string | null, nextCursor: string | null = null): Promise<FeedPage> {
  const state = await visitorPostState(visitorId, items.map((p) => p.id));
  return {
    items: items.map((p) => ({ ...p, liked: state.liked.has(p.id), saved: state.saved.has(p.id) })),
    nextCursor,
  };
}
