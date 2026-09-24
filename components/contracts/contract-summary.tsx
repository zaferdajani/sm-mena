import { HandCoins, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ContractView } from "@/lib/data/contracts";
import { formatDate, formatFils } from "@/lib/format";
import { cn } from "@/lib/utils";

export const CONTRACT_STATUS_STYLE: Record<string, string> = {
  sent: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  active: "bg-brand/10 text-brand",
  completed: "bg-brand/10 text-brand",
  cancelled: "bg-muted text-muted-foreground",
  disputed: "bg-destructive/10 text-destructive",
};

export async function ContractSummary({ v, locale }: { v: ContractView; locale: string }) {
  const t = await getTranslations("Contracts");
  const c = v.contract;
  const day = (d: string) => formatDate(new Date(`${d}T12:00:00Z`), locale);
  const done = v.milestones.filter((m) => ["approved", "released"].includes(m.status)).length;
  const Mode = c.paymentMode === "protected" ? ShieldCheck : HandCoins;
  return (
    <section className="space-y-3 rounded-2xl border p-4" data-testid="contract-summary">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", CONTRACT_STATUS_STYLE[c.status])} data-testid="contract-status">{t(`status.${c.status}`)}</span>
        <span className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs">
          <Mode className={cn("size-3.5", c.paymentMode === "protected" ? "text-brand" : "text-muted-foreground")} /> {t(`mode.${c.paymentMode}`)}
        </span>
        <span className="ms-auto text-xs text-muted-foreground" dir="ltr">{c.number}</span>
      </div>
      <h1 className="text-xl font-bold" dir="auto">{c.title}</h1>
      <p className="text-sm text-muted-foreground">
        {t("view.period", { start: day(c.startDate), end: day(c.endDate) })} · {t("progress", { done, total: v.milestones.length })}
      </p>
      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div className="rounded-xl bg-muted/50 p-2.5">
          <dt className="text-xs text-muted-foreground">{t("view.total")}</dt>
          <dd className="font-bold tabular-nums">{formatFils(c.totalFils, locale, c.currency)}</dd>
        </div>
        {c.paymentMode === "protected" && (
          <>
            <div className="rounded-xl bg-muted/50 p-2.5">
              <dt className="text-xs text-muted-foreground">{t("view.held")}</dt>
              <dd className="font-bold tabular-nums" data-testid="money-held">{formatFils(v.money.held, locale, c.currency)}</dd>
            </div>
            <div className="rounded-xl bg-muted/50 p-2.5">
              <dt className="text-xs text-muted-foreground">{t("view.released")}</dt>
              <dd className="font-bold tabular-nums">{formatFils(v.money.released, locale, c.currency)}</dd>
            </div>
          </>
        )}
        <div className="rounded-xl bg-muted/50 p-2.5">
          <dt className="text-xs text-muted-foreground">{t("view.client")}</dt>
          <dd className="truncate font-medium" dir="auto">{c.clientName}</dd>
        </div>
      </dl>
    </section>
  );
}

export async function ContractTimeline({ v, locale }: { v: ContractView; locale: string }) {
  const t = await getTranslations("Contracts");
  return (
    <details className="rounded-2xl border p-4">
      <summary className="cursor-pointer font-semibold">{t("view.timeline")}</summary>
      <ul className="mt-3 space-y-2 text-sm">
        {v.events.map((e) => (
          <li key={e.id} className="flex gap-3">
            <span className="w-24 shrink-0 text-xs text-muted-foreground">{formatDate(e.createdAt, locale)}</span>
            <span dir="auto">{t(`events.${e.type}` as "events.signed", { actor: t(`actors.${e.actor}` as "actors.agency"), note: e.note ?? "" })}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
