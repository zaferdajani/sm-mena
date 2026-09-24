import { Download, FlaskConical } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FilterChips } from "@/components/admin/filter-chips";
import { ManualPaymentForm } from "@/components/admin/manual-payment-form";
import { StatTiles } from "@/components/admin/stat-tiles";
import { requireAdmin } from "@/lib/auth/guards";
import { listPayments, paymentSummary } from "@/lib/data/payments";
import { formatDate } from "@/lib/format";
import { formatFils, isTestPayments, paymentProvider } from "@/lib/payments/provider";
import { cn } from "@/lib/utils";
import { refundPaymentAction } from "../payment-actions";
import { EscrowOverview } from "./escrow-overview";

const STATUSES = ["all", "paid", "pending", "failed", "refunded"] as const;
const STYLE: Record<string, string> = {
  paid: "bg-brand/10 text-brand",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  failed: "bg-destructive/10 text-destructive",
  refunded: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

export default async function AdminPayments({ params, searchParams }: PageProps<"/[locale]/admin/payments">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const sp = await searchParams;
  const tab = sp.tab === "protected" ? "protected" : "plans";
  const status = STATUSES.find((s) => s === sp.status) ?? "all";
  const t = await getTranslations("AdminPayments");
  const tb = await getTranslations("Billing");
  const [summary, rows] = await Promise.all([paymentSummary(), listPayments(status)]);
  const money = (f: number) => formatFils(f, locale);

  return (
    <div className="space-y-5" data-testid="admin-payments">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        {isTestPayments() && <FlaskConical className="size-4 text-amber-600" />}
        {t("provider", { name: paymentProvider().label })}
      </p>
      <FilterChips
        param="tab"
        current={tab}
        options={[
          { value: "plans", label: t("tabs.plans") },
          { value: "protected", label: t("tabs.protected") },
        ]}
      />
      {tab === "protected" ? (
        <EscrowOverview locale={locale} />
      ) : (
        <>
          <StatTiles
            locale={locale}
            tiles={[
              { label: t("tiles.thisMonth"), value: money(summary.thisMonth) },
              { label: t("tiles.lastMonth"), value: money(summary.lastMonth) },
              { label: t("tiles.mrr"), value: money(summary.mrr), hint: t("tiles.mrrHint") },
              { label: t("tiles.paidAgencies"), value: summary.paidAgencies },
              { label: t("tiles.pending"), value: summary.pending, hint: summary.refunds ? t("tiles.refunds", { amount: money(summary.refunds) }) : undefined },
            ]}
          />
          <details className="rounded-xl border p-4">
            <summary className="cursor-pointer font-medium">{t("recordManual")}</summary>
            <p className="mt-1 mb-3 text-xs text-muted-foreground">{t("recordManualHint")}</p>
            <ManualPaymentForm />
          </details>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <FilterChips param="status" current={status} keep={{ tab: "plans" }} options={STATUSES.map((s) => ({ value: s, label: s === "all" ? t("all") : tb(`status.${s}`) }))} />
            <a href="/api/admin/payments" className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted" download>
              <Download className="size-4" /> {t("export")}
            </a>
          </div>
          {!rows.length && <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>}
          <ul className="divide-y rounded-xl border" data-testid="payments-list">
            {rows.map((p) => (
              <li key={p.id} className="space-y-2 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STYLE[p.status])}>{tb(`status.${p.status}`)}</span>
                  <span className="font-medium">{p.agencyName}</span>
                  <span className="text-muted-foreground">
                    {tb(`plans.${p.plan ?? "pro"}`)} · {tb("months", { count: p.months ?? 1 })}
                  </span>
                  <span className="ms-auto font-semibold tabular-nums">{money(p.amountFils)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(p.paidAt ?? p.createdAt, locale)} · {t(`methods.${p.method as "cash"}`)} · {p.provider}
                  {p.providerRef && <span dir="ltr"> · {p.providerRef}</span>}
                  {p.periodEnd && ` · ${t("until", { date: formatDate(p.periodEnd, locale) })}`}
                  {p.refundReason && ` · ${p.refundReason}`}
                </p>
                {p.status === "paid" && (
                  <details>
                    <summary className="cursor-pointer text-xs text-muted-foreground">{t("refund")}</summary>
                    <form action={refundPaymentAction} className="mt-2 flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <input name="reason" required minLength={2} placeholder={t("refundReason")} className="h-9 min-w-40 flex-1 rounded-md border bg-background px-2 text-xs" dir="auto" />
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" name="endPlan" /> {t("endPlan")}
                      </label>
                      <button type="submit" className="rounded-md border border-destructive/40 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10">
                        {t("markRefunded")}
                      </button>
                    </form>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
