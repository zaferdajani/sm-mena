"use client";

import { Camera, Globe, Mail, MessageCircle, Phone } from "lucide-react";
import { COUNTRIES, currencyOf } from "@/lib/countries";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { AgencyAvatar } from "@/components/agency-avatar";
import { ContactLink } from "@/components/post/contact-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VerifiedBadge } from "@/components/verified-badge";
import { compactNumber, whatsappLink } from "@/lib/text";
import { formatJod } from "@/lib/format";
import { serviceLabel } from "@/lib/labels";
import { SITE_URL } from "@/lib/site";
import { RatingBadge } from "@/components/reviews/stars";
import { Link } from "@/i18n/navigation";
import { FollowButton } from "./follow-button";

export type ProfileData = {
  id: string;
  handle: string;
  name: string;
  bio: string;
  city: string;
  country: string;
  kind?: "agency" | "freelancer";
  avatarUrl: string | null;
  isVerified: boolean;
  isDemo: boolean;
  memberNo?: number | null;
  postCount: number;
  followerCount: number;
  services: string[];
  startingPriceJod: number | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  ratingAverage: number | null;
  ratingCount: number;
  googleRating: number | null;
  googleRatingCount: number | null;
  googleMapsUrl: string | null;
};

export function ProfileHeader({ agency, following, inquirySlot, servesNote }: { agency: ProfileData; following: boolean; inquirySlot?: React.ReactNode; servesNote?: string | null }) {
  const t = useTranslations("Profile");
  const tc = useTranslations("Common");
  const tp = useTranslations("Post");
  const tCity = useTranslations("Cities");
  const tpart = useTranslations("Partners");
  const tr = useTranslations("Reviews");
  const locale = useLocale();
  const [followers, setFollowers] = useState(agency.followerCount);
  const iconLink = buttonVariants({ variant: "secondary", className: "size-9 px-0" });

  return (
    <header className="space-y-4 px-4 pt-4 sm:pt-8">
      <div className="flex items-center gap-5 sm:gap-10">
        <AgencyAvatar name={agency.name} src={agency.avatarUrl} size={84} ring className="sm:scale-125" />
        <dl className="flex flex-1 justify-around text-center">
          <div className="flex flex-col-reverse">
            <dt className="text-sm text-muted-foreground">{t("posts")}</dt>
            <dd className="text-lg font-bold" data-testid="post-count">{compactNumber(agency.postCount, locale)}</dd>
          </div>
          <div className="flex flex-col-reverse">
            <dt className="text-sm text-muted-foreground">{t("followers")}</dt>
            <dd className="text-lg font-bold" data-testid="follower-count">{compactNumber(followers, locale)}</dd>
          </div>
        </dl>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          {/* The heading is the agency's name only: badges sit beside it. */}
          <h1 className="text-base font-bold">{agency.name}</h1>
          {agency.isVerified && <VerifiedBadge label={tc("verified")} className="size-5" />}
          {agency.kind === "freelancer" && <span className="rounded bg-brand-soft px-1.5 text-[11px] font-medium text-brand" data-testid="freelancer-badge">{tpart("kinds.freelancer")}</span>}
          {agency.isDemo && <span className="rounded bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">{tc("demo")}</span>}
        </div>
        <p className="text-sm text-muted-foreground">
          <span dir="ltr">@{agency.handle}</span> · {COUNTRIES.find((c) => c.code === agency.country)?.flag} {tCity(agency.city)}
          {agency.memberNo ? <span className="ms-2 rounded-full border px-1.5 text-[11px] font-medium text-muted-foreground" data-testid="member-no">{t("memberNo", { n: String(agency.memberNo).padStart(4, "0") })}</span> : null}
          {agency.startingPriceJod ? ` · ${tc("from", { price: formatJod(agency.startingPriceJod, locale, currencyOf(agency.country)) })}` : ""}
        </p>
        {servesNote && <p className="text-xs font-medium text-brand" data-testid="serves-note">{servesNote}</p>}
        {(agency.ratingAverage !== null || agency.googleRating !== null) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {agency.ratingAverage !== null && (
              <Link href={{ pathname: `/a/${agency.handle}`, query: { tab: "reviews" } }}>
                <RatingBadge average={agency.ratingAverage} count={agency.ratingCount} label={tr("tab")} />
              </Link>
            )}
            {agency.googleRating !== null && (
              <a href={agency.googleMapsUrl ?? "#"} target="_blank" rel="noopener noreferrer" data-testid="google-rating">
                <RatingBadge average={agency.googleRating} count={agency.googleRatingCount ?? 0} label={tr("google")} />
              </a>
            )}
          </div>
        )}
        {agency.bio && <p className="whitespace-pre-line text-sm" dir="auto">{agency.bio}</p>}
        {agency.services.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {agency.services.map((s) => (
              <Link key={s} href={`/hire/${s}`} className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-accent-foreground hover:underline">
                {serviceLabel(s, locale)}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <FollowButton agencyId={agency.id} following={following} count={followers} onCount={setFollowers} />
        {agency.whatsapp && (
          <ContactLink
            agencyId={agency.id}
            channel="whatsapp"
            href={whatsappLink(agency.whatsapp, `${tp("whatsappMessage")} ${SITE_URL}/${locale}/a/${agency.handle}`)}
            className={cn(buttonVariants(), "h-9 flex-1 gap-1.5 bg-[#25D366] text-white hover:bg-[#1ebe5b]")}
          >
            <MessageCircle className="size-4" />
            {tp("whatsapp")}
          </ContactLink>
        )}
        {inquirySlot}
      </div>
      <div className="flex gap-2">
        {agency.phone && (
          <ContactLink agencyId={agency.id} channel="phone" href={`tel:${agency.phone}`} className={iconLink} label={t("call")}>
            <Phone className="size-4" />
          </ContactLink>
        )}
        {agency.email && (
          <ContactLink agencyId={agency.id} channel="email" href={`mailto:${agency.email}`} className={iconLink} label={t("email")}>
            <Mail className="size-4" />
          </ContactLink>
        )}
        {agency.website && (
          <ContactLink agencyId={agency.id} channel="website" href={agency.website} className={iconLink} label={t("website")}>
            <Globe className="size-4" />
          </ContactLink>
        )}
        {agency.instagram && (
          <ContactLink agencyId={agency.id} channel="instagram" href={`https://instagram.com/${agency.instagram}`} className={iconLink} label={t("instagram")}>
            <Camera className="size-4" />
          </ContactLink>
        )}
      </div>
    </header>
  );
}
