import { getTranslations, setRequestLocale } from "next-intl/server";
import { StatTiles } from "@/components/admin/stat-tiles";
import { FilterChips } from "@/components/admin/filter-chips";
import { requireStaff } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { bugCounts, listErrors, listSiteChecks, listSupportRequests, staleErrorCount, SUPPORT_STATUSES, type SupportStatus } from "@/lib/data/bugs";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { resolveStaleErrorsAction, updateErrorAction, updateSupportAction } from "../bug-actions";

const STATUS_STYLE: Record<string, string> = {
  open: "bg-destructive/10 text-destructive",
  investigating: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  fixed: "bg-brand/10 text-brand",
  wont_fix: "bg-muted text-muted-foreground",
  cannot_reproduce: "bg-muted text-muted-foreground",
  new: "bg-destructive/10 text-destructive",
  planned: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  done: "bg-brand/10 text-brand",
  declined: "bg-muted text-muted-foreground",
};

export default async function AdminBugs({ params, searchParams }: PageProps<"/[locale]/admin/bugs">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireStaff("support.manage");
  // Support staff see user reports only; the error journal is for maintenance and backbone.
  const canErrors = can(me.role, "bugs.manage");
  const sp = await searchParams;
  const tab = sp.tab === "reports" || !canErrors ? "reports" : "errors";
  const t = await getTranslations("AdminBugs");
  const [counts, checks] = await Promise.all([bugCounts(), canErrors ? listSiteChecks() : []]);
  const ago = (d: Date) => timeAgo(d.toISOString(), locale);

  return (
    <div className="space-y-5">
      <StatTiles
        locale={locale}
        tiles={[
          { label: t("tiles.open"), value: counts.open, tone: counts.open ? "bad" : undefined },
          { label: t("tiles.investigating"), value: counts.investigating },
          { label: t("tiles.fixed"), value: counts.fixed },
          { label: t("tiles.occurrences"), value: counts.occurrences },
          { label: t("tiles.newReports"), value: counts.newReports, tone: counts.newReports ? "bad" : undefined },
        ]}
      />
      {canErrors && <SiteChecks checks={checks} t={t} ago={ago} />}
      <FilterChips
        param="tab"
        current={tab}
        options={[
          ...(canErrors ? [{ value: "errors", label: t("tabs.errors") }] : []),
          { value: "reports", label: t("tabs.reports", { count: counts.newReports }) },
        ]}
      />
      {tab === "errors" ? <ErrorList filter={sp.filter} hours={sp.hours} t={t} ago={ago} /> : <ReportList status={sp.status} t={t} ago={ago} locale={locale} />}
    </div>
  );
}

type T = Awaited<ReturnType<typeof getTranslations<"AdminBugs">>>;

