import { FlaskConical } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SubmitButton } from "@/components/submit-button";
import { formatFils } from "@/lib/format";
import { TEST_CARDS, formatCardNumber } from "@/lib/payments/virtual-cards";

const OUTCOMES = ["declined", "insufficient", "expired", "cvc", "invalid", "unknown"] as const;

export async function VirtualCardForm({
  action,
  hidden,
  amountFils,
  currency,
  locale,
  balanceFils,
  cardError,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hidden: Record<string, string>;
  amountFils: number;
  currency: string;
  locale: string;
  balanceFils: number | null;
  cardError?: string | null;
}) {
  const t = await getTranslations("VirtualPay");
  const error = OUTCOMES.find((k) => k === cardError);
  return (
    <div className="mx-auto max-w-sm space-y-5 px-4 py-10">
      <div className="space-y-1 rounded-lg bg-amber-500/15 p-3 text-xs" role="note" data-testid="payments-readiness" data-live="false" data-virtual="true">
        <p className="flex items-center gap-2 font-semibold">
          <FlaskConical className="size-4 shrink-0" aria-hidden /> {t("title")}
        </p>
        <p className="text-muted-foreground">{t("body")}</p>
      </div>
      <div className="space-y-1 text-center">
        <p className="text-3xl font-bold tabular-nums" data-testid="fund-amount">{formatFils(amountFils, locale, currency)}</p>
        {balanceFils !== null && (
          <p className="text-sm text-muted-foreground" data-testid="virtual-balance">
            {t("balance", { amount: formatFils(balanceFils, locale, currency) })}
          </p>
        )}
      </div>
      {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert" data-testid="card-error">{t(`errors.${error}`)}</p>}
      <form action={action} className="grid gap-3">
        {Object.entries(hidden).map(([k, val]) => (
          <input key={k} type="hidden" name={k} value={val} />
        ))}
        <label className="grid gap-1 text-sm">
          {t("holder")}
          <input name="holder" required autoComplete="cc-name" className="h-11 rounded-lg border bg-background px-3" />
        </label>
        <label className="grid gap-1 text-sm">
          {t("number")}
          <input name="card" required inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" className="h-11 rounded-lg border bg-background px-3 tabular-nums" data-testid="card-number" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm">
            {t("expiry")}
            <input name="expiry" required inputMode="numeric" autoComplete="cc-exp" placeholder="12/30" className="h-11 rounded-lg border bg-background px-3 tabular-nums" data-testid="card-expiry" />
          </label>
          <label className="grid gap-1 text-sm">
            {t("cvc")}
            <input name="cvc" required inputMode="numeric" autoComplete="cc-csc" placeholder="123" className="h-11 rounded-lg border bg-background px-3 tabular-nums" data-testid="card-cvc" />
          </label>
        </div>
        <SubmitButton className="h-11" testId="virtual-pay">{t("pay")}</SubmitButton>
      </form>
      <ul className="space-y-1 text-xs text-muted-foreground">
        <li data-testid="test-card-success">{formatCardNumber(TEST_CARDS.success)} — {t("cards.success")}</li>
        <li>{formatCardNumber(TEST_CARDS.declined)} — {t("cards.declined")}</li>
        <li>{formatCardNumber(TEST_CARDS.insufficient)} — {t("cards.insufficient")}</li>
        <li>{formatCardNumber(TEST_CARDS.expired)} — {t("cards.expired")}</li>
        <li>{formatCardNumber(TEST_CARDS.cvc)} — {t("cards.cvc")}</li>
      </ul>
    </div>
  );
}
