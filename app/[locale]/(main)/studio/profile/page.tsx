import { getTranslations, setRequestLocale } from "next-intl/server";
import { BehanceShortcut } from "@/components/studio/behance-shortcut";
import { GoogleForm } from "@/components/studio/google-form";
import { ProfileForm } from "@/components/studio/profile-form";
import { requireAgency } from "@/lib/auth/guards";
import { countryOptions } from "@/lib/country-options";
import { FOOTER_SERVICES } from "@/components/shell/site-footer";
import { INDUSTRIES, PLATFORMS, TEAM_SIZES } from "@/lib/labels";
import { ROLES } from "@/lib/services/catalog";
import { pendingTexts } from "@/lib/services/tags";
import { mediaUrl } from "@/lib/storage";

export default async function StudioProfilePage({ params, searchParams }: PageProps<"/[locale]/studio/profile">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const welcome = (await searchParams).welcome === "1";
  const { agency } = await requireAgency();
  const t = await getTranslations("Studio");
  const [tPlat, tInd, tLang, tTeam] = await Promise.all([
    getTranslations("Platforms"), getTranslations("Industries"), getTranslations("Languages"), getTranslations("TeamSize"),
  ]);
  return (
    <div className="mx-auto max-w-xl">
      {welcome && (
        <div className="mb-5 space-y-3">
          <p className="rounded-xl border border-brand-line bg-brand-soft p-4 text-sm" data-testid="profile-welcome">{t("welcome")}</p>
          {/* The quickest start for someone who already has a portfolio (docs/47). */}
          <BehanceShortcut testId="welcome-behance" />
        </div>
      )}
      <div className="mb-6">
        <GoogleForm current={agency.googleMapsUrl ?? agency.googlePlaceId} />
      </div>
      <ProfileForm
        welcome={welcome}
        agency={{ ...agency, avatarUrl: mediaUrl(agency.avatarKey), pendingTexts: (await pendingTexts(agency.pendingServices)).map((p) => p.text) }}
        options={{
          roles: ROLES.map((r) => ({ key: r.key, label: locale === "ar" ? r.name_ar : r.name_en })),
          popularServices: [...FOOTER_SERVICES],
          countries: await countryOptions(locale),
          platforms: PLATFORMS.map((key) => ({ key, label: tPlat(key) })),
          industries: INDUSTRIES.map((key) => ({ key, label: tInd(key) })),
          languages: (["ar", "en"] as const).map((key) => ({ key, label: tLang(key) })),
          teamSizes: TEAM_SIZES.map((key) => ({ key, label: tTeam(key) })),
        }}
      />
    </div>
  );
}
