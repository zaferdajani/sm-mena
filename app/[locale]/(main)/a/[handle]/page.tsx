import { DemoNotice } from "@/components/demo/demo-banner";
import { Briefcase, Check, Grid3x3, Info, Star } from "lucide-react";
import { COUNTRIES, currencyOf } from "@/lib/countries";
import { currentCountry } from "@/lib/country-choice";
import { ClientShowcaseList } from "@/components/profile/client-showcase";
import { accountTiles, clientShowcase, listClients } from "@/lib/data/portfolio-clients";
import { AccountTiles } from "@/components/profile/account-tiles";
import { servesNote } from "@/lib/serves-note";
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
import { localizedAgency } from "@/lib/content-lang";
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
import { canUse } from "@/lib/feature-gate";

export async function generateMetadata({ params }: PageProps<"/[locale]/a/[handle]">): Promise<Metadata> {
  const { locale, handle } = await params;
  const found = await getAgencyByHandle(handle);
  if (!found) return {};
  const agency = localizedAgency(found, locale);
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
  const tab = rawTab === "about" || rawTab === "reviews" || rawTab === "clients" ? rawTab : "work";
  const found = await getAgencyByHandle(handle);
  if (!found) notFound();
  // Name, bio, about and strengths in the reader's language when the agency wrote both (lib/content-lang.ts).
  const agency = localizedAgency(found, locale);

  const t = await getTranslations("Profile");
  const tr = await getTranslations("Reviews");
  const [tCity, tPlat, tInd, tTeam, tLang] = await Promise.all([
    getTranslations("Cities"), getTranslations("Platforms"), getTranslations("Industries"), getTranslations("TeamSize"), getTranslations("Languages"),
  ]);
  const visitorId = await getVisitorId();
  const [following, posts, reviewRows, sub, canReview, pkgs, clients, viewCountry] = await Promise.all([
    isFollowing(visitorId, agency.id),
    // Work filed under an account is grouped in account tiles; the grid shows the rest.
    tab === "work" ? feedPage({ agencyId: agency.id, standalone: true }, null, visitorId, { limit: 24 }) : null,
    tab === "reviews" ? listReviews(agency.id) : null,
    tab === "reviews" ? subScores(agency.id) : null,
    tab === "reviews" ? canReviewAfterInquiry(visitorId, agency.id) : false,
    listPackages(agency.id),
    tab === "clients" ? clientShowcase(agency.id) : listClients(agency.id),
    currentCountry(),
    (await isCrawlerRequest()) ? null : recordView("profile_view", agency.id, null, visitorId),
  ]);
  // Always rendered (every tab), so search engines see reviews and prices on the canonical URL.
  const latestReviews = await listReviews(agency.id, { limit: 3 });
  const tiles = tab === "work" ? await accountTiles(agency.id) : [];
  const [tSeo, tHire] = await Promise.all([getTranslations("Seo"), getTranslations("Hire")]);
  const rating = ratingSummary(agency);
  const avatarUrl = mediaUrl(agency.avatarKey);
  const primary = agency.services[0];

  // Visiting from a country the agency serves: say so; otherwise list where it works.
  const note = await servesNote(agency, viewCountry !== agency.country && agency.servesCountries.includes(viewCountry) ? viewCountry : null);
  const sep = locale === "ar" ? "، " : ", ";
  const countryName = (code: string) => {
    const c = COUNTRIES.find((x) => x.code === code);
    return c ? `${c.flag} ${locale === "ar" ? c.ar : c.en}` : code;
  };
  const about: [string, string][] = [
    [t("city"), `${tCity(agency.city)}${sep}${countryName(agency.country)}`],
    ...(agency.servesCountries.length ? [[t("serves"), agency.servesCountries.map(countryName).join(sep)] as [string, string]] : []),
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
      {agency.isDemo && (
        <div className="px-4 pt-4">
          <DemoNotice kind="agency" />
        </div>
      )}
      {/* No structured data for sample agencies: search engines only hear about real ones. */}
      {!agency.isDemo && <JsonLd
        data={[
          agencyLd(agency, { locale, cityName: tCity(agency.city), image: avatarUrl, reviews: latestReviews, packages: pkgs ?? [] }),
          breadcrumbLd([
            { name: tHire("indexTitle"), path: `/${locale}/hire` },
            ...(primary ? [{ name: serviceLabel(primary, locale), path: `/${locale}/hire/${primary}` }] : []),
            { name: agency.name, path: `/${locale}/a/${agency.handle}` },
          ]),
        ]}
      />}
      <ProfileHeader
        agency={{ ...agency, avatarUrl: mediaUrl(agency.avatarKey), ratingAverage: rating.average, memberNo: agency.foundingSeat }}
        following={following}
        servesNote={note}
        inquirySlot={(await canUse("messaging")) ? <InquiryDialog agencyId={agency.id} agencyName={agency.name} services={agency.services} /> : null}
      />
      <div className="mt-5 flex border-t text-xs font-semibold uppercase tracking-wide" role="tablist">
        {([["work", Grid3x3], ...(clients.length ? [["clients", Briefcase] as const] : []), ["reviews", Star], ["about", Info]] as const).map(([key, Icon]) => (
          <Link
            key={key}
            href={{ pathname: `/a/${agency.handle}`, query: key === "work" ? {} : { tab: key } }}
            role="tab"
            aria-selected={tab === key}
            className={cn("-mt-px flex flex-1 items-center justify-center gap-1.5 border-t-2 border-transparent py-3 text-muted-foreground", tab === key && "border-foreground text-foreground")}
          >
            <Icon className="size-4" />
            {key === "work" ? t("tabWork") : key === "clients" ? `${t("tabClients")} (${clients.length})` : key === "reviews" ? `${tr("tab")}${rating.count ? ` (${rating.count})` : ""}` : t("tabAbout")}
          </Link>
        ))}
      </div>
      {posts &&
        (posts.items.length || tiles.length ? (
          <>
            <AccountTiles tiles={tiles} handle={agency.handle} lang={agency.contentLang} />
            {posts.items.length > 0 && <FeedList initial={posts} filters={{ agencyId: agency.id, standalone: true }} placement={null} layout="grid" />}
          </>
        ) : (
          <p className="px-4 py-16 text-center text-muted-foreground">{t("noPosts")}</p>
        ))}
      {tab === "clients" && <ClientShowcaseList clients={clients as Awaited<ReturnType<typeof clientShowcase>>} lang={agency.contentLang} handle={agency.handle} />}
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
              <PackageList packages={pkgs.slice(0, 3)} currency={currencyOf(agency.country)} lang={agency.contentLang} />
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
          <PackageList packages={pkgs} currency={currencyOf(agency.country)} lang={agency.contentLang} />
        </div>
      )}
      {tab === "about" && (
        <div className="px-4 py-4">
          {agency.isVerified && <p className="mb-4 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">✓ {t("verifiedNote")}</p>}
          {agency.about && (
            <section className="mb-5" data-testid="agency-about">
              <h2 className="mb-2 font-semibold">{t("aboutTitle")}</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed" dir="auto">{agency.about}</p>
            </section>
          )}
          {agency.strengths.length > 0 && (
            <section className="mb-5" data-testid="agency-strengths">
              <h2 className="mb-2 font-semibold">{t("strengthsTitle")}</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {agency.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-2 rounded-lg border px-3 py-2 text-sm" dir="auto">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand" /> {s}
                  </li>
                ))}
              </ul>
            </section>
          )}
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
