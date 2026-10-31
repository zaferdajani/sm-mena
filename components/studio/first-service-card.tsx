"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { savePackageAction } from "@/app/[locale]/(main)/studio/actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";

type Option = { key: string; label: string };

/**
 * The first service card (docs/65 stage 3): one service, a price, one-off or monthly, and how long it
 * takes. It is an ordinary package underneath; the title is the service's name until the owner edits it.
 */
export function FirstServiceCard({ services }: { services: Option[] }) {
  const t = useTranslations("Strength.serviceCard");
  const tp = useTranslations("Packages.studio");
  const [state, action] = useActionState(savePackageAction, undefined);
  const [service, setService] = useState(services[0]?.key ?? "");
  const [billing, setBilling] = useState<"one_off" | "monthly">("one_off");
  const label = services.find((s) => s.key === service)?.label ?? "";
  const select = "min-h-11 w-full rounded-lg border border-input bg-background px-3 text-base";
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-brand-line bg-brand-soft p-4" data-testid="first-service-card">
      <div>
        <h2 className="text-lg font-bold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("body")}</p>
      </div>
      <FormError message={state?.error ? (state.error === "limit" ? tp("limit") : tp(`errors.${state.error}`)) : undefined} />
      {state?.ok && <p role="status" className="rounded-lg bg-background p-3 text-sm font-medium">✓ {t("saved")}</p>}
      {/* The card's name is the service's name; the full form below can change it later. */}
      <input type="hidden" name="title" value={label} />
      <input type="hidden" name="items" value="[]" />
      <input type="hidden" name="billing" value={billing} />
      <label className="block space-y-1">
        <span className="text-sm font-semibold">{t("service")}</span>
        <select name="service" value={service} onChange={(e) => setService(e.target.value)} className={select} data-testid="first-service">
          {services.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-semibold">{t("price")}</span>
          <Input name="priceJod" type="number" min={1} max={100000} required dir="ltr" inputMode="numeric" className="min-h-11 text-base" data-testid="first-price" />
          <span className="block text-xs text-muted-foreground">{t("priceHint")}</span>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">{t("delivery")}</span>
          <Input name="deliveryDays" type="number" min={1} max={365} dir="ltr" inputMode="numeric" className="min-h-11 text-base" data-testid="first-delivery" />
          <span className="block text-xs text-muted-foreground">{t("deliveryHint")}</span>
        </label>
      </div>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">{tp("billing")}</legend>
        {(["one_off", "monthly"] as const).map((b) => (
          <label key={b} className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm ${billing === b ? "border-primary bg-background font-semibold" : ""}`}>
            <input type="radio" className="sr-only" name="billingChoice" value={b} checked={billing === b} onChange={() => setBilling(b)} data-testid={`first-billing-${b}`} />
            {t(`billing.${b}`)}
          </label>
        ))}
      </fieldset>
      <p className="text-xs text-muted-foreground">{t("why")}</p>
      <SubmitButton className="min-h-11 w-full sm:w-auto" data-testid="first-service-save">{t("save")}</SubmitButton>
    </form>
  );
}
