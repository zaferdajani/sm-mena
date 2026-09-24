import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getPendingMfaUser } from "@/lib/auth/session";
import { cancelLogin } from "../../actions";
import { VerifyForm } from "./verify-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/login/verify">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Security" });
  return { title: t("verifyTitle"), robots: { index: false } };
}

export default async function VerifyPage({ params }: PageProps<"/[locale]/login/verify">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getPendingMfaUser();
  if (!user) return redirect({ href: "/login", locale });
  const t = await getTranslations("Security");
  return (
    <>
      <h1 className="text-xl font-bold">{t("verifyTitle")}</h1>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">{t("verifyBody")}</p>
      <VerifyForm />
      <form action={cancelLogin} className="mt-4 text-center">
        <button type="submit" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          {t("cancel")}
        </button>
      </form>
    </>
  );
}
