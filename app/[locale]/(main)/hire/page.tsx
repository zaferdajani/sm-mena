import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { serviceCounts } from "@/lib/data/hire";
import { serviceLinkText } from "@/lib/hire-content";
import { serviceOptions } from "@/lib/labels";

export async function generateMetadata({ params }: PageProps<"/[locale]/hire">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Hire" });
  return pageMeta({ locale, path: "/hire", title: t("indexTitle"), description: t("indexSubtitle") });
}

export default async function HireIndex({ params }: PageProps<"/[locale]/hire">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Hire");
  const { services } = await serviceCounts({ realOnly: true });
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-6 sm:py-10">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">{t("indexTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("indexSubtitle")}</p>
      </header>
      {serviceOptions(locale).map((group) => (
        <section key={group.key}>
          <h2 className="mb-3 font-semibold">{group.label}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {group.services.map((s) => (
              <li key={s.key}>
                <Link href={`/hire/${s.key}`} className="flex items-center justify-between rounded-xl border px-4 py-3 hover:bg-muted" data-testid="hire-service-link">
                  <span className="font-medium">{serviceLinkText(s.key, locale)}</span>
                  <span className="text-xs text-muted-foreground">
                    {services.get(s.key) ?? 0} {t("agencies", { count: services.get(s.key) ?? 0 })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
