import { documentsOpen } from "@/lib/launch-phase";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { FileSignature } from "lucide-react";
import { BehanceShortcut } from "@/components/studio/behance-shortcut";
import { PackageForm } from "@/components/studio/package-form";
import { FirstServiceCard } from "@/components/studio/first-service-card";
import { PageBasics } from "@/components/studio/page-basics";
import { FOOTER_SERVICES } from "@/components/shell/site-footer";
import { TEAM_SIZES } from "@/lib/core/catalog/labels";
import { Link } from "@/i18n/navigation";
import { PLATFORMS } from "@/lib/labels";
import { requireAgency } from "@/lib/auth/guards";
import { listPackages, MAX_PACKAGES } from "@/lib/data/packages";
import { allServices } from "@/lib/taxonomy";
import { contentLang } from "@/lib/content-lang";

export default async function StudioPackagesPage({ params, searchParams }: PageProps<"/[locale]/studio/packages">) {
  const { locale } = await params;
  // Straight after a new agency saves its page (the second setup step).
  const welcome = (await searchParams).welcome === "1";
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const t = await getTranslations("Packages");
  const ts = await getTranslations("Studio");
  const tp = await getTranslations("Platforms");
  const tc = await getTranslations("Contracts");
  const tTeam = await getTranslations("TeamSize");
  const platforms = PLATFORMS.map((p) => ({ key: p, label: tp(p) }));
  const lang = await getLocale();
  const rows = await listPackages(agency.id);
  const own = allServices.filter((s) => agency.services.includes(s.key));
  const services = (own.length ? own : allServices).map((s) => ({ key: s.key, label: lang === "ar" ? s.name_ar : s.name_en }));
  // The first card asks for one service: the page's own first, else the common ones (docs/65 stage 3).
  const firstServices = own.length ? services : services.filter((s) => (FOOTER_SERVICES as readonly string[]).includes(s.key));
  const basicsMissing = !agency.teamSize || agency.startingPriceJod === null;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {welcome && (
        <div role="status" className="rounded-xl border border-brand-line bg-brand-soft p-4 text-sm" data-testid="packages-welcome">
          <p className="font-medium">✓ {ts("packagesWelcome")}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link href="/studio/new" className="text-brand underline-offset-4 hover:underline">{ts("packagesSkip")}</Link>
            <BehanceShortcut testId="packages-behance" compact />
          </p>
        </div>
      )}
      {rows.length === 0 && <FirstServiceCard services={firstServices} />}
      {basicsMissing && <PageBasics teamSizes={TEAM_SIZES.map((key) => ({ key, label: tTeam(key) }))} teamSize={agency.teamSize} startingPriceJod={agency.startingPriceJod} />}
      <p className="text-sm text-muted-foreground">{t("studio.intro")}</p>
      {rows.map((p) => (
        <div key={p.id} className="space-y-1">
          {/* A saved package is a short card; its full form opens on "Edit" (a column of open forms read as unsaved). */}
          <details className="group rounded-xl border" data-testid="package-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0">
                <span className="block truncate font-semibold" dir="auto">{p.title}</span>
                <span className="text-sm text-muted-foreground">{p.priceJod.toLocaleString(locale === "ar" ? "ar-JO-u-nu-latn" : "en")} · {p.billing === "monthly" ? t("perMonth") : t("oneOff")}</span>
              </span>
              <span className="shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium group-open:hidden">{t("studio.edit")}</span>
            </summary>
            <div className="border-t p-2">
              <PackageForm services={services} platforms={platforms} contentLang={contentLang(agency.contentLang)} initial={p} />
            </div>
          </details>
          {documentsOpen() && <Link href={{ pathname: "/studio/contracts/new", query: { package: p.id } }} className="flex items-center gap-1 px-1 text-sm text-brand hover:underline" data-testid="package-contract">
            <FileSignature className="size-4" /> {tc("fromPackage")}
          </Link>}
        </div>
      ))}
      {rows.length < MAX_PACKAGES ? (
        rows.length === 0 ? (
          <details className="rounded-xl border p-4" data-testid="full-package-form">
            <summary className="min-h-11 cursor-pointer text-sm font-semibold">{t("studio.fullForm")}</summary>
            <div className="pt-3"><PackageForm key={`new-${rows.length}`} services={services} platforms={platforms} contentLang={contentLang(agency.contentLang)} /></div>
          </details>
        ) : <PackageForm key={`new-${rows.length}`} services={services} platforms={platforms} contentLang={contentLang(agency.contentLang)} />
      ) : <p className="text-sm text-muted-foreground">{t("studio.limit")}</p>}
    </div>
  );
}
