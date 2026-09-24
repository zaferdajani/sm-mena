import { Grid3x3, Info, Star } from "lucide-react";
import { currencyOf } from "@/lib/countries";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FeedList } from "@/components/feed/feed-list";
import { InquiryDialog } from "@/components/profile/inquiry-dialog";
import { PackageList } from "@/components/profile/package-list";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ReviewList, ReviewSummary } from "@/components/reviews/review-list";
import { WriteReviewDialog } from "@/components/reviews/write-review-dialog";
import { JsonLd } from "@/components/seo/json-ld";
import { Link } from "@/i18n/navigation";
import { getAgencyByHandle } from "@/lib/data/agencies";
import { isFollowing, recordView } from "@/lib/data/interactions";
import { listPackages } from "@/lib/data/packages";
import { canReviewAfterInquiry, listReviews, ratingSummary, subScores } from "@/lib/data/reviews";
import { getFeed } from "@/lib/data/posts";
import { feedPage } from "@/lib/feed";
import { formatJod } from "@/lib/format";
import { serviceLabel } from "@/lib/labels";
import { isCrawlerRequest } from "@/lib/request";
import { pageMeta } from "@/lib/seo";
import { mediaUrl } from "@/lib/storage";
import { agencyLd, breadcrumbLd } from "@/lib/structured-data";
import { cn } from "@/lib/utils";
import { getVisitorId } from "@/lib/visitor";

export async function generateMetadata({ params }: PageProps<"/[locale]/a/[handle]">): Promise<Metadata> {
  const { locale, handle } = await params;
  const agency = await getAgencyByHandle(handle);
  if (!agency) return {};
  const t = await getTranslations({ locale, namespace: "Seo" });
  const city = (await getTranslations({ locale, namespace: "Cities" }))(agency.city);
  const services = agency.services.map((s) => serviceLabel(s, locale));
  const cover = (await getFeed({ agencyId: agency.id }, null, 1)).items[0]?.images[0];
  const avatar = mediaUrl(agency.avatarKey);
  return pageMeta({
    locale,
    path: `/a/${agency.handle}`,
    title: services.length ? t("agencyTitle", { name: agency.name, service: services[0], city }) : agency.name,
    description: agency.bio || t("agencyDescription", { name: agency.name, services: services.slice(0, 3).join("، "), city }),
    images: cover ? [{ url: cover.url, width: cover.width, height: cover.height, alt: agency.name }] : avatar ? [{ url: avatar, alt: agency.name }] : undefined,
    type: "profile",
    // Demo agencies are for trying the site, not for search results.
    noindex: agency.isDemo || agency.status !== "active",
  });
}

