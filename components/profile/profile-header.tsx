"use client";

import { Camera, Globe, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { COUNTRIES, currencyOf } from "@/lib/countries";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { AgencyAvatar } from "@/components/agency-avatar";
import { ContactLink } from "@/components/post/contact-link";
import { cn } from "@/lib/utils";
import { VerifiedBadge } from "@/components/verified-badge";
import { sealNumber } from "@/lib/pioneers";
import { compactNumber, whatsappLink } from "@/lib/text";
import { formatJod } from "@/lib/format";
import { serviceLabel } from "@/lib/labels";
import { SITE_URL } from "@/lib/site";
import { RatingBadge } from "@/components/reviews/stars";
import { Link } from "@/i18n/navigation";
import { FollowButton } from "./follow-button";
import styles from "./profile-layout.module.css";

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
  /** Dated founding-cohort recognition, never a quality rank. */
  founding?: boolean;
  /** Pioneer seal number (docs/57): invited first names; recognition, never a rank. */
  pioneerNumber?: number | null;
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

export function ProfileHeader({ agency, following, inquirySlot, servesNote, followersHref, previewOnly = false, registrationMode = false }: { agency: ProfileData; following: boolean; previewOnly?: boolean; registrationMode?: boolean; inquirySlot?: React.ReactNode; servesNote?: string | null; /** Set only for the profile owner by the server. */ followersHref?: string }) {
  const t = useTranslations("Profile");
  const tRegistration = useTranslations("Registration");
  const readOnly = previewOnly || registrationMode;
  const tc = useTranslations("Common");
  const tp = useTranslations("Post");
  const tCity = useTranslations("Cities");
  const tpart = useTranslations("Partners");
  const tr = useTranslations("Reviews");
  const locale = useLocale();
  const [followers, setFollowers] = useState(agency.followerCount);
  const hasContactLinks = Boolean(agency.phone || agency.email || agency.website || agency.instagram);

  return (
    <header className={styles.header} data-testid="provider-profile-header">
      <div className={styles.identity}>
        <div className={styles.identityTop}>
          <div className={styles.avatar}>
            <AgencyAvatar name={agency.name} src={agency.avatarUrl} size={76} />
          </div>
          <div className={styles.identityText}>
            <h1 className={styles.name}><bdi dir="auto">{agency.name}</bdi></h1>
            <div className={styles.badges}>
              {agency.isVerified && (
                <span className={styles.badge}>
                  <VerifiedBadge label={tc("verified")} className="size-4 shrink-0" />
                  <span aria-hidden>{tc("verified")}</span>
                </span>
              )}
              {agency.kind === "freelancer" && <span className={styles.badge} data-testid="freelancer-badge">{tpart("kinds.freelancer")}</span>}
              {agency.isDemo && <span className={styles.badge}>{tc("demo")}</span>}
              {agency.founding && <span className={cn(styles.badge, styles.founderBadge)} data-testid="founding-badge" title={t("foundingTitle")}>{t("foundingBadge", { year: 2026 })}</span>}
              {agency.pioneerNumber ? (
                <span className={cn(styles.badge, styles.founderBadge)} data-testid="pioneer-badge" title={t("pioneerTitle")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/pioneer-seal.svg" alt="" width={22} height={22} />
                  {t("pioneerBadge", { number: sealNumber(agency.pioneerNumber, locale) })}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className={styles.meta}>
          <bdi dir="ltr" className={styles.handle}>@{agency.handle}</bdi>
          <span className={styles.metaItem}>
            <MapPin className="size-4" aria-hidden />
            <span>{COUNTRIES.find((c) => c.code === agency.country)?.flag} {tCity(agency.city)}</span>
          </span>
        </div>
        {servesNote && <p className={styles.serves} data-testid="serves-note">{servesNote}</p>}
        {agency.bio && <p className={styles.bio} dir="auto">{agency.bio}</p>}
        {agency.services.length > 0 && (
          <div className={styles.services} data-testid="profile-services">
            {agency.services.map((s) => (
              readOnly ? <span key={s} className={styles.service}><bdi dir="auto">{serviceLabel(s, locale)}</bdi></span> : <Link key={s} href={`/hire/${s}`} className={styles.service}><bdi dir="auto">{serviceLabel(s, locale)}</bdi></Link>
            ))}
          </div>
        )}
        {!readOnly && <dl className={styles.stats}>
          <div>
            <dt>{t("posts")}</dt>
            <dd data-testid="post-count"><bdi>{compactNumber(agency.postCount, locale)}</bdi></dd>
          </div>
          <div>
            <dt>{t("followers")}</dt>
            <dd data-testid="follower-count">
              {followersHref ? (
                <Link href={followersHref} className="inline-flex min-h-11 items-center rounded-md px-2 text-brand underline-offset-4 hover:bg-accent hover:underline" data-testid="followers-link" title={t("seeFollowers")} aria-label={t("seeFollowers")}>
                  <bdi>{compactNumber(followers, locale)}</bdi>
                </Link>
              ) : <bdi>{compactNumber(followers, locale)}</bdi>}
            </dd>
          </div>
        </dl>}
      </div>

      <div className={styles.contactPanel} data-testid="profile-contact-panel">
        {previewOnly && <p className="registration-note">{tRegistration("examples.contactNotice")}</p>}
        {!previewOnly && agency.startingPriceJod ? (
          <dl className={styles.price}>
            <dt>{t("startingPrice")}</dt>
            <dd>{tc("from", { price: formatJod(agency.startingPriceJod, locale, currencyOf(agency.country)) })}</dd>
          </dl>
        ) : null}
        {(agency.ratingAverage !== null || agency.googleRating !== null) && (
          <div className={styles.ratings}>
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
        {agency.whatsapp && (
          <ContactLink
            agencyId={agency.id}
            channel="whatsapp"
            href={whatsappLink(agency.whatsapp, `${tp("whatsappMessage")} ${SITE_URL}/${locale}/a/${agency.handle}`)}
            className={styles.primaryContact}
          >
            <MessageCircle className="size-5 shrink-0" aria-hidden />
            {tp("whatsapp")}
          </ContactLink>
        )}
        {!readOnly && <div className={styles.secondaryActions}>
          {inquirySlot}
          <FollowButton agencyId={agency.id} following={following} count={followers} onCount={setFollowers} />
        </div>}
        {hasContactLinks && (
          <div className={styles.contactLinks}>
            {agency.phone && <ContactLink agencyId={agency.id} channel="phone" href={`tel:${agency.phone}`} className={styles.contactLink} label={t("call")}><Phone className="size-4" aria-hidden /><span>{t("call")}</span></ContactLink>}
            {agency.email && <ContactLink agencyId={agency.id} channel="email" href={`mailto:${agency.email}`} className={styles.contactLink} label={t("email")}><Mail className="size-4" aria-hidden /><span>{t("email")}</span></ContactLink>}
            {agency.website && <ContactLink agencyId={agency.id} channel="website" href={agency.website} className={styles.contactLink} label={t("website")}><Globe className="size-4" aria-hidden /><span>{t("website")}</span></ContactLink>}
            {agency.instagram && <ContactLink agencyId={agency.id} channel="instagram" href={`https://instagram.com/${agency.instagram}`} className={styles.contactLink} label={t("instagram")}><Camera className="size-4" aria-hidden /><span>{t("instagram")}</span></ContactLink>}
          </div>
        )}
        {!readOnly && agency.memberNo ? <p className={styles.member} data-testid="member-no">{t("memberNo", { n: String(agency.memberNo).padStart(4, "0") })}</p> : null}
      </div>
    </header>
  );
}
