import { isRegistrationPhase } from "@/lib/launch-phase";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cookies } from "next/headers";
import { currentCountry, phoneCountry } from "@/lib/country-choice";
import { isReferralCode, normalizeCode, REFERRAL_COOKIE } from "@/lib/referrals";
import { countryOptions } from "@/lib/country-options";
import { FOOTER_SERVICES } from "@/components/shell/site-footer";
import { JOIN_ROLES, roleLabel } from "@/lib/services/catalog";
import { Palette } from "lucide-react";
import { canUse } from "@/lib/feature-gate";
import { JoinForm } from "./join-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/join">): Promise<Metadata> {
  const { locale } = await params;
  if (isRegistrationPhase()) {
    const r = await getTranslations({ locale, namespace: "Registration" });
    return pageMeta({ locale, path: "/join", title: r("joinTitle"), description: r("joinNotice") });
  }
  const t = await getTranslations({ locale, namespace: "Auth" });
  return pageMeta({ locale, path: "/join", title: t("joinTitle"), description: t("joinSubtitle") });
}

export default async function JoinPage({ params, searchParams }: PageProps<"/[locale]/join">) {
  const { locale } = await params;
  const sp = await searchParams;
  const fromUrl = sp.ref;
  // The collaborator's invitation token carries through the same real account flow.
  const invite = typeof sp.invite === "string" && /^[A-Za-z0-9_-]{20,64}$/.test(sp.invite) ? sp.invite : "";
  const fromCookie = (await cookies()).get(REFERRAL_COOKIE)?.value;
  const refCode = [fromUrl, fromCookie].map(normalizeCode).find((c) => isReferralCode(c)) ?? "";
  setRequestLocale(locale);
  const t = await getTranslations("Auth");
  const [countries, country, phoneFrom, behance] = await Promise.all([countryOptions(locale), currentCountry(), phoneCountry(), canUse("portfolio_import")]);
  const tb = await getTranslations("BehanceImport.shortcut");
  const r = await getTranslations("Registration");
  const registration = isRegistrationPhase();
  return (
    <>
      <h1 className="text-xl font-bold">{registration ? r("joinTitle") : t("joinTitle")}</h1>
      {!registration && <p className="mt-1 mb-5 text-sm text-muted-foreground">{t("joinSubtitle")}</p>}
      <JoinForm
        countries={countries}
        defaultCountry={country}
        phoneCountry={phoneFrom}
        refCode={refCode}
        invite={invite}
        popular={[...FOOTER_SERVICES]}
        roles={JOIN_ROLES.map((key) => ({ key, label: roleLabel(key, locale) }))}
        aside={
          <>
            {registration && <aside className="registration-notice" data-testid="registration-join-notice"><strong>{r("phaseLabel")}</strong><p>{r("joinNotice")}</p><Link href="/examples">{r("exampleCta")}</Link></aside>}
            {behance && (
              <p className="flex items-start gap-2 rounded-xl border border-brand-line bg-brand-soft p-3 text-sm" data-testid="join-behance">
                <Palette className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                <span>{tb("join")}</span>
              </p>
            )}
          </>
        }
      />
      <p className="mt-5 text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-medium text-brand">{t("loginLink")}</Link>
      </p>
    </>
  );
}
