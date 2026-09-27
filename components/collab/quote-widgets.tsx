"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { acceptQuoteAction, viewedInquiryAction, submitQuoteAction } from "@/app/[locale]/(main)/studio/collab/actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/studio/chips";

/** Supplier: send a quote (a second one counters the first). */
export function QuoteForm({ inquiryId, currency, hasQuote }: { inquiryId: string; currency: string; hasQuote: boolean }) {
  const t = useTranslations("Collab.quote");
  const tc = useTranslations("Collab");
  const [state, action] = useActionState(submitQuoteAction, undefined);
  const [open, setOpen] = useState(!hasQuote);
  useEffect(() => {
    viewedInquiryAction(inquiryId);
  }, [inquiryId]);
  if (state?.ok) return <p className="rounded-xl border border-brand-line bg-brand-soft p-3 text-sm" role="status" data-testid="quote-sent">✓ {t("sent")}</p>;
  if (!open) return <Button type="button" variant="outline" className="h-11" onClick={() => setOpen(true)} data-testid="quote-counter">{t("counter")}</Button>;
  return (
    <form action={action} className="grid gap-3 rounded-2xl border p-4" data-testid="quote-form">
      <input type="hidden" name="inquiryId" value={inquiryId} />
      <p className="font-semibold">{hasQuote ? t("counterTitle") : t("title")}</p>
      <FormError message={state?.error ? tc(`errors.${["closed", "expired", "notFound"].includes(state.error) ? state.error : "invalid"}`) : undefined} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("amount", { currency })} htmlFor="q-amount"><Input id="q-amount" name="amount" type="number" min={0} step="0.001" required dir="ltr" /></Field>
        <Field label={t("startsOn")} htmlFor="q-from"><Input id="q-from" name="startsOn" type="date" dir="ltr" /></Field>
        <Field label={t("dueOn")} htmlFor="q-to"><Input id="q-to" name="dueOn" type="date" dir="ltr" /></Field>
      </div>
      <Field label={t("scopeNote")} htmlFor="q-scope"><Textarea id="q-scope" name="scopeNote" rows={3} maxLength={2000} dir="auto" placeholder={t("scopeHint")} /></Field>
      <Field label={t("exclusions")} hint={t("exclusionsHint")} htmlFor="q-excl"><Input id="q-excl" name="exclusions" maxLength={1000} dir="auto" /></Field>
      <p className="text-xs text-muted-foreground">{t("notContract")}</p>
      <div className="flex gap-2">
        <SubmitButton className="h-11 px-5">{t("send")}</SubmitButton>
        {hasQuote && <Button type="button" variant="ghost" className="h-11" onClick={() => setOpen(false)}>{tc("cancel")}</Button>}
      </div>
    </form>
  );
}

/** Buyer: accept one quote; the answer says where the work goes next. */
export function AcceptQuote({ inquiryId, quoteId }: { inquiryId: string; quoteId: string }) {
  const t = useTranslations("Collab.quote");
  const tc = useTranslations("Collab");
  const [state, action] = useActionState(acceptQuoteAction, undefined);
  if (state?.ok) return <p className="text-sm font-medium text-brand" role="status" data-testid="quote-accepted" data-handoff={state.id}>✓ {t(`accepted.${state.id ?? "contract_request"}`)}</p>;
  return (
    <form action={action}>
      <input type="hidden" name="inquiryId" value={inquiryId} />
      <input type="hidden" name="quoteId" value={quoteId} />
      <FormError message={state?.error ? tc(`errors.${state.error === "closed" ? "closed" : "invalid"}`) : undefined} />
      <SubmitButton className="h-11 px-4" testId="quote-accept">{t("accept")}</SubmitButton>
    </form>
  );
}
