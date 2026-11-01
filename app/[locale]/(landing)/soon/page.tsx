import { RegistrationView } from "@/components/registration/registration-view";
import { isRegistrationPhase } from "@/lib/launch-phase";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TeaserView } from "@/components/teaser/teaser-view";
import { accountLink } from "@/lib/account-link";
import { pageMeta } from "@/lib/seo";
import { notFound } from "next/navigation";
import { showComingSoon } from "@/lib/coming-soon";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/soon">): Promise<Metadata> {
  const { locale } = await params;
  if (isRegistrationPhase()) {
    const r = await getTranslations({ locale, namespace: "Registration" });
    return pageMeta({ locale, path: "" , title: r("metaTitle"), absoluteTitle: true, description: r("metaDescription") });
  }
  const t = await getTranslations({ locale, namespace: "Teaser" });
  return pageMeta({
    locale,
    path: "/soon",
    title: t("metaTitle"),
    absoluteTitle: true,
    description: t("metaDescription"),
    images: [{ url: "/teaser/citadel-16x9.webp", width: 1600, height: 900, alt: t("metaTitle") }],
  });
}

/** The pre-launch teaser (docs/39); also the front page while "prelaunch_home" is on. */
export default async function SoonPage({ params }: PageProps<"/[locale]/soon">) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (isRegistrationPhase()) return <RegistrationView locale={locale} />;
  // The pre-launch teaser is a "coming soon" screen: hidden in production builds.
  if (!showComingSoon()) notFound();
  return <TeaserView locale={locale} account={await accountLink(locale)} />;
}
