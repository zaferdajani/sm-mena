import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RequestForm } from "@/components/requests/request-form";
import { serviceAndCityOptions } from "@/lib/form-options";
import { CITIES } from "@/lib/labels";
import { isServiceKey } from "@/lib/taxonomy";
import { demoMode } from "@/lib/demo-mode";

export async function generateMetadata({ params }: PageProps<"/[locale]/request/new">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Requests" });
  return pageMeta({ locale, path: "/request/new", title: t("formTitle"), description: t("formSubtitle") });
}

export default async function NewRequestPage({ params, searchParams }: PageProps<"/[locale]/request/new">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const service = typeof sp.service === "string" && isServiceKey(sp.service) ? sp.service : null;
  const city = typeof sp.city === "string" && (CITIES as readonly string[]).includes(sp.city) ? sp.city : null;
  const t = await getTranslations("Requests");
  const options = await serviceAndCityOptions();
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
      <h1 className="text-xl font-bold">{t("formTitle")}</h1>
      <p className="text-sm text-muted-foreground">{t("formSubtitle")}</p>
      {(await demoMode()) && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100" data-testid="demo-request-note">
          {(await getTranslations("Demo"))("requestNote")}
        </p>
      )}
      <RequestForm services={options.services} cities={options.cities} platforms={options.platforms} defaults={{ services: service ? [service] : [], city }} />
    </div>
  );
}
