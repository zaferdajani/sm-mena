import { FileText, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageStrengthCard } from "@/components/studio/page-strength-card";
import { publicationFor } from "@/lib/data/publication";
import { listPackages } from "@/lib/data/packages";
import { countryName } from "@/lib/core/catalog/countries";
import { ownerNeedsInCountry, ownerNeedsStats } from "@/lib/data/owner-needs";
import { founderEligibility } from "@/lib/founding";
import { getLocale } from "next-intl/server";
import type { Agency } from "@/lib/db/schema";

export async function RegistrationNotice() {
  const t = await getTranslations("Registration");
  return <aside className="registration-notice" data-testid="registration-notice"><strong>{t("phaseLabel")}</strong><p>{t("studio.notice")}</p><Link href="/studio/publication">{t("studio.visibilityLink")}</Link></aside>;
}

// The Studio home during registration (docs/65): the page's real status and one next step first; demand
// and the Pioneer status below, folded.
export async function StudioRegistration({ agency }: { agency: Agency }) {
  const [t, locale, publication, packages, owners, ownersHere] = await Promise.all([getTranslations("Registration"), getLocale(), publicationFor(agency.id), listPackages(agency.id), ownerNeedsStats(), ownerNeedsInCountry(agency.country)]);
  const eligibility = founderEligibility({ ...agency, packageCount: packages.length });
  const eligible = eligibility.eligible;
  return <div className="space-y-6" data-testid="registration-studio">
    <PageStrengthCard agency={agency} visibility={publication.visibility} packageCount={packages.length} />
    <section className="registration-card"><p className="registration-eyebrow">{t("studio.eyebrow")}</p><h1 className="text-2xl font-extrabold">{t("studio.title")}</h1><p>{t("studio.intro")}</p><p className="registration-demand" data-testid="studio-owners"><strong>{t("studio.ownersSoFar", { count: owners.total })}</strong>{owners.total > 0 && <> · {t("studio.ownersInCountry", { count: ownersHere, country: countryName(agency.country, locale) })}</>}<span>{t("studio.ownersNote")}</span></p>
      <div className="registration-actions"><Link href="/studio/import/behance" className="registration-secondary" data-testid="registration-import-link">{t("studio.importLink")}</Link><Link href="/studio/packages" className="registration-secondary"><FileText className="size-4" />{t("studio.addPackage")}</Link><Link href="/support" className="registration-secondary">{t("studio.help")}</Link></div></section>
    <details className="registration-card"><summary className="cursor-pointer font-semibold"><ShieldCheck className="inline size-5" aria-hidden /> {t("studio.pioneerTitle")}</summary><p>{t(eligible ? "studio.pioneerEligible" : eligibility.cohort ? "studio.pioneerPending" : "studio.pioneerUnavailable")}</p><p className="registration-note">{t("pioneersNote")}</p></details>
  </div>;
}
