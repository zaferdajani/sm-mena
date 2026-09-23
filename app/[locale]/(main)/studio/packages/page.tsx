import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { PackageForm } from "@/components/studio/package-form";
import { requireAgency } from "@/lib/auth/guards";
import { listPackages, MAX_PACKAGES } from "@/lib/data/packages";
import { allServices } from "@/lib/taxonomy";

export default async function StudioPackagesPage({ params }: PageProps<"/[locale]/studio/packages">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const t = await getTranslations("Packages");
  const lang = await getLocale();
  const rows = await listPackages(agency.id);
  const own = allServices.filter((s) => agency.services.includes(s.key));
  const services = (own.length ? own : allServices).map((s) => ({ key: s.key, label: lang === "ar" ? s.name_ar : s.name_en }));
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-sm text-muted-foreground">{t("studio.intro")}</p>
      {rows.map((p) => (
        <PackageForm key={p.id} services={services} initial={p} />
      ))}
      {rows.length < MAX_PACKAGES ? <PackageForm key={`new-${rows.length}`} services={services} /> : <p className="text-sm text-muted-foreground">{t("studio.limit")}</p>}
    </div>
  );
}
