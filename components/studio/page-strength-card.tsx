import { CheckCircle2, Circle, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pageStrength, type PageStep } from "@/lib/core/rules/page-strength";
import type { ProfileVisibility } from "@/lib/launch-phase";
import type { Agency } from "@/lib/db/schema";

// The Studio's honest progress (docs/65): the page's real status, one next step, and a checklist score
// from the shared page-strength rule. Nothing here is ticked by default.

const HREF: Record<PageStep, string> = {
  work: "/portfolio-setup",
  services: "/studio/profile",
  whatsapp: "/studio/profile",
  city: "/studio/profile",
  publish: "/studio/publication",
  intro: "/studio/profile",
  logo: "/studio/profile",
  platforms: "/studio/profile",
  price: "/studio/packages",
  moreWork: "/studio/new",
};

export async function PageStrengthCard({ agency, visibility, packageCount }: { agency: Agency; visibility: ProfileVisibility; packageCount: number }) {
  const t = await getTranslations("PageStrength");
  const s = pageStrength({
    visibility,
    services: agency.services,
    city: agency.city,
    whatsapp: agency.whatsapp,
    postCount: agency.postCount,
    bio: agency.bio,
    avatarKey: agency.avatarKey,
    platforms: agency.platforms,
    startingPriceJod: agency.startingPriceJod,
    packageCount,
  });
  const steps = (Object.keys(HREF) as PageStep[]).map((key) => ({ key, done: !s.missing.includes(key) }));
  return (
    <section className="registration-card space-y-4" data-testid="page-strength" data-next={s.next ?? ""} data-match-ready={s.matchReady}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="!m-0">{t("title")}</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${visibility === "public" ? "bg-brand-soft text-brand" : "bg-muted text-muted-foreground"}`} data-testid="page-status">
          {t(`status.${visibility}`)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.percent} aria-label={t("title")}>
        <div className="h-full rounded-full bg-primary" style={{ inlineSize: `${s.percent}%` }} />
      </div>
      <p className="text-sm text-muted-foreground">{s.strong ? t("strong") : s.matchReady ? t("ready") : t("notReady")}</p>
      {s.next && (
        <Link href={HREF[s.next]} className="sw-invitation-cta inline-flex items-center gap-2" data-testid="page-next-step">
          <Plus className="size-4" aria-hidden /> {t(`steps.${s.next}`)}
        </Link>
      )}
      <details className="text-sm">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold">{t("all", { done: steps.filter((x) => x.done).length, total: steps.length })}</summary>
        <ol className="grid gap-1 pt-1">
          {steps.map((step) => (
            <li key={step.key}>
              <Link href={HREF[step.key]} className="flex min-h-11 items-center gap-2 rounded-lg px-2 hover:bg-muted" data-testid={`page-step-${step.key}`} data-done={step.done}>
                {step.done ? <CheckCircle2 className="size-5 shrink-0 text-brand" aria-hidden /> : <Circle className="size-5 shrink-0 text-muted-foreground" aria-hidden />}
                <span className={step.done ? "text-muted-foreground" : "font-medium"}>{t(`steps.${step.key}`)}</span>
              </Link>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
