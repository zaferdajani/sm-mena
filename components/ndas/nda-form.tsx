"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { createNdaAction } from "@/app/[locale]/(main)/nda-actions";
import { SignaturePad } from "@/components/contracts/signature-pad";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const DIRECTIONS = ["mutual", "client_discloses", "agency_discloses"] as const;

/** The agency's NDA: who discloses, why, for how long, both parties' identity and special terms, then sign. */
export function NdaForm({ agencyName, countryName, initial }: { agencyName: string; countryName: string; initial?: { clientName?: string; clientPhone?: string; purpose?: string } }) {
  const t = useTranslations("Agreements.ndaForm");
  const tl = useTranslations("Agreements");
  const [state, action] = useActionState(createNdaAction, undefined);
  const field = "grid gap-1.5";
  return (
    <form action={action} className="space-y-4" data-testid="nda-form">
      <section className="space-y-3 rounded-2xl border p-4">
        <h2 className="font-semibold">{t("client")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={field}>
            <Label htmlFor="n-name">{t("clientName")}</Label>
            <Input id="n-name" name="clientName" defaultValue={initial?.clientName} required minLength={2} maxLength={80} dir="auto" />
          </div>
          <div className={field}>
            <Label htmlFor="n-phone">{t("clientPhone")}</Label>
            <Input id="n-phone" name="clientPhone" defaultValue={initial?.clientPhone} required minLength={7} maxLength={20} dir="ltr" inputMode="tel" />
          </div>
          <div className={field}>
            <Label htmlFor="n-email">{t("clientEmail")}</Label>
            <Input id="n-email" name="clientEmail" type="email" maxLength={200} dir="ltr" />
          </div>
          <div className={field}>
            <Label htmlFor="n-creg">{tl("clientReg")}</Label>
            <Input id="n-creg" name="clientRegNumber" maxLength={60} dir="ltr" />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border p-4">
        <h2 className="font-semibold">{t("terms")}</h2>
        <div className={field}>
          <Label htmlFor="n-purpose">{t("purpose")}</Label>
          <Textarea id="n-purpose" name="purpose" defaultValue={initial?.purpose} required minLength={10} maxLength={1000} rows={2} placeholder={t("purposePh")} dir="auto" />
        </div>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">{t("direction")}</legend>
          {DIRECTIONS.map((d, i) => (
            <label key={d} className="flex items-start gap-2 text-sm">
              <input type="radio" name="direction" value={d} defaultChecked={i === 0} className="mt-0.5 size-4 accent-[var(--brand)]" />
              {t(`directions.${d}`)}
            </label>
          ))}
        </fieldset>
        <label className="flex items-center gap-2 text-sm">
          {tl("ndaYears")}
          <select name="years" defaultValue="2" className="h-9 rounded-md border bg-background px-2" data-testid="nda-form-years">
            {[1, 2, 3, 5].map((n) => (
              <option key={n} value={n}>{tl("years", { n })}</option>
            ))}
          </select>
        </label>
        <div className={field}>
          <Label htmlFor="n-cterms">{tl("clientTerms")}</Label>
          <Textarea id="n-cterms" name="clientTerms" maxLength={3000} rows={2} placeholder={tl("clientTermsPh")} dir="auto" />
        </div>
        <div className={field}>
          <Label htmlFor="n-aterms">{tl("agencyTerms")}</Label>
          <Textarea id="n-aterms" name="agencyTerms" maxLength={3000} rows={2} placeholder={tl("agencyTermsPh")} dir="auto" />
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border p-4">
        <h2 className="font-semibold">{t("sign")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={field}>
            <Label htmlFor="n-legal">{tl("agencyLegalName")}</Label>
            <Input id="n-legal" name="agencyLegalName" defaultValue={agencyName} maxLength={160} dir="auto" />
          </div>
          <div className={field}>
            <Label htmlFor="n-areg">{tl("agencyReg")}</Label>
            <Input id="n-areg" name="agencyRegNumber" maxLength={60} dir="ltr" />
          </div>
        </div>
        <div className={field}>
          <Label htmlFor="n-signer">{t("signer")}</Label>
          <Input id="n-signer" name="signer" required minLength={3} maxLength={80} className="font-serif text-lg italic" dir="auto" />
        </div>
        <SignaturePad name="signature" label={tl("drawSignature")} clearLabel={tl("clear")} hint={tl("drawHint")} required requiredMessage={tl("drawRequired")} />
        <p className="text-xs text-muted-foreground">{tl("lawNote", { country: countryName })}</p>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="agree" className="mt-0.5 size-4 accent-[var(--brand)]" />
          {tl("agencyDeclaration", { agency: agencyName })}
        </label>
        <FormError message={state?.error ? t(`errors.${state.error}` as "errors.invalid") : undefined} />
        <SubmitButton className="h-11 w-full sm:w-auto">{t("submit")}</SubmitButton>
      </section>
    </form>
  );
}
