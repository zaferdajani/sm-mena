import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SignInForm } from "@/app/[locale]/(auth)/signin/signin-form";
import { Link } from "@/i18n/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { isRegistrationPhase } from "@/lib/launch-phase";

export async function generateMetadata({ params }: PageProps<"/[locale]/owner">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "OwnerEarly" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/**
 * Where a business owner registers (docs/58-owner-early-registration.md): the
 * emailed-code account, then one screen about what they need. During the
 * registration phase this is their door; later it stays as the plain sign-in.
 */
export default async function OwnerPage({ params }: PageProps<"/[locale]/owner">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getSessionUser();
  if (user?.role === "client") redirect(`/${locale}/owner/needs`);
  const t = await getTranslations("OwnerEarly");
  const r = await getTranslations("Registration");
  return (
    <div data-testid="owner-start">
      {isRegistrationPhase() && <p className="registration-eyebrow">{r("phaseLabel")}</p>}
      <h1 className="text-2xl font-extrabold leading-tight">{t("title")}</h1>
      <p className="mt-2 mb-4 text-sm leading-7 text-muted-foreground">{t("intro")}</p>
      <ul className="mb-5 grid gap-1.5 text-sm leading-7" data-testid="owner-promises">
        {(["match", "private", "free"] as const).map((k) => (
          <li key={k} className="flex gap-2"><span aria-hidden className="text-brand">✓</span>{t(`promises.${k}`)}</li>
        ))}
      </ul>
      <SignInForm next={`/${locale}/owner/needs`} />
      <p className="mt-5 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <Megaphone className="size-4 text-brand" aria-hidden />
        {t("provider")}{" "}
        <Link href="/join" className="font-medium text-brand" data-testid="owner-to-join">{t("providerLink")}</Link>
      </p>
    </div>
  );
}
