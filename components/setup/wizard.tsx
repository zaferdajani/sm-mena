"use client";

import { ArrowDown, ArrowUp, Camera, ImagePlus, Star, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { AgencyAvatar } from "@/components/agency-avatar";
import { ImageCarousel } from "@/components/post/image-carousel";
import { ServicePicker } from "@/components/service-picker";
import { ItemBrowser, ProviderList, ResourceChooser, type ConnectionLite, type ProviderState, type ResourceLite } from "@/components/social/connect";
import { PortfolioExamples } from "@/components/studio/creator-guide";
import { Link, useRouter } from "@/i18n/navigation";
import {
  chooseSourceAction,
  goToStepAction,
  orderSetupMediaAction,
  pauseSetupAction,
  publishSetupAction,
  removeSetupMediaAction,
  saveClientStepAction,
  saveProfileStepAction,
  saveProjectStepAction,
  saveProjectDraftAction,
  stageBehanceAction,
  stageSocialItemAction,
  startAnotherAction,
  uploadSetupMediaAction,
  type SetupResult,
} from "@/app/[locale]/(main)/portfolio-setup/actions";
import { previewBehanceAction } from "@/app/[locale]/(main)/studio/import/behance-actions";
import type { SetupMediaView, SetupView } from "@/lib/data/portfolio-setup";
import type { BehanceDraft } from "@/lib/behance/types";
import { AVATAR_UPLOAD, compressForRequest, POST_UPLOAD } from "@/lib/media/image-compress";

// First-run portfolio setup (docs/53). One task per screen, real input, saved
// on the server at every Continue; Back and Edit never lose work. The page
// reloads the draft from the server on every visit, so reloading, signing out
// or coming back from a platform's consent screen resumes where it stopped.

type Agency = { name: string; bio: string; handle: string; city: string; avatarUrl: string | null; services: string[]; contentLang: "ar" | "en" };
type Staged = { title: string; thumbnailUrl: string | null; provider: string; permalink: string; ownership: "own" | "client" } | null;

const primary = "inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60";
const secondary = "inline-flex min-h-11 items-center justify-center rounded-xl border bg-background px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60";
const input = "min-h-11 w-full rounded-lg border bg-background px-3 py-2 text-base";

export function SetupWizard(props: {
  initial: SetupView;
  agency: Agency;
  serviceOptions: { primary: { key: string; label: string }[]; other: { key: string; label: string }[] };
  popularServices: string[];
  clients: { id: string; name: string }[];
  importsOn: boolean;
  providers: ProviderState[];
  connections: ConnectionLite[];
  grant: { id: string; resources: ResourceLite[] } | null;
  socialNotice: string | null;
  invited: boolean;
  stagedItem: Staged;
}) {
  const t = useTranslations("Setup");
  const router = useRouter();
  const [view, setView] = useState(props.initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const beforeLeave = useRef<((destination: "back" | "pause") => Promise<SetupResult>) | null>(null);

  // Focus follows the step, so screen readers hear the change.
  useEffect(() => heading.current?.focus(), [view.step, view.status]);

  const apply = (r: SetupResult) => {
    if (r.error) {
      setError(r.error);
      // Another tab or a retry moved the draft on: show the saved state instead of overwriting it.
      if (r.error === "stale") router.refresh();
      return false;
    }
    setError(null);
    if (r.view) setView(r.view);
    return true;
  };
  const run = (fn: () => Promise<SetupResult>, after?: (r: SetupResult) => void) =>
    start(async () => {
      const r = await fn();
      if (apply(r)) after?.(r);
    });

  const back = () => run(() => beforeLeave.current ? beforeLeave.current("back") : goToStepAction(view.version, Math.max(1, view.step - 1)));
  const finishLater = () => run(() => beforeLeave.current ? beforeLeave.current("pause") : pauseSetupAction(view.version), () => router.push("/studio"));

  if (view.status === "finished") return <Finished view={view} agency={props.agency} onAnother={() => run(() => startAnotherAction())} pending={pending} />;

  const errorText = error ? t(`error.${error}` as never) : null;
  return (
    <section className="space-y-5" aria-labelledby="setup-heading" data-testid="setup-wizard" data-step={view.step}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="font-medium text-muted-foreground" data-testid="setup-progress">{t("stepOf", { n: view.step, total: 5 })}</p>
        <button type="button" onClick={finishLater} className="min-h-11 px-2 font-semibold text-brand underline underline-offset-4" disabled={pending} data-testid="setup-later">
          {t("finishLater")}
        </button>
      </div>
      {props.invited && view.step === 1 && <p className="rounded-xl border border-brand-line bg-brand-soft p-3 text-sm">{t("invited")}</p>}
      <div aria-live="polite" className="sr-only">{t("stepOf", { n: view.step, total: 5 })}</div>
      {errorText && (
        <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm" data-testid="setup-error">
          {errorText}
        </p>
      )}
      {view.step === 1 && <ProfileStep {...props} view={view} heading={heading} pending={pending} run={run} />}
      {view.step === 2 && <SourceStep {...props} view={view} heading={heading} pending={pending} run={run} back={back} />}
      {view.step === 3 && <ClientStep {...props} view={view} heading={heading} pending={pending} run={run} back={back} />}
      {view.step === 4 && <ProjectStep {...props} view={view} setView={setView} heading={heading} pending={pending} run={run} back={back} setError={setError} beforeLeave={beforeLeave} />}
      {view.step === 5 && <PreviewStep {...props} view={view} heading={heading} pending={pending} run={run} back={back} />}
    </section>
  );
}

type StepProps = {
  view: SetupView;
  heading: React.RefObject<HTMLHeadingElement | null>;
  pending: boolean;
  run: (fn: () => Promise<SetupResult>, after?: (r: SetupResult) => void) => void;
  back?: () => void;
};

function Heading({ heading, title, body }: { heading: StepProps["heading"]; title: string; body?: string }) {
  return (
    <header className="space-y-1">
      <h2 id="setup-heading" ref={heading} tabIndex={-1} className="text-xl font-bold outline-none">{title}</h2>
      {body && <p className="text-sm leading-7 text-muted-foreground">{body}</p>}
    </header>
  );
}

function Nav({ back, pending, disabled = false, next, nextLabel, testId }: { back?: () => void; pending: boolean; disabled?: boolean; next?: () => void; nextLabel: string; testId: string }) {
  const t = useTranslations("Setup");
  return (
    <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-10 flex flex-wrap items-center justify-between gap-2 border-t bg-background/95 py-3 md:bottom-0">
      {back ? <button type="button" className={secondary} onClick={back} disabled={pending} data-testid="setup-back">{t("back")}</button> : <span />}
      {next ? (
        <button type="button" className={primary} onClick={next} disabled={pending || disabled} data-testid={testId}>{pending ? t("saving") : nextLabel}</button>
      ) : (
        <button type="submit" className={primary} disabled={pending} data-testid={testId}>{pending ? t("saving") : nextLabel}</button>
      )}
    </div>
  );
}

// 1 — Your profile: picture, name, short introduction and services (prefilled; only changes are saved).
function ProfileStep({ view, agency, popularServices, heading, pending, run }: StepProps & { agency: Agency; popularServices: string[] }) {
  const t = useTranslations("Setup");
  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const file = useRef<File | null>(null);
  return (
    <form
      className="space-y-5"
      data-testid="setup-profile"
      action={async (fd) => {
        fd.set("version", String(view.version));
        if (file.current) fd.set("avatar", file.current);
        else fd.delete("avatar");
        run(() => saveProfileStepAction(fd));
      }}
    >
      <Heading heading={heading} title={t("profile.title")} body={t("profile.body")} />
      <div className="flex items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="size-20 rounded-full object-cover" />
        ) : (
          <AgencyAvatar name={agency.name} src={agency.avatarUrl} size={80} />
        )}
        <label className={`${secondary} cursor-pointer gap-2`}>
          <Camera className="size-4" />
          {agency.avatarUrl || preview ? t("profile.changePhoto") : t("profile.addPhoto")}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            data-testid="setup-avatar"
            onChange={async (e) => {
              const f = e.currentTarget.files?.[0];
              if (!f) return;
              setPreview(URL.createObjectURL(f));
              setCompressing(true);
              const [small] = await compressForRequest([f], AVATAR_UPLOAD);
              file.current = small;
              setCompressing(false);
            }}
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">{t("profile.photoHint")}</p>
      <label className="block space-y-1">
        <span className="text-sm font-medium">{t("profile.name")}</span>
        <input name="name" defaultValue={agency.name} required minLength={2} maxLength={80} className={input} dir="auto" data-testid="setup-name" />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">{t("profile.bio")}</span>
        <textarea name="bio" defaultValue={agency.bio} maxLength={500} rows={3} className={input} dir="auto" placeholder={t("profile.bioPlaceholder")} data-testid="setup-bio" />
        <span className="block text-xs text-muted-foreground">{t("profile.langNote")}</span>
      </label>
      <div className="space-y-1">
        <span className="text-sm font-medium">{t("profile.services")}</span>
        <ServicePicker defaultKeys={agency.services} popular={popularServices} />
      </div>
      <Nav pending={pending || compressing} nextLabel={t("saveContinue")} testId="setup-profile-save" />
      <button type="button" className="min-h-11 text-sm text-muted-foreground underline underline-offset-4" onClick={() => run(() => goToStepAction(view.version, 2))} disabled={pending} data-testid="setup-profile-skip">
        {t("later")}
      </button>
    </form>
  );
}

