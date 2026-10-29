import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ForgotForm } from "./forgot-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/forgot">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Forgot" });
  return { title: t("title"), robots: { index: false } };
}

export default async function ForgotPage({ params }: PageProps<"/[locale]/forgot">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Forgot");
  return (
    <>
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">{t("subtitle")}</p>
      <ForgotForm />
      <p className="mt-5 text-center text-sm">
        <Link href="/login" className="font-medium text-brand">
          {t("back")}
        </Link>
      </p>
    </>
  );
}
