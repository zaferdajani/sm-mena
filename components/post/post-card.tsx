"use client";

import { ChevronLeft, MessageCircle } from "lucide-react";
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

export function PostCard({ post: raw, priority = false, linkToPost = true }: { post: FeedItem; priority?: boolean; linkToPost?: boolean }) {
  const t = useTranslations("Post");
  const tc = useTranslations("Common");
  const tCity = useTranslations("Cities");
  const locale = useLocale();
  // Caption, result and agency name in the reader's language when the agency wrote it (lib/content-lang.ts).
  const post = localizedPost(raw, locale);
  const like = useLike(post.id, post.liked, post.likeCount);
  const [expanded, setExpanded] = useState(false);
  const promotionId = post.sponsored?.promotionId;
  const postHref = `/p/${post.id}`;
  const onPromoClick = promotionId ? () => void trackPromotionClick(promotionId).catch(() => {}) : undefined;

  return (
    <article className="border-b bg-card sm:rounded-xl sm:border" data-testid="post-card">
      <header className="flex items-center gap-3 px-3 py-2.5">
        <Link href={`/a/${post.agency.handle}`} className="shrink-0" onClick={onPromoClick}>
          <AgencyAvatar name={post.agency.name} src={post.agency.avatarUrl} size={36} ring />
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <Link href={`/a/${post.agency.handle}`} className="flex items-center gap-1 text-sm font-semibold" onClick={onPromoClick}>
            <span className="truncate">{post.agency.name}</span>
            {post.agency.isVerified && <VerifiedBadge label={tc("verified")} />}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {promotionId ? tc("sponsored") : `${tCity(post.agency.city)} · ${timeAgo(post.createdAt, locale)}`}
          </p>
        </div>
      </header>

      <ImageCarousel images={post.images} alt={post.caption.slice(0, 80)} priority={priority} onDoubleTap={() => like.toggle(true)} />

      {post.agency.whatsapp && (
        <ContactLink
          agencyId={post.agency.id}
          channel="whatsapp"
          postId={post.id}
          promotionId={promotionId}
          href={whatsappLink(post.agency.whatsapp, `${t("whatsappMessage")} ${SITE_URL}/${locale}${postHref}`)}
          className="flex items-center justify-between bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
        >
          <span className="flex items-center gap-2">
            <MessageCircle className="size-4" />
            {t("whatsapp")}
          </span>
          <ChevronLeft className="size-4 ltr:rotate-180" />
        </ContactLink>
      )}

      <PostActions postId={post.id} like={like} saved={post.saved} shareUrl={`/${locale}${postHref}`} shareText={t("shareTitle")} />

      <div className="space-y-1.5 px-3 pb-3 text-sm">
        <p className="font-semibold">{t("likes", { count: like.count })}</p>
        {post.caption && (
          <p className={expanded ? "" : "line-clamp-2"} onClick={() => setExpanded(true)}>
            <Link href={`/a/${post.agency.handle}`} className="font-semibold">
              <bdi>{post.agency.handle}</bdi>
            </Link>{" "}
            <span dir="auto">{post.caption}</span>
          </p>
        )}
        <BusinessTag type={post.industry} />
        {post.result && (
          <p className="inline-flex rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
            📈 <bdi className="ms-1">{post.result}</bdi>
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {post.services.map((s) => (
            <Link key={s} href={{ pathname: "/explore", query: { service: s } }} className="text-xs text-brand">
              #{serviceLabel(s, locale).replace(/\s+/g, "_")}
            </Link>
          ))}
        </div>
        {linkToPost && (
          <Link href={postHref} className="block text-xs text-muted-foreground">
            {timeAgo(post.createdAt, locale)}
          </Link>
        )}
      </div>
    </article>
  );
}
