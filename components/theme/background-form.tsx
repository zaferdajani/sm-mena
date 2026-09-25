"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useActionState, useRef, useState } from "react";
import { addBackgroundAction } from "@/app/[locale]/(main)/admin/appearance/actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BACKGROUND_UPLOAD, compressForRequest, replaceInputFile } from "@/lib/media/image-compress";
import type { VideoProgress } from "@/lib/media/video-compress";

type Compression =
  | { status: "working"; video: boolean; before: number; progress?: VideoProgress }
  | { status: "done"; before: number; after: number; reducedTo?: number; ssim?: number | null; crf?: number }
  | { status: "error"; code: "engine" | "unsupported" | "videoTooLarge" | "cancelled" };

/** Upload an image or looping video as the background of one country's interface (or all), optionally for a date range. */
export function BackgroundForm({ scopes }: { scopes: { value: string; label: string }[] }) {
  const t = useTranslations("Appearance");
  const [state, action] = useActionState(addBackgroundAction, undefined);
  const [preview, setPreview] = useState<{ url: string; video: boolean } | null>(null);
  const [veil, setVeil] = useState(60);
  const [compression, setCompression] = useState<Compression | null>(null);
  const job = useRef<{ id: number; abort?: AbortController }>({ id: 0 });
  const format = useFormatter();
  const mb = (bytes: number) => t("compress.mb", { n: format.number(bytes / (1024 * 1024), { maximumFractionDigits: 1 }) });
  const busy = compression?.status === "working";

  /**
   * Everything is compressed in the browser before it is sent, so no raw media
   * is ever stored and the request fits a serverless body limit: images and
   * videos at the smallest size that looks the same (SSIM search), videos with
   * ffmpeg.wasm (loaded only now).
   */
  const onPick = async (input: HTMLInputElement) => {
    job.current.abort?.abort();
    const id = ++job.current.id;
    const file = input.files?.[0];
    setPreview(file ? { url: URL.createObjectURL(file), video: file.type.startsWith("video/") } : null);
    if (!file) return setCompression(null);
    const video = file.type.startsWith("video/");
    setCompression({ status: "working", video, before: file.size });
    try {
      let small: File;
      let reducedTo: number | undefined;
      let ssim: number | null | undefined;
      let crf: number | undefined;
      if (video) {
        const abort = new AbortController();
        job.current.abort = abort;
        const { compressBackgroundVideo } = await import("@/lib/media/video-compress");
        const out = await compressBackgroundVideo(file, {
          signal: abort.signal,
          onProgress: (progress) => id === job.current.id && setCompression({ status: "working", video, before: file.size, progress }),
        });
        small = out.file;
        reducedTo = out.reducedTo;
        ssim = out.ssim;
        crf = out.crf;
      } else {
        [small] = await compressForRequest([file], BACKGROUND_UPLOAD);
      }
      if (id !== job.current.id) return;
      if (small !== file) replaceInputFile(input, small);
      if (video) setPreview({ url: URL.createObjectURL(small), video: true });
      setCompression({ status: "done", before: file.size, after: small.size, reducedTo, ssim, crf });
    } catch (error) {
      if (id !== job.current.id) return;
      // Never send a video that was not compressed.
      input.value = "";
      setPreview(null);
      const code = (error as { code?: string }).code;
      setCompression({ status: "error", code: code === "engine" || code === "cancelled" ? code : code === "tooLarge" ? "videoTooLarge" : "unsupported" });
    }
  };

  const progressText = (c: Extract<Compression, { status: "working" }>) => {
    const p = c.progress;
    if (!c.video) return t("compress.image");
    if (!p || (p.stage === "engine" && !p.total)) return t("compress.engine");
    if (p.stage === "engine") return t("compress.engineProgress", { pct: Math.round((p.received / p.total!) * 100) });
    return t("compress.encoding", { pass: p.pass, pct: Math.round(p.ratio * 100) });
  };

  return (
    <form action={action} className="space-y-3 rounded-2xl border p-4" data-testid="background-form">
      <h2 className="font-semibold">{t("add")}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="bg-label">{t("label")}</Label>
          <Input id="bg-label" name="label" required maxLength={80} placeholder={t("labelPh")} dir="auto" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="bg-scope">{t("scope")}</Label>
          <select id="bg-scope" name="scope" className="h-10 rounded-lg border bg-background px-2 text-sm" defaultValue="all">
            {scopes.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="bg-start">{t("startsOn")}</Label>
          <Input id="bg-start" name="startsOn" type="date" dir="ltr" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="bg-end">{t("endsOn")}</Label>
          <Input id="bg-end" name="endsOn" type="date" dir="ltr" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t("datesHint")}</p>
      <div className="grid gap-1.5">
        <Label htmlFor="bg-file">{t("file")}</Label>
        <Input
          id="bg-file"
          name="file"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
          onChange={(e) => void onPick(e.currentTarget)}
        />
        <span className="text-xs text-muted-foreground">{t("fileHint")}</span>
        {compression?.status === "working" && (
          <div className="flex items-center gap-3 text-sm" role="status" data-testid="background-compress-status">
            <span className="text-muted-foreground">{progressText(compression)}</span>
            {compression.video && (
              <button type="button" className="text-brand underline" onClick={() => job.current.abort?.abort()}>
                {t("compress.cancel")}
              </button>
            )}
          </div>
        )}
        {compression?.status === "done" && (
          <p className="text-sm text-brand" role="status" data-testid="background-compressed" data-ssim={compression.ssim ?? undefined} data-crf={compression.crf}>
            {t("compress.done", { before: mb(compression.before), after: mb(compression.after) })}
            {compression.reducedTo && ` ${t("compress.reduced", { width: compression.reducedTo })}`}
          </p>
        )}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="bg-veil">{t("veil", { n: veil })}</Label>
        <input id="bg-veil" name="veil" type="range" min={0} max={95} step={5} value={veil} onChange={(e) => setVeil(Number(e.target.value))} className="accent-[var(--brand)]" />
        <span className="text-xs text-muted-foreground">{t("veilHint")}</span>
      </div>
      {preview && (
        <div className="relative h-40 overflow-hidden rounded-xl border" data-testid="background-preview">
          {preview.video ? (
            <video src={preview.url} autoPlay muted loop playsInline className="size-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file
            <img src={preview.url} alt="" className="size-full object-cover" />
          )}
          <div className="absolute inset-0 bg-background" style={{ opacity: veil / 100 }} />
          <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-semibold">{t("previewText")}</p>
        </div>
      )}
      <FormError
        message={
          compression?.status === "error"
            ? t(`errors.${compression.code}`)
            : state?.error
              ? t(`errors.${state.error}` as "errors.invalid")
              : undefined
        }
      />
      {state?.ok && <p className="text-sm text-brand" role="status">{t("added")}</p>}
      <SubmitButton disabled={busy}>{t("save")}</SubmitButton>
    </form>
  );
}
