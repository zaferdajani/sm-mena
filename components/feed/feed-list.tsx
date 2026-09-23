"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { loadMorePosts } from "@/app/[locale]/(main)/actions";
import { PostCard } from "@/components/post/post-card";
import { PostGrid } from "@/components/post/post-grid";
import { Button } from "@/components/ui/button";
import type { FeedFilters } from "@/lib/data/posts";
import type { FeedPage } from "@/lib/feed";

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
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [pending, start] = useTransition();
  const sentinel = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), { rootMargin: "600px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

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
