import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/features/coming-soon";
import { CollabHeader, CollabTabs, EmptyState } from "@/components/collab/collab-tabs";
import { PlanForm } from "@/components/collab/intel-widgets";
import { collabOptions } from "@/components/collab/options";
import { Link } from "@/i18n/navigation";
import { plannerAvailable } from "@/lib/ai/planner";
import { TEMPLATE_KEYS, type TemplateKey } from "@/lib/collab/templates";
import { getPlan, listPlans } from "@/lib/data/collab-plans";
import { workBadgeCount } from "@/lib/data/work-orders";
import { formatDate } from "@/lib/format";
import { intelligencePage } from "../gate";

/** Studio → Collaborate → Plan (docs/50): brief in, work packages and coverage out; nobody is booked. */
export default async function PlanPage({ params, searchParams }: PageProps<"/[locale]/studio/collab/plan">) {
  const { locale } = await params;
  const from = (await searchParams).from;
  setRequestLocale(locale);
  const { agency, soonFeature } = await intelligencePage();
  if (soonFeature) return <ComingSoon feature={soonFeature} />;
  const [t, tt, plans, opts, badge] = await Promise.all([getTranslations("Planner"), getTranslations("Templates"), listPlans(agency.id), collabOptions(locale, agency.country), workBadgeCount(agency.id)]);
  const templateNames = Object.fromEntries(TEMPLATE_KEYS.map((k) => [k, tt(`${k}.name`)])) as Record<TemplateKey, string>;
  // "Edit as a new plan": the previous brief prefilled; the rules run again on what the agency changes.
  const source = typeof from === "string" ? await getPlan(agency.id, from) : null;
  const initial = source ? { title: source.title, scope: source.brief, deliverables: source.deliverables, privateNotes: source.privateNotes } : undefined;
  return (
    <div className="mx-auto grid max-w-3xl gap-5" data-testid="collab-plan">
      <CollabTabs active="plan" badges={{ work: badge }} />
      <CollabHeader title={t("title")} intro={t("intro")} action={<Link href="/studio/collab/worksheet" className="text-sm font-medium text-brand" data-testid="worksheet-link">{t("worksheetLink")}</Link>} />
      <PlanForm platforms={opts.platforms} assistantAvailable={plannerAvailable()} templateNames={templateNames} initial={initial} />
      <section className="grid gap-2" data-testid="plan-list">
        <h2 className="font-semibold">{t("previous")}</h2>
        {plans.length === 0 ? <EmptyState title={t("noneTitle")} body={t("noneBody")} /> : (
          <ul className="grid gap-2">
            {plans.map((p) => (
              <li key={p.id}>
                <Link href={`/studio/collab/plan/${p.id}`} className="flex items-center gap-3 rounded-2xl border p-3 hover:bg-muted/50" data-testid="plan-row">
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium" dir="auto">{p.title}</span><span className="block text-xs text-muted-foreground">{t("packages", { count: p.packages.length })} · {formatDate(p.createdAt, locale)}{p.assistant !== "none" ? ` · ${t("withAssistant")}` : ""}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
