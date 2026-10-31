"use client";

import { ArrowDown, ArrowUp, Check, Copy, FileText, ImagePlus, Link2, Star, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { reportClientError } from "@/components/error-reporter";
import { ItemBrowser, ResourceChooser, type ConnectionLite, type ProviderState, type ResourceLite } from "@/components/social/connect";
import { RealExamples } from "@/components/setup/real-examples";
import { AvailabilityToggle } from "@/components/studio/availability-toggle";
import { ReviewInvite } from "@/components/studio/review-invite";
import { Link, useRouter } from "@/i18n/navigation";
import {
  finishSetupAction,
  orderSetupMediaAction,
  pauseWithDraftAction,
  removeSetupMediaAction,
  setVisibilityAction,
  stageBehanceAction,
  stageSocialItemAction,
  startAnotherAction,
  uploadSetupMediaAction,
  type SetupResult,
} from "@/app/[locale]/(main)/portfolio-setup/actions";
import { previewBehanceAction } from "@/app/[locale]/(main)/studio/import/behance-actions";
import type { SetupMediaView, SetupView } from "@/lib/data/portfolio-setup";
import type { PostView } from "@/lib/data/posts";
import type { BehanceDraft } from "@/lib/behance/types";
import { POST_UPLOAD, compressForRequest } from "@/lib/media/image-compress";
import { PROFILE_VISIBILITIES, type ProfileVisibility } from "@/lib/launch-phase";

// First-run setup on one screen (docs/65, replacing the five steps of docs/53): photos first, then a name,
// what the work shows, who it was for, and the publish box, all saved on the server and resumable. Nothing
// becomes public until the owner ticks the rights box and chooses who may see the page; the choice carries
// the same consent version and audit row as Studio → Publication.

type Agency = { name: string; bio: string; handle: string; city: string; avatarUrl: string | null; services: string[]; contentLang: "ar" | "en" };
type Staged = { title: string; thumbnailUrl: string | null; provider: string; permalink: string; ownership: "own" | "client" } | null;
type Option = { key: string; label: string };
type ClientMode = "new" | "existing" | "personal" | "private";

const primary = "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-base font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60 sm:w-auto";
const secondary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border bg-background px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60";
const input = "min-h-11 w-full rounded-lg border bg-background px-3 py-2 text-base";
const chip = (on: boolean) => `inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${on ? "border-primary bg-brand-soft font-semibold" : ""}`;

export function SetupWizard(props: {
  initial: SetupView;
  agency: Agency;
  serviceOptions: { primary: Option[]; other: Option[] };
  clients: { id: string; name: string }[];
  importsOn: boolean;
  providers: ProviderState[];
  connections: ConnectionLite[];
  grant: { id: string; resources: ResourceLite[] } | null;
  socialNotice: string | null;
  invited: boolean;
  stagedItem: Staged;
  examples: PostView[];
  examplesHref: "post" | "examples";
  /** The page's audience today (lib/data/publication.ts); the owner may change it when finishing. */
  visibility: ProfileVisibility;
  /** The public link, for the success screen. */
  siteUrl: string;
  /** "Open to new projects" as saved on the page. */
  acceptingProjects: boolean;
  /** Review invitations are a launch-phase feature; the success screen offers them only when they work. */
  reviewsOn: boolean;
}) {
  const t = useTranslations("Setup");
  const router = useRouter();
  const [view, setView] = useState(props.initial);
  const [visibility, setVisibility] = useState(props.visibility);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  // What the screen holds right now, read only by "Finish later" (a ref: registering it must not re-render).
  const draftOf = useRef<(() => { title: string; contribution: string; services: string[] }) | null>(null);
  const registerDraft = useCallback((fn: (() => { title: string; contribution: string; services: string[] }) | null) => { draftOf.current = fn; }, []);

  const apply = (r: SetupResult) => {
    if (r.error) {
      setError(r.error);
      // Another tab or a retry moved the draft on: show the saved state instead of overwriting it.
      if (r.error === "stale") router.refresh();
      return false;
    }
    setError(null);
    if (r.view) setView(r.view);
    if (r.visibility) setVisibility(r.visibility);
    return true;
  };
  const run = (fn: () => Promise<SetupResult>, after?: (r: SetupResult) => void) =>
    start(async () => {
      const r = await fn();
      if (apply(r)) after?.(r);
    });
  const finishLater = () => run(() => pauseWithDraftAction(view.version, draftOf.current?.() ?? { title: "", contribution: "", services: [] }), () => router.push("/studio"));

  useEffect(() => {
    heading.current?.focus();
  }, [view.status]);

  if (view.status === "finished") {
    return (
      <Live view={view} agency={props.agency} visibility={visibility} siteUrl={props.siteUrl} pending={pending} error={error} acceptingProjects={props.acceptingProjects} reviewsOn={props.reviewsOn}
        onAnother={() => run(() => startAnotherAction())}
        onVisibility={(v, ack) => run(() => setVisibilityAction(v, ack))} />
    );
  }

  return (
    <section className="space-y-6" aria-labelledby="setup-heading" data-testid="setup-wizard" data-step="1">
      <div className="flex items-start justify-between gap-3">
        <header className="space-y-1">
          <h2 id="setup-heading" ref={heading} tabIndex={-1} className="scroll-mt-32 text-2xl font-bold outline-none">{t("work.title")}</h2>
          <p className="text-sm leading-7 text-muted-foreground">{t("work.body")}</p>
        </header>
        <button type="button" onClick={finishLater} className="min-h-11 shrink-0 px-2 text-sm font-semibold text-brand underline underline-offset-4" disabled={pending} data-testid="setup-later">
          {t("finishLater")}
        </button>
      </div>
      {props.invited && <p className="rounded-xl border border-brand-line bg-brand-soft p-3 text-sm">{t("invited")}</p>}
      <WorkScreen {...props} view={view} setView={setView} visibility={visibility} pending={pending} run={run} error={error} setError={setError} registerDraft={registerDraft} />
    </section>
  );
}

type ScreenProps = {
  view: SetupView;
  setView: (v: SetupView) => void;
  visibility: ProfileVisibility;
  pending: boolean;
  run: (fn: () => Promise<SetupResult>, after?: (r: SetupResult) => void) => void;
  error: string | null;
  setError: (e: string | null) => void;
  registerDraft: (fn: (() => { title: string; contribution: string; services: string[] }) | null) => void;
};

function WorkScreen({ view, setView, visibility, pending, run, error, setError, registerDraft, serviceOptions, clients, importsOn, providers, connections, grant, socialNotice, stagedItem, examples, examplesHref }: ScreenProps & {
  serviceOptions: { primary: Option[]; other: Option[] };
  clients: { id: string; name: string }[];
  importsOn: boolean;
  providers: ProviderState[];
  connections: ConnectionLite[];
  grant: { id: string; resources: ResourceLite[] } | null;
  socialNotice: string | null;
  stagedItem: Staged;
  examples: PostView[];
  examplesHref: "post" | "examples";
}) {
  const t = useTranslations("Setup");
  const tp = useTranslations("Registration.publication");
  const ts = useTranslations("Social");
  const p = view.data.project;
  const [title, setTitle] = useState(p?.title ?? "");
  const [contribution, setContribution] = useState(p?.contribution ?? "");
  const [services, setServices] = useState<string[]>(p?.services ?? []);
  const [media, setMedia] = useState<SetupMediaView[]>(view.media);
  const [behanceImages, setBehanceImages] = useState<string[]>(view.data.behance?.images ?? []);
  const suggestion = view.data.behance?.clientSuggestion ?? null;
  const initialMode: ClientMode = view.data.client?.mode ?? (suggestion ? "new" : "new");
  const [clientMode, setClientMode] = useState<ClientMode>(initialMode);
  const [clientName, setClientName] = useState(suggestion ?? "");
  const [clientId, setClientId] = useState(view.data.client?.clientId ?? clients[0]?.id ?? "");
  const [rights, setRights] = useState(false);
  const [chosen, setChosen] = useState<ProfileVisibility>(visibility);
  const [acknowledge, setAcknowledge] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, start] = useTransition();
  const picker = useRef<HTMLInputElement>(null);
  const isBehance = view.data.source === "behance" && Boolean(view.data.behance) && behanceImages.length > 0;
  const hasMedia = isBehance || media.length > 0;
  const primaryOptions = serviceOptions.primary;
  const otherOptions = serviceOptions.other;

  useEffect(() => {
    registerDraft(() => ({ title, contribution, services }));
    return () => registerDraft(null);
  }, [title, contribution, services, registerDraft]);
  // A Behance project or a platform item staged after mount arrives through the view: adopt its images and
  // offer its title and client, never over what the owner already typed.
  const stagedKey = view.data.behance?.projectUrl ?? view.data.socialItemId ?? null;
  useEffect(() => {
    if (!stagedKey) return;
    const b = view.data.behance;
    const projectTitle = view.data.project?.title ?? "";
    const id = setTimeout(() => {
      if (b) setBehanceImages(b.images);
      setTitle((current) => current || projectTitle);
      if (b?.clientSuggestion) setClientName((current) => current || b.clientSuggestion || "");
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagedKey]);
  // Unsaved files: warn before leaving, never say "saved" until the server stored them.
  useEffect(() => {
    if (!uploading) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uploading]);
  // The error sits where the person is looking: scrolled into view when it appears.
  const alertRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) alertRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [error]);

  const mediaResult = (r: SetupResult) => {
    if (r.error) return setError(r.error);
    setError(null);
    if (r.media) {
      setMedia(r.media);
      setView(r.view ?? { ...view, media: r.media });
    }
  };
  const add = (files: FileList | File[] | null, source: "upload" | "pdf" = "upload") => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, 10 - media.length);
    setUploading(true);
    start(async () => {
      const small = await compressForRequest(list, POST_UPLOAD);
      const fd = new FormData();
      small.forEach((f) => fd.append("images", f));
      fd.set("source", source);
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
  const toggle = (key: string) => {
    const next = services.includes(key) ? services.filter((x) => x !== key) : [...services, key].slice(0, 6);
    setServices(next);
    // The first service names the project when the owner has not: "Photography" is a better start than nothing.
    if (!title && next.length === 1) setTitle(primaryOptions.concat(otherOptions).find((o) => o.key === next[0])?.label ?? "");
  };
  const changing = chosen !== visibility;
  const canFinish = hasMedia && title.trim().length >= 2 && services.length > 0 && rights && (!changing || acknowledge);
  const finish = () =>
    run(() => finishSetupAction({
      version: view.version, title, contribution, services,
      behanceImages: isBehance ? behanceImages : undefined,
      client: clientMode === "existing" ? { mode: "existing", clientId } : clientMode === "new" ? { mode: "new", name: clientName } : { mode: clientMode },
      rights, visibility: chosen, acknowledge,
    }));
  const errorText = error ? t(`error.${error}` as never) : null;
  const readyProviders = providers.filter((pr) => pr.readiness.state === "ready");
  const selected = connections.flatMap((c) => c.resources.filter((r) => r.status === "selected"));

  return (
    <div className="space-y-7" data-testid="setup-project">
      {/* 1. The work itself: photos first; a PDF or a Behance link when the work already lives there. */}
      <fieldset className="space-y-3" data-testid="setup-source">
        <legend className="text-base font-semibold">{t("work.media")}</legend>
        {stagedItem && <p className="rounded-xl border p-3 text-sm">{t("project.socialCover", { provider: ts(`provider.${stagedItem.provider}` as never) })}</p>}
        {isBehance ? (
          <ul className="grid grid-cols-3 gap-2" data-testid="setup-media">
            {behanceImages.map((u, i) => (
              <li key={u} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="aspect-square w-full rounded-lg object-cover" referrerPolicy="no-referrer" />
                {i === 0 && <span className="absolute start-1 bottom-1 rounded bg-black/60 px-1.5 text-[10px] text-white" data-testid="setup-cover">{t("project.cover")}</span>}
                {behanceImages.length > 1 && (
                  <button type="button" aria-label={t("project.remove")} className="absolute end-1 top-1 rounded-full bg-black/60 p-1 text-white" onClick={() => setBehanceImages(behanceImages.filter((x) => x !== u))}>
                    <X className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          media.length > 0 && (
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
          )
        )}
        {!isBehance && media.length < 10 && (
          <button type="button" onClick={() => picker.current?.click()} disabled={busy} data-testid="setup-add-images"
            className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center focus-visible:outline-2 focus-visible:outline-primary ${media.length ? "min-h-20" : "min-h-40 border-brand-line bg-brand-soft"}`}>
            <ImagePlus className="size-8 text-brand" aria-hidden />
            <span className="text-base font-semibold">{media.length ? t("project.addImages") : t("work.addPhotos")}</span>
            {!media.length && <span className="text-xs text-muted-foreground">{t("work.addPhotosHint")}</span>}
          </button>
        )}
        <input ref={picker} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif" className="sr-only" data-testid="setup-image-input" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
        <p className="text-xs text-muted-foreground" role="status">{uploading ? t("project.uploading") : t("work.mediaHint")}</p>
        {importsOn && !isBehance && <ImportLinks view={view} run={run} pending={pending || busy} onPictures={(files) => add(files, "pdf")} room={10 - media.length} />}
        {(readyProviders.length > 0 || grant || socialNotice) && (
          <div className="space-y-3">
            {socialNotice && socialNotice !== "choose" && socialNotice !== "limited" && (
              <p role="status" className="rounded-xl border p-3 text-sm" data-testid="social-notice">{ts(`error.${socialNotice}` as never)} {t("source.manualAlternative")}</p>
            )}
            {grant && <ResourceChooser grantId={grant.id} resources={grant.resources} onDone={() => undefined} />}
            {selected.map((r) => (
              <details key={r.id} className="rounded-2xl border p-3">
                <summary className="min-h-11 cursor-pointer py-2 font-semibold">{ts("browse", { name: r.name })}</summary>
                <ItemBrowser resourceId={r.id} onPick={(item) => run(() => stageSocialItemAction(view.version, item.rowId))} />
              </details>
            ))}
            {readyProviders.length > 0 && <Link href="/studio/connections" className="text-sm text-brand underline underline-offset-4">{t("work.connect")}</Link>}
          </div>
        )}
      </fieldset>

      {/* 2. A name and what the work shows. */}
      <label className="block space-y-1">
        <span className="text-base font-semibold">{t("project.label")}</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className={input} dir="auto" placeholder={t("project.labelPlaceholder")} data-testid="setup-project-title" />
      </label>
      <fieldset className="space-y-2">
        <legend className="text-base font-semibold">{t("work.services")}</legend>
        <p className="text-xs text-muted-foreground">{t("work.servicesHint")}</p>
        <div className="flex flex-wrap gap-2">
          {primaryOptions.map((s) => (
            <label key={s.key} className={chip(services.includes(s.key))}>
              <input type="checkbox" className="sr-only" checked={services.includes(s.key)} onChange={() => toggle(s.key)} data-testid={`setup-service-${s.key}`} />
              {s.label}
            </label>
          ))}
        </div>
        <details className="rounded-xl border p-2">
          <summary className="min-h-11 cursor-pointer py-2 text-sm">{t("project.otherServices")}</summary>
          <div className="flex flex-wrap gap-2 pt-2">
            {otherOptions.map((s) => (
              <label key={s.key} className={chip(services.includes(s.key))}>
                <input type="checkbox" className="sr-only" checked={services.includes(s.key)} onChange={() => toggle(s.key)} data-testid={`setup-service-${s.key}`} />
                {s.label}
              </label>
            ))}
          </div>
        </details>
      </fieldset>
      <label className="block space-y-1">
        <span className="text-base font-semibold">{t("work.contribution")}</span>
        <textarea value={contribution} onChange={(e) => setContribution(e.target.value)} maxLength={600} rows={2} className={input} dir="auto" placeholder={t("project.contributionPlaceholder")} data-testid="setup-project-contribution" />
      </label>

      {/* 3. Who it was for: optional; a blank name keeps the client private. */}
      <fieldset className="space-y-2" data-testid="setup-client">
        <legend className="text-base font-semibold">{t("work.clientTitle")}</legend>
        {suggestion && <p className="text-xs text-muted-foreground">{t("client.suggested", { name: suggestion })}</p>}
        {stagedItem?.ownership === "client" && <p className="text-xs text-muted-foreground">{t("client.managedNote")}</p>}
        <div className="flex flex-wrap gap-2">
          {([...(clients.length ? (["existing"] as const) : []), "new", "personal", "private"] as const).map((o) => (
            <label key={o} className={chip(clientMode === o)}>
              <input type="radio" name="clientMode" className="sr-only" value={o} checked={clientMode === o} onChange={() => setClientMode(o)} data-testid={`client-mode-${o}`} />
              {t(`work.clientMode.${o}`)}
            </label>
          ))}
        </div>
        {clientMode === "new" && (
          <>
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} maxLength={80} className={input} dir="auto" placeholder={t("client.name")} aria-label={t("client.name")} data-testid="setup-client-name" />
            <p className="text-xs text-muted-foreground">{t("work.clientHint")}</p>
          </>
        )}
        {clientMode === "existing" && (
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={input} data-testid="setup-client-select" aria-label={t("client.mode.existing")}>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </fieldset>

      <RealExamples examples={examples} openHref={examplesHref} />

      {/* 4. Publish: the rights box, who may see the page, and one button that says what it does. */}
      <section className="space-y-4 rounded-2xl border border-brand-line bg-brand-soft p-4" data-testid="setup-publish-box">
        <h3 className="font-semibold">{t("publishBox.title")}</h3>
        <VisibilityChoice value={chosen} onChange={setChosen} current={visibility} />
        {changing && (
          <label className="flex min-h-11 items-start gap-3 text-sm">
            <input type="checkbox" checked={acknowledge} onChange={(e) => setAcknowledge(e.target.checked)} className="mt-1 size-4 accent-[var(--primary)]" data-testid="setup-acknowledge" />
            <span>{tp("acknowledge")}</span>
          </label>
        )}
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-1 size-4 accent-[var(--primary)]" data-testid="setup-rights" />
          <span>{t("preview.rights")}</span>
        </label>
        {errorText && (
          <p ref={alertRef} role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm" data-testid="setup-error">{errorText}</p>
        )}
        <p className="text-sm" data-testid="setup-visibility" data-visibility={chosen}>{t(`publishBox.result.${chosen}`)}</p>
        <button type="button" className={primary} onClick={finish} disabled={pending || busy || uploading || !canFinish} data-testid="setup-publish" data-ready={canFinish ? "true" : "false"}>
          {pending ? t("saving") : chosen === "private" ? t("publishBox.savePrivate") : t("publishBox.publish")}
        </button>
        {!canFinish && <p className="text-xs text-muted-foreground" data-testid="setup-missing">{!hasMedia ? t("error.noMedia") : title.trim().length < 2 ? t("error.noProject") : !services.length ? t("error.noServices") : !rights ? t("error.rights") : t("error.acknowledge")}</p>}
      </section>
    </div>
  );
}

/** Who may see the page: short labels; the full wording stays on Studio → Publication. */
function VisibilityChoice({ value, onChange, current }: { value: ProfileVisibility; onChange: (v: ProfileVisibility) => void; current: ProfileVisibility }) {
  const t = useTranslations("Setup");
  return (
    <div className="grid gap-2" role="radiogroup" aria-label={t("publishBox.title")}>
      {PROFILE_VISIBILITIES.map((v) => (
        <label key={v} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border bg-background p-3 ${value === v ? "border-primary" : ""}`}>
          <input type="radio" name="visibility" value={v} checked={value === v} onChange={() => onChange(v)} className="mt-1 accent-[var(--primary)]" data-testid={`visibility-${v}`} />
          <span className="space-y-0.5">
            <span className="block text-sm font-semibold">{t(`visibility.${v}.title`)}{current === v ? ` · ${t("visibility.current")}` : ""}</span>
            <span className="block text-xs text-muted-foreground">{t(`visibility.${v}.hint`)}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

/** PDF pages/pictures go into the draft's private images; a Behance project is staged for review. */
function ImportLinks({ view, run, pending, onPictures, room }: { view: SetupView; run: ScreenProps["run"]; pending: boolean; onPictures: (files: File[]) => void; room: number }) {
  const t = useTranslations("Setup");
  const [open, setOpen] = useState<"pdf" | "behance" | null>(null);
  const [url, setUrl] = useState("");
  const [drafts, setDrafts] = useState<BehanceDraft[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [pdfState, setPdfState] = useState<{ pictures: { blob: Blob; preview: string }[]; picked: number[] } | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const pdfInput = useRef<HTMLInputElement>(null);
  const readPdfFile = async (file: File) => {
    setReading(t("import.reading"));
    try {
      const { readPdf } = await import("@/lib/portfolio-import/read-pdf");
      // Only the pictures are used here, so no page text is read on the device.
      const { pages } = await readPdf(file, (p) => setReading(t("import.readingProgress", { done: p.done, total: p.total })), undefined, { ocrPages: 0 });
      const pictures = pages.flatMap((p) => [...p.crops.map((c) => ({ blob: c.full, preview: c.preview })), { blob: p.full, preview: p.preview }]);
      setPdfState({ pictures: pictures.slice(0, 60), picked: [] });
    } catch (e) {
      // Caught here, so the page-wide reporter never sees it: send it on (the error only, never the file).
      reportClientError("js_error", `[setup-pdf] ${e instanceof Error ? e.message : String(e)}`, e instanceof Error ? e.stack : null);
      setError("pdf");
    } finally {
      setReading(null);
    }
  };
  return (
    <div className="space-y-3" data-testid="import-panel">
      <div className="flex flex-wrap gap-2 text-sm">
        <button type="button" className={secondary} onClick={() => { setOpen("pdf"); pdfInput.current?.click(); }} disabled={pending} data-testid="setup-pdf-open">
          <FileText className="size-4" aria-hidden /> {t("work.orPdf")}
        </button>
        <button type="button" className={secondary} onClick={() => setOpen(open === "behance" ? null : "behance")} disabled={pending} data-testid="source-import" aria-expanded={open === "behance"}>
          <Link2 className="size-4" aria-hidden /> {t("work.orBehance")}
        </button>
        <Link href="/studio/import" className="inline-flex min-h-11 items-center text-xs text-muted-foreground underline underline-offset-4">{t("work.bulkImport")}</Link>
      </div>
      {/* A styled button stands in for the native input, whose "No file chosen" is never translated. */}
      <input ref={pdfInput} type="file" accept="application/pdf" className="sr-only" data-testid="setup-pdf" onChange={(e) => {
        const file = e.currentTarget.files?.[0];
        e.currentTarget.value = "";
        if (file) void readPdfFile(file);
      }} />
      {reading && <p role="status" className="text-sm">{reading}</p>}
      {open === "pdf" && pdfState && (
        <div className="space-y-2 rounded-2xl border p-3">
          <p className="text-sm text-muted-foreground">{t("import.pickPictures", { n: room })}</p>
          <ul className="grid grid-cols-3 gap-2">
            {pdfState.pictures.map((pic, i) => {
              const on = pdfState.picked.includes(i);
              return (
                <li key={i}>
                  <button type="button" aria-pressed={on} className={`relative block w-full overflow-hidden rounded-lg border-2 ${on ? "border-primary" : "border-transparent"}`} onClick={() => setPdfState({ ...pdfState, picked: on ? pdfState.picked.filter((x) => x !== i) : pdfState.picked.length < room ? [...pdfState.picked, i] : pdfState.picked })}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pic.preview} alt={t("import.pictureN", { n: i + 1 })} className="aspect-square w-full object-cover" />
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" className={secondary} disabled={!pdfState.picked.length || pending || busy} data-testid="setup-pdf-use"
            onClick={() => {
              const files = pdfState.picked.map((i, n) => new File([pdfState.pictures[i].blob], `pdf-${n}.jpg`, { type: "image/jpeg" }));
              setPdfState(null);
              setOpen(null);
              onPictures(files);
            }}>
            {t("import.useSelected")}
          </button>
        </div>
      )}
      {open === "behance" && (
        <div className="space-y-2 rounded-2xl border p-3">
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
                  }), () => window.scrollTo({ top: 0 }))}>{t("import.useProject")}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{t(`error.${error.startsWith("behance_") ? "behance" : error}` as never)}</p>}
    </div>
  );
}

/** The success screen: the link, WhatsApp, and (for a private page) the publish choice right here. */
function Live({ view, agency, visibility, siteUrl, pending, error, acceptingProjects, reviewsOn, onAnother, onVisibility }: { view: SetupView; agency: Agency; visibility: ProfileVisibility; siteUrl: string; pending: boolean; error: string | null; acceptingProjects: boolean; reviewsOn: boolean; onAnother: () => void; onVisibility: (v: ProfileVisibility, ack: boolean) => void }) {
  const t = useTranslations("Setup");
  const tp = useTranslations("Registration.publication");
  const title = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState(false);
  const [chosen, setChosen] = useState<ProfileVisibility>("public");
  const [acknowledge, setAcknowledge] = useState(false);
  const url = `${siteUrl}/a/${agency.handle}`;
  const open = visibility !== "private";
  // The success message is announced and in view, not below the fold.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    title.current?.focus();
  }, []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <section className="space-y-5 rounded-2xl border border-brand-line bg-brand-soft p-5" data-testid="setup-finished" data-visibility={visibility} role="status">
      <h2 ref={title} tabIndex={-1} className="text-2xl font-bold outline-none">{t(`live.title.${visibility}`)}</h2>
      <p className="text-sm leading-7">{t(`live.body.${visibility}`)}</p>
      {open && (
        <>
          <p className="break-all rounded-xl border bg-background p-3 text-sm font-semibold" dir="ltr" data-testid="setup-page-link">{url}</p>
          <div className="flex flex-wrap gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(t("live.whatsappText", { url }))}`} target="_blank" rel="noopener noreferrer" className={primary} data-testid="setup-share-whatsapp">{t("live.whatsapp")}</a>
            <button type="button" className={secondary} onClick={copy} data-testid="setup-copy-link">{copied ? <><Check className="size-4" /> {t("live.copied")}</> : <><Copy className="size-4" /> {t("live.copy")}</>}</button>
          </div>
          <p className="text-xs text-muted-foreground">{t("live.direct")}</p>
        </>
      )}
      {!open && (
        <div className="space-y-3 rounded-xl border bg-background p-3" data-testid="setup-publish-later">
          <p className="text-sm font-semibold">{t("publishBox.title")}</p>
          <VisibilityChoice value={chosen} onChange={setChosen} current={visibility} />
          <label className="flex min-h-11 items-start gap-3 text-sm">
            <input type="checkbox" checked={acknowledge} onChange={(e) => setAcknowledge(e.target.checked)} className="mt-1 size-4 accent-[var(--primary)]" data-testid="setup-acknowledge" />
            <span>{tp("acknowledge")}</span>
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{t(`error.${error}` as never)}</p>}
          <button type="button" className={primary} disabled={pending || !acknowledge || chosen === visibility} onClick={() => onVisibility(chosen, acknowledge)} data-testid="setup-publish-now">{t("publishBox.publish")}</button>
        </div>
      )}
      {/* Open to new projects: on by default, one tap to pause; off keeps the page listed but out of recommendations. */}
      <AvailabilityToggle initial={acceptingProjects} />
      {/* A past client's review is the strongest proof a new page can carry; the link is private and used once. */}
      {reviewsOn && open && <div data-testid="setup-review-invite"><ReviewInvite agencyName={agency.name} /></div>}
      <div className="flex flex-wrap gap-2">
        <Link href={`/a/${agency.handle}`} className={secondary} data-testid="setup-view-portfolio">{t("live.view")}</Link>
        {view.postId && <Link href={`/p/${view.postId}`} className={secondary}>{t("finished.viewProject")}</Link>}
        <button type="button" className={secondary} onClick={onAnother} disabled={pending} data-testid="setup-another">{t("live.more")}</button>
      </div>
      <div className="space-y-1 text-sm">
        <p className="font-semibold">{t("live.stronger")}</p>
        <ul className="list-disc space-y-1 ps-5 text-muted-foreground">
          <li><Link href="/studio/profile" className="underline underline-offset-4">{t("live.strongerItems.logo")}</Link></li>
          <li><Link href="/studio/profile" className="underline underline-offset-4">{t("live.strongerItems.intro")}</Link></li>
          <li><Link href="/studio/packages" className="underline underline-offset-4">{t("live.strongerItems.price")}</Link></li>
          <li>{t("live.strongerItems.moreWork")}</li>
        </ul>
      </div>
    </section>
  );
}
