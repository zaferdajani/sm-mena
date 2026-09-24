import { getTranslations, setRequestLocale } from "next-intl/server";
import { GoogleForm } from "@/components/studio/google-form";
import { ProfileForm } from "@/components/studio/profile-form";
import { requireAgency } from "@/lib/auth/guards";
import { countryOptions } from "@/lib/country-options";
import { INDUSTRIES, PLATFORMS, serviceOptions, TEAM_SIZES } from "@/lib/labels";
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
      {welcome && <p className="mb-5 rounded-xl border border-brand-line bg-brand-soft p-4 text-sm">{t("welcome")}</p>}
      <div className="mb-6">
        <GoogleForm current={agency.googleMapsUrl ?? agency.googlePlaceId} />
      </div>
      <ProfileForm
        agency={{ ...agency, avatarUrl: mediaUrl(agency.avatarKey) }}
        options={{
          serviceGroups: serviceOptions(locale),
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
