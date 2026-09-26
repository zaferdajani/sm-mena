"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { loadMorePosts } from "@/app/[locale]/(main)/actions";
import { PostCard } from "@/components/post/post-card";
import { PostGrid } from "@/components/post/post-grid";
import { Button } from "@/components/ui/button";
import type { FeedFilters } from "@/lib/data/posts";
import type { FeedPage } from "@/lib/feed";

/** The posts shown so far and a way to load the next page (infinite scroll). */
export function useFeedPages(initial: FeedPage, filters: FeedFilters, placement: "feed" | "explore" | null) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [pending, start] = useTransition();
  const loadMore = useCallback(() => {
    if (!cursor || pending) return;
    start(async () => {
      const page = await loadMorePosts(filters, cursor, placement);
      setItems((current) => {
        const seen = new Set(current.map((p) => `${p.id}:${p.sponsored?.promotionId ?? ""}`));
        return [...current, ...page.items.filter((p) => !seen.has(`${p.id}:${p.sponsored?.promotionId ?? ""}`))];
      });
      setCursor(page.nextCursor);
    });
  }, [cursor, pending, filters, placement]);
  return { items, cursor, pending, loadMore };
}

/** Calls `onVisible` when the element comes within `margin` of the viewport. */
export function useNearViewport(onVisible: () => void, active: boolean, margin = "600px") {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && onVisible(), { rootMargin: margin });
    observer.observe(el);
    return () => observer.disconnect();
  }, [active, onVisible, margin]);
  return ref;
}

/** Renders a page of posts and loads the next page when the end scrolls into view. */
export function FeedList({
  initial,
  filters = {},
  placement,
  layout = "cards",
}: {
  initial: FeedPage;
  filters?: FeedFilters;
  placement: "feed" | "explore" | null;
  layout?: "cards" | "grid";
}) {
  const tc = useTranslations("Common");
  const { items, cursor, pending, loadMore } = useFeedPages(initial, filters, placement);
  const sentinel = useNearViewport(loadMore, Boolean(cursor));

  return (
    <>
      {layout === "cards" ? (
        <div className="flex flex-col gap-0 sm:gap-6">
          {items.map((post, i) => (
            <PostCard key={`${post.id}:${post.sponsored?.promotionId ?? ""}`} post={post} priority={i === 0} />
          ))}
        </div>
      ) : (
        <PostGrid posts={items} sponsoredLabel={tc("sponsored")} />
      )}
      {cursor && (
        <div ref={sentinel} className="flex justify-center py-6">
          <Button variant="outline" onClick={loadMore} disabled={pending}>
            {pending ? tc("loading") : tc("loadMore")}
          </Button>
        </div>
      )}
    </>
  );
}
