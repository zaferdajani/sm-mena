"use client";

import { Bookmark, BookmarkCheck, Check, Copy, Link2, MessageCircle, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState, useSyncExternalStore } from "react";
import { Link } from "@/i18n/navigation";
import { answerInviteAction, createInviteAction, publishNeedAction, replyNeedAction, saveCollabProfileAction, saveRosterAction, addWindowAction, type CollabState } from "@/app/[locale]/(main)/studio/collab/actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChipGroup, Field } from "@/components/studio/chips";
import { AVAILABILITY_STATUSES, CAPACITY_UNITS, COLLAB_MODES, RATE_UNITS, VISIBILITIES, WORK_MODES } from "@/lib/collab/types";

type Option = { key: string; label: string };
const noop = () => () => {};
/** A value that only exists in the browser (zone, origin): the server renders the fallback, hydration keeps it, then the real one shows. */
const useBrowserValue = <T,>(read: () => T, fallback: T) => useSyncExternalStore(noop, read, () => fallback);
const errorText = (t: (k: string) => string, e?: string) => (e ? t(`errors.${["invalid", "rateLimited", "unavailable", "notFound", "exists", "self", "expired", "blocked", "cooldown", "recipients", "parentContract", "need", "closed"].includes(e) ? e : "invalid"}`) : undefined);

/** Save / saved on the private roster: a quiet toggle, the provider is not told. */
export function SaveToRoster({ providerAgencyId, saved }: { providerAgencyId: string; saved: boolean }) {
  const t = useTranslations("Collab.roster");
  const [state, action] = useActionState(saveRosterAction, undefined);
  const done = saved || state?.ok;
  return (
    <form action={action}>
      <input type="hidden" name="providerAgencyId" value={providerAgencyId} />
      <input type="hidden" name="groupName" value="" />
      <input type="hidden" name="tags" value="" />
      <input type="hidden" name="notes" value="" />
      <input type="hidden" name="rate" value="" />
      <input type="hidden" name="rateUnit" value="" />
      {done ? (
        <Link href="/studio/collab/network" className={buttonVariants({ variant: "outline", size: "lg", className: "h-11 w-full gap-1.5" })} data-testid="roster-saved">
          <BookmarkCheck className="size-4 text-brand" /> {t("saved")}
        </Link>
      ) : (
        <SubmitButton variant="outline" className="h-11 w-full gap-1.5">
          <Bookmark className="size-4" /> {t("save")}
        </SubmitButton>
      )}
    </form>
  );
}

