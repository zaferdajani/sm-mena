"use client";

import { Check, FileUp, Loader2, Merge, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { analyzePortfolioAction, applyProfileImportAction, importPostAction } from "@/app/[locale]/(main)/studio/import-actions";
import { FormError } from "@/components/form-error";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { compressForRequest, POST_UPLOAD, REQUEST_LIMIT } from "@/lib/media/image-compress";
import { readPdf, type ReadPage, type ReadProgress } from "@/lib/portfolio-import/read-pdf";
import { IMPORT_LIMITS, type DraftPost, type ImageRef, type ImportPlan } from "@/lib/portfolio-import/types";
import { cn } from "@/lib/utils";
import { PicturePicker, picturesOf } from "./picture-picker";

type Option = { key: string; label: string };
type Draft = DraftPost & { id: number; include: boolean; error?: string; postId?: string };
type Profile = {
  about: string;
  useAbout: boolean;
  strengths: { text: string; on: boolean }[];
  services: { key: string; on: boolean }[];
  clients: { name: string; industry: string | null; logo?: ImageRef; on: boolean }[];
  avatar: ImageRef | null;
  useAvatar: boolean;
};
type Phase = "pick" | "reading" | "ocr" | "thinking" | "review" | "publishing" | "done";
type Summary = { posts: number; clients: number; services: number; avatar: boolean; failed: number };

const MAX_MB = 40;
const sameRef = (a: ImageRef, b: ImageRef) => a.page === b.page && a.crop === b.crop;

/**
 * Studio → Import a PDF portfolio (docs/36-portfolio-import.md), the Aida
 * way: read on the device (text, layout, OCR), proposed by Sawwiq (AI when
 * configured), reviewed by the agency, published only on its say-so.
 */
export function PortfolioImport({ services, platforms, industries, clients, agencyServices, aiAvailable }: { services: Option[]; platforms: Option[]; industries: Option[]; clients: Option[]; agencyServices: string[]; aiAvailable: boolean }) {
  const t = useTranslations("PortfolioImport");
  const ts = useTranslations("Studio.form");
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [pages, setPages] = useState<ReadPage[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [mode, setMode] = useState<ImportPlan["mode"]>("basic");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [profile, setProfile] = useState<Profile>({ about: "", useAbout: false, strengths: [], services: [], clients: [], avatar: null, useAvatar: false });
  const [summary, setSummary] = useState<Summary | null>(null);

  const label = (list: Option[], key: string) => list.find((o) => o.key === key)?.label ?? key;
  const page = (i: number) => pages.find((p) => p.index === i);
  const blobOf = (r: ImageRef) => (r.crop === null ? page(r.page)?.full : page(r.page)?.crops[r.crop]?.full);
  const previewOf = (r: ImageRef) => (r.crop === null ? page(r.page)?.preview : page(r.page)?.crops[r.crop]?.preview);
  const usedPages = new Set(drafts.flatMap((d) => d.images.map((i) => i.page)));
  const unused = pages.filter((p) => !usedPages.has(p.index));
  const setDraft = (id: number, patch: Partial<Draft>) => setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const setClient = (i: number, patch: Partial<Profile["clients"][number]>) => setProfile((p) => ({ ...p, clients: p.clients.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));
  const pictures = picturesOf(pages);
  const usedRefs = new Set(drafts.flatMap((d) => d.images.map((r) => `${r.page}:${r.crop ?? "p"}`)));
  // Client names to group posts under: the agency's existing clients plus the ones this import found.
  const clientNames = [...new Set([...clients.map((c) => c.label), ...profile.clients.map((c) => c.name.trim()).filter((n) => n.length >= 2)])];

  /** From the picker: the selected pictures become a new post, or join an existing draft. */
  function postFromPictures(refs: ImageRef[], draftId: number | null) {
    if (draftId !== null) {
      const d = drafts.find((x) => x.id === draftId);
      if (d) setDraft(draftId, { images: [...d.images, ...refs.filter((r) => !d.images.some((x) => sameRef(x, r)))].slice(0, IMPORT_LIMITS.imagesPerPost) });
      return;
    }
    const first = page(refs[0]?.page ?? -1);
    setDrafts((ds) => [...ds, { id: Math.max(-1, ...ds.map((d) => d.id)) + 1, pages: [...new Set(refs.map((r) => r.page))], images: refs.slice(0, IMPORT_LIMITS.imagesPerPost), title: "", caption: first?.text.slice(0, 300) ?? "", services: agencyServices.slice(0, 1), platforms: [], industry: null, client: null, result: null, include: true }]);
  }
  function clientLogosFromPictures(refs: ImageRef[]) {
    setProfile((p) => ({ ...p, clients: [...p.clients, ...refs.map((logo) => ({ name: page(logo.page)?.crops[logo.crop ?? -1]?.text ?? "", industry: null, logo, on: false }))] }));
  }

  async function choose(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return setError("notPdf");
    if (file.size > MAX_MB * 1024 * 1024) return setError("tooBig");
    setPhase("reading");
    try {
      const read = await readPdf(file, (p: ReadProgress) => {
        setPhase(p.step === "ocr" ? "ocr" : "reading");
        setProgress({ done: p.done, total: p.total });
      });
      setPages(read.pages);
      setTruncated(read.totalPages > read.pages.length);
      setPhase("thinking");
      const res = await analyzePortfolioAction(read.pages.map((p) => ({ index: p.index, text: p.text, image: p.thumb, layout: p.layout, crops: p.crops.length, cropTexts: p.crops.map((c) => c.text) })));
      if (!res.plan) {
        setPhase("pick");
        return setError(res.error ?? "generic");
      }
      const plan = res.plan;
      setMode(plan.mode);
      setDrafts(plan.drafts.map((d, id) => ({ ...d, id, include: true, services: d.services.length ? d.services : agencyServices.slice(0, 1) })));
      setProfile({
        about: plan.profile.about ?? "",
        useAbout: Boolean(plan.profile.about),
        strengths: plan.profile.strengths.map((text) => ({ text, on: true })),
        services: plan.profile.services.map((key) => ({ key, on: true })),
        // A logo whose name couldn't be read waits for the agency to type it.
        clients: plan.profile.clients.map((c) => ({ ...c, on: c.name.length >= 2 })),
        avatar: plan.profile.avatar,
        useAvatar: Boolean(plan.profile.avatar),
      });
      setPhase("review");
    } catch (e) {
      console.error("[portfolio-import]", e);
      setPhase("pick");
      setError("unreadable");
    }
  }

  function addDraft(fromPage: number) {
    const p = page(fromPage);
    const images: ImageRef[] = p?.layout === "gallery" && p.crops.length ? p.crops.map((_, crop) => ({ page: fromPage, crop })) : [{ page: fromPage, crop: null }];
    setDrafts((ds) => [...ds, { id: Math.max(-1, ...ds.map((d) => d.id)) + 1, pages: [fromPage], images: images.slice(0, IMPORT_LIMITS.imagesPerPost), title: "", caption: p?.text.slice(0, 600) ?? "", services: agencyServices.slice(0, 1), platforms: [], industry: null, client: null, result: null, include: true }]);
  }

  function mergeWithPrevious(id: number) {
    setDrafts((ds) => {
      const i = ds.findIndex((d) => d.id === id);
      if (i < 1) return ds;
      const prev = ds[i - 1];
      const cur = ds[i];
      const merged = { ...prev, pages: [...prev.pages, ...cur.pages], images: [...prev.images, ...cur.images].slice(0, IMPORT_LIMITS.imagesPerPost), services: [...new Set([...prev.services, ...cur.services])], caption: prev.caption || cur.caption };
      return [...ds.slice(0, i - 1), merged, ...ds.slice(i + 1)];
    });
  }

  async function publish() {
    const chosen = drafts.filter((d) => d.include && !d.postId && d.images.length);
    for (const d of chosen) if (!d.services.length) return setError("noServices");
    setError(null);
    setPhase("publishing");
    setProgress({ done: 0, total: chosen.length });
    let posts = 0;
    let failed = 0;
    for (const [n, d] of chosen.entries()) {
      try {
        const files = d.images.map((r, k) => new File([blobOf(r)!], `image-${k + 1}.jpg`, { type: "image/jpeg" }));
        const small = await compressForRequest(files, POST_UPLOAD);
        if (small.reduce((s, f) => s + f.size, 0) > REQUEST_LIMIT) throw new Error("too_large");
        const form = new FormData();
        for (const f of small) form.append("images", f);
        form.set("caption", d.caption);
        for (const s of d.services) form.append("services", s);
        for (const p of d.platforms) form.append("platforms", p);
        if (d.industry) form.set("industry", d.industry);
        if (d.result) form.set("result", d.result);
        if (d.client) form.set("client", d.client);
        const res = await importPostAction(form);
        if (res.ok && res.postId) {
          posts++;
          setDraft(d.id, { postId: res.postId, error: undefined });
        } else {
          failed++;
          setDraft(d.id, { error: res.error ?? "generic" });
          if (res.error === "limit") break;
        }
      } catch (e) {
        failed++;
        setDraft(d.id, { error: e instanceof Error && e.message === "too_large" ? "too_large" : "generic" });
      }
      setProgress({ done: n + 1, total: chosen.length });
    }
    const accepted = {
      about: profile.useAbout ? profile.about.trim() || null : null,
      strengths: profile.strengths.filter((s) => s.on && s.text.trim()).map((s) => s.text.trim()),
      services: profile.services.filter((s) => s.on).map((s) => s.key),
      clients: profile.clients.filter((c) => c.on && c.name.trim().length >= 2).map(({ name, industry }) => ({ name: name.trim(), industry })),
    };
    let clients = 0;
    let servicesAdded = 0;
    let avatar = false;
    const avatarBlob = profile.useAvatar && profile.avatar ? blobOf(profile.avatar) : null;
    if (accepted.about || accepted.strengths.length || accepted.services.length || accepted.clients.length || avatarBlob) {
      const form = new FormData();
      form.set("data", JSON.stringify(accepted));
      if (avatarBlob) form.set("avatar", new File([avatarBlob], "logo.jpg", { type: "image/jpeg" }));
      const res = await applyProfileImportAction(form);
      clients = res.clients ?? 0;
      servicesAdded = res.services ?? 0;
      avatar = Boolean(res.avatar);
      if (res.error) setError(res.error);
    }
    setSummary({ posts, clients, services: servicesAdded, avatar, failed });
    setPhase(failed ? "review" : "done");
  }

  if (phase === "pick" || phase === "reading" || phase === "ocr" || phase === "thinking") {
    const busy = phase !== "pick";
    const status =
      phase === "reading" ? t("reading", { done: progress.done, total: progress.total || "…" }) : phase === "ocr" ? t("ocr", { done: progress.done, total: progress.total }) : phase === "thinking" ? t(aiAvailable ? "thinkingAi" : "thinking") : t("choose");
    return (
      <div className="grid gap-4" data-testid="portfolio-import">
        <FormError message={error ? t(`errors.${error}` as "errors.generic") : undefined} />
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void choose(e.dataTransfer.files[0]);
          }}
          className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center hover:bg-muted disabled:cursor-wait"
          data-testid="import-drop"
        >
          {busy ? <Loader2 className="size-8 animate-spin text-brand" /> : <FileUp className="size-8 text-brand" />}
          <span className="font-semibold" data-testid="import-status">{status}</span>
          {phase === "ocr" && <span className="text-xs text-muted-foreground">{t("ocrHint")}</span>}
          {!busy && <span className="text-sm text-muted-foreground">{t("chooseHint", { pages: IMPORT_LIMITS.pages, mb: MAX_MB })}</span>}
        </button>
        <input ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => void choose(e.target.files?.[0] ?? undefined)} data-testid="import-file" />
        <ul className="grid gap-1 text-sm text-muted-foreground">
          <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-brand" /> {t("how1")}</li>
          <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-brand" /> {t(aiAvailable ? "how2ai" : "how2")}</li>
          <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-brand" /> {t("how3")}</li>
        </ul>
      </div>
    );
  }

  if (phase === "done" && summary) {
    return (
      <div className="grid gap-3 rounded-2xl border p-6 text-center" data-testid="import-done">
        <Check className="mx-auto size-10 text-brand" />
        <p className="font-semibold">{t("done", { posts: summary.posts, clients: summary.clients })}</p>
        {(summary.services > 0 || summary.avatar) && <p className="text-sm text-muted-foreground">{t("doneProfile", { services: summary.services, avatar: summary.avatar ? "yes" : "no" })}</p>}
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/studio/posts" className={buttonVariants()}>{t("seePosts")}</Link>
          <Link href="/studio/clients" className={buttonVariants({ variant: "outline" })}>{t("seeClients")}</Link>
          <Link href="/studio/profile" className={buttonVariants({ variant: "outline" })}>{t("seeProfile")}</Link>
        </div>
      </div>
    );
  }

  const publishing = phase === "publishing";
  const toPublish = drafts.filter((d) => d.include && !d.postId && d.images.length).length;
  const profileChanges = profile.useAbout || profile.services.some((s) => s.on) || profile.clients.some((c) => c.on && c.name.trim().length >= 2) || (profile.useAvatar && profile.avatar);
  const hasProfile = profile.about || profile.strengths.length > 0 || profile.services.length > 0 || profile.clients.length > 0 || profile.avatar;
  return (
    <div className="grid gap-5" data-testid="import-review">
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-brand-soft p-3 text-sm">
        <Sparkles className="size-4 text-brand" />
        <span>{t(mode === "ai" ? "readByAi" : "readByText", { pages: pages.length })}</span>
        {truncated && <span className="text-muted-foreground">{t("truncated", { pages: IMPORT_LIMITS.pages })}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <PicturePicker pictures={pictures} used={usedRefs} drafts={drafts.map((d) => ({ id: d.id, title: d.title }))} onPost={postFromPictures} onAvatar={(ref) => setProfile((p) => ({ ...p, avatar: ref, useAvatar: true }))} onClientLogos={clientLogosFromPictures} />
        <p className="text-sm text-muted-foreground">{t("reviewHint")}</p>
      </div>
      {summary && summary.failed > 0 && <FormError message={t("someFailed", { failed: summary.failed, posts: summary.posts })} />}
      <FormError message={error ? t(`errors.${error}` as "errors.generic") : undefined} />

      {hasProfile && (
        <section className="grid gap-4 rounded-xl border p-4" data-testid="import-profile">
          <h3 className="font-semibold">{t("profileTitle")}</h3>
          {profile.avatar && previewOf(profile.avatar) && (
            <label className="flex cursor-pointer items-center gap-3 text-sm" data-testid="import-avatar">
              <input type="checkbox" checked={profile.useAvatar} onChange={(e) => setProfile({ ...profile, useAvatar: e.target.checked })} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewOf(profile.avatar)} alt="" className="size-14 rounded-full border object-cover" />
              <span>{t("useAvatar")}</span>
            </label>
          )}
          {profile.about && (
            <label className="grid gap-1.5 text-sm">
              <span className="flex items-center gap-2"><input type="checkbox" checked={profile.useAbout} onChange={(e) => setProfile({ ...profile, useAbout: e.target.checked })} /> {t("useAbout")}</span>
              <Textarea value={profile.about} onChange={(e) => setProfile({ ...profile, about: e.target.value })} rows={4} maxLength={2000} dir="auto" disabled={!profile.useAbout} />
            </label>
          )}
          {profile.strengths.length > 0 && (
            <div className="grid gap-1.5 text-sm">
              <span>{t("strengths")}</span>
              <div className="flex flex-wrap gap-2">
                {profile.strengths.map((s, i) => (
                  <label key={i} className={cn("flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1", s.on && "border-brand bg-brand-soft")}>
                    <input type="checkbox" className="sr-only" checked={s.on} onChange={(e) => setProfile({ ...profile, strengths: profile.strengths.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)) })} />
                    {s.on && <Check className="size-3.5 text-brand" />} <span dir="auto">{s.text}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {profile.services.length > 0 && (
            <div className="grid gap-1.5 text-sm" data-testid="import-services">
              <span>{t("services")}</span>
              <div className="flex flex-wrap gap-2">
                {profile.services.map((s, i) => (
                  <label key={s.key} className={cn("flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1", s.on && "border-brand bg-brand-soft")}>
                    <input type="checkbox" className="sr-only" checked={s.on} onChange={(e) => setProfile({ ...profile, services: profile.services.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)) })} />
                    {s.on && <Check className="size-3.5 text-brand" />} {label(services, s.key)}
                  </label>
                ))}
              </div>
            </div>
          )}
          {profile.clients.length > 0 && (
            <div className="grid gap-1.5 text-sm">
              <span>{t("clients")}</span>
              <p className="text-xs text-muted-foreground">{t("clientsHint")}</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {profile.clients.map((c, i) => (
                  <li key={i} className={cn("flex items-center gap-2 rounded-lg border p-1.5", c.on && "border-brand bg-brand-soft")} data-testid="import-client">
                    <input type="checkbox" checked={c.on} onChange={(e) => setClient(i, { on: e.target.checked })} aria-label={t("clients")} />
                    {c.logo && previewOf(c.logo) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewOf(c.logo)} alt="" className="size-10 shrink-0 rounded border bg-white object-contain" />
                    )}
                    <Input value={c.name} onChange={(e) => setClient(i, { name: e.target.value, on: e.target.value.trim().length >= 2 })} placeholder={t("clientNamePh")} dir="auto" className="h-8 flex-1 bg-background" maxLength={80} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="grid gap-4">
        <h3 className="font-semibold">{t("draftsTitle", { count: drafts.length })}</h3>
        {drafts.map((d, n) => (
          <article key={d.id} className={cn("grid gap-3 rounded-xl border p-4", !d.include && "opacity-60", d.postId && "border-brand")} data-testid="import-draft">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 font-medium">
                <input type="checkbox" checked={d.include} disabled={Boolean(d.postId)} onChange={(e) => setDraft(d.id, { include: e.target.checked })} data-testid="draft-include" />
                {d.title || t("untitled", { n: n + 1 })}
              </label>
              <span className="text-xs text-muted-foreground">{t("imagesCount", { count: d.images.length })}</span>
              {d.postId && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">{t("published")}</span>}
              {d.error && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">{t(`errors.${d.error}` as "errors.generic")}</span>}
              {n > 0 && !d.postId && (
                <Button type="button" size="sm" variant="ghost" className="ms-auto gap-1" onClick={() => mergeWithPrevious(d.id)}>
                  <Merge className="size-3.5" /> {t("merge")}
                </Button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {d.images.map((r, k) => (
                <div key={`${r.page}-${r.crop}`} className="relative w-24 shrink-0 overflow-hidden rounded-lg border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewOf(r)} alt={t("pageN", { n: r.page + 1 })} className="aspect-square w-full object-cover" />
                  <span className="absolute bottom-1 start-1 rounded bg-background/80 px-1 text-[10px]">{k + 1}</span>
                  {d.images.length > 1 && !d.postId && (
                    <button type="button" aria-label={t("removePage")} onClick={() => setDraft(d.id, { images: d.images.filter((x) => !sameRef(x, r)) })} className="absolute end-1 top-1 rounded-full bg-background/90 p-0.5">
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {!d.postId && (
              <>
                <Textarea value={d.caption} onChange={(e) => setDraft(d.id, { caption: e.target.value })} rows={3} maxLength={2200} dir="auto" aria-label={ts("caption")} placeholder={ts("caption")} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input value={d.client ?? ""} onChange={(e) => setDraft(d.id, { client: e.target.value || null })} placeholder={t("clientPh")} aria-label={t("client")} dir="auto" list="import-client-names" data-testid="draft-client" />
                  <Input value={d.result ?? ""} onChange={(e) => setDraft(d.id, { result: e.target.value || null })} placeholder={t("resultPh")} aria-label={t("result")} dir="auto" maxLength={80} />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-sm">
                  {d.services.map((s) => (
                    <span key={s} className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs text-primary-foreground">
                      {label(services, s)}
                      <button type="button" aria-label={t("removeService")} onClick={() => setDraft(d.id, { services: d.services.filter((x) => x !== s) })}><X className="size-3" /></button>
                    </span>
                  ))}
                  <select
                    value=""
                    onChange={(e) => e.target.value && setDraft(d.id, { services: [...new Set([...d.services, e.target.value])].slice(0, 6) })}
                    className="h-8 rounded-md border bg-transparent px-2 text-xs"
                    aria-label={t("addService")}
                  >
                    <option value="">{t("addService")}</option>
                    {services.filter((o) => !d.services.includes(o.key)).map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {platforms.map((p) => {
                    const on = d.platforms.includes(p.key);
                    return (
                      <button key={p.key} type="button" onClick={() => setDraft(d.id, { platforms: on ? d.platforms.filter((x) => x !== p.key) : [...d.platforms, p.key] })} className={cn("rounded-full border px-2.5 py-0.5 text-xs", on && "border-brand bg-brand-soft")}>
                        {p.label}
                      </button>
                    );
                  })}
                  <select value={d.industry ?? ""} onChange={(e) => setDraft(d.id, { industry: e.target.value || null })} className="h-7 rounded-md border bg-transparent px-2 text-xs" aria-label={ts("industry")}>
                    <option value="">{ts("industry")}</option>
                    {industries.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </div>
              </>
            )}
          </article>
        ))}
      </section>

      <datalist id="import-client-names">
        {clientNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {unused.length > 0 && (
        <section className="grid gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground">{t("otherPages")}</h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {unused.map((p) => (
              <button key={p.index} type="button" onClick={() => addDraft(p.index)} className="relative w-20 shrink-0 overflow-hidden rounded-lg border bg-muted" title={t("makePost")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt={t("pageN", { n: p.index + 1 })} className="aspect-[3/4] w-full object-cover opacity-70" />
                <span className="absolute inset-0 grid place-items-center"><Plus className="size-5 rounded-full bg-background/90 p-0.5" /></span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t("otherPagesHint")}</p>
        </section>
      )}

      <div className="sticky bottom-20 flex flex-wrap items-center gap-2 rounded-xl border bg-background/95 p-3 backdrop-blur md:bottom-4">
        <Button type="button" onClick={() => void publish()} disabled={publishing || (!toPublish && !profileChanges)} data-testid="import-publish" className="gap-2">
          {publishing ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          {publishing ? t("publishing", { done: progress.done, total: progress.total }) : t("publish", { count: toPublish })}
        </Button>
        <Button type="button" variant="ghost" disabled={publishing} onClick={() => { setPhase("pick"); setDrafts([]); setPages([]); setSummary(null); }} className="gap-1">
          <Trash2 className="size-4" /> {t("startOver")}
        </Button>
      </div>
    </div>
  );
}
