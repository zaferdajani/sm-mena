"use client";

import { Heart, MessageCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { AgencyAvatar } from "@/components/agency-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { Link } from "@/i18n/navigation";
import type { FeedItem } from "@/lib/feed";
import { localizedPost } from "@/lib/content-lang";
import { timeAgo } from "@/lib/format";
import { serviceLabel } from "@/lib/labels";
import { SITE_URL } from "@/lib/site";
import { whatsappLink } from "@/lib/text";
import { trackPromotionClick } from "@/app/[locale]/(main)/actions";
import { BusinessTag } from "./business-tag";
import { ContactLink } from "./contact-link";
import { ImageCarousel } from "./image-carousel";
import { PostActions, useLike } from "./post-actions";

/**
 * One post filling the screen on the phone feed (TikTok-style, docs/36-feed.md):
 * the work edge to edge, the agency, business type and caption over a shade at
 * the bottom, and like, save and share in a column at the side. Double-tap likes.
 * Its height comes from `--reel-h`, set by ReelFeed.
 */
export function ReelCard({ post: raw, priority = false }: { post: FeedItem; priority?: boolean }) {
  const t = useTranslations("Post");
  const tc = useTranslations("Common");
  const tCity = useTranslations("Cities");
  const locale = useLocale();
  const post = localizedPost(raw, locale);
  const like = useLike(post.id, post.liked, post.likeCount);
  const [expanded, setExpanded] = useState(false);
  const [burst, setBurst] = useState(0);
  const promotionId = post.sponsored?.promotionId;
  const postHref = `/p/${post.id}`;
  const onPromoClick = promotionId ? () => void trackPromotionClick(promotionId).catch(() => {}) : undefined;
  const doubleTap = () => {
    like.toggle(true);
    setBurst((n) => n + 1);
  };

  return (
    <article
      className="relative snap-start snap-always overflow-hidden bg-black text-white"
      style={{ height: "var(--reel-h, calc(100svh - 8rem))", scrollMarginTop: "var(--reel-top, 0px)" }}
      data-testid="post-card"
      data-reel=""
    >
      <ImageCarousel images={post.images} alt={post.caption.slice(0, 80)} priority={priority} onDoubleTap={doubleTap} fill />
      {burst > 0 && <Heart key={burst} aria-hidden className="reel-burst pointer-events-none absolute inset-0 m-auto size-24 fill-white text-white" />}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

      <div className="absolute end-3 bottom-28 z-10 flex flex-col items-center gap-5">
        <Link href={`/a/${post.agency.handle}`} onClick={onPromoClick} aria-label={post.agency.name}>
          <AgencyAvatar name={post.agency.name} src={post.agency.avatarUrl} size={44} ring />
        </Link>
        <PostActions postId={post.id} like={like} saved={post.saved} shareUrl={`/${locale}${postHref}`} shareText={t("shareTitle")} variant="rail" />
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 space-y-2 pb-4 pe-20 ps-4 text-sm">
        <Link href={`/a/${post.agency.handle}`} onClick={onPromoClick} className="flex items-center gap-1 font-semibold drop-shadow">
          <bdi className="truncate">{post.agency.name}</bdi>
          {post.agency.isVerified && <VerifiedBadge label={tc("verified")} />}
          <span suppressHydrationWarning className="truncate text-xs font-normal text-white/75">· {promotionId ? tc("sponsored") : `${tCity(post.agency.city)} · ${timeAgo(post.createdAt, locale)}`}</span>
        </Link>
        <BusinessTag type={post.industry} className="bg-white/20 text-white backdrop-blur" />
        {post.caption && (
          <p className={expanded ? "max-h-40 overflow-y-auto" : "line-clamp-2"} onClick={() => setExpanded((e) => !e)} dir="auto">
            {post.caption}
          </p>
        )}
        {post.result && (
          <p className="inline-flex rounded-md bg-white/90 px-2 py-0.5 text-xs font-semibold text-black">
            📈 <bdi className="ms-1">{post.result}</bdi>
          </p>
        )}
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs font-medium text-white/90">
          {post.services.slice(0, 3).map((s) => (
            <Link key={s} href={{ pathname: "/explore", query: { service: s } }}>
              #{serviceLabel(s, locale).replace(/\s+/g, "_")}
            </Link>
          ))}
        </div>
        {post.agency.whatsapp && (
          <ContactLink
            agencyId={post.agency.id}
            channel="whatsapp"
            postId={post.id}
            promotionId={promotionId}
            href={whatsappLink(post.agency.whatsapp, `${t("whatsappMessage")} ${SITE_URL}/${locale}${postHref}`)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg"
          >
            <MessageCircle className="size-4" />
            {t("whatsapp")}
          </ContactLink>
        )}
      </div>
    </article>
  );
}