/** The agency publishes a need on purpose: title, roles, dates, mode, audience, life. */
export function NeedForm({ roles, services, cities, defaultCity }: { roles: Option[]; services: Option[]; cities: Option[]; defaultCity: string }) {
  const t = useTranslations("Collab.needs");
  const tc = useTranslations("Collab");
  const [state, action] = useActionState(publishNeedAction, undefined);
  const [open, setOpen] = useState(false);
  if (state?.ok) return <p className="rounded-xl border border-brand-line bg-brand-soft p-3 text-sm" role="status" data-testid="need-published">✓ {t("published")}</p>;
  if (!open)
    return (
      <Button type="button" size="lg" className="h-11 gap-1.5" onClick={() => setOpen(true)} data-testid="need-open">
        <Send className="size-4" /> {t("publish")}
      </Button>
    );
  return (
    <form action={action} className="grid gap-4 rounded-2xl border p-4" data-testid="need-form">
      <FormError message={errorText(tc, state?.error)} />
      <Field label={t("title")} htmlFor="need-title"><Input id="need-title" name="title" required minLength={3} maxLength={120} dir="auto" /></Field>
      <Field label={t("roles")} hint={t("rolesHint")}><ChipGroup name="roles" options={roles} /></Field>
      <Field label={t("services")}><ChipGroup name="services" options={services} /></Field>
      <Field label={t("scope")} htmlFor="need-scope"><Textarea id="need-scope" name="scope" rows={3} maxLength={2000} dir="auto" placeholder={t("scopeHint")} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tc("workMode.label")}>
          <select name="workMode" defaultValue="remote" className="h-11 w-full rounded-lg border bg-background px-2 text-sm">
            {WORK_MODES.map((m) => <option key={m} value={m}>{tc(`workMode.${m}`)}</option>)}
          </select>
        </Field>
        <Field label={t("city")}>
          <select name="city" defaultValue={defaultCity} className="h-11 w-full rounded-lg border bg-background px-2 text-sm">
            <option value="">{t("anyCity")}</option>
            {cities.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </Field>
        <Field label={t("startsOn")} htmlFor="need-from"><Input id="need-from" name="startsOn" type="date" dir="ltr" /></Field>
        <Field label={t("endsOn")} htmlFor="need-to"><Input id="need-to" name="endsOn" type="date" dir="ltr" /></Field>
        <Field label={t("budgetMin")} htmlFor="need-min"><Input id="need-min" name="budgetMin" type="number" min={0} step="0.001" dir="ltr" /></Field>
        <Field label={t("budgetMax")} htmlFor="need-max"><Input id="need-max" name="budgetMax" type="number" min={0} step="0.001" dir="ltr" /></Field>
      </div>
      <Field label={t("languages")}><ChipGroup name="languages" options={[{ key: "ar", label: tc("lang.ar") }, { key: "en", label: tc("lang.en") }]} defaultValues={["ar"]} /></Field>
      <Field label={tc("modes.label")} hint={tc("modes.hint")}><ChipGroup name="modes" options={COLLAB_MODES.map((m) => ({ key: m, label: tc(`modes.${m}`) }))} defaultValues={["private"]} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("audience")} hint={t("audienceHint")}>
          <select name="audience" defaultValue="public" className="h-11 w-full rounded-lg border bg-background px-2 text-sm" data-testid="need-audience">
            <option value="public">{t("audiencePublic")}</option>
            <option value="partners">{t("audiencePartners")}</option>
          </select>
        </Field>
        <Field label={t("days")} htmlFor="need-days"><Input id="need-days" name="days" type="number" min={1} max={90} defaultValue={30} dir="ltr" /></Field>
      </div>
      <div className="flex gap-2">
        <SubmitButton className="h-11 px-5">{t("publish")}</SubmitButton>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{tc("cancel")}</Button>
      </div>
    </form>
  );
}

/** A provider raises a hand on a need. */
export function NeedReply({ needId, replied }: { needId: string; replied: boolean }) {
  const t = useTranslations("Collab.needs");
  const tc = useTranslations("Collab");
  const [state, action] = useActionState(replyNeedAction, undefined);
  const [open, setOpen] = useState(false);
  if (replied || state?.ok) return <p className="text-sm font-medium text-brand" role="status" data-testid="need-replied">✓ {t("replied")}</p>;
  if (!open) return <Button type="button" size="lg" className="h-11" onClick={() => setOpen(true)} data-testid="need-reply-open">{t("reply")}</Button>;
  return (
    <form action={action} className="grid w-full gap-2">
      <input type="hidden" name="needId" value={needId} />
      <FormError message={errorText(tc, state?.error)} />
      <Textarea name="note" rows={3} maxLength={1000} placeholder={t("replyHint")} dir="auto" />
      <div className="flex gap-2">
        <SubmitButton className="h-11">{t("sendReply")}</SubmitButton>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{tc("cancel")}</Button>
      </div>
    </form>
  );
}

