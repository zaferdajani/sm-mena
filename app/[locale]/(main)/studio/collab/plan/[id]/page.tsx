import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/features/coming-soon";
import { CollabTabs } from "@/components/collab/collab-tabs";
import { SubmitButton } from "@/components/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getPlan, openRoles } from "@/lib/data/collab-plans";
import { workBadgeCount } from "@/lib/data/work-orders";
import { lineLabel } from "@/lib/deliverables";
import { formatDate } from "@/lib/format";
import { roleLabel } from "@/lib/services/catalog";
import { cn } from "@/lib/utils";
import { deletePlanAction } from "../../intel-actions";
import { intelligencePage } from "../../gate";

const KIND_STYLE: Record<string, string> = { in_house: "bg-brand text-white", partner: "bg-brand-soft text-brand", candidate: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100", unfilled: "bg-muted text-muted-foreground" };

/** One plan: packages, coverage per role with inspectable sources, and the honest note that nothing here is booked. */
export default async function PlanViewPage({ params, searchParams }: PageProps<"/[locale]/studio/collab/plan/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { agency, soonFeature } = await intelligencePage();
  if (soonFeature) return <ComingSoon feature={soonFeature} />;
  const plan = await getPlan(agency.id, id);
  if (!plan) notFound();
  const sp = await searchParams;
  const [t, tDel, tPlat, tCollab, badge] = await Promise.all([getTranslations("Planner"), getTranslations("Deliverables"), getTranslations("Platforms"), getTranslations("Collab"), workBadgeCount(agency.id)]);
  const open = openRoles(plan.packages);
  const reason = typeof sp.reason === "string" ? sp.reason : "";
  return (
    <div className="mx-auto grid max-w-3xl gap-5" data-testid="plan-view" data-assistant={plan.assistant}>
      <CollabTabs active="plan" badges={{ work: badge }} />
      <header className="grid gap-1">
        <Link href="/studio/collab/plan" className="text-sm text-brand">{t("back")}</Link>
        <h1 className="text-lg font-bold break-words"><bdi>{plan.title}</bdi></h1>
        <p className="text-xs text-muted-foreground">{formatDate(plan.createdAt, locale)} · {plan.assistant === "none" ? t("byRules") : t("byAssistant", { name: plan.assistant })}</p>
        {["timeout", "error", "invalid", "no_json", "budget", "no_provider", "forbidden_content"].includes(reason) && <p className="rounded-lg border border-dashed p-2 text-xs text-muted-foreground" data-testid="assistant-fallback">{t(`fallback.${reason}`)}</p>}
      </header>
      <p className="rounded-xl border border-brand-line bg-brand-soft p-3 text-sm" data-testid="plan-disclaimer">{t("disclaimer")}</p>
      {plan.brief && <section className="grid gap-1 rounded-2xl border p-4 text-sm"><h2 className="font-semibold">{t("brief")}</h2><p className="whitespace-pre-line"><bdi>{plan.brief}</bdi></p><p className="text-xs text-muted-foreground">{t("briefNote")}</p></section>}
      {plan.privateNotes && <section className="grid gap-1 rounded-2xl border border-dashed p-4 text-sm" data-testid="plan-private-notes"><h2 className="font-semibold">{t("privateNotes")}</h2><p className="whitespace-pre-line"><bdi>{plan.privateNotes}</bdi></p><p className="text-xs text-muted-foreground">{t("privateNotesNote")}</p></section>}
      <section className="grid gap-3" data-testid="plan-packages">
        {plan.packages.map((p) => (
          <article key={p.key} className="grid gap-2 rounded-2xl border p-4" data-testid="plan-package">
            <h2 className="font-semibold">{tDel.has(`groups.${p.title}`) ? tDel(`groups.${p.title}`) : <bdi>{p.title}</bdi>}</h2>
            <p className="text-sm">{p.deliverables.map((d) => lineLabel(d, tDel, tPlat)).join(locale === "ar" ? "، " : ", ")}</p>
            <ul className="grid gap-2">
              {p.coverage.map((c) => (
                <li key={c.role} className="grid gap-1 rounded-xl bg-muted/40 p-2 text-sm" data-testid="plan-role" data-kind={c.kind}>
                  <p className="flex flex-wrap items-center gap-2"><b>{roleLabel(c.role, locale)}</b><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", KIND_STYLE[c.kind])}>{t(`kind.${c.kind}`)}</span></p>
                  {c.candidates.length > 0 && (
                    <ul className="grid gap-1.5">
                      {c.candidates.map((x) => {
                        const who = plan.people.get(x.agencyId);
                        return who ? (
                          <li key={x.agencyId} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border bg-background px-3 py-2 text-xs" data-testid="plan-candidate" data-source={x.source}>
                            <Link href={`/a/${who.handle}`} className="min-w-0 max-w-full truncate font-medium"><bdi>{who.name}</bdi></Link>
                            <span className="whitespace-nowrap text-muted-foreground">{tCollab(`kinds.${who.kind}`)} · {t(`source.${x.source}`)}</span>
                            <Link href={{ pathname: "/studio/collab/work/new", query: { to: who.id } }} className={buttonVariants({ size: "sm", variant: "outline", className: "ms-auto h-11 shrink-0 sm:h-9" })}>{tCollab("inquiry.start")}</Link>
                          </li>
                        ) : null;
                      })}
                    </ul>
                  )}
                  {c.kind === "unfilled" && <Link href={{ pathname: "/studio/collab", query: { role: c.role, q: "1" } }} className="inline-flex min-h-11 items-center text-xs font-medium text-brand">{t("findRole", { role: roleLabel(c.role, locale) })}</Link>}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
      {open.length > 0 && <p className="text-sm text-muted-foreground" data-testid="plan-open-roles">{t("openRoles", { count: open.length })}</p>}
      <details className="rounded-2xl border p-4 text-xs text-muted-foreground" data-testid="plan-sources">
        <summary className="cursor-pointer font-medium text-foreground">{t("sources")}</summary>
        <ul className="mt-2 grid gap-1">{plan.sources.map((s) => <li key={s.tool}><b>{t(`sourceTool.${s.tool}`)}</b>{Array.isArray(s.query.roles) && s.query.roles.length ? ` (${(s.query.roles as string[]).map((r) => roleLabel(r, locale)).join(locale === "ar" ? "، " : ", ")})` : ""}: {t("sourceIds", { count: s.ids.length })}</li>)}</ul>
      </details>
      <div className="flex flex-wrap gap-2">
        <Link href={{ pathname: "/studio/collab/plan", query: { from: plan.id } }} className={buttonVariants({ variant: "outline", className: "h-11" })} data-testid="plan-edit">{t("editAsNew")}</Link>
        <form action={deletePlanAction}><input type="hidden" name="id" value={plan.id} /><SubmitButton variant="ghost" className="h-11" testId="plan-delete">{t("delete")}</SubmitButton></form>
      </div>
    </div>
  );
}
