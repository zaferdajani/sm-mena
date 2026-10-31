"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState, useTransition } from "react";
import { deletePackageAction, savePackageAction } from "@/app/[locale]/(main)/studio/actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DeliverablesPicker } from "@/components/contracts/deliverables-picker";
import type { DeliverableLine } from "@/lib/db/schema";
import type { ContentLang, PackageTranslation } from "@/lib/content-lang";
import { Field } from "./chips";
import { OtherLanguage } from "./other-language";

type Option = { key: string; label: string };
type Pkg = { id: string; title: string; description: string; service: string; priceJod: number; billing: "monthly" | "one_off"; deliverables: string[]; items: DeliverableLine[]; deliveryDays: number | null; translation?: PackageTranslation | null };

export function PackageForm({ services, platforms, contentLang, initial }: { services: Option[]; platforms: Option[]; contentLang: ContentLang; initial?: Pkg }) {
  const tr = initial?.translation ?? {};
  const t = useTranslations("Packages");
  const [state, action] = useActionState(savePackageAction, undefined);
  const [deleting, start] = useTransition();
  const [items, setItems] = useState<DeliverableLine[]>(initial?.items ?? []);
  // Checked here in the page's language: the browser's own "fill out this field" follows the phone's language.
  const [localError, setLocalError] = useState<string | null>(null);
  const check = (e: React.FormEvent<HTMLFormElement>) => {
    const fd = new FormData(e.currentTarget);
    const problem = String(fd.get("title") ?? "").trim().length < 2 ? "title" : !fd.get("service") ? "service" : !(Number(fd.get("priceJod")) >= 1) ? "price" : null;
    setLocalError(problem);
    if (problem) e.preventDefault();
  };
  const error = localError ?? state?.error;
  const select = "h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm";
  return (
    <form action={action} onSubmit={check} noValidate className="grid gap-3 rounded-xl border p-4" data-testid="package-form">
      {!initial && <h2 className="font-semibold">{t("studio.new")}</h2>}
      <FormError message={error ? (error === "limit" ? t("studio.limit") : t(`studio.errors.${error}`)) : undefined} />
      {initial && <input type="hidden" name="packageId" value={initial.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("studio.title")}>
          <Input name="title" required maxLength={80} defaultValue={initial?.title} placeholder={t("studio.titlePlaceholder")} />
        </Field>
        <Field label={t("studio.service")}>
          <select name="service" required defaultValue={initial?.service ?? ""} className={select}>
            <option value="" disabled>—</option>
            {services.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </Field>
        <Field label={t("studio.price")}>
          <Input name="priceJod" type="number" min={1} required dir="ltr" defaultValue={initial?.priceJod} />
        </Field>
        <Field label={t("studio.billing")}>
          <select name="billing" defaultValue={initial?.billing ?? "monthly"} className={select}>
            <option value="monthly">{t("perMonth")}</option>
            <option value="one_off">{t("oneOff")}</option>
          </select>
        </Field>
      </div>
      <Field label={t("studio.description")}>
        <Input name="description" maxLength={300} defaultValue={initial?.description} />
      </Field>
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <Field label={t("studio.includes")}>
        <DeliverablesPicker value={items} onChange={setItems} platforms={platforms} />
      </Field>
      <Field label={t("studio.deliveryDays")}>
        <Input name="deliveryDays" type="number" min={1} max={365} dir="ltr" defaultValue={initial?.deliveryDays ?? ""} className="w-32" />
      </Field>
      {/* One list of contents (the picker above); anything it lacks goes here, folded away until needed. */}
      <details className="rounded-lg border p-3" open={Boolean(initial?.deliverables.length)} data-testid="package-extra">
        <summary className="cursor-pointer text-sm font-medium">{t("studio.deliverablesMore")}</summary>
        <Textarea name="deliverables" rows={3} maxLength={1000} defaultValue={initial?.deliverables.join("\n")} placeholder={t("studio.deliverablesPlaceholder")} className="mt-2" aria-label={t("studio.deliverables")} />
      </details>
      <OtherLanguage main={contentLang} filled={Boolean(tr.title || tr.description || tr.deliverables?.length)}>
        {(attrs, label) => (
          <>
            <Field label={label(t("studio.title"))}>
              <Input name="tr_title" maxLength={80} defaultValue={tr.title ?? ""} {...attrs} />
            </Field>
            <Field label={label(t("studio.description"))}>
              <Input name="tr_description" maxLength={300} defaultValue={tr.description ?? ""} {...attrs} />
            </Field>
            <Field label={label(t("studio.deliverables"))}>
              <Textarea name="tr_deliverables" rows={3} maxLength={1000} defaultValue={(tr.deliverables ?? []).join("\n")} {...attrs} />
            </Field>
          </>
        )}
      </OtherLanguage>
      <div className="flex gap-2">
        <SubmitButton className="h-9">{initial ? t("studio.save") : t("studio.add")}</SubmitButton>
        {initial && (
          <Button type="button" variant="destructive" className="h-9" disabled={deleting} onClick={() => start(() => deletePackageAction(initial.id))}>
            {t("studio.delete")}
          </Button>
        )}
      </div>
    </form>
  );
}
