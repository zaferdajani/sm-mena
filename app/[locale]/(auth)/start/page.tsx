import type { Metadata } from "next";
import { Briefcase, Megaphone } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]/start">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Start" });
  return { title: t("metaTitle") };
}

/**
 * The one "Join" entry point: a new visitor picks what they are. Providers
 * go to the agency sign-up; business owners to the emailed-code account.
 */
export default async function StartPage({ params }: PageProps<"/[locale]/start">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Start");
  return (
    <>
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">{t("subtitle")}</p>
      <div className="grid gap-3">
        <Link
          href="/join"
          className="group rounded-xl border-2 border-brand/30 p-4 transition-colors hover:border-brand hover:bg-brand-soft"
          data-testid="start-provider"
        >
          <span className="flex items-center gap-2 font-semibold">
            <Megaphone className="size-5 shrink-0 text-brand" aria-hidden />
            {t("providerTitle")}
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">{t("providerBody")}</span>
          <span className="mt-3 inline-flex rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">{t("providerCta")}</span>
        </Link>
        <Link
          href="/signin"
          className="group rounded-xl border-2 p-4 transition-colors hover:border-brand hover:bg-brand-soft"
          data-testid="start-client"
        >
          <span className="flex items-center gap-2 font-semibold">
            <Briefcase className="size-5 shrink-0 text-brand" aria-hidden />
            {t("clientTitle")}
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">{t("clientBody")}</span>
          <span className="mt-3 inline-flex rounded-lg border px-3 py-2 text-sm font-medium">{t("clientCta")}</span>
        </Link>
        <Link href="/explore" className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline" data-testid="start-browse">
          {t("clientBrowse")}
        </Link>
      </div>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        {t("have")}{" "}
        <Link href="/login" className="font-medium text-brand" data-testid="start-login">
          {t("signIn")}
        </Link>
      </p>
    </>
  );
}
