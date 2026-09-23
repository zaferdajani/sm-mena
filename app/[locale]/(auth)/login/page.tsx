import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LoginForm } from "./login-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/login">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  return { title: t("loginTitle"), robots: { index: false } };
}

export default async function LoginPage({ params }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");
  return (
    <>
      <h1 className="text-xl font-bold">{t("loginTitle")}</h1>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">{t("loginSubtitle")}</p>
      <LoginForm />
      <p className="mt-5 text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/join" className="font-medium text-brand">
          {t("joinLink")}
        </Link>
      </p>
    </>
  );
}
