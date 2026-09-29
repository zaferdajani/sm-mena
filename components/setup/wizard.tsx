"use client";

import { ImagePlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { anotherProjectAction, finishSetupAction, goToStepAction, pauseSetupAction, removeMediaAction, saveClientStepAction, saveProfileStepAction, saveProjectStepAction, setCoverAction, uploadMediaAction } from "@/app/[locale]/(main)/setup/actions";
import { AgencyAvatar } from "@/components/agency-avatar";
import { FormError } from "@/components/form-error";
import { PortfolioExamples } from "@/components/studio/creator-guide";
import { ChipGroup, Field } from "@/components/studio/chips";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { AVATAR_UPLOAD, compressForRequest, compressImage, POST_UPLOAD, REQUEST_LIMIT } from "@/lib/media/image-compress";
import type { DraftMedia } from "@/lib/db/schema";

// The five-step first-run setup (docs/53). One task per screen, one primary
// action, Back and "Finish later" everywhere. Every form carries the draft
// version so a stale tab is refused server-side rather than overwriting.

type Option = { key: string; label: string };
export type WizardDraft = { version: number; step: number; status: string; source: string | null; clientMode: string | null; clientId: string | null; suggestedClient: string | null; title: string; contribution: string; services: string[]; platforms: string[]; media: DraftMedia[]; cover: number };
const ERRORS = ["bio", "avatar", "noImages", "tooMany", "too_large", "unsupported", "too_small", "limit", "generic", "mode", "client", "clientLimit", "title", "noServices"];
const err = (t: (k: string) => string, e?: string) => (e ? t(`errors.${ERRORS.includes(e) ? e : "generic"}`) : undefined);
const primary = "inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60";
const secondary = "inline-flex min-h-11 items-center justify-center rounded-xl border bg-background px-4 py-2 text-sm font-semibold text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function StepNav({ step, stale }: { step: number; stale: boolean }) {
  const t = useTranslations("Setup");
  return (
    <div className="flex flex-wrap items-center justify-between gap-2" data-testid="setup-stepnav">
      <p className="text-xs font-semibold text-muted-foreground" aria-live="polite" data-testid="setup-step-indicator">{t("stepOf", { step, total: 5 })}</p>
      <div className="flex gap-2">
        {step > 1 && (
          <form action={goToStepAction}><input type="hidden" name="step" value={step - 1} /><button type="submit" className={secondary} data-testid="setup-back">{t("back")}</button></form>
        )}
        <form action={pauseSetupAction}><button type="submit" className={secondary} data-testid="setup-later">{t("finishLater")}</button></form>
      </div>
      {stale && <p role="alert" className="basis-full rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950/30" data-testid="setup-stale">{t("stale")}</p>}
    </div>
  );
}

