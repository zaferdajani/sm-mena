import { LifeBuoy, Mail, Store } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact" });
  return pageMeta({ locale, path: "/contact", title: t("title"), description: t("description") });
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Contact");
  const card = "flex items-start gap-3 rounded-xl border p-4 hover:bg-muted";
  return (
    <article className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </header>
      <ul className="grid gap-3">
        <li>
          <Link href="/support" className={card}>
            <LifeBuoy className="mt-0.5 size-5 text-brand" />
            <span>
              <b className="block">{t("support.title")}</b>
              <span className="text-sm text-muted-foreground">{t("support.body")}</span>
            </span>
          </Link>
        </li>
        <li>
          <Link href="/join" className={card}>
            <Store className="mt-0.5 size-5 text-brand" />
            <span>
              <b className="block">{t("agencies.title")}</b>
              <span className="text-sm text-muted-foreground">{t("agencies.body")}</span>
            </span>
          </Link>
        </li>
        <li>
          <a href="mailto:privacy@sawwiq.jo" className={card}>
            <Mail className="mt-0.5 size-5 text-brand" />
            <span>
              <b className="block">{t("privacy.title")}</b>
              <span className="text-sm text-muted-foreground">{t("privacy.body")}</span>
              <span className="mt-1 block text-sm font-medium" dir="ltr">privacy@sawwiq.jo</span>
            </span>
          </a>
        </li>
      </ul>
    </article>
  );
}
