import { CheckCircle2, Circle, ExternalLink, Plus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClicksChart } from "@/components/studio/clicks-chart";
import { Link } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { agencyInsights, topPosts } from "@/lib/data/insights";
import { listPackages } from "@/lib/data/packages";
import { entitlementsFor } from "@/lib/monetization/entitlements";

export default async function StudioOverview({ params, searchParams }: PageProps<"/[locale]/studio">) {
  const { locale } = await params;
  const saved = (await searchParams).saved === "profile";
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const t = await getTranslations("Studio");
  const ent = entitlementsFor(agency);
  const days = Math.min(30, ent.insightsDays);
  const [insights, top, packages] = await Promise.all([agencyInsights(agency.id, days), topPosts(agency.id), listPackages(agency.id)]);
  // Setup steps, in order: the page, the packages, the first work.
  const steps = [
    { key: "profile", href: "/studio/profile", done: Boolean(agency.bio.trim() && agency.services.length) },
    { key: "packages", href: "/studio/packages", done: packages.length > 0 },
    { key: "post", href: "/studio/new", done: agency.postCount > 0 },
  ] as const;
  const n = (v: number) => v.toLocaleString(locale === "ar" ? "ar-JO-u-nu-latn" : "en");

  const tiles = [
    ["contacts", insights.totals.contact_click],
    ["inquiries", insights.totals.inquiry],
    ["recommended", insights.totals.recommended],
    ["proposals", insights.totals.proposal],
    ["profileViews", insights.totals.profile_view],
    ["postViews", insights.totals.post_view],
    ["likes", insights.totals.like],
    ["follows", insights.totals.follow],
  ] as const;

  return (
    <div className="space-y-6">
      {saved && (
        <p role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-brand-line bg-brand-soft p-4 text-sm font-medium" data-testid="profile-saved">
          ✓ {t("savedProfile")}
          <Link href={`/a/${agency.handle}`} className="inline-flex items-center gap-1 text-brand">
            {t("viewPage")} <ExternalLink className="size-3.5" />
          </Link>
        </p>
      )}
      {steps.some((x) => !x.done) && (
        <section className="rounded-xl border border-brand-line bg-brand-soft p-4" data-testid="setup-steps">
          <h2 className="font-semibold">{t("setup.title")}</h2>
          <ol className="mt-3 grid gap-2">
            {steps.map((x) => (
              <li key={x.key}>
                <Link href={x.href} className="flex items-center gap-2 rounded-lg bg-background p-3 text-sm hover:bg-muted" data-testid={`setup-${x.key}`} data-done={x.done}>
                  {x.done ? <CheckCircle2 className="size-5 shrink-0 text-brand" aria-label={t("setup.done")} /> : <Circle className="size-5 shrink-0 text-muted-foreground" aria-hidden />}
                  <span className={x.done ? "text-muted-foreground line-through" : "font-medium"}>{t(`setup.${x.key}`)}</span>
                  {x.key === "post" && !x.done && <Plus className="ms-auto size-4 text-brand" aria-hidden />}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{t("period", { days })}</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="insight-tiles">
          {tiles.map(([key, value]) => (
            <div key={key} className="flex flex-col-reverse rounded-xl border p-3">
              <dt className="text-xs text-muted-foreground">{t(`stats.${key}`)}</dt>
              <dd className="text-2xl font-bold tabular-nums">{n(value)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <ClicksChart data={insights.daily} title={t("chartTitle")} tableLabel={t("chartTable")} dateLabel={t("date")} valueLabel={t("clicks")} locale={locale} />
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border p-4">
          <h2 className="mb-2 text-sm font-semibold">{t("stats.contacts")}</h2>
          <ul className="space-y-1.5 text-sm">
            {(["whatsapp", "phone", "email", "website", "instagram"] as const).map((c) => (
              <li key={c} className="flex justify-between">
                <span>{t(`channels.${c}`)}</span>
                <span className="font-semibold tabular-nums">{n(insights.channels[c] ?? 0)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border p-4">
          <h2 className="mb-2 text-sm font-semibold">{t("topPosts")}</h2>
          {top.length ? (
            <ol className="space-y-2 text-sm">
              {top.map((p) => (
                <li key={p.id}>
                  <Link href={`/p/${p.id}`} className="line-clamp-1 hover:underline">{p.caption || p.id}</Link>
                  <p className="text-xs text-muted-foreground">👁 {n(p.viewCount)} · ♥ {n(p.likeCount)} · 🔖 {n(p.saveCount)}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
          )}
        </section>
      </div>
      <section className="rounded-xl border p-4 text-sm">
        <h2 className="mb-1 font-semibold">{t("plan.title")}: {t(`plan.${ent.id}`)}</h2>
        <p className="text-muted-foreground">
          {ent.enforced && ent.maxPosts ? t("plan.postsUsed", { used: agency.postCount, max: ent.maxPosts }) : t("plan.freeLaunch")}
        </p>
      </section>
    </div>
  );
}
