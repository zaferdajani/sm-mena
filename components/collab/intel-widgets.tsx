"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { createPlanAction, disputeFeedbackAction, leaveFeedbackAction, savePrefsAction, type IntelState } from "@/app/[locale]/(main)/studio/collab/intel-actions";
import { DeliverablesPicker } from "@/components/contracts/deliverables-picker";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/studio/chips";
import { REMINDER_KINDS } from "@/lib/collab/next-actions";
import { TEMPLATES, type TemplateKey } from "@/lib/collab/templates";
import type { DeliverableLine } from "@/lib/db/schema";

type Option = { key: string; label: string };
const ERRORS = ["invalid", "rateLimited", "unavailable", "notFound", "notFinished"];
const err = (t: (k: string) => string, e?: string) => (e ? t(`errors.${ERRORS.includes(e) ? e : "invalid"}`) : undefined);

/** The brief: deliverables from the catalogue, a redacted scope, and whether the assistant may shape the packages. */
export function PlanForm({ platforms, assistantAvailable, templateNames, initial }: { platforms: Option[]; assistantAvailable: boolean; templateNames: Record<TemplateKey, string>; initial?: { title: string; scope: string; deliverables: DeliverableLine[]; privateNotes?: string } }) {
  const t = useTranslations("Planner");
  const [state, action] = useActionState(createPlanAction, undefined);
  const [lines, setLines] = useState<DeliverableLine[]>(initial?.deliverables ?? []);
  return (
    <form action={action} className="grid gap-4 rounded-2xl border p-4" data-testid="plan-form">
      <input type="hidden" name="deliverables" value={JSON.stringify(lines)} />
      <FormError message={err(t, state?.error)} />
      <Field label={t("form.title")} htmlFor="pl-title"><Input id="pl-title" name="title" required minLength={3} maxLength={120} dir="auto" defaultValue={initial?.title ?? ""} /></Field>
      <div className="flex flex-wrap gap-1.5" data-testid="plan-templates">
        <span className="self-center text-xs text-muted-foreground">{t("form.startFrom")}</span>
        {(Object.keys(TEMPLATES) as TemplateKey[]).map((k) => (
          <Button key={k} type="button" variant="outline" size="sm" className="h-11 sm:h-9" onClick={() => setLines(TEMPLATES[k].deliverables)} data-testid={`plan-template-${k}`}>{templateNames[k]}</Button>
        ))}
      </div>
      <Field label={t("form.deliverables")}><DeliverablesPicker value={lines} onChange={setLines} platforms={platforms} /></Field>
      <Field label={t("form.scope")} hint={t("form.scopeHint")} htmlFor="pl-scope"><Textarea id="pl-scope" name="scope" rows={4} maxLength={3000} dir="auto" defaultValue={initial?.scope ?? ""} /></Field>
      <Field label={t("form.privateNotes")} hint={t("form.privateNotesHint")} htmlFor="pl-private"><Textarea id="pl-private" name="privateNotes" rows={2} maxLength={3000} dir="auto" defaultValue={initial?.privateNotes ?? ""} data-testid="plan-private-notes" /></Field>
      <label className="flex min-h-11 items-start gap-2 text-sm">
        <input type="checkbox" name="useAssistant" value="1" disabled={!assistantAvailable} className="mt-1 size-4 accent-[var(--primary)]" data-testid="plan-assistant" />
        <span><span className="inline-flex items-center gap-1 font-medium"><Sparkles className="size-4 text-brand" aria-hidden /> {t("form.assistant")}</span><br /><span className="text-xs text-muted-foreground">{assistantAvailable ? t("form.assistantHint") : t("form.assistantOff")}</span></span>
      </label>
      <SubmitButton className="h-11 justify-self-start px-5" testId="plan-submit">{t("form.submit")}</SubmitButton>
    </form>
  );
}