/** Step 1: logo or photo, a short introduction, services. The name is shown, not asked again. */
export function ProfileStep({ draft, agency, services }: { draft: WizardDraft; agency: { name: string; bio: string; avatarUrl: string | null; services: string[] }; services: { primary: Option[]; other: Option[] } }) {
  const t = useTranslations("Setup");
  const [state, action] = useActionState(saveProfileStepAction, undefined);
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const file = form.get("avatar");
    start(async () => {
      if (file instanceof File && file.size > 0) form.set("avatar", await compressImage(file, AVATAR_UPLOAD));
      else form.delete("avatar");
      action(form);
    });
  };
  return (
    <form onSubmit={submit} className="grid gap-5" data-testid="setup-profile">
      <input type="hidden" name="version" value={draft.version} />
      <h1 className="text-xl font-bold">{t("s1.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("s1.body")}</p>
      <FormError message={err(t, state?.error)} />
      <div className="flex items-center gap-4">
        <AgencyAvatar name={agency.name} src={preview ?? agency.avatarUrl} size={80} />
        <div className="min-w-0">
          <p className="truncate font-semibold" dir="auto" data-testid="setup-name">{agency.name}</p>
          <button type="button" onClick={() => input.current?.click()} className="mt-1 min-h-11 text-sm text-brand">{t("s1.pickImage")}</button>
          <input ref={input} type="file" name="avatar" accept="image/*" className="sr-only" data-testid="setup-avatar" onChange={(e) => { const f = e.target.files?.[0]; setPreview(f ? URL.createObjectURL(f) : null); }} />
          <p className="text-xs text-muted-foreground">{t("s1.imageHint")}</p>
        </div>
      </div>
      <Field label={t("s1.bio")} hint={t("s1.bioHint")} htmlFor="setup-bio"><Textarea id="setup-bio" name="bio" rows={3} maxLength={500} dir="auto" defaultValue={agency.bio} data-testid="setup-bio" /></Field>
      <Field label={t("s1.services")} hint={t("s1.servicesHint")}>
        <ChipGroup name="services" options={[...services.primary, ...services.other.slice(0, 12)]} defaultValues={agency.services} />
        <Input name="newServices" placeholder={t("s1.otherService")} maxLength={60} dir="auto" className="mt-2 max-w-sm" />
      </Field>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={primary} data-testid="setup-s1-continue">{pending ? t("saving") : t("saveContinue")}</button>
        <SkipTo step={2} label={t("doLater")} testId="setup-s1-later" />
      </div>
    </form>
  );
}

function SkipTo({ step, label, testId }: { step: number; label: string; testId: string }) {
  return (
    <form action={goToStepAction}><input type="hidden" name="step" value={step} /><button type="submit" className={secondary} data-testid={testId}>{label}</button></form>
  );
}

/** Uploads: compressed in the browser like Studio → New, then sent to the draft's private space. */
function UploadForm({ draft, returnStep, label, testId }: { draft: WizardDraft; returnStep: number; label: string; testId: string }) {
  const t = useTranslations("Setup");
  const [state, action] = useActionState(uploadMediaAction, undefined);
  const [pending, start] = useTransition();
  const [files, setFiles] = useState<File[]>([]);
  const [local, setLocal] = useState<string | null>(null);
  const room = 10 - draft.media.length;
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocal(null);
    if (!files.length) return setLocal("noImages");
    if (files.length > room) return setLocal("tooMany");
    const form = new FormData(e.currentTarget);
    form.delete("images");
    start(async () => {
      const small = await compressForRequest(files, POST_UPLOAD);
      if (small.reduce((n, f) => n + f.size, 0) > REQUEST_LIMIT) return setLocal("too_large");
      for (const f of small) form.append("images", f);
      action(form);
    });
  };
  return (
    <form onSubmit={submit} className="grid gap-3" data-testid={testId}>
      <input type="hidden" name="version" value={draft.version} />
      <input type="hidden" name="returnStep" value={returnStep} />
      <FormError message={err(t, local ?? state?.error)} />
      <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-4 text-sm">
        <ImagePlus className="size-6 text-brand" aria-hidden />
        <span>{files.length ? t("s2.picked", { count: files.length }) : label}</span>
        <span className="text-xs text-muted-foreground">{t("s2.formats", { room })}</span>
        <input type="file" name="images" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" data-testid={`${testId}-input`} onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, room))} />
      </label>
      <button type="submit" disabled={pending || !files.length} className={primary} data-testid={`${testId}-submit`}>{pending ? t("uploading") : t("s2.upload")}</button>
      {pending && <p className="text-xs text-muted-foreground" role="status">{t("notSavedYet")}</p>}
    </form>
  );
}

