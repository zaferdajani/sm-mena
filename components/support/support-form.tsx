"use client";

import { CheckCircle2, ImagePlus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { submitSupportAction, type SupportState } from "@/app/[locale]/(main)/support-actions";
import { FormError } from "@/components/form-error";
import { VoiceButton } from "@/components/match/voice-button";
import { VideoField, VoiceNoteField } from "@/components/support/media-inputs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { compressForRequest, POST_UPLOAD, REQUEST_LIMIT } from "@/lib/media/image-compress";

const KINDS = ["bug", "complaint", "question", "suggestion"] as const;
export type SupportFormKind = (typeof KINDS)[number];
const MAX_SCREENSHOTS = 3;

/** The page the person came from: the `from` link parameter, else the referring page on this site. */
function sourcePath(from: string) {
  if (from.startsWith("/")) return from;
  try {
    const ref = new URL(document.referrer);
    if (ref.origin === location.origin && !ref.pathname.endsWith("/support")) return ref.pathname;
  } catch {}
  return "";
}

export function SupportForm({ from, kind }: { from: string; kind: SupportFormKind }) {
  const t = useTranslations("Support");
  const [state, action] = useActionState<SupportState, FormData>(submitSupportAction, undefined);
  const [pending, startTransition] = useTransition();
  const [shots, setShots] = useState<File[]>([]);
  const [tooBig, setTooBig] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [message, setMessage] = useState("");
  const [voice, setVoice] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const tm = useTranslations("SupportMedia");
  const locale = useLocale();
  const picker = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => shots.map((f) => URL.createObjectURL(f)), [shots]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  if (state?.done) {
    return (
      <div className="grid gap-2 rounded-xl border p-4 text-sm" role="status" data-testid="support-sent">
        <p className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="size-5 text-brand" /> {t("thanks")}
        </p>
        {state.ref && (
          <p className="text-muted-foreground">
            {t("refLine")} <span className="font-mono font-semibold text-foreground" dir="ltr" data-testid="support-ref">{state.ref}</span>
          </p>
        )}
      </div>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTooBig(false);
    const data = new FormData(event.currentTarget);
    data.delete("screenshots");
    setCompressing(true);
    const small = await compressForRequest(shots, POST_UPLOAD).finally(() => setCompressing(false));
    if (small.reduce((n, f) => n + f.size, 0) + (voice?.size ?? 0) + (video?.size ?? 0) > REQUEST_LIMIT) return setTooBig(true);
    small.forEach((f) => data.append("screenshots", f));
    if (voice) data.set("voice", voice);
    if (video) data.set("video", video);
    data.set("from", sourcePath(from));
    data.set("viewport", `${window.innerWidth}x${window.innerHeight}`);
    startTransition(() => action(data));
  }

  function addShots(list: FileList | null) {
    const images = Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
    setShots((s) => [...s, ...images].slice(0, MAX_SCREENSHOTS));
    if (picker.current) picker.current.value = "";
  }

  const error = tooBig ? t("errors.screenshotSize") : state?.error ? t(`errors.${state.error}`) : undefined;
  return (
    <form onSubmit={submit} className="grid gap-4" data-testid="support-form">
      <FormError message={error} />
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">{t("kind")}</legend>
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <label key={k} className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/10">
              <input type="radio" name="kind" value={k} defaultChecked={k === kind} className="accent-[var(--brand)]" />
              {t(`kinds.${k}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-1.5">
        <Label htmlFor="message">{t("message")}</Label>
        <div className="flex items-start gap-2">
          <Textarea id="message" name="message" rows={5} required={!voice && !video} minLength={voice || video ? 0 : 5} maxLength={4000} dir="auto" placeholder={t("messageHint")} value={message} onChange={(e) => setMessage(e.target.value)} />
          <VoiceButton lang={locale === "ar" ? "ar" : "en-US"} value={message} onChange={setMessage} label={tm("dictate")} stopLabel={tm("dictateStop")} listeningLabel={tm("listening")} />
        </div>
      </div>
      <div className="grid gap-2">
        <span className="text-sm font-medium">{tm("voiceLabel")}</span>
        <VoiceNoteField value={voice} onChange={setVoice} />
        <span className="text-sm font-medium">{tm("videoLabel")}</span>
        <VideoField value={video} onChange={setVideo} onBusy={setVideoBusy} />
        <p className="text-xs text-muted-foreground">{tm("hint")}</p>
      </div>
      <div className="grid gap-2">
        <span className="text-sm font-medium">{t("screenshots")}</span>
        {previews.length > 0 && (
          <ul className="flex flex-wrap gap-2" data-testid="support-shots">
            {previews.map((src, i) => (
              <li key={src} className="relative size-20 overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element -- a local preview (blob: URL) */}
                <img src={src} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => setShots((s) => s.filter((_, j) => j !== i))}
                  aria-label={t("removeShot")}
                  className="absolute end-1 top-1 rounded-full bg-background/90 p-0.5 shadow"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {shots.length < MAX_SCREENSHOTS && (
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm hover:bg-muted">
            <ImagePlus className="size-4" /> {t("addShot")}
            <input ref={picker} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addShots(e.target.files)} data-testid="support-shot-input" />
          </label>
        )}
        <p className="text-xs text-muted-foreground">{t("screenshotsHint")}</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" dir="ltr" autoComplete="email" />
        <p className="text-xs text-muted-foreground">{t("emailHint")}</p>
      </div>
      {from.startsWith("/") && (
        <p className="text-xs text-muted-foreground">
          {t("pageLine")} <span dir="ltr" className="font-mono">{from}</span>
        </p>
      )}
      <Button type="submit" className="h-10" disabled={pending || compressing || videoBusy}>
        {pending || compressing ? t("sending") : t("send")}
      </Button>
    </form>
  );
}
