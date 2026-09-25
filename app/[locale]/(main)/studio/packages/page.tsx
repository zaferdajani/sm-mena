import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { FileSignature } from "lucide-react";
import { PackageForm } from "@/components/studio/package-form";
import { Link } from "@/i18n/navigation";
import { PLATFORMS } from "@/lib/labels";
import { requireAgency } from "@/lib/auth/guards";
import { listPackages, MAX_PACKAGES } from "@/lib/data/packages";
import { allServices } from "@/lib/taxonomy";
import { contentLang } from "@/lib/content-lang";

export default async function StudioPackagesPage({ params }: PageProps<"/[locale]/studio/packages">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const t = await getTranslations("Packages");
  const tp = await getTranslations("Platforms");
  const tc = await getTranslations("Contracts");
  const platforms = PLATFORMS.map((p) => ({ key: p, label: tp(p) }));
  const lang = await getLocale();
  const rows = await listPackages(agency.id);
  const own = allServices.filter((s) => agency.services.includes(s.key));
  const services = (own.length ? own : allServices).map((s) => ({ key: s.key, label: lang === "ar" ? s.name_ar : s.name_en }));
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-sm text-muted-foreground">{t("studio.intro")}</p>
      {rows.map((p) => (
        <div key={p.id} className="space-y-1">
          <PackageForm services={services} platforms={platforms} contentLang={contentLang(agency.contentLang)} initial={p} />
          <Link href={{ pathname: "/studio/contracts/new", query: { package: p.id } }} className="flex items-center gap-1 px-1 text-sm text-brand hover:underline" data-testid="package-contract">
            <FileSignature className="size-4" /> {tc("fromPackage")}
          </Link>
        </div>
      ))}
      {rows.length < MAX_PACKAGES ? <PackageForm key={`new-${rows.length}`} services={services} platforms={platforms} contentLang={contentLang(agency.contentLang)} /> : <p className="text-sm text-muted-foreground">{t("studio.limit")}</p>}
    </div>
  );
}
