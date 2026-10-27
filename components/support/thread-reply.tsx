"use client";

import { ImagePlus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState, useTransition } from "react";
import { replyThreadAction, type ThreadReplyState } from "@/app/[locale]/(main)/support/thread-actions";
import { VoiceButton } from "@/components/match/voice-button";
import { VideoField, VoiceNoteField } from "@/components/support/media-inputs";
import { FormError } from "@/components/form-error";
import { Textarea } from "@/components/ui/textarea";
import { compressForRequest, POST_UPLOAD, REQUEST_LIMIT } from "@/lib/media/image-compress";

/** The reporter's reply box in a report conversation (docs/63): text or dictation, a screenshot, a voice note, a recording. */
export function ThreadReply({ token, done }: { token: string; done: boolean }) {
  const t = useTranslations("SupportThread");
  const tm = useTranslations("SupportMedia");
  const ts = useTranslations("Support");
  const locale = useLocale();
  const [state, action] = useActionState<ThreadReplyState, FormData>(replyThreadAction, undefined);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(!done);
  const [message, setMessage] = useState("");
  const [shot, setShot] = useState<File | null>(null);
  const [voice, setVoice] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [tooBig, setTooBig] = useState(false);

  if (state?.done) return <p className="rounded-xl border p-3 text-sm" role="status" data-testid="thread-sent">{t("sent")}</p>;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-full rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-muted" data-testid="thread-still-broken">
        {t("stillBroken")}
      </button>
    );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTooBig(false);
    const data = new FormData();
    data.set("token", token);
    data.set("message", message);
    const shots = shot ? await compressForRequest([shot], POST_UPLOAD).catch(() => [shot]) : [];
    if (shots.reduce((n, f) => n + f.size, 0) + (voice?.size ?? 0) + (video?.size ?? 0) > REQUEST_LIMIT) return setTooBig(true);
    shots.forEach((f) => data.append("screenshots", f));
    if (voice) data.set("voice", voice);
    if (video) data.set("video", video);
    startTransition(() => action(data));
  }

  const error = tooBig ? tm("tooBig") : state?.error ? t(`errors.${state.error}`) : undefined;
  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border p-3" data-testid="thread-reply">
      <FormError message={error} />
      <label htmlFor="thread-message" className="text-sm font-medium">{t("reply")}</label>
      <div className="flex items-start gap-2">
        <Textarea id="thread-message" rows={3} maxLength={4000} dir="auto" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={done ? t("stillBrokenHint") : t("replyHint")} />
        <VoiceButton lang={locale === "ar" ? "ar" : "en-US"} value={message} onChange={setMessage} label={tm("dictate")} stopLabel={tm("dictateStop")} listeningLabel={tm("listening")} />
      </div>
      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm hover:bg-muted">
        <ImagePlus className="size-4" /> {shot ? shot.name : ts("addShot")}
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => setShot(e.target.files?.[0] ?? null)} data-testid="thread-shot" />
      </label>
      <VoiceNoteField value={voice} onChange={setVoice} />
      <VideoField value={video} onChange={setVideo} onBusy={setBusy} />
      <button type="submit" disabled={pending || busy} className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50" data-testid="thread-send">
        {pending ? t("sending") : t("send")}
      </button>
    </form>
  );
}
