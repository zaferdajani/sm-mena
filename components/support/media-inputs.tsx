"use client";

import { Film, Mic, Square, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AUDIO_MAX_BYTES, VOICE_MAX_SECONDS } from "@/lib/support-media";

// Voice notes and screen recordings for problem reports (docs/61), shared by
// the /support form and the help chat. A voice note is recorded in the browser
// (MediaRecorder) or picked as an audio file; a screen recording is shrunk in
// the browser (ffmpeg.wasm, lib/media/video-compress.ts) to fit one request.
// The bug agent transcribes both on its own machine (scripts/bug-agent).

const REPORT_VIDEO_BYTES = Math.floor(3.5 * 1024 * 1024);
const REPORT_VIDEO_SECONDS = 60;

const noop = () => () => {};
const recorderMime = () => {
  if (typeof MediaRecorder === "undefined") return null;
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) if (MediaRecorder.isTypeSupported?.(t)) return t;
  return "";
};

function usePreview(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  return url;
}

export function VoiceNoteField({ value, onChange }: { value: File | null; onChange: (f: File | null) => void }) {
  const t = useTranslations("SupportMedia");
  const canRecord = useSyncExternalStore(noop, () => recorderMime() !== null && !!navigator.mediaDevices?.getUserMedia, () => false);
  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const preview = usePreview(value);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    rec.current?.stream.getTracks().forEach((tr) => tr.stop());
  }, []);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = recorderMime() || undefined;
      const r = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        if (timer.current) clearInterval(timer.current);
        setRecording(false);
        const type = (r.mimeType || "audio/webm").split(";")[0];
        const blob = new Blob(chunks, { type });
        if (blob.size > AUDIO_MAX_BYTES) return setError(t("tooBig"));
        onChange(new File([blob], `voice-note.${type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm"}`, { type }));
      };
      rec.current = r;
      r.start(1000);
      setSeconds(0);
      setRecording(true);
      timer.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= VOICE_MAX_SECONDS) r.stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError(t("micDenied"));
    }
  }

  function pick(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("audio/")) return setError(t("notAudio"));
    if (file.size > AUDIO_MAX_BYTES) return setError(t("tooBig"));
    onChange(file);
  }

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <div className="grid gap-2" data-testid="voice-note">
      {value && preview ? (
        <div className="flex items-center gap-2">
          <audio controls src={preview} className="h-9 min-w-0 flex-1" />
          <button type="button" onClick={() => onChange(null)} aria-label={t("remove")} className="rounded-md p-2 hover:bg-muted">
            <Trash2 className="size-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {canRecord && (
            <button
              type="button"
              onClick={() => (recording ? rec.current?.stop() : start())}
              aria-pressed={recording}
              className={recording ? "flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive" : "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"}
              data-testid="voice-record"
            >
              {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
              {recording ? `${t("stop")} · ${mmss}` : t("record")}
            </button>
          )}
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm hover:bg-muted">
            <Upload className="size-4" /> {t("audioFile")}
            <input type="file" accept="audio/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} data-testid="voice-file" />
          </label>
        </div>
      )}
      {recording && <span role="status" className="sr-only">{t("recording")}</span>}
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}

export function VideoField({ value, onChange, onBusy }: { value: File | null; onChange: (f: File | null) => void; onBusy?: (busy: boolean) => void }) {
  const t = useTranslations("SupportMedia");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const preview = usePreview(value);

  async function pick(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("video/")) return setError(t("notVideo"));
    if (file.size <= REPORT_VIDEO_BYTES && (file.type === "video/mp4" || file.type === "video/webm")) return onChange(file);
    setProgress(0);
    onBusy?.(true);
    try {
      const { compressVideo } = await import("@/lib/media/video-compress");
      const out = await compressVideo(file, {
        maxWidth: 720,
        maxSeconds: REPORT_VIDEO_SECONDS,
        maxBytes: REPORT_VIDEO_BYTES,
        onProgress: (p) => setProgress(p.stage === "encoding" ? Math.round(p.ratio * 100) : 0),
      });
      onChange(out.file);
    } catch {
      setError(t("videoFailed"));
    } finally {
      setProgress(null);
      onBusy?.(false);
    }
  }

  return (
    <div className="grid gap-2" data-testid="video-field">
      {value && preview ? (
        <div className="flex items-start gap-2">
          <video src={preview} controls playsInline className="max-h-40 rounded-lg border" />
          <button type="button" onClick={() => onChange(null)} aria-label={t("remove")} className="rounded-md p-2 hover:bg-muted">
            <Trash2 className="size-4" />
          </button>
        </div>
      ) : progress !== null ? (
        <p className="text-sm text-muted-foreground" role="status">{t("shrinking", { percent: progress })}</p>
      ) : (
        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm hover:bg-muted">
          <Film className="size-4" /> {t("video")}
          <input type="file" accept="video/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} data-testid="video-file" />
        </label>
      )}
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}