export default async function AgencyPage({ params, searchParams }: PageProps<"/[locale]/a/[handle]">) {
  const { locale, handle } = await params;
  setRequestLocale(locale);
  const rawTab = (await searchParams).tab;
  const tab = rawTab === "about" || rawTab === "reviews" ? rawTab : "work";
  const agency = await getAgencyByHandle(handle);
  if (!agency) notFound();

  const t = await getTranslations("Profile");
  const tr = await getTranslations("Reviews");
  const [tCity, tPlat, tInd, tTeam, tLang] = await Promise.all([
    getTranslations("Cities"), getTranslations("Platforms"), getTranslations("Industries"), getTranslations("TeamSize"), getTranslations("Languages"),
  ]);
  const visitorId = await getVisitorId();
  const [following, posts, reviewRows, sub, canReview, pkgs] = await Promise.all([
    isFollowing(visitorId, agency.id),
    tab === "work" ? feedPage({ agencyId: agency.id }, null, visitorId, { limit: 24 }) : null,
    tab === "reviews" ? listReviews(agency.id) : null,
    tab === "reviews" ? subScores(agency.id) : null,
    tab === "reviews" ? canReviewAfterInquiry(visitorId, agency.id) : false,
    listPackages(agency.id),
    (await isCrawlerRequest()) ? null : recordView("profile_view", agency.id, null, visitorId),
  ]);
  // Always rendered (every tab), so search engines see reviews and prices on the canonical URL.
  const latestReviews = await listReviews(agency.id, { limit: 3 });
  const [tSeo, tHire] = await Promise.all([getTranslations("Seo"), getTranslations("Hire")]);
  const rating = ratingSummary(agency);
  const avatarUrl = mediaUrl(agency.avatarKey);
  const primary = agency.services[0];

  const about: [string, string][] = [
    [t("city"), tCity(agency.city)],
    [t("startingPrice"), agency.startingPriceJod ? formatJod(agency.startingPriceJod, locale, currencyOf(agency.country)) : t("notSet")],
    [t("services"), agency.services.map((s) => serviceLabel(s, locale)).join("، ") || t("notSet")],
    [t("platforms"), agency.platforms.map((p) => tPlat(p)).join("، ") || t("notSet")],
    [t("industries"), agency.industries.map((i) => tInd(i)).join("، ") || t("notSet")],
    [t("team"), agency.teamSize ? tTeam(agency.teamSize) : t("notSet")],
    [t("founded"), agency.foundedYear ? String(agency.foundedYear) : t("notSet")],
    [t("languages"), agency.languages.map((l) => tLang(l)).join("، ")],
  ];

  return (
    <div className="mx-auto w-full max-w-4xl">
      <JsonLd
        data={[
          agencyLd(agency, { locale, cityName: tCity(agency.city), image: avatarUrl, reviews: latestReviews, packages: pkgs ?? [] }),
          breadcrumbLd([
            { name: tHire("indexTitle"), path: `/${locale}/hire` },
            ...(primary ? [{ name: serviceLabel(primary, locale), path: `/${locale}/hire/${primary}` }] : []),
            { name: agency.name, path: `/${locale}/a/${agency.handle}` },
          ]),
        ]}
      />
      <ProfileHeader
        agency={{ ...agency, avatarUrl: mediaUrl(agency.avatarKey), ratingAverage: rating.average }}
        following={following}
        inquirySlot={<InquiryDialog agencyId={agency.id} agencyName={agency.name} services={agency.services} />}
      />
      <div className="mt-5 flex border-t text-xs font-semibold uppercase tracking-wide" role="tablist">
        {([["work", Grid3x3], ["reviews", Star], ["about", Info]] as const).map(([key, Icon]) => (
          <Link
            key={key}
            href={{ pathname: `/a/${agency.handle}`, query: key === "work" ? {} : { tab: key } }}
            role="tab"
            aria-selected={tab === key}
            className={cn("-mt-px flex flex-1 items-center justify-center gap-1.5 border-t-2 border-transparent py-3 text-muted-foreground", tab === key && "border-foreground text-foreground")}
          >
            <Icon className="size-4" />
            {key === "work" ? t("tabWork") : key === "reviews" ? `${tr("tab")}${rating.count ? ` (${rating.count})` : ""}` : t("tabAbout")}
          </Link>
        ))}
      </div>
      {posts &&
        (posts.items.length ? (
          <FeedList initial={posts} filters={{ agencyId: agency.id }} placement={null} layout="grid" />
        ) : (
          <p className="px-4 py-16 text-center text-muted-foreground">{t("noPosts")}</p>
        ))}
      {tab === "reviews" && reviewRows && sub && (
        <div className="space-y-4 px-4 py-4">
          <ReviewSummary average={rating.average} count={rating.count} sub={sub} />
          {canReview && <WriteReviewDialog agencyId={agency.id} agencyName={agency.name} services={agency.services} />}
          <ReviewList reviews={reviewRows} agencyName={agency.name} />
        </div>
      )}
      {tab === "work" && (pkgs?.length || latestReviews.length) ? (
        <div className="space-y-6 border-t px-4 py-6" data-testid="profile-overview">
          {pkgs && pkgs.length > 0 && (
            <section>
              <h2 className="mb-3 font-semibold">{tSeo("packagesTitle", { name: agency.name })}</h2>
              <PackageList packages={pkgs.slice(0, 3)} currency={currencyOf(agency.country)} />
              {pkgs.length > 3 && (
                <Link href={{ pathname: `/a/${agency.handle}`, query: { tab: "about" } }} className="mt-2 inline-block text-sm font-medium text-brand">
                  {tSeo("allPackages", { count: pkgs.length })}
                </Link>
              )}
            </section>
          )}
          {latestReviews.length > 0 && (
            <section>
              <h2 className="mb-3 font-semibold">{tSeo("reviewsTitle", { name: agency.name })}</h2>
              <ReviewList reviews={latestReviews} agencyName={agency.name} />
              <Link href={{ pathname: `/a/${agency.handle}`, query: { tab: "reviews" } }} className="mt-2 inline-block text-sm font-medium text-brand">
                {tSeo("allReviews", { count: rating.count })}
              </Link>
            </section>
          )}
        </div>
      ) : null}
      {tab === "about" && pkgs && pkgs.length > 0 && (
        <div className="px-4 pt-4">
          <PackageList packages={pkgs} currency={currencyOf(agency.country)} />
        </div>
      )}
      {tab === "about" && (
        <div className="px-4 py-4">
          {agency.isVerified && <p className="mb-4 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">✓ {t("verifiedNote")}</p>}
          <dl className="divide-y">
            {about.map(([label, value]) => (
              <div key={label} className="grid grid-cols-3 gap-3 py-3 text-sm">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="col-span-2">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
