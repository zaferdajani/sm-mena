import { EmptySupply } from "@/components/demo/empty-supply";
import { Compass, Sparkles, Star } from "lucide-react";
import { demoMode } from "@/lib/demo-mode";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AgencyAvatar } from "@/components/agency-avatar";
import { AgenciesStrip } from "@/components/feed/agencies-strip";
import { FeedList } from "@/components/feed/feed-list";
import { FOOTER_SERVICES } from "@/components/shell/site-footer";
import { buttonVariants } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/verified-badge";
import { Link } from "@/i18n/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { feedPage } from "@/lib/feed";
import { serviceLabel } from "@/lib/labels";
import { serviceLinkText } from "@/lib/hire-content";
import { pageMeta } from "@/lib/seo";
import { stripAgencies } from "@/lib/strip";
import { currentCountry } from "@/lib/country-choice";
import { countryName } from "@/lib/countries";
import { getVisitorId } from "@/lib/visitor";

export async function generateMetadata({ params }: PageProps<"/[locale]/feed">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Seo" });
  return pageMeta({ locale, path: "/feed", title: t("feedTitle"), description: t("feedDescription") });
}

export default async function FeedPage({ params }: PageProps<"/[locale]/feed">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const ts = await getTranslations("Seo");
  const tc = await getTranslations("Common");
  const tCity = await getTranslations("Cities");
  const tn = await getTranslations("Nav");
  const [visitorId, user] = await Promise.all([getVisitorId(), getSessionUser()]);
  const [country, includeDemo] = await Promise.all([currentCountry(), demoMode()]);
  const [strip, page] = await Promise.all([stripAgencies(country, includeDemo), feedPage({ country, includeDemo }, null, visitorId, { placement: "feed" })]);

  const suggested = strip.filter((a) => !a.sponsored).slice(0, 5);
  // Phones: one column (stories, intro, feed). Desktop: the feed with a sticky
  // side column (intro, popular services, suggested agencies), like Instagram.
  return (
    <div className="mx-auto grid w-full max-w-[470px] grid-cols-1 sm:pt-6 lg:max-w-[1000px] lg:grid-cols-[minmax(0,560px)_minmax(0,340px)] lg:justify-center lg:gap-x-12 lg:px-6 lg:pt-8 lg:[grid-template-areas:'strip_aside''feed_aside']">
      <div className="min-w-0 lg:[grid-area:strip]">
        <AgenciesStrip agencies={strip} showJoin={!user} />
      </div>

      <aside className="flex min-w-0 flex-col lg:sticky lg:top-8 lg:gap-6 lg:self-start lg:[grid-area:aside]">
        <section className="border-b bg-card px-4 py-5 sm:my-6 sm:rounded-xl sm:border sm:shadow-card lg:my-0">
          <h1 className="text-xl leading-snug">{t("introTitleIn", { country: countryName(country, locale) })}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("introBody")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link href="/match" className={buttonVariants({ className: "cta-bubble h-10 gap-2 px-4" })} data-testid="home-ai">
              <Sparkles className="size-4" />
              {tn("match")}
              <span className="typing" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </Link>
            <Link href="/explore" className={buttonVariants({ variant: "outline", className: "h-9 gap-2 px-4" })}>
              <Compass className="size-4" />
              {t("introCta")}
            </Link>
            {!user && (
              <Link href="/join" className="text-sm font-medium text-brand">
                {t("introAgency")}
              </Link>
            )}
          </div>
          <nav aria-label={ts("popularServices")} className="mt-4 border-t pt-3">
            <h2 className="mb-2 text-xs font-medium text-muted-foreground">{ts("popularServices")}</h2>
            <ul className="flex flex-wrap gap-1.5">
              {FOOTER_SERVICES.map((s) => (
                <li key={s}>
                  <Link href={`/hire/${s}`} className="inline-block rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground hover:underline" data-testid="home-service-link">
                    {serviceLinkText(s, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </section>

        {suggested.length > 0 && (
          <section className="hidden rounded-xl border bg-card p-4 shadow-card lg:block" data-testid="suggested-agencies">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t("suggestedTitle")}</h2>
              <Link href="/hire" className="text-xs font-medium text-brand hover:underline">
                {t("suggestedAll")}
              </Link>
            </div>
            <ul className="space-y-3">
              {suggested.map((a) => (
                <li key={a.id}>
                  <Link href={`/a/${a.handle}`} className="flex items-center gap-3 rounded-lg hover:bg-muted">
                    <AgencyAvatar name={a.name} src={a.avatarUrl} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 text-sm font-medium">
                        <span className="truncate">{a.name}</span>
                        {a.isVerified && <VerifiedBadge label={tc("verified")} />}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {tCity(a.city)}
                        {a.services[0] && ` · ${serviceLabel(a.services[0], locale)}`}
                      </span>
                    </span>
                    {a.ratingAverage !== null && (
                      <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium">
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                        {a.ratingAverage.toFixed(1)}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>

      <div className="min-w-0 lg:[grid-area:feed] lg:pt-6">
        {page.items.length ? (
          <FeedList initial={page} filters={{ country }} placement="feed" />
        ) : (
          <EmptySupply />
        )}
      </div>
    </div>
  );
}
