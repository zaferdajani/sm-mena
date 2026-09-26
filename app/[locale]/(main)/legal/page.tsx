import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { protectedPaymentsLive } from "@/lib/payments/readiness";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/legal">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Legal" });
  return pageMeta({ locale, path: "/legal", title: t("title"), description: t("metaDescription") });
}

export default async function LegalPage({ params }: PageProps<"/[locale]/legal">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Legal");
  const sections = [1, 2, 3, 4, 5] as const;
  // The pricing section's payment promise follows lib/payments/readiness.ts.
  const live = protectedPaymentsLive();
  return (
    <article className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("intro")}</p>
      {sections.map((n) => (
        <section key={n} className="space-y-1">
          <h2 className="font-semibold">{t(`s${n}t`)}</h2>
          <p className="text-sm leading-relaxed">{t(n === 5 && !live ? "s5Test" : `s${n}`)}</p>
        </section>
      ))}
    </article>
  );
}
