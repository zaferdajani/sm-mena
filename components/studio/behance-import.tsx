"use client";

import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { applyBehanceProfileAction, importBehanceProjectAction, previewBehanceAction, previewBehanceHandoffAction } from "@/app/[locale]/(main)/studio/import/behance-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { HANDOFF_MESSAGE, HANDOFF_READY, type BehanceDraft, type BehancePortfolio } from "@/lib/behance/types";
import { cn } from "@/lib/utils";

// Studio → Import from Behance (docs/47-behance-import.md): a link in, a list
// of projects to review, one publish per kept project. The pictures shown here
// come straight from Behance; the server pulls the kept ones when publishing.

type Option = { key: string; label: string };
type Draft = BehanceDraft & { id: number; include: boolean; kept: boolean[]; moreServices?: boolean; status: "pending" | "publishing" | "ok" | "error"; postId?: string; error?: string };
type Phase = "input" | "loading" | "review" | "publishing" | "done";

export function BehanceImport({ handle, services, platforms, industries, clients, agencyServices, bookmarkletHref, handoff = false }: { handle: string; services: Option[]; platforms: Option[]; industries: Option[]; clients: Option[]; agencyServices: string[]; /** The browser path (lib/behance/handoff.ts). */ bookmarkletHref: string; /** Opened by the bookmarklet (?handoff=1): listen for the Behance tab's page. */ handoff?: boolean }) {
  const t = useTranslations("BehanceImport");
  const locale = useLocale();
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [error, setError] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<BehancePortfolio | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [profile, setProfile] = useState({ useAbout: false, useWebsite: false, useAvatar: false, services: [] as { key: string; on: boolean }[] });
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  function accept(p: BehancePortfolio) {
    setPortfolio(p);
    setDrafts(p.drafts.map((d, id) => ({ ...d, id, include: true, kept: d.project.images.map(() => true), status: "pending", services: d.services.length ? d.services : agencyServices.slice(0, 1) })));
    setProfile({ useAbout: Boolean(p.suggestion.about), useWebsite: Boolean(p.suggestion.website), useAvatar: false, services: p.suggestion.services.map((key) => ({ key, on: true })) });
    setPhase("review");
  }

  // Opened by the bookmarklet: tell the Behance tab we are ready, then take the page it sends.
  // Only a behance.net tab is listened to; the payload goes to the server for parsing.
  useEffect(() => {
    if (!handoff) return;
    const onMessage = async (ev: MessageEvent) => {
      if (!/^https:\/\/([a-z0-9-]+\.)*behance\.net$/i.test(ev.origin) || ev.data?.type !== HANDOFF_MESSAGE) return;
      setPhase("loading");
      const res = await previewBehanceHandoffAction({ url: ev.data.url, blobs: ev.data.blobs, meta: ev.data.meta ?? {} });
      if (res.portfolio) accept(res.portfolio);
      else {
        setPhase("input");
        setError(res.error ?? "unreachable");
      }
    };
    window.addEventListener("message", onMessage);
    window.opener?.postMessage({ type: HANDOFF_READY }, "*");
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoff]);

  async function read() {
    setError(null);
    setPhase("loading");
    const res = await previewBehanceAction(input);
    if (!res.portfolio) {
      setPhase("input");
      return setError(res.error ?? "unreachable");
    }
    accept(res.portfolio);
  }

  const patch = (id: number, change: Partial<Draft>) => setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...change } : d)));
  const toggleIn = (list: string[], key: string) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  const selected = drafts.filter((d) => d.include && d.status !== "ok");

  async function publish() {
    setPhase("publishing");
    setProgress({ done: 0, total: selected.length });
    let done = 0;
    for (const d of selected) {
      patch(d.id, { status: "publishing" });
      const res = await importBehanceProjectAction({
        projectUrl: d.project.url,
        images: d.project.images.filter((_, i) => d.kept[i]).map((i) => i.url),
        publishedAt: d.project.publishedAt ? new Date(d.project.publishedAt).toISOString() : null,
        caption: d.caption,
        services: d.services,
        platforms: d.platforms,
        industry: d.industry,
        client: d.client,
      });
      patch(d.id, res.ok ? { status: "ok", postId: res.postId } : { status: "error", error: res.error ?? "generic" });
      setProgress({ done: ++done, total: selected.length });
    }
    const s = portfolio?.suggestion;
    if (s && (profile.useAbout || profile.useWebsite || profile.useAvatar || profile.services.some((x) => x.on))) {
      await applyBehanceProfileAction({
        about: profile.useAbout ? s.about : null,
        website: profile.useWebsite ? s.website : null,
        avatar: profile.useAvatar ? s.avatar : null,
        services: profile.services.filter((x) => x.on).map((x) => x.key),
      });
    }
    setPhase("done");
  }

  if (phase === "input" || phase === "loading") {
    return (
      <div className="grid gap-4" data-testid="behance-form">
        <ol className="grid gap-1.5 text-sm text-muted-foreground">
          {(["how1", "how2", "how3"] as const).map((k, i) => (
            <li key={k} className="flex gap-2"><span className="font-semibold text-foreground">{i + 1}.</span><span>{t(k)}</span></li>
          ))}
        </ol>
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void read();
          }}
        >
          <label htmlFor="behance-url" className="text-sm font-medium">{t("inputLabel")}</label>
          <div className="flex gap-2">
            <Input id="behance-url" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("placeholder")} dir="ltr" inputMode="url" autoComplete="off" required data-testid="behance-input" />
            <Button type="submit" disabled={phase === "loading" || !input.trim()} data-testid="behance-read">
              {phase === "loading" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {phase === "loading" ? t("reading") : t("read")}
            </Button>
          </div>
          {error && <p role="alert" className="text-sm text-destructive" data-testid="behance-error">{t(`errors.${error}` as "errors.invalid")}</p>}
        </form>
        {handoff && phase === "input" && !error && <p className="rounded-xl border border-brand-line bg-brand-soft p-3 text-sm" data-testid="behance-waiting">{t("handoff.waiting")}</p>}
        <section className="grid gap-2 rounded-xl border p-4 text-sm" data-testid="behance-bookmarklet">
          <h2 className="font-bold">{t("handoff.title")}</h2>
          <p className="text-muted-foreground">{t("handoff.body")}</p>
          <ol className="grid gap-1 text-muted-foreground">
            <li>1. {t("handoff.step1")}</li>
            <li>2. {t("handoff.step2")}</li>
            <li>3. {t("handoff.step3")}</li>
          </ol>
          <a href={bookmarkletHref} onClick={(e) => e.preventDefault()} draggable className="inline-flex w-fit items-center gap-2 rounded-full border border-primary bg-primary px-4 py-2 font-semibold text-primary-foreground" title={t("handoff.dragHint")} data-testid="behance-bookmarklet-link">
            {t("handoff.button")}
          </a>
          <p className="text-xs text-muted-foreground">{t("handoff.dragHint")}</p>
        </section>
      </div>
    );
  }

  if (phase === "done") {
    const ok = drafts.filter((d) => d.status === "ok").length;
    return (
      <div className="grid gap-3 rounded-2xl border p-5" data-testid="behance-done">
        <h2 className="flex items-center gap-2 text-base font-bold"><CheckCircle2 className="size-5 text-brand" aria-hidden />{t("doneTitle")}</h2>
        <p className="text-sm">{t("doneBody", { count: ok })}</p>
        {drafts.filter((d) => d.status === "error").map((d) => (
          <p key={d.id} className="text-sm text-destructive">{d.project.title}: {t("failed", { reason: t(`reasons.${d.error}` as "reasons.generic") })}</p>
        ))}
        <div className="flex flex-wrap gap-2">
          <Link href={`/a/${handle}`} className="text-sm font-medium text-brand hover:underline" data-testid="behance-view-page">{t("viewPage")}</Link>
          <button type="button" className="text-sm text-muted-foreground hover:underline" onClick={() => { setPhase("input"); setInput(""); setDrafts([]); }}>{t("again")}</button>
        </div>
      </div>
    );
  }

  const s = portfolio!.suggestion;
  const busy = phase === "publishing";
  return (
    <div className="grid gap-5" data-testid="behance-review">
      <div className="rounded-xl border p-3 text-sm" data-testid="behance-ownership" data-ownership={portfolio!.ownership}>
        <p className={portfolio!.ownership === "verified" ? "text-brand" : "text-amber-800 dark:text-amber-200"}>{portfolio!.ownership === "verified" ? t("ownershipVerified") : t("ownershipUnverified")}</p>
        {portfolio!.profile && (
          <p className="mt-1 text-muted-foreground">
            <a href={portfolio!.profile.url} target="_blank" rel="noopener noreferrer" className="hover:underline" dir="ltr">{portfolio!.profile.displayName} · @{portfolio!.profile.username}</a>
          </p>
        )}
      </div>

      {(s.about || s.website || s.avatar || s.services.length > 0) && (
        <section className="grid gap-2 rounded-xl border p-4" data-testid="behance-profile">
          <h2 className="text-sm font-bold">{t("profileTitle")}</h2>
          {s.about && (
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={profile.useAbout} onChange={(e) => setProfile({ ...profile, useAbout: e.target.checked })} /><span>{t("useAbout")}<span className="mt-1 block whitespace-pre-line text-xs text-muted-foreground" dir="auto">{s.about}</span></span></label>
          )}
          {s.website && (
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={profile.useWebsite} onChange={(e) => setProfile({ ...profile, useWebsite: e.target.checked })} /><span>{t("useWebsite", { website: s.website })}</span></label>
          )}
          {s.avatar && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={profile.useAvatar} onChange={(e) => setProfile({ ...profile, useAvatar: e.target.checked })} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.avatar} alt="" className="size-8 rounded-full border object-cover" />
              <span>{t("useAvatar")}</span>
            </label>
          )}
          {s.services.length > 0 && (
            <div className="grid gap-1.5 text-sm">
              <span>{t("servicesAdd")}</span>
              <div className="flex flex-wrap gap-1.5">
                {profile.services.map((x) => (
                  <button key={x.key} type="button" aria-pressed={x.on} onClick={() => setProfile({ ...profile, services: profile.services.map((y) => (y.key === x.key ? { ...y, on: !y.on } : y)) })} className={cn("rounded-full border px-3 py-1 text-xs", x.on && "border-primary bg-primary text-primary-foreground")}>
                    {services.find((o) => o.key === x.key)?.label ?? x.key}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <div>
        <h2 className="text-base font-bold">{t("foundTitle", { count: drafts.length })}</h2>
        <p className="text-sm text-muted-foreground">{t("reviewHint")}{portfolio!.truncated ? ` ${t("truncated", { count: drafts.length })}` : ""}</p>
      </div>

      <ul className="grid gap-4">
        {drafts.map((d) => {
          const kept = d.kept.filter(Boolean).length;
          return (
            <li key={d.id} className={cn("grid gap-3 rounded-2xl border p-4", !d.include && "opacity-60")} data-testid="behance-draft" data-status={d.status}>
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" checked={d.include} disabled={busy || d.status === "ok"} onChange={(e) => patch(d.id, { include: e.target.checked })} aria-label={d.project.title} data-testid="behance-include" />
                {d.project.cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.project.cover} alt="" className="size-16 shrink-0 rounded-lg border object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold" dir="auto">{d.project.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.project.publishedAt ? `${t("publishedOn", { date: new Date(d.project.publishedAt).toLocaleDateString(locale === "ar" ? "ar-JO-u-nu-latn" : "en") })} · ` : ""}
                    <a href={d.project.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">{t("sourceNote")} <ExternalLink className="size-3" aria-hidden /></a>
                  </p>
                  {d.status === "ok" && <p className="mt-1 text-xs font-medium text-brand" data-testid="behance-published">{t("published")}</p>}
                  {d.status === "error" && <p className="mt-1 text-xs text-destructive" data-testid="behance-failed">{t("failed", { reason: t(`reasons.${d.error}` as "reasons.generic") })}</p>}
                </div>
              </div>
              {d.include && d.status !== "ok" && (
                <>
                  <div className="grid gap-1">
                    <p className="text-xs text-muted-foreground">{t("images", { kept, total: d.project.images.length })}</p>
                    <div className="flex gap-1.5 overflow-x-auto" data-testid="behance-images">
                      {d.project.images.map((img, i) => (
                        <button key={img.url} type="button" aria-pressed={d.kept[i]} aria-label={t("imageToggle", { n: i + 1 })} disabled={busy} onClick={() => patch(d.id, { kept: d.kept.map((k, j) => (j === i ? !k : k)) })} className={cn("relative size-16 shrink-0 overflow-hidden rounded-lg border", d.kept[i] ? "border-primary ring-2 ring-primary" : "opacity-40")}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt="" className="size-full object-cover" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium">{t("caption")}</span>
                    <Textarea value={d.caption} rows={4} maxLength={2200} dir="auto" disabled={busy} onChange={(e) => patch(d.id, { caption: e.target.value })} data-testid="behance-caption" />
                  </label>
                  <div className="grid gap-1 text-sm">
                    <span className="font-medium">{t("services")}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {/* The agency's own services and the suggested ones first; the whole catalog on request. */}
                      {services.filter((o) => d.moreServices || agencyServices.includes(o.key) || d.services.includes(o.key)).map((o) => (
                        <button key={o.key} type="button" aria-pressed={d.services.includes(o.key)} disabled={busy} onClick={() => patch(d.id, { services: toggleIn(d.services, o.key) })} className={cn("rounded-full border px-3 py-1 text-xs", d.services.includes(o.key) && "border-primary bg-primary text-primary-foreground")}>
                          {o.label}
                        </button>
                      ))}
                      {!d.moreServices && <button type="button" onClick={() => patch(d.id, { moreServices: true })} className="rounded-full px-3 py-1 text-xs text-brand hover:underline">{t("moreServices")}</button>}
                    </div>
                  </div>
                  <div className="grid gap-1 text-sm">
                    <span className="font-medium">{t("platforms")}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {platforms.map((o) => (
                        <button key={o.key} type="button" aria-pressed={d.platforms.includes(o.key)} disabled={busy} onClick={() => patch(d.id, { platforms: toggleIn(d.platforms, o.key) })} className={cn("rounded-full border px-3 py-1 text-xs", d.platforms.includes(o.key) && "border-primary bg-primary text-primary-foreground")}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium">{t("industry")}</span>
                      <select value={d.industry ?? ""} disabled={busy} onChange={(e) => patch(d.id, { industry: e.target.value || null })} className="h-9 rounded-md border bg-background px-2 text-sm">
                        <option value="">{t("industryNone")}</option>
                        {industries.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium">{t("client")}</span>
                      <Input value={d.client ?? ""} list="behance-clients" maxLength={80} dir="auto" disabled={busy} onChange={(e) => patch(d.id, { client: e.target.value || null })} data-testid="behance-client" />
                      <span className="text-xs text-muted-foreground">{t("clientHint")}</span>
                    </label>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
      <datalist id="behance-clients">{clients.map((c) => <option key={c.key} value={c.label} />)}</datalist>

      <div className="sticky bottom-20 flex items-center gap-3 rounded-xl border bg-background/95 p-3 backdrop-blur md:bottom-4">
        <Button type="button" disabled={busy || !selected.length || selected.some((d) => !d.kept.some(Boolean) || !d.services.length)} onClick={() => void publish()} data-testid="behance-publish">
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {busy ? t("publishing", progress) : t("publish", { count: selected.length })}
        </Button>
      </div>
    </div>
  );
}
