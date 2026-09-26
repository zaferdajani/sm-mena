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
import { readPdf, type ReadPage } from "@/lib/portfolio-import/read-pdf";
import { IMPORT_LIMITS, type DraftPost, type ImportPlan } from "@/lib/portfolio-import/types";
import { cn } from "@/lib/utils";

type Option = { key: string; label: string };
type Draft = DraftPost & { id: number; include: boolean; error?: string; postId?: string };
type Profile = { about: string; useAbout: boolean; strengths: { text: string; on: boolean }[]; clients: { name: string; industry: string | null; on: boolean }[] };
type Phase = "pick" | "reading" | "thinking" | "review" | "publishing" | "done";

const MAX_MB = 40;

/**
 * Studio → Import a PDF portfolio (docs/36-portfolio-import.md), the Aida
 * way: read in the browser, proposed by Sawwiq (AI when configured), reviewed
 * by the agency, published only on its say-so.
 */
export function PortfolioImport({ services, platforms, industries, agencyServices, aiAvailable }: { services: Option[]; platforms: Option[]; industries: Option[]; agencyServices: string[]; aiAvailable: boolean }) {
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
  const [profile, setProfile] = useState<Profile>({ about: "", useAbout: false, strengths: [], clients: [] });
  const [summary, setSummary] = useState<{ posts: number; clients: number; failed: number } | null>(null);

  const label = (list: Option[], key: string) => list.find((o) => o.key === key)?.label ?? key;
  const page = (i: number) => pages.find((p) => p.index === i);
  const used = new Set(drafts.flatMap((d) => d.pages));
  const unused = pages.filter((p) => !used.has(p.index));
  const setDraft = (id: number, patch: Partial<Draft>) => setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  async function choose(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return setError("notPdf");
    if (file.size > MAX_MB * 1024 * 1024) return setError("tooBig");
    setPhase("reading");
    try {
      const read = await readPdf(file, (done, total) => setProgress({ done, total }));
      setPages(read.pages);
      setTruncated(read.totalPages > read.pages.length);
      setPhase("thinking");
      const res = await analyzePortfolioAction(read.pages.map((p) => ({ index: p.index, text: p.text, image: p.thumb })));
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
        clients: plan.profile.clients.map((c) => ({ ...c, on: true })),
      });
      setPhase("review");
    } catch (e) {
      console.error("[portfolio-import]", e);
      setPhase("pick");
      setError("unreadable");
    }
  }

  function addDraft(fromPage: number) {
    setDrafts((ds) => [...ds, { id: Math.max(-1, ...ds.map((d) => d.id)) + 1, pages: [fromPage], title: "", caption: page(fromPage)?.text.slice(0, 600) ?? "", services: agencyServices.slice(0, 1), platforms: [], industry: null, client: null, result: null, include: true }]);
  }

  function mergeWithPrevious(id: number) {
    setDrafts((ds) => {
      const i = ds.findIndex((d) => d.id === id);
      if (i < 1) return ds;
      const prev = ds[i - 1];
      const cur = ds[i];
      const merged = { ...prev, pages: [...prev.pages, ...cur.pages].slice(0, IMPORT_LIMITS.imagesPerPost), services: [...new Set([...prev.services, ...cur.services])], caption: prev.caption || cur.caption };
      return [...ds.slice(0, i - 1), merged, ...ds.slice(i + 1)];
    });
  }

  async function publish() {
    const chosen = drafts.filter((d) => d.include && !d.postId && d.pages.length);
    for (const d of chosen) if (!d.services.length) return setError("noServices");
    setError(null);
    setPhase("publishing");
    setProgress({ done: 0, total: chosen.length });
    let posts = 0;
    let failed = 0;
    for (const [n, d] of chosen.entries()) {
      try {
        const files = d.pages.map((i) => new File([page(i)!.full], `page-${i + 1}.jpg`, { type: "image/jpeg" }));
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
    let clients = 0;
    const accepted = {
      about: profile.useAbout ? profile.about.trim() || null : null,
      strengths: profile.strengths.filter((s) => s.on && s.text.trim()).map((s) => s.text.trim()),
      clients: profile.clients.filter((c) => c.on && c.name.trim().length >= 2).map(({ name, industry }) => ({ name: name.trim(), industry })),
    };
    if (accepted.about || accepted.strengths.length || accepted.clients.length) {
      const res = await applyProfileImportAction(accepted);
      clients = res.clients ?? 0;
    }
    setSummary({ posts, clients, failed });
    setPhase(failed ? "review" : "done");
  }

  if (phase === "pick" || phase === "reading" || phase === "thinking") {
    const busy = phase !== "pick";
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
          <span className="font-semibold">{phase === "reading" ? t("reading", { done: progress.done, total: progress.total || "…" }) : phase === "thinking" ? t(aiAvailable ? "thinkingAi" : "thinking") : t("choose")}</span>
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
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/studio/posts" className={buttonVariants()}>{t("seePosts")}</Link>
          <Link href="/studio/clients" className={buttonVariants({ variant: "outline" })}>{t("seeClients")}</Link>
        </div>
      </div>
    );
  }

  const publishing = phase === "publishing";
  const toPublish = drafts.filter((d) => d.include && !d.postId && d.pages.length).length;
  return (
    <div className="grid gap-5" data-testid="import-review">
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-brand-soft p-3 text-sm">
        <Sparkles className="size-4 text-brand" />
        <span>{t(mode === "ai" ? "readByAi" : "readByText", { pages: pages.length })}</span>
        {truncated && <span className="text-muted-foreground">{t("truncated", { pages: IMPORT_LIMITS.pages })}</span>}
      </div>
      <p className="text-sm text-muted-foreground">{t("reviewHint")}</p>
      {summary && summary.failed > 0 && <FormError message={t("someFailed", { failed: summary.failed, posts: summary.posts })} />}
      <FormError message={error ? t(`errors.${error}` as "errors.generic") : undefined} />

      {(profile.about || profile.strengths.length > 0 || profile.clients.length > 0) && (
        <section className="grid gap-3 rounded-xl border p-4" data-testid="import-profile">
          <h3 className="font-semibold">{t("profileTitle")}</h3>
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
          {profile.clients.length > 0 && (
            <div className="grid gap-1.5 text-sm">
              <span>{t("clients")}</span>
              <div className="flex flex-wrap gap-2">
                {profile.clients.map((c, i) => (
                  <label key={i} className={cn("flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1", c.on && "border-brand bg-brand-soft")} data-testid="import-client">
                    <input type="checkbox" className="sr-only" checked={c.on} onChange={(e) => setProfile({ ...profile, clients: profile.clients.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)) })} />
                    {c.on && <Check className="size-3.5 text-brand" />} <span dir="auto">{c.name}</span>
                  </label>
                ))}
              </div>
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
              {d.postId && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">{t("published")}</span>}
              {d.error && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">{t(`errors.${d.error}` as "errors.generic")}</span>}
              {n > 0 && !d.postId && (
                <Button type="button" size="sm" variant="ghost" className="ms-auto gap-1" onClick={() => mergeWithPrevious(d.id)}>
                  <Merge className="size-3.5" /> {t("merge")}
                </Button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {d.pages.map((i) => (
                <div key={i} className="relative w-24 shrink-0 overflow-hidden rounded-lg border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={page(i)?.preview} alt={t("pageN", { n: i + 1 })} className="aspect-[3/4] w-full object-cover" />
                  <span className="absolute bottom-1 start-1 rounded bg-background/80 px-1 text-[10px]">{i + 1}</span>
                  {d.pages.length > 1 && !d.postId && (
                    <button type="button" aria-label={t("removePage")} onClick={() => setDraft(d.id, { pages: d.pages.filter((x) => x !== i) })} className="absolute end-1 top-1 rounded-full bg-background/90 p-0.5">
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
                  <Input value={d.client ?? ""} onChange={(e) => setDraft(d.id, { client: e.target.value || null })} placeholder={t("clientPh")} aria-label={t("client")} dir="auto" />
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
        <Button type="button" onClick={() => void publish()} disabled={publishing || (!toPublish && !profile.useAbout && !profile.clients.some((c) => c.on))} data-testid="import-publish" className="gap-2">
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
