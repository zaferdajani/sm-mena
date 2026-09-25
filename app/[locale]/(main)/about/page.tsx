import { protectedPaymentsLive } from "@/lib/payments/readiness";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JsonLd } from "@/components/seo/json-ld";
import { Link } from "@/i18n/navigation";
import { pageMeta } from "@/lib/seo";
import { organizationLd } from "@/lib/structured-data";

const SECTIONS = ["what", "verify", "reviews", "payments", "demo", "money"] as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });
  return pageMeta({ locale, path: "/about", title: t("title"), description: t("description") });
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("About");
  // Payment promises follow the one readiness switch (lib/payments/readiness.ts).
  const live = protectedPaymentsLive();
  const bodyKey = (k: (typeof SECTIONS)[number]) => (!live && (k === "payments" || k === "money") ? `${k}.bodyTest` : `${k}.body`);
  return (
    <article className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <JsonLd data={organizationLd()} />
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </header>
      {SECTIONS.map((k) => (
        <section key={k} className="space-y-1">
          <h2 className="font-semibold">{t(`${k}.title`)}</h2>
          <p className="text-sm leading-relaxed">{t(bodyKey(k))}</p>
        </section>
      ))}
      <p className="flex flex-wrap gap-4 text-sm font-medium">
        <Link href="/hire" className="text-brand hover:underline">{t("ctaHire")}</Link>
        <Link href="/contact" className="text-brand hover:underline">{t("ctaContact")}</Link>
      </p>
    </article>
  );
}
