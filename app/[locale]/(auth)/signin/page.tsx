import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SignInForm } from "./signin-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/signin">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ClientAuth" });
  return { title: t("title"), robots: { index: false } };
}

/** Sign in for business owners: an emailed code, no password (docs/41). */
export default async function SignInPage({ params, searchParams }: PageProps<"/[locale]/signin">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ClientAuth");
  const ta = await getTranslations("Auth");
  const { next: raw, closed } = await searchParams;
  const next = typeof raw === "string" && /^\/[^/\\]/.test(raw) ? raw : `/${locale}/saved`;
  return (
    <>
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">{t("subtitle")}</p>
      {closed === "1" && (
        <p role="status" className="mb-4 rounded-lg bg-muted p-3 text-sm" data-testid="account-closed">
          {ta("closed")}
        </p>
      )}
      <SignInForm next={next} />
      <p className="mt-5 text-center text-sm text-muted-foreground">
        {t("agency")}{" "}
        <Link href="/login" className="font-medium text-brand">
          {t("agencyLink")}
        </Link>
      </p>
    </>
  );
}
