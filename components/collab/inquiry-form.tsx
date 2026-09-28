"use client";

import { Eye, Send, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState, useSyncExternalStore } from "react";
import { sendInquiryAction } from "@/app/[locale]/(main)/studio/collab/actions";
import { DeliverablesPicker } from "@/components/contracts/deliverables-picker";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChipGroup, Field } from "@/components/studio/chips";
import { COLLAB_MODES, SUPPLIER_FIELDS, WORK_MODES } from "@/lib/collab/types";
import type { DeliverableLine } from "@/lib/db/schema";

type Option = { key: string; label: string };
export type Recipient = { id: string; name: string; kind: "agency" | "freelancer"; partner: boolean };

/**
 * A structured work inquiry (docs/48 §inquiry). The audience preview lists
 * exactly the fields a supplier receives (SUPPLIER_FIELDS, the same list the
 * server projects), so what the buyer approves is what is sent.
 */
export function InquiryForm({ recipients, preselected, roles, platforms, cities, currency, defaultCity, needId = "", parentContracts, initial }: { recipients: Recipient[]; preselected: string[]; roles: Option[]; platforms: Option[]; cities: Option[]; currency: string; defaultCity: string; needId?: string; parentContracts: Option[]; initial?: { title: string; scope: string; deliverables: DeliverableLine[]; note: "template" | "rehire" } | null }) {
  const t = useTranslations("Collab.inquiry");
  const tc = useTranslations("Collab");
  const [state, action] = useActionState(sendInquiryAction, undefined);
  const [lines, setLines] = useState<DeliverableLine[]>(initial?.deliverables ?? []);
  const [chosen, setChosen] = useState<string[]>(preselected.filter((id) => recipients.some((r) => r.id === id)));
  const [preview, setPreview] = useState(false);
  const tz = useSyncExternalStore(() => () => {}, () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Amman", () => "Asia/Amman");
  const toggle = (id: string) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 8 ? [...c, id] : c));
  const errors: Record<string, string> = { recipients: t("errors.recipients"), parentContract: t("errors.parentContract"), need: t("errors.need"), rateLimited: tc("errors.rateLimited"), unavailable: tc("errors.unavailable") };

  return (
    <form action={action} className="grid gap-5" data-testid="inquiry-form">
      <input type="hidden" name="deliverables" value={JSON.stringify(lines)} />
      <input type="hidden" name="timezone" value={tz} />
      <input type="hidden" name="needId" value={needId} />
      {chosen.map((id) => <input key={id} type="hidden" name="recipients" value={id} />)}
      <FormError message={state?.error ? errors[state.error] ?? tc("errors.invalid") : undefined} />
      {initial && <p className="rounded-xl border border-brand-line bg-brand-soft p-3 text-sm" data-testid="inquiry-prefill" data-from={initial.note}>{initial.note === "rehire" ? t("rehireNote") : t("templateNote")}</p>}

      <section className="grid gap-2">
        <h2 className="font-semibold">{t("toTitle")}</h2>
        <p className="text-xs text-muted-foreground">{t("toHint")}</p>
        {recipients.length === 0 ? (
          <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">{t("noRecipients")}</p>
        ) : (
          <ul className="flex flex-wrap gap-2" data-testid="inquiry-recipients">
            {recipients.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => toggle(r.id)} aria-pressed={chosen.includes(r.id)} className={`inline-flex h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm ${chosen.includes(r.id) ? "border-primary bg-primary text-primary-foreground" : ""}`} data-testid="recipient-toggle">
                  {r.name} <span className="text-xs opacity-70">· {tc(`kinds.${r.kind}`)}{r.partner ? ` · ${t("partner")}` : ""}</span>
                  {chosen.includes(r.id) && <X className="size-3.5" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-4">
        <h2 className="font-semibold">{t("whatTitle")}</h2>
        <Field label={t("title")} htmlFor="inq-title"><Input id="inq-title" name="title" required minLength={3} maxLength={120} dir="auto" defaultValue={initial?.title ?? ""} /></Field>
        <Field label={t("role")}>
          <select name="role" defaultValue="" className="h-11 w-full rounded-lg border bg-background px-2 text-sm">
            <option value="">{t("roleAny")}</option>
            {roles.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </Field>
        <Field label={t("deliverables")} hint={t("deliverablesHint")}><DeliverablesPicker value={lines} onChange={setLines} platforms={platforms} /></Field>
        <Field label={t("scope")} htmlFor="inq-scope"><Textarea id="inq-scope" name="scope" rows={4} maxLength={3000} dir="auto" placeholder={t("scopeHint")} defaultValue={initial?.scope ?? ""} /></Field>
        <Field label={t("assets")} hint={t("assetsHint")} htmlFor="inq-assets"><Input id="inq-assets" name="assetsNote" maxLength={500} dir="auto" /></Field>
      </section>

      <section className="grid gap-4">
        <h2 className="font-semibold">{t("whenTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("startsOn")} htmlFor="inq-from"><Input id="inq-from" name="startsOn" type="date" dir="ltr" /></Field>
          <Field label={t("dueOn")} htmlFor="inq-to"><Input id="inq-to" name="dueOn" type="date" dir="ltr" /></Field>
          <Field label={tc("workMode.label")}>
            <select name="workMode" defaultValue="remote" className="h-11 w-full rounded-lg border bg-background px-2 text-sm">
              {WORK_MODES.map((m) => <option key={m} value={m}>{tc(`workMode.${m}`)}</option>)}
            </select>
          </Field>
          <Field label={t("city")}>
            <select name="city" defaultValue={defaultCity} className="h-11 w-full rounded-lg border bg-background px-2 text-sm">
              <option value="">{t("cityAny")}</option>
              {cities.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </Field>
          <Field label={t("budget", { currency })} hint={t("budgetHint")} htmlFor="inq-budget"><Input id="inq-budget" name="budget" type="number" min={0} step="0.001" dir="ltr" /></Field>
          <Field label={t("responseDays")} htmlFor="inq-days"><Input id="inq-days" name="responseDays" type="number" min={1} max={30} defaultValue={7} dir="ltr" /></Field>
        </div>
        <p className="text-xs text-muted-foreground">{t("timezone", { tz })}</p>
      </section>

      <section className="grid gap-4">
        <h2 className="font-semibold">{t("howTitle")}</h2>
        <Field label={tc("modes.label")} hint={t("modeHint")}>
          <ChipGroup type="radio" name="privacyMode" options={COLLAB_MODES.map((m) => ({ key: m, label: tc(`modes.${m}`) }))} defaultValues={["private"]} />
        </Field>
        {parentContracts.length > 0 && (
          <Field label={t("parent")} hint={t("parentHint")}>
            <select name="parentContractId" defaultValue="" className="h-11 w-full rounded-lg border bg-background px-2 text-sm" data-testid="inquiry-parent">
              <option value="">{t("parentNone")}</option>
              {parentContracts.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </Field>
        )}
        {parentContracts.length === 0 && <input type="hidden" name="parentContractId" value="" />}
      </section>

      <section className="rounded-2xl border border-brand-line bg-brand-soft p-4 text-sm" data-testid="audience-preview">
        <button type="button" className="flex w-full items-center justify-between gap-2 font-semibold" onClick={() => setPreview((p) => !p)} aria-expanded={preview} data-testid="audience-preview-toggle">
          <span className="flex items-center gap-2"><Eye className="size-4 text-brand" /> {t("previewTitle", { count: chosen.length })}</span>
          <span className="text-xs font-normal text-brand">{preview ? t("previewHide") : t("previewShow")}</span>
        </button>
        {preview && (
          <div className="mt-3 grid gap-2">
            <p className="text-xs text-muted-foreground">{t("previewBody")}</p>
            <ul className="flex flex-wrap gap-1.5">
              {SUPPLIER_FIELDS.filter((f) => !["id", "status", "sentAt", "country"].includes(f)).map((f) => <li key={f} className="rounded-full bg-background px-2 py-0.5 text-xs" data-testid="preview-field">{t(`fields.${f}`)}</li>)}
            </ul>
            <p className="text-xs font-medium">{t("previewNever")}</p>
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <SubmitButton className="h-11 gap-1.5 px-5" disabled={chosen.length === 0}><Send className="size-4" /> {t("send", { count: chosen.length })}</SubmitButton>
        <Button type="button" variant="ghost" className="h-11" onClick={() => history.back()}>{tc("cancel")}</Button>
      </div>
    </form>
  );
}