// 2 — Where is your work? Upload, an existing portfolio (PDF/Behance) or a connected platform.
function SourceStep({ view, importsOn, providers, connections, clients, grant, socialNotice, stagedItem, heading, pending, run, back }: StepProps & {
  importsOn: boolean;
  providers: ProviderState[];
  connections: ConnectionLite[];
  clients: { id: string; name: string }[];
  grant: { id: string; resources: ResourceLite[] } | null;
  socialNotice: string | null;
  stagedItem: Staged;
}) {
  const t = useTranslations("Setup");
  const ts = useTranslations("Social");
  const [open, setOpen] = useState<"upload" | "import" | "social" | null>(view.data.source === "social" || grant || socialNotice ? "social" : view.data.source === "behance" || view.data.source === "pdf" ? "import" : null);
  const [chosen, setChosen] = useState<string[]>([]);
  const selected = connections.flatMap((c) => c.resources.filter((r) => r.status === "selected"));
  const browseable = chosen.length ? selected.filter((r) => chosen.includes(r.id)).concat(grant?.resources.filter((r) => chosen.includes(r.id)) ?? []) : selected;
  const upload = () => run(() => chooseSourceAction(view.version, "upload"));
  return (
    <div className="space-y-4" data-testid="setup-source">
      <Heading heading={heading} title={t("source.title")} />
      <div className="grid gap-3">
        <SourceCard active={open === "upload"} title={t("source.upload")} body={t("source.uploadBody")} onClick={upload} testId="source-upload" disabled={pending} />
        <SourceCard active={open === "import"} title={t("source.import")} body={importsOn ? t("source.importBody") : t("source.importOff")} onClick={() => importsOn && setOpen("import")} testId="source-import" disabled={!importsOn || pending} />
        {open === "import" && importsOn && <ImportPanel view={view} run={run} pending={pending} />}
        <SourceCard active={open === "social"} title={t("source.social")} body={t("source.socialBody")} onClick={() => setOpen("social")} testId="source-social" disabled={pending} />
        {open === "social" && (
          <div className="space-y-3">
            {socialNotice && socialNotice !== "choose" && socialNotice !== "limited" && (
              <p role="status" className="rounded-xl border p-3 text-sm" data-testid="social-notice">{ts(`error.${socialNotice}` as never)} {t("source.manualAlternative")}</p>
            )}
            {socialNotice === "limited" && <p role="status" className="rounded-xl border p-3 text-sm">{ts("limitedNote")}</p>}
            {grant && !chosen.length && <ResourceChooser grantId={grant.id} resources={grant.resources} onDone={(ids) => setChosen(ids)} />}
            {stagedItem && (
              <p className="rounded-xl border border-brand-line bg-brand-soft p-3 text-sm" data-testid="staged-item">{t("source.staged", { title: stagedItem.title || ts("untitled") })}</p>
            )}
            {browseable.map((r) => (
              <details key={r.id} className="rounded-2xl border p-3" open={browseable.length === 1}>
                <summary className="min-h-11 cursor-pointer py-2 font-semibold">{ts("browse", { name: r.name })}</summary>
                <ItemBrowser resourceId={r.id} onPick={(item) => run(() => stageSocialItemAction(view.version, item.rowId))} />
              </details>
            ))}
            <ProviderList providers={providers} connections={connections} clients={clients} returnTo="setup" />
          </div>
        )}
      </div>
      <Nav back={back} pending={pending} next={upload} nextLabel={t("source.uploadInstead")} testId="setup-source-next" />
    </div>
  );
}

