"use client";

import { CheckCircle2, Copy, MessageCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { createRequestAction } from "@/app/[locale]/(main)/request-actions";
import { FormError } from "@/components/form-error";
import { ChipGroup, Field } from "@/components/studio/chips";
import { ServiceGroups } from "@/components/requests/service-groups";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";

type Option = { key: string; label: string };

export type RequestDefaults = {
  services?: string[];
  platforms?: string[];
  city?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  description?: string;
};

export function RequestForm({
  cities,
  platforms,
  defaults = {},
  source = "form",
}: {
  /** Kept for callers; the picker reads the taxonomy by category itself. */
  services?: Option[];
  cities: Option[];
  platforms?: Option[];
  defaults?: RequestDefaults;
  source?: "form" | "ai";
}) {
  const t = useTranslations("Requests");
  const [state, action] = useActionState(createRequestAction, undefined);
  const select = "h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm";

  if (state?.token) return <RequestCreated token={state.token} requestId={state.requestId} invited={state.invited ?? 0} />;

  return (
    <form action={action} className="sw-request-form grid min-w-0 gap-6" data-testid="request-form">
      <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
      <input type="hidden" name="source" value={source} />
      {!platforms && defaults.platforms?.map((p) => <input key={p} type="hidden" name="platforms" value={p} />)}
      <Field label={t("services")}>
        <ServiceGroups defaultValues={defaults.services} />
      </Field>
      {platforms && (
        <Field label={t("platforms")}>
          <ChipGroup name="platforms" options={platforms} defaultValues={defaults.platforms} />
        </Field>
      )}
      <label className="flex items-start gap-2 rounded-xl border p-3 text-sm">
        <input type="checkbox" name="fullService" className="mt-0.5 size-4 accent-[var(--brand)]" data-testid="request-full-service" />
        <span>
          <span className="font-medium">{t("fullService")}</span>
          <span className="block text-xs text-muted-foreground">{t("fullServiceHint")}</span>
        </span>
      </label>
      <Field label={t("brands")} htmlFor="req-brands">
        <Input id="req-brands" name="brands" maxLength={300} placeholder={t("brandsPlaceholder")} dir="auto" />
      </Field>
      <div className="sw-request-field-grid grid gap-4">
        <Field label={t("city")} htmlFor="req-city">
          <select id="req-city" name="city" defaultValue={defaults.city ?? ""} className={select}>
            <option value="">{t("anyCity")}</option>
            {cities.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </Field>
        <Field label={t("timeline")} htmlFor="req-timeline">
          <select id="req-timeline" name="timeline" defaultValue="" className={select}>
            <option value="">—</option>
            {(["asap", "this_month", "within_3_months"] as const).map((k) => <option key={k} value={k}>{t(`timelines.${k}`)}</option>)}
          </select>
        </Field>
        <Field label={t("budgetMin")} htmlFor="req-min">
          <Input id="req-min" name="budgetMin" type="number" min={0} dir="ltr" defaultValue={defaults.budgetMin ?? ""} />
        </Field>
        <Field label={t("budgetMax")} htmlFor="req-max">
          <Input id="req-max" name="budgetMax" type="number" min={0} dir="ltr" defaultValue={defaults.budgetMax ?? ""} />
        </Field>
      </div>
      <Field label={t("description")} htmlFor="req-desc">
        <Textarea id="req-desc" name="description" rows={4} minLength={10} maxLength={3000} required defaultValue={defaults.description} placeholder={t("descriptionPlaceholder")} />
      </Field>
      <div className="sw-request-field-grid grid gap-4">
        <Field label={t("name")} htmlFor="req-name">
          <Input id="req-name" name="name" required maxLength={80} autoComplete="name" />
        </Field>
        <Field label={t("phone")} htmlFor="req-phone">
          <Input id="req-phone" name="phone" type="tel" required dir="ltr" autoComplete="tel" placeholder="07X XXX XXXX" />
        </Field>
      </div>
      <Field label={t("business")} htmlFor="req-business">
        <Input id="req-business" name="business" maxLength={120} autoComplete="organization" />
      </Field>
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" name="consent" required className="mt-0.5 size-4 accent-[var(--primary)]" />
        {t("consent")}
      </label>
      <SubmitButton className="h-11 text-base">{t("submit")}</SubmitButton>
    </form>
  );
}

/**
 * After sending: what happened (honestly, also when no agency was invited yet), where the quotes will
 * appear, and the private link as buttons (copy, send to my WhatsApp) instead of a raw address.
 */
function RequestCreated({ token, requestId, invited }: { token: string; requestId?: string; invited: number }) {
  const t = useTranslations("Requests");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/${locale}/r/${token}`;
  const button = "inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm font-medium hover:bg-muted";
  return (
    <div className="space-y-3 rounded-xl border border-brand-line bg-brand-soft p-4 text-sm" data-testid="request-created">
      <p className="flex items-center gap-2 font-semibold">
        <CheckCircle2 className="size-5 shrink-0 text-brand" />
        {t("created", { count: invited })}
      </p>
      <p>{t("createdNext")}</p>
      {requestId && (
        <Link href={`/requests/${requestId}`} className="inline-flex h-10 items-center rounded-lg bg-brand px-4 font-medium text-white hover:bg-brand-deep">
          {t("openMyProject")}
        </Link>
      )}
      <p className="text-muted-foreground">{t("saveLink")}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={button}
          data-testid="request-link"
          data-link={link}
          onClick={() => void navigator.clipboard?.writeText(link).then(() => setCopied(true), () => undefined)}
        >
          <Copy className="size-4" aria-hidden />
          {copied ? t("linkCopied") : t("copyLink")}
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer" className={button}>
          <MessageCircle className="size-4" aria-hidden />
          {t("sendToWhatsapp")}
        </a>
      </div>
    </div>
  );
}