/** Automatic checks every 30 minutes (docs/52): the latest run and the recent history. */
function SiteChecks({ checks, t, ago }: { checks: Awaited<ReturnType<typeof listSiteChecks>>; t: T; ago: (d: Date) => string }) {
  const last = checks[0];
  return (
    <details className="rounded-xl border p-3 text-sm" data-testid="site-checks">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
        <span className={cn("size-2.5 rounded-full", !last ? "bg-muted-foreground" : last.ok ? "bg-brand" : "bg-destructive")} aria-hidden />
        <span className="font-medium">{t("checks.title")}</span>
        <span className="text-muted-foreground">
          {!last ? t("checks.none") : last.ok ? t("checks.allOk", { ago: ago(last.ranAt), count: last.results.length }) : t("checks.failing", { ago: ago(last.ranAt), count: last.failures })}
        </span>
      </summary>
      <p className="mt-2 text-xs text-muted-foreground">{t("checks.body")}</p>
      {checks.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs">
          {checks.map((c) => (
            <li key={c.id} className="flex flex-wrap items-baseline gap-x-2">
              <span className={c.ok ? "text-brand" : "text-destructive"}>{c.ok ? "✓" : "✕"}</span>
              <span className="text-muted-foreground">{ago(c.ranAt)}</span>
              <span>{c.ok ? t("checks.runOk") : t("checks.runFailed", { count: c.failures })}</span>
              {c.closed > 0 && <span className="text-muted-foreground">· {t("checks.closed", { count: c.closed })}</span>}
              {!c.ok && (
                <span className="basis-full text-muted-foreground" dir="ltr">
                  {c.results.filter((r) => !r.ok).map((r) => `${r.path}: ${r.problem}`).join(" · ")}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

/** Default window for "not seen since": a day without the error after a fix is deployed. */
const STALE_HOURS = 24;

async function ErrorList({ filter: raw, hours: rawHours, t, ago }: { filter: unknown; hours: unknown; t: T; ago: (d: Date) => string }) {
  const filter = raw === "resolved" || raw === "all" ? raw : "unresolved";
  const hours = Math.min(24 * 90, Math.max(1, Number.parseInt(String(rawHours ?? ""), 10) || STALE_HOURS));
  const [rows, stale] = await Promise.all([listErrors(filter), filter === "unresolved" ? staleErrorCount(hours) : 0]);
  return (
    <section className="space-y-3">
      <FilterChips
        param="filter"
        current={filter}
        keep={{ tab: "errors" }}
        options={(["unresolved", "resolved", "all"] as const).map((f) => ({ value: f, label: t(`filters.${f}`) }))}
      />
      {stale > 0 && (
        <form action={resolveStaleErrorsAction} className="grid gap-2 rounded-xl border border-brand/30 bg-brand-soft p-3 text-sm" data-testid="resolve-stale">
          <p className="font-medium">{t("stale.title", { count: stale, hours })}</p>
          <p className="text-xs text-muted-foreground">{t("stale.body")}</p>
          <input type="hidden" name="hours" value={hours} />
          <textarea name="notes" required minLength={3} defaultValue={t("stale.notesDefault")} rows={2} className="rounded-md border bg-background p-2" dir="auto" />
          <input name="commit" placeholder={t("commit")} className="h-9 rounded-md border bg-background px-2" dir="ltr" />
          <button type="submit" className="w-fit rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground" data-testid="resolve-stale-button">
            {t("stale.button", { count: stale })}
          </button>
        </form>
      )}
      {!rows.length && <p className="py-8 text-center text-sm text-muted-foreground">{t("noErrors")}</p>}
      <ul className="space-y-2" data-testid="error-list">
        {rows.map((e) => (
          <li key={e.id} className="rounded-xl border">
            <details>
              <summary className="flex cursor-pointer list-none items-start gap-3 p-3">
                <span className={cn("mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_STYLE[e.status])}>{t(`status.${e.status}`)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium" dir="ltr">{e.message}</span>
                  <span className="block text-xs text-muted-foreground" dir="ltr">
                    {e.source} · {e.kind} · {e.path ?? "—"}
                  </span>
                </span>
                <span className="shrink-0 text-end text-xs text-muted-foreground">
                  <b className="block text-sm tabular-nums text-foreground">×{e.occurrences}</b>
                  {ago(e.lastSeenAt)}
                </span>
              </summary>
              <div className="space-y-3 border-t p-3 text-xs">
                <p className="text-muted-foreground">
                  {t("firstSeen")}: {ago(e.firstSeenAt)} · {t("lastSeen")}: {ago(e.lastSeenAt)}
                </p>
                {e.stack && <pre className="max-h-48 overflow-auto rounded-lg bg-muted p-2 text-[11px] leading-snug" dir="ltr">{e.stack}</pre>}
                {e.userAgent && <p className="break-all text-muted-foreground" dir="ltr">{e.userAgent}</p>}
                <form action={updateErrorAction} className="grid gap-2">
                  <input type="hidden" name="id" value={e.id} />
                  <textarea name="notes" defaultValue={e.resolutionNotes ?? ""} placeholder={t("notes")} rows={2} className="rounded-md border bg-background p-2" dir="auto" />
                  <input name="commit" defaultValue={e.resolutionCommit ?? ""} placeholder={t("commit")} className="h-9 rounded-md border bg-background px-2" dir="ltr" />
                  <div className="flex flex-wrap gap-2">
                    {(["investigating", "fixed", "wont_fix", "cannot_reproduce", "open"] as const)
                      .filter((s) => s !== e.status)
                      .map((s) => (
                        <button key={s} type="submit" name="status" value={s} className="rounded-md border px-2.5 py-1.5 hover:bg-muted">
                          {t(`mark.${s}`)}
                        </button>
                      ))}
                  </div>
                </form>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function ReportList({ status: raw, t, ago, locale }: { status: unknown; t: T; ago: (d: Date) => string; locale: string }) {
  const status = (SUPPORT_STATUSES as readonly string[]).includes(String(raw)) || raw === "all" ? (raw as SupportStatus | "all") : "new";
  const tk = await getTranslations({ locale, namespace: "Support" });
  const rows = await listSupportRequests(status);
  return (
    <section className="space-y-3">
      <FilterChips
        param="status"
        current={status}
        keep={{ tab: "reports" }}
        options={[...SUPPORT_STATUSES, "all" as const].map((s) => ({ value: s, label: t(`reportStatus.${s}`) }))}
      />
      {!rows.length && <p className="py-8 text-center text-sm text-muted-foreground">{t("noReports")}</p>}
      <ul className="space-y-2" data-testid="report-list">
        {rows.map((r) => (
          <li key={r.id} className="space-y-2 rounded-xl border p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_STYLE[r.status])}>{t(`reportStatus.${r.status}`)}</span>
              <span className="font-medium">{tk(`kinds.${r.kind}`)}</span>
              <span className="ms-auto text-xs text-muted-foreground">{ago(r.createdAt)}</span>
            </div>
            <p className="whitespace-pre-line" dir="auto">{r.message}</p>
            <p className="text-xs text-muted-foreground" dir="ltr">
              {[r.email, r.path, r.locale].filter(Boolean).join(" · ")}
            </p>
            <form action={updateSupportAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={r.id} />
              <input name="note" defaultValue={r.adminNote ?? ""} placeholder={t("note")} className="h-9 min-w-40 flex-1 rounded-md border bg-background px-2 text-xs" dir="auto" />
              {SUPPORT_STATUSES.filter((s) => s !== r.status).map((s) => (
                <button key={s} type="submit" name="status" value={s} className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted">
                  {t(`reportStatus.${s}`)}
                </button>
              ))}
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
