import { FlaskConical, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { clientMockPayAction } from "@/app/[locale]/(main)/contract-actions";
import { SubmitButton } from "@/components/submit-button";
import { Link } from "@/i18n/navigation";
import { getContractByToken, nextFundable } from "@/lib/data/contracts";
import { formatFils } from "@/lib/format";
import { isTestPayments } from "@/lib/payments/provider";

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

// Built-in test checkout for paying a milestone into protection.
export default async function FundMilestone({ params }: PageProps<"/[locale]/c/[token]/fund/[milestoneId]">) {
  const { locale, token, milestoneId } = await params;
  setRequestLocale(locale);
  const v = await getContractByToken(token);
  const m = v && nextFundable(v);
  if (!v || !m || m.id !== milestoneId || !isTestPayments()) notFound();
  const t = await getTranslations("Contracts");
  const tb = await getTranslations("Billing");
  return (
    <div className="mx-auto max-w-sm space-y-5 px-4 py-10">
      <p className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 text-xs" role="note">
        <FlaskConical className="size-4 shrink-0 text-amber-600" /> {tb("testBanner")}
      </p>
      <div className="space-y-2 rounded-2xl border p-5 text-center">
        <ShieldCheck className="mx-auto size-8 text-brand" />
        <p className="font-semibold">{t("fundPage.title")}</p>
        <p className="text-sm text-muted-foreground" dir="auto">
          {v.contract.title} · {m.title}
        </p>
        <p className="text-3xl font-bold tabular-nums" data-testid="fund-amount">{formatFils(m.amountFils, locale)}</p>
        <p className="text-xs text-muted-foreground">{t("ms.fundHint")}</p>
      </div>
      <form action={clientMockPayAction} className="grid">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="milestoneId" value={m.id} />
        <SubmitButton className="h-11">{t("fundPage.pay")}</SubmitButton>
      </form>
      <Link href={`/c/${token}`} className="block text-center text-sm text-muted-foreground hover:underline">
        {t("fundPage.back")}
      </Link>
    </div>
  );
}
