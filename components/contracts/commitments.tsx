import { AlertTriangle, BarChart3, CalendarClock, KeyRound, Megaphone, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ContractView } from "@/lib/data/contracts";
import { formatDate, formatFils, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * What the agency committed to beyond deliverables (terms v2): targets, a
 * reporting rhythm, the client-paid ad budget, and the two fixed protections.
 * Shown near the top of the contract for both sides.
 */
export async function ContractCommitments({ v, locale }: { v: ContractView; locale: string }) {
  const t = await getTranslations("Contracts.commit");
  const c = v.contract;
  if (c.termsVersion < 2) return null;
  const r = v.reporting;
  return (
    <section className="space-y-3 rounded-2xl border p-4" data-testid="commitments">
      <h2 className="font-semibold">{t("title")}</h2>
      {c.kpis.length > 0 && (
        <div>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
            <BarChart3 className="size-4 text-brand" /> {t("kpis")}
          </h3>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {c.kpis.map((k, i) => (
              <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <span dir="auto">{k.label}</span>
                <b className="tabular-nums" dir="auto">{k.target}</b>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        {r.dueEveryDays && (
          <p className={cn("flex items-start gap-2 rounded-lg p-2.5", r.overdue ? "bg-destructive/10 text-destructive" : "bg-muted/50")} data-testid="reporting-status">
            {r.overdue ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : <CalendarClock className="mt-0.5 size-4 shrink-0 text-brand" />}
            <span>
              {t(`cadence.${c.reportingCadence as "weekly"}`)}
              <span suppressHydrationWarning className="block text-xs">
                {r.lastUpdateAt ? t("lastUpdate", { when: timeAgo(r.lastUpdateAt.toISOString(), locale) }) : t("noUpdateYet")}
                {r.overdue && ` · ${t("overdue")}`}
              </span>
            </span>
          </p>
        )}
        {c.mediaBudgetJod ? (
          <p className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5">
            <Megaphone className="mt-0.5 size-4 shrink-0 text-brand" />
            <span>
              {t("media", { amount: formatFils(c.mediaBudgetJod * 1000, locale, c.currency) })}
              <span className="block text-xs text-muted-foreground">{t("mediaNote")}</span>
            </span>
          </p>
        ) : null}
        <p className="flex items-start gap-2 rounded-lg bg-brand/5 p-2.5">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-brand" />
          {t("ownership")}
        </p>
        <p className="flex items-start gap-2 rounded-lg bg-brand/5 p-2.5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />
          {t("noSurprises")}
        </p>
      </div>
    </section>
  );
}

/** The agency's progress updates, newest first. */
export async function UpdatesList({ v, locale }: { v: ContractView; locale: string }) {
  const t = await getTranslations("Contracts.updates");
  const updates = v.events.filter((e) => e.type === "update");
  return (
    <section className="space-y-2" data-testid="updates">
      <h2 className="font-semibold">{t("title")}</h2>
      {!updates.length && <p className="text-sm text-muted-foreground">{t("none")}</p>}
      <ul className="space-y-2">
        {updates.map((u) => (
          <li key={u.id} className="rounded-xl border p-3 text-sm">
            <p suppressHydrationWarning className="mb-1 text-xs text-muted-foreground">{formatDate(u.createdAt, locale)} · {timeAgo(u.createdAt.toISOString(), locale)}</p>
            <p className="whitespace-pre-line" dir="auto">{u.note}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
