"use client";

import { Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState, useTransition } from "react";
import {
  addProspectAction,
  importResearchedAction,
  removeProspectAction,
  saveProspectDetailsAction,
  setProspectPriorityAction,
  setProspectStatusAction,
} from "@/app/[locale]/(main)/admin/prospect-actions";
import { FormError } from "@/components/form-error";
import { Field } from "@/components/studio/chips";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PROSPECT_STATUSES, type ProspectStatus } from "@/lib/prospects";

type Option = { key: string; label: string };
const select = "h-9 rounded-lg border border-input bg-background px-2 text-sm";

export function AddProspectForm({ cities }: { cities: Option[] }) {
  const t = useTranslations("AdminProspects");
  const [state, action] = useActionState(addProspectAction, undefined);
  return (
    <form action={action} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2" data-testid="prospect-add">
      <h3 className="font-semibold sm:col-span-2">{t("add")}</h3>
      <div className="sm:col-span-2">
        <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
        {state?.added && <p role="status" className="text-sm text-brand" data-testid="prospect-added">{t("added", { name: state.added })}</p>}
        {state?.exists && <p role="status" className="text-sm text-muted-foreground" data-testid="prospect-exists">{t("exists", { name: state.exists })}</p>}
      </div>
      <Field label={t("name")} htmlFor="pr-name"><Input id="pr-name" name="name" required minLength={2} maxLength={120} /></Field>
      <Field label={t("city")} htmlFor="pr-city">
        <select id="pr-city" name="city" className={`${select} w-full`} defaultValue="amman">
          {cities.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </Field>
      <Field label={t("website")} htmlFor="pr-website"><Input id="pr-website" name="website" dir="ltr" placeholder="https://" /></Field>
      <Field label={t("instagram")} htmlFor="pr-instagram"><Input id="pr-instagram" name="instagram" dir="ltr" placeholder="@" /></Field>
      <div className="sm:col-span-2">
        <Field label={t("services")} hint={t("servicesHint")} htmlFor="pr-services"><Input id="pr-services" name="services" /></Field>
      </div>
      <div className="sm:col-span-2">
        <Field label={t("note")} htmlFor="pr-note"><Input id="pr-note" name="note" maxLength={1000} /></Field>
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="priority" value="1" className="size-4" /> {t("priority")}
      </label>
      <SubmitButton className="sm:col-span-2">{t("addButton")}</SubmitButton>
    </form>
  );
}

export function ImportResearchedButton({ count, researchedOn }: { count: number; researchedOn: string }) {
  const t = useTranslations("AdminProspects");
  const [state, action, pending] = useActionState(() => importResearchedAction(), undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <Button type="submit" variant="outline" size="sm" disabled={pending} data-testid="prospects-import">{t("import", { count })}</Button>
      <span className="text-xs text-muted-foreground">{t("researched", { date: researchedOn })}</span>
      {state?.imported && <span role="status" className="text-sm" data-testid="prospects-imported">{t("importDone", state.imported)}</span>}
    </form>
  );
}

export function ProspectControls({ id, status, priority, note, website, instagram }: { id: string; status: ProspectStatus; priority: boolean; note: string; website: string; instagram: string }) {
  const t = useTranslations("AdminProspects");
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [state, save] = useActionState(saveProspectDetailsAction, undefined);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label={t("statusLabel")}
          className={select}
          value={status}
          disabled={pending}
          onChange={(e) => start(() => setProspectStatusAction(id, e.target.value))}
          data-testid="prospect-status"
        >
          {PROSPECT_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
        </select>
        {status === "new" && (
          <Button size="sm" variant="default" disabled={pending} onClick={() => start(() => setProspectStatusAction(id, "contacted"))} data-testid="prospect-contacted">
            {t("markContacted")}
          </Button>
        )}
        <Button size="sm" variant="ghost" aria-pressed={priority} aria-label={t("priority")} disabled={pending} onClick={() => start(() => setProspectPriorityAction(id, !priority))} data-testid="prospect-priority">
          <Star className={priority ? "size-4 fill-current text-amber-500" : "size-4"} aria-hidden />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing((v) => !v)} data-testid="prospect-edit">{t("edit")}</Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label={t("remove")}
          disabled={pending}
          onClick={() => { if (window.confirm(t("removeConfirm"))) start(() => removeProspectAction(id)); }}
          data-testid="prospect-remove"
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>
      {editing && (
        <form action={save} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2" onSubmit={() => setEditing(false)}>
          <input type="hidden" name="id" value={id} />
          <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
          <Field label={t("website")} htmlFor={`w-${id}`}><Input id={`w-${id}`} name="website" defaultValue={website} dir="ltr" /></Field>
          <Field label={t("instagram")} htmlFor={`i-${id}`}><Input id={`i-${id}`} name="instagram" defaultValue={instagram} dir="ltr" /></Field>
          <div className="sm:col-span-2">
            <Field label={t("note")} htmlFor={`n-${id}`}>
              <textarea id={`n-${id}`} name="note" defaultValue={note} maxLength={1000} rows={3} className="w-full rounded-lg border border-input bg-background p-2 text-sm" />
            </Field>
          </div>
          <SubmitButton className="sm:col-span-2">{t("save")}</SubmitButton>
        </form>
      )}
    </div>
  );
}
