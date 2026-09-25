import { featureOpen } from "@/lib/features";
import { CheckCircle2, FlaskConical, XCircle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SubmitButton } from "@/components/submit-button";
import { requireAgency } from "@/lib/auth/guards";
import { listPayments, PLAN_MONTHS, planPriceFils } from "@/lib/data/payments";
import { formatDate } from "@/lib/format";
import { monetizationEnabled, PLANS } from "@/lib/monetization/plans";
import { formatFils, isTestPayments } from "@/lib/payments/provider";
import { cn } from "@/lib/utils";
import { checkoutPlanAction } from "../../billing-actions";

export default async function StudioBilling({ params, searchParams }: PageProps<"/[locale]/studio/billing">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const sp = await searchParams;
  const t = await getTranslations("Billing");
  const history = await listPayments("all", agency.id);
  // Buying a plan follows Admin → Features → "Paid plans" (pilot agencies can try it while it's coming soon).
  const canBuy = await featureOpen("paid_plans", { agencyHandle: agency.handle });
  const active = agency.plan !== "free" && (!agency.planExpiresAt || agency.planExpiresAt > new Date());

  return (
    <div className="space-y-6">
      {sp.paid === "1" && (
        <p className="flex items-center gap-2 rounded-xl bg-brand/10 p-3 text-sm" role="status" data-testid="paid-ok">
          <CheckCircle2 className="size-5 text-brand" /> {t("paidOk")}
        </p>
      )}
      {sp.paid === "0" && (
        <p className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm" role="alert">
          <XCircle className="size-5 text-destructive" /> {t("paidFail")}
        </p>
      )}
      <section className="rounded-xl border p-4">
        <p className="text-xs text-muted-foreground">{t("current")}</p>
        <p className="text-xl font-bold" data-testid="current-plan">{t(`plans.${active ? agency.plan : "free"}`)}</p>
        {active && agency.planExpiresAt && <p className="text-sm text-muted-foreground">{t("until", { date: formatDate(agency.planExpiresAt, locale) })}</p>}
        {!monetizationEnabled() && <p className="mt-2 text-sm text-brand">{t("freeDuringLaunch")}</p>}
      </section>

      {isTestPayments() && (
        <p className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 text-xs" role="note">
          <FlaskConical className="size-4 shrink-0 text-amber-600" /> {t("testBanner")}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {(["pro", "business"] as const).map((plan) => (
          <section key={plan} className={cn("space-y-3 rounded-xl border p-4", agency.plan === plan && active && "border-brand")}>
            <div>
              <h2 className="font-bold">{t(`plans.${plan}`)}</h2>
              <p className="text-sm text-muted-foreground">{t("perMonth", { price: formatFils(planPriceFils(plan, 1), locale) })}</p>
            </div>
            <ul className="space-y-1 text-sm">
              {t.raw(`features.${plan}`).map((f: string) => (
                <li key={f} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" /> {f}
                </li>
              ))}
            </ul>
            {canBuy && (
              <form action={checkoutPlanAction} className="grid gap-2">
                <input type="hidden" name="plan" value={plan} />
                <div className="grid grid-cols-3 gap-1" role="radiogroup">
                  {PLAN_MONTHS.map((m, i) => (
                    <label key={m} className="cursor-pointer rounded-lg border p-2 text-center text-xs has-[:checked]:border-brand has-[:checked]:bg-brand/10">
                      <input type="radio" name="months" value={m} defaultChecked={i === 0} className="sr-only" />
                      <span className="block font-medium">{t("months", { count: m })}</span>
                      <span className="tabular-nums text-muted-foreground">{formatFils(planPriceFils(plan, m), locale)}</span>
                      {m === 12 && <span className="block text-[10px] text-brand">{t("twoFree")}</span>}
                    </label>
                  ))}
                </div>
                <SubmitButton className="h-10" variant={plan === "pro" ? "default" : "outline"}>
                  {t(active && agency.plan === plan ? "renew" : "choose", { plan: t(`plans.${plan}`) })}
                </SubmitButton>
              </form>
            )}
          </section>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t("limitsNote", { free: PLANS.free.proposalsPerMonth ?? 0 })}</p>

      <section className="space-y-2">
        <h2 className="font-semibold">{t("history")}</h2>
        {!history.length && <p className="text-sm text-muted-foreground">{t("noHistory")}</p>}
        <ul className="divide-y rounded-xl border text-sm" data-testid="billing-history">
          {history.map((p) => (
            <li key={p.id} className="flex items-center gap-3 p-3">
              <span className="min-w-0 flex-1">
                {t(`plans.${p.plan ?? "pro"}`)} · {t("months", { count: p.months ?? 1 })}
                <span className="block text-xs text-muted-foreground">{formatDate(p.paidAt ?? p.createdAt, locale)}</span>
              </span>
              <span className="tabular-nums">{formatFils(p.amountFils, locale)}</span>
              <span className="w-20 text-end text-xs">{t(`status.${p.status}`)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
