import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { canUse } from "@/lib/feature-gate";
import { creatorSetupProgress } from "@/lib/creator/setup";
import { PortfolioConcept, PortfolioExamples } from "@/components/studio/creator-guide";

/** A replayable, authenticated tutorial—not a new prerequisite for publishing. */
export default async function CreatorSetupPage({ params }: PageProps<"/[locale]/studio/setup">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const t = await getTranslations("CreatorSetup");
  const progress = creatorSetupProgress(agency);
  const imports = await canUse("portfolio_import");
  const action = "inline-flex min-h-11 items-center justify-center rounded-xl border bg-background px-4 py-2 text-sm font-semibold text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  return (
    <div className="mx-auto max-w-3xl space-y-7" data-testid="creator-setup-page">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm leading-7 text-muted-foreground">{t("intro")}</p>
      </header>
      <PortfolioConcept />
      <section className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
        <h2 className="font-semibold">{t("essentials")}</h2>
        <p id="creator-progress-label" className="text-sm" data-testid="creator-setup-progress">{t("progress", { done: progress.completed, total: progress.total })}</p>
        <progress aria-labelledby="creator-progress-label" value={progress.completed} max={progress.total} className="h-2 w-full accent-primary" />
        <ol className="grid gap-3 sm:grid-cols-2">
          {([{ key: "profile", href: "/studio/profile", label: "editProfile", body: "profileStep" }, { key: "work", href: "/studio/new", label: "addWork", body: "workStep" }] as const).map((item) => (
            <li key={item.key} className="min-w-0 space-y-3 rounded-xl border p-4" data-complete={progress[item.key]}>
              <p className="text-xs font-semibold text-brand">{progress[item.key] ? t("complete") : t("todo")}</p>
              <p className="text-sm leading-7">{t(item.body)}</p>
              <Link href={item.href} className={action}>{t(item.label)}</Link>
            </li>
          ))}
        </ol>
        <p className="text-sm leading-7 text-muted-foreground">{t("optionalHelp")}</p>
        <Link href="/studio/clients" className={action}>{t("clientLink")} · {t("optional")}</Link>
      </section>
      <PortfolioExamples />
      <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5">
        <h2 className="font-semibold">{t("existingTitle")}</h2>
        <p className="text-sm leading-7 text-muted-foreground">{t("existingBody")}</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/studio/new" className={action}>{t("manual")}</Link>
          {imports && <><Link href="/studio/import" className={action}>{t("pdf")}</Link><Link href="/studio/import/behance" className={action}>{t("behance")}</Link></>}
        </div>
      </section>
      <details className="rounded-2xl border bg-card p-4">
        <summary className="cursor-pointer py-2 font-semibold">{t("connectionsTitle")}</summary>
        <p className="my-3 text-sm leading-7 text-muted-foreground">{t("connectionsBody")}</p>
        <div className="flex flex-wrap gap-2"><Link href="/studio/profile" className={action}>{t("linkOwn")}</Link><Link href="/studio/clients" className={action}>{t("linkClient")}</Link></div>
      </details>
      <section className="space-y-2 rounded-2xl border border-brand-line bg-brand-soft p-4">
        <h2 className="font-semibold">{t("beforePublish")}</h2>
        <p className="text-sm leading-7">{t("publishReminder")}</p>
        <Link href={`/a/${agency.handle}`} className={action}>{t("viewProfile")}</Link>
      </section>
    </div>
  );
}