export function FeedbackForm({ workOrderId, aboutName }: { workOrderId: string; aboutName: string }) {
  const t = useTranslations("CollabFeedback");
  const [state, action] = useActionState(leaveFeedbackAction, undefined);
  if (state?.ok) return <p className="rounded-xl border border-brand-line bg-brand-soft p-3 text-sm" role="status" data-testid="feedback-done">✓ {t("done")}</p>;
  const scale = (name: string, label: string) => (
    <fieldset className="grid gap-1">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex gap-1" role="radiogroup" aria-describedby={`${name}-hint`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="relative grid size-11 cursor-pointer place-items-center rounded-lg border text-sm has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-white">
            <input type="radio" name={name} value={n} required className="absolute inset-0 cursor-pointer opacity-0" data-testid={`fb-${name}-${n}`} />{n}
          </label>
        ))}
      </div>
      <span id={`${name}-hint`} className="text-[11px] text-muted-foreground">{t("scaleHint")}</span>
    </fieldset>
  );
  return (
    <form action={action} className="grid gap-3 rounded-2xl border p-4" data-testid="feedback-form">
      <input type="hidden" name="workOrderId" value={workOrderId} />
      <p className="font-semibold">{t("title", { name: aboutName })}</p>
      <p className="text-xs text-muted-foreground">{t("intro")}</p>
      <FormError message={err(t, state?.error)} />
      <div className="grid gap-3 sm:grid-cols-3">
        {scale("communication", t("communication"))}
        {scale("reliability", t("reliability"))}
        {scale("quality", t("quality"))}
      </div>
      <Field label={t("body")} hint={t("bodyHint")} htmlFor="fb-body"><Textarea id="fb-body" name="body" rows={3} maxLength={1500} dir="auto" /></Field>
      <Field label={t("visibilityLabel")} hint={t("visibilityHint")}>
        <div className="grid gap-1 text-sm">
          <label className="flex min-h-11 items-center gap-2"><input type="radio" name="visibility" value="parties" defaultChecked className="size-4 accent-[var(--primary)]" /> {t("parties")}</label>
          <label className="flex min-h-11 items-center gap-2"><input type="radio" name="visibility" value="public" className="size-4 accent-[var(--primary)]" data-testid="fb-public" /> {t("public")}</label>
        </div>
      </Field>
      <SubmitButton className="h-11 justify-self-start px-5" testId="feedback-submit">{t("submit")}</SubmitButton>
    </form>
  );
}

export function DisputeForm({ id }: { id: string }) {
  const t = useTranslations("CollabFeedback");
  const [state, action] = useActionState(disputeFeedbackAction, undefined);
  const [open, setOpen] = useState(false);
  if (state?.ok) return <p className="text-xs text-brand" role="status" data-testid="dispute-done">✓ {t("disputeDone")}</p>;
  if (!open) return <Button type="button" variant="ghost" size="sm" className="h-11 justify-self-start sm:h-9" onClick={() => setOpen(true)} data-testid="dispute-open">{t("dispute")}</Button>;
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="id" value={id} />
      <FormError message={err(t, state?.error)} />
      <Textarea name="note" rows={2} maxLength={1000} required dir="auto" placeholder={t("disputeHint")} data-testid="dispute-note" />
      <SubmitButton variant="outline" className="h-11 justify-self-start" testId="dispute-submit">{t("disputeSend")}</SubmitButton>
    </form>
  );
}

export function PrefsForm({ muted, quietStart, quietEnd, showFeedback }: { muted: string[]; quietStart: number | null; quietEnd: number | null; showFeedback: boolean }) {
  const t = useTranslations("NextActions");
  const tf = useTranslations("CollabFeedback");
  const [state, action] = useActionState(savePrefsAction, undefined);
  const hours = Array.from({ length: 24 }, (_, h) => h);
  return (
    <form action={action} className="grid gap-5" data-testid="prefs-form">
      <FormError message={err(t, state?.error)} />
      {state?.ok && <p className="text-sm text-brand" role="status" data-testid="prefs-saved">✓ {t("prefs.saved")}</p>}
      <section className="grid gap-2 rounded-2xl border p-4">
        <h2 className="font-semibold">{t("prefs.remindersTitle")}</h2>
        <p className="text-xs text-muted-foreground">{t("prefs.remindersHint")}</p>
        {REMINDER_KINDS.map((k) => (
          <label key={k} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="mutedKinds" value={k} defaultChecked={muted.includes(k)} className="size-4 accent-[var(--primary)]" data-testid={`mute-${k}`} /> {t("prefs.mute", { kind: t(`kinds.${k}`) })}</label>
        ))}
      </section>
      <section className="grid gap-2 rounded-2xl border p-4">
        <h2 className="font-semibold">{t("prefs.quietTitle")}</h2>
        <p className="text-xs text-muted-foreground">{t("prefs.quietHint")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("prefs.quietFrom")} htmlFor="q-start"><select id="q-start" name="quietStart" defaultValue={quietStart ?? ""} className="h-11 w-full rounded-lg border bg-background px-2 text-sm" data-testid="quiet-start"><option value="">{t("prefs.none")}</option>{hours.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}</select></Field>
          <Field label={t("prefs.quietTo")} htmlFor="q-end"><select id="q-end" name="quietEnd" defaultValue={quietEnd ?? ""} className="h-11 w-full rounded-lg border bg-background px-2 text-sm" data-testid="quiet-end"><option value="">{t("prefs.none")}</option>{hours.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}</select></Field>
        </div>
      </section>
      <section className="grid gap-2 rounded-2xl border p-4">
        <h2 className="font-semibold">{tf("optOutTitle")}</h2>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="showFeedback" value="1" defaultChecked={showFeedback} className="size-4 accent-[var(--primary)]" data-testid="show-feedback" /> {tf("optOutLabel")}</label>
        <p className="text-xs text-muted-foreground">{tf("optOutHint")}</p>
      </section>
      <SubmitButton className="h-11 justify-self-start px-5" testId="prefs-submit">{t("prefs.save")}</SubmitButton>
    </form>
  );
}

export type { IntelState };
