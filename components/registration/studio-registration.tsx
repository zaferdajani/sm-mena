import { CheckCircle2, Circle, Eye, Images, FileText, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BehanceShortcut } from "@/components/studio/behance-shortcut";
import { publicationFor } from "@/lib/data/publication";
import { listPackages } from "@/lib/data/packages";
import { founderEligibility } from "@/lib/founding";
import type { Agency } from "@/lib/db/schema";

export async function RegistrationNotice() {
  const t = await getTranslations("Registration");
  return <aside className="registration-notice" data-testid="registration-notice"><strong>{t("phaseLabel")}</strong><p>{t("studio.notice")}</p><Link href="/studio/publication">{t("studio.visibilityLink")}</Link></aside>;
}
export async function StudioRegistration({ agency }: { agency: Agency }) {
  const [t, publication, packages] = await Promise.all([getTranslations("Registration"), publicationFor(agency.id), listPackages(agency.id)]);
  const eligibility = founderEligibility({ ...agency, packageCount: packages.length });
  const eligible = eligibility.eligible;
  const steps = [
    { key: "profile", href: "/studio/profile", done: Boolean(agency.bio.trim() && agency.services.length) },
    { key: "work", href: agency.postCount > 0 ? "/studio/new" : "/portfolio-setup", done: agency.postCount > 0 || packages.length > 0 },
    { key: "visibility", href: "/studio/publication", done: !publication.legacy },
  ];
  return <div className="space-y-6" data-testid="registration-studio"><section className="registration-card"><p className="registration-eyebrow">{t("studio.eyebrow")}</p><h1 className="text-2xl font-extrabold">{t("studio.title")}</h1><p>{t("studio.intro")}</p></section>
    <section className="registration-card"><h2>{t("studio.stepsTitle")}</h2><ol className="registration-setup">{steps.map((step) => <li key={step.key}><Link href={step.href} data-testid={`registration-step-${step.key}`}>{step.done ? <CheckCircle2 aria-hidden /> : <Circle aria-hidden />}<span><strong>{t(`studio.steps.${step.key}.title`)}</strong><span>{t(`studio.steps.${step.key}.body`)}</span></span></Link></li>)}</ol><BehanceShortcut testId="registration-import" /></section>
    <section className="registration-card"><h2><ShieldCheck className="inline size-5" aria-hidden /> {t("studio.visibilityTitle")}</h2><p>{t(`publication.states.${publication.visibility}.summary`)}</p><div className="registration-actions"><Link href={`/a/${agency.handle}`} className="registration-secondary"><Eye className="size-4" />{t("studio.preview")}</Link><Link href="/studio/publication" className="registration-secondary">{t("studio.visibilityLink")}</Link></div></section>
    <section className="registration-pioneers"><div><h2>{t("studio.pioneerTitle")}</h2><p>{t(eligible ? "studio.pioneerEligible" : eligibility.cohort ? "studio.pioneerPending" : "studio.pioneerUnavailable")}</p><p className="registration-note">{t("pioneersNote")}</p></div></section>
    <div className="registration-actions"><Link href="/studio/new" className="sw-invitation-cta"><Images className="size-4" />{t("studio.addWork")}</Link><Link href="/studio/packages" className="registration-secondary"><FileText className="size-4" />{t("studio.addPackage")}</Link><Link href="/support" className="registration-secondary">{t("studio.help")}</Link></div>
  </div>;
}
