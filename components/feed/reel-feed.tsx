"use client";

import { ChevronsUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment, useEffect, useRef, useState } from "react";
import { ReelCard } from "@/components/post/reel-card";
import type { FeedFilters } from "@/lib/data/posts";
import type { FeedPage } from "@/lib/feed";
import { useFeedPages, useNearViewport } from "./feed-list";

/** Where the full-screen slot (between the header and the bottom bar) begins and how tall it is. */
function measure(root: HTMLElement) {
  const header = document.querySelector<HTMLElement>("[data-app-header]");
  const nav = document.querySelector<HTMLElement>("[data-app-nav]");
  const bar = document.querySelector<HTMLElement>("[data-reel-bar]");
  const headerH = header?.offsetHeight ?? 0;
  if (bar) bar.style.top = `${headerH}px`;
  const top = headerH + (bar?.offsetHeight ?? 0);
  const bottom = nav?.offsetHeight ?? 0;
  root.style.setProperty("--reel-top", `${top}px`);
  root.style.setProperty("--reel-h", `${Math.max(320, window.innerHeight - top - bottom)}px`);
}

/**
 * The phone feed (docs/38-feed.md): one post per screen, swipe up for the next,
 * snapping like TikTok. The page scrolls (so the header and bottom bar stay);
 * `interstitial` is a full-screen card shown after the third post (or the last, if fewer).
 */
export function ReelFeed({ initial, filters, interstitial }: { initial: FeedPage; filters: FeedFilters; interstitial?: React.ReactNode }) {
  const t = useTranslations("Feed");
  const { items, cursor, loadMore } = useFeedPages(initial, filters, "feed");
  // Two screens ahead, so the next posts are ready before the swipe reaches them.
  const sentinel = useNearViewport(loadMore, Boolean(cursor), "200% 0px");
  const root = useRef<HTMLDivElement>(null);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const html = document.documentElement;
    html.classList.add("reel-snap");
    const update = () => measure(el);
    update();
    window.addEventListener("resize", update);
    return () => {
      html.classList.remove("reel-snap");
      window.removeEventListener("resize", update);
    };
  }, []);

  // "Swipe up" once per session, until the first real swipe (the page's own
  // settling into the first snap point also fires scroll events, so small moves don't count).
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("sw-reel-hint") === "1";
    } catch {}
    if (seen) return;
    let start = window.scrollY;
    const show = setTimeout(() => {
      start = window.scrollY;
      setHint(true);
    }, 1200);
    const onScroll = () => {
      if (Math.abs(window.scrollY - start) < 80) return;
      clearTimeout(show);
      setHint(false);
      try {
        sessionStorage.setItem("sw-reel-hint", "1");
      } catch {}
      window.removeEventListener("scroll", onScroll);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(show);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div ref={root} data-testid="reel-feed">
      {items.map((post, i) => (
        <Fragment key={`${post.id}:${post.sponsored?.promotionId ?? ""}`}>
          <ReelCard post={post} priority={i === 0} />
          {i === Math.min(2, items.length - 1) && interstitial && (
            <section
              className="flex snap-start snap-always flex-col justify-center overflow-hidden bg-brand-soft px-6"
              style={{ height: "var(--reel-h, calc(100svh - 8rem))", scrollMarginTop: "var(--reel-top, 0px)" }}
              data-testid="reel-interstitial"
            >
              {interstitial}
            </section>
          )}
        </Fragment>
      ))}
      {cursor && <div ref={sentinel} className="h-px" aria-hidden />}
      {hint && (
        <p className="reel-hint pointer-events-none fixed inset-x-0 top-1/2 z-20 mx-auto flex w-fit items-center gap-1.5 rounded-full bg-black/70 px-4 py-2 text-sm font-medium text-white" role="status" data-testid="reel-hint">
          <ChevronsUp className="size-4" aria-hidden />
          {t("swipeHint")}
        </p>
      )}
    </div>
  );
}