function SourceCard({ active, title, body, onClick, testId, disabled }: { active: boolean; title: string; body: string; onClick: () => void; testId: string; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={active} data-testid={testId} className={`min-h-11 rounded-2xl border p-4 text-start focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60 ${active ? "border-primary bg-brand-soft" : "bg-card"}`}>
      <span className="block font-semibold">{title}</span>
      <span className="block text-sm leading-7 text-muted-foreground">{body}</span>
    </button>
  );
}

/** PDF pages/pictures go into the draft's private images; a Behance project is staged for review. */
function ImportPanel({ view, run, pending }: { view: SetupView; run: StepProps["run"]; pending: boolean }) {
  const t = useTranslations("Setup");
  const [url, setUrl] = useState("");
  const [drafts, setDrafts] = useState<BehanceDraft[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [pdfState, setPdfState] = useState<{ pictures: { blob: Blob; preview: string }[]; picked: number[] } | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const readPdfFile = async (file: File) => {
    setReading(t("import.reading"));
    try {
      const { readPdf } = await import("@/lib/portfolio-import/read-pdf");
      const { pages } = await readPdf(file, (p) => setReading(t("import.readingProgress", { done: p.done, total: p.total })));
      const pictures = pages.flatMap((p) => [...p.crops.map((c) => ({ blob: c.full, preview: c.preview })), { blob: p.full, preview: p.preview }]);
      setPdfState({ pictures: pictures.slice(0, 60), picked: [] });
    } catch {
      setError("pdf");
    } finally {
      setReading(null);
    }
  };
  const room = 10 - view.media.length;
  return (
    <div className="space-y-4 rounded-2xl border p-4" data-testid="import-panel">
      <div className="space-y-2">
        <h3 className="font-semibold">{t("import.pdf")}</h3>
        <input type="file" accept="application/pdf" className="block w-full text-sm" onChange={(e) => e.currentTarget.files?.[0] && readPdfFile(e.currentTarget.files[0])} data-testid="setup-pdf" />
        {reading && <p role="status" className="text-sm">{reading}</p>}
        {pdfState && (
          <>
            <p className="text-sm text-muted-foreground">{t("import.pickPictures", { n: room })}</p>
            <ul className="grid grid-cols-3 gap-2">
              {pdfState.pictures.map((p, i) => {
                const on = pdfState.picked.includes(i);
                return (
                  <li key={i}>
                    <button type="button" aria-pressed={on} className={`relative block w-full overflow-hidden rounded-lg border-2 ${on ? "border-primary" : "border-transparent"}`} onClick={() => setPdfState({ ...pdfState, picked: on ? pdfState.picked.filter((x) => x !== i) : pdfState.picked.length < room ? [...pdfState.picked, i] : pdfState.picked })}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.preview} alt={t("import.pictureN", { n: i + 1 })} className="aspect-square w-full object-cover" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              className={primary}
              disabled={!pdfState.picked.length || pending || busy}
              onClick={() =>
                start(async () => {
                  const files = pdfState.picked.map((i, n) => new File([pdfState.pictures[i].blob], `pdf-${n}.jpg`, { type: "image/jpeg" }));
                  const small = await compressForRequest(files, POST_UPLOAD);
                  const fd = new FormData();
                  small.forEach((f) => fd.append("images", f));
                  fd.set("source", "pdf");
                  const r = await uploadSetupMediaAction(fd);
                  if (r.error) return setError(r.error);
                  run(() => chooseSourceAction(r.view?.version ?? view.version, "pdf"));
                })
              }
              data-testid="setup-pdf-use"
            >
              {t("import.useSelected")}
            </button>
          </>
        )}
      </div>
      <div className="space-y-2 border-t pt-4">
        <h3 className="font-semibold">{t("import.behance")}</h3>
        <div className="flex gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="behance.net/…" dir="ltr" className={input} inputMode="url" data-testid="setup-behance-url" />
          <button type="button" className={secondary} disabled={!url || busy} data-testid="setup-behance-read" onClick={() => start(async () => {
            const r = await previewBehanceAction(url);
            if (r.error) return setError(`behance_${r.error}`);
            setError(null);
            setDrafts(r.portfolio?.drafts ?? []);
          })}>{t("import.read")}</button>
        </div>
        {drafts && (
          <ul className="grid gap-2">
            {drafts.filter((d) => d.project.images.length).map((d) => (
              <li key={d.project.id} className="flex items-center gap-3 rounded-xl border p-2" data-testid="setup-behance-project">
                {d.project.cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.project.cover} alt="" className="size-14 rounded-lg object-cover" referrerPolicy="no-referrer" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm">{d.project.title}</span>
                <button type="button" className={secondary} disabled={pending} onClick={() => run(() => stageBehanceAction(view.version, {
                  projectUrl: d.project.url,
                  images: d.project.images.slice(0, 10).map((i) => i.url),
                  title: d.project.title,
                  caption: d.caption,
                  client: d.client,
                  publishedAt: d.project.publishedAt ? new Date(d.project.publishedAt).toISOString() : null,
                }))}>{t("import.useProject")}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{t(`error.${error.startsWith("behance_") ? "behance" : error}` as never)}</p>}
    </div>
  );
}

// 3 — Who did you make this for? An owned client, a new one, personal work, or a private client.
function ClientStep({ view, clients, stagedItem, heading, pending, run, back }: StepProps & { clients: { id: string; name: string }[]; stagedItem: Staged }) {
  const t = useTranslations("Setup");
  const initialMode = view.data.client?.mode ?? (clients.length ? "existing" : "new");
  const [mode, setMode] = useState<"existing" | "new" | "personal" | "private">(initialMode);
  const [clientId, setClientId] = useState(view.data.client?.clientId ?? clients[0]?.id ?? "");
  const suggestion = view.data.behance?.clientSuggestion ?? null;
  const [name, setName] = useState(suggestion ?? "");
  const submit = () => run(() => saveClientStepAction({ version: view.version, mode, clientId: mode === "existing" ? clientId : undefined, name: mode === "new" ? name : undefined }));
  const options = [...(clients.length ? (["existing"] as const) : []), "new", "personal", "private"] as const;
  return (
    <div className="space-y-4" data-testid="setup-client">
      <Heading heading={heading} title={t("client.title")} body={t("client.example")} />
      {suggestion && <p className="rounded-xl border p-3 text-sm">{t("client.suggested", { name: suggestion })}</p>}
      {stagedItem?.ownership === "client" && <p className="rounded-xl border p-3 text-sm">{t("client.managedNote")}</p>}
      <fieldset className="space-y-2">
        <legend className="sr-only">{t("client.title")}</legend>
        {options.map((o) => (
          <label key={o} className={`flex min-h-11 items-start gap-3 rounded-xl border p-3 ${mode === o ? "border-primary" : ""}`}>
            <input type="radio" name="clientMode" value={o} checked={mode === o} onChange={() => setMode(o)} className="mt-1" data-testid={`client-mode-${o}`} />
            <span className="space-y-1">
              <span className="block text-sm font-semibold">{t(`client.mode.${o}`)}</span>
              <span className="block text-xs text-muted-foreground">{t(`client.modeHint.${o}`)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {mode === "existing" && (
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={input} data-testid="setup-client-select" aria-label={t("client.mode.existing")}>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}
      {mode === "new" && (
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t("client.name")}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={input} dir="auto" data-testid="setup-client-name" />
          <span className="block text-xs text-muted-foreground">{t("client.publicNote")}</span>
        </label>
      )}
      <Nav back={back} pending={pending} next={submit} nextLabel={t("continue")} testId="setup-client-next" />
    </div>
  );
}

// 4 — One project: label, the creator's own part, services and the images (first = cover).
function ProjectStep({ view, setView, serviceOptions, stagedItem, heading, pending, run, back, setError, beforeLeave }: StepProps & {
  setView: (v: SetupView) => void;
  serviceOptions: { primary: { key: string; label: string }[]; other: { key: string; label: string }[] };
  stagedItem: Staged;
  setError: (e: string | null) => void;
  beforeLeave: React.RefObject<((destination: "back" | "pause") => Promise<SetupResult>) | null>;
}) {
  const t = useTranslations("Setup");
  const ts = useTranslations("Social");
  const p = view.data.project;
  const [title, setTitle] = useState(p?.title ?? "");
  const [contribution, setContribution] = useState(p?.contribution ?? "");
  const [services, setServices] = useState<string[]>(p?.services?.length ? p.services : serviceOptions.primary.slice(0, 1).map((s) => s.key));
  const [media, setMedia] = useState<SetupMediaView[]>(view.media);
  const [behanceImages, setBehanceImages] = useState<string[]>(view.data.behance?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [busy, start] = useTransition();
  const picker = useRef<HTMLInputElement>(null);
  const isBehance = view.data.source === "behance" && Boolean(view.data.behance);
  useEffect(() => {
    const save = async (destination: "back" | "pause"): Promise<SetupResult> => {
      if (uploading || busy) return { error: "generic" };
      return saveProjectDraftAction(view.version, { title, contribution, services, ...(isBehance ? { behanceImages } : {}) }, destination);
    };
    beforeLeave.current = save;
    return () => { if (beforeLeave.current === save) beforeLeave.current = null; };
  }, [view.version, title, contribution, services, behanceImages, isBehance, uploading, busy, beforeLeave]);
  // Unsaved files: warn before leaving, never say "saved" until the server stored them.
  useEffect(() => {
    if (!uploading) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uploading]);
  const mediaResult = (r: SetupResult) => {
    if (r.error) return setError(r.error);
    setError(null);
    if (r.media) {
      setMedia(r.media);
      setView(r.view ?? { ...view, media: r.media });
    }
  };
  const add = (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, 10 - media.length);
    setUploading(true);
    start(async () => {
      const small = await compressForRequest(list, POST_UPLOAD);
      const fd = new FormData();
      small.forEach((f) => fd.append("images", f));
      mediaResult(await uploadSetupMediaAction(fd));
      setUploading(false);
    });
  };
  const move = (i: number, d: number) => {
    const ids = media.map((m) => m.id);
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    start(async () => mediaResult(await orderSetupMediaAction(ids)));
  };
  const cover = (i: number) => {
    const ids = media.map((m) => m.id);
    const [c] = ids.splice(i, 1);
    start(async () => mediaResult(await orderSetupMediaAction([c, ...ids])));
  };
  return (
    <div className="space-y-5" data-testid="setup-project">
      <Heading heading={heading} title={t("project.title")} />
      <label className="block space-y-1">
        <span className="text-sm font-medium">{t("project.label")}</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className={input} dir="auto" placeholder={t("project.labelPlaceholder")} data-testid="setup-project-title" />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">{t("project.contribution")}</span>
        <textarea value={contribution} onChange={(e) => setContribution(e.target.value)} maxLength={600} rows={3} className={input} dir="auto" placeholder={t("project.contributionPlaceholder")} data-testid="setup-project-contribution" />
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("project.services")}</legend>
        {/* The provider's own services first; every other service one tap away. */}
        <ServiceChips options={serviceOptions.primary} services={services} setServices={setServices} />
        <details open={!serviceOptions.primary.length} className="rounded-xl border p-2">
          <summary className="min-h-11 cursor-pointer py-2 text-sm">{t("project.otherServices")}</summary>
          <ServiceChips options={serviceOptions.other} services={services} setServices={setServices} />
        </details>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("project.media")}</legend>
        {stagedItem && <p className="text-xs text-muted-foreground">{t("project.socialCover", { provider: ts(`provider.${stagedItem.provider}` as never) })}</p>}
        {isBehance ? (
          <ul className="grid grid-cols-3 gap-2">
            {behanceImages.map((u, i) => (
              <li key={u} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="aspect-square w-full rounded-lg object-cover" referrerPolicy="no-referrer" />
                {i === 0 && <span className="absolute start-1 bottom-1 rounded bg-black/60 px-1.5 text-[10px] text-white">{t("project.cover")}</span>}
                {behanceImages.length > 1 && (
                  <button type="button" aria-label={t("project.remove")} className="absolute end-1 top-1 rounded-full bg-black/60 p-1 text-white" onClick={() => setBehanceImages(behanceImages.filter((x) => x !== u))}>
                    <X className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="setup-media">
              {media.map((m, i) => (
                <li key={m.id} className="space-y-1 rounded-lg border p-1">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url} alt={t("project.imageN", { n: i + 1 })} className="aspect-square w-full rounded-md object-cover" />
                    {i === 0 && <span className="absolute start-1 bottom-1 rounded bg-black/60 px-1.5 text-[10px] text-white" data-testid="setup-cover">{t("project.cover")}</span>}
                  </div>
                  <div className="flex justify-between">
                    <button type="button" className="inline-flex size-11 items-center justify-center" aria-label={t("project.moveEarlier")} onClick={() => move(i, -1)} disabled={busy || i === 0}><ArrowUp className="size-4" /></button>
                    <button type="button" className="inline-flex size-11 items-center justify-center" aria-label={t("project.makeCover")} onClick={() => cover(i)} disabled={busy || i === 0} data-testid={`setup-make-cover-${i}`}><Star className="size-4" /></button>
                    <button type="button" className="inline-flex size-11 items-center justify-center" aria-label={t("project.moveLater")} onClick={() => move(i, 1)} disabled={busy || i === media.length - 1}><ArrowDown className="size-4" /></button>
                    <button type="button" className="inline-flex size-11 items-center justify-center" aria-label={t("project.remove")} onClick={() => start(async () => mediaResult(await removeSetupMediaAction(m.id)))} disabled={busy}><X className="size-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
            {media.length < 10 && (
              <button type="button" className={`${secondary} gap-2`} onClick={() => picker.current?.click()} disabled={busy} data-testid="setup-add-images">
                <ImagePlus className="size-4" />
                {t("project.addImages")}
              </button>
            )}
            <input ref={picker} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif" className="sr-only" data-testid="setup-image-input" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
            <p className="text-xs text-muted-foreground" role="status">{uploading ? t("project.uploading") : t("project.mediaHint")}</p>
          </>
        )}
      </fieldset>
      <PortfolioExamples />
      <Nav
        back={back}
        pending={pending || busy || uploading}
        next={() => run(() => saveProjectStepAction({ version: view.version, title, contribution, services, behanceImages: isBehance ? behanceImages : undefined }))}
        nextLabel={t("project.preview")}
        testId="setup-project-next"
      />
    </div>
  );
}

function ServiceChips({ options, services, setServices }: { options: { key: string; label: string }[]; services: string[]; setServices: (s: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((s) => {
        const on = services.includes(s.key);
        return (
          <label key={s.key} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${on ? "border-primary bg-brand-soft" : ""}`}>
            <input type="checkbox" className="sr-only" checked={on} onChange={() => setServices(on ? services.filter((x) => x !== s.key) : [...services, s.key].slice(0, 6))} data-testid={`setup-service-${s.key}`} />
            {s.label}
          </label>
        );
      })}
    </div>
  );
}

// 5 — Preview with the portfolio's own components, then an explicit publish.
function PreviewStep({ view, agency, clients, stagedItem, heading, pending, run, back }: StepProps & { agency: Agency; clients: { id: string; name: string }[]; stagedItem: Staged }) {
  const t = useTranslations("Setup");
  const ts = useTranslations("Social");
  const [rights, setRights] = useState(false);
  const p = view.data.project;
  const client = view.data.client?.mode === "existing" ? clients.find((c) => c.id === view.data.client?.clientId)?.name : null;
  const images =
    view.data.source === "behance" && view.data.behance
      ? view.data.behance.images.map((u) => ({ url: u, thumbUrl: u, width: 4, height: 3, color: "#e5e5e5", alt: "" }))
      : view.media.map((m) => ({ url: m.url, thumbUrl: m.url, width: m.width, height: m.height, color: "#e5e5e5", alt: "" }));
  const edit = (step: number) => run(() => goToStepAction(view.version, step));
  return (
    <div className="space-y-5" data-testid="setup-preview">
      <Heading heading={heading} title={t("preview.title")} />
      <article className="overflow-hidden rounded-xl border bg-card" inert data-testid="setup-preview-card">
        <header className="flex items-center gap-3 px-3 py-2.5">
          <AgencyAvatar name={agency.name} src={agency.avatarUrl} size={36} ring />
          <p className="truncate text-sm font-semibold">{agency.name}</p>
        </header>
        <ImageCarousel images={images} alt={p?.title ?? ""} />
        <div className="space-y-1 px-3 py-3 text-sm">
          {client && <p className="font-medium text-brand">{t("preview.forClient", { name: client })}</p>}
          {view.data.client?.mode === "personal" && <p className="text-xs text-muted-foreground">{t("client.personalLabel")}</p>}
          <p className="font-semibold" dir="auto">{p?.title}</p>
          <p className="whitespace-pre-line leading-7" dir="auto">{p?.contribution}</p>
          {stagedItem && <p className="text-xs text-muted-foreground">{t("preview.withPlayer", { provider: ts(`provider.${stagedItem.provider}` as never) })}</p>}
        </div>
      </article>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={secondary} onClick={() => edit(1)} disabled={pending}>{t("preview.editProfile")}</button>
        <button type="button" className={secondary} onClick={() => edit(3)} disabled={pending}>{t("preview.editClient")}</button>
        <button type="button" className={secondary} onClick={() => edit(4)} disabled={pending} data-testid="setup-edit-project">{t("preview.editProject")}</button>
      </div>
      <p className="rounded-xl border p-3 text-sm leading-7" data-testid="setup-visibility">{t("preview.visibility")}</p>
      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-1" data-testid="setup-rights" />
        <span>{t("preview.rights")}</span>
      </label>
      <Nav back={back} pending={pending} disabled={!rights} next={() => run(() => publishSetupAction(view.version, rights))} nextLabel={t("preview.publish")} testId="setup-publish" />
    </div>
  );
}

function Finished({ view, agency, onAnother, pending }: { view: SetupView; agency: Agency; onAnother: () => void; pending: boolean }) {
  const t = useTranslations("Setup");
  const title = useRef<HTMLHeadingElement>(null);
  // The success message is announced and in view, not below the fold.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    title.current?.focus();
  }, []);
  return (
    <section className="space-y-4 rounded-2xl border border-brand-line bg-brand-soft p-5" data-testid="setup-finished" role="status">
      <h2 ref={title} tabIndex={-1} className="text-xl font-bold outline-none">{t("finished.title")}</h2>
      <p className="text-sm leading-7">{t("finished.body")}</p>
      <div className="flex flex-wrap gap-2">
        {view.postId && <Link href={`/p/${view.postId}`} className={secondary}>{t("finished.viewProject")}</Link>}
        <Link href={`/a/${agency.handle}`} className={secondary} data-testid="setup-view-portfolio">{t("finished.viewPortfolio")}</Link>
        <button type="button" className={primary} onClick={onAnother} disabled={pending} data-testid="setup-another">{t("finished.another")}</button>
        <Link href="/studio/clients" className={secondary}>{t("finished.anotherClient")}</Link>
      </div>
    </section>
  );
}
