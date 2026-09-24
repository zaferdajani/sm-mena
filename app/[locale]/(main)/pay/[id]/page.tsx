import { CreditCard, FlaskConical } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SubmitButton } from "@/components/submit-button";
import { Link } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { getPayment } from "@/lib/data/payments";
import { formatFils, isTestPayments } from "@/lib/payments/provider";
import { mockPayAction } from "../../billing-actions";

// Built-in test checkout (PAYMENTS_PROVIDER=mock). A real gateway replaces
// this page with its own hosted payment page.
export default async function PayPage({ params }: PageProps<"/[locale]/pay/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const payment = /^[0-9a-f-]{36}$/.test(id) ? await getPayment(id) : null;
  if (!payment || payment.agencyId !== agency.id || !isTestPayments()) notFound();
  const t = await getTranslations("Billing");
  return (
    <div className="mx-auto max-w-sm space-y-5 px-4 py-10">
      <p className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 text-xs" role="note">
        <FlaskConical className="size-4 shrink-0 text-amber-600" /> {t("testBanner")}
      </p>
      <div className="space-y-1 rounded-2xl border p-5 text-center">
        <CreditCard className="mx-auto size-8 text-brand" />
        <p className="text-sm text-muted-foreground">{t(`plans.${payment.plan ?? "pro"}`)} · {t("months", { count: payment.months ?? 1 })}</p>
        <p className="text-3xl font-bold tabular-nums" data-testid="pay-amount">{formatFils(payment.amountFils, locale)}</p>
      </div>
      {payment.status === "pending" ? (
        <form action={mockPayAction} className="grid gap-2">
          <input type="hidden" name="id" value={payment.id} />
          <SubmitButton className="h-11">{t("payTest")}</SubmitButton>
          <button type="submit" name="outcome" value="fail" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            {t("failTest")}
          </button>
        </form>
      ) : (
        <p className="text-center text-sm">{t(`status.${payment.status}`)}</p>
      )}
      <Link href="/studio/billing" className="block text-center text-sm text-muted-foreground hover:underline">
        {t("back")}
      </Link>
    </div>
  );
}
