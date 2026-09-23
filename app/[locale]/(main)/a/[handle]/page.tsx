import { Grid3x3, Info } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FeedList } from "@/components/feed/feed-list";
import { InquiryDialog } from "@/components/profile/inquiry-dialog";
import { ProfileHeader } from "@/components/profile/profile-header";
import { Link } from "@/i18n/navigation";
import { getAgencyByHandle } from "@/lib/data/agencies";
import { isFollowing, recordView } from "@/lib/data/interactions";
import { feedPage } from "@/lib/feed";
import { formatJod } from "@/lib/format";
import { serviceLabel } from "@/lib/labels";
import { mediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { getVisitorId } from "@/lib/visitor";

export async function generateMetadata({ params }: PageProps<"/[locale]/a/[handle]">): Promise<Metadata> {
  const { locale, handle } = await params;
  const agency = await getAgencyByHandle(handle);
  if (!agency) return {};
  const avatar = mediaUrl(agency.avatarKey);
  const description = agency.bio || agency.services.map((s) => serviceLabel(s, locale)).join(" · ");
  return {
    title: `${agency.name} (@${agency.handle})`,
    description,
    alternates: { canonical: `/${locale}/a/${agency.handle}`, languages: { ar: `/ar/a/${agency.handle}`, en: `/en/a/${agency.handle}` } },
    openGraph: { title: agency.name, description, images: avatar ? [avatar] : undefined, type: "profile" },
  };
}

export default async function AgencyPage({ params, searchParams }: PageProps<"/[locale]/a/[handle]">) {
  const { locale, handle } = await params;
  setRequestLocale(locale);
  const tab = (await searchParams).tab === "about" ? "about" : "work";
  const agency = await getAgencyByHandle(handle);
  if (!agency) notFound();

  const t = await getTranslations("Profile");
  const [tCity, tPlat, tInd, tTeam, tLang] = await Promise.all([
    getTranslations("Cities"), getTranslations("Platforms"), getTranslations("Industries"), getTranslations("TeamSize"), getTranslations("Languages"),
  ]);
  const visitorId = await getVisitorId();
  const [following, posts] = await Promise.all([
    isFollowing(visitorId, agency.id),
    tab === "work" ? feedPage({ agencyId: agency.id }, null, visitorId, { limit: 24 }) : null,
    recordView("profile_view", agency.id, null, visitorId),
  ]);

  const about: [string, string][] = [
    [t("city"), tCity(agency.city)],
    [t("startingPrice"), agency.startingPriceJod ? formatJod(agency.startingPriceJod, locale) : t("notSet")],
    [t("services"), agency.services.map((s) => serviceLabel(s, locale)).join("، ") || t("notSet")],
    [t("platforms"), agency.platforms.map((p) => tPlat(p)).join("، ") || t("notSet")],
    [t("industries"), agency.industries.map((i) => tInd(i)).join("، ") || t("notSet")],
    [t("team"), agency.teamSize ? tTeam(agency.teamSize) : t("notSet")],
    [t("founded"), agency.foundedYear ? String(agency.foundedYear) : t("notSet")],
    [t("languages"), agency.languages.map((l) => tLang(l)).join("، ")],
  ];

  return (
    <div className="mx-auto w-full max-w-4xl">
      <ProfileHeader
        agency={{ ...agency, avatarUrl: mediaUrl(agency.avatarKey) }}
        following={following}
        inquirySlot={<InquiryDialog agencyId={agency.id} agencyName={agency.name} services={agency.services} />}
      />
      <div className="mt-5 flex border-t text-xs font-semibold uppercase tracking-wide" role="tablist">
        {([["work", Grid3x3], ["about", Info]] as const).map(([key, Icon]) => (
          <Link
            key={key}
            href={{ pathname: `/a/${agency.handle}`, query: key === "work" ? {} : { tab: key } }}
            role="tab"
            aria-selected={tab === key}
            className={cn("-mt-px flex flex-1 items-center justify-center gap-1.5 border-t-2 border-transparent py-3 text-muted-foreground", tab === key && "border-foreground text-foreground")}
          >
            <Icon className="size-4" />
            {key === "work" ? t("tabWork") : t("tabAbout")}
          </Link>
        ))}
      </div>
      {posts &&
        (posts.items.length ? (
          <FeedList initial={posts} filters={{ agencyId: agency.id }} placement={null} layout="grid" />
        ) : (
          <p className="px-4 py-16 text-center text-muted-foreground">{t("noPosts")}</p>
        ))}
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
