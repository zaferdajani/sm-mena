import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/features/coming-soon";
import { CollabHeader, CollabTabs } from "@/components/collab/collab-tabs";
import { PrefsForm } from "@/components/collab/intel-widgets";
import { getPrefs } from "@/lib/data/collab-prefs";
import { workBadgeCount } from "@/lib/data/work-orders";
import { intelligencePage } from "../gate";

/** Reminder preferences and the collaborator-feedback opt-out (docs/50). */
export default async function PreferencesPage({ params }: PageProps<"/[locale]/studio/collab/preferences">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency, soonFeature } = await intelligencePage();
  if (soonFeature) return <ComingSoon feature={soonFeature} />;
  const [t, prefs, badge] = await Promise.all([getTranslations("NextActions"), getPrefs(agency.id), workBadgeCount(agency.id)]);
  return (
    <div className="mx-auto grid max-w-3xl gap-5" data-testid="collab-preferences">
      <CollabTabs active="plan" badges={{ work: badge }} />
      <CollabHeader title={t("prefs.title")} intro={t("prefs.intro")} />
      <PrefsForm muted={prefs.mutedKinds} quietStart={prefs.quietStart} quietEnd={prefs.quietEnd} showFeedback={prefs.showFeedback} />
    </div>
  );
}