/** Add an availability window: dates in the provider's zone, status, capacity, who may see it. */
export function AvailabilityForm({ timezone }: { timezone: string }) {
  const t = useTranslations("Collab.availability");
  const tc = useTranslations("Collab");
  const [state, action] = useActionState(addWindowAction, undefined);
  const tz = useBrowserValue(() => Intl.DateTimeFormat().resolvedOptions().timeZone || timezone, timezone);
  return (
    <form action={action} className="grid gap-3 rounded-2xl border p-4" data-testid="availability-form">
      <FormError message={errorText(tc, state?.error)} />
      {state?.ok && <p className="text-sm text-brand" role="status">✓ {t("added")}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("from")} htmlFor="av-from"><Input id="av-from" name="from" type="date" required dir="ltr" /></Field>
        <Field label={t("to")} htmlFor="av-to"><Input id="av-to" name="to" type="date" required dir="ltr" /></Field>
      </div>
      <Field label={t("status")}>
        <ChipGroup type="radio" name="status" options={AVAILABILITY_STATUSES.map((s) => ({ key: s, label: t(`statuses.${s}`) }))} defaultValues={["available"]} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("capacity")} htmlFor="av-units" hint={t("capacityHint")}><Input id="av-units" name="capacityUnits" type="number" min={0} max={1000} dir="ltr" /></Field>
        <Field label={t("unit")}>
          <select name="capacityUnit" defaultValue="days" className="h-11 w-full rounded-lg border bg-background px-2 text-sm">
            {CAPACITY_UNITS.map((u) => <option key={u} value={u}>{t(`units.${u}`)}</option>)}
          </select>
        </Field>
        <Field label={t("visibility")} hint={t("visibilityHint")}>
          <select name="visibility" defaultValue="partners" className="h-11 w-full rounded-lg border bg-background px-2 text-sm" data-testid="availability-visibility">
            {VISIBILITIES.map((v) => <option key={v} value={v}>{t(`visibilities.${v}`)}</option>)}
          </select>
        </Field>
      </div>
      <Field label={t("note")} hint={t("noteHint")} htmlFor="av-note"><Input id="av-note" name="note" maxLength={200} dir="auto" /></Field>
      <input type="hidden" name="timezone" value={tz} />
      <p className="text-xs text-muted-foreground">{t("timezone", { tz })}</p>
      <SubmitButton className="h-11 justify-self-start px-5">{t("add")}</SubmitButton>
    </form>
  );
}

/** Private notes and a negotiated-rate reference about one provider. Only the owner sees this. */
export function RosterEditor({ providerAgencyId, groupName, tags, notes, rate, rateUnit, currency }: { providerAgencyId: string; groupName: string; tags: string[]; notes: string; rate: number | null; rateUnit: string | null; currency: string }) {
  const t = useTranslations("Collab.roster");
  const tc = useTranslations("Collab");
  const [state, action] = useActionState(saveRosterAction, undefined);
  return (
    <details className="rounded-xl border p-3 text-sm">
      <summary className="cursor-pointer font-medium">{t("notesTitle")}</summary>
      <form action={action} className="mt-3 grid gap-3" data-testid="roster-editor">
        <input type="hidden" name="providerAgencyId" value={providerAgencyId} />
        <FormError message={errorText(tc, state?.error)} />
        {state?.ok && <p className="text-brand" role="status">✓ {t("savedNotes")}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("group")} htmlFor={`g-${providerAgencyId}`}><Input id={`g-${providerAgencyId}`} name="groupName" defaultValue={groupName} maxLength={40} dir="auto" placeholder={t("groupHint")} /></Field>
          <Field label={t("tags")} htmlFor={`t-${providerAgencyId}`}><Input id={`t-${providerAgencyId}`} name="tags" defaultValue={tags.join(", ")} dir="auto" placeholder={t("tagsHint")} /></Field>
        </div>
        <Field label={t("notes")} hint={t("notesPrivate")} htmlFor={`n-${providerAgencyId}`}><Textarea id={`n-${providerAgencyId}`} name="notes" defaultValue={notes} rows={3} maxLength={1000} dir="auto" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("rate", { currency })} htmlFor={`r-${providerAgencyId}`}><Input id={`r-${providerAgencyId}`} name="rate" type="number" min={0} step="0.001" defaultValue={rate === null ? "" : rate / 1000} dir="ltr" /></Field>
          <Field label={t("rateUnit")}>
            <select name="rateUnit" defaultValue={rateUnit ?? "day"} className="h-11 w-full rounded-lg border bg-background px-2 text-sm">
              {RATE_UNITS.map((u) => <option key={u} value={u}>{t(`rateUnits.${u}`)}</option>)}
            </select>
          </Field>
        </div>
        <SubmitButton className="h-11 justify-self-start px-5">{t("saveNotes")}</SubmitButton>
      </form>
    </details>
  );
}

