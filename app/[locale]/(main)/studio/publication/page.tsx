import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAgency } from "@/lib/auth/guards";
import { publicationFor } from "@/lib/data/publication";
import { PROFILE_VISIBILITIES } from "@/lib/launch-phase";
import { SubmitButton } from "@/components/submit-button";
import { Link } from "@/i18n/navigation";
import { savePublication } from "./actions";

export const metadata = { robots: { index: false, follow: false } };
export default async function PublicationPage({ params, searchParams }: PageProps<"/[locale]/studio/publication">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const [t, current, sp] = await Promise.all([getTranslations("Registration.publication"), publicationFor(agency.id), searchParams]);
  return <section className="registration-card" data-testid="publication-settings"><h1 className="text-2xl font-bold">{t("title")}</h1><p>{t("intro")}</p>
    {current.legacy && <p className="registration-notice">{t("legacy")}</p>}
    {sp.saved === "1" && <p role="status" className="registration-notice">{t("saved")}</p>}{sp.error && <p role="alert">{t("consentError")}</p>}
    <form action={savePublication} className="mt-6 space-y-5"><fieldset className="space-y-3"><legend className="mb-3 font-bold">{t("choose")}</legend>{PROFILE_VISIBILITIES.map((visibility) => <label key={visibility} className="registration-visibility-option"><input type="radio" name="visibility" value={visibility} defaultChecked={current.visibility === visibility} /><span><strong>{t(`states.${visibility}.title`)}</strong><span>{t(`states.${visibility}.body`)}</span></span></label>)}</fieldset>
      <label className="flex items-start gap-3"><input type="checkbox" name="acknowledge" required className="mt-2" /><span>{t("acknowledge")}</span></label><p className="registration-note">{t("mediaNote")}</p><SubmitButton>{t("save")}</SubmitButton>
    </form><Link href={`/a/${agency.handle}`} className="registration-secondary mt-5">{t("preview")}</Link>
  </section>;
}
