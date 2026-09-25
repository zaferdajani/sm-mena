import { FlaskConical, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { clientMockPayAction } from "@/app/[locale]/(main)/contract-actions";
import { SubmitButton } from "@/components/submit-button";
import { Link } from "@/i18n/navigation";
import type { ContractView } from "@/lib/data/contracts";
import { formatFils } from "@/lib/format";

/**
 * The built-in test checkout for paying a milestone into protection, for
 * contracts sent while protected payments were in test mode: no real money.
 */
export async function FundCheckout({ v, milestoneId, hidden, back, locale }: { v: ContractView; milestoneId: string; hidden: Record<string, string>; back: string; locale: string }) {
  const t = await getTranslations("Contracts");
  const m = v.milestones.find((x) => x.id === milestoneId)!;
  return (
    <div className="mx-auto max-w-sm space-y-5 px-4 py-10">
      <div className="space-y-1 rounded-lg bg-amber-500/10 p-3 text-xs" role="note" data-testid="payments-readiness" data-live="false">
        <p className="flex items-center gap-2 font-semibold">
          <FlaskConical className="size-4 shrink-0 text-amber-600" /> {t("readiness.checkoutTest")}
        </p>
        <p className="text-muted-foreground">{t("readiness.testBody")}</p>
      </div>
      <div className="space-y-2 rounded-2xl border p-5 text-center">
        <ShieldCheck className="mx-auto size-8 text-brand" />
        <p className="font-semibold">{t("fundPage.title")}</p>
        <p className="text-sm text-muted-foreground" dir="auto">
          {v.contract.title} · {m.title}
        </p>
        <p className="text-3xl font-bold tabular-nums" data-testid="fund-amount">{formatFils(m.amountFils, locale, v.contract.currency)}</p>
        <p className="text-xs text-muted-foreground">{t("ms.fundHint")}</p>
      </div>
      <form action={clientMockPayAction} className="grid">
        {Object.entries(hidden).map(([k, val]) => (
          <input key={k} type="hidden" name={k} value={val} />
        ))}
        <input type="hidden" name="milestoneId" value={m.id} />
        <SubmitButton className="h-11">{t("fundPage.pay")}</SubmitButton>
      </form>
      <Link href={back} className="block text-center text-sm text-muted-foreground hover:underline">
        {t("fundPage.back")}
      </Link>
    </div>
  );
}