/** Step 2: where the work is. Only working paths get a button; the rest say why, honestly. */
export function SourceStep({ draft, imports }: { draft: WizardDraft; imports: boolean }) {
  const t = useTranslations("Setup");
  const [choice, setChoice] = useState<"upload" | "import" | "social" | null>(draft.source === "upload" ? "upload" : null);
  const card = (key: "upload" | "import" | "social", testId: string) => (
    <button type="button" aria-pressed={choice === key} onClick={() => setChoice(key)} className={`rounded-xl border p-4 text-start text-sm ${choice === key ? "border-primary bg-brand-soft" : "bg-background"}`} data-testid={testId}>
      <span className="block font-semibold">{t(`s2.${key}`)}</span>
      <span className="block text-xs text-muted-foreground">{t(`s2.${key}Hint`)}</span>
    </button>
  );
  return (
    <div className="grid gap-5" data-testid="setup-source">
      <h1 className="text-xl font-bold">{t("s2.title")}</h1>
      <div className="grid gap-2 sm:grid-cols-3">{card("upload", "setup-src-upload")}{card("import", "setup-src-import")}{card("social", "setup-src-social")}</div>
      {choice === "upload" && <UploadForm draft={draft} returnStep={3} label={t("s2.pick")} testId="setup-upload" />}
      {choice === "import" && (
        <div className="grid gap-2 rounded-xl border p-4 text-sm" data-testid="setup-import">
          {imports ? (
            <>
              <p>{t("s2.importBody")}</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/studio/import?from=setup" className={secondary} data-testid="setup-import-pdf">{t("s2.pdf")}</Link>
                <Link href="/studio/import/behance?from=setup" className={secondary} data-testid="setup-import-behance">{t("s2.behance")}</Link>
              </div>
            </>
          ) : <p className="text-muted-foreground">{t("s2.importOff")}</p>}
        </div>
      )}
      {choice === "social" && (
        <div className="grid gap-2 rounded-xl border p-4 text-sm" data-testid="setup-social">
          <p className="text-muted-foreground">{t("s2.socialBody")}</p>
          <ul className="grid gap-1">
            {(["google", "youtube", "instagram", "facebook", "tiktok"] as const).map((p) => (
              <li key={p} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2" data-testid={`setup-social-${p}`} data-state="unavailable">
                <span className="font-medium">{t(`s2.providers.${p}`)}</span>
                <span className="text-xs text-muted-foreground">{t("s2.notAvailable")}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{t("s2.socialAlt")}</p>
          <button type="button" onClick={() => setChoice("upload")} className={secondary}>{t("s2.upload")}</button>
        </div>
      )}
      {draft.media.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm" data-testid="setup-has-media">
          <span>{t("s2.already", { count: draft.media.length })}</span>
          <SkipTo step={3} label={t("continue")} testId="setup-s2-continue" />
        </div>
      )}
    </div>
  );
}

/** Step 3: who the work was for. Private and personal work are first-class choices. */
export function ClientStep({ draft, clients }: { draft: WizardDraft; clients: Option[] }) {
  const t = useTranslations("Setup");
  const [state, action] = useActionState(saveClientStepAction, undefined);
  const [mode, setMode] = useState<string>(draft.clientMode ?? (draft.suggestedClient ? "client" : ""));
  const [existing, setExisting] = useState<string>(draft.clientId ?? "");
  return (
    <form action={action} className="grid gap-5" data-testid="setup-client">
      <input type="hidden" name="version" value={draft.version} />
      <h1 className="text-xl font-bold">{t("s3.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("s3.example")}</p>
      <FormError message={err(t, state?.error)} />
      <div className="grid gap-2" role="radiogroup" aria-label={t("s3.title")}>
        {(["client", "personal", "private"] as const).map((m) => (
          <label key={m} className={`flex min-h-11 cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm ${mode === m ? "border-primary bg-brand-soft" : ""}`}>
            <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="mt-1 size-4 accent-[var(--primary)]" data-testid={`setup-mode-${m}`} />
            <span><span className="block font-semibold">{t(`s3.${m}`)}</span><span className="block text-xs text-muted-foreground">{t(`s3.${m}Hint`)}</span></span>
          </label>
        ))}
      </div>
      {mode === "client" && (
        <div className="grid gap-3 rounded-xl border p-4">
          {clients.length > 0 && (
            <Field label={t("s3.existing")} htmlFor="setup-client-id">
              <select id="setup-client-id" name="clientId" value={existing} onChange={(e) => setExisting(e.target.value)} className="h-11 w-full rounded-md border bg-background px-2" data-testid="setup-client-select">
                <option value="">{t("s3.newOne")}</option>
                {clients.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </Field>
          )}
          {!existing && (
            <Field label={t("s3.name")} hint={t("s3.nameHint")} htmlFor="setup-client-name">
              <Input id="setup-client-name" name="newClient" maxLength={80} dir="auto" defaultValue={draft.suggestedClient ?? ""} data-testid="setup-client-name" />
            </Field>
          )}
          {draft.suggestedClient && <p className="text-xs text-muted-foreground" data-testid="setup-client-suggested">{t("s3.suggested", { name: draft.suggestedClient })}</p>}
          <p className="text-xs text-muted-foreground">{t("s3.confidential")}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={!mode} className={primary} data-testid="setup-s3-continue">{t("continue")}</button>
      </div>
    </form>
  );
}

/** Step 4: one project. The first image is the cover; nothing is published here. */
export function ProjectStep({ draft, services, platforms }: { draft: WizardDraft; services: { primary: Option[]; other: Option[] }; platforms: Option[] }) {
  const t = useTranslations("Setup");
  const [state, action] = useActionState(saveProjectStepAction, undefined);
  return (
    <div className="grid gap-5" data-testid="setup-project">
      <h1 className="text-xl font-bold">{t("s4.title")}</h1>
      <section className="grid gap-2">
        <p className="text-sm font-medium">{t("s4.media", { count: draft.media.length })}</p>
        {draft.media.length > 0 && (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5" data-testid="setup-media">
            {draft.media.map((m, i) => (
              <li key={m.key} className="relative overflow-hidden rounded-lg border" style={{ backgroundColor: m.color }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- private, access-checked draft media */}
                <img src={`/api/portfolio-media/${m.thumbKey}`} alt="" className="aspect-square w-full object-cover" />
                {i === 0 && <span className="absolute start-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground" data-testid="setup-cover">{t("s4.cover")}</span>}
                <div className="flex justify-between gap-1 p-1">
                  {i !== 0 ? (
                    <form action={setCoverAction}><input type="hidden" name="version" value={draft.version} /><input type="hidden" name="index" value={i} /><button type="submit" className="min-h-11 px-1 text-xs text-brand" data-testid={`setup-make-cover-${i}`}>{t("s4.makeCover")}</button></form>
                  ) : <span />}
                  <form action={removeMediaAction}><input type="hidden" name="key" value={m.key} /><button type="submit" aria-label={t("s4.remove")} className="grid min-h-11 min-w-11 place-items-center rounded text-muted-foreground hover:bg-muted" data-testid={`setup-remove-${i}`}><X className="size-4" aria-hidden /></button></form>
                </div>
              </li>
            ))}
          </ul>
        )}
        {draft.media.length < 10 && <details className="rounded-xl border p-3"><summary className="cursor-pointer text-sm font-medium">{t("s4.addMore")}</summary><div className="pt-3"><UploadForm draft={draft} returnStep={4} label={t("s2.pick")} testId="setup-upload-more" /></div></details>}
      </section>
      <form action={action} className="grid gap-4">
        <input type="hidden" name="version" value={draft.version} />
        <FormError message={err(t, state?.error)} />
        <Field label={t("s4.label")} htmlFor="setup-title"><Input id="setup-title" name="title" required minLength={2} maxLength={120} dir="auto" defaultValue={draft.title} data-testid="setup-title" /></Field>
        <Field label={t("s4.contribution")} hint={t("s4.contributionHint")} htmlFor="setup-contribution"><Input id="setup-contribution" name="contribution" maxLength={300} dir="auto" defaultValue={draft.contribution} data-testid="setup-contribution" /></Field>
        <Field label={t("s4.services")}><ChipGroup name="services" options={[...services.primary, ...services.other.slice(0, 10)]} defaultValues={draft.services.length ? draft.services : [...services.primary, ...services.other].slice(0, 1).map((s) => s.key)} /></Field>
        <Field label={t("s4.platforms")} hint={t("optional")}><ChipGroup name="platforms" options={platforms} defaultValues={draft.platforms} /></Field>
        <PortfolioExamples />
        <p className="text-xs text-muted-foreground">{t("s4.noResults")}</p>
        <div className="flex flex-wrap gap-2"><button type="submit" className={primary} data-testid="setup-s4-preview">{t("s4.preview")}</button></div>
      </form>
    </div>
  );
}

/** Step 5: finish. Creates the post; visibility follows the page's publication setting and is not changed here. */
export function FinishForm({ draft, visibilityNote }: { draft: WizardDraft; visibilityNote: string }) {
  const t = useTranslations("Setup");
  const [state, action] = useActionState(finishSetupAction, undefined);
  return (
    <form action={action} className="grid gap-3" data-testid="setup-finish">
      <input type="hidden" name="version" value={draft.version} />
      <FormError message={err(t, state?.error)} />
      <p className="rounded-xl border border-brand-line bg-brand-soft p-3 text-sm" data-testid="setup-visibility">{visibilityNote}</p>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={primary} data-testid="setup-save">{t("s5.save")}</button>
        <SkipTo step={4} label={t("s5.editProject")} testId="setup-edit-project" />
        <SkipTo step={1} label={t("s5.editProfile")} testId="setup-edit-profile" />
      </div>
    </form>
  );
}

export function DoneActions({ handle, hasClient }: { handle: string; hasClient: boolean }) {
  const t = useTranslations("Setup");
  return (
    <div className="flex flex-wrap gap-2" data-testid="setup-done-actions">
      {hasClient && <form action={anotherProjectAction}><input type="hidden" name="keepClient" value="1" /><button type="submit" className={secondary} data-testid="setup-another-project">{t("done.anotherProject")}</button></form>}
      <form action={anotherProjectAction}><input type="hidden" name="keepClient" value="0" /><button type="submit" className={secondary} data-testid="setup-another-client">{t("done.anotherClient")}</button></form>
      <Link href={`/a/${handle}`} className={primary} data-testid="setup-view-portfolio">{t("done.view")}</Link>
      <Link href="/studio" className={secondary} data-testid="setup-to-studio">{t("done.studio")}</Link>
    </div>
  );
}
