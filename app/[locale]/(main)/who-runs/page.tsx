import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BadgeCheck, Search } from "lucide-react";
import { AgencyAvatar } from "@/components/agency-avatar";
import { SocialIcon } from "@/components/social-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { demoMode } from "@/lib/demo-mode";
import { findWhoRuns, parseAccountQuery } from "@/lib/data/who-runs";
import { linkLabel } from "@/lib/social-links";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/who-runs">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "WhoRuns" });
  return pageMeta({ locale, path: "/who-runs", title: t("title"), description: t("intro") });
}

/** "Who runs this page?" (docs/28, marketing/05): the agency behind a page its client confirmed. */
export default async function WhoRunsPage({ params, searchParams }: PageProps<"/[locale]/who-runs">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("WhoRuns");
  const raw = String((await searchParams).q ?? "").slice(0, 300);
  const parsed = raw ? parseAccountQuery(raw) : null;
  const hits = parsed ? await findWhoRuns(raw, { includeDemo: await demoMode() }) : [];
  const handle = parsed ? `@${parsed.handle}` : raw;
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8" data-testid="who-runs">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("intro")}</p>
      <form method="get" className="mt-5 flex gap-2" role="search">
        <Input name="q" defaultValue={raw} placeholder={t("placeholder")} dir="ltr" className="h-11 flex-1" aria-label={t("title")} data-testid="who-runs-input" />
        <Button type="submit" className="h-11 gap-1.5" data-testid="who-runs-submit">
          <Search className="size-4" /> {t("search")}
        </Button>
      </form>
      {raw && !parsed && <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{t("invalid")}</p>}
      {parsed && hits.length > 0 && (
        <section className="mt-6" aria-live="polite">
          <h2 className="mb-3 font-semibold">{t("resultsTitle", { count: hits.length, handle })}</h2>
          <ul className="grid gap-3">
            {hits.map((h) => (
              <li key={`${h.agency.id}:${h.client.id}`} className="flex items-center gap-3 rounded-xl border p-3" data-testid="who-runs-hit">
                <AgencyAvatar name={h.agency.name} src={h.agency.avatarUrl} size={48} />
                <div className="min-w-0 flex-1">
                  <Link href={`/a/${h.agency.handle}`} className="font-semibold hover:underline" dir="auto">{h.agency.name}</Link>
                  <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                    <SocialIcon kind={h.client.kind} className="size-4 text-[10px]" />
                    <span>{t("runs", { handle: linkLabel(h.client.kind, h.client.value) })}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand"><BadgeCheck className="size-3.5" /> {t("confirmed")}</span>
                  </p>
                </div>
                <Link href={`/a/${h.agency.handle}/c/${h.client.id}`} className="shrink-0 text-sm font-medium text-brand">{t("seeWork")}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {parsed && hits.length === 0 && (
        <section className="mt-6 rounded-xl border border-dashed p-4 text-sm" data-testid="who-runs-none">
          <p>{t("none", { handle })}</p>
          <p className="mt-2 text-muted-foreground">{t("noneHint")}</p>
          <Link href="/join" className="mt-3 inline-block font-medium text-brand">{t("join")}</Link>
        </section>
      )}
      <p className="mt-10 text-center text-sm text-muted-foreground">{t("movement")}</p>
    </div>
  );
}
