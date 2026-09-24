import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RequestForm } from "@/components/requests/request-form";
import { serviceAndCityOptions } from "@/lib/form-options";
import { CITIES } from "@/lib/labels";
import { isServiceKey } from "@/lib/taxonomy";

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
      <RequestForm services={options.services} cities={options.cities} defaults={{ services: service ? [service] : [], city }} />
    </div>
  );
}