/** Make an invitation link; the token is shown once, here, for the sender to pass on. */
export function InvitePanel({ roles }: { roles: Option[] }) {
  const t = useTranslations("Collab.invites");
  const tc = useTranslations("Collab");
  const [state, action] = useActionState(createInviteAction, undefined);
  const [copied, setCopied] = useState(false);
  const origin = useBrowserValue(() => window.location.origin, "");
  if (state?.ok && state.link) {
    const url = `${origin}${state.link}`;
    return (
      <div className="grid gap-2 rounded-2xl border-2 border-brand/40 bg-brand/5 p-4" data-testid="invite-created">
        <p className="font-semibold">{t("ready")}</p>
        <p className="text-xs text-muted-foreground">{t("readyHint")}</p>
        <p className="break-all rounded-lg bg-background p-2 font-mono text-xs" dir="ltr" data-testid="invite-link">{url}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="h-11 gap-1.5" onClick={() => { navigator.clipboard?.writeText(url); setCopied(true); }}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? t("copied") : t("copy")}
          </Button>
          <a href={`https://wa.me/?text=${encodeURIComponent(t("whatsappText", { url }))}`} target="_blank" rel="noopener noreferrer" className={buttonVariants({ className: "h-11 gap-1.5 bg-[#25D366] text-white hover:bg-[#1ebe5b]" })}>
            <MessageCircle className="size-4" /> {t("whatsapp")}
          </a>
        </div>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-3 rounded-2xl border p-4" data-testid="invite-form">
      <p className="flex items-center gap-2 font-semibold"><Link2 className="size-4 text-brand" /> {t("title")}</p>
      <p className="text-xs text-muted-foreground">{t("intro")}</p>
      <FormError message={errorText(tc, state?.error)} />
      <Field label={t("label")} hint={t("labelHint")} htmlFor="inv-label"><Input id="inv-label" name="label" maxLength={60} dir="auto" /></Field>
      <Field label={t("roles")}><ChipGroup name="roles" options={roles} /></Field>
      <SubmitButton className="h-11 justify-self-start px-5">{t("create")}</SubmitButton>
    </form>
  );
}

/** The invited provider, signed in: accept or decline. */
export function InviteAnswer({ token }: { token: string }) {
  const t = useTranslations("Collab.invites");
  const tc = useTranslations("Collab");
  const [state, action] = useActionState(answerInviteAction, undefined);
  if (state?.ok) return <p className="text-sm text-muted-foreground" role="status">{t("declined")}</p>;
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="token" value={token} />
      <FormError message={errorText(tc, state?.error)} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton className="h-11 px-5" name="answer" value="accept">{t("accept")}</SubmitButton>
        <SubmitButton variant="outline" className="h-11" name="answer" value="decline">{t("decline")}</SubmitButton>
      </div>
    </form>
  );
}

/** How this provider likes to collaborate. Unknown stays unknown until they answer. */
export function CollabProfileForm({ modes, workModes, openToWork }: { modes: string[]; workModes: string[]; openToWork: boolean | null }) {
  const t = useTranslations("Collab.profile");
  const tc = useTranslations("Collab");
  const [state, action] = useActionState(saveCollabProfileAction, undefined);
  return (
    <form action={action} className="grid gap-3 rounded-2xl border p-4" data-testid="collab-profile-form">
      <p className="font-semibold">{t("title")}</p>
      <FormError message={errorText(tc, state?.error)} />
      {state?.ok && <p className="text-sm text-brand" role="status">✓ {t("saved")}</p>}
      <Field label={t("openToWork")} hint={t("openHint")}>
        <ChipGroup type="radio" name="openToWork" options={[{ key: "yes", label: t("yes") }, { key: "no", label: t("no") }, { key: "unknown", label: t("later") }]} defaultValues={[openToWork === null ? "unknown" : openToWork ? "yes" : "no"]} />
      </Field>
      <Field label={tc("modes.label")} hint={tc("modes.hint")}><ChipGroup name="modes" options={COLLAB_MODES.map((m) => ({ key: m, label: tc(`modes.${m}`) }))} defaultValues={modes} /></Field>
      <Field label={tc("workMode.label")}><ChipGroup name="workModes" options={WORK_MODES.map((m) => ({ key: m, label: tc(`workMode.${m}`) }))} defaultValues={workModes} /></Field>
      <SubmitButton className="h-11 justify-self-start px-5">{t("save")}</SubmitButton>
    </form>
  );
}

export type { CollabState };
